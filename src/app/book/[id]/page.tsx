import React from "react";
import BookDetailClient from "./BookDetailClient";
import { getBookById } from "@/utils/booksApi";
import Header from "@/components/Header";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  console.log(`[Book Detail Page Route] Loading route with parameter id: "${id}"`);
  
  let book = null;
  try {
    book = await getBookById(id);
  } catch (error) {
    console.error(`[Book Detail Page Route] Routing failure or API error resolving ID "${id}":`, error);
  }

  if (!book) {
    console.warn(`[Book Detail Page Route] Routing failure: Book ID "${id}" could not be resolved. Rendering custom 404 page.`);
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
          <div className="bg-cream-card border border-cream-border/60 rounded-2xl p-8 shadow-md relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-xl transition-all duration-500 group-hover:bg-brand/10 pointer-events-none" />
            <BookOpen className="w-16 h-16 text-brand/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-charcoal">Volume Not Found</h2>
            <p className="text-xs text-charcoal-muted mt-3 leading-relaxed">
              We searched the local catalog and queried the Open Library archives, but the requested volume could not be resolved or found.
            </p>
            <div className="pt-6">
              <Link
                href="/search"
                className="inline-flex items-center justify-center px-6 h-9 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow-sm transition-colors font-semibold"
              >
                Return to Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log(`[Book Detail Page Route] Rendering BookDetailClient for resolved book ID: "${id}" (Title: "${book.title}")`);
  return <BookDetailClient book={book} />;
}
