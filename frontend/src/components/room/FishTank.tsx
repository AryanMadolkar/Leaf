"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion, seededRandom } from "./RoomMotionContext";

export default function FishTank({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();
  const fish = useMemo(
    () => [
      { duration: 7.5 + seededRandom(11) * 2, delay: 0, top: "42%" },
      { duration: 10 + seededRandom(12) * 2.5, delay: 1.4, top: "58%" },
    ],
    []
  );

  return (
    <RoomObject id="fishTank" onInteract={onInteract} label="Calm mode" className="w-full h-full">
      <img
        src={assetPath(theme, "fish-tank")}
        alt="Fish tank"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
      />
      {fish.map((f, i) => (
        <motion.img
          key={i}
          src={assetPath(theme, "goldfish")}
          alt=""
          draggable={false}
          className="absolute w-6 h-4 object-contain select-none pointer-events-none"
          style={{ top: f.top, left: "20%" }}
          animate={reduced ? undefined : { left: ["20%", "62%", "20%"], scaleX: [1, 1, -1, -1, 1] }}
          transition={{ duration: f.duration, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
        />
      ))}
    </RoomObject>
  );
}
