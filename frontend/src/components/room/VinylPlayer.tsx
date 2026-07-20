"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion } from "./RoomMotionContext";

export default function VinylPlayer({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();
  const [playing, setPlaying] = useState(false);

  return (
    <RoomObject
      id="vinylPlayer"
      onInteract={(id) => {
        setPlaying((v) => !v);
        onInteract(id);
      }}
      label={playing ? "Pause reading playlist" : "Play reading playlist"}
      className="w-full h-full"
    >
      <img
        src={assetPath(theme, "vinyl-player")}
        alt="Vinyl player — reading playlist"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
      />
      {playing && !reduced && (
        <motion.div
          className="absolute left-[38%] top-[30%] w-3 h-3 rounded-full bg-black/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      )}
      {playing && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2E4D38]" />}
    </RoomObject>
  );
}
