"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { authFetch } from "@/utils/auth/client";

type Msg = { role: "user" | "assistant"; content: string; at?: string };

const SUGGESTIONS = [
  "What should I know about this book’s vibe before I go further?",
  "Help me understand the setup so far — no spoilers ahead.",
  "How does this compare to similar books in tone?",
  "I’m stuck on a confusing part — here’s a passage…",
];

type Props = {
  bookId: string;
  bookTitle: string;
  page?: number;
  chapter?: string;
  open: boolean;
  onClose: () => void;
};

export default function AskLeafDrawer({
  bookId,
  bookTitle,
  page,
  chapter,
  open,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [passage, setPassage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/books/${encodeURIComponent(bookId)}/companion`);
        const data = await res.json();
        if (cancelled || !res.ok || !data.success) return;
        const latest = data.conversations?.[0];
        if (latest) {
          setConversationId(latest.id);
          const msgs = (latest.messages || [])
            .filter((m: Msg) => m.role === "user" || m.role === "assistant")
            .map((m: Msg) => ({ role: m.role, content: m.content, at: m.at }));
          setMessages(msgs);
        } else {
          setConversationId(null);
          setMessages([]);
        }
      } catch {
        /* fresh chat ok */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bookId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!open) return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    try {
      const res = await authFetch(`/api/books/${encodeURIComponent(bookId)}/companion/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content,
          page: page ?? undefined,
          chapter: chapter || undefined,
          passage: passage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ask Leaf is unavailable");
      }
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message?.content || "…" },
      ]);
    } catch (err: any) {
      const msg = err?.message || "Ask Leaf is unavailable right now.";
      setError(msg);
      setToast(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex justify-end">
        <button type="button" aria-label="Close" className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
        <div className="relative w-full max-w-md h-full bg-cream border-l border-cream-border shadow-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-cream-border flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-brand">
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ask Leaf</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-charcoal truncate">{bookTitle}</h3>
              <p className="text-[10px] text-charcoal-muted">
                Position lock:{" "}
                {page != null ? `page ${page}` : "page unknown"}
                {chapter ? ` · ${chapter}` : ""}
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

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Spoiler-aware companion using book metadata and your progress — not the full text.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="text-left text-[11px] px-3 py-2 rounded-xl border border-cream-border bg-cream-card text-charcoal hover:border-brand-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-brand text-cream"
                    : "mr-auto bg-cream-card border border-cream-border text-charcoal"
                }`}
              >
                {m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-cream-border p-4 space-y-2">
            {error && <p className="text-[11px] text-rose-700">{error}</p>}
            <textarea
              rows={2}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Optional: paste a short passage you’re on"
              className="w-full text-[11px] p-2.5 rounded-lg border border-cream-border bg-cream-card text-charcoal focus:outline-none focus:border-brand-muted"
            />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this book…"
                className="flex-1 h-10 px-3 text-xs rounded-lg border border-cream-border bg-cream text-charcoal focus:outline-none focus:border-brand-muted"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="h-10 w-10 rounded-lg bg-brand text-cream flex items-center justify-center disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-xl bg-charcoal text-cream text-xs shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
