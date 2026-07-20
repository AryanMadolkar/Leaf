"use client";

import React from "react";
import RoomObject from "./RoomObject";

// The window is baked into the room-shell background image itself (see
// room-assets/backgrounds). This renders only an invisible hotspot over its
// on-screen position so it stays clickable without a duplicate window asset.
export default function Window({ onInteract }: { onInteract: (id: string) => void }) {
  return (
    <RoomObject id="window" onInteract={onInteract} label="Weather & time" className="w-full h-full" />
  );
}
