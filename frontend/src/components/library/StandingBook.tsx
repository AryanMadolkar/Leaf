"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CoverImage from "@/components/CoverImage";
import type { Book } from "@/data/mockData";
import {
  extractSpinePaletteFromCover,
  paletteFromSeed,
  ribbonForBook,
  spineHeightFromSeed,
  spineTiltFromSeed,
  spineWidthFromPages,
  statusStripColor,
  type ReadingStatus,
  type SpinePalette,
} from "./spineUtils";
import { Heart, BookOpen, Bookmark, Star, FolderInput, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type StandingBookProps = {
  book: Book;
  editable?: boolean;
  status?: ReadingStatus;
  isFavorite?: boolean;
  index?: number;
  onStatus?: (status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite?: () => void;
  onMove?: () => void;
  onRemove?: () => void;
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

export default function StandingBook({
  book,
  editable,
  status,
  isFavorite,
  index = 0,
  onStatus,
  onFavorite,
  onMove,
  onRemove,
  dragHandleProps,
}: StandingBookProps) {
  const router = useRouter();
  const seed = `${book.id}:${book.title}`;
  const [palette, setPalette] = useState<SpinePalette>(() => paletteFromSeed(seed));
  const [hovered, setHovered] = useState(false);

  const dims = useMemo(() => {
    const w = spineWidthFromPages(book.pages);
    const h = spineHeightFromSeed(seed);
    const tilt = spineTiltFromSeed(seed);
    return { w, h, tilt };
  }, [book.pages, seed]);

  useEffect(() => {
    let cancelled = false;
    extractSpinePaletteFromCover(book.coverImage || "", seed).then((p) => {
      if (!cancelled) setPalette(p);
    });
    return () => {
      cancelled = true;
    };
  }, [book.coverImage, seed]);

  const ribbon = ribbonForBook({ status, isFavorite });
  const strip = statusStripColor(status);

  const titleSize =
    book.title.length > 42 ? 8 : book.title.length > 28 ? 9 : book.title.length > 18 ? 10 : 11;
  const authorShort = (book.author || "").split(",")[0].trim();

  const handleClick = (e: React.MouseEvent) => {
    // Ignore if this was primarily a drag
    if ((e.target as HTMLElement).closest("[data-dragging='true']")) return;
    router.push(`/book/${book.id}`);
  };

  return (
    <motion.div
      className="relative flex-shrink-0"
      style={{ width: dims.w, height: dims.h }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.6), ease: "easeOut" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0" {...dragHandleProps}>
      {/* Spine */}
      <button
        type="button"
        onClick={handleClick}
        className="absolute inset-0 origin-bottom focus:outline-none cursor-pointer"
        style={{
          transform: hovered
            ? `translateY(-10px) rotate(${dims.tilt + (dims.tilt >= 0 ? 10 : -10)}deg) scaleX(1.08)`
            : `translateY(0) rotate(${dims.tilt}deg)`,
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease",
          boxShadow: hovered
            ? "4px 12px 20px rgba(0,0,0,0.35)"
            : "1px 3px 6px rgba(0,0,0,0.28)",
          zIndex: hovered ? 25 : 1,
        }}
        title={book.title}
        aria-label={`${book.title} by ${book.author}`}
      >
        <div
          className="relative w-full h-full overflow-hidden rounded-[1px]"
          style={{
            background: `linear-gradient(90deg, ${palette.bgDeep} 0%, ${palette.bg} 18%, ${palette.bg} 82%, ${palette.bgDeep} 100%)`,
          }}
        >
          {/* Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-70 mix-blend-overlay"
            style={{ backgroundImage: textureOverlay(palette.texture) }}
          />

          {/* Left page edge / binding bevel */}
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-r from-black/35 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-l from-black/25 to-transparent" />

          {/* Top & bottom gilt lines */}
          <div
            className="absolute left-[15%] right-[15%] top-[10%] h-px opacity-70"
            style={{ background: palette.foil ? palette.accent : `${palette.text}55` }}
          />
          <div
            className="absolute left-[15%] right-[15%] bottom-[14%] h-px opacity-70"
            style={{ background: palette.foil ? palette.accent : `${palette.text}55` }}
          />

          {/* Vertical title */}
          <div className="absolute inset-0 flex items-center justify-center px-[2px] py-5 overflow-hidden">
            <span
              className="font-serif font-bold tracking-wide whitespace-nowrap max-h-full"
              style={{
                color: palette.foil ? palette.accent : palette.text,
                fontSize: titleSize,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                textShadow: palette.foil ? `0 0 1px ${palette.accent}` : "0 1px 0 rgba(0,0,0,0.25)",
                letterSpacing: "0.04em",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {book.title}
            </span>
          </div>

          {/* Author mark near bottom (only if spine is wide enough) */}
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

          {/* Tiny publisher mark */}
          {dims.w >= 30 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-[6%] w-1.5 h-1.5 rounded-full opacity-60"
              style={{ background: palette.accent }}
            />
          )}

          {/* Status strip at bottom */}
          {strip !== "transparent" && (
            <div
              className="absolute inset-x-0 bottom-0 h-[3px]"
              style={{ background: strip }}
            />
          )}

          {/* Paper edge suggestion on right */}
          <div className="absolute inset-y-[4%] right-0 w-[1px] bg-gradient-to-b from-[#f5ecd8]/40 via-[#e8dcc4]/70 to-[#f5ecd8]/40" />
        </div>

        {/* Bookmark ribbon */}
        {ribbon && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-[5px] h-5 rounded-b-[1px] shadow-sm pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${ribbon.color}, ${ribbon.color}cc)`,
              clipPath: "polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)",
            }}
            aria-hidden
          />
        )}
      </button>

      {/* Hover preview card */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+14px)] z-40 w-56 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-cream border border-cream-border rounded-xl shadow-2xl overflow-hidden">
              <div className="flex gap-3 p-3">
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  author={book.author}
                  bookId={book.id}
                  className="w-14 h-20 rounded shadow-sm flex-shrink-0"
                  imgClassName="w-full h-full object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-serif text-xs font-bold text-charcoal leading-snug line-clamp-2">
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
              {book.description && (
                <p className="px-3 pb-2 text-[10px] text-charcoal-muted leading-relaxed line-clamp-3">
                  {book.description}
                </p>
              )}
              {editable && (
                <div className="border-t border-cream-border/70 p-1.5 grid grid-cols-2 gap-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onStatus?.("Finished")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
                  >
                    <Star className="w-3 h-3 text-brand" /> Read
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus?.("Currently Reading")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
                  >
                    <BookOpen className="w-3 h-3 text-brand" /> Reading
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus?.("Want to Read")}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
                  >
                    <Bookmark className="w-3 h-3 text-brand" /> Wishlist
                  </button>
                  <button
                    type="button"
                    onClick={onFavorite}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
                  >
                    <Heart className="w-3 h-3 text-brand" /> Favorite
                  </button>
                  <button
                    type="button"
                    onClick={onMove}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-cream-dark/50 font-semibold text-charcoal"
                  >
                    <FolderInput className="w-3 h-3 text-brand" /> Move
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 font-semibold text-red-700"
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
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
