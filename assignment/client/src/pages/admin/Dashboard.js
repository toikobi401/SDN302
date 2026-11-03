import { Link } from 'react-router-dom';
import { useApi } from '../../api';
import { money } from '../../data/placeholders';
import { LoadState, statusLabels } from '../../components/ui';

export function Dashboard() {
  const summary = useApi('/admin/reports/summary');
  const lowStock = useApi('/admin/reports/low-stock?limit=10');
  return <>
    <h1>Overview</h1>
    <LoadState loading={summary.loading} error={summary.error} reload={summary.reload}>
      {summary.data && <div className="row">
        <div className="col-md-6">
          <h2>Revenue from completed, paid orders</h2>
          <p className="big-number">{money(summary.data.revenue.totalCollected)}</p>
          <p>{summary.data.revenue.orders} orders</p>
        </div>
        <div className="col-md-6">
          <h2>Orders by status</h2>
          {!summary.data.ordersByStatus.length && <p>No orders yet.</p>}
          <dl className="book-facts">{summary.data.ordersByStatus.map(row => <div key={row._id}><dt>{statusLabels[row._id]}</dt><dd>{row.count}</dd></div>)}</dl>
        </div>
      </div>}
    </LoadState>
    <h2>Running low</h2>
    <LoadState loading={lowStock.loading} error={lowStock.error} reload={lowStock.reload} empty={lowStock.data && !lowStock.data.length && 'Every book is above its low-stock level.'}>
      <ul>{lowStock.data?.map(book => <li key={book._id}><Link to="/admin/books">{book.title}</Link>: {book.stock} left</li>)}</ul>
    </LoadState>
  </>;
}
