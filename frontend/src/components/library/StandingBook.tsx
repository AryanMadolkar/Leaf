"use client";

import React, { useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import CoverImage from "@/components/CoverImage";
import type { Book } from "@/data/mockData";
import {
  extractSpinePaletteFromCover,
  paletteFromSeed,
  spineHeightFromSeed,
  spineWidthFromPages,
  type ReadingStatus,
  type SpinePalette,
} from "./spineUtils";
import { Heart, BookOpen, Bookmark, Star, Trash2 } from "lucide-react";

type StandingBookProps = {
  book: Book;
  editable?: boolean;
  status?: ReadingStatus;
  isFavorite?: boolean;
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite?: (bookId: string) => void;
  onRemove?: (bookId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
};

function textureOverlay(texture: SpinePalette["texture"]): string {
  if (texture === "leather") {
    return "repeating-linear-gradient(90deg, transparent 0 2px, rgba(0,0,0,0.06) 2px 3px), radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 40%)";
  }
  if (texture === "cloth") {
    return "repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.04) 1px 2px), repeating-linear-gradient(90deg, transparent 0 1px, rgba(0,0,0,0.05) 1px 2px)";
  }
  if (texture === "linen") {
    return "repeating-linear-gradient(45deg, transparent 0 3px, rgba(255,255,255,0.03) 3px 4px)";
  }
  return "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%, rgba(0,0,0,0.08))";
}

const StandingBook = memo(function StandingBook({
  book,
  editable,
  status,
  isFavorite,
  onStatus,
  onFavorite,
  onRemove,
  dragHandleProps,
}: StandingBookProps) {
  const seed = `${book.id}:${book.title}`;
  const [palette, setPalette] = useState<SpinePalette>(() => paletteFromSeed(seed));

  const dims = useMemo(() => {
    const w = spineWidthFromPages(book.pages);
    const h = spineHeightFromSeed(seed, book.pages);
    return { w, h };
  }, [book.pages, seed]);

  useEffect(() => {
    let cancelled = false;
    const cover = book.coverImage || "";
    if (!cover || cover.includes("placeholder")) return;
    const t = window.setTimeout(() => {
      extractSpinePaletteFromCover(cover, seed).then((p) => {
        if (!cancelled) setPalette(p);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [book.coverImage, seed]);

  // Title scales with spine width/height for denser, premium look
  const titleSize =
    dims.w < 26
      ? 10
      : book.title.length > 42
        ? 11
        : book.title.length > 28
          ? 12
          : book.title.length > 18
            ? 13
            : 14;
  const authorShort = (book.author || "").split(",")[0].trim();

  return (
    <div
      className="relative flex-shrink-0 group/book z-0 hover:z-50"
      style={{ width: dims.w, height: dims.h }}
    >
      <div className="absolute inset-0" {...dragHandleProps}>
        <Link
          href={`/book/${book.id}`}
          className="absolute inset-0 origin-bottom focus:outline-none cursor-pointer transition-transform duration-200 ease-out group-hover/book:-translate-y-2 group-hover/book:z-25 group-hover/book:shadow-[3px_10px_18px_rgba(0,0,0,0.32)]"
          style={{ boxShadow: "1px 3px 6px rgba(0,0,0,0.26)" }}
          title={book.title}
          aria-label={`${book.title} by ${book.author}`}
          draggable={false}
        >
          <div
            className="relative w-full h-full overflow-hidden rounded-[1px]"
            style={{
              background: `linear-gradient(90deg, ${palette.bgDeep} 0%, ${palette.bg} 18%, ${palette.bg} 82%, ${palette.bgDeep} 100%)`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-70 mix-blend-overlay"
              style={{ backgroundImage: textureOverlay(palette.texture) }}
            />
            <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-r from-black/35 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-l from-black/25 to-transparent" />

            <div
              className="absolute left-[15%] right-[15%] top-[10%] h-px opacity-70"
              style={{ background: palette.foil ? palette.accent : `${palette.text}55` }}
            />
            <div
              className="absolute left-[15%] right-[15%] bottom-[14%] h-px opacity-70"
              style={{ background: palette.foil ? palette.accent : `${palette.text}55` }}
            />

            <div className="absolute inset-0 flex items-center justify-center px-[2px] py-5 overflow-hidden">
              <span
                className="font-serif font-bold tracking-wide whitespace-nowrap max-h-full"
                style={{
                  color: palette.foil ? palette.accent : palette.text,
                  fontSize: titleSize,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  textShadow: "0 1px 0 rgba(0,0,0,0.25)",
                  letterSpacing: "0.04em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {book.title}
              </span>
            </div>

            {dims.w >= 26 && authorShort && (
              <div className="absolute inset-x-0 bottom-[18%] flex justify-center px-[1px] overflow-hidden">
                <span
                  className="font-serif italic opacity-80 whitespace-nowrap"
                  style={{
                    color: palette.text,
                    fontSize: Math.max(6, titleSize - 3),
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    maxHeight: "28%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {authorShort}
                </span>
              </div>
            )}

            <div className="absolute inset-y-[4%] right-0 w-[1px] bg-gradient-to-b from-[#f5ecd8]/40 via-[#e8dcc4]/70 to-[#f5ecd8]/40" />

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-10">
              {isFavorite && (
                <span className="text-[8px] leading-none" style={{ color: "#C9A227" }} aria-label="Favorite">
                  ★
                </span>
              )}
              {status === "Finished" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E4D38]" aria-label="Finished" />
              )}
              {status === "Want to Read" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#3A6EA5]" aria-label="Wishlist" />
              )}
            </div>
          </div>

          {status === "Currently Reading" && (
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-[5px] h-5 rounded-b-[1px] shadow-sm pointer-events-none"
              style={{
                background: "linear-gradient(180deg, #B83A3A, #B83A3Acc)",
                clipPath: "polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)",
              }}
              aria-hidden
            />
          )}
        </Link>
      </div>

      {/* Cover preview — escapes shelf bay; parent bookcase must be overflow-visible */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+10px)] z-[60] w-56 pointer-events-none opacity-0 translate-y-1 scale-[0.97] transition-[opacity,transform] duration-150 group-hover/book:opacity-100 group-hover/book:translate-y-0 group-hover/book:scale-100 group-hover/book:pointer-events-auto">
        <div className="bg-cream border border-cream-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex gap-2.5 p-2.5">
            <CoverImage
              src={book.coverImage}
              title={book.title}
              author={book.author}
              bookId={book.id}
              className="w-[72px] h-[108px] rounded shadow-sm flex-shrink-0"
              imgClassName="w-full h-full object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-serif text-xs font-bold text-charcoal leading-snug line-clamp-3">
                {book.title}
              </p>
              <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
              <div className="flex items-center gap-1 text-[10px] text-brand font-semibold">
                <Star className="w-2.5 h-2.5 fill-current" />
                {book.averageRating?.toFixed(1) ?? "—"}
              </div>
              {status && (
                <p className="text-[9px] uppercase tracking-wider font-bold text-charcoal-muted">
                  {status}
                </p>
              )}
            </div>
          </div>
          {editable && (
            <div className="border-t border-cream-border/70 p-1.5 grid grid-cols-2 gap-0.5 text-[10px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onStatus?.(book.id, "Finished");
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
              >
                <Star className="w-3 h-3 text-brand" /> Finished
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onStatus?.(book.id, "Currently Reading");
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
              >
                <BookOpen className="w-3 h-3 text-brand" /> Reading
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onStatus?.(book.id, "Want to Read");
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
              >
                <Bookmark className="w-3 h-3 text-brand" /> Wishlist
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onFavorite?.(book.id);
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
              >
                <Heart className="w-3 h-3 text-brand" /> Favorite
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove?.(book.id);
                }}
                className="col-span-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 font-semibold text-red-700"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
              <Link
                href={`/book/${book.id}`}
                className="col-span-2 text-center py-1.5 rounded-lg bg-brand/10 text-brand font-bold hover:bg-brand/15"
              >
                Open book
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default StandingBook;
