"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, Check } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import type { Book } from "@/data/mockData";
import { authFetch } from "@/utils/auth/client";

type AddBooksModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: (library: any) => void;
  defaultShelfId?: string;
};

export default function AddBooksModal({ open, onClose, onAdded, defaultShelfId }: AddBooksModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.success ? data.books || [] : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, open]);

  const handleAdd = async (book: Book) => {
    setAddingId(book.id);
    try {
      const res = await authFetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_book",
          bookId: book.id,
          shelfId: defaultShelfId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not add book");
      setAddedIds((prev) => new Set(prev).add(book.id));
      onAdded(data.library);
    } catch (err: any) {
      alert(err?.message || "Could not add book");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full max-w-lg bg-cream border border-cream-border rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-cream-border">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">Add Books</h3>
                <p className="text-[10px] text-charcoal-muted">Search Open Library and place them on your shelf.</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-cream-dark/50">
                <X className="w-4 h-4 text-charcoal-muted" />
              </button>
            </div>

            <div className="p-4 border-b border-cream-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, author, ISBN…"
                  className="w-full h-11 pl-10 pr-3 text-sm bg-cream-card border border-cream-border rounded-xl text-charcoal focus:outline-none focus:border-brand-muted"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && (
                <p className="text-xs text-charcoal-muted text-center py-8">Searching…</p>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-charcoal-muted text-center py-8">No matches.</p>
              )}
              {!loading &&
                results.map((book) => {
                  const added = addedIds.has(book.id);
                  return (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-cream-border/70 bg-cream-card hover:border-brand-muted/50 transition-colors"
                    >
                      <CoverImage
                        src={book.coverImage}
                        title={book.title}
                        author={book.author}
                        bookId={book.id}
                        className="w-10 h-14 rounded shadow-sm flex-shrink-0"
                        imgClassName="w-full h-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                        <p className="text-[10px] text-charcoal-muted truncate">
                          {book.author}
                          {book.year ? ` · ${book.year}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={added || addingId === book.id}
                        onClick={() => handleAdd(book)}
                        className={`flex items-center gap-1 px-3 h-8 rounded-lg text-[10px] font-bold transition-colors ${
                          added
                            ? "bg-brand/10 text-brand"
                            : "bg-brand text-cream hover:bg-brand-light"
                        }`}
                      >
                        {added ? (
                          <>
                            <Check className="w-3 h-3" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
