import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export function AdminShell() {
  return <div className="admin-app"><Outlet /></div>;
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();

  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/admin">Booksaw<span>Store administration</span></Link>
      <nav className="admin-nav" aria-label="Store management">
        <NavLink end to="/admin">Overview</NavLink>
        <NavLink to="/admin/books">Books</NavLink>
        <NavLink to="/admin/categories">Categories</NavLink>
        <NavLink to="/admin/orders">Orders</NavLink>
        <NavLink to="/admin/coupons">Discount codes</NavLink>
      </nav>
      <Link className="admin-store-link" to="/">View storefront</Link>
    </aside>
    <div className="admin-workspace">
      <header className="admin-header">
        <span>Administration</span>
        <div className="admin-account">
          <span>{user.name}</span>
          <button className="action outline" type="button" onClick={() => signOut('/admin/login').catch(() => {})}>Sign out</button>
        </div>
      </header>
      <main className="page admin-content"><Outlet /></main>
    </div>
  </div>;
}
