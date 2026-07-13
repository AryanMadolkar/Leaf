"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
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

const CARD_W = 224;
const CARD_EST_H = 280;
const GAP = 12;
/** Clear sticky Header (64) + Library toolbar (~52) */
const TOP_SAFE = 130;
const EDGE = 12;

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

function placeCard(rect: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceRight = vw - rect.right - EDGE;
  const spaceLeft = rect.left - EDGE;
  const preferRight = spaceRight >= CARD_W + GAP || spaceRight >= spaceLeft;

  let left = preferRight ? rect.right + GAP : rect.left - CARD_W - GAP;
  left = Math.max(EDGE, Math.min(left, vw - CARD_W - EDGE));

  // Prefer aligning near the top of the spine, then clamp into the viewport
  let top = rect.top;
  top = Math.max(TOP_SAFE, Math.min(top, vh - CARD_EST_H - EDGE));

  return { top, left };
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [palette, setPalette] = useState<SpinePalette>(() => paletteFromSeed(seed));
  const [hovered, setHovered] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const dims = useMemo(() => {
    const w = spineWidthFromPages(book.pages);
    const h = spineHeightFromSeed(seed, book.pages);
    return { w, h };
  }, [book.pages, seed]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useLayoutEffect(() => {
    if (!hovered || !rootRef.current) {
      setCardPos(null);
      return;
    }
    const update = () => {
      if (!rootRef.current) return;
      setCardPos(placeCard(rootRef.current.getBoundingClientRect()));
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hovered]);

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

  const card = hovered && cardPos && mounted
    ? createPortal(
        <div
          className="fixed z-[200] w-56 pointer-events-auto"
          style={{ top: cardPos.top, left: cardPos.left }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
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
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className="relative flex-shrink-0 z-0 hover:z-50"
      style={{ width: dims.w, height: dims.h }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0" {...dragHandleProps}>
        <Link
          href={`/book/${book.id}`}
          className="absolute inset-0 origin-bottom focus:outline-none cursor-pointer transition-transform duration-200 ease-out"
          style={{
            boxShadow: hovered
              ? "2px 8px 16px rgba(70,55,35,0.22), 0 2px 4px rgba(70,55,35,0.1)"
              : "1px 2px 5px rgba(70,55,35,0.16), 0 1px 2px rgba(70,55,35,0.08)",
            transform: hovered ? "translateY(-8px)" : "translateY(0)",
            zIndex: hovered ? 25 : 1,
          }}
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

      {card}
    </div>
  );
});

export default StandingBook;
