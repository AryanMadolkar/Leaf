"use client";

import React from "react";
import { RoomTheme } from "./types";

const TAGS: Record<RoomTheme, string[]> = {
  "Cozy Cabin": ["Flow Style", "Books", "Coffee", "Rain"],
  "Modern Minimal": ["Minimal", "Books", "Quiet", "Light"],
  "Dark Academia": ["Dark Academia", "Books", "Candlelight", "Vintage"],
};

interface RoomSidebarProps {
  theme: RoomTheme;
  description: string;
  isOwner: boolean;
  isEditMode: boolean;
  onDescriptionChange: (value: string) => void;
}

export default function RoomSidebar({ theme, description, isOwner, isEditMode, onDescriptionChange }: RoomSidebarProps) {
  const editable = isOwner && isEditMode;

  return (
    <div className="rounded-2xl border border-[#E6E1D8] bg-white p-5 h-full flex flex-col">
      <h3 className="text-base font-semibold text-[#1C1C1A] mb-2">About this room</h3>
      {editable ? (
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={220}
          rows={3}
          placeholder="Describe your reading room…"
          className="text-sm text-[#1C1C1A] leading-relaxed border border-[#E6E1D8] rounded-lg p-2 resize-none focus:outline-none focus:border-[#2E4D38]"
        />
      ) : (
        <p className="text-sm text-[#7A7873] leading-relaxed">{description}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {TAGS[theme].map((tag) => (
          <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-[#F3ECE2] border border-[#E6E1D8] text-[#7A7873]">
            {tag}
          </span>
        ))}
      </div>
      <blockquote className="mt-4 pt-6 text-sm italic text-[#7A7873] border-t border-[#E6E1D8]">
        &ldquo;A reader lives a thousand lives before he dies.&rdquo;
        <footer className="not-italic text-xs mt-1 text-[#7A7873]/80">— George R.R. Martin</footer>
      </blockquote>
    </div>
  );
}
