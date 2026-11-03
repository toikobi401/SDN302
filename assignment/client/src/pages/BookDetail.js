import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { useCart } from '../context/CartContext';
import { money } from '../data/placeholders';
import { cloudImage, LoadState, mapBook } from '../components/ui';

export default function BookDetail() {
  const { id } = useParams();
  const { addToCart, busy } = useCart();
  const { data, loading, error, reload } = useApi(`/books/${id}`);
  const [selected, setSelected] = useState(null);
  const book = data && mapBook(data);
  const images = book ? [book.coverImageUrl, ...book.imageUrls].filter(Boolean) : [];
  const shown = selected || images[0];

  return <div className="container page">
    <LoadState loading={loading} error={error} reload={reload}>
      {book && <div className="row">
        <div className="col-md-5">
          <img className="book-cover" src={shown ? cloudImage(shown, 800) : book.image} alt={`Cover of ${book.title}`} />
          {images.length > 1 && <div className="thumbs">
            {images.map(url => <button type="button" key={url} aria-label="Show this image" aria-pressed={url === shown} onClick={() => setSelected(url)}>
              <img src={cloudImage(url, 120)} alt="" />
            </button>)}
          </div>}
        </div>
        <div className="col-md-7">
          <h1>{book.title}</h1>
          <p>By {book.author}</p>
          <p className="item-price">{money(book.price)}</p>
          <p>{book.stock > 0 ? `${book.stock} in stock` : 'Out of stock'}</p>
          <div className="button-row">
            <button type="button" className="action" disabled={busy || book.stock < 1} onClick={() => addToCart(book)}>
              {book.stock < 1 ? 'Out of stock' : 'Add printed book to cart'}
            </button>
            {book.pdfForSale && <button type="button" className="action outline" disabled={busy} onClick={() => addToCart(book, 'PDF')}>
              Add PDF to cart: {money(book.pdfPrice)}
            </button>}
          </div>
          {book.description && <p className="book-description">{book.description}</p>}
          <dl className="book-facts">
            {book.publisher && <><dt>Publisher</dt><dd>{book.publisher}</dd></>}
            {book.isbn && <><dt>ISBN</dt><dd>{book.isbn}</dd></>}
            {book.license && <><dt>License</dt><dd>{book.licenseUrl ? <a href={book.licenseUrl} target="_blank" rel="noreferrer">{book.license}</a> : book.license}</dd></>}
          </dl>
          <Link to="/books">Back to all books</Link>
        </div>
      </div>}
    </LoadState>
  </div>;
}
