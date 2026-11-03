import { useCatalog } from '../context/CatalogContext';
import BookCard, { BookSkeletons } from '../components/BookCard';
import { Pager } from '../components/ui';

export default function Browse() {
  const { books, categories, query, search, category, selectCategory, sort, selectSort, loading, error, reload, page, pagination, setPage } = useCatalog();
  const genres = [{ _id: "", name: "All Genre" }, ...categories];

  return (
    <section id="popular-books" className="bookshelf py-5 my-5">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-header align-center">
              <div className="title">
                <span>Some quality items</span>
              </div>
              <h1 className="section-title">Browse Books</h1>
            </div>
            <ul className="tabs">
              {genres.map((item) => (
                <li
                  key={item._id}
                  className={`tab${category === item._id ? " active" : ""}`}
                >
                  <button type="button" aria-pressed={category === item._id} onClick={() => selectCategory(item._id)}>{item.name}</button>
                </li>
              ))}
            </ul>
            <div className="toolbar">
              <form role="search" onSubmit={(event) => { event.preventDefault(); search(new FormData(event.currentTarget).get("q")); }}>
                {/* key resets the box when the Navbar search changes the query */}
                <label>Search by title, author or ISBN<input key={query} name="q" type="search" defaultValue={query} /></label>
              </form>
              <label>Sort by
                <select value={sort} onChange={(event) => selectSort(event.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="title">Title</option>
                  <option value="pdf_first">PDF available first</option>
                </select>
              </label>
            </div>
            {error && <p className="message error" role="alert">{error} <button type="button" className="action outline" onClick={reload}>Try again</button></p>}
            {!loading && !error && !books.length && <p>No books match your search. Try another title, author or category.</p>}
            <div className="tab-content">
              <div data-tab-content="" className="active">
                <div className="row">
                  {loading && <BookSkeletons count={8} />}
                  {!loading && !error && books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
                {!loading && !error && <Pager page={page} pages={pagination.pages} onChange={setPage} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
