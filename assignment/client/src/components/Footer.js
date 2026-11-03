import { Link } from 'react-router-dom';
import { placeholderAssets } from "../data/placeholders";

function Footer() {
  return (
    <>
      <footer id="footer">
        <div className="container">
          <div className="row">
            <div className="col-md-4">
              <div className="footer-item">
                <div className="company-brand">
                  <img src={placeholderAssets.logo} alt="logo" className="footer-logo" />
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sagittis sed ptibus
                    liberolectus nonet psryroin. Amet sed lorem posuere sit iaculis amet, ac urna.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="footer-menu">
                <h5>About Us</h5>
                <ul className="menu-list">
                  <li className="menu-item">
                    <a href="#vision">vision</a>
                  </li>
                  <li className="menu-item">
                    <a href="#latest-blog">articles</a>
                  </li>
                  <li className="menu-item">
                    <a href="#careers">careers</a>
                  </li>
                  <li className="menu-item">
                    <a href="#terms">service terms</a>
                  </li>
                  <li className="menu-item">
                    <a href="#donate">donate</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-2">
              <div className="footer-menu">
                <h5>Discover</h5>
                <ul className="menu-list">
                  <li className="menu-item">
                    <a href="#home">Home</a>
                  </li>
                  <li className="menu-item">
                    <Link to="/books">Books</Link>
                  </li>
                  <li className="menu-item">
                    <a href="#featured-books">Authors</a>
                  </li>
                  <li className="menu-item">
                    <Link to="/books">Subjects</Link>
                  </li>
                  <li className="menu-item">
                    <a href="#search">Advanced Search</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-2">
              <div className="footer-menu">
                <h5>My account</h5>
                <ul className="menu-list">
                  <li className="menu-item">
                    <a href="#account">Sign In</a>
                  </li>
                  <li className="menu-item">
                    <a href="#cart">View Cart</a>
                  </li>
                  <li className="menu-item">
                    <a href="#wishlist">My Wishtlist</a>
                  </li>
                  <li className="menu-item">
                    <a href="#orders">Track My Order</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-2">
              <div className="footer-menu">
                <h5>Help</h5>
                <ul className="menu-list">
                  <li className="menu-item">
                    <a href="#help">Help center</a>
                  </li>
                  <li className="menu-item">
                    <a href="#report">Report a problem</a>
                  </li>
                  <li className="menu-item">
                    <a href="#edits">Suggesting edits</a>
                  </li>
                  <li className="menu-item">
                    <a href="#contact">Contact us</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <div id="footer-bottom">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="copyright">
                <div className="row">
                  <div className="col-md-6">
                    <p>
                      © 2022 All rights reserved. Free HTML Template by{" "}
                      <a href="https://www.templatesjungle.com/" target="_blank" rel="noreferrer">
                        TemplatesJungle
                      </a>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <div className="social-links align-right">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Footer;
