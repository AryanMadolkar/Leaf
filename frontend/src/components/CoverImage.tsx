"use client";

import React, { useState } from "react";
import { coverFallbackStyle, resolveCoverUrl } from "@/utils/covers";

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
};

/**
 * Book cover with Open Library blank-GIF detection and typographic fallback.
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
}: CoverImageProps) {
  const resolved = resolveCoverUrl(src, { isbn, coverId, bookId });
  const [failed, setFailed] = useState(!resolved);
  const seed = bookId || isbn || title;

  const showFallback = failed || !resolved;

  return (
    <div className={`relative overflow-hidden bg-cream-dark ${className}`}>
      {!showFallback && (
        <img
          src={resolved}
          alt={alt || title}
          className={`${imgClassName} select-none`}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            // Open Library blank placeholders are tiny (~1×1 / few dozen bytes)
            if (img.naturalWidth < 40 || img.naturalHeight < 40) {
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
