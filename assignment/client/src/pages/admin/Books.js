import { useState } from 'react';
import { api, uploadImage, useApi } from '../../api';
import { money } from '../../data/placeholders';
import { cloudImage, LoadState, Pager, slugify } from '../../components/ui';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PDF_BYTES = 200 * 1024 * 1024;
const DEFAULT_COVER = `${process.env.PUBLIC_URL}/images/default.png`;
const send = (path, method, body, headers) => api(path, { method, body: JSON.stringify(body), headers });

function imageProblem(files) {
  const bad = files.find(file => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES);
  return bad && `${bad.name} must be a JPG, PNG or WebP image of at most 5 MB.`;
}

function pdfProblem(file) {
  if (!file.size || file.size > MAX_PDF_BYTES || !/\.pdf$/i.test(file.name)) return `${file.name} must be a PDF file of at most 200 MB.`;
}

function BookForm({ book, categories, onSaved, onClose }) {
  const [current, setCurrent] = useState(book);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(work) {
    setBusy(true); setError('');
    try { await work(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cover = form.get('cover');
    const gallery = form.getAll('gallery').filter(file => file.size);
    const existingGallery = current?.imageUrls.length || 0;
    const problem = imageProblem([...(cover?.size ? [cover] : []), ...gallery]);
    if (problem) { setError(problem); return; }
    if (existingGallery + gallery.length > MAX_GALLERY_IMAGES) { setError(`A book can have at most ${MAX_GALLERY_IMAGES} extra images.`); return; }
    const pdf = form.get('pdf');
    const selling = form.get('pdfForSale') === 'on';
    // Checked here because an upload followed by a refused save would leave an unused file on the server.
    const sellProblem = selling && (!form.get('pdfPrice') ? 'Set a PDF price before selling the PDF.' : !pdf.name && !current?.pdfFile && 'Choose a PDF file before selling the PDF.');
    const fileProblem = sellProblem || (pdf.name && pdfProblem(pdf));
    if (fileProblem) { setError(fileProblem); return; }
    const body = {
      title: form.get('title'),
      authors: form.get('authors').split(',').map(value => value.trim()).filter(Boolean),
      description: form.get('description'),
      categories: form.getAll('categories'),
      price: Number(form.get('price')),
      lowStockThreshold: Number(form.get('lowStockThreshold')),
      status: form.get('status'),
      ...(form.get('publisher').trim() ? { publisher: form.get('publisher') } : {}),
      ...(form.get('isbn').trim() ? { isbn: form.get('isbn') } : {}),
      ...(form.get('pdfPrice') ? { pdfPrice: Number(form.get('pdfPrice')) } : {}),
      pdfForSale: selling,
    };
    run(async () => {
      // Files upload only on save, so an abandoned form leaves no files behind.
      if (pdf.name) {
        const { data } = await api('/admin/uploads/pdf', { method: 'POST', body: pdf, headers: { 'Content-Type': 'application/pdf' } });
        body.pdfFile = data.pdfFile;
      }
      if (cover?.size) {
        const image = await uploadImage(cover);
        body.coverImageUrl = image.url;
        body.coverImagePublicId = image.publicId;
      }
      if (gallery.length) {
        const images = [];
        for (const file of gallery) images.push(await uploadImage(file));
        body.imageUrls = [...(current?.imageUrls || []), ...images.map(image => image.url)];
        body.imagePublicIds = [...(current?.imagePublicIds || []), ...images.map(image => image.publicId)];
      }
      const saved = current
        ? (await send(`/admin/books/${current._id}`, 'PATCH', body)).data
        : (await send('/admin/books', 'POST', { ...body, slug: slugify(body.title) })).data;
      setCurrent(saved);
      const opening = !current && Number(form.get('openingStock'));
      if (opening) {
        await send(`/admin/books/${saved._id}/stock-adjustments`, 'POST', { quantityChange: opening, reason: 'Opening stock' }, { 'Idempotency-Key': crypto.randomUUID() });
      }
      onSaved();
      onClose();
    });
  }

  function adjust(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    run(async () => {
      await send(`/admin/books/${current._id}/stock-adjustments`, 'POST',
        { quantityChange: Number(form.get('quantityChange')), reason: form.get('reason') }, { 'Idempotency-Key': crypto.randomUUID() });
      setCurrent((await api(`/admin/books/${current._id}`)).data);
      target.reset();
      onSaved();
    });
  }

  const removeImage = index => run(async () => {
    setCurrent((await send(`/admin/books/${current._id}`, 'PATCH', {
      imageUrls: current.imageUrls.filter((_, position) => position !== index),
      imagePublicIds: current.imagePublicIds.filter((_, position) => position !== index),
    })).data);
    onSaved();
  });

  return <section className="payment-box" aria-label={current ? `Edit ${current.title}` : 'Add a book'}>
    <h2>{current ? `Edit ${current.title}` : 'Add a book'}</h2>
    {error && <p className="message error" role="alert">{error}</p>}
    <form className="stack" onSubmit={save} key={current?._id || 'new'}>
      <label>Title<input name="title" required maxLength={1000} defaultValue={current?.title} /></label>
      <label>Authors, separated by commas<input name="authors" required defaultValue={current?.authors.join(', ')} /></label>
      <label>Publisher (optional)<input name="publisher" maxLength={1000} defaultValue={current?.publisher} /></label>
      <label>ISBN (optional)<input name="isbn" maxLength={20} defaultValue={current?.isbn} /></label>
      <label>Description<textarea name="description" rows="4" maxLength={20000} defaultValue={current?.description} /></label>
      <fieldset>
        <legend>Categories</legend>
        {!categories.length && <p>Add a category first to file this book under it.</p>}
        {categories.map(category => <label className="choice" key={category._id}>
          <input type="checkbox" name="categories" value={category._id} defaultChecked={current?.categories.some(value => (value._id || value) === category._id)} /> {category.name}
        </label>)}
      </fieldset>
      <label>Price in VND<input name="price" type="number" required min="0" step="1" defaultValue={current?.price} /></label>
      {!current && <label>Opening stock<input name="openingStock" type="number" min="0" step="1" defaultValue="0" /></label>}
      <label>Warn me when stock reaches<input name="lowStockThreshold" type="number" required min="0" step="1" defaultValue={current?.lowStockThreshold ?? 5} /></label>
      <label>Availability
        <select name="status" defaultValue={current?.status || 'ACTIVE'}>
          <option value="ACTIVE">On sale</option>
          <option value="DISCONTINUED">Hidden from the store</option>
        </select>
      </label>
      <fieldset>
        <legend>PDF edition</legend>
        {current?.license && <p>License: {current.license}{/NonCommercial/i.test(current.license) && '. This license does not allow selling the book.'}</p>}
        {current?.pdfFile && <p>Current file: {current.pdfFile}</p>}
        <label>{current?.pdfFile ? 'Replace PDF file' : 'PDF file'} (at most 200 MB)<input name="pdf" type="file" accept=".pdf,application/pdf" /></label>
        <label>PDF price in VND<input name="pdfPrice" type="number" min="1" step="1" defaultValue={current?.pdfPrice} /></label>
        <label className="choice"><input name="pdfForSale" type="checkbox" defaultChecked={current?.pdfForSale} /> Sell the PDF</label>
      </fieldset>
      {current?.coverImageUrl && <img className="thumb" src={cloudImage(current.coverImageUrl, 160)} alt="Current cover" />}
      <label>{current?.coverImageUrl ? 'Replace cover' : 'Cover image'}<input name="cover" type="file" accept={IMAGE_TYPES.join(',')} required={!current?.coverImageUrl} /></label>
      <label>Add extra images (up to {MAX_GALLERY_IMAGES} in total)<input name="gallery" type="file" accept={IMAGE_TYPES.join(',')} multiple /></label>
      <div className="button-row">
        <button className="action" disabled={busy} type="submit">{busy ? 'Saving...' : 'Save book'}</button>
        <button className="action outline" type="button" onClick={onClose}>Close</button>
      </div>
    </form>
    {current?.imageUrls?.length > 0 && <div className="thumbs">
      {current.imageUrls.map((url, index) => <figure key={url}>
        <img src={cloudImage(url, 120)} alt="" />
        <button type="button" className="action outline" disabled={busy} onClick={() => removeImage(index)}>Remove</button>
      </figure>)}
    </div>}
    {current && <form className="inline-form" onSubmit={adjust}>
      <p>In stock: <strong>{current.stock}</strong></p>
      <label>Change, for example 10 or -2<input name="quantityChange" type="number" step="1" required /></label>
      <label>Reason<input name="reason" required maxLength={1000} /></label>
      <button className="action outline" disabled={busy} type="submit">Update stock</button>
    </form>}
  </section>;
}

export default function AdminBooks() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const params = new URLSearchParams({ page, limit: 10, ...(q ? { q } : {}), ...(status ? { status } : {}) });
  const { data, pagination, loading, error, reload } = useApi(`/admin/books?${params}`);
  const categories = useApi('/admin/categories?limit=100');
  const [actionError, setActionError] = useState('');

  async function hide(book) {
    setActionError('');
    try { await api(`/admin/books/${book._id}`, { method: 'DELETE' }); reload(); }
    catch (err) { setActionError(err.message); }
  }

  return <>
    <h1>Books</h1>
    <div className="toolbar">
      <button type="button" className="action" onClick={() => setEditing('new')}>Add a book</button>
      <form role="search" onSubmit={event => { event.preventDefault(); setQ(new FormData(event.currentTarget).get('q').trim()); setPage(1); }}>
        <label>Search by title, author or ISBN<input name="q" type="search" /></label>
      </form>
      <label>Show
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All books</option>
          <option value="ACTIVE">On sale</option>
          <option value="DISCONTINUED">Hidden</option>
        </select>
      </label>
    </div>
    {actionError && <p className="message error" role="alert">{actionError}</p>}
    {editing && <BookForm key={editing === 'new' ? 'new' : editing._id} book={editing === 'new' ? null : editing}
      categories={(categories.data || []).filter(category => category.isActive)} onSaved={reload} onClose={() => setEditing(null)} />}
    <LoadState loading={loading} error={error} reload={reload} empty={data && !data.length && 'No books match. Add one to get started.'}>
      <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th scope="col">Cover</th><th scope="col">Book</th><th scope="col">Price</th><th scope="col">Stock</th><th scope="col">Availability</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data?.map(book => <tr key={book._id}>
          <td><img className="admin-book-cover" src={book.coverImageUrl ? cloudImage(book.coverImageUrl, 128) : DEFAULT_COVER}
            alt={`Cover of ${book.title}`} width="64" height="88" loading="lazy" decoding="async"
            onError={event => { if (event.currentTarget.getAttribute('src') !== DEFAULT_COVER) event.currentTarget.src = DEFAULT_COVER; }} /></td>
          <td>{book.title}<br /><small>{book.authors.join(', ')}</small></td>
          <td>{money(book.price)}</td>
          <td>{book.stock}</td>
          <td>{book.status === 'ACTIVE' ? 'On sale' : 'Hidden'}</td>
          <td className="button-row">
            <button type="button" className="action outline" onClick={() => setEditing(book)}>Edit</button>
            {book.status === 'ACTIVE' && <button type="button" className="action outline" onClick={() => hide(book)}>Hide</button>}
          </td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} pages={pagination?.pages} onChange={setPage} />
    </LoadState>
  </>;
}
