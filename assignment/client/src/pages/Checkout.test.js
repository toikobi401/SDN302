import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Checkout from './Checkout';
import { api } from '../api';
import { useCart } from '../context/CartContext';

jest.mock('../api', () => ({ api: jest.fn() }));
jest.mock('../context/CartContext', () => ({ useCart: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'order-key' } });
  useCart.mockReturnValue({ cart: { items: [{ book: { _id: 'book-1', title: 'Book' }, format: 'PHYSICAL', quantity: 1, lineTotal: 1000 }], subtotal: 1000 }, refreshCart: jest.fn() });
});

function showCheckout() {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Checkout /></MemoryRouter>);
}

test('shows required field errors on submit and focuses the first invalid field without placing an order', () => {
  showCheckout();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  for (const label of ['Recipient name', 'Phone number', 'Street address', 'Province or city']) {
    const input = screen.getByLabelText(label);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(`${label} is required.`);
  }
  expect(screen.getByLabelText('Recipient name')).toHaveFocus();
  expect(api).not.toHaveBeenCalled();
});

test('rejects whitespace and malformed phone numbers, then clears errors after correction', () => {
  showCheckout();
  fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: '   ' } });
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: 'abc' } });
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  expect(screen.getByText('Recipient name is required.')).toBeInTheDocument();
  expect(screen.getByText(/Phone number must/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Customer' } });
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0901234567' } });
  expect(screen.queryByText('Recipient name is required.')).not.toBeInTheDocument();
  expect(screen.queryByText(/Phone number must/)).not.toBeInTheDocument();
  expect(api).not.toHaveBeenCalled();
});

test('submits valid delivery details while optional fields remain empty', async () => {
  api.mockRejectedValue(new Error('Test server response'));
  showCheckout();
  for (const [label, value] of Object.entries({ 'Recipient name': 'Customer', 'Phone number': '0901234567', 'Street address': '123 Street', 'Province or city': 'HCM' })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  await waitFor(() => expect(api).toHaveBeenCalledWith('/orders', expect.anything()));
  const body = JSON.parse(api.mock.calls[0][1].body);
  expect(body.shippingAddress).toEqual({ recipientName: 'Customer', phone: '0901234567', addressLine: '123 Street', province: 'HCM' });
  expect(await screen.findByText('Test server response')).toBeInTheDocument();
});

test('PDF-only checkout does not require delivery fields', async () => {
  const context = useCart();
  context.cart.items[0].format = 'PDF';
  api.mockRejectedValue(new Error('Test server response'));
  showCheckout();
  expect(screen.queryByLabelText('Recipient name')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  await screen.findByText('Test server response');
  const body = JSON.parse(api.mock.calls[0][1].body);
  expect(body).not.toHaveProperty('shippingAddress');
  expect(body.paymentMethod).toBe('PAYOS');
});
