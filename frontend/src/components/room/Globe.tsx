"use client";

import React from "react";
import { motion } from "framer-motion";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion } from "./RoomMotionContext";

export default function Globe({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();
  return (
    <RoomObject id="globe" onInteract={onInteract} label="Books by country" className="w-full h-full">
      <motion.img
        src={assetPath(theme, "globe")}
        alt="Globe — books by country"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
        animate={reduced ? undefined : { rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </RoomObject>
  );
}
