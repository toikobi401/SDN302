const img = (file) => `${process.env.PUBLIC_URL}/images/${file}`;

export const placeholderBanners = [
  {
    id: "banner-1",
    title: "Life of the Wild",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu feugiat amet, libero ipsum enim pharetra hac.",
    image: img("main-banner1.jpg"),
  },
  {
    id: "banner-2",
    title: "Birds gonna be Happy",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu feugiat amet, libero ipsum enim pharetra hac.",
    image: img("main-banner2.jpg"),
  },
];

export const placeholderClients = [
  img("client-image1.png"),
  img("client-image2.png"),
  img("client-image3.png"),
  img("client-image4.png"),
  img("client-image5.png"),
];

export const placeholderFeaturedBooks = [
  { id: "f1", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("product-item1.jpg") },
  { id: "f2", title: "Great travel at desert", author: "Sanchit Howdy", price: 38, image: img("product-item2.jpg") },
  { id: "f3", title: "The lady beauty Scarlett", author: "Arthur Doyle", price: 45, image: img("product-item3.jpg") },
  { id: "f4", title: "Once upon a time", author: "Klien Marry", price: 35, image: img("product-item4.jpg") },
];

export const placeholderBestSeller = {
  id: "best-1",
  title: "Birds gonna be happy",
  author: "Timbur Hood",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu feugiat amet, libero ipsum enim pharetra hac.",
  price: 45,
  image: img("single-image.jpg"),
};

export const placeholderGenres = [
  { id: "all-genre", label: "All Genre" },
  { id: "business", label: "Business" },
  { id: "technology", label: "Technology" },
  { id: "romantic", label: "Romantic" },
  { id: "adventure", label: "Adventure" },
  { id: "fictional", label: "Fictional" },
];

export const placeholderPopularBooks = {
  "all-genre": [
    { id: "p1", title: "Portrait photography", author: "Adam Silber", price: 40, image: img("tab-item1.jpg") },
    { id: "p2", title: "Once upon a time", author: "Klien Marry", price: 35, image: img("tab-item2.jpg") },
    { id: "p3", title: "Tips of simple lifestyle", author: "Bratt Smith", price: 40, image: img("tab-item3.jpg") },
    { id: "p4", title: "Just felt from outside", author: "Nicole Wilson", price: 40, image: img("tab-item4.jpg") },
    { id: "p5", title: "Peaceful Enlightment", author: "Marmik Lama", price: 40, image: img("tab-item5.jpg") },
    { id: "p6", title: "Great travel at desert", author: "Sanchit Howdy", price: 40, image: img("tab-item6.jpg") },
    { id: "p7", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item7.jpg") },
    { id: "p8", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item8.jpg") },
  ],
  business: [
    { id: "b1", title: "Peaceful Enlightment", author: "Marmik Lama", price: 40, image: img("tab-item2.jpg") },
    { id: "b2", title: "Great travel at desert", author: "Sanchit Howdy", price: 40, image: img("tab-item4.jpg") },
    { id: "b3", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item6.jpg") },
    { id: "b4", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item8.jpg") },
  ],
  technology: [
    { id: "t1", title: "Peaceful Enlightment", author: "Marmik Lama", price: 40, image: img("tab-item1.jpg") },
    { id: "t2", title: "Great travel at desert", author: "Sanchit Howdy", price: 40, image: img("tab-item3.jpg") },
    { id: "t3", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item5.jpg") },
    { id: "t4", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item7.jpg") },
  ],
  romantic: [
    { id: "r1", title: "Peaceful Enlightment", author: "Marmik Lama", price: 40, image: img("tab-item1.jpg") },
    { id: "r2", title: "Great travel at desert", author: "Sanchit Howdy", price: 40, image: img("tab-item3.jpg") },
    { id: "r3", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item5.jpg") },
    { id: "r4", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item7.jpg") },
  ],
  adventure: [
    { id: "a1", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item5.jpg") },
    { id: "a2", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item7.jpg") },
  ],
  fictional: [
    { id: "fi1", title: "Life among the pirates", author: "Armor Ramsey", price: 40, image: img("tab-item5.jpg") },
    { id: "fi2", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("tab-item7.jpg") },
  ],
};

export const placeholderQuote = {
  text: "The more that you read, the more things you will know. The more that you learn, the more places you’ll go.",
  author: "Dr. Seuss",
};

export const placeholderOfferBooks = [
  { id: "o1", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, prevPrice: 50, image: img("product-item5.jpg") },
  { id: "o2", title: "Great travel at desert", author: "Sanchit Howdy", price: 38, prevPrice: 30, image: img("product-item6.jpg") },
  { id: "o3", title: "The lady beauty Scarlett", author: "Arthur Doyle", price: 45, prevPrice: 35, image: img("product-item7.jpg") },
  { id: "o4", title: "Once upon a time", author: "Klien Marry", price: 35, prevPrice: 25, image: img("product-item8.jpg") },
  { id: "o5", title: "Simple way of piece life", author: "Armor Ramsey", price: 40, image: img("product-item2.jpg") },
];

export const placeholderArticles = [
  { id: "art-1", title: "Reading books always makes the moments happy", date: "Mar 30, 2021", category: "inspiration", image: img("post-img1.jpg") },
  { id: "art-2", title: "Reading books always makes the moments happy", date: "Mar 29, 2021", category: "inspiration", image: img("post-img2.jpg") },
  { id: "art-3", title: "Reading books always makes the moments happy", date: "Feb 27, 2021", category: "inspiration", image: img("post-img3.jpg") },
];

export const placeholderAssets = {
  logo: img("main-logo.png"),
  device: img("device.png"),
  googlePlay: img("google-play.jpg"),
  appStore: img("app-store.jpg"),
};

export const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value));
