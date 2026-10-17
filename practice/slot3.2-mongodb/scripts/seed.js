// Tạo lại dữ liệu luyện tập (xoá sạch rồi chèn lại). Chạy bằng mongosh:
//   mongosh mongodb://127.0.0.1:27027 scripts/seed.js     (hoặc: .\scripts\reset-db.ps1)
//
// _id của dữ liệu mẫu cố định (bắt đầu bằng "5f") để kết quả luôn giống nhau mỗi lần seed.

const oid = (prefix, n) => ObjectId(prefix + String(n).padStart(21, '0'));
const movieId = (n) => oid('5f1', n);
const userId = (n) => oid('5f2', n);
const commentId = (n) => oid('5f3', n);
const categoryId = (n) => oid('5f4', n);
const productId = (n) => oid('5f5', n);
const d = (s) => ISODate(s);

// ─────────────────────────── sample_mflix.movies ───────────────────────────
const movies = [
  { title: 'Jurassic World: Fallen Kingdom', year: 2018, rated: 'PG-13', runtime: 128, genres: ['Action', 'Adventure', 'Sci-Fi'], directors: ['J.A. Bayona'], cast: ['Chris Pratt', 'Bryce Dallas Howard', 'Rafe Spall', 'Justice Smith'], countries: ['USA'], languages: ['English'], released: d('2018-06-22'), imdb: { rating: 6.2, votes: 312000 }, awards: { wins: 3, nominations: 15, text: '3 wins & 15 nominations.' }, plot: 'When the island\'s dormant volcano begins roaring to life, Owen and Claire mount a campaign to rescue the remaining dinosaurs.' },
  { title: 'The Favourite', year: 2018, rated: 'R', runtime: 119, genres: ['Biography', 'Comedy', 'Drama'], directors: ['Yorgos Lanthimos'], cast: ['Olivia Colman', 'Emma Stone', 'Rachel Weisz'], countries: ['Ireland', 'UK', 'USA'], languages: ['English'], released: d('2018-11-23'), imdb: { rating: 7.5, votes: 215000 }, awards: { wins: 94, nominations: 247, text: 'Won 1 Oscar. Another 93 wins & 246 nominations.' }, plot: 'In early 18th century England, a frail Queen Anne occupies the throne.' },
  { title: 'Black Panther', year: 2018, rated: 'PG-13', runtime: 134, genres: ['Action', 'Adventure', 'Sci-Fi'], directors: ['Ryan Coogler'], cast: ['Chadwick Boseman', 'Michael B. Jordan', "Lupita Nyong'o", 'Danai Gurira'], countries: ['USA'], languages: ['English', 'Swahili', 'Korean'], released: d('2018-02-16'), imdb: { rating: 7.3, votes: 830000 }, awards: { wins: 113, nominations: 285, text: 'Won 3 Oscars. Another 110 wins & 282 nominations.' }, plot: "T'Challa, heir to the hidden but advanced kingdom of Wakanda, must step forward to lead his people." },
  { title: 'Incredibles 2', year: 2018, rated: 'PG', runtime: 118, genres: ['Animation', 'Action', 'Adventure'], directors: ['Brad Bird'], cast: ['Craig T. Nelson', 'Holly Hunter', 'Sarah Vowell', 'Huck Milner'], countries: ['USA'], languages: ['English'], released: d('2018-06-15'), imdb: { rating: 7.6, votes: 320000 }, awards: { wins: 13, nominations: 81, text: 'Nominated for 1 Oscar.' }, plot: 'The Incredibles family takes on a new mission which involves a change in family roles.' },
  { title: 'Avengers: Infinity War', year: 2018, rated: 'PG-13', runtime: 149, genres: ['Action', 'Adventure', 'Sci-Fi'], directors: ['Anthony Russo', 'Joe Russo'], cast: ['Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo', 'Chris Evans'], countries: ['USA'], languages: ['English'], released: d('2018-04-27'), imdb: { rating: 8.4, votes: 1160000 }, awards: { wins: 46, nominations: 79, text: 'Nominated for 1 Oscar.' }, plot: 'The Avengers must stop Thanos before he collects all six Infinity Stones.' },
  { title: 'A Quiet Place', year: 2018, rated: 'PG-13', runtime: 90, genres: ['Drama', 'Horror', 'Sci-Fi'], directors: ['John Krasinski'], cast: ['Emily Blunt', 'John Krasinski', 'Millicent Simmonds', 'Noah Jupe'], countries: ['USA'], languages: ['English', 'American Sign Language'], released: d('2018-04-06'), imdb: { rating: 7.5, votes: 580000 }, awards: { wins: 36, nominations: 131, text: 'Nominated for 1 Oscar.' }, plot: 'A family must live in silence to avoid creatures that hunt by sound.' },
  { title: 'Roma', year: 2018, rated: 'R', runtime: 135, genres: ['Drama'], directors: ['Alfonso Cuarón'], cast: ['Yalitza Aparicio', 'Marina de Tavira'], countries: ['Mexico', 'USA'], languages: ['Spanish', 'Mixtec'], released: d('2018-12-14'), imdb: { rating: 7.7, votes: 165000 }, awards: { wins: 250, nominations: 204, text: 'Won 3 Oscars. Another 247 wins & 201 nominations.' }, plot: 'A year in the life of a middle-class family\'s maid in Mexico City in the early 1970s.' },
  { title: 'Inception', year: 2010, rated: 'PG-13', runtime: 148, genres: ['Action', 'Adventure', 'Sci-Fi'], directors: ['Christopher Nolan'], cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'], countries: ['USA', 'UK'], languages: ['English', 'Japanese', 'French'], released: d('2010-07-16'), imdb: { rating: 8.8, votes: 2500000 }, awards: { wins: 157, nominations: 220, text: 'Won 4 Oscars. Another 153 wins & 216 nominations.' }, plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.' },
  { title: 'The Dark Knight', year: 2008, rated: 'PG-13', runtime: 152, genres: ['Action', 'Crime', 'Drama'], directors: ['Christopher Nolan'], cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'], countries: ['USA', 'UK'], languages: ['English', 'Mandarin'], released: d('2008-07-18'), imdb: { rating: 9.0, votes: 2800000 }, awards: { wins: 164, nominations: 163, text: 'Won 2 Oscars. Another 162 wins & 161 nominations.' }, plot: 'Batman faces the Joker, a criminal mastermind who wants to plunge Gotham City into anarchy.' },
  { title: 'Interstellar', year: 2014, rated: 'PG-13', runtime: 169, genres: ['Adventure', 'Drama', 'Sci-Fi'], directors: ['Christopher Nolan'], cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'], countries: ['USA', 'UK'], languages: ['English'], released: d('2014-11-07'), imdb: { rating: 8.7, votes: 2100000 }, awards: { wins: 44, nominations: 148, text: 'Won 1 Oscar. Another 43 wins & 147 nominations.' }, plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
  { title: 'The Shawshank Redemption', year: 1994, rated: 'R', runtime: 142, genres: ['Drama'], directors: ['Frank Darabont'], cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'], countries: ['USA'], languages: ['English'], released: d('1994-10-14'), imdb: { rating: 9.3, votes: 2900000 }, awards: { wins: 21, nominations: 43, text: 'Nominated for 7 Oscars.' }, plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption.' },
  { title: 'Pulp Fiction', year: 1994, rated: 'R', runtime: 154, genres: ['Crime', 'Drama'], directors: ['Quentin Tarantino'], cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson', 'Bruce Willis'], countries: ['USA'], languages: ['English', 'Spanish', 'French'], released: d('1994-10-14'), imdb: { rating: 8.9, votes: 2200000 }, awards: { wins: 70, nominations: 75, text: 'Won 1 Oscar. Another 69 wins & 74 nominations.' }, plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.' },
  { title: 'Forrest Gump', year: 1994, rated: 'PG-13', runtime: 142, genres: ['Drama', 'Romance'], directors: ['Robert Zemeckis'], cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise'], countries: ['USA'], languages: ['English'], released: d('1994-07-06'), imdb: { rating: 8.8, votes: 2200000 }, awards: { wins: 50, nominations: 75, text: 'Won 6 Oscars. Another 44 wins & 69 nominations.' }, plot: 'The history of the United States from the 1950s to the 70s unfolds from the perspective of an Alabama man.' },
  { title: 'The Lion King', year: 1994, rated: 'G', runtime: 88, genres: ['Animation', 'Adventure', 'Drama'], directors: ['Roger Allers', 'Rob Minkoff'], cast: ['Matthew Broderick', 'Jeremy Irons', 'James Earl Jones'], countries: ['USA'], languages: ['English'], released: d('1994-06-24'), imdb: { rating: 8.5, votes: 1100000 }, awards: { wins: 39, nominations: 35, text: 'Won 2 Oscars. Another 37 wins & 33 nominations.' }, plot: 'Lion prince Simba flees his kingdom after the murder of his father.' },
  { title: 'Toy Story', year: 1995, rated: 'G', runtime: 81, genres: ['Animation', 'Adventure', 'Comedy'], directors: ['John Lasseter'], cast: ['Tom Hanks', 'Tim Allen', 'Don Rickles'], countries: ['USA'], languages: ['English'], released: d('1995-11-22'), imdb: { rating: 8.3, votes: 1050000 }, awards: { wins: 29, nominations: 23, text: 'Nominated for 3 Oscars.' }, plot: "A cowboy doll is profoundly threatened when a new spaceman action figure supplants him as top toy in a boy's bedroom." },
  { title: 'Titanic', year: 1997, rated: 'PG-13', runtime: 194, genres: ['Drama', 'Romance'], directors: ['James Cameron'], cast: ['Leonardo DiCaprio', 'Kate Winslet', 'Billy Zane'], countries: ['USA'], languages: ['English', 'Swedish', 'Italian', 'French'], released: d('1997-12-19'), imdb: { rating: 7.9, votes: 1250000 }, awards: { wins: 126, nominations: 83, text: 'Won 11 Oscars. Another 115 wins & 72 nominations.' }, plot: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.' },
  { title: 'The Matrix', year: 1999, rated: 'R', runtime: 136, genres: ['Action', 'Sci-Fi'], directors: ['Lana Wachowski', 'Lilly Wachowski'], cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'], countries: ['USA', 'Australia'], languages: ['English'], released: d('1999-03-31'), imdb: { rating: 8.7, votes: 2000000 }, awards: { wins: 42, nominations: 51, text: 'Won 4 Oscars. Another 38 wins & 51 nominations.' }, plot: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.' },
  { title: 'Spirited Away', year: 2001, rated: 'PG', runtime: 125, genres: ['Animation', 'Adventure', 'Family'], directors: ['Hayao Miyazaki'], cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki'], countries: ['Japan'], languages: ['Japanese'], released: d('2001-07-20'), imdb: { rating: 8.6, votes: 850000 }, awards: { wins: 58, nominations: 31, text: 'Won 1 Oscar. Another 57 wins & 30 nominations.' }, plot: 'During her family\'s move to the suburbs, a 10-year-old girl wanders into a world ruled by gods, witches and spirits.' },
  { title: 'Parasite', year: 2019, rated: 'R', runtime: 132, genres: ['Comedy', 'Drama', 'Thriller'], directors: ['Bong Joon Ho'], cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'], countries: ['South Korea'], languages: ['Korean', 'English'], released: d('2019-05-30'), imdb: { rating: 8.5, votes: 950000 }, awards: { wins: 310, nominations: 267, text: 'Won 4 Oscars. Another 306 wins & 263 nominations.' }, plot: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.' },
  { title: 'Joker', year: 2019, rated: 'R', runtime: 122, genres: ['Crime', 'Drama', 'Thriller'], directors: ['Todd Phillips'], cast: ['Joaquin Phoenix', 'Robert De Niro', 'Zazie Beetz'], countries: ['USA', 'Canada'], languages: ['English'], released: d('2019-10-04'), imdb: { rating: 8.4, votes: 1450000 }, awards: { wins: 122, nominations: 240, text: 'Won 2 Oscars. Another 120 wins & 238 nominations.' }, plot: 'A mentally troubled stand-up comedian embarks on a downward spiral that leads to the creation of an iconic villain.' },
  { title: 'Frozen', year: 2013, rated: 'PG', runtime: 102, genres: ['Animation', 'Adventure', 'Comedy'], directors: ['Chris Buck', 'Jennifer Lee'], cast: ['Kristen Bell', 'Idina Menzel', 'Jonathan Groff', 'Josh Gad'], countries: ['USA'], languages: ['English', 'Norwegian'], released: d('2013-11-27'), imdb: { rating: 7.4, votes: 650000 }, awards: { wins: 82, nominations: 60, text: 'Won 2 Oscars. Another 80 wins & 58 nominations.' }, plot: 'Fearless optimist Anna teams up with a rugged mountain man to find her estranged sister Elsa.' },
  { title: 'Mad Max: Fury Road', year: 2015, rated: 'R', runtime: 120, genres: ['Action', 'Adventure', 'Sci-Fi'], directors: ['George Miller'], cast: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'], countries: ['Australia', 'USA'], languages: ['English'], released: d('2015-05-15'), imdb: { rating: 8.1, votes: 1050000 }, awards: { wins: 234, nominations: 245, text: 'Won 6 Oscars. Another 228 wins & 239 nominations.' }, plot: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search of her homeland.' },
  { title: 'La La Land', year: 2016, rated: 'PG-13', runtime: 128, genres: ['Comedy', 'Drama', 'Music'], directors: ['Damien Chazelle'], cast: ['Ryan Gosling', 'Emma Stone', 'John Legend'], countries: ['USA'], languages: ['English'], released: d('2016-12-25'), imdb: { rating: 8.0, votes: 650000 }, awards: { wins: 238, nominations: 318, text: 'Won 6 Oscars. Another 232 wins & 312 nominations.' }, plot: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love.' },
  { title: 'Get Out', year: 2017, rated: 'R', runtime: 104, genres: ['Horror', 'Mystery', 'Thriller'], directors: ['Jordan Peele'], cast: ['Daniel Kaluuya', 'Allison Williams', 'Bradley Whitford'], countries: ['USA', 'Japan'], languages: ['English'], released: d('2017-02-24'), imdb: { rating: 7.8, votes: 700000 }, awards: { wins: 158, nominations: 214, text: 'Won 1 Oscar. Another 157 wins & 213 nominations.' }, plot: "A young African-American visits his white girlfriend's parents for the weekend." },
  { title: 'Coco', year: 2017, rated: 'PG', runtime: 105, genres: ['Animation', 'Adventure', 'Comedy'], directors: ['Lee Unkrich', 'Adrian Molina'], cast: ['Anthony Gonzalez', 'Gael García Bernal', 'Benjamin Bratt'], countries: ['USA'], languages: ['English', 'Spanish'], released: d('2017-11-22'), imdb: { rating: 8.4, votes: 580000 }, awards: { wins: 109, nominations: 41, text: 'Won 2 Oscars. Another 107 wins & 39 nominations.' }, plot: 'Aspiring musician Miguel is transported to the Land of the Dead to find his great-great-grandfather.' },
  { title: 'Dunkirk', year: 2017, rated: 'PG-13', runtime: 106, genres: ['Action', 'Drama', 'History'], directors: ['Christopher Nolan'], cast: ['Fionn Whitehead', 'Tom Hardy', 'Kenneth Branagh', 'Harry Styles'], countries: ['UK', 'Netherlands', 'France', 'USA'], languages: ['English', 'French', 'German'], released: d('2017-07-21'), imdb: { rating: 7.8, votes: 720000 }, awards: { wins: 64, nominations: 234, text: 'Won 3 Oscars. Another 61 wins & 231 nominations.' }, plot: 'Allied soldiers from Belgium, the British Commonwealth and Empire, and France are surrounded by the German Army.' },
  { title: 'Casablanca', year: 1942, rated: 'PG', runtime: 102, genres: ['Drama', 'Romance', 'War'], directors: ['Michael Curtiz'], cast: ['Humphrey Bogart', 'Ingrid Bergman', 'Paul Henreid'], countries: ['USA'], languages: ['English', 'French', 'German', 'Italian'], released: d('1943-01-23'), imdb: { rating: 8.5, votes: 600000 }, awards: { wins: 13, nominations: 9, text: 'Won 3 Oscars. Another 10 wins & 9 nominations.' }, plot: 'A cynical expatriate American cafe owner struggles to decide whether or not to help his former lover.' },
  // Không có trường "rated"
  { title: 'Citizen Kane', year: 1941, runtime: 119, genres: ['Drama', 'Mystery'], directors: ['Orson Welles'], cast: ['Orson Welles', 'Joseph Cotten', 'Dorothy Comingore'], countries: ['USA'], languages: ['English'], released: d('1941-09-05'), imdb: { rating: 8.3, votes: 460000 }, awards: { wins: 11, nominations: 13, text: 'Won 1 Oscar. Another 10 wins & 13 nominations.' }, plot: 'Following the death of publishing tycoon Charles Foster Kane, reporters scramble to uncover the meaning of his final utterance.' },
  { title: 'The Gold Rush', year: 1925, rated: 'PASSED', runtime: 95, genres: ['Adventure', 'Comedy', 'Drama'], directors: ['Charles Chaplin'], cast: ['Charles Chaplin', 'Mack Swain', 'Tom Murray'], countries: ['USA'], languages: ['English'], released: d('1925-08-16'), imdb: { rating: 8.1, votes: 115000 }, awards: { wins: 3, nominations: 2, text: 'Nominated for 2 Oscars.' }, plot: 'A prospector goes to the Klondike during the 1890s gold rush in hopes of making his fortune.' },
  // "rated" có tồn tại nhưng bằng null
  { title: 'Metropolis', year: 1927, rated: null, runtime: 153, genres: ['Drama', 'Sci-Fi'], directors: ['Fritz Lang'], cast: ['Brigitte Helm', 'Alfred Abel', 'Gustav Fröhlich'], countries: ['Germany'], languages: ['German'], released: d('1927-03-06'), imdb: { rating: 8.3, votes: 185000 }, awards: { wins: 5, nominations: 0, text: '5 wins.' }, plot: 'In a futuristic city sharply divided between the working class and the city planners, the son of the mastermind falls in love.' },
  { title: 'Seven Samurai', year: 1954, rated: 'NOT RATED', runtime: 207, genres: ['Action', 'Drama'], directors: ['Akira Kurosawa'], cast: ['Toshirô Mifune', 'Takashi Shimura', 'Keiko Tsushima'], countries: ['Japan'], languages: ['Japanese'], released: d('1956-11-19'), imdb: { rating: 8.6, votes: 370000 }, awards: { wins: 5, nominations: 7, text: 'Nominated for 2 Oscars.' }, plot: 'Farmers from a village exploited by bandits hire a veteran samurai for protection.' },
  { title: 'Train to Busan', year: 2016, rated: 'NOT RATED', runtime: 118, genres: ['Action', 'Horror', 'Thriller'], directors: ['Yeon Sang-ho'], cast: ['Gong Yoo', 'Jung Yu-mi', 'Ma Dong-seok'], countries: ['South Korea'], languages: ['Korean'], released: d('2016-07-20'), imdb: { rating: 7.6, votes: 250000 }, awards: { wins: 11, nominations: 23, text: '11 wins & 23 nominations.' }, plot: 'While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan.' },
  { title: 'Your Name.', year: 2016, rated: 'PG', runtime: 106, genres: ['Animation', 'Drama', 'Fantasy'], directors: ['Makoto Shinkai'], cast: ['Ryunosuke Kamiki', 'Mone Kamishiraishi', 'Ryo Narita'], countries: ['Japan'], languages: ['Japanese'], released: d('2016-08-26'), imdb: { rating: 8.4, votes: 320000 }, awards: { wins: 20, nominations: 13, text: '20 wins & 13 nominations.' }, plot: 'Two teenagers share a profound, magical connection upon discovering they are swapping bodies.' },
  { title: 'The Social Network', year: 2010, rated: 'PG-13', runtime: 120, genres: ['Biography', 'Drama'], directors: ['David Fincher'], cast: ['Jesse Eisenberg', 'Andrew Garfield', 'Justin Timberlake'], countries: ['USA'], languages: ['English', 'French'], released: d('2010-10-01'), imdb: { rating: 7.8, votes: 760000 }, awards: { wins: 172, nominations: 188, text: 'Won 3 Oscars. Another 169 wins & 185 nominations.' }, plot: 'As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued.' },
  { title: 'Up', year: 2009, rated: 'PG', runtime: 96, genres: ['Animation', 'Adventure', 'Comedy'], directors: ['Pete Docter', 'Bob Peterson'], cast: ['Ed Asner', 'Jordan Nagai', 'Christopher Plummer'], countries: ['USA'], languages: ['English'], released: d('2009-05-29'), imdb: { rating: 8.3, votes: 1100000 }, awards: { wins: 79, nominations: 87, text: 'Won 2 Oscars. Another 77 wins & 85 nominations.' }, plot: '78-year-old Carl Fredricksen travels to Paradise Falls in his house equipped with balloons.' },
  { title: 'Gravity', year: 2013, rated: 'PG-13', runtime: 91, genres: ['Drama', 'Sci-Fi', 'Thriller'], directors: ['Alfonso Cuarón'], cast: ['Sandra Bullock', 'George Clooney', 'Ed Harris'], countries: ['UK', 'USA'], languages: ['English'], released: d('2013-10-04'), imdb: { rating: 7.7, votes: 850000 }, awards: { wins: 241, nominations: 186, text: 'Won 7 Oscars. Another 234 wins & 179 nominations.' }, plot: 'Two astronauts work together to survive after an accident leaves them stranded in space.' },
  { title: 'Spider-Man: Into the Spider-Verse', year: 2018, rated: 'PG', runtime: 117, genres: ['Animation', 'Action', 'Adventure'], directors: ['Bob Persichetti', 'Peter Ramsey', 'Rodney Rothman'], cast: ['Shameik Moore', 'Jake Johnson', 'Hailee Steinfeld'], countries: ['USA'], languages: ['English', 'Spanish'], released: d('2018-12-14'), imdb: { rating: 8.4, votes: 650000 }, awards: { wins: 82, nominations: 58, text: 'Won 1 Oscar. Another 81 wins & 57 nominations.' }, plot: 'Teen Miles Morales becomes the Spider-Man of his universe and must join with five spider-powered individuals.' },
  { title: 'Bohemian Rhapsody', year: 2018, rated: 'PG-13', runtime: 134, genres: ['Biography', 'Drama', 'Music'], directors: ['Bryan Singer'], cast: ['Rami Malek', 'Lucy Boynton', 'Gwilym Lee'], countries: ['UK', 'USA'], languages: ['English'], released: d('2018-11-02'), imdb: { rating: 7.9, votes: 580000 }, awards: { wins: 32, nominations: 67, text: 'Won 4 Oscars. Another 28 wins & 67 nominations.' }, plot: 'The story of the legendary British rock band Queen and lead singer Freddie Mercury.' },
  // Phim Việt Nam
  { title: 'Hai Phượng', year: 2019, rated: 'R', runtime: 98, genres: ['Action', 'Crime', 'Drama'], directors: ['Lê Văn Kiệt'], cast: ['Ngô Thanh Vân', 'Mai Cát Vi', 'Phan Thanh Nhiên'], countries: ['Vietnam'], languages: ['Vietnamese'], released: d('2019-02-22'), imdb: { rating: 6.5, votes: 12000 }, plot: 'Một người mẹ đơn thân từng là giang hồ lên đường giải cứu con gái bị bắt cóc.' },
  { title: 'Mắt Biếc', year: 2019, rated: 'PG-13', runtime: 117, genres: ['Drama', 'Romance'], directors: ['Victor Vũ'], cast: ['Trần Nghĩa', 'Trúc Anh', 'Trần Phong'], countries: ['Vietnam'], languages: ['Vietnamese'], released: d('2019-12-20'), imdb: { rating: 7.0, votes: 4000 }, awards: { wins: 2, nominations: 4, text: '2 wins & 4 nominations.' }, plot: 'Chuyện tình đơn phương của Ngạn dành cho Hà Lan, cô bạn có đôi mắt biếc.' },
  // Không có "rated" và không có "awards"
  { title: 'Bố Già', year: 2021, runtime: 128, genres: ['Comedy', 'Drama', 'Family'], directors: ['Trấn Thành', 'Vũ Ngọc Đãng'], cast: ['Trấn Thành', 'Tuấn Trần', 'Ngân Chi'], countries: ['Vietnam'], languages: ['Vietnamese'], released: d('2021-03-12'), imdb: { rating: 6.6, votes: 3000 }, plot: 'Ông Sang và con trai Quắn luôn bất đồng về lối sống trong một con hẻm ở Sài Gòn.' },
  // Hai bộ phim truyền hình (type: 'series')
  { title: 'Breaking Bad', year: 2008, rated: 'TV-MA', runtime: 49, genres: ['Crime', 'Drama', 'Thriller'], directors: ['Vince Gilligan'], cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn'], countries: ['USA'], languages: ['English', 'Spanish'], released: d('2008-01-20'), imdb: { rating: 9.5, votes: 2100000 }, awards: { wins: 164, nominations: 262, text: 'Won 16 Primetime Emmys. Another 148 wins & 246 nominations.' }, type: 'series', plot: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.' },
  { title: 'Sherlock', year: 2010, rated: 'TV-14', runtime: 88, genres: ['Crime', 'Drama', 'Mystery'], directors: ['Paul McGuigan'], cast: ['Benedict Cumberbatch', 'Martin Freeman', 'Una Stubbs'], countries: ['UK'], languages: ['English'], released: d('2010-10-24'), imdb: { rating: 9.1, votes: 990000 }, awards: { wins: 94, nominations: 186, text: 'Won 9 Primetime Emmys. Another 85 wins & 177 nominations.' }, type: 'series', plot: 'A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.' },
].map((m, i) => ({ _id: movieId(i + 1), type: 'movie', ...m }));

// ─────────────────────────── sample_mflix.users ───────────────────────────
const users = [
  { name: 'Nguyễn Văn An', email: 'an.nguyen@example.com', age: 22, gender: 'M', address: { city: 'Hà Nội', district: 'Cầu Giấy' }, hobbies: ['Reading', 'Gaming', 'Football'], scores: [78, 85, 92], isActive: true, createdAt: d('2022-03-15T08:30:00Z') },
  { name: 'Trần Thị Bình', email: 'binh.tran@example.com', age: 27, gender: 'F', address: { city: 'Hà Nội', district: 'Đống Đa' }, hobbies: ['Cooking', 'Reading'], scores: [85, 97], isActive: true, createdAt: d('2021-07-01T10:00:00Z') },
  { name: 'Lê Hoàng Cường', email: 'cuong.le@example.com', age: 31, gender: 'M', address: { city: 'Hồ Chí Minh', district: 'Quận 1' }, hobbies: ['Gaming', 'Travel'], scores: [60, 70, 65], isActive: false, createdAt: d('2020-11-20T14:15:00Z') },
  { name: 'Phạm Minh Dung', email: 'dung.pham@example.com', age: 24, gender: 'F', address: { city: 'Đà Nẵng', district: 'Hải Châu' }, hobbies: ['Travel', 'Photography'], scores: [91, 88], isActive: true, createdAt: d('2023-02-10T09:45:00Z') },
  { name: 'Hoàng Đức Em', email: 'em.hoang@example.com', age: 35, gender: 'M', address: { city: 'Hồ Chí Minh', district: 'Quận 7' }, hobbies: ['Football'], scores: [55, 72], isActive: true, createdAt: d('2019-05-05T16:20:00Z') },
  { name: 'Vũ Thu Giang', email: 'giang.vu@example.com', age: 19, gender: 'F', address: { city: 'Hà Nội', district: 'Hai Bà Trưng' }, hobbies: ['Music', 'Reading', 'Gaming'], scores: [99, 94, 90], isActive: true, createdAt: d('2024-01-12T07:00:00Z') },
  { name: 'Đặng Quốc Huy', email: 'huy.dang@example.com', age: 42, gender: 'M', address: { city: 'Cần Thơ', district: 'Ninh Kiều' }, hobbies: ['Fishing'], scores: [80], isActive: false, createdAt: d('2018-09-30T11:11:00Z') },
  { name: 'Bùi Ngọc Lan', email: 'lan.bui@example.com', age: 29, gender: 'F', address: { city: 'Đà Nẵng', district: 'Sơn Trà' }, hobbies: ['Cooking', 'Music'], scores: [73, 95, 81], isActive: true, createdAt: d('2022-12-24T19:30:00Z') },
  { name: 'Ngô Thanh Minh', email: 'minh.ngo@example.com', age: 26, gender: 'M', address: { city: 'Hồ Chí Minh', district: 'Thủ Đức' }, hobbies: [], scores: [88, 79], isActive: true, createdAt: d('2023-08-08T08:08:00Z') },
  { name: 'Đỗ Thị Oanh', email: 'oanh.do@example.com', age: 33, gender: 'F', address: { city: 'Hà Nội', district: 'Ba Đình' }, hobbies: ['Travel', 'Reading'], scores: [67, 91], isActive: false, createdAt: d('2021-01-19T13:00:00Z') },
  // Không có "age", có thêm "phone"
  { name: 'Mai Anh Tuấn', email: 'tuan.mai@example.com', gender: 'M', phone: '0901234567', address: { city: 'Huế', district: 'Phú Hội' }, hobbies: ['Photography', 'Gaming'], scores: [], isActive: true, createdAt: d('2024-06-01T06:30:00Z') },
  { name: 'Lý Thảo Vy', email: 'vy.ly@example.com', age: 21, gender: 'F', address: { city: 'Hồ Chí Minh', district: 'Quận 3' }, hobbies: ['Music', 'Dancing'], scores: [84, 86, 93], isActive: true, createdAt: d('2023-11-11T11:11:00Z') },
].map((u, i) => ({ _id: userId(i + 1), ...u }));

// ─────────────────────────── sample_mflix.comments ───────────────────────────
// [số thứ tự user, số thứ tự phim, rating, text, date]
const commentRows = [
  [1, 8, 10, 'Mind-bending! Xem 3 lần vẫn chưa hiểu hết.', '2023-01-05T20:00:00Z'],
  [2, 8, 9, 'Nhạc phim của Hans Zimmer quá đỉnh.', '2023-02-11T21:30:00Z'],
  [3, 8, 7, 'Hơi khó hiểu nhưng hình ảnh đẹp.', '2023-03-02T19:10:00Z'],
  [1, 9, 10, 'Heath Ledger là Joker hay nhất.', '2022-12-01T22:00:00Z'],
  [5, 9, 9, 'Phim siêu anh hùng hay nhất mọi thời đại.', '2023-06-15T18:45:00Z'],
  [4, 10, 10, 'Cảnh docking làm mình nổi da gà.', '2024-01-20T20:20:00Z'],
  [6, 10, 8, 'Hơi dài nhưng đáng xem.', '2024-02-02T15:00:00Z'],
  [2, 19, 9, 'Twist bất ngờ, kịch bản xuất sắc.', '2023-04-18T21:00:00Z'],
  [8, 19, 10, 'Xứng đáng với Oscar phim hay nhất.', '2023-05-01T20:30:00Z'],
  [9, 19, 8, 'Rất thâm thuý về khoảng cách giàu nghèo.', '2023-09-09T22:10:00Z'],
  [12, 19, 9, 'Diễn xuất của cả dàn cast đều tốt.', '2024-03-03T19:00:00Z'],
  [3, 20, 6, 'Nặng nề quá, không hợp với mình.', '2022-10-10T23:00:00Z'],
  [7, 20, 9, 'Joaquin Phoenix diễn quá xuất sắc.', '2022-11-11T20:00:00Z'],
  [6, 21, 7, 'Let it go~ nghe hoài không chán.', '2024-02-14T10:00:00Z'],
  [11, 21, 4, 'Phim cho trẻ con, không hợp người lớn.', '2024-07-07T09:00:00Z'],
  [1, 11, 10, 'Kết phim quá đẹp.', '2021-08-08T20:00:00Z'],
  [10, 11, 9, 'Hope is a good thing.', '2021-09-19T21:00:00Z'],
  [4, 18, 10, 'Tuổi thơ của mình.', '2023-10-31T20:00:00Z'],
  [12, 18, 9, 'Hình ảnh và âm nhạc tuyệt vời.', '2024-04-04T20:00:00Z'],
  [5, 39, 7, 'Cảnh hành động Việt Nam ổn áp.', '2019-03-01T20:00:00Z'],
  [9, 39, 5, 'Kịch bản còn đơn giản.', '2019-03-05T20:00:00Z'],
  [8, 40, 8, 'Xem xong buồn cả tuần.', '2020-01-10T21:00:00Z'],
  [2, 40, 6, 'Phim ổn nhưng không bằng truyện.', '2020-01-12T21:00:00Z'],
  [11, 41, 7, 'Cười ra nước mắt.', '2021-03-20T20:00:00Z'],
  [3, 42, 10, 'Say my name.', '2020-05-05T22:00:00Z'],
  [7, 42, 10, 'Series hay nhất từng xem.', '2020-06-06T22:00:00Z'],
  [10, 43, 9, 'Cumberbatch sinh ra để đóng Sherlock.', '2021-12-12T21:00:00Z'],
  [6, 1, 3, 'Khủng long nhiều mà nội dung nhạt.', '2018-07-01T20:00:00Z'],
  [1, 1, 5, 'Giải trí được thôi.', '2018-07-03T20:00:00Z'],
  [12, 23, 8, 'City of stars~', '2023-02-14T20:00:00Z'],
];
const comments = commentRows.map(([u, m, rating, text, date], i) => ({
  _id: commentId(i + 1),
  name: users[u - 1].name,
  email: users[u - 1].email,
  movie_id: movieId(m),
  rating,
  text,
  date: d(date),
}));

// num_mflix_comments = số bình luận của mỗi phim (giống sample_mflix thật)
for (const m of movies) {
  m.num_mflix_comments = comments.filter((c) => c.movie_id.equals(m._id)).length;
}

// ─────────────────────────── library (slide Mapping Relationships) ───────────────────────────
const patrons = [
  // One-to-One, embedded (slide 46)
  { _id: 'joe', name: 'Joe Bookreader', address: { street: '123 Fake Street', city: 'Faketon', state: 'MA', zip: '12345' } },
  // One-to-Many, embedded (slide 47)
  { _id: 'ann', name: 'Ann Reader', addresses: [
    { street: '123 Fake Street', city: 'Faketon', state: 'MA', zip: '12345' },
    { street: '1 Some Other Street', city: 'Boston', state: 'MA', zip: '12345' },
  ] },
];
// One-to-Many, reference: publisher_id nằm trong book (slide 50)
const publishers = [
  { _id: 'oreilly', name: "O'Reilly Media", founded: 1980, location: 'CA' },
  { _id: 'manning', name: 'Manning Publications', founded: 1990, location: 'NY' },
  { _id: 'nxbkimdong', name: 'NXB Kim Đồng', founded: 1957, location: 'Hà Nội' },
];
const books = [
  { _id: 123456789, title: 'MongoDB: The Definitive Guide', author: ['Kristina Chodorow', 'Mike Dirolf'], published_date: d('2010-09-24'), pages: 216, language: 'English', publisher_id: 'oreilly' },
  { _id: 234567890, title: '50 Tips and Tricks for MongoDB Developer', author: 'Kristina Chodorow', published_date: d('2011-05-06'), pages: 68, language: 'English', publisher_id: 'oreilly' },
  { _id: 345678901, title: 'Learning Node.js', author: ['Marc Wandschneider'], published_date: d('2016-11-01'), pages: 330, language: 'English', publisher_id: 'oreilly' },
  { _id: 456789012, title: 'MongoDB in Action', author: ['Kyle Banker', 'Peter Bakkum'], published_date: d('2016-03-01'), pages: 480, language: 'English', publisher_id: 'manning' },
  { _id: 567890123, title: 'Node.js in Action', author: ['Mike Cantelon', 'Alex Young'], published_date: d('2017-08-01'), pages: 392, language: 'English', publisher_id: 'manning' },
  { _id: 678901234, title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', published_date: d('1941-01-01'), pages: 144, language: 'Vietnamese', publisher_id: 'nxbkimdong' },
];

// ─────────────────────────── store (categories, products) ───────────────────────────
const categories = [
  { _id: categoryId(1), name: 'phone' },
  { _id: categoryId(2), name: 'laptop' },
  { _id: categoryId(3), name: 'pc' },
];
// [category (1 = phone, 2 = laptop, 3 = pc), name, price (VND), description]
const productRows = [
  [1, 'iPhone 15 Pro Max 256GB', 29990000, 'Chip A17 Pro, khung titan, camera 48MP, màn hình 6.7 inch.'],
  [1, 'Samsung Galaxy S24 Ultra', 27990000, 'Snapdragon 8 Gen 3, bút S Pen, camera 200MP, màn hình 6.8 inch.'],
  [1, 'Xiaomi 14', 18990000, 'Snapdragon 8 Gen 3, camera Leica, sạc nhanh 90W.'],
  [1, 'OPPO Reno11 F 5G', 8990000, 'Thiết kế mỏng nhẹ, camera chân dung 64MP, pin 5000mAh.'],
  [1, 'Samsung Galaxy A55 5G', 9690000, 'Màn hình Super AMOLED 120Hz, kháng nước IP67.'],
  [1, 'iPhone 13 128GB', 13490000, 'Chip A15 Bionic, camera kép 12MP, màn hình 6.1 inch.'],
  [2, 'MacBook Air M3 13 inch', 26490000, 'Chip Apple M3, RAM 8GB, SSD 256GB, pin tới 18 giờ.'],
  [2, 'MacBook Pro 14 M3 Pro', 49990000, 'Chip M3 Pro, RAM 18GB, SSD 512GB, màn hình Liquid Retina XDR.'],
  [2, 'Dell XPS 13 9340', 38990000, 'Intel Core Ultra 7, RAM 16GB, SSD 512GB, màn hình 13.4 inch.'],
  [2, 'ASUS ROG Strix G16', 34990000, 'Core i7-13650HX, RTX 4060, màn hình 165Hz, laptop gaming.'],
  [2, 'Lenovo ThinkPad E14 Gen 5', 19990000, 'Core i5-1335U, RAM 16GB, bàn phím bền bỉ cho doanh nhân.'],
  [2, 'Acer Aspire 7', 15990000, 'Core i5-12450H, GTX 1650, phù hợp sinh viên kỹ thuật.'],
  [3, 'PC Gaming RTX 4070 Super', 42990000, 'Core i7-14700F, RAM 32GB DDR5, SSD 1TB, card RTX 4070 Super.'],
  [3, 'PC Văn Phòng Core i3', 8490000, 'Core i3-12100, RAM 8GB, SSD 256GB, đủ dùng cho tin học văn phòng.'],
  [3, 'iMac 24 inch M3', 37990000, 'Máy tính all-in-one, chip M3, màn hình 4.5K Retina.'],
  [3, 'PC Đồ Hoạ Ryzen 9', 55990000, 'Ryzen 9 7950X, RAM 64GB, RTX 4080, chuyên dựng phim và render 3D.'],
  [3, 'Mac mini M2', 14990000, 'Chip M2, RAM 8GB, SSD 256GB, nhỏ gọn.'],
  [3, 'PC Mini Intel NUC 13 Pro', 12990000, 'Core i5-1340P, RAM 16GB, SSD 512GB, kích thước siêu nhỏ.'],
];
const products = productRows.map(([c, name, price, description], i) => ({
  _id: productId(i + 1),
  name,
  price,
  category_id: categoryId(c),
  description,
}));
// Phụ kiện chưa được phân loại: KHÔNG có trường category_id
products.push(
  { _id: productId(19), name: 'Tai nghe AirPods Pro 2', price: 5990000, description: 'Chống ồn chủ động, cổng USB-C, hộp sạc MagSafe.' },
  { _id: productId(20), name: 'Chuột Logitech MX Master 3S', price: 2490000, description: 'Chuột không dây, cảm biến 8000 DPI, click yên tĩnh.' },
  { _id: productId(21), name: 'Bàn phím cơ Keychron K2', price: 1890000, description: 'Bàn phím cơ 75%, kết nối Bluetooth, switch Gateron.' },
  { _id: productId(22), name: 'Sạc dự phòng Anker 20000mAh', price: 990000, description: 'Sạc nhanh 22.5W, 2 cổng USB-A và 1 cổng USB-C.' },
);

// ─────────────────────────── Ghi vào DB ───────────────────────────
const mflix = db.getSiblingDB('sample_mflix');
mflix.dropDatabase();
mflix.movies.insertMany(movies);
mflix.users.insertMany(users);
mflix.comments.insertMany(comments);

const library = db.getSiblingDB('library');
library.dropDatabase();
library.patrons.insertMany(patrons);
library.publishers.insertMany(publishers);
library.books.insertMany(books);

const store = db.getSiblingDB('store');
store.dropDatabase();
store.categories.insertMany(categories);
store.products.insertMany(products);

print(`sample_mflix: movies=${mflix.movies.countDocuments()}, users=${mflix.users.countDocuments()}, comments=${mflix.comments.countDocuments()}`);
print(`library:      patrons=${library.patrons.countDocuments()}, publishers=${library.publishers.countDocuments()}, books=${library.books.countDocuments()}`);
print(`store:        categories=${store.categories.countDocuments()}, products=${store.products.countDocuments()}`);
