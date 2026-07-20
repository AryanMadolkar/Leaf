"use client";

import React from "react";
import RoomSprite from "./RoomSprite";
import { RoomTheme } from "./types";

export default function CoffeeMug({ theme, onInteract }: { theme: RoomTheme; onInteract: (id: string) => void }) {
  return (
    <RoomSprite
      id="coffeeMug"
      theme={theme}
      asset="coffee-mug"
      label="Reading habits"
      onInteract={onInteract}
      className="w-full h-full"
    />
  );
}
