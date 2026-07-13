"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import CoverImage from "@/components/CoverImage";
import type { Book } from "@/data/mockData";
import { Heart, BookOpen, Bookmark, Star, FolderInput, Trash2, ExternalLink } from "lucide-react";

type StandingBookProps = {
  book: Book;
  editable?: boolean;
  onOpen?: () => void;
  onStatus?: (status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite?: () => void;
  onMove?: () => void;
  onRemove?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
};

export default function StandingBook({
  book,
  editable,
  onOpen,
  onStatus,
  onFavorite,
  onMove,
  onRemove,
  dragHandleProps,
}: StandingBookProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const dims = useMemo(() => {
    // Deterministic height/width variation from title
    let hash = 0;
    for (let i = 0; i < book.title.length; i++) hash = (hash * 31 + book.title.charCodeAt(i)) | 0;
    const h = 112 + (Math.abs(hash) % 36); // 112–147px
    const w = 42 + (Math.abs(hash >> 3) % 14); // 42–55px
    const tilt = ((hash % 5) - 2) * 0.6; // slight lean
    return { h, w, tilt };
  }, [book.title]);

  return (
    <div
      className="relative group flex-shrink-0"
      style={{ width: dims.w, height: dims.h }}
      onMouseLeave={() => setMenuOpen(false)}
      {...dragHandleProps}
    >
      <button
        type="button"
        onClick={() => (editable ? setMenuOpen((v) => !v) : onOpen?.())}
        className="absolute inset-0 origin-bottom transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.03] focus:outline-none"
        style={{
          transform: `perspective(600px) rotateY(${dims.tilt}deg)`,
          filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.28))",
        }}
        title={book.title}
      >
        <div className="relative w-full h-full rounded-[2px] overflow-hidden border border-black/10 bg-cream-dark">
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-r from-black/30 to-transparent z-10" />
          <CoverImage
            src={book.coverImage}
            title={book.title}
            author={book.author}
            bookId={book.id}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover"
          />
        </div>
      </button>

      {editable && menuOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] z-30 w-44 bg-cream border border-cream-border rounded-xl shadow-xl p-1.5 text-[11px]">
          <Link
            href={`/book/${book.id}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand" /> Open Book
          </Link>
          <button
            type="button"
            onClick={() => onStatus?.("Finished")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold text-left"
          >
            <Star className="w-3.5 h-3.5 text-brand" /> Mark as Read
          </button>
          <button
            type="button"
            onClick={() => onStatus?.("Currently Reading")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold text-left"
          >
            <BookOpen className="w-3.5 h-3.5 text-brand" /> Currently Reading
          </button>
          <button
            type="button"
            onClick={() => onStatus?.("Want to Read")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold text-left"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand" /> Want to Read
          </button>
          <button
            type="button"
            onClick={onFavorite}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold text-left"
          >
            <Heart className="w-3.5 h-3.5 text-brand" /> Favorite
          </button>
          <button
            type="button"
            onClick={onMove}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cream-dark/60 text-charcoal font-semibold text-left"
          >
            <FolderInput className="w-3.5 h-3.5 text-brand" /> Move to Shelf
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-700 font-semibold text-left"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
