"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Book, ReadingLog, User } from "@/data/mockData";
import { RoomObjectId, RoomTheme } from "./types";
import { RoomMotionProvider } from "./RoomMotionContext";
import RoomHeader from "./RoomHeader";
import RoomItemStrip from "./RoomItemStrip";
import RoomSidebar from "./RoomSidebar";
import InteractivePanel from "./InteractivePanel";
import EditRoomOverlay from "./EditRoomOverlay";
import Bookshelf from "./Bookshelf";
import Chair from "./Chair";
import Desk from "./Desk";
import Window from "./Window";
import Cat from "./Cat";
import Plant from "./Plant";
import Lamp from "./Lamp";
import CoffeeMug from "./CoffeeMug";
import VinylPlayer from "./VinylPlayer";
import Globe from "./Globe";
import FishTank from "./FishTank";

interface RoomProps {
  user: User;
  books: Book[];
  logs: ReadingLog[];
  isOwner: boolean;
}

export default function Room(props: RoomProps) {
  return (
    <RoomMotionProvider>
      <RoomInner {...props} />
    </RoomMotionProvider>
  );
}

function RoomInner({ user, books, logs, isOwner }: RoomProps) {
  const [theme, setTheme] = useState<RoomTheme>("Cozy Cabin");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [activeObject, setActiveObject] = useState<RoomObjectId | null>(null);
  const [description, setDescription] = useState(
    "A quiet corner for stories that stay long after the last page."
  );

  const shelfBooks = books.slice(0, 40);
  const handleInteract = (id: string) => setActiveObject(id as RoomObjectId);

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5]">
      <RoomHeader
        username={user.username}
        isOwner={isOwner}
        theme={theme}
        setTheme={setTheme}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-10">
        {/* Main illustrated room panel — real painted background, sprites layered on top */}
        <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden shadow-xl border border-black/10">
          <img
            src="/room-assets/backgrounds/cozy-cabin.jpg"
            alt="Reading room"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />

          <motion.div
            animate={{ filter: isNight ? "brightness(0.5) saturate(0.8)" : "brightness(1)" }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Window hotspot — the window itself is baked into the background */}
            <div className="absolute left-[1%] top-[3%] w-[24%] h-[58%]">
              <Window onInteract={handleInteract} />
            </div>
            {/* Windowsill cat, sitting on the ledge inside the window frame */}
            <div className="absolute left-[4%] top-[44%] w-[9%]" style={{ aspectRatio: "141/178" }}>
              <Cat variant="windowsill" onInteract={handleInteract} />
            </div>

            {/* Globe on the left built-in shelf, upper level */}
            <div className="absolute left-[19%] top-[24%] w-[6%] z-10" style={{ aspectRatio: "96/100" }}>
              <Globe theme={theme} onInteract={handleInteract} />
            </div>
            {/* Small plant on the left built-in shelf, lower level */}
            <div className="absolute left-[21%] top-[47%] w-[4%] z-10" style={{ aspectRatio: "73/150" }}>
              <Plant theme={theme} onInteract={handleInteract} variant="small" seed={2} />
            </div>

            {/* Freestanding bookshelf, centered + grounded on the back wall */}
            <div className="absolute left-[39%] top-[27%] w-[22%]" style={{ aspectRatio: "200/213" }}>
              <Bookshelf books={shelfBooks} theme={theme} onInteract={handleInteract} />
            </div>

            {/* Fish tank + vinyl records dressing the right built-in shelf */}
            <div className="absolute left-[71%] top-[9%] w-[13%] z-10" style={{ aspectRatio: "161/98" }}>
              <FishTank theme={theme} onInteract={handleInteract} />
            </div>
            <div className="absolute left-[73%] top-[26%] w-[6%] z-10 opacity-95" style={{ aspectRatio: "145/97" }}>
              <img
                src="/room-assets/cozy-cabin/vinyl-records.png"
                alt=""
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
                style={{ filter: "drop-shadow(3px 4px 5px rgba(0,0,0,0.35))" }}
              />
            </div>

            {/* Floor lamp, standing beside the chair (not the window) */}
            <div className="absolute left-[11%] top-[68%] w-[7%] z-10" style={{ aspectRatio: "72/132" }}>
              <Lamp isNight={isNight} onToggleNight={() => setIsNight((v) => !v)} theme={theme} onInteract={handleInteract} />
            </div>

            {/* Reading chair + sleeping cat, front-left, grounded on the rug */}
            <div className="absolute left-[14%] top-[60%] w-[16%] z-20" style={{ aspectRatio: "168/213" }}>
              <Chair theme={theme} onInteract={handleInteract} />
            </div>
            <div className="absolute left-[34%] top-[77%] w-[14%] z-10" style={{ aspectRatio: "235/141" }}>
              <Cat variant="sleeping" onInteract={handleInteract} />
            </div>

            {/* Coffee mug beside the chair */}
            <div className="absolute left-[7%] top-[70%] w-[5%] z-20" style={{ aspectRatio: "118/92" }}>
              <CoffeeMug theme={theme} onInteract={handleInteract} />
            </div>

            {/* Desk + vinyl player + potted plant, right side near the door */}
            <div className="absolute left-[64%] top-[52%] w-[28%] z-10" style={{ aspectRatio: "249/213" }}>
              <Desk theme={theme} onInteract={handleInteract} />
            </div>
            <div className="absolute left-[65%] top-[55%] w-[13%] z-20" style={{ aspectRatio: "141/105" }}>
              <VinylPlayer theme={theme} onInteract={handleInteract} />
            </div>
            <div className="absolute left-[90%] top-[77%] w-[7%] z-20" style={{ aspectRatio: "134/141" }}>
              <Plant theme={theme} onInteract={handleInteract} variant="potted" seed={1} />
            </div>
          </motion.div>

          {/* unifying warm color-grade so independently-sourced sprites read as one scene */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.06]"
            style={{ background: "linear-gradient(135deg, #F4E2B8 0%, #D9A15C 55%, #8A5A34 100%)" }}
          />
        </div>

        {/* Explore items + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-6">
          <RoomItemStrip onSelect={handleInteract} />
          <RoomSidebar
            theme={theme}
            description={description}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onDescriptionChange={setDescription}
          />
        </div>
      </div>

      <AnimatePresence>
        {activeObject && (
          <InteractivePanel
            key={activeObject}
            objectId={activeObject}
            onClose={() => setActiveObject(null)}
            user={user}
            books={shelfBooks}
            logs={logs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditMode && (
          <EditRoomOverlay onSave={() => setIsEditMode(false)} onCancel={() => setIsEditMode(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
