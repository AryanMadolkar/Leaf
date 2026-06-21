import React from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
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

  const getGradient = (nameStr: string) => {
    // Elegant warm-toned gradients matching Leaf design language
    const colors = [
      "from-[#E6EBE4] to-[#C2CFBC] text-[#3A4F39]", // Sage Green
      "from-[#F5EBE6] to-[#E5D5C8] text-[#634E3C]", // Warm Peach Cream
      "from-[#EADCD6] to-[#D5C2BA] text-[#5A4339]", // Terracotta Sand
      "from-[#E3ECEB] to-[#C0D1D0] text-[#344F4E]", // Soft Teal
      "from-[#EAE5ED] to-[#D0C2D6] text-[#523A5E]", // Muted Lavender
    ];
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const isDeprecated = avatarUrl && avatarUrl.includes("photo-1534528741775-53994a69daeb");
  const hasAvatar = avatarUrl && avatarUrl !== "" && !isDeprecated;

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-cream-border flex items-center justify-center flex-shrink-0 select-none ${sizeClass} ${className}`}
      style={customStyle}
    >
      {hasAvatar ? (
        <img
          src={avatarUrl}
          alt={name || "User Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.classList.remove("hidden");
          }}
        />
      ) : null}
      
      <div 
        className={`${hasAvatar ? "hidden" : ""} w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient(name || "Reader")} font-serif font-bold ${fontSizeClass}`}
      >
        {name && name.trim() !== "" ? (
          <span className="tracking-wider">{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2 opacity-70" />
        )}
      </div>
    </div>
  );
}
