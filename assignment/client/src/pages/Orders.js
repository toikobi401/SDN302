import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, downloadFile, useApi } from '../api';
import { money } from '../data/placeholders';
import { Address, dateTime, LoadState, methodLabels, OrderItems, Pager, paymentLabels, statusLabels } from '../components/ui';

const awaitingPayment = order => order.paymentMethod === 'PAYOS' && order.status === 'PENDING' && order.paymentStatus === 'UNPAID';

const canDownload = order => order.paymentStatus === 'PAID' && order.status !== 'CANCELLED';

export function OrderList() {
  const [page, setPage] = useState(1);
  const { data, pagination, loading, error, reload } = useApi(`/orders?page=${page}&limit=10`);
  return <div className="container page">
    <h1>My orders</h1>
    <LoadState loading={loading} error={error} reload={reload} empty={data && !data.length && 'You have no orders yet.'}>
      <div className="table-responsive"><table className="table">
        <thead><tr><th scope="col">Placed</th><th scope="col">Books</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Payment</th></tr></thead>
        <tbody>{data?.map(order => <tr key={order._id}>
          <td><Link to={`/orders/${order._id}`}>{dateTime(order.createdAt)}</Link></td>
          <td>{order.items.map(item => item.title).join(', ')}</td>
          <td>{money(order.total)}</td>
          <td>{statusLabels[order.status]}</td>
          <td>{paymentLabels[order.paymentStatus]}</td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} pages={pagination?.pages} onChange={setPage} />
    </LoadState>
  </div>;
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, reload, setData } = useApi(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const checked = useRef(false);

  async function checkPayment() {
    setBusy(true); setActionError('');
    try { setData((await api(`/orders/${id}/payment/sync`, { method: 'POST' })).data); }
    catch (err) { setActionError(`Could not check the payment: ${err.message}`); }
    finally { setBusy(false); }
  }

  // Customers land here after payOS, often before the webhook has arrived.
  useEffect(() => {
    if (order && awaitingPayment(order) && !checked.current) {
      checked.current = true;
      checkPayment();
    }
  });

  async function download(item) {
    setDownloading(item.book); setActionError('');
    try { await downloadFile(`/orders/${id}/items/${item.book}/download`); }
    catch (err) { setActionError(err.message); }
    finally { setDownloading(null); }
  }

  async function cancel(event) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get('reason');
    setBusy(true); setActionError('');
    try { setData((await api(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })).data); }
    catch (err) { setActionError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="container page">
    <h1>Order details</h1>
    <LoadState loading={loading && !order} error={error} reload={reload}>
      {order && <>
        {actionError && <p className="message error" role="alert">{actionError}</p>}
        {awaitingPayment(order) && order.checkoutUrl && <div className="payment-box">
          <p>Pay by {dateTime(order.paymentExpiresAt)} to keep this order. After that it is cancelled automatically.</p>
          <a className="action" href={order.checkoutUrl}>Pay {money(order.total)} with payOS</a>{' '}
          <button type="button" className="action outline" disabled={busy} onClick={checkPayment}>I have paid, check again</button>
        </div>}
        {order.status === 'CANCELLED' && order.paymentStatus === 'PAID' && <p className="message error">This order was cancelled after your payment arrived. The store will refund {money(order.total)} to you.</p>}
        {order.paymentStatus === 'REFUNDED' && <p className="message success">The store refunded this order on {dateTime(order.refundedAt)}.</p>}
        {order.paymentMethod === 'PAYOS' && order.status === 'PENDING' && order.paymentStatus === 'PAID' && <p className="message success">Payment received. The store will confirm your order soon.</p>}
        {canDownload(order) && order.items.some(item => item.format === 'PDF') && <p className="message success">Payment received. Your PDF is ready to download.</p>}
        <dl className="book-facts">
          <dt>Placed</dt><dd>{dateTime(order.createdAt)}</dd>
          <dt>Status</dt><dd>{statusLabels[order.status]}{order.cancellationReason && ` (${order.cancellationReason})`}</dd>
          <dt>Payment</dt><dd>{methodLabels[order.paymentMethod]}, {paymentLabels[order.paymentStatus].toLowerCase()}</dd>
          {order.shippingAddress && <><dt>Deliver to</dt><dd><Address value={order.shippingAddress} /></dd></>}
        </dl>
        <div className="table-responsive"><OrderItems order={order} action={item => item.format === 'PDF' && canDownload(order) && <div><button type="button" className="action outline" disabled={downloading === item.book} onClick={() => download(item)}>{downloading === item.book ? 'Downloading...' : 'Download PDF'}</button></div>} /></div>
        {order.status === 'PENDING' && order.paymentStatus === 'UNPAID' && <form className="inline-form" onSubmit={cancel}>
          <label>Reason for cancelling<input name="reason" required maxLength={1000} /></label>
          <button className="action outline" disabled={busy} type="submit">Cancel order</button>
        </form>}
        <p><Link to="/orders">Back to my orders</Link></p>
      </>}
    </LoadState>
  </div>;
}
