"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";
import { useRoomReducedMotion } from "./RoomMotionContext";

export default function Lamp({ isNight, onToggleNight, theme, onInteract }: { isNight: boolean; onToggleNight: () => void; theme: RoomTheme; onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();

  return (
    <RoomObject
      id="lamp"
      onInteract={(id) => {
        onToggleNight();
        onInteract(id);
      }}
      label="Toggle day/night"
      className="w-full h-full"
    >
      <img
        src={assetPath(theme, "floor-lamp")}
        alt="Floor lamp"
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
      />
      <AnimatePresence>
        {isNight && (
          <motion.div
            key="glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: reduced ? 0.45 : [0.3, 0.5, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, repeat: reduced ? 0 : Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-[18%] -translate-x-1/2 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(244,235,208,0.9) 0%, rgba(244,235,208,0) 70%)" }}
          />
        )}
      </AnimatePresence>
    </RoomObject>
  );
}
