import { useEffect } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Browse from './pages/Browse';
import BookDetail from './pages/BookDetail';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { OrderDetail, OrderList } from './pages/Orders';
import { Dashboard } from './pages/admin/Dashboard';
import AdminLayout, { AdminShell } from './pages/admin/AdminLayout';
import AdminBooks from './pages/admin/Books';
import AdminCategories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';
import AdminCoupons from './pages/admin/Coupons';
import ShipperOrders from './pages/Shipper';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function StoreLayout() {
  const { notice } = useCart();
  return (
    <div className="App">
      <Navbar />
      {notice && <p className="store-notice" role="status">{notice}</p>}
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Storefront() {
  return <CartProvider><CatalogProvider><StoreLayout /></CatalogProvider></CartProvider>;
}

function NotFound({ admin = false }) {
  return <div className="container page"><h1>Page not found</h1><Link to={admin ? '/admin' : '/'}>{admin ? 'Back to overview' : 'Back to the store'}</Link></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollManager />
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="login" element={<main className="admin-login"><Auth admin /></main>} />
            <Route element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="books" element={<AdminBooks />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="*" element={<NotFound admin />} />
            </Route>
          </Route>
          <Route path="/shipper" element={<ProtectedRoute shipper><ShipperOrders /></ProtectedRoute>} />
          <Route element={<Storefront />}>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<Browse />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth register />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
