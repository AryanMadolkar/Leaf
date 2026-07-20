"use client";

import React, { use } from "react";
import { notFound } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import Header from "@/components/Header";
import { BookOpen } from "lucide-react";

export default function UserRoomPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { users } = useLeaf();

  const roomUser = users.find((u) => u.username === username);
  if (!roomUser) notFound();

  return (
    <main className="flex-1 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-64px)] px-4 text-center">
        <BookOpen size={40} className="text-[#2E4D38]" />
        <h1 className="font-serif text-3xl text-[#1C1C1A]">{roomUser.name}&apos;s Reading Room — Coming Soon</h1>
        <p className="text-[#7A7873] max-w-md">
          We're still furnishing this space. Check back soon.
        </p>
      </div>
    </main>
  );
}
