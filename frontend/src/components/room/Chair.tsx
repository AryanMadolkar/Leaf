"use client";

import React from "react";
import RoomSprite from "./RoomSprite";
import { RoomTheme } from "./types";

export default function Chair({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  return (
    <RoomSprite
      id="chair"
      theme={theme}
      asset="reading-chair"
      label="Currently Reading"
      onInteract={onInteract}
      className="w-full h-full"
    />
  );
}
