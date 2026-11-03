import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { TOKEN } from './api';

const administrator = { _id: 'a1', name: 'Store Owner', role: 'ADMIN' };
const customer = { _id: 'u1', name: 'Customer', role: 'CUSTOMER' };

function mockApi(account = administrator) {
  global.fetch = jest.fn(async url => {
    const path = new URL(url, window.location.origin).pathname;
    let data = [];
    if (path === '/api/auth/me') data = account;
    if (path === '/api/auth/login') data = { token: 'signed-in-token', user: account };
    if (path === '/api/admin/reports/summary') data = { revenue: { totalCollected: 0, orders: 0 }, ordersByStatus: [] };
    if (path === '/api/cart') data = { items: [], subtotal: 0 };
    return { ok: true, status: 200, json: async () => ({ data, pagination: { pages: 0 } }) };
  });
}

function signIn() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'account@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.submit(screen.getByLabelText('Password').closest('form'));
}

function expectSeparateAdminPage() {
  expect(document.querySelector('#header-wrap')).not.toBeInTheDocument();
  expect(document.querySelector('#footer')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Browse Books' })).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox', { name: 'Search books' })).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => /^\/api\/(?:cart|books|categories)(?:[/?]|$)/.test(url))).toBe(false);
}

beforeEach(() => {
  sessionStorage.clear();
  window.scrollTo = jest.fn();
  mockApi();
});

afterEach(() => sessionStorage.clear());

test('admin login is separate from the storefront and has no registration link', () => {
  window.history.replaceState({}, '', '/admin/login');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Create an account/ })).not.toBeInTheDocument();
  expectSeparateAdminPage();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([
  ['/admin', 'Overview'],
  ['/admin/books', 'Books'],
  ['/admin/categories', 'Categories'],
  ['/admin/orders', 'Orders'],
  ['/admin/coupons', 'Discount codes'],
  ['/admin/missing', 'Page not found'],
])('%s restores the admin session in its own layout', async (path, title) => {
  sessionStorage.setItem(TOKEN, 'saved-token');
  window.history.replaceState({}, '', path);
  render(<App />);
  expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Store management' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View storefront' })).toHaveAttribute('href', '/');
  expectSeparateAdminPage();
});

test('guest admin access signs in on the admin page and returns to the requested URL', async () => {
  window.history.replaceState({}, '', '/admin/books?status=ACTIVE#inventory');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin/login');
  signIn();
  expect(await screen.findByRole('heading', { name: 'Books', level: 1 })).toBeInTheDocument();
  expect(window.location.pathname + window.location.search + window.location.hash).toBe('/admin/books?status=ACTIVE#inventory');
  expect(sessionStorage.getItem(TOKEN)).toBe('signed-in-token');
  expectSeparateAdminPage();
});

test('a customer session cannot load admin data or navigation', async () => {
  mockApi(customer);
  sessionStorage.setItem(TOKEN, 'customer-token');
  window.history.replaceState({}, '', '/admin/orders');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Administrator access only' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Store management' })).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('/api/admin/'))).toBe(false);
  expectSeparateAdminPage();
});

test('admin sign in rejects customer credentials without saving the session', async () => {
  mockApi(customer);
  window.history.replaceState({}, '', '/admin/login');
  render(<App />);
  signIn();
  expect(await screen.findByRole('alert')).toHaveTextContent('Administrator access only');
  expect(sessionStorage.getItem(TOKEN)).toBeNull();
  expect(window.location.pathname).toBe('/admin/login');
  expectSeparateAdminPage();
});

test('an administrator signing in through the customer login lands on the admin overview', async () => {
  window.history.replaceState({}, '', '/login');
  render(<App />);
  signIn();
  expect(await screen.findByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  expect(document.querySelector('#header-wrap')).not.toBeInTheDocument();
  expect(document.querySelector('#footer')).not.toBeInTheDocument();
});

test('a customer signing in still returns to their requested order page', async () => {
  mockApi(customer);
  window.history.replaceState({}, '', '/orders');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
  signIn();
  expect(await screen.findByRole('heading', { name: 'My orders', level: 1 })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/orders');
  expect(document.querySelector('#header-wrap')).toBeInTheDocument();
  expect(document.querySelector('#footer')).toBeInTheDocument();
});

test('an existing admin session skips the admin login page', async () => {
  sessionStorage.setItem(TOKEN, 'saved-token');
  window.history.replaceState({}, '', '/admin/login');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  expectSeparateAdminPage();
});

test('signing out of admin clears the session and returns to admin login', async () => {
  sessionStorage.setItem(TOKEN, 'saved-token');
  window.history.replaceState({}, '', '/admin');
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
  expect(sessionStorage.getItem(TOKEN)).toBeNull();
  expect(window.location.pathname).toBe('/admin/login');
  expectSeparateAdminPage();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' })));
});
