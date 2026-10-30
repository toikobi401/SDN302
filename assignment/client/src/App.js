import StoreProvider, { useStore } from './Store';
import StorePanel from './components/StorePanel';
import './App.css';
import Header from './components/Header';
import Billboard from './components/Billboard';
import Footer from './components/Footer';
import {
  BestSelling,
  ClientHolder,
  DownloadApp,
  FeaturedBooks,
  LatestBlog,
  PopularBooks,
  Quotation,
  SpecialOffer,
  Subscribe,
} from './components/HomeSections';

function Storefront() {
  const { notice } = useStore();
  return (
    <div className="App">
      <Header />
      <main>
        {notice && <p className="container" role="status">{notice}</p>}
        <StorePanel />
        <Billboard />
        <ClientHolder />
        <FeaturedBooks />
        <BestSelling />
        <PopularBooks />
        <Quotation />
        <SpecialOffer />
        <Subscribe />
        <LatestBlog />
        <DownloadApp />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Storefront /></StoreProvider>;
}
