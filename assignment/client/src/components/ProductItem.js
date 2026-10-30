import { useStore } from '../Store';
import { money } from "../data/placeholders";

function ProductItem({ book, layout = "column" }) {
  const { addToCart, busy } = useStore();
  return (
    <div className={layout === "column" ? "col-md-3" : undefined}>
      <div className="product-item">
        <figure className="product-style">
          <img src={book.image} alt={book.title} className="product-item" />
          <button type="button" className="add-to-cart" disabled={busy || book.stock < 1} onClick={() => addToCart(book)}>
            {book.stock < 1 ? "Out of stock" : "Add to Cart"}
          </button>
        </figure>
        <figcaption>
          <h3>{book.title}</h3>
          <span>{book.author}</span>
          <div className="item-price">
            {book.prevPrice != null && (
              <span className="prev-price">{money(book.prevPrice)}</span>
            )}
            {money(book.price)}
          </div>
        </figcaption>
      </div>
    </div>
  );
}

export default ProductItem;
