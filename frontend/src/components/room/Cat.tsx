"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RoomObject from "./RoomObject";
import { useRoomReducedMotion } from "./RoomMotionContext";

interface CatProps {
  variant: "sleeping" | "windowsill";
  onInteract: (id: string) => void;
}

type WindowsillPose = "idle" | "lookRight" | "stretch";
type RugPose = "curlup" | "sleeping" | "stretch" | "playing";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const CAT_ASSET: Record<WindowsillPose | RugPose, string> = {
  idle: "/room-assets/cats/windowsill-lookleft.png",
  lookRight: "/room-assets/cats/windowsill-lookright.png",
  stretch: "/room-assets/cats/windowsill-stretch.png",
  curlup: "/room-assets/cats/rug-curlup.png",
  sleeping: "/room-assets/cats/rug-sleeping.png",
  playing: "/room-assets/cats/rug-playing.png",
};

function CatFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.img
      key={src}
      src={src}
      alt={alt}
      draggable={false}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
      style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
    />
  );
}

export default function Cat({ variant, onInteract }: CatProps) {
  if (variant === "windowsill") return <WindowsillCat onInteract={onInteract} />;
  return <RugCat onInteract={onInteract} />;
}

function WindowsillCat({ onInteract }: { onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();
  const [pose, setPose] = useState<WindowsillPose>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStretchRef = useRef(0);

  useEffect(() => {
    if (reduced) return;

    const scheduleNext = () => {
      const now = Date.now();
      const canStretch = now - lastStretchRef.current > 30000;
      const roll = Math.random();

      let next: WindowsillPose = "lookRight";
      let holdMs = 1200;
      let delayMs = rand(6000, 10000);

      if (canStretch && roll < 0.15) {
        next = "stretch";
        holdMs = 1500;
        lastStretchRef.current = now;
        delayMs = rand(30000, 60000);
      }

      setPose(next);
      timeoutRef.current = setTimeout(() => {
        setPose("idle");
        timeoutRef.current = setTimeout(scheduleNext, delayMs);
      }, holdMs);
    };

    timeoutRef.current = setTimeout(scheduleNext, rand(4000, 8000));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reduced]);

  return (
    <RoomObject id="cat" onInteract={onInteract} label="Cat on the windowsill" className="w-full h-full">
      <AnimatePresence mode="wait">
        <CatFrame key={pose} src={CAT_ASSET[pose]} alt="Cat on the windowsill" />
      </AnimatePresence>
    </RoomObject>
  );
}

function RugCat({ onInteract }: { onInteract: (id: string) => void }) {
  const reduced = useRoomReducedMotion();
  const [pose, setPose] = useState<RugPose>("curlup");
  const [purring, setPurring] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBigMoveRef = useRef(0);

  useEffect(() => {
    if (reduced) return;

    const scheduleNext = () => {
      const now = Date.now();
      const canBigMove = now - lastBigMoveRef.current > 45000;
      const roll = Math.random();

      if (canBigMove && roll < 0.08) {
        lastBigMoveRef.current = now;
        setPose("stretch");
        timeoutRef.current = setTimeout(() => {
          setPose("playing");
          timeoutRef.current = setTimeout(() => {
            setPose("curlup");
            timeoutRef.current = setTimeout(scheduleNext, rand(45000, 90000));
          }, 2200);
        }, 1300);
        return;
      }

      // breathing crossfade between the two sleeping frames
      setPose((p) => (p === "curlup" ? "sleeping" : "curlup"));
      timeoutRef.current = setTimeout(scheduleNext, rand(2600, 3400));
    };

    timeoutRef.current = setTimeout(scheduleNext, rand(2600, 3400));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reduced]);

  const handleClick = (id: string) => {
    onInteract(id);
    setPurring(true);
    setTimeout(() => setPurring(false), 1400);
  };

  return (
    <div className="relative w-full h-full">
      <RoomObject id="cat" onInteract={handleClick} label="Sleeping cat on the rug" className="w-full h-full">
        <motion.div
          className="absolute inset-0"
          animate={reduced ? undefined : purring ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <CatFrame key={pose} src={CAT_ASSET[pose]} alt="Sleeping cat on the rug" />
          </AnimatePresence>
        </motion.div>
      </RoomObject>

      <AnimatePresence>
        {purring && (
          <motion.span
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -34 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-pink-400 text-sm pointer-events-none select-none"
          >
            ♪
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
