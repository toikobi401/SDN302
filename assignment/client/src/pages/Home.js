import { useApi } from '../api';
import Billboard from '../components/Billboard';
import { mapBook } from '../components/ui';
import {
  BestSelling,
  ClientHolder,
  DownloadApp,
  FeaturedBooks,
  LatestBlog,
  Quotation,
  SpecialOffer,
  Subscribe,
} from '../components/HomeSections';

export default function Home() {
  // Not the catalog context: filters chosen on the Browse page must not change the home page.
  const { data, loading, error } = useApi('/books?limit=4&sort=newest');
  const latest = { books: (data || []).map(mapBook), loading, error };
  return <>
    <Billboard />
    <ClientHolder />
    <FeaturedBooks {...latest} />
    <BestSelling {...latest} />
    <Quotation />
    <SpecialOffer />
    <Subscribe />
    <LatestBlog />
    <DownloadApp />
  </>;
}
