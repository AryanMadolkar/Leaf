"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";

export default function ProfileRedirect() {
  const { session, profile } = useLeaf();
  const router = useRouter();

  useEffect(() => {
    if (profile?.username) {
      router.replace(`/profile/${profile.username}`);
    } else if (session === null) {
      router.replace("/auth");
    }
  }, [profile, session, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-brand" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
