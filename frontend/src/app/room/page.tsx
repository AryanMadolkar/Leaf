"use client";

import React from "react";
import Header from "@/components/Header";
import { BookOpen } from "lucide-react";

export default function MyRoomPage() {
  return (
    <main className="flex-1 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-64px)] px-4 text-center">
        <BookOpen size={40} className="text-[#2E4D38]" />
        <h1 className="font-serif text-3xl text-[#1C1C1A]">Reading Room — Coming Soon</h1>
        <p className="text-[#7A7873] max-w-md">
          We're still furnishing this space. Check back soon for your own illustrated reading room.
        </p>
      </div>
    </main>
  );
}
