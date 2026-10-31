import Billboard from '../components/Billboard';
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
} from '../components/HomeSections';

export default function Home() {
  return <>
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
  </>;
}
