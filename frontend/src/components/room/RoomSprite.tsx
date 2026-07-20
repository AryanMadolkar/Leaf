"use client";

import React from "react";
import RoomObject from "./RoomObject";
import { RoomTheme, assetPath } from "./types";

interface RoomSpriteProps {
  id: string;
  theme: RoomTheme;
  asset: string;
  label: string;
  onInteract: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function RoomSprite({ id, theme, asset, label, onInteract, className = "", style }: RoomSpriteProps) {
  return (
    <RoomObject id={id} onInteract={onInteract} label={label} className={className} style={style}>
      <img
        src={assetPath(theme, asset)}
        alt={label}
        draggable={false}
        className="w-full h-full object-contain select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
      />
    </RoomObject>
  );
}
