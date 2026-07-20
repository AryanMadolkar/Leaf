"use client";

import React from "react";
import RoomSprite from "./RoomSprite";
import { RoomTheme } from "./types";

export default function Desk({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  return (
    <RoomSprite
      id="desk"
      theme={theme}
      asset="desk"
      label="Notes & Diary"
      onInteract={onInteract}
      className="w-full h-full"
    />
  );
}
