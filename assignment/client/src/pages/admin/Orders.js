import { useState } from 'react';
import { api, useApi } from '../../api';
import { money } from '../../data/placeholders';
import { Address, dateTime, LoadState, methodLabels, OrderItems, Pager, paymentLabels, statusLabels } from '../../components/ui';

const nextStep = { PENDING: ['CONFIRMED', 'Confirm'], CONFIRMED: ['SHIPPING', 'Mark as shipping'], SHIPPING: ['COMPLETED', 'Mark as completed'] };

function OrderRow({ order, onChanged, onError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const unpaidOnline = order.paymentMethod === 'PAYOS' && order.paymentStatus === 'UNPAID';
  const refundDue = order.status === 'CANCELLED' && order.paymentStatus === 'PAID';
  const step = order.items.every(item => item.format === 'PDF') ? null : nextStep[order.status];

  async function run(path, method, body) {
    setBusy(true); onError('');
    try { await api(`/admin/orders/${order._id}${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); onChanged(); }
    catch (err) { onError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <tr>
      <td><button type="button" className="link-button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{dateTime(order.createdAt)}</button></td>
      <td>{order.shippingAddress?.recipientName || 'PDF order'}</td>
      <td>{money(order.total)}</td>
      <td>{statusLabels[order.status]}</td>
      <td>{paymentLabels[order.paymentStatus]}{refundDue && <><br /><strong>Refund due</strong></>}<br /><small>{methodLabels[order.paymentMethod]}</small></td>
      <td className="button-row">
        {step && !(unpaidOnline && order.status === 'PENDING') && <button type="button" className="action outline" disabled={busy} onClick={() => run('/status', 'PATCH', { status: step[0] })}>{step[1]}</button>}
        {unpaidOnline && order.status === 'PENDING' && <button type="button" className="action outline" disabled={busy} onClick={() => run('/payment/sync', 'POST')}>Check payment</button>}
        {order.paymentMethod === 'COD' && order.paymentStatus === 'UNPAID' && ['SHIPPING', 'COMPLETED'].includes(order.status) &&
          <button type="button" className="action outline" disabled={busy} onClick={() => run('/payment', 'POST')}>Record cash received</button>}
        {refundDue && <button type="button" className="action outline" disabled={busy} onClick={() => run('/refund', 'POST')}>Mark as refunded</button>}
      </td>
    </tr>
    {open && <tr><td colSpan="6">
      {order.shippingAddress && <Address value={order.shippingAddress} />}
      {order.note && <p>Note: {order.note}</p>}
      {order.cancellationReason && <p>Cancelled because: {order.cancellationReason}</p>}
      {order.paymentReference && <p>Payment reference: {order.paymentReference}</p>}
      <OrderItems order={order} />
      {['PENDING', 'CONFIRMED'].includes(order.status) && <form className="inline-form" onSubmit={event => {
        event.preventDefault();
        run('/status', 'PATCH', { status: 'CANCELLED', reason: new FormData(event.currentTarget).get('reason') });
      }}>
        <label>Reason for cancelling<input name="reason" required maxLength={1000} /></label>
        <button className="action outline" disabled={busy} type="submit">Cancel order</button>
        {order.paymentStatus === 'PAID' && <small>This order is paid. Cancelling adds it to your refunds to make.</small>}
      </form>}
    </td></tr>}
  </>;
}

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // Whole days in the admin's own time zone, sent as exact times.
  const placed = { ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}), ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}) };
  const params = new URLSearchParams({ page, limit: 15, ...(status ? { status } : {}), ...(paymentStatus ? { paymentStatus } : {}), ...(customer ? { customer } : {}), ...placed });
  const { data, pagination, loading, error: loadError, reload } = useApi(`/admin/orders?${params}`);

  return <>
    <h1>Orders</h1>
    <div className="toolbar">
      <form role="search" onSubmit={event => { event.preventDefault(); setCustomer(new FormData(event.currentTarget).get('customer').trim()); setPage(1); }}>
        <label>Customer name or phone<input name="customer" type="search" maxLength={200} /></label>
      </form>
      <label>Placed from<input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
      <label>Placed to<input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
      <label>Status
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Payment
        <select value={paymentStatus} onChange={event => { setPaymentStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    <LoadState loading={loading} error={loadError} reload={reload} empty={data && !data.length && 'No orders match these filters.'}>
      <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th scope="col">Placed</th><th scope="col">Customer</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Payment</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data?.map(order => <OrderRow key={order._id} order={order} onChanged={reload} onError={setError} />)}</tbody>
      </table></div>
      <Pager page={page} pages={pagination?.pages} onChange={setPage} />
    </LoadState>
  </>;
}
