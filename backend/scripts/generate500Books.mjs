import fs from 'fs';
import path from 'path';
import { modernFavorites } from './modernFavorites.mjs';
import { curatedBooks } from './curatedBooks.mjs';

const TARGET_COUNT = 5000;

// Merge curated classics with modern favorites, deduplicating by ISBN
const seenIsbns = new Set();
const booksData = [];
for (const book of [...curatedBooks, ...modernFavorites]) {
  if (!seenIsbns.has(book.isbn)) {
    seenIsbns.add(book.isbn);
    booksData.push(book);
  }
}

const genresList = [
  "Fantasy", "Sci-Fi", "Literary Fiction", "Romance", "Mystery & Thriller",
  "Classics", "Historical Fiction", "Biography & Memoir", "Non-Fiction Bestsellers"
];

const authorsByGenre = {
  "Fantasy": ["Brandon Sanderson", "George R.R. Martin", "J.K. Rowling", "J.R.R. Tolkien", "Patrick Rothfuss", "Neil Gaiman", "Rick Riordan", "Robin Hobb", "Andrzej Sapkowski", "Terry Pratchett", "Robert Jordan", "Ursula K. Le Guin", "N.K. Jemisin", "Rebecca Yarros", "Sarah J. Maas", "Leigh Bardugo", "V.E. Schwab", "TJ Klune", "Madeline Miller", "R.F. Kuang", "Chimamanda Ngozi Adichie", "Marlon James", "Nnedi Okorafor"],
  "Sci-Fi": ["Frank Herbert", "Andy Weir", "Isaac Asimov", "Arthur C. Clarke", "Philip K. Dick", "William Gibson", "Neal Stephenson", "H.G. Wells", "Orson Scott Card", "Ted Chiang", "Cixin Liu", "Ray Bradbury", "Aldous Huxley", "George Orwell", "Octavia E. Butler", "Ursula K. Le Guin", "Emily St. John Mandel", "Blake Crouch", "Margaret Atwood", "Kazuo Ishiguro", "Liu Cixin", "Nnedi Okorafor", "Becky Chambers"],
  "Literary Fiction": ["Donna Tartt", "Kazuo Ishiguro", "Sally Rooney", "Hanya Yanagihara", "Gabriel García Márquez", "Toni Morrison", "Haruki Murakami", "Chimamanda Ngozi Adichie", "Cormac McCarthy", "Virginia Woolf", "James Joyce", "F. Scott Fitzgerald", "Harper Lee", "Brit Bennett", "Zadie Smith", "Ocean Vuong", "Charles Yu", "Viet Thanh Nguyen", "Ann Patchett", "Celeste Ng", "Gabrielle Zevin", "Bonnie Garmus", "Barbara Kingsolver", "Fredrik Backman", "Sayaka Murata", "Yann Martel", "Percival Everett", "Samantha Harvey"],
  "Romance": ["Emily Henry", "Colleen Hoover", "Casey McQuiston", "Ali Hazelwood", "Taylor Jenkins Reid", "Sarah J. Maas", "Abby Jimenez", "Christina Lauren", "Jasmine Guillory", "Nicholas Sparks", "Jane Austen", "Charlotte Brontë", "Sally Thorne", "Adam Silvera", "Helen Hoang", "Tessa Bailey", "Elena Armas", "Chloe Liese", "Kate Clayborn"],
  "Mystery & Thriller": ["Gillian Flynn", "Alex Michaelides", "Agatha Christie", "Dan Brown", "Stieg Larsson", "Liane Moriarty", "Lucy Foley", "Stephen King", "Tana French", "Ruth Ware", "Paula Hawkins", "John Grisham", "James Patterson", "Richard Osman", "Nita Prose", "A.J. Finn", "Karen M. McManus", "Lisa Jewell", "Riley Sager", "Freida McFadden"],
  "Classics": ["Mary Shelley", "Charlotte Brontë", "Emily Brontë", "Bram Stoker", "Herman Melville", "Homer", "William Shakespeare", "Charles Dickens", "Fyodor Dostoevsky", "Oscar Wilde", "Leo Tolstoy", "Jane Austen", "Mark Twain", "Virginia Woolf", "Chinua Achebe", "Gabriel García Márquez", "Toni Morrison", "James Baldwin", "Zora Neale Hurston", "Ralph Ellison"],
  "Historical Fiction": ["Markus Zusak", "Anthony Doerr", "Taylor Jenkins Reid", "Min Jin Lee", "Kristin Hannah", "Ken Follett", "Hilary Mantel", "Colson Whitehead", "Philippa Gregory", "Kate Morton", "Bernard Cornwell", "Amor Towles", "Yaa Gyasi", "Abraham Verghese", "James McBride", "Daniel Mason", "Lauren Groff", "Madeline Miller"],
  "Biography & Memoir": ["Tara Westover", "Jennette McCurdy", "Michelle Obama", "Trevor Noah", "Anne Frank", "Matthew McConaughey", "Walter Isaacson", "Phil Knight", "Elie Wiesel", "Malala Yousafzai", "David Goggins", "Maya Angelou", "Barack Obama", "Craig Brown", "Isabel Wilkerson", "Rebecca Skloot", "Ron Chernow", "Doris Kearns Goodwin"],
  "Non-Fiction Bestsellers": ["Yuval Noah Harari", "James Clear", "Daniel Kahneman", "Susan Cain", "Malcolm Gladwell", "Brené Brown", "Angela Duckworth", "Matthew Walker", "John Carreyrou", "Rebecca Skloot", "Bill Bryson", "Michael Lewis", "Jared Diamond", "Robin Wall Kimmerer", "Bessel van der Kolk", "Ta-Nehisi Coates", "Isabel Wilkerson", "Cal Newport", "Ryan Holiday"]
};

const titleNouns = ["Shadow", "King", "Empire", "Sun", "Star", "Heart", "Silence", "Darkness", "Light", "Chronicles", "Thief", "Game", "Wind", "Song", "Dream", "Memory", "Ocean", "River", "Night", "Day", "Forest", "Mountain", "World", "Time", "Truth", "Secret", "Path", "Door", "Room", "City", "Castle", "Year", "History", "Life", "Ghost", "Angel", "Demon", "Winter", "Summer", "Spring", "Autumn", "Stranger", "Garden", "Bridge", "Island", "Valley", "Horizon", "Echo", "Flame", "Stone"];
const titleAdjectives = ["Golden", "Silent", "Hidden", "Lost", "Last", "First", "Dark", "Light", "Wild", "Midnight", "Ancient", "Secret", "Forgotten", "Broken", "Beautiful", "Elegant", "Bitter", "Sweet", "Deep", "Fallen", "Rising", "Perfect", "Stormy", "Quiet", "Strange", "Vibrant", "Cold", "Warm", "Burning", "Frozen", "Wandering", "Restless", "Endless", "Fragile", "Radiant"];
const titleVerbs = ["Whispers", "Cries", "Sings", "Falls", "Rises", "Breaks", "Remembers", "Seeks", "Finds", "Loves", "Builds", "Burns", "Returns", "Escapes", "Lives", "Fades", "Glows", "Lingers", "Waits", "Dreams"];

const descriptionsTemplates = [
  "A gripping story exploring survival, identity, and the weight of choices in a rapidly changing world.",
  "An epic narrative of power, love, and redemption that keeps readers spellbound until the final page.",
  "A quiet, atmospheric exploration of human relationships and the memories we carry through time.",
  "A fast-paced journey filled with unexpected twists, dark secrets, and a race against time.",
  "An intimate memoir highlighting trials and triumphs in the pursuit of artistic and personal freedom.",
  "A definitive account of social and scientific revolutions that shaped modern civilization.",
  "A witty contemporary story capturing the humor and heartbreak of modern relationships and careers.",
  "A sweeping historical saga spanning continents and generations of family secrets.",
  "A thought-provoking examination of technology, consciousness, and what it means to be human.",
  "A lush romantic tale of longing, second chances, and the courage to start again."
];

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateTitle(seed) {
  const roll = seededRandom(seed);
  if (roll < 0.3) {
    return "The " + titleAdjectives[Math.floor(seededRandom(seed + 1) * titleAdjectives.length)] + " " + titleNouns[Math.floor(seededRandom(seed + 2) * titleNouns.length)];
  } else if (roll < 0.6) {
    return titleNouns[Math.floor(seededRandom(seed + 3) * titleNouns.length)] + " " + titleVerbs[Math.floor(seededRandom(seed + 4) * titleVerbs.length)];
  } else if (roll < 0.8) {
    return "The " + titleNouns[Math.floor(seededRandom(seed + 5) * titleNouns.length)] + " of " + titleNouns[Math.floor(seededRandom(seed + 6) * titleNouns.length)];
  }
  return "The " + titleAdjectives[Math.floor(seededRandom(seed + 7) * titleAdjectives.length)] + " " + titleNouns[Math.floor(seededRandom(seed + 8) * titleNouns.length)] + " of " + titleNouns[Math.floor(seededRandom(seed + 9) * titleNouns.length)];
}

function generateProceduralBook(index) {
  const genre = genresList[index % genresList.length];
  const authors = authorsByGenre[genre];
  const author = authors[Math.floor(seededRandom(index * 7 + 3) * authors.length)];
  const title = generateTitle(index * 13 + 41);
  const isbn = "978" + String(1000000000 + ((index * 7919 + 104729) % 9000000000)).padStart(10, "0");
  const year = Math.floor(1850 + seededRandom(index * 17) * 175);
  const pages = Math.floor(180 + seededRandom(index * 23) * 620);
  const desc = descriptionsTemplates[index % descriptionsTemplates.length];

  return {
    title,
    author,
    year,
    pages,
    isbn,
    genre,
    desc
  };
}

console.log("Total curated books (classics + modern):", booksData.length);

// Generate unique id and rating metrics for each record
const generatedBooks = booksData.map((b, index) => {
  // canonical id is isbn-13
  const id = b.isbn;
  
  // Genres list mapping
  let subjects = [b.genre];
  if (index % 3 === 0) subjects.push("Popular");
  if (index % 4 === 0) subjects.push("Bestseller");
  if (index % 5 === 0) subjects.push("BookTok");
  if (b.genre === "Classics") subjects.push("Modern Classics");
  if (b.genre === "Fantasy") subjects.push("High Fantasy");
  if (b.genre === "Sci-Fi") subjects.push("Space Opera");
  if (b.genre === "Mystery & Thriller") subjects.push("Thriller");
  if (b.genre === "Biography & Memoir") subjects.push("Non-Fiction");
  if (b.genre === "Non-Fiction Bestsellers") subjects.push("Non-Fiction");

  // Calculate stable rating between 3.8 and 4.9 based on title length/character codes
  let ratingHash = 0;
  for (let i = 0; i < b.title.length; i++) {
    ratingHash += b.title.charCodeAt(i);
  }
  const ratingVal = 3.9 + (ratingHash % 11) / 10;
  
  return {
    id,
    title: b.title,
    author: b.author,
    year: b.year,
    description: b.desc,
    coverImage: `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg`,
    averageRating: parseFloat(ratingVal.toFixed(1)),
    genres: subjects,
    pages: b.pages
  };
});

// Expand to TARGET_COUNT with diverse procedurally generated titles
const finalBooks = [...generatedBooks];
const usedIsbns = new Set(finalBooks.map((b) => b.id));
let procIndex = 0;
while (finalBooks.length < TARGET_COUNT) {
  const proc = generateProceduralBook(procIndex++);
  if (usedIsbns.has(proc.isbn)) continue;
  usedIsbns.add(proc.isbn);

  let subjects = [proc.genre];
  if (procIndex % 3 === 0) subjects.push("Popular");
  if (procIndex % 4 === 0) subjects.push("Bestseller");
  if (procIndex % 5 === 0) subjects.push("BookTok");
  if (proc.genre === "Classics") subjects.push("Modern Classics");
  if (proc.genre === "Fantasy") subjects.push("High Fantasy");
  if (proc.genre === "Sci-Fi") subjects.push("Space Opera");
  if (proc.genre === "Mystery & Thriller") subjects.push("Thriller");
  if (proc.genre === "Biography & Memoir") subjects.push("Non-Fiction");
  if (proc.genre === "Non-Fiction Bestsellers") subjects.push("Non-Fiction");
  if (proc.year >= 2000) subjects.push("Contemporary");
  if (proc.year < 1950) subjects.push("Classic");

  let ratingHash = 0;
  for (let i = 0; i < proc.title.length; i++) ratingHash += proc.title.charCodeAt(i);
  const ratingVal = 3.7 + (ratingHash % 13) / 10;

  finalBooks.push({
    id: proc.isbn,
    title: proc.title,
    author: proc.author,
    year: proc.year,
    description: proc.desc,
    coverImage: `https://covers.openlibrary.org/b/isbn/${proc.isbn}-L.jpg`,
    averageRating: parseFloat(ratingVal.toFixed(1)),
    genres: subjects,
    pages: proc.pages
  });
}

const exactCatalog = finalBooks.slice(0, TARGET_COUNT);

// Write to typescript file
const fileContent = `// THIS FILE IS AUTOMATICALLY GENERATED. DO NOT EDIT.
import { Book } from "./mockData";

export const GENERATED_BOOKS: Book[] = ${JSON.stringify(exactCatalog, null, 2)};
`;

const targetCandidates = [
  path.resolve(process.cwd(), 'frontend', 'src', 'data', 'mockBooksGenerated.ts'),
  path.resolve(process.cwd(), 'src', 'data', 'mockBooksGenerated.ts'),
  path.resolve(process.cwd(), '..', 'frontend', 'src', 'data', 'mockBooksGenerated.ts'),
];
const targetPath = targetCandidates.find((p) => {
  const dir = path.dirname(p);
  return fs.existsSync(dir);
}) || targetCandidates[0];

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log(`Successfully generated mockBooksGenerated.ts with exactly ${TARGET_COUNT} books.`);
