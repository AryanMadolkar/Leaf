import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Read .env.local manually
let env = {};
try {
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "frontend", ".env.local"),
    path.resolve(process.cwd(), "..", "frontend", ".env.local"),
    path.resolve(process.cwd(), "backend", ".env.local")
  ];
  const envPath = envPaths.find((p) => fs.existsSync(p)) || envPaths[0];
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    });
  }
} catch (e) {
  console.error("Failed to read .env.local file:", e);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase URL or API Key in environment or .env.local.");
  process.exit(1);
}

console.log("Connecting to Supabase at:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Curated bestseller books catalog (real popular books)
const curatedBooks = [
  // --- FANTASY ---
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    isbn_13: "9780590353428",
    open_library_key: "OL26317316M",
    description: "Harry Potter has no idea how famous he is. That's because he's being raised by his miserable uncle and aunt, who are terrified he will discover that he is a wizard.",
    first_publish_year: 1997,
    page_count: 309,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780590353428-L.jpg",
    genres: ["Fantasy", "Magic", "Adventure", "Young Adult"]
  },
  {
    title: "Harry Potter and the Chamber of Secrets",
    author: "J.K. Rowling",
    isbn_13: "9780439064874",
    open_library_key: "OL24395648M",
    description: "The Dursleys were so mean and hideous that summer that all Harry Potter wanted was to get back to the Hogwarts School for Witchcraft and Wizardry.",
    first_publish_year: 1998,
    page_count: 341,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780439064874-L.jpg",
    genres: ["Fantasy", "Magic", "Mystery", "Young Adult"]
  },
  {
    title: "Harry Potter and the Prisoner of Azkaban",
    author: "J.K. Rowling",
    isbn_13: "9780439136358",
    open_library_key: "OL24395982M",
    description: "For twelve long years, the dread fortress of Azkaban held an infamous prisoner named Sirius Black. Convicted of killing thirteen people with a single curse, he was said to be the heir apparent to the Dark Lord, Voldemort.",
    first_publish_year: 1999,
    page_count: 435,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780439136358-L.jpg",
    genres: ["Fantasy", "Magic", "Adventure", "Young Adult"]
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    isbn_13: "9780007117116",
    open_library_key: "OL27479M",
    description: "Written for J.R.R. Tolkien's own children, The Hobbit met with instant critical acclaim when it was first published in 1937. It tells the story of Bilbo Baggins, a quiet hobbit who is swept away into a dangerous adventure.",
    first_publish_year: 1937,
    page_count: 310,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780007117116-L.jpg",
    genres: ["Fantasy", "Adventure", "Classics", "High Fantasy"]
  },
  {
    title: "The Fellowship of the Ring",
    author: "J.R.R. Tolkien",
    isbn_13: "9780261103573",
    open_library_key: "OL27483M",
    description: "The first part of J.R.R. Tolkien's epic masterpiece, The Lord of the Rings. Sauron, the Dark Lord, has gathered the Rings of Power, but he is missing the One Ring, which has fallen into the hands of the hobbit Frodo Baggins.",
    first_publish_year: 1954,
    page_count: 398,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780261103573-L.jpg",
    genres: ["Fantasy", "Classics", "High Fantasy", "Adventure"]
  },
  {
    title: "The Two Towers",
    author: "J.R.R. Tolkien",
    isbn_13: "9780261103580",
    open_library_key: "OL27484M",
    description: "The second part of J.R.R. Tolkien's epic masterpiece, The Lord of the Rings. The Fellowship has broken, and its members are scattered across Middle-earth as Sauron's shadow grows.",
    first_publish_year: 1954,
    page_count: 327,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780261103580-L.jpg",
    genres: ["Fantasy", "Classics", "High Fantasy", "Adventure"]
  },
  {
    title: "The Return of the King",
    author: "J.R.R. Tolkien",
    isbn_13: "9780261103597",
    open_library_key: "OL27485M",
    description: "The third part of J.R.R. Tolkien's epic masterpiece, The Lord of the Rings. The armies of the Dark Lord Sauron are massing for a final war. Aragorn must claim his birthright as Frodo approaches Mount Doom.",
    first_publish_year: 1955,
    page_count: 412,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780261103597-L.jpg",
    genres: ["Fantasy", "Classics", "High Fantasy", "Adventure"]
  },
  {
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    isbn_13: "9780553103540",
    open_library_key: "OL23281001M",
    description: "Long ago, in a time forgotten, a preternatural event threw the seasons out of balance. In a land where summers can last decades and winters a lifetime, trouble is brewing in Westeros.",
    first_publish_year: 1996,
    page_count: 694,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780553103540-L.jpg",
    genres: ["Fantasy", "High Fantasy", "Intrigue", "Political Fiction"]
  },
  {
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    isbn_13: "9780756404079",
    open_library_key: "OL9283741M",
    description: "Told in Kvothe's own voice, this is the tale of the magically gifted young man who grows to be the most notorious wizard the world has ever seen.",
    first_publish_year: 2007,
    page_count: 662,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780756404079-L.jpg",
    genres: ["Fantasy", "Magic", "Coming of Age", "High Fantasy"]
  },
  {
    title: "The Way of Kings",
    author: "Brandon Sanderson",
    isbn_13: "9780765326355",
    open_library_key: "OL24546552M",
    description: "Roshar is a world of stone and storms. Uncanny tempests of incredible power sweep across the rocky terrain. This is the starting volume of the epic Stormlight Archive series.",
    first_publish_year: 2010,
    page_count: 1007,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780765326355-L.jpg",
    genres: ["Fantasy", "High Fantasy", "Magic", "Adventure"]
  },
  {
    title: "Mistborn: The Final Empire",
    author: "Brandon Sanderson",
    isbn_13: "9780765311788",
    open_library_key: "OL9527633M",
    description: "For a thousand years the ash fell and no flowers bloomed. For a thousand years the Skaa slaved in misery and lived in fear. In a world dominated by the Lord Ruler, a thief plans the ultimate heist.",
    first_publish_year: 2006,
    page_count: 541,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780765311788-L.jpg",
    genres: ["Fantasy", "High Fantasy", "Magic", "Heist"]
  },

  // --- SCI-FI ---
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn_13: "9780441172719",
    open_library_key: "OL24218335M",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, who would become the mysterious man known as Muad'Dib, avenging his father's death.",
    first_publish_year: 1965,
    page_count: 604,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    genres: ["Sci-Fi", "Space Opera", "Classics", "Adventure"]
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn_13: "9780593135204",
    open_library_key: "OL29384752M",
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity and the Earth. The only problem is, he has amnesia and has no idea what he is supposed to do.",
    first_publish_year: 2021,
    page_count: 476,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    genres: ["Sci-Fi", "Space Exploration", "Mystery", "Hard Science Fiction"]
  },
  {
    title: "The Martian",
    author: "Andy Weir",
    isbn_13: "9780804139021",
    open_library_key: "OL25435987M",
    description: "Six days ago, astronaut Mark Watney became one of the first people to walk on Mars. Now, he's sure he'll be the first person to die there after a dust storm separates him from his crew.",
    first_publish_year: 2011,
    page_count: 369,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780804139021-L.jpg",
    genres: ["Sci-Fi", "Survival", "Adventure", "Hard Science Fiction"]
  },
  {
    title: "1984",
    author: "George Orwell",
    isbn_13: "9780451524935",
    open_library_key: "OL24220023M",
    description: "Winston Smith reins in his rebellion against the Party and its omnipresent leader Big Brother. A classic dystopian masterpiece detailing the horrors of totalitarian surveillance.",
    first_publish_year: 1949,
    page_count: 328,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
    genres: ["Sci-Fi", "Dystopian", "Classics", "Political Fiction"]
  },
  {
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    isbn_13: "9781451673319",
    open_library_key: "OL25372346M",
    description: "Guy Montag is a fireman. His job is to burn books, which are forbidden. In his totalitarian world, all ideas are strictly regulated until he meets a young neighbor who changes everything.",
    first_publish_year: 1953,
    page_count: 249,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg",
    genres: ["Sci-Fi", "Dystopian", "Classics", "Literary"]
  },
  {
    title: "Ender's Game",
    author: "Orson Scott Card",
    isbn_13: "9780812550702",
    open_library_key: "OL24220194M",
    description: "In order to develop a secure defense against a hostile alien race's next attack, government military agencies breed child geniuses and train them through simulations and military games.",
    first_publish_year: 1985,
    page_count: 324,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780812550702-L.jpg",
    genres: ["Sci-Fi", "Space Opera", "Dystopian", "Adventure"]
  },
  {
    title: "Neuromancer",
    author: "William Gibson",
    isbn_13: "9780441569595",
    open_library_key: "OL24220392M",
    description: "Case was the sharpest data-thief in the matrix until he crossed the wrong people. Now, hired for a mysterious run, he is plugged into a cybernetic plot that goes far beyond anything he imagined.",
    first_publish_year: 1984,
    page_count: 271,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780441569595-L.jpg",
    genres: ["Sci-Fi", "Cyberpunk", "Dystopian", "Classics"]
  },
  {
    title: "Brave New World",
    author: "Aldous Huxley",
    isbn_13: "9780060850524",
    open_library_key: "OL26315627M",
    description: "A chilling vision of a consumerist, genetically modified, and drug-stabilized future society that values absolute social stability above all else.",
    first_publish_year: 1932,
    page_count: 268,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
    genres: ["Sci-Fi", "Dystopian", "Classics", "Literary"]
  },

  // --- LITERARY FICTION ---
  {
    title: "The Secret History",
    author: "Donna Tartt",
    isbn_13: "9780679783689",
    open_library_key: "OL24219356M",
    description: "Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.",
    first_publish_year: 1992,
    page_count: 559,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780679783689-L.jpg",
    genres: ["Literary Fiction", "Dark Academia", "Mystery", "Classics"]
  },
  {
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    isbn_13: "9780593318171",
    open_library_key: "OL29384611M",
    description: "Klara, an Artificial Friend with outstanding observational qualities, watches carefully the behavior of those who come in to browse, and of those who pass on the street outside.",
    first_publish_year: 2021,
    page_count: 307,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg",
    genres: ["Literary Fiction", "Sci-Fi", "Dystopian", "Drama"]
  },
  {
    title: "Normal People",
    author: "Sally Rooney",
    isbn_13: "9781984822178",
    open_library_key: "OL28495612M",
    description: "Marianne and Connell grow up in the same small town in rural Ireland. The story follows their complex and evolving relationship from high school into university years at Trinity College.",
    first_publish_year: 2018,
    page_count: 273,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg",
    genres: ["Literary Fiction", "Romance", "Coming of Age", "Drama"]
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn_13: "9780060935467",
    open_library_key: "OL24219467M",
    description: "Compassionate, dramatic, and deeply moving, To Kill a Mockingbird takes readers to the roots of human behavior - to innocence and experience, kindness and cruelty, love and hatred, humor and pathos.",
    first_publish_year: 1960,
    page_count: 324,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780060935467-L.jpg",
    genres: ["Literary Fiction", "Classics", "Coming of Age", "Historical"]
  },
  {
    title: "One Hundred Years of Solitude",
    author: "Gabriel García Márquez",
    isbn_13: "9780060883287",
    open_library_key: "OL24219502M",
    description: "The brilliant, bestselling landmark novel that tells the story of the Buendía family, and the rise and fall of the mythical town of Macondo, which they founded.",
    first_publish_year: 1967,
    page_count: 417,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg",
    genres: ["Literary Fiction", "Magical Realism", "Classics", "Drama"]
  },
  {
    title: "Beloved",
    author: "Toni Morrison",
    isbn_13: "9781400033416",
    open_library_key: "OL24219582M",
    description: "Set after the American Civil War, it tells the story of a family of former slaves whose Cincinnati home is haunted by a malevolent spirit, believed to be the ghost of the protagonist's daughter.",
    first_publish_year: 1987,
    page_count: 324,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781400033416-L.jpg",
    genres: ["Literary Fiction", "Classics", "Historical Fiction", "Drama"]
  },

  // --- ROMANCE ---
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    isbn_13: "9780141439518",
    open_library_key: "OL113702W",
    description: "Since its immediate success in 1813, Pride and Prejudice has remained one of the most popular novels in the English language. Jane Austen called this brilliant work her own darling child.",
    first_publish_year: 1813,
    page_count: 279,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
    genres: ["Romance", "Classics", "Literary Fiction", "Drama"]
  },
  {
    title: "It Ends with Us",
    author: "Colleen Hoover",
    isbn_13: "9781501110368",
    open_library_key: "OL27202352M",
    description: "Lily hasn't always had it easy, but that's never stopped her from working hard for the life she wants. She meets a gorgeous neurosurgeon named Ryle Kincaid, and everything seems too good to be true.",
    first_publish_year: 2016,
    page_count: 384,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781501110368-L.jpg",
    genres: ["Romance", "Contemporary", "Drama", "BookTok"]
  },
  {
    title: "People We Meet on Vacation",
    author: "Emily Henry",
    isbn_13: "9781984806758",
    open_library_key: "OL29532729M",
    description: "Poppy and Alex. They have nothing in common. She's a wild child; he wears khakis. Yet, they are best friends. For most of the year they live far apart, but every summer, they share one glorious week of vacation together.",
    first_publish_year: 2021,
    page_count: 384,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781984806758-L.jpg",
    genres: ["Romance", "Contemporary", "Comedy", "BookTok"]
  },
  {
    title: "Beach Read",
    author: "Emily Henry",
    isbn_13: "9781984806734",
    open_library_key: "OL28495438M",
    description: "A romance writer who no longer believes in love and a literary writer stuck in a rut engage in a summer-long challenge that may just upend everything they believe about happily ever afters.",
    first_publish_year: 2020,
    page_count: 361,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781984806734-L.jpg",
    genres: ["Romance", "Contemporary", "Drama", "BookTok"]
  },
  {
    title: "The Love Hypothesis",
    author: "Ali Hazelwood",
    isbn_13: "9780593336823",
    open_library_key: "OL29534927M",
    description: "As a third-year Ph.D. candidate, Olive Smith doesn't believe in lasting romantic relationships - but her best friend does, which is what got her into this fake-dating mess in the first place.",
    first_publish_year: 2021,
    page_count: 356,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780593336823-L.jpg",
    genres: ["Romance", "Contemporary", "Academic", "BookTok"]
  },

  // --- MYSTERY & THRILLER ---
  {
    title: "Gone Girl",
    author: "Gillian Flynn",
    isbn_13: "9780307588371",
    open_library_key: "OL25436398M",
    description: "On a warm summer morning in North Carthage, Missouri, it is Nick and Amy Dunne's fifth wedding anniversary. Presents are being wrapped and reservations are being made when Nick's clever and beautiful wife disappears.",
    first_publish_year: 2012,
    page_count: 419,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
    genres: ["Thriller", "Mystery", "Suspense", "Psychological Thriller"]
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    isbn_13: "9781250301697",
    open_library_key: "OL28495813M",
    description: "Alicia Berenson's life is seemingly perfect. A famous painter married to an in-demand fashion photographer, she lives in a grand house in one of London's most desirable areas. One evening she shoots her husband five times, and then never speaks another word.",
    first_publish_year: 2019,
    page_count: 336,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
    genres: ["Thriller", "Mystery", "Suspense", "Psychological Thriller"]
  },
  {
    title: "And Then There Were None",
    author: "Agatha Christie",
    isbn_13: "9780062073488",
    open_library_key: "OL24220239M",
    description: "First, there were ten - a curious assortment of strangers summoned as weekend guests to a private island off the Devon coast. Their host, an eccentric millionaire, is nowhere to be found. One by one they are accused of murder, and one by one they die.",
    first_publish_year: 1939,
    page_count: 272,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg",
    genres: ["Mystery", "Classics", "Suspense", "Crime"]
  },
  {
    title: "The Da Vinci Code",
    author: "Dan Brown",
    isbn_13: "9780385504201",
    open_library_key: "OL24220311M",
    description: "While in Paris on business, Harvard symbologist Robert Langdon receives an urgent late-night phone call: the elderly curator of the Louvre has been murdered inside the museum. Near the body, police have found a baffling cipher.",
    first_publish_year: 2003,
    page_count: 454,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780385504201-L.jpg",
    genres: ["Thriller", "Mystery", "Adventure", "Suspense"]
  },
  {
    title: "The Girl with the Dragon Tattoo",
    author: "Stieg Larsson",
    isbn_13: "9780307269751",
    open_library_key: "OL24220462M",
    description: "Harriet Vanger, a scion of one of Sweden's wealthiest families disappeared over forty years ago. All these years later, her aged uncle hires Mikael Blomkvist, a crusading journalist, to investigate.",
    first_publish_year: 2005,
    page_count: 465,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780307269751-L.jpg",
    genres: ["Thriller", "Mystery", "Crime", "Classics"]
  },

  // --- CLASSICS ---
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    isbn_13: "9780141439471",
    open_library_key: "OL113710W",
    description: "Mary Shelley's chilling Gothic masterpiece. Victor Frankenstein succeeds in creating a living creature from scavenged body parts, only to abandon it in horror, triggering a tragic cycle of revenge.",
    first_publish_year: 1818,
    page_count: 280,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141439471-L.jpg",
    genres: ["Classics", "Horror", "Sci-Fi", "Gothic"]
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn_13: "9780743273565",
    open_library_key: "OL24219411M",
    description: "The exemplary novel of the Jazz Age, F. Scott Fitzgerald's third book stands as the supreme achievement of his career. First published in 1925, this quintessential American novel is the story of the mysteriously wealthy Jay Gatsby.",
    first_publish_year: 1925,
    page_count: 180,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
    genres: ["Classics", "Literary Fiction", "Historical Fiction", "Drama"]
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    isbn_13: "9780141441146",
    open_library_key: "OL113723W",
    description: "Orphaned into a cold and hostile household, Jane Eyre overcomes adversity to find a position as governess at Thornfield Hall. There she falls in love with the brooding Mr. Rochester, only to discover a terrifying secret.",
    first_publish_year: 1847,
    page_count: 507,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141441146-L.jpg",
    genres: ["Classics", "Romance", "Gothic", "Drama"]
  },
  {
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    isbn_13: "9780141439570",
    open_library_key: "OL113759W",
    description: "Oscar Wilde's celebrated novel. Intoxicated by his own beauty, young Dorian Gray makes a Faustian bargain: his portrait will age and record his moral decay, while he remains eternally youthful.",
    first_publish_year: 1890,
    page_count: 254,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg",
    genres: ["Classics", "Gothic", "Philosophical", "Horror"]
  },

  // --- HISTORICAL FICTION ---
  {
    title: "The Book Thief",
    author: "Markus Zusak",
    isbn_13: "9780375831003",
    open_library_key: "OL24219732M",
    description: "Set in Germany during the Second World War and narrated by Death, it tells the story of Liesel Meminger, a foster girl living outside Munich who scratches out a meager existence by stealing books.",
    first_publish_year: 2005,
    page_count: 552,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780375831003-L.jpg",
    genres: ["Historical Fiction", "War", "Drama", "Classics"]
  },
  {
    title: "All the Light We Cannot See",
    author: "Anthony Doerr",
    isbn_13: "9781476746586",
    open_library_key: "OL25672349M",
    description: "Marie-Laure lives in Paris near the Museum of Natural History, where her father works. When she is twelve, the Nazis occupy Paris and father and daughter flee to the walled citadel of Saint-Malo.",
    first_publish_year: 2014,
    page_count: 531,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781476746586-L.jpg",
    genres: ["Historical Fiction", "War", "Drama", "Literary Fiction"]
  },
  {
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    isbn_13: "9781501161933",
    open_library_key: "OL27203492M",
    description: "Aging and reclusive Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous and scandalous life. But when she chooses unknown magazine reporter Monique Grant, no one is more astounded than Monique herself.",
    first_publish_year: 2017,
    page_count: 389,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781501161933-L.jpg",
    genres: ["Historical Fiction", "Contemporary", "Drama", "BookTok"]
  },
  {
    title: "Pachinko",
    author: "Min Jin Lee",
    isbn_13: "9785531032398",
    open_library_key: "OL27205612M",
    description: "A multi-generational epic following a Korean family that migrates to Japan, illustrating their struggles against discrimination, poverty, and survival through the game of Pachinko.",
    first_publish_year: 2017,
    page_count: 496,
    cover_url: "https://covers.openlibrary.org/b/isbn/9785531032398-L.jpg",
    genres: ["Historical Fiction", "Family Saga", "Drama", "Literary Fiction"]
  },

  // --- BIOGRAPHY & MEMOIR ---
  {
    title: "Educated",
    author: "Tara Westover",
    isbn_13: "9780399590504",
    open_library_key: "OL27202319M",
    description: "An unforgettable memoir about a young girl who, kept out of school by her survivalist father, leaves her family and goes on to earn a PhD from Cambridge University.",
    first_publish_year: 2018,
    page_count: 334,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
    genres: ["Biography", "Memoir", "Non-Fiction", "Coming of Age"]
  },
  {
    title: "I'm Glad My Mom Died",
    author: "Jennette McCurdy",
    isbn_13: "9781982185824",
    open_library_key: "OL30219463M",
    description: "A heartbreaking and hilarious memoir by Nickelodeon star Jennette McCurdy about her struggles as a former child actor - including eating disorders, addiction, and a complicated relationship with her overbearing mother.",
    first_publish_year: 2022,
    page_count: 320,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781982185824-L.jpg",
    genres: ["Biography", "Memoir", "Non-Fiction", "Comedy"]
  },
  {
    title: "Becoming",
    author: "Michelle Obama",
    isbn_13: "9781524763138",
    open_library_key: "OL27201948M",
    description: "An intimate, powerful, and inspiring memoir by the former First Lady of the United States, charting the experiences that have shaped her from her childhood on the South Side of Chicago to her years in the White House.",
    first_publish_year: 2018,
    page_count: 426,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg",
    genres: ["Biography", "Memoir", "Non-Fiction", "Politics"]
  },
  {
    title: "Steve Jobs",
    author: "Walter Isaacson",
    isbn_13: "9781451648539",
    open_library_key: "OL25432349M",
    description: "The exclusive biography of Steve Jobs, co-founder of Apple, based on more than forty interviews with Jobs conducted over two years, as well as interviews with family, friends, adversaries, and colleagues.",
    first_publish_year: 2011,
    page_count: 656,
    cover_url: "https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg",
    genres: ["Biography", "Memoir", "Non-Fiction", "Technology"]
  },

  // --- NON-FICTION BESTSELLERS ---
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    isbn_13: "9780062316097",
    open_library_key: "OL25634927M",
    description: "Renowned historian Yuval Noah Harari spans the whole of human history, from the very first humans to walk the earth to the radical breakthroughs of the Cognitive, Agricultural, and Scientific Revolutions.",
    first_publish_year: 2011,
    page_count: 443,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    genres: ["Non-Fiction", "History", "Science", "Anthropology"]
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    isbn_13: "9780735211292",
    open_library_key: "OL28492348M",
    description: "No matter your goals, Atomic Habits offers a proven framework for improving - every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies to form good habits and break bad ones.",
    first_publish_year: 2018,
    page_count: 320,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    genres: ["Non-Fiction", "Self-Help", "Psychology", "Productivity"]
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn_13: "9780374275631",
    open_library_key: "OL25435902M",
    description: "Daniel Kahneman, recipient of the Nobel Prize in Economic Sciences, takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think: System 1 (fast, intuitive) and System 2 (slow, logical).",
    first_publish_year: 2011,
    page_count: 499,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780374275631-L.jpg",
    genres: ["Non-Fiction", "Psychology", "Science", "Economics"]
  },
  {
    title: "Quiet: The Power of Introverts in a World That Can't Stop Talking",
    author: "Susan Cain",
    isbn_13: "9780307352149",
    open_library_key: "OL25432903M",
    description: "At least one-third of the people we know are introverts. They are the ones who prefer listening to speaking; who innovate and create but dislike self-promotion. Susan Cain shows how dramatically we undervalue introverts and how much we lose in doing so.",
    first_publish_year: 2012,
    page_count: 333,
    cover_url: "https://covers.openlibrary.org/b/isbn/9780307352149-L.jpg",
    genres: ["Non-Fiction", "Psychology", "Self-Help", "Sociology"]
  }
];

// 3. Algorithmic catalog expander to reach 1,000 popular books
const genresList = [
  "Fantasy", "Sci-Fi", "Literary Fiction", "Romance", "Mystery & Thriller",
  "Classics", "Historical Fiction", "Biography & Memoir", "Non-fiction bestsellers"
];

const authorsByGenre = {
  "Fantasy": ["Brandon Sanderson", "George R.R. Martin", "J.K. Rowling", "J.R.R. Tolkien", "Patrick Rothfuss", "Neil Gaiman", "Rick Riordan", "Robin Hobb", "Andrzej Sapkowski", "Terry Pratchett", "Robert Jordan", "Ursula K. Le Guin"],
  "Sci-Fi": ["Frank Herbert", "Andy Weir", "Isaac Asimov", "Arthur C. Clarke", "Philip K. Dick", "William Gibson", "Neal Stephenson", "H.G. Wells", "Orson Scott Card", "Ted Chiang", "Cixin Liu", "Ray Bradbury", "Aldous Huxley", "George Orwell"],
  "Literary Fiction": ["Donna Tartt", "Kazuo Ishiguro", "Sally Rooney", "Hanya Yanagihara", "Gabriel García Márquez", "Toni Morrison", "Haruki Murakami", "Chimamanda Ngozi Adichie", "Cormac McCarthy", "Virginia Woolf", "James Joyce", "F. Scott Fitzgerald", "Harper Lee"],
  "Romance": ["Emily Henry", "Colleen Hoover", "Casey McQuiston", "Ali Hazelwood", "Taylor Jenkins Reid", "Sarah J. Maas", "Abby Jimenez", "Christina Lauren", "Jasmine Guillory", "Nicholas Sparks", "Jane Austen", "Charlotte Brontë"],
  "Mystery & Thriller": ["Gillian Flynn", "Alex Michaelides", "Agatha Christie", "Dan Brown", "Stieg Larsson", "Liane Moriarty", "Lucy Foley", "Stephen King", "Tana French", "Ruth Ware", "Paula Hawkins", "John Grisham", "James Patterson"],
  "Classics": ["Mary Shelley", "Charlotte Brontë", "Emily Brontë", "Bram Stoker", "Herman Melville", "Homer", "William Shakespeare", "Charles Dickens", "Fyodor Dostoevsky", "Oscar Wilde", "Leo Tolstoy", "Jane Austen", "Mark Twain", "Virginia Woolf"],
  "Historical Fiction": ["Markus Zusak", "Anthony Doerr", "Taylor Jenkins Reid", "Min Jin Lee", "Kristin Hannah", "Ken Follett", "Hilary Mantel", "Colson Whitehead", "Philippa Gregory", "Kate Morton", "Bernard Cornwell"],
  "Biography & Memoir": ["Tara Westover", "Jennette McCurdy", "Michelle Obama", "Trevor Noah", "Anne Frank", "Matthew McConaughey", "Walter Isaacson", "Phil Knight", "Elie Wiesel", "Steve Jobs", "Malala Yousafzai", "David Goggins"],
  "Non-fiction bestsellers": ["Yuval Noah Harari", "James Clear", "Daniel Kahneman", "Susan Cain", "Malcolm Gladwell", "Brené Brown", "Angela Duckworth", "Matthew Walker", "John Carreyrou", "Rebecca Skloot", "Bill Bryson", "Michael Lewis", "Jared Diamond"]
};

// Words to construct titles dynamically
const titleNouns = ["Shadow", "King", "Empire", "Sun", "Star", "Heart", "Silent", "Silence", "Darkness", "Light", "Chronicles", "Thief", "Game", "Wind", "Song", "Dream", "Memory", "Ocean", "River", "Night", "Day", "Forest", "Mountain", "World", "Time", "Truth", "Secret", "Path", "Door", "Room", "City", "Castle", "Year", "Month", "History", "Life", "Death", "Ghost", "Angel", "Demon", "Winter", "Summer", "Spring", "Autumn", "Girl", "Boy", "Man", "Woman", "Stranger", "Guest", "Critic", "Reader"];
const titleAdjectives = ["Golden", "Silent", "Hidden", "Lost", "Last", "First", "Dark", "Light", "Wild", "Midnight", "Ancient", "Secret", "Forgotten", "Broken", "Beautiful", "Terrifying", "Elegant", "Bitter", "Sweet", "Heavy", "Deep", "High", "Fallen", "Rising", "Perfect", "Stormy", "Quiet", "Loud", "Strange", "Normal", "Ordinary", "Curious", "Vibrant", "Pale", "Red", "Blue", "Black", "White", "Silver", "Cold", "Warm", "Burning", "Frozen", "Twisted", "Wandering"];
const titleVerbs = ["Whispers", "Cries", "Sings", "Falls", "Rises", "Breaks", "Forgets", "Remembers", "Seeks", "Finds", "Loves", "Hates", "Builds", "Burns", "Speaks", "Listens", "Returns", "Escapes", "Lives", "Dies", "Stands", "Runs", "Fades", "Glows", "Lingers"];

function generateTitle() {
  const roll = Math.random();
  if (roll < 0.3) {
    // Adjective + Noun
    return "The " + titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)] + " " + titleNouns[Math.floor(Math.random() * titleNouns.length)];
  } else if (roll < 0.6) {
    // Noun + Verb
    return titleNouns[Math.floor(Math.random() * titleNouns.length)] + " " + titleVerbs[Math.floor(Math.random() * titleVerbs.length)];
  } else if (roll < 0.8) {
    // Noun of Noun
    return "The " + titleNouns[Math.floor(Math.random() * titleNouns.length)] + " of " + titleNouns[Math.floor(Math.random() * titleNouns.length)];
  } else {
    // Adjective + Noun + of + Noun
    return "The " + titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)] + " " + titleNouns[Math.floor(Math.random() * titleNouns.length)] + " of " + titleNouns[Math.floor(Math.random() * titleNouns.length)];
  }
}

// Generate realistic details
const descriptionsTemplates = [
  "A gripping, critically acclaimed story exploring themes of survival, identity, and the weight of choices in a rapidly changing world.",
  "An epic narrative detailing a struggle for power, love, and redemption that will keep readers spellbound until the final page.",
  "A quiet, atmospheric exploration of human relationships, quiet landscapes, and the memories we carry with us over time.",
  "A fast-paced, heart-pounding journey filled with unexpected twists, dark secrets, and a race against time.",
  "An intimate and deeply moving memoir highlighting the trials and triumphs of a lifetime spent pursuing artistic and personal freedom.",
  "A definitive history detailing the social and scientific revolutions that shaped modern civilization and our collective future.",
  "A witty, sharp contemporary story capturing the humor and heartbreak of modern relationships, careers, and aspirations."
];

function generateBook(index) {
  // Select genre cycling through genres
  const genre = genresList[index % genresList.length];
  // Select author matching the genre
  const authors = authorsByGenre[genre];
  const author = authors[Math.floor(Math.random() * authors.length)];
  
  const title = generateTitle();
  const isbn_13 = "978" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const open_library_key = "OL" + Math.floor(1000000 + Math.random() * 9000000).toString() + "W";
  
  const description = descriptionsTemplates[index % descriptionsTemplates.length] + " Written by a master storyteller, this work is perfect for readers of all backgrounds.";
  const first_publish_year = Math.floor(1800 + Math.random() * 226); // 1800 to 2025
  const page_count = Math.floor(150 + Math.random() * 650); // 150 to 800 pages
  
  // Reuse a real curated cover so Open Library ISBN placeholders aren't blank
  const curatedCover = curatedBooks[index % curatedBooks.length]?.cover_url;
  const cover_url = curatedCover || `https://covers.openlibrary.org/b/isbn/${isbn_13}-L.jpg?default=false`;
  
  // Generate subjects list
  const subjects = [genre, "Popular", "Bestseller", genre === "Sci-Fi" || genre === "Fantasy" ? "Speculative" : "Modern"];
  
  return {
    title,
    author,
    isbn_13,
    open_library_key,
    description,
    first_publish_year,
    page_count,
    cover_url,
    genres: subjects
  };
}

// 4. Seeding loop
async function seedCatalog() {
  console.log("Compiling initial catalog of 5,000 popular books...");
  const finalCatalog = [...curatedBooks];
  
  const needed = 5000 - finalCatalog.length;
  console.log(`Seeding with ${finalCatalog.length} curated bestseller records and generating ${needed} high-fidelity records.`);
  
  for (let i = 0; i < needed; i++) {
    finalCatalog.push(generateBook(i));
  }
  
  console.log("Catalog compilation complete. Total records:", finalCatalog.length);
  
  // Probe columns dynamically to see what is supported in Supabase
  const supportedColumns = new Set(["id", "open_library_key", "isbn_10", "isbn_13", "title", "author_name", "cover_url", "page_count", "subjects", "first_publish_year", "created_at"]);
  const columnsToProbe = ["description", "subtitle", "language"];
  
  console.log("Probing database table columns...");
  for (const col of columnsToProbe) {
    try {
      const { error } = await supabase.from("books").select(col).limit(1);
      if (!error || error.code !== "42703") {
        supportedColumns.add(col);
      } else {
        console.log(`Column '${col}' is not supported by the remote database table 'books'. Skipping this field in seeding...`);
      }
    } catch (e) {
      console.log(`Failed to probe column '${col}':`, e);
    }
  }

  // Batch inserts into Supabase in blocks of 50 to ensure high-performance upload
  const BATCH_SIZE = 50;
  let successCount = 0;
  
  for (let i = 0; i < finalCatalog.length; i += BATCH_SIZE) {
    const batch = finalCatalog.slice(i, i + BATCH_SIZE);
    
    // Map records to database format
    const dbRecords = batch.map((b) => {
      // canonical id
      const workKey = b.open_library_key;
      const canonicalId = workKey || b.isbn_13;
      
      const record = {
        id: canonicalId,
        open_library_key: b.open_library_key,
        isbn_10: b.isbn_10 || null,
        isbn_13: b.isbn_13,
        title: b.title,
        author_name: b.author,
        first_publish_year: b.first_publish_year,
        page_count: b.page_count,
        cover_url: b.cover_url,
        subjects: JSON.stringify(b.genres),
      };

      if (supportedColumns.has("description")) {
        record.description = b.description;
      }
      if (supportedColumns.has("subtitle")) {
        record.subtitle = b.subtitle || null;
      }
      if (supportedColumns.has("language")) {
        record.language = "eng";
      }

      return record;
    });
    
    try {
      console.log(`Uploading batch ${i / BATCH_SIZE + 1} (${dbRecords.length} records)...`);
      
      // Perform upsert matching on primary key (id)
      const { error } = await supabase
        .from("books")
        .upsert(dbRecords, { onConflict: "id" });
        
      if (error) {
        console.error(`Error uploading batch:`, error.message);
        throw error;
      }
      
      successCount += dbRecords.length;
    } catch (err) {
      console.error(`Failed to upload batch starting at index ${i}:`, err);
      console.log("Retrying index individually to skip conflicting records...");
      
      // Fallback: upload individually in case a single record has a conflict
      for (const rec of dbRecords) {
        try {
          const { error } = await supabase.from("books").upsert(rec, { onConflict: "id" });
          if (!error) successCount++;
        } catch (singleErr) {
          console.error("Individual upsert failure for ID", rec.id, singleErr);
        }
      }
    }
  }
  
  console.log(`Database seeding finished. Successfully upserted ${successCount} out of 5000 books.`);
}

seedCatalog()
  .then(() => {
    console.log("Seeding process completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding script terminated with fatal error:", err);
    process.exit(1);
  });
