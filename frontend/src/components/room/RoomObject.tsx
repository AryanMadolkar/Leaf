"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRoomReducedMotion } from "./RoomMotionContext";

interface RoomObjectProps {
  id: string;
  onInteract: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  label?: string;
}

export default function RoomObject({ id, onInteract, className = "", style, children, label }: RoomObjectProps) {
  const reduced = useRoomReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => onInteract(id)}
      whileHover={{
        scale: reduced ? 1 : 1.045,
        filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.25))",
      }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }}
      className={`relative cursor-pointer outline-none ${className}`}
      style={style}
      aria-label={label ?? id}
    >
      {children}
    </motion.button>
  );
}
