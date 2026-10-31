import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { OrderDetail, OrderList } from './pages/Orders';
import { AdminLayout, Dashboard } from './pages/admin/Dashboard';
import AdminBooks from './pages/admin/Books';
import AdminCategories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function Storefront() {
  const { notice } = useCart();
  return (
    <div className="App">
      <ScrollManager />
      <Navbar />
      {notice && <p className="store-notice" role="status">{notice}</p>}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<AdminBooks />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>
          <Route path="*" element={<div className="container page"><h1>Page not found</h1><Link to="/">Back to the store</Link></div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CatalogProvider>
            <Storefront />
          </CatalogProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
