import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { Client } from "pg";

function loadEnv() {
  const env = {};
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "frontend", ".env.local"),
    path.resolve(process.cwd(), "..", "frontend", ".env.local"),
  ];
  const envPath = envPaths.find((p) => fs.existsSync(p));
  if (!envPath) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    let val = match[2] || "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
  return env;
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !serviceKey) {
  console.error("Missing DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DEMO_USERS = [
  {
    email: "emma@leaf.demo",
    username: "emma_reads",
    display_name: "Emma Sterling",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Curator of dark academic moods. I read to get lost in old hallways. Donna Tartt enthusiast.",
  },
  {
    email: "alex@leaf.demo",
    username: "alex_books",
    display_name: "Alex Petrov",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Aerospace engineer reading sci-fi and hard fiction.",
  },
  {
    email: "sophia@leaf.demo",
    username: "sophia_lit",
    display_name: "Sophia Chen",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bio: "Writer and coffee addict. Exploring technology, consciousness, and heart.",
  },
  {
    email: "julian@leaf.demo",
    username: "julian_reviews",
    display_name: "Julian Vance",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "Literary critic. Seeking structural beauty and unforgettable prose.",
  },
];

const DEMO_REVIEWS = [
  {
    username: "emma_reads",
    book_title: "The Secret History",
    rating: 5,
    review_text:
      "Donna Tartt's atmosphere is thick, elitist, and absolutely terrifying. I reread this every autumn...",
    likes_count: 245,
    minutes_ago: 2,
  },
  {
    username: "alex_books",
    book_title: "Project Hail Mary",
    rating: 5,
    review_text:
      "A masterclass in problem-solving sci-fi. Ryland Grace and Rocky have the best platonic partnership in modern literature.",
    likes_count: 182,
    minutes_ago: 15,
  },
  {
    username: "sophia_lit",
    book_title: "Normal People",
    rating: 4.5,
    review_text:
      "Rooney captures the silent space between two people who know each other too well. Beautifully tender.",
    likes_count: 120,
    minutes_ago: 60,
  },
  {
    username: "julian_reviews",
    book_title: "The Great Gatsby",
    rating: 4.5,
    review_text:
      "Nearly a hundred years later, Fitzgerald's descriptions of wealth, green lights, and dust still ring perfectly true.",
    likes_count: 94,
    minutes_ago: 60 * 24,
  },
  {
    username: "sophia_lit",
    book_title: "Klara and the Sun",
    rating: 4,
    review_text:
      "Ishiguro writes with such heartbreaking restraint. The ending is quiet, painful, and absolutely beautiful.",
    likes_count: 78,
    minutes_ago: 60 * 48,
  },
];

async function ensureAuthUser(pg, user) {
  const existing = await pg.query(`SELECT id FROM auth.users WHERE email = $1 LIMIT 1`, [
    user.email,
  ]);
  if (existing.rows[0]) return existing.rows[0].id;

  const idRes = await pg.query(`SELECT gen_random_uuid() AS id`);
  const id = idRes.rows[0].id;

  await pg.query(
    `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      $1,
      'authenticated',
      'authenticated',
      $2,
      crypt('leaf-demo-password', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      $3::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
  `,
    [
      id,
      user.email,
      JSON.stringify({
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        name: user.display_name,
      }),
    ]
  );

  // Some Supabase setups require an identity row for the user to be complete
  await pg.query(
    `
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      $1::uuid, $1::uuid,
      jsonb_build_object('sub', $1::text, 'email', $2::text),
      'email',
      $1::text,
      NOW(), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING
  `,
    [id, user.email]
  );

  return id;
}

async function main() {
  const pg = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();
  console.log("Connected to Postgres");

  // Ensure pgcrypto for crypt()/gen_salt
  await pg.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  const userIdsByUsername = {};

  for (const user of DEMO_USERS) {
    const id = await ensureAuthUser(pg, user);
    userIdsByUsername[user.username] = id;

    // Trigger may have created profile; upsert details
    await pg.query(
      `
      INSERT INTO public.profiles (id, username, display_name, email, bio, avatar_url, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        onboarding_completed = TRUE
    `,
      [id, user.username, user.display_name, user.email, user.bio, user.avatar_url]
    );

    await pg.query(
      `
      INSERT INTO public.user_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
      [id]
    );

    console.log(`User ready: ${user.display_name} (${id})`);
  }

  // Resolve books by title
  const bookIds = {};
  for (const title of [...new Set(DEMO_REVIEWS.map((r) => r.book_title))]) {
    const res = await pg.query(
      `SELECT id, title FROM public.books WHERE title ILIKE $1 LIMIT 1`,
      [title]
    );
    if (!res.rows[0]) {
      console.error(`Missing book in catalog: ${title}`);
      process.exit(1);
    }
    bookIds[title] = res.rows[0].id;
    console.log(`Book: ${title} -> ${res.rows[0].id}`);
  }

  // Clear prior demo reviews for these users, then insert fresh
  const demoUserIds = Object.values(userIdsByUsername);
  await pg.query(`DELETE FROM public.reviews WHERE user_id = ANY($1::uuid[])`, [demoUserIds]);

  for (const review of DEMO_REVIEWS) {
    const userId = userIdsByUsername[review.username];
    const bookId = bookIds[review.book_title];
    const createdAt = new Date(Date.now() - review.minutes_ago * 60 * 1000);

    await pg.query(
      `
      INSERT INTO public.reviews (user_id, book_id, rating, review_text, likes_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [userId, bookId, review.rating, review.review_text, review.likes_count, createdAt.toISOString()]
    );
    console.log(`Review: ${review.username} → ${review.book_title}`);
  }

  // Also upsert matching user_books finished entries so library/stats stay coherent
  for (const review of DEMO_REVIEWS) {
    const userId = userIdsByUsername[review.username];
    const bookId = bookIds[review.book_title];
    await pg.query(
      `
      INSERT INTO public.user_books (user_id, book_id, status, rating, review, finished_at)
      VALUES ($1, $2, 'finished', $3, $4, NOW()::date)
      ON CONFLICT (user_id, book_id) DO UPDATE SET
        status = 'finished',
        rating = EXCLUDED.rating,
        review = EXCLUDED.review
    `,
      [userId, bookId, review.rating, review.review_text]
    );
  }

  const count = await pg.query(`SELECT COUNT(*)::int AS n FROM public.reviews`);
  console.log(`Done. reviews table now has ${count.rows[0].n} rows.`);

  // Quick sanity via REST
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, review_text, profile:profiles(display_name), book:books(title)")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) console.warn("REST check warning:", error.message);
  else console.log("Latest reviews:", JSON.stringify(data, null, 2));

  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
