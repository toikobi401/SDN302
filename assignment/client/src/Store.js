import { createContext, useContext, useEffect, useState } from 'react';

const Store = createContext(null);
export const useStore = () => useContext(Store);
export async function api(path, options = {}) {
  const token = sessionStorage.getItem('bookstore-token');
  const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 204) return {};
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'Request failed');
  return body;
}
export const mapBook = book => ({ ...book, id: book._id, author: book.authors.join(', '), image: book.coverImageUrl || `${process.env.PUBLIC_URL}/images/default.png` });

export default function StoreProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [panel, setPanel] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const refreshCart = async () => setCart((await api('/cart')).data);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ page, limit: 8, sort: 'newest', ...(query ? { q: query } : {}), ...(category ? { category } : {}) });
    api(`/books?${params}`, { signal: controller.signal }).then(result => {
      setBooks(result.data.map(mapBook)); setPagination(result.pagination);
    }).catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, category, page, retry]);

  useEffect(() => {
    api('/categories?limit=100').then(result => setCategories(result.data)).catch(err => setNotice(err.message));
    if (sessionStorage.getItem('bookstore-token')) {
      api('/auth/me').then(result => { setUser(result.data); return refreshCart(); }).catch(err => {
        sessionStorage.removeItem('bookstore-token'); setNotice(err.message);
      });
    }
  }, []);

  async function addToCart(book) {
    if (!user) { setPanel('account'); setNotice('Please sign in to add books to your cart.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const current = (await api('/cart')).data;
      const quantity = (current.items.find(item => item.book?._id === book.id)?.quantity || 0) + 1;
      await api(`/cart/items/${book.id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      await refreshCart(); setNotice('Book added to cart.');
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  return <Store.Provider value={{ books, categories, query, category, page, pagination, loading, error, user, setUser, cart, refreshCart, panel, setPanel, notice, setNotice, busy, addToCart,
    search: value => { setQuery(value.trim()); setPage(1); },
    selectCategory: value => { setCategory(value); setPage(1); },
    setPage, reload: () => setRetry(value => value + 1),
  }}>{children}</Store.Provider>;
}
