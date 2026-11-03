import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { money } from '../data/placeholders';
import { useEffect, useState } from "react";
import { placeholderAssets } from "../data/placeholders";

function Navbar() {
  const { user, signOut } = useAuth();
  const { cart } = useCart();
  const { search } = useCatalog();
  const navigate = useNavigate();
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
                <Link to={user ? "/orders" : "/login"} className="user-account for-buy">
                  <i className="icon icon-user" />
                  <span>{user?.name || "Sign in"}</span>
                </Link>
                {user && <button type="button" className="link-button" onClick={signOut}>Sign out</button>}
                <Link to="/cart" className="cart for-buy">
                  <i className="icon icon-clipboard" />
                  <span>Cart:({money(user ? cart.subtotal : 0)})</span>
                </Link>
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
                      onSubmit={(e) => { e.preventDefault(); search(new FormData(e.currentTarget).get("q")); navigate("/books"); }}
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
                <Link to="/">
                  <img src={placeholderAssets.logo} alt="Booksaw home" />
                </Link>
              </div>
            </div>
            <div className="col-md-10">
              <nav id="navbar">
                <div className="main-menu stellarnav">
                  <ul className={`menu-list${menuOpen ? " responsive" : ""}`}>
                    <li className="menu-item">
                      <Link to="/" className="nav-link" onClick={closeMenu}>Home</Link>
                    </li>
                    <li className="menu-item">
                      <Link to="/#featured-books" className="nav-link" onClick={closeMenu}>New Arrivals</Link>
                    </li>
                    <li className="menu-item">
                      <Link to="/books" className="nav-link" onClick={closeMenu}>Browse Books</Link>
                    </li>
                    {user && (
                      <li className="menu-item">
                        <Link to="/orders" className="nav-link" onClick={closeMenu}>My Orders</Link>
                      </li>
                    )}
                    {user?.role === "ADMIN" && (
                      <li className="menu-item">
                        <Link to="/admin" className="nav-link" onClick={closeMenu}>Manage Store</Link>
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    className={`hamburger${menuOpen ? " active" : ""}`}
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
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

export default Navbar;
