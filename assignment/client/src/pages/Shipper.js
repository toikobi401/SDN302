import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { money } from '../data/placeholders';
import { Address, dateTime, LoadState, methodLabels, Pager, paymentLabels, statusLabels } from '../components/ui';
import './admin/Admin.css';

function DeliveryRow({ order, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const collect = order.paymentMethod === 'COD' && order.paymentStatus === 'UNPAID';

  async function recordPayment() {
    setBusy(true); onError('');
    try { await api(`/shipper/orders/${order._id}/payment`, { method: 'POST' }); onChanged(); }
    catch (err) { onError(err.message); }
    finally { setBusy(false); }
  }

  return <tr>
    <td>{dateTime(order.createdAt)}<br /><small>{statusLabels[order.status]}</small></td>
    <td>{order.shippingAddress && <Address value={order.shippingAddress} />}{order.note && <small>Note: {order.note}</small>}</td>
    <td>{order.items.filter(item => item.format !== 'PDF').map((item, index) => <div key={index}>{item.title} x {item.quantity}</div>)}</td>
    <td>{collect ? <strong>Collect {money(order.total)}</strong> : money(order.total)}</td>
    <td>{paymentLabels[order.paymentStatus]}<br /><small>{methodLabels[order.paymentMethod]}</small></td>
    <td>{collect && <button type="button" className="action outline" disabled={busy} onClick={recordPayment}>Record payment</button>}</td>
  </tr>;
}

export default function ShipperOrders() {
  const { user, signOut } = useAuth();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const { data, pagination, loading, error: loadError, reload } = useApi(`/shipper/orders?page=${page}&limit=15`);

  return <div className="admin-app">
    <header className="admin-header">
      <Link className="admin-brand" to="/shipper">Booksaw</Link>
      <div className="admin-account">
        <span>{user.name}</span>
        <button className="action outline" type="button" onClick={() => signOut('/login').catch(() => {})}>Sign out</button>
      </div>
    </header>
    <main className="page admin-content">
      <h1>Orders to deliver</h1>
      <p>Orders the store has confirmed. Record the payment when the customer pays cash on delivery.</p>
      {error && <p className="message error" role="alert">{error}</p>}
      <LoadState loading={loading} error={loadError} reload={reload} empty={data && !data.length && 'No orders are waiting for delivery.'}>
        <div className="table-responsive"><table className="table align-middle">
          <thead><tr><th scope="col">Placed</th><th scope="col">Deliver to</th><th scope="col">Books</th><th scope="col">Total</th><th scope="col">Payment</th><th scope="col">Actions</th></tr></thead>
          <tbody>{data?.map(order => <DeliveryRow key={order._id} order={order} onChanged={reload} onError={setError} />)}</tbody>
        </table></div>
        <Pager page={page} pages={pagination?.pages} onChange={setPage} />
      </LoadState>
    </main>
  </div>;
}
