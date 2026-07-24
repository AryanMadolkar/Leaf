"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Flame, UserCheck, UserPlus } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { authFetch } from "@/utils/auth/client";

export type Reader = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  topGenre: string;
  streak: number;
  isFollowing: boolean;
};

interface ReaderCardProps {
  reader: Reader;
  /** Hide the follow button (e.g. viewing your own suggestions while logged out). */
  showFollow?: boolean;
}

export default function ReaderCard({ reader, showFollow = true }: ReaderCardProps) {
  const [isFollowing, setIsFollowing] = useState(reader.isFollowing);
  const [pending, setPending] = useState(false);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const res = await authFetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: reader.id }),
      });
      if (!res.ok) throw new Error("Follow request failed");
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setIsFollowing(!next);
    } finally {
      setPending(false);
    }
  };

  return (
    <Link
      href={`/profile/${reader.username}`}
      className="snap-start flex-shrink-0 w-40 flex flex-col items-center text-center gap-3 p-4 bg-cream-card border border-cream-border rounded-2xl shadow-sm hover:border-brand-muted/50 hover:shadow-md transition-all group"
    >
      <UserAvatar avatarUrl={reader.avatar} name={reader.name} size={56} className="shadow-sm" />

      <div className="min-w-0 w-full space-y-0.5">
        <p className="text-xs font-bold text-charcoal truncate group-hover:text-brand transition-colors">
          {reader.name}
        </p>
        <p className="text-[10px] text-charcoal-muted truncate">@{reader.username}</p>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px]">
        <span className="px-2 py-0.5 bg-cream border border-cream-border rounded-full font-semibold text-charcoal-muted truncate max-w-[80px]">
          {reader.topGenre}
        </span>
        {reader.streak > 0 && (
          <span className="flex items-center gap-0.5 px-2 py-0.5 bg-brand/10 border border-brand/20 rounded-full font-bold text-brand">
            <Flame className="w-3 h-3 fill-brand/20" />
            {reader.streak}
          </span>
        )}
      </div>

      {showFollow && (
        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={pending}
          className={`w-full h-7 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-60 ${
            isFollowing
              ? "bg-cream-dark border border-cream-border text-charcoal"
              : "bg-brand text-cream hover:bg-brand-light"
          }`}
        >
          {isFollowing ? (
            <>
              <UserCheck className="w-3 h-3" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="w-3 h-3" />
              Follow
            </>
          )}
        </button>
      )}
    </Link>
  );
}
