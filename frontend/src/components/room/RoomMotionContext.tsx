"use client";

import React, { createContext, useContext } from "react";
import { useReducedMotion } from "framer-motion";

const RoomMotionContext = createContext<boolean>(false);

export function RoomMotionProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  return <RoomMotionContext.Provider value={!!prefersReducedMotion}>{children}</RoomMotionContext.Provider>;
}

export function useRoomReducedMotion() {
  return useContext(RoomMotionContext);
}

export function jitter(base: number, spread: number) {
  return base + Math.random() * spread;
}

// Deterministic pseudo-random in [0, 1), stable across server and client
// renders for a given seed — use this instead of Math.random() for any
// value computed during render (not inside an effect/timeout), otherwise
// SSR and hydration will disagree and React will flag a hydration error.
export function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
