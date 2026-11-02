import { money } from '../data/placeholders';

export const statusLabels = { PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPING: 'Shipping', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
export const paymentLabels = { UNPAID: 'Unpaid', PAID: 'Paid', REFUNDED: 'Refunded' };
export const methodLabels = { COD: 'Cash on delivery', PAYOS: 'Bank transfer (payOS)' };
export const dateTime = value => new Date(value).toLocaleString('vi-VN');
export const slugify = title => title.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Asks Cloudinary for a resized, modern-format copy; other image URLs are returned unchanged.
export const cloudImage = (url, width) => url.includes('res.cloudinary.com/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`) : url;
export const mapBook = book => ({ ...book, id: book._id, author: book.authors.join(', '),
  image: book.coverImageUrl ? cloudImage(book.coverImageUrl, 400) : `${process.env.PUBLIC_URL}/images/default.png` });

export function Pager({ page, pages, onChange }) {
  if (!pages || pages < 2) return null;
  return <nav className="pager" aria-label="Pages">
    <button type="button" className="action outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
    <span>Page {page} of {pages}</span>
    <button type="button" className="action outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
  </nav>;
}

export function LoadState({ loading, error, reload, empty, children }) {
  if (error) return <p className="message error" role="alert">{error} <button type="button" className="action outline" onClick={reload}>Try again</button></p>;
  if (loading) return <p role="status">Loading...</p>;
  if (empty) return <p>{empty}</p>;
  return children;
}

export function OrderItems({ order, action }) {
  return <table className="table">
    <thead><tr><th scope="col">Book</th><th scope="col">Price</th><th scope="col">Qty</th><th scope="col">Total</th></tr></thead>
    <tbody>{order.items.map(item => <tr key={`${item.book}:${item.format}`}>
      <td>{item.title}{item.format === 'PDF' && ' (PDF)'}{action?.(item)}</td><td>{money(item.unitPrice)}</td><td>{item.quantity}</td><td>{money(item.lineTotal)}</td>
    </tr>)}</tbody>
    <tfoot>
      <tr><td colSpan="3">Shipping</td><td>{money(order.shippingFee)}</td></tr>
      {order.discount > 0 && <tr><td colSpan="3">Discount ({order.couponCode})</td><td>-{money(order.discount)}</td></tr>}
      <tr><th colSpan="3" scope="row">Total</th><th>{money(order.total)}</th></tr>
    </tfoot>
  </table>;
}

export function Address({ value }) {
  return <address>
    {value.recipientName}, {value.phone}<br />
    {[value.addressLine, value.ward, value.province].filter(Boolean).join(', ')}
  </address>;
}
