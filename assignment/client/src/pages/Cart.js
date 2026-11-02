import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money } from '../data/placeholders';
import { cloudImage } from '../components/ui';

export default function Cart() {
  const { user, ready } = useAuth();
  const { cart, refreshCart } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(work) {
    setBusy(true); setError('');
    try { await work(); await refreshCart(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!ready) return <p className="container page" role="status">Loading your cart...</p>;
  if (!user) return <div className="container page"><h1>Shopping cart</h1><p>Sign in to see your cart.</p><Link className="action" to="/login" state={{ from: '/cart' }}>Sign in</Link></div>;
  const blocked = cart.items.some(item => !item.available);

  return <div className="container page">
    <h1>Shopping cart</h1>
    {error && <p className="message error" role="alert">{error}</p>}
    {!cart.items.length && <p>Your cart is empty. <Link to="/#popular-books">Browse books</Link></p>}
    {cart.items.map((item, index) => <div className="cart-row" key={item.book ? `${item.book._id}:${item.format}` : index}>
      {item.book?.coverImageUrl && <img src={cloudImage(item.book.coverImageUrl, 120)} alt="" />}
      <div className="cart-title">
        {item.book ? <Link to={`/books/${item.book._id}`}>{item.book.title}</Link> : 'Book no longer available'}
        <div>{item.format === 'PDF' ? 'PDF: each copy is one download' : 'Printed book'}</div>
        {!item.available && <div className="message error">{item.format === 'PDF' ? 'This PDF is no longer for sale. Remove it to check out.' : 'Not available in this quantity. Lower the quantity or remove it to check out.'}</div>}
      </div>
      <span>{money(item.lineTotal)}</span>
      {item.book && <>
        <label>Quantity<input type="number" min="1" step="1" value={item.quantity} disabled={busy} onChange={event => {
          const quantity = Number(event.target.value);
          if (!Number.isSafeInteger(quantity) || quantity < 1) return;
          run(() => api(`/cart/items/${item.book._id}`, { method: 'PUT', body: JSON.stringify({ quantity, format: item.format }) }));
        }} /></label>
        <button type="button" className="action outline" disabled={busy} onClick={() => run(() => api(`/cart/items/${item.book._id}?format=${item.format}`, { method: 'DELETE' }))}>Remove</button>
      </>}
    </div>)}
    {cart.items.length > 0 && <div className="cart-summary">
      <p>Subtotal: <strong>{money(cart.subtotal)}</strong></p>
      {blocked ? <button type="button" className="action" disabled>Check out</button> : <Link className="action" to="/checkout">Check out</Link>}
    </div>}
  </div>;
}
