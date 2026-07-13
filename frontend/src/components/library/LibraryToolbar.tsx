"use client";

import React, { useState, startTransition } from "react";
import {
  Plus,
  Share2,
  LayoutGrid,
  Columns3,
  List,
  Search,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import { SHELF_THEMES, type ShelfThemeId } from "./shelfThemes";
import type { LibraryViewMode } from "@/utils/library";

export type SortMode = "custom" | "title" | "author" | "pages" | "year";
export type StatusFilter = "all" | "Want to Read" | "Currently Reading" | "Finished" | "Favorite";

type LibraryToolbarProps = {
  sortMode: SortMode;
  statusFilter: StatusFilter;
  search: string;
  viewMode: LibraryViewMode;
  theme: ShelfThemeId;
  filtersActive: boolean;
  reorderDisabled: boolean;
  visibleCount: number;
  totalCount: number;
  onAdd: () => void;
  onShare: () => void;
  onSortMode: (mode: SortMode) => void;
  onStatusFilter: (filter: StatusFilter) => void;
  onSearch: (value: string) => void;
  onClearFilters: () => void;
  onViewMode: (mode: LibraryViewMode) => void;
  onTheme: (theme: ShelfThemeId) => void;
};

function Dropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-48 p-1 bg-cream border border-cream-border rounded-xl shadow-xl">
        {children}
      </div>
    </>
  );
}

export default function LibraryToolbar({
  sortMode,
  statusFilter,
  search,
  viewMode,
  theme,
  filtersActive,
  reorderDisabled,
  visibleCount,
  totalCount,
  onAdd,
  onShare,
  onSortMode,
  onStatusFilter,
  onSearch,
  onClearFilters,
  onViewMode,
  onTheme,
}: LibraryToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  return (
    <div className="sticky top-16 z-30 border-b border-cream-border/80 bg-cream/95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-brand hover:bg-brand-light text-cream text-[11px] font-bold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Book
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortOpen((v) => !v);
                setFilterOpen(false);
                setViewOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 h-9 border text-[11px] font-bold rounded-lg transition-colors ${
                sortMode !== "custom"
                  ? "border-brand/40 bg-brand/5 text-brand"
                  : "border-cream-border bg-cream-card text-charcoal hover:bg-cream-dark/40"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </button>
            {sortOpen && (
              <Dropdown onClose={() => setSortOpen(false)}>
                {(
                  [
                    ["custom", "Shelf order"],
                    ["title", "Title"],
                    ["author", "Author"],
                    ["pages", "Page count"],
                    ["year", "Year"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      startTransition(() => onSortMode(id));
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-semibold rounded-lg ${
                      sortMode === id ? "bg-brand/10 text-brand" : "text-charcoal hover:bg-cream-dark/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setSortOpen(false);
                setViewOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 h-9 border text-[11px] font-bold rounded-lg transition-colors ${
                statusFilter !== "all"
                  ? "border-brand/40 bg-brand/5 text-brand"
                  : "border-cream-border bg-cream-card text-charcoal hover:bg-cream-dark/40"
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            {filterOpen && (
              <Dropdown onClose={() => setFilterOpen(false)}>
                {(
                  [
                    ["all", "All books"],
                    ["Currently Reading", "Reading"],
                    ["Finished", "Finished"],
                    ["Want to Read", "Wishlist"],
                    ["Favorite", "Favorites"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      startTransition(() => onStatusFilter(id));
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-semibold rounded-lg ${
                      statusFilter === id ? "bg-brand/10 text-brand" : "text-charcoal hover:bg-cream-dark/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>

          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-3 h-9 border border-cream-border bg-cream-card hover:bg-cream-dark/40 text-charcoal text-[11px] font-bold rounded-lg transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Library
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setViewOpen((v) => !v);
                setSortOpen(false);
                setFilterOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-cream-border bg-cream-card hover:bg-cream-dark/40 text-charcoal text-[11px] font-bold rounded-lg transition-colors"
            >
              {viewMode === "covers" ? (
                <LayoutGrid className="w-3.5 h-3.5" />
              ) : viewMode === "compact" ? (
                <List className="w-3.5 h-3.5" />
              ) : (
                <Columns3 className="w-3.5 h-3.5" />
              )}
              View Mode
            </button>
            {viewOpen && (
              <Dropdown onClose={() => setViewOpen(false)}>
                {(
                  [
                    { id: "bookshelf" as LibraryViewMode, label: "Bookshelf", icon: Columns3 },
                    { id: "covers" as LibraryViewMode, label: "Covers", icon: LayoutGrid },
                    { id: "compact" as LibraryViewMode, label: "Compact", icon: List },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onViewMode(v.id);
                      setViewOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-semibold rounded-lg inline-flex items-center gap-2 ${
                      viewMode === v.id ? "bg-brand/10 text-brand" : "text-charcoal hover:bg-cream-dark/40"
                    }`}
                  >
                    <v.icon className="w-3.5 h-3.5" /> {v.label}
                  </button>
                ))}
                {viewMode === "bookshelf" && (
                  <div className="mt-1 pt-1 border-t border-cream-border/70 space-y-0.5">
                    <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-charcoal-muted">
                      Wood
                    </p>
                    {(Object.keys(SHELF_THEMES) as ShelfThemeId[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onTheme(id)}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold rounded-lg ${
                          theme === id ? "bg-brand/10 text-brand" : "text-charcoal hover:bg-cream-dark/40"
                        }`}
                      >
                        {SHELF_THEMES[id].label}
                      </button>
                    ))}
                  </div>
                )}
              </Dropdown>
            )}
          </div>

          <div className="flex-1 min-w-[140px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-muted" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search this shelf…"
              className="w-full h-9 pl-8 pr-3 text-[11px] bg-cream-card border border-cream-border rounded-lg focus:outline-none focus:border-brand-muted"
            />
          </div>
        </div>

        {(filtersActive || sortMode !== "custom") && (
          <div className="flex items-center gap-2 text-[10px] text-charcoal-muted">
            <span>
              Showing {visibleCount} of {totalCount}
              {sortMode !== "custom" ? ` · sorted by ${sortMode}` : ""}
              {reorderDisabled ? " · drag disabled while filtered/sorted" : ""}
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
