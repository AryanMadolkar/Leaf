"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { Layers, Plus, X, Heart, MessageSquare, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ListsPage() {
  const { lists, books, createList, users } = useLeaf();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const handleBookToggle = (bookId: string) => {
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(selectedBookIds.filter((id) => id !== bookId));
    } else {
      setSelectedBookIds([...selectedBookIds, bookId]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || selectedBookIds.length === 0) return;

    createList(title, description, coverImage, selectedBookIds);

    // Reset
    setTitle("");
    setDescription("");
    setCoverImage("");
    setSelectedBookIds([]);
    setIsFormOpen(false);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* Title / Action Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="font-serif text-3xl font-bold text-charcoal">
              Curated Collections
            </h1>
            <p className="text-xs text-charcoal-muted">
              Shareable reading lists, thematic logs, and essential reading lists.
            </p>
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 px-4 h-9 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create List</span>
          </button>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {lists.map((list) => {
            const author = users.find((u) => u.id === list.userId);
            return (
              <div
                key={list.id}
                className="bg-cream-card border border-cream-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                {/* List Card Header Image */}
                <div className="relative h-44 bg-charcoal/10">
                  <img
                    src={list.coverImage}
                    alt={list.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent flex flex-col justify-end p-5">
                    <span className="text-[8px] uppercase tracking-wider text-cream/70 font-bold mb-0.5">
                      {list.bookIds.length} Books Curated
                    </span>
                    <h3 className="font-serif text-xl font-bold text-cream">
                      {list.title}
                    </h3>
                  </div>
                </div>

                {/* List Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {author && (
                      <p className="text-[10px] text-charcoal-muted">
                        Curated by{" "}
                        <Link
                          href={`/profile/${author.username}`}
                          className="font-bold text-charcoal hover:underline"
                        >
                          {author.name}
                        </Link>
                      </p>
                    )}
                    <p className="text-xs text-charcoal-light leading-relaxed font-sans line-clamp-3">
                      {list.description}
                    </p>
                  </div>

                  {/* Covers row */}
                  <div className="flex gap-2 items-center flex-wrap pt-2 border-t border-cream-border/60">
                    {list.bookIds.map((bookId) => {
                      const book = books.find((b) => b.id === bookId);
                      if (!book) return null;
                      return (
                        <Link key={bookId} href={`/book/${bookId}`} title={book.title}>
                          <div className="w-9 h-14 rounded overflow-hidden shadow border border-cream-border hover:-translate-y-1.5 transition-transform duration-300">
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Create List Side Drawer / Popup Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
            />

            {/* Form Drawer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-cream border border-cream-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-cream-border flex items-center justify-between bg-cream-card">
                <span className="font-serif text-lg font-bold text-charcoal flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  Create Curated List
                </span>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                    List Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Autumnal Classics"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the mood, theme, or criteria for this collection..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                </div>

                {/* Cover Image link */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                    Cover Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Unsplash link or image address"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                </div>

                {/* Multi-book selector grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal block">
                    Select Books ({selectedBookIds.length} selected)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border border-cream-border rounded-lg p-2 bg-cream-card">
                    {books.map((b) => {
                      const isSelected = selectedBookIds.includes(b.id);
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => handleBookToggle(b.id)}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "bg-brand/5 border-brand/50"
                              : "border-transparent hover:bg-cream-dark/25"
                          }`}
                        >
                          <img
                            src={b.coverImage}
                            alt={b.title}
                            className="w-6 h-9 object-cover rounded shadow-sm flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-charcoal truncate">
                              {b.title}
                            </p>
                            <p className="text-[9px] text-charcoal-muted truncate">
                              {b.author}
                            </p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={selectedBookIds.length === 0}
                  className="w-full h-10 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Collection
                </button>

              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
