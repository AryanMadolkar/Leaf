"use client";

import React from "react";
import { Library, Armchair, Coffee, Leaf, Waves, BookOpen, Globe2, Disc3, LampDesk } from "lucide-react";
import { RoomObjectId } from "./types";

interface RoomItemStripProps {
  onSelect: (id: RoomObjectId) => void;
}

const ITEMS: { id: RoomObjectId; label: string; icon: React.ReactNode }[] = [
  { id: "bookshelf", label: "Bookshelf", icon: <Library size={18} /> },
  { id: "chair", label: "Reading Chair", icon: <Armchair size={18} /> },
  { id: "coffeeMug", label: "Coffee Mug", icon: <Coffee size={18} /> },
  { id: "plant", label: "Plant", icon: <Leaf size={18} /> },
  { id: "fishTank", label: "Fish Tank", icon: <Waves size={18} /> },
  { id: "desk", label: "Desk", icon: <BookOpen size={18} /> },
  { id: "globe", label: "Globe", icon: <Globe2 size={18} /> },
  { id: "vinylPlayer", label: "Vinyl Player", icon: <Disc3 size={18} /> },
  { id: "lamp", label: "Lamp", icon: <LampDesk size={18} /> },
];

export default function RoomItemStrip({ onSelect }: RoomItemStripProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1C1C1A]">Explore room items</h2>
      <p className="text-sm text-[#7A7873] mb-3">Click on any item to learn more about the reader.</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="flex flex-col items-center justify-center gap-1.5 min-w-[84px] h-20 rounded-lg border border-[#E6E1D8] bg-white hover:bg-[#F3ECE2] hover:-translate-y-0.5 transition-all shrink-0"
          >
            <span className="text-[#2E4D38]">{item.icon}</span>
            <span className="text-[11px] text-[#7A7873]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
