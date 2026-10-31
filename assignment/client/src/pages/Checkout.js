import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { money } from '../data/placeholders';

export default function Checkout() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The same key survives a lost connection, so retrying cannot place a second order.
  const orderKey = useRef(crypto.randomUUID());
  const items = cart.items.filter(item => item.book);
  const hasPdf = items.some(item => item.format === 'PDF');
  const hasPhysical = items.some(item => item.format !== 'PDF');

  async function submit(event) {
    event.preventDefault();
    const { note, ward, paymentMethod, ...required } = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      items: items.map(item => ({ book: item.book._id, format: item.format, quantity: item.quantity })),
      paymentMethod: hasPdf ? 'PAYOS' : paymentMethod,
      ...(hasPhysical ? { shippingAddress: { ...required, ...(ward.trim() ? { ward } : {}) } } : {}),
      ...(note.trim() ? { note } : {}),
    };
    setBusy(true); setError('');
    try {
      const { data: order } = await api('/orders', { method: 'POST', headers: { 'Idempotency-Key': orderKey.current }, body: JSON.stringify(body) });
      await api('/cart', { method: 'DELETE' });
      await refreshCart();
      if (order.checkoutUrl) window.location.assign(order.checkoutUrl);
      else navigate(`/orders/${order._id}`, { replace: true });
    } catch (err) {
      // A response means the server finished with this attempt; no order is left behind.
      if (err.status) orderKey.current = crypto.randomUUID();
      setError(err.message);
      setBusy(false);
    }
  }

  if (!items.length) return <div className="container page"><h1>Check out</h1><p>Your cart is empty. <Link to="/#popular-books">Browse books</Link></p></div>;

  return <div className="container page">
    <h1>Check out</h1>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="row">
      <form className="stack col-md-7" onSubmit={submit}>
        {hasPhysical && <>
          <h2>Delivery details</h2>
          <label>Recipient name<input name="recipientName" required maxLength={500} autoComplete="name" /></label>
          <label>Phone number<input name="phone" type="tel" required pattern="[0-9+ ]{8,15}" title="8 to 15 digits" autoComplete="tel" /></label>
          <label>Street address<input name="addressLine" required maxLength={500} autoComplete="street-address" /></label>
          <label>Ward (optional)<input name="ward" maxLength={200} /></label>
          <label>Province or city<input name="province" required maxLength={500} /></label>
        </>}
        <label>Note for the store (optional)<textarea name="note" rows="2" maxLength={2000} /></label>
        <fieldset>
          <legend>Payment</legend>
          {hasPdf
            ? <p>Orders with a PDF are paid by bank transfer with payOS, within 15 minutes. You can download the PDF as soon as the payment arrives.</p>
            : <>
              <label className="choice"><input type="radio" name="paymentMethod" value="COD" defaultChecked /> Cash on delivery</label>
              <label className="choice"><input type="radio" name="paymentMethod" value="PAYOS" /> Bank transfer with payOS (pay within 15 minutes)</label>
            </>}
        </fieldset>
        <button className="action" disabled={busy} type="submit">{busy ? 'Placing your order...' : 'Place order'}</button>
      </form>
      <aside className="col-md-5">
        <h2>Your order</h2>
        {items.map(item => <p key={`${item.book._id}:${item.format}`}>
          {item.book.title} {item.format === 'PDF' ? '(PDF)' : `x ${item.quantity}`}: {money(item.lineTotal)}
        </p>)}
        <p>Subtotal: <strong>{money(cart.subtotal)}</strong></p>
        <p>{hasPhysical ? 'The store confirms the final total, including any shipping fee, when you place the order.' : 'PDF orders have no shipping fee.'}</p>
      </aside>
    </div>
  </div>;
}
