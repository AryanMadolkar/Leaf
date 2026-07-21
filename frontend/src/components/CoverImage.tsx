"use client";

import React, { useEffect, useState } from "react";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import {
  coverFallbackStyle,
  nextCoverFallback,
  resolveCoverUrl,
  type CoverSize,
} from "@/utils/covers";

type CoverImageProps = {
  src?: string | null;
  title: string;
  author?: string;
  isbn?: string | null;
  coverId?: number | string | null;
  bookId?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Thumbnail size for the cover proxy (default M = fast). */
  size?: CoverSize;
  /** Eager-load for above-the-fold / feed cards. */
  priority?: boolean;
};

/**
 * Book cover via same-origin `/api/covers` proxy (CDN-cached).
 * Retries ISBN / title when a mapped cover ID is dead.
 * Falls back to a typographic plate when no artwork exists.
 */
export default function CoverImage({
  src,
  title,
  author,
  isbn,
  coverId,
  bookId,
  alt,
  className = "",
  imgClassName = "w-full h-full object-cover",
  size = "M",
  priority = false,
}: CoverImageProps) {
  const resolvedCoverId = coverId || (bookId && COVER_ID_BY_ISBN[bookId]) || (isbn && COVER_ID_BY_ISBN[isbn]) || null;
  const resolved = resolveCoverUrl(src, {
    isbn: isbn || bookId,
    coverId: resolvedCoverId,
    bookId,
    size,
    title,
    author,
  });

  const [failed, setFailed] = useState(!resolved);
  const [currentSrc, setCurrentSrc] = useState(resolved);
  const seed = bookId || isbn || title;

  useEffect(() => {
    setCurrentSrc(resolved);
    setFailed(!resolved);
  }, [resolved]);

  const showFallback = failed || !currentSrc;

  return (
    <div className={`relative overflow-hidden bg-cream-dark ${className}`}>
      {!showFallback && (
        <img
          src={currentSrc}
          alt={alt || title}
          className={`${imgClassName} select-none`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => {
            const next = nextCoverFallback(currentSrc || "", {
              isbn: isbn || bookId,
              title,
              author,
              size,
            });
            if (next && next !== currentSrc) {
              setCurrentSrc(next);
              return;
            }
            setFailed(true);
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth < 40 || img.naturalHeight < 40) {
              const next = nextCoverFallback(currentSrc || "", {
                isbn: isbn || bookId,
                title,
                author,
                size,
              });
              if (next && next !== currentSrc) {
                setCurrentSrc(next);
                return;
              }
              setFailed(true);
            }
          }}
        />
      )}
      {showFallback && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-2.5 text-cream"
          style={coverFallbackStyle(seed)}
          aria-label={title}
        >
          <span className="text-[8px] uppercase tracking-wider font-semibold opacity-70 line-clamp-1">
            {author || "Unknown"}
          </span>
          <span className="font-serif text-[11px] font-bold leading-tight line-clamp-3 mt-0.5">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
