"use client";

import React, { use } from "react";
import { notFound } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import Header from "@/components/Header";
import Room from "@/components/room/Room";

export default function UserRoomPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { users, books, diaryLogs, currentUser } = useLeaf();

  const roomUser = users.find((u) => u.username === username);
  if (!roomUser) notFound();

  return (
    <main className="flex-1">
      <Header />
      <Room
        user={roomUser}
        books={books}
        logs={diaryLogs.filter((l) => l.userId === roomUser.id)}
        isOwner={roomUser.id === currentUser.id}
      />
    </main>
  );
}
