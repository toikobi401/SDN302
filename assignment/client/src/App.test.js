import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { cloudImage, slugify } from './components/ui';

beforeEach(() => { window.scrollTo = jest.fn(); });

test('Browse Books is its own page and shows a fetched book', async () => {
  window.history.pushState({}, '', '/books');
  const book = { _id: 'b1', title: 'A Test Book', authors: ['An Author'], price: 1000, stock: 2, imageUrls: [] };
  global.fetch = jest.fn(async url => ({
    ok: true, status: 200,
    json: async () => (String(url).includes('/books') ? { data: [book], pagination: { pages: 1 } } : { data: [] }),
  }));
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Browse Books' })).toBeInTheDocument();
  expect((await screen.findAllByRole('link', { name: 'A Test Book' }))[0]).toHaveAttribute('href', '/books/b1');
});

test('home page has no Browse section and fetches its own latest books', async () => {
  window.history.pushState({}, '', '/');
  global.fetch = jest.fn(async url => ({
    ok: true, status: 200,
    json: async () => (String(url).includes('/books') ? { data: [], pagination: { pages: 0 } } : { data: [] }),
  }));
  render(<App />);
  expect(screen.queryByRole('heading', { name: 'Browse Books' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Browse Books' })).toHaveAttribute('href', '/books');
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('limit=4&sort=newest'), expect.anything()));
});

test('Browse Books search sends the query to the catalog API', async () => {
  window.history.pushState({}, '', '/books');
  global.fetch = jest.fn(async url => ({
    ok: true, status: 200,
    json: async () => (String(url).includes('/books') ? { data: [], pagination: { pages: 0 } } : { data: [] }),
  }));
  render(<App />);
  userEvent.type(screen.getByLabelText('Search by title, author or ISBN'), 'Dune{enter}');
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('q=Dune'), expect.anything()));
});

test('cloudImage only rewrites Cloudinary URLs', () => {
  expect(cloudImage('https://res.cloudinary.com/x/image/upload/v1/a.jpg', 400)).toBe('https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_400/v1/a.jpg');
  expect(cloudImage('/images/a.jpg', 400)).toBe('/images/a.jpg');
});

test('slugify handles Vietnamese titles', () => {
  expect(slugify('Đắc Nhân Tâm: Bản mới')).toBe('dac-nhan-tam-ban-moi');
});
