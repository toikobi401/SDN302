import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { mapBook } from '../components/ui';
import { useCart } from './CartContext';

const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);

// Shared because the search box lives in the Navbar and the results on the home page.
export function CatalogProvider({ children }) {
  const { setNotice } = useCart();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ page, limit: 8, sort, ...(query ? { q: query } : {}), ...(category ? { category } : {}) });
    api(`/books?${params}`, { signal: controller.signal }).then(result => {
      setBooks(result.data.map(mapBook)); setPagination(result.pagination);
    }).catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, category, sort, page, retry]);

  useEffect(() => {
    api('/categories?limit=100').then(result => setCategories(result.data)).catch(err => setNotice(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CatalogContext.Provider value={{ books, categories, query, category, sort, page, pagination, loading, error, setPage,
    search: value => { setQuery(value.trim()); setPage(1); },
    selectCategory: value => { setCategory(value); setPage(1); },
    selectSort: value => { setSort(value); setPage(1); },
    reload: () => setRetry(value => value + 1),
  }}>{children}</CatalogContext.Provider>;
}
