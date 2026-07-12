import React from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
}

/** Deterministic Dylan avatar from DiceBear, seeded by display name. */
export function getDiceBearAvatarUrl(name: string) {
  const seed = encodeURIComponent(name.trim() || "Reader");
  return `https://api.dicebear.com/10.x/dylan/svg?seed=${seed}`;
}

export default function UserAvatar({ avatarUrl, name, size = "md", className = "" }: UserAvatarProps) {
  let sizeClass = "w-8 h-8";
  let fontSizeClass = "text-xs";
  
  if (size === "xs") {
    sizeClass = "w-6 h-6";
    fontSizeClass = "text-[9px]";
  } else if (size === "sm") {
    sizeClass = "w-8 h-8";
    fontSizeClass = "text-[11px]";
  } else if (size === "md") {
    sizeClass = "w-10 h-10";
    fontSizeClass = "text-xs";
  } else if (size === "lg") {
    sizeClass = "w-12 h-12";
    fontSizeClass = "text-sm";
  } else if (size === "xl") {
    sizeClass = "w-24 h-24 md:w-32 md:h-32";
    fontSizeClass = "text-2xl md:text-3xl";
  } else if (typeof size === "number") {
    if (size < 28) fontSizeClass = "text-[9px]";
    else if (size < 36) fontSizeClass = "text-[11px]";
    else if (size < 48) fontSizeClass = "text-xs";
    else if (size < 80) fontSizeClass = "text-sm";
    else fontSizeClass = "text-2xl";
  }
  
  const customStyle = typeof size === "number" ? { width: size, height: size } : {};

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "";
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isDeprecated = avatarUrl && avatarUrl.includes("photo-1534528741775-53994a69daeb");
  const hasCustomAvatar = Boolean(avatarUrl && avatarUrl !== "" && !isDeprecated);
  const displayName = name?.trim() || "";
  const src = hasCustomAvatar ? avatarUrl! : displayName ? getDiceBearAvatarUrl(displayName) : "";
  const showImage = Boolean(src);

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-cream-border flex items-center justify-center flex-shrink-0 select-none ${sizeClass} ${className}`}
      style={customStyle}
    >
      {showImage ? (
        <img
          src={src}
          alt={displayName || "User Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.classList.remove("hidden");
          }}
        />
      ) : null}
      
      <div 
        className={`${showImage ? "hidden" : ""} w-full h-full flex items-center justify-center bg-sage/15 text-forest font-serif font-bold ${fontSizeClass}`}
      >
        {displayName ? (
          <span className="tracking-wider">{getInitials(displayName)}</span>
        ) : (
          <User className="w-1/2 h-1/2 opacity-70" />
        )}
      </div>
    </div>
  );
}
