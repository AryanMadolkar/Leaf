"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Book, ReadingLog, User } from "@/data/mockData";
import BookCard from "@/components/BookCard";
import { RoomObjectId } from "./types";
import { useRoomReducedMotion } from "./RoomMotionContext";

interface InteractivePanelProps {
  objectId: RoomObjectId;
  onClose: () => void;
  user: User;
  books: Book[];
  logs: ReadingLog[];
}

const TITLES: Record<RoomObjectId, string> = {
  bookshelf: "Library",
  chair: "Currently Reading",
  desk: "Notes & Diary",
  coffeeMug: "Reading Habits",
  plant: "Reading Streak",
  window: "Weather & Time",
  lamp: "Day / Night",
  vinylPlayer: "Reading Playlist",
  globe: "Books by Country",
  fishTank: "Calm Mode",
  cat: "",
};

export default function InteractivePanel({ objectId, onClose, user, books, logs }: InteractivePanelProps) {
  const reduced = useRoomReducedMotion();
  if (objectId === "cat") return null;

  const currentlyReading = logs
    .filter((l) => l.status === "Currently Reading")
    .map((l) => books.find((b) => b.id === l.bookId))
    .filter(Boolean) as Book[];

  return (
    <motion.div
      initial={{ x: reduced ? 0 : 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: reduced ? 0 : 360, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed top-16 right-0 bottom-0 w-full max-w-sm bg-white border-l border-[#E6E1D8] shadow-2xl z-40 flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E1D8]">
        <h3 className="text-lg font-semibold text-[#1C1C1A]">{TITLES[objectId]}</h3>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F3ECE2] transition-colors" aria-label="Close panel">
          <X size={18} className="text-[#1C1C1A]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {objectId === "bookshelf" && (
          <div className="grid grid-cols-3 gap-4">
            {books.length === 0 && <p className="text-sm text-[#7A7873] col-span-3">No books on the shelf yet.</p>}
            {books.map((b) => (
              <BookCard key={b.id} book={b} size="sm" />
            ))}
          </div>
        )}

        {objectId === "chair" && (
          <div className="flex flex-col gap-4">
            {currentlyReading.length === 0 && (
              <p className="text-sm text-[#7A7873]">{user.name} isn't reading anything right now.</p>
            )}
            {currentlyReading.map((b) => (
              <div key={b.id} className="flex gap-3 items-center">
                <BookCard book={b} size="sm" />
                <div>
                  <p className="font-medium text-sm text-[#1C1C1A]">{b.title}</p>
                  <p className="text-xs text-[#7A7873]">{b.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {objectId !== "bookshelf" && objectId !== "chair" && (
          <p className="text-sm text-[#7A7873]">Coming soon — this corner of the room is still being furnished.</p>
        )}
      </div>
    </motion.div>
  );
}
