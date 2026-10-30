import { useState } from "react";
import { placeholderBanners } from "../data/placeholders";

function Billboard() {
  const [index, setIndex] = useState(0);
  const total = placeholderBanners.length;

  const go = (step) => setIndex((current) => (current + step + total) % total);

  return (
    <section id="billboard">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <button type="button" className="prev slick-arrow" onClick={() => go(-1)}>
              <i className="icon icon-arrow-left" />
            </button>

            <div className="main-slider pattern-overlay">
              {placeholderBanners.map((banner, i) => (
                <div
                  key={banner.id}
                  className={`slider-item${i === index ? " active" : ""}`}
                  hidden={i !== index}
                >
                  <div className="banner-content">
                    <h2 className="banner-title">{banner.title}</h2>
                    <p>{banner.description}</p>
                    <div className="btn-wrap">
                      <a href="#featured-books" className="btn btn-outline-accent btn-accent-arrow">
                        Read More
                        <i className="icon icon-ns-arrow-right" />
                      </a>
                    </div>
                  </div>
                  <img src={banner.image} alt={banner.title} className="banner-image" />
                </div>
              ))}
            </div>

            <button type="button" className="next slick-arrow" onClick={() => go(1)}>
              <i className="icon icon-arrow-right" />
            </button>

            <ul className="slick-dots">
              {placeholderBanners.map((banner, i) => (
                <li key={banner.id} className={i === index ? "slick-active" : ""}>
                  <button type="button" onClick={() => setIndex(i)}>
                    {i + 1}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Billboard;
