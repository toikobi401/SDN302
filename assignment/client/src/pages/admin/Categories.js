import { useState } from 'react';
import { api, useApi } from '../../api';
import { LoadState, Pager, slugify } from '../../components/ui';

export default function AdminCategories() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const { data, pagination, loading, error: loadError, reload } = useApi(`/admin/categories?page=${page}&limit=20`);

  async function run(work) {
    setError('');
    try { await work(); reload(); } catch (err) { setError(err.message); }
  }

  function save(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const name = form.get('name');
    const body = { name, ...(form.get('description').trim() ? { description: form.get('description') } : {}) };
    run(async () => {
      if (editing) await api(`/admin/categories/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/admin/categories', { method: 'POST', body: JSON.stringify({ ...body, slug: slugify(name) }) });
      setEditing(null);
      target.reset();
    });
  }

  return <>
    <h1>Categories</h1>
    {error && <p className="message error" role="alert">{error}</p>}
    <form className="inline-form" onSubmit={save} key={editing?._id || 'new'}>
      <label>Name<input name="name" required maxLength={1000} defaultValue={editing?.name} /></label>
      <label>Description (optional)<input name="description" maxLength={5000} defaultValue={editing?.description} /></label>
      <button className="action" type="submit">{editing ? 'Save category' : 'Add category'}</button>
      {editing && <button className="action outline" type="button" onClick={() => setEditing(null)}>Close</button>}
    </form>
    <LoadState loading={loading} error={loadError} reload={reload} empty={data && !data.length && 'No categories yet. Add the first one above.'}>
      <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th scope="col">Name</th><th scope="col">Description</th><th scope="col">Visibility</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data?.map(category => <tr key={category._id}>
          <td>{category.name}</td>
          <td>{category.description}</td>
          <td>{category.isActive ? 'Shown' : 'Hidden'}</td>
          <td className="button-row">
            <button type="button" className="action outline" onClick={() => setEditing(category)}>Edit</button>
            <button type="button" className="action outline" onClick={() => run(() => api(`/admin/categories/${category._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !category.isActive }) }))}>
              {category.isActive ? 'Hide' : 'Show'}
            </button>
          </td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} pages={pagination?.pages} onChange={setPage} />
    </LoadState>
  </>;
}
