// Downloads the book catalog and covers into data/books.
// With --pdf it instead uses the saved catalog to download about 50 OpenStax PDFs under 100 MB each.
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');

const OUT = path.resolve(__dirname, '../data/books');
const COVERS = path.join(OUT, 'covers');
const PDFS = path.join(OUT, 'pdfs');
const LITERATURE_COUNT = 150;
const MIN_LITERATURE_COUNT = 100;
// Their covers show a magazine issue rather than the book, so they stay out of the catalog.
const EXCLUDED_IDS = new Set(["gutenberg-68283","gutenberg-78073","gutenberg-78088","gutenberg-78116","gutenberg-78072","gutenberg-78057","gutenberg-78035","gutenberg-67173","gutenberg-66446","gutenberg-67160"]);
const PDF_COUNT = 50;
const MAX_PDF_BYTES = 100 * 1000 * 1000;
const HEADERS = { 'User-Agent': 'SDN302 course project (book catalog import)', Accept: 'application/json, */*' };
const LITERATURE = /fiction|novel|stories|short stories|poetry|poems|drama|plays|tales|romance|literature/i;
// Popular but not literature, even when a shelf such as "Classics of Literature" matches.
const NOT_LITERATURE = /philosophy|ethics|political|economics|psychology|encyclopedias|cookery|cooking|history\b|science -- |cipher|military art|handbooks|law\b|biography|autobiograph|religio|church|theolog|christian|saints|sex\b|sexual|erotic|description and travel/i;
const LITERARY_SUBJECT = /fiction|stories|drama|plays|poetry|poems|tragedies|comedies|tales/i;
// Single volumes and magazine issues do not make sense as separate shop items.
const NOT_A_SINGLE_BOOK = /\bvol(ume|\.)\s*\d|\bnumber\s+\d|\bworks of\b/i;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const stripHtml = html => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const cleanTitle = title => title.replace(/\s*:\s*\$b\s*/g, ': ').replace(/\s+/g, ' ').trim();
function personName(name) {
  const [last, first] = name.replace(/\s*\([^)]*\)/g, '').split(', ');
  if (!first) return last;
  // Particles follow the name: "Chrétien, de Troyes" becomes "Chrétien de Troyes".
  return /^(of|de|abbé)\b/.test(first) ? `${last} ${first}` : `${first} ${last}`;
}
const dedupeKey = (title, authors) => `${title.split(/[;:]/)[0].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${authors[0] || ''}`;

async function request(url, options = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { method: options.method || 'GET', headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(options.timeout || 60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === 4) throw new Error(`${url}: ${error.message}`, { cause: error });
      await wait(5000 * attempt);
    }
  }
}

async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  }));
  return results;
}

function isImage(file, bytes) {
  if (file.endsWith('.svg')) return /<svg[\s>]/.test(bytes.toString('utf8', 0, 4096));
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

// Writes through a temporary name so an interrupted run never leaves a partial file behind.
async function saveCover(url, file) {
  const target = path.join(OUT, file);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const bytes = Buffer.from(await (await request(url)).arrayBuffer());
  if (!isImage(file, bytes)) throw new Error(`${url}: not a valid cover image`);
  fs.writeFileSync(`${target}.part`, bytes);
  fs.renameSync(`${target}.part`, target);
}

async function savePdf(book) {
  const target = path.join(PDFS, `${book.id}.pdf`);
  const part = `${target}.part`;
  try {
    const response = await request(book.ebook.url, { timeout: 30 * 60 * 1000 });
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(part));
    const handle = fs.openSync(part, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(handle, header, 0, 4, 0);
    fs.closeSync(handle);
    if (header.toString() !== '%PDF') throw new Error('not a PDF');
    if (fs.statSync(part).size >= MAX_PDF_BYTES) throw new Error('over the size limit');
    fs.renameSync(part, target);
  } finally {
    fs.rmSync(part, { force: true });
  }
}

async function pdfSize(book) {
  try {
    const response = await request(book.ebook.url, { method: 'HEAD' });
    return Number(response.headers.get('content-length')) || null;
  } catch {
    return null;
  }
}

const isOpenLicense = book => !/NonCommercial/i.test(book.license);

async function downloadPdfs() {
  const catalogFile = path.join(OUT, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  fs.mkdirSync(PDFS, { recursive: true });
  const textbooks = catalog.books.filter(book => book.ebook.format === 'PDF');
  const sizes = await mapLimit(textbooks, 4, pdfSize);
  // Fewest licence restrictions first, then smallest, so the set stays as light as possible.
  const candidates = textbooks.map((book, index) => ({ book, size: sizes[index] }))
    .filter(({ size }) => size && size < MAX_PDF_BYTES)
    .sort((a, b) => isOpenLicense(b.book) - isOpenLicense(a.book) || a.size - b.size);
  const queue = [...candidates];
  let saved = 0;
  let failed = 0;
  let active = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (queue.length && saved + active < PDF_COUNT) {
      const { book } = queue.shift();
      active += 1;
      try {
        const target = path.join(PDFS, `${book.id}.pdf`);
        if (!fs.existsSync(target)) await savePdf(book);
        saved += 1;
        book.ebook.file = `pdfs/${book.id}.pdf`;
        book.ebook.sizeBytes = fs.statSync(target).size;
        console.log(`PDF ${saved}/${PDF_COUNT}: ${book.id}`);
      } catch (error) {
        failed += 1;
        console.error(`Skipped ${book.id}: ${error.message}`);
      } finally {
        active -= 1;
      }
    }
  }));
  fs.writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
  const total = textbooks.reduce((sum, book) => sum + (book.ebook.sizeBytes || 0), 0);
  console.log(`Saved ${saved} PDFs (${(total / 1e9).toFixed(2)} GB) to ${PDFS}; ${candidates.length} textbooks were under the limit`);
  if (failed) process.exitCode = 1;
}

async function fetchLiterature() {
  const books = [];
  const seen = new Set();
  let excluded = 0;
  let url = 'https://gutendex.com/books/?copyright=false&languages=en';
  while (url && books.length + excluded < LITERATURE_COUNT) {
    let page;
    try {
      page = await (await request(url)).json();
    } catch (error) {
      // The public Gutendex instance often fails on deeper pages; rerun later to reach the full count.
      if (books.length < MIN_LITERATURE_COUNT) throw error;
      console.warn(`Stopped at ${books.length} literature books: ${error.message}`);
      break;
    }
    for (const item of page.results) {
      const authors = item.authors.map(author => personName(author.name));
      const labels = [...item.subjects, ...item.bookshelves].join(' | ');
      const key = dedupeKey(item.title, authors);
      const cover = item.formats['image/jpeg'];
      const epub = item.formats['application/epub+zip'];
      if (item.media_type !== 'Text' || !cover || !epub || !authors.length || seen.has(key)) continue;
      const subjects = item.subjects.join(' | ');
      if (NOT_A_SINGLE_BOOK.test(item.title) || !LITERATURE.test(labels)) continue;
      if (NOT_LITERATURE.test(subjects) && !LITERARY_SUBJECT.test(subjects)) continue;
      seen.add(key);
      if (EXCLUDED_IDS.has(`gutenberg-${item.id}`)) {
        excluded += 1;
        if (books.length + excluded === LITERATURE_COUNT) break;
        continue;
      }
      books.push({
        id: `gutenberg-${item.id}`,
        source: 'gutenberg',
        category: 'Literature',
        title: cleanTitle(item.title),
        authors,
        description: stripHtml(item.summaries[0]),
        subjects: item.subjects,
        isbn: null,
        license: 'Public domain in the USA',
        licenseUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
        downloadCount: item.download_count,
        cover: `covers/gutenberg-${item.id}.jpg`,
        coverSourceUrl: cover,
        ebook: { format: 'EPUB', url: epub },
      });
      if (books.length + excluded === LITERATURE_COUNT) break;
    }
    url = page.next;
    await wait(2000);
  }
  return books;
}

function seniorOrAllAuthors(authors) {
  const senior = authors.filter(author => author.value.senior_author);
  const names = (senior.length ? senior : authors).map(author => author.value.name);
  return names.length ? names : ['OpenStax'];
}

async function fetchTextbooks() {
  const { books } = await (await request('https://openstax.org/apps/cms/api/books?format=json')).json();
  const live = books.filter(book => book.book_state === 'live');
  return mapLimit(live, 3, async summary => {
    const slug = summary.slug.replace(/^books\//, '');
    const detail = await (await request(`https://openstax.org/apps/cms/api/books/${slug}/?format=json`)).json();
    const extension = path.extname(new URL(summary.cover_url).pathname) || '.svg';
    return {
      id: `openstax-${slug}`,
      source: 'openstax',
      category: 'Textbook',
      title: summary.title,
      authors: seniorOrAllAuthors(detail.authors),
      description: stripHtml(detail.description),
      subjects: summary.subjects,
      isbn: detail.print_isbn_13 || detail.digital_isbn_13 || null,
      license: detail.license_name,
      licenseUrl: detail.license_url,
      downloadCount: null,
      cover: `covers/openstax-${slug}${extension}`,
      coverSourceUrl: summary.cover_url,
      ebook: { format: 'PDF', url: summary.high_resolution_pdf_url || summary.pdf_url },
    };
  });
}

// Classified cover paths and downloaded PDFs exist only locally, so a refetch must carry them over.
function keepLocalWork(books) {
  const file = path.join(OUT, 'catalog.json');
  if (!fs.existsSync(file)) return;
  const previous = new Map(JSON.parse(fs.readFileSync(file, 'utf8')).books.map(book => [book.id, book]));
  for (const book of books) {
    const old = previous.get(book.id);
    if (!old) continue;
    for (const key of ['cover', 'genre', 'coverType', 'coverShowsThisBook']) if (old[key] !== undefined) book[key] = old[key];
    if (old.ebook.file) Object.assign(book.ebook, { file: old.ebook.file, sizeBytes: old.ebook.sizeBytes });
  }
}

function checkCatalog(books) {
  const problems = books.flatMap(book => [
    !book.title && `${book.id}: no title`,
    !book.ebook.url && `${book.id}: no ebook link`,
    !book.coverSourceUrl && `${book.id}: no cover link`,
    !fs.existsSync(path.join(OUT, book.cover)) && `${book.id}: cover file missing`,
  ].filter(Boolean));
  if (new Set(books.map(book => book.id)).size !== books.length) problems.push('duplicate book IDs');
  if (problems.length) throw new Error(`Catalog check failed:\n${problems.join('\n')}`);
}

async function main() {
  fs.mkdirSync(COVERS, { recursive: true });
  const literature = await fetchLiterature();
  const textbooks = await fetchTextbooks();
  const books = [...literature, ...textbooks];
  keepLocalWork(books);
  await mapLimit(books, 3, book => saveCover(book.coverSourceUrl, book.cover));
  checkCatalog(books);
  const keep = new Set(books.map(book => path.join(OUT, book.cover)));
  for (const entry of fs.readdirSync(COVERS, { recursive: true, withFileTypes: true })) {
    const file = path.join(entry.parentPath, entry.name);
    if (entry.isFile() && !keep.has(file)) fs.rmSync(file);
  }
  fs.writeFileSync(path.join(OUT, 'catalog.json'), `${JSON.stringify({ fetchedAt: new Date().toISOString(), books }, null, 2)}\n`);
  console.log(`Saved ${literature.length} literature books and ${textbooks.length} textbooks to ${OUT}`);
}

(process.argv.includes('--pdf') ? downloadPdfs() : main()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
