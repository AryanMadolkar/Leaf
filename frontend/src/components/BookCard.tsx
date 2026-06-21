"use client";

import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Book } from "@/data/mockData";

interface BookCardProps {
  book: Book;
  size?: "sm" | "md" | "lg" | "xl";
  showStats?: boolean;
}

export default function BookCard({ book, size = "md", showStats = false }: BookCardProps) {
  // Size classes
  const sizeClasses = {
    sm: "w-24 h-36",
    md: "w-36 h-52",
    lg: "w-44 h-64",
    xl: "w-52 h-76",
  };

  return (
    <div className="flex flex-col items-center">
      <Link href={`/book/${book.id}`} className="group relative block focus:outline-none">
        {/* Cover Canvas container */}
        <div
          className={`${sizeClasses[size]} relative rounded-lg overflow-hidden book-shadow bg-cream-dark`}
        >
          {/* Subtle Page Edge effect (Letterboxd/Apple Books style) */}
          <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
          <div className="absolute top-0 bottom-0 left-[4px] w-[1px] bg-white/20 z-10" />

          {/* Cover image */}
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-charcoal/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-20">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-cream/70 mb-0.5">
              {book.author}
            </span>
            <span className="font-serif text-sm font-bold text-cream leading-tight truncate">
              {book.title}
            </span>
            {book.averageRating > 0 && (
              <div className="flex items-center gap-1 mt-1 text-yellow-400">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-bold text-cream">
                  {book.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {showStats && (
        <div className="mt-3 text-center max-w-[144px]">
          <h5 className="font-serif text-sm font-bold text-charcoal truncate">
            {book.title}
          </h5>
          <p className="text-[10px] text-charcoal-muted truncate">
            {book.author}
          </p>
        </div>
      )}
    </div>
  );
}
