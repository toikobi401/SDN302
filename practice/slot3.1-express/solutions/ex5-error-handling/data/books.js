// Dữ liệu tạm lưu trong bộ nhớ (mất khi restart server).
// Ở Slot 3.2 - 3.3 sẽ thay bằng MongoDB.
const books = [
  { id: 1, title: 'Clean Code', author: 'Robert C. Martin', year: 2008 },
  { id: 2, title: "You Don't Know JS", author: 'Kyle Simpson', year: 2014 },
  { id: 3, title: 'Dế Mèn phiêu lưu ký', author: 'Tô Hoài', year: 1941 },
];

module.exports = books;
