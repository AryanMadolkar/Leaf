"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion, seededRandom } from "./RoomMotionContext";

type PlantVariant = "hanging" | "potted" | "small";

export default function Plant({
  theme,
  onInteract,
  variant = "potted",
  seed = 0,
}: {
  theme: RoomTheme;
  onInteract: (id: string) => void;
  variant?: PlantVariant;
  seed?: number;
}) {
  const reduced = useRoomReducedMotion();
  const asset = variant === "hanging" ? "hanging-plant" : variant === "small" ? "small-plant" : "potted-plant";
  const { duration, delay } = useMemo(
    () => ({ duration: 3.5 + seededRandom(seed + 1) * 1.5, delay: seededRandom(seed + 2) * 2 }),
    [seed]
  );

  return (
    <RoomObject id="plant" onInteract={onInteract} label="Reading streak" className="w-full h-full">
      <motion.img
        src={assetPath(theme, asset)}
        alt="Plant — reading streak"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))", transformOrigin: "50% 90%" }}
        animate={reduced ? undefined : { rotate: [-2.5, 2.5, -2.5] }}
        transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
      />
    </RoomObject>
  );
}
