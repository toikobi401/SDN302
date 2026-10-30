import { useStore } from '../Store';
import {
  money,
  placeholderArticles,
  placeholderAssets,
  placeholderClients,
  placeholderQuote,
} from "../data/placeholders";
import ProductItem from "./ProductItem";

export function ClientHolder() {
  return (
    <section id="client-holder">
      <div className="container">
        <div className="row">
          <div className="inner-content">
            <div className="logo-wrap">
              <div className="grid">
                {placeholderClients.map((src) => (
                  <a href="#clients" key={src}>
                    <img src={src} alt="client" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturedBooks() {
  const { books, loading, error } = useStore();
  return (
    <section id="featured-books" className="py-5 my-5">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-header align-center">
              <div className="title">
                <span>Some quality items</span>
              </div>
              <h2 className="section-title">New Arrivals</h2>
            </div>
            <div className="product-list">
              <div className="row">
                {!loading && !error && books.slice(0, 4).map((book) => (
                  <ProductItem key={book.id} book={book} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <div className="btn-wrap align-right">
              <a href="#popular-books" className="btn-accent-arrow">
                View all products <i className="icon icon-ns-arrow-right" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BestSelling() {
  const { books, loading, error, addToCart, busy } = useStore();
  const book = books[0];
  if (!book || loading || error) return null;
  return (
    <section id="best-selling" className="leaf-pattern-overlay">
      <div className="corner-pattern-overlay" />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="row">
              <div className="col-md-6">
                <figure className="products-thumb">
                  <img src={book.image} alt={book.title} className="single-image" />
                </figure>
              </div>
              <div className="col-md-6">
                <div className="product-entry">
                  <h2 className="section-title divider">Discover a Book</h2>
                  <div className="products-content">
                    <div className="author-name">By {book.author}</div>
                    <h3 className="item-title">{book.title}</h3>
                    <p>{book.description}</p>
                    <div className="item-price">{money(book.price)}</div>
                    <div className="btn-wrap">
                      <button type="button" disabled={busy || book.stock < 1} onClick={() => addToCart(book)} className="btn-accent-arrow">
                        shop it now <i className="icon icon-ns-arrow-right" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PopularBooks() {
  const { books, categories, category, selectCategory, loading, error, reload, page, pagination, setPage } = useStore();
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
              <h2 className="section-title">Browse Books</h2>
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
            {loading && <p role="status">Loading books...</p>}
            {error && <p role="alert">{error} <button onClick={reload}>Try again</button></p>}
            {!loading && !error && !books.length && <p>No books found.</p>}
            {!loading && !error && pagination.pages > 1 && <div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button> Page {page} / {pagination.pages} <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
            <div className="tab-content">
              <div data-tab-content="" className="active">
                <div className="row">
                  {!loading && !error && books.map((book) => (
                    <ProductItem key={book.id} book={book} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Quotation() {
  return (
    <section id="quotation" className="align-center pb-5 mb-5">
      <div className="inner-content">
        <h2 className="section-title divider">Quote of the day</h2>
        <blockquote>
          <q>“{placeholderQuote.text}”</q>
          <div className="author-name">{placeholderQuote.author}</div>
        </blockquote>
      </div>
    </section>
  );
}

// No promotions endpoint or discount fields are provided by the API.
export function SpecialOffer() { return null; }

export function Subscribe() {
  return (
    <section id="subscribe">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="row">
              <div className="col-md-6">
                <div className="title-element">
                  <h2 className="section-title divider">Subscribe to our newsletter</h2>
                </div>
              </div>
              <div className="col-md-6">
                <div className="subscribe-content">
                  <p>
                    Sed eu feugiat amet, libero ipsum enim pharetra hac dolor sit amet, consectetur.
                    Elit adipiscing enim pharetra hac.
                  </p>
                  <form id="form" onSubmit={(e) => e.preventDefault()}>
                    <input type="text" name="email" placeholder="Enter your email addresss here" />
                    <button type="submit" className="btn-subscribe">
                      <span>send</span>
                      <i className="icon icon-send" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestBlog() {
  return (
    <section id="latest-blog" className="py-5 my-5">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-header align-center">
              <div className="title">
                <span>Read our articles</span>
              </div>
              <h2 className="section-title">Latest Articles</h2>
            </div>
            <div className="row">
              {placeholderArticles.map((article) => (
                <div className="col-md-4" key={article.id}>
                  <article className="column">
                    <figure>
                      <a href="#article" className="image-hvr-effect">
                        <img src={article.image} alt={article.title} className="post-image" />
                      </a>
                    </figure>
                    <div className="post-item">
                      <div className="meta-date">{article.date}</div>
                      <h3>
                        <a href="#article">{article.title}</a>
                      </h3>
                      <div className="links-element">
                        <div className="categories">{article.category}</div>
                        <div className="social-links">
                          <ul>
                            <li>
                              <a href="#facebook">
                                <i className="icon icon-facebook" />
                              </a>
                            </li>
                            <li>
                              <a href="#twitter">
                                <i className="icon icon-twitter" />
                              </a>
                            </li>
                            <li>
                              <a href="#behance">
                                <i className="icon icon-behance-square" />
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
            <div className="row">
              <div className="btn-wrap align-center">
                <a href="#latest-blog" className="btn btn-outline-accent btn-accent-arrow">
                  Read All Articles
                  <i className="icon icon-ns-arrow-right" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DownloadApp() {
  return (
    <section id="download-app" className="leaf-pattern-overlay">
      <div className="corner-pattern-overlay" />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="row">
              <div className="col-md-5">
                <figure>
                  <img src={placeholderAssets.device} alt="phone" className="single-image" />
                </figure>
              </div>
              <div className="col-md-7">
                <div className="app-info">
                  <h2 className="section-title divider">Download our app now !</h2>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sagittis sed ptibus
                    liberolectus nonet psryroin. Amet sed lorem posuere sit iaculis amet, ac urna.
                  </p>
                  <div className="google-app">
                    <img src={placeholderAssets.googlePlay} alt="google play" />
                    <img src={placeholderAssets.appStore} alt="app store" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
