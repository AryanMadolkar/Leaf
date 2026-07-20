"use client";

import React from "react";
import { useLeaf } from "@/context/LeafContext";
import Header from "@/components/Header";
import Room from "@/components/room/Room";

export default function MyRoomPage() {
  const { currentUser, books, diaryLogs } = useLeaf();

  return (
    <main className="flex-1">
      <Header />
      <Room
        user={currentUser}
        books={books}
        logs={diaryLogs.filter((l) => l.userId === currentUser.id)}
        isOwner
      />
    </main>
  );
}
