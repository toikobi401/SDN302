import { useStore } from '../Store';
import { money } from '../data/placeholders';
import { useEffect, useState } from "react";
import { placeholderAssets } from "../data/placeholders";

function Header() {
  const { user, cart, setPanel, search } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const onScroll = () => setFixed(window.scrollY >= 200);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div id="header-wrap" className={searchOpen ? "show" : ""}>
      <div className="top-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
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
                    <a href="#youtube">
                      <i className="icon icon-youtube-play" />
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
            <div className="col-md-6">
              <div className="right-element">
                <a href="#account" onClick={(event) => { event.preventDefault(); setPanel("account"); }} className="user-account for-buy">
                  <i className="icon icon-user" />
                  <span>{user?.name || "Account"}</span>
                </a>
                <a href="#cart" onClick={(event) => { event.preventDefault(); setPanel("cart"); }} className="cart for-buy">
                  <i className="icon icon-clipboard" />
                  <span>Cart:({money(user ? cart.subtotal : 0)})</span>
                </a>
                <div className="action-menu">
                  <div className="search-bar">
                    <a
                      href="#search"
                      className={`search-button search-toggle${searchOpen ? " active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setSearchOpen((open) => !open);
                      }}
                    >
                      <i className="icon icon-search" />
                    </a>
                    <form
                      role="search"
                      className="search-box"
                      onSubmit={(e) => { e.preventDefault(); search(new FormData(e.currentTarget).get("q")); window.location.hash = "popular-books"; }}
                    >
                      <input
                        className="search-field text search-input"
                        name="q" aria-label="Search books" placeholder="Search books"
                        type="search"
                      />
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <header id="header" className={fixed ? "fixed-top" : ""}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              <div className="main-logo">
                <a href="#home">
                  <img src={placeholderAssets.logo} alt="logo" />
                </a>
              </div>
            </div>
            <div className="col-md-10">
              <nav id="navbar">
                <div className="main-menu stellarnav">
                  <ul className={`menu-list${menuOpen ? " responsive" : ""}`}>
                    <li className="menu-item active">
                      <a href="#home">Home</a>
                    </li>
                    <li className="menu-item has-sub">
                      <a href="#pages" className="nav-link">
                        Pages
                      </a>
                      <ul>
                        <li className="active">
                          <a href="#home">Home</a>
                        </li>
                        <li>
                          <a href="#featured-books">About</a>
                        </li>
                        <li>
                          <a href="#popular-books">Our Store</a>
                        </li>
                        <li>
                          <a href="#latest-blog">Blog</a>
                        </li>
                        <li>
                          <a href="#download-app">Contact</a>
                        </li>
                      </ul>
                    </li>
                    <li className="menu-item">
                      <a href="#featured-books" className="nav-link" onClick={closeMenu}>
                        Featured
                      </a>
                    </li>
                    <li className="menu-item">
                      <a href="#popular-books" className="nav-link" onClick={closeMenu}>
                        Popular
                      </a>
                    </li>
                    <li className="menu-item">
                      <a href="#special-offer" className="nav-link" onClick={closeMenu}>
                        Offer
                      </a>
                    </li>
                    <li className="menu-item">
                      <a href="#latest-blog" className="nav-link" onClick={closeMenu}>
                        Articles
                      </a>
                    </li>
                    <li className="menu-item">
                      <a href="#download-app" className="nav-link" onClick={closeMenu}>
                        Download App
                      </a>
                    </li>
                  </ul>
                  <button
                    type="button"
                    className={`hamburger${menuOpen ? " active" : ""}`}
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Toggle menu"
                  >
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;
