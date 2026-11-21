import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookDetail from './BookDetail';
import { useApi } from '../api';

jest.mock('../api', () => ({ useApi: jest.fn() }));
jest.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: jest.fn(), busy: false }) }));

const book = {
  _id: 'book-1', title: 'Sample book', authors: ['First author', 'Second author'],
  price: 100000, stock: 3, imageUrls: [], description: 'Full description',
  publisher: 'Sample publisher', isbn: '9781234567897',
  categories: [{ _id: 'category-1', name: 'Literature' }],
  source: 'Open Library', sourceId: 'OL123', ebookFormat: 'EPUB',
  license: 'Public domain', licenseUrl: 'https://example.com/license', pdfForSale: false,
};

function showBook(value) {
  useApi.mockReturnValue({ data: value, loading: false });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BookDetail /></MemoryRouter>);
}

test('shows bibliographic details and category names', () => {
  showBook(book);
  expect(screen.getByText('First author, Second author')).toBeInTheDocument();
  expect(screen.getByText('Full description')).toBeInTheDocument();
  expect(screen.getByText('Literature')).toBeInTheDocument();
  for (const value of ['Sample publisher', '9781234567897', 'Open Library', 'OL123', 'EPUB']) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Public domain' })).toHaveAttribute('href', book.licenseUrl);
  expect(screen.getByText('Not available')).toBeInTheDocument();
});

test('handles missing optional details and an out-of-stock printed book with a PDF for sale', () => {
  showBook({ ...book, publisher: '', isbn: '', description: '', categories: [], source: '', sourceId: '',
    license: '', licenseUrl: '', ebookFormat: undefined, stock: 0, pdfForSale: true, pdfPrice: 20000 });
  expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Add PDF to cart/ })).toBeEnabled();
});
