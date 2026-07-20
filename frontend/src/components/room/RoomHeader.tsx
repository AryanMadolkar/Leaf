"use client";

import React, { useState } from "react";
import { Info, Pencil, Share2, MoreVertical, ChevronDown } from "lucide-react";
import { RoomTheme } from "./types";

interface RoomHeaderProps {
  username: string;
  isOwner: boolean;
  theme: RoomTheme;
  setTheme: (t: RoomTheme) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
}

const THEMES: RoomTheme[] = ["Cozy Cabin", "Modern Minimal", "Dark Academia"];

export default function RoomHeader({ username, isOwner, theme, setTheme, isEditMode, setIsEditMode }: RoomHeaderProps) {
  const [themeOpen, setThemeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-start justify-between px-4 sm:px-8 pt-6 pb-4 max-w-6xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl text-[#1C1C1A]">{username}&apos;s Reading Room</h1>
          <span title="A personal, illustrated space that reflects how you read.">
            <Info size={16} className="text-[#7A7873]" />
          </span>
        </div>
        <div className="relative mt-2">
          <button
            onClick={() => setThemeOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[#E6E1D8] bg-white text-[#1C1C1A] hover:bg-[#F3ECE2] transition-colors"
          >
            {theme} <ChevronDown size={13} />
          </button>
          {themeOpen && (
            <div className="absolute top-9 left-0 z-20 bg-white border border-[#E6E1D8] rounded-lg shadow-lg py-1 min-w-[160px]">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    setThemeOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#F3ECE2] transition-colors ${t === theme ? "text-[#2E4D38] font-medium" : "text-[#1C1C1A]"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-full border transition-colors ${isEditMode ? "bg-[#2E4D38] text-white border-[#2E4D38]" : "border-[#E6E1D8] bg-white text-[#1C1C1A] hover:bg-[#F3ECE2]"}`}
          >
            <Pencil size={14} /> {isEditMode ? "Editing…" : "Edit Room"}
          </button>
          <button className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-full border border-[#E6E1D8] bg-white text-[#1C1C1A] hover:bg-[#F3ECE2] transition-colors">
            <Share2 size={14} /> Share Room
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full border border-[#E6E1D8] bg-white text-[#1C1C1A] hover:bg-[#F3ECE2] transition-colors"
              aria-label="More options"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 bg-white border border-[#E6E1D8] rounded-lg shadow-lg py-1 min-w-[140px]">
                <button className="w-full text-left px-3 py-1.5 text-sm text-[#1C1C1A] hover:bg-[#F3ECE2] transition-colors">Reset Layout</button>
                <button className="w-full text-left px-3 py-1.5 text-sm text-[#1C1C1A] hover:bg-[#F3ECE2] transition-colors">Room Settings</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
