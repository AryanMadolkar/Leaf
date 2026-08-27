"use client";

import React, { useEffect, useState } from "react";
import { Ban, X } from "lucide-react";
import { DNF_REASONS, type DnfReasonId } from "@/utils/dnfReasons";

export type DnfSubmitPayload = {
  reasons: DnfReasonId[];
  note: string;
  stoppedAtPage: number | null;
  stoppedAtChapter: string;
};

type Props = {
  open: boolean;
  bookTitle?: string;
  initialPage?: number;
  totalPages?: number;
  onClose: () => void;
  onSubmit: (payload: DnfSubmitPayload) => Promise<void> | void;
};

export default function DnfReasonModal({
  open,
  bookTitle,
  initialPage = 0,
  totalPages,
  onClose,
  onSubmit,
}: Props) {
  const [reasons, setReasons] = useState<DnfReasonId[]>([]);
  const [note, setNote] = useState("");
  const [page, setPage] = useState(initialPage > 0 ? String(initialPage) : "");
  const [chapter, setChapter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReasons([]);
    setNote("");
    setPage(initialPage > 0 ? String(initialPage) : "");
    setChapter("");
    setError(null);
    setSaving(false);
  }, [open, initialPage]);

  if (!open) return null;

  const toggle = (id: DnfReasonId) => {
    setReasons((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reasons.length === 0) {
      setError("Pick at least one reason — it helps Leaf learn your taste.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parsedPage = page.trim() ? parseInt(page, 10) : null;
      await onSubmit({
        reasons,
        note: note.trim(),
        stoppedAtPage:
          parsedPage && !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : null,
        stoppedAtChapter: chapter.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-cream border border-cream-border rounded-2xl shadow-xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand">
              <Ban className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Did Not Finish</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-charcoal">Why did you stop reading?</h2>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              {bookTitle
                ? `Not every book is meant to be finished — including “${bookTitle}”.`
                : "Not every book is meant to be finished."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-muted hover:bg-cream-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {DNF_REASONS.map((r) => {
            const active = reasons.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                  active
                    ? "bg-brand text-cream border-brand"
                    : "bg-cream-card text-charcoal border-cream-border hover:border-charcoal-light"
                }`}
              >
                <span className="mr-1">{r.emoji}</span>
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Stopped at page
            </label>
            <input
              type="number"
              min={1}
              max={totalPages || undefined}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="Optional"
              className="w-full h-9 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Chapter
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="Optional"
              className="w-full h-9 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
            Note
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (optional)"
            className="w-full p-2.5 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-charcoal-muted hover:text-charcoal"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-brand hover:bg-brand-light text-cream text-xs font-bold rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save DNF"}
          </button>
        </div>
      </form>
    </div>
  );
}
