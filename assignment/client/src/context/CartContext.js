import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';

const EMPTY = { items: [], subtotal: 0 };
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(EMPTY);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const refreshCart = async () => setCart((await api('/cart')).data);

  useEffect(() => {
    if (user) refreshCart().catch(err => setNotice(err.message));
    else setCart(EMPTY);
  }, [user]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function addToCart(book, format = 'PHYSICAL') {
    // While a saved session is still being restored, the user is not known to be signed out.
    if (!ready) return;
    if (!user) {
      setNotice('Sign in to add books to your cart.');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const current = (await api('/cart')).data;
      const inCart = current.items.find(item => item.book?._id === book.id && item.format === format)?.quantity || 0;
      await api(`/cart/items/${book.id}`, { method: 'PUT', body: JSON.stringify({ quantity: inCart + 1, format }) });
      await refreshCart();
      setNotice(format === 'PDF' ? 'PDF added to cart.' : 'Book added to cart.');
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  return <CartContext.Provider value={{ cart, refreshCart, addToCart, busy, notice, setNotice }}>{children}</CartContext.Provider>;
}
