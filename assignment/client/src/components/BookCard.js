import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { money } from "../data/placeholders";

function BookCard({ book, layout = "column" }) {
  const { addToCart, busy } = useCart();
  return (
    <div className={layout === "column" ? "col-md-3" : undefined}>
      <div className="product-item">
        <figure className="product-style">
          <Link to={`/books/${book.id}`}><img src={book.image} alt={book.title} className="product-item" /></Link>
          <button type="button" className="add-to-cart" disabled={busy || book.stock < 1} onClick={() => addToCart(book)}>
            {book.stock < 1 ? "Out of stock" : "Add to Cart"}
          </button>
        </figure>
        <figcaption>
          <h3><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
          <span>{book.author}</span>
          <div className="item-price">
            {book.prevPrice != null && (
              <span className="prev-price">{money(book.prevPrice)}</span>
            )}
            {money(book.price)}
          </div>
          {book.pdfForSale && <small>PDF: {money(book.pdfPrice)}</small>}
        </figcaption>
      </div>
    </div>
  );
}

export function BookSkeletons({ count }) {
  return Array.from({ length: count }, (_, index) => (
    <div className="col-md-3" key={index} aria-hidden="true">
      <div className="book-skeleton" />
    </div>
  ));
}

export default BookCard;
