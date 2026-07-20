"use client";

import React from "react";
import { motion } from "framer-motion";
import { Book } from "@/data/mockData";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion } from "./RoomMotionContext";

interface BookshelfProps {
  books: Book[];
  theme: RoomTheme;
  onInteract: (id: string) => void;
}

const SPINE_COLORS = ["#7C8F63", "#B0553C", "#4A6B8A", "#C79A3C", "#8A4A63", "#4A7C6E", "#A65C3C"];

export default function Bookshelf({ books, theme, onInteract }: BookshelfProps) {
  const reduced = useRoomReducedMotion();

  return (
    <motion.div
      whileHover={{ scale: reduced ? 1 : 1.03, filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.35))" }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }}
      className="relative cursor-pointer"
      onClick={() => onInteract("bookshelf")}
    >
      <img
        src={assetPath(theme, "bookshelf")}
        alt="Bookshelf — view library"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.35))" }}
      />
      {/* books sit inside the shelf cavities, roughly the middle 70% band */}
      <div className="absolute left-[10%] right-[8%] top-[30%] bottom-[16%] flex flex-col justify-between">
        {[0, 1, 2].map((shelfIdx) => (
          <div key={shelfIdx} className="flex items-end gap-[2px]">
            {Array.from({ length: 9 }).map((_, i) => {
              const book = books[(shelfIdx * 9 + i) % Math.max(books.length, 1)];
              const color = SPINE_COLORS[(shelfIdx * 9 + i) % SPINE_COLORS.length];
              const height = 14 + ((shelfIdx * 7 + i * 13) % 8);
              return (
                <motion.div
                  key={i}
                  role="button"
                  title={book?.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInteract("bookshelf");
                  }}
                  whileHover={reduced ? undefined : { scale: 1.2, y: -2 }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 18 }}
                  className="rounded-t-[1px] cursor-pointer origin-bottom"
                  style={{ width: 3, height: `${height}%`, background: books.length ? color : "transparent" }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
