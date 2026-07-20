"use client";

import React from "react";
import { motion } from "framer-motion";

interface EditRoomOverlayProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function EditRoomOverlay({ onSave, onCancel }: EditRoomOverlayProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-charcoal text-cream rounded-full shadow-2xl px-5 py-3 flex items-center gap-4"
    >
      <span className="text-sm">Drag furniture to rearrange your room</span>
      <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded-full border border-cream/30 hover:bg-cream/10 transition-colors">
        Cancel
      </button>
      <button onClick={onSave} className="text-sm px-3 py-1.5 rounded-full bg-brand hover:bg-brand-light transition-colors">
        Save
      </button>
    </motion.div>
  );
}
