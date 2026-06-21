"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { Layers, Plus, X, Heart, MessageSquare, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ListsPage() {
  const { lists, books, createList, users, toggleLikeList } = useLeaf();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any | null>(null);
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
                onClick={() => setSelectedList(list)}
                className="bg-cream-card border border-cream-border hover:border-brand-muted/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.01]"
              >
                {/* List Card Header Image */}
                <div className="relative h-44 bg-charcoal/10 overflow-hidden">
                  <img
                    src={list.coverImage}
                    alt={list.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating likes and comments */}
                  <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeList(list.id);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 backdrop-blur-md rounded-full text-[9px] font-bold shadow-sm transition-all border ${
                        list.isLiked 
                          ? "bg-rose-500/90 border-rose-400 text-cream" 
                          : "bg-charcoal/45 hover:bg-charcoal/70 border-white/10 text-cream"
                      }`}
                    >
                      <Heart className={`w-2.5 h-2.5 ${list.isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span>{list.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-charcoal/45 backdrop-blur-md rounded-full text-[9px] font-bold border border-white/10 text-cream">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>{list.commentsCount}</span>
                    </div>
                  </div>
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
                          onClick={(e) => e.stopPropagation()}
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
                        <Link 
                          key={bookId} 
                          href={`/book/${bookId}`} 
                          title={book.title}
                          onClick={(e) => e.stopPropagation()}
                        >
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

      {/* List Detail Modal */}
      <AnimatePresence>
        {selectedList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedList(null)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-cream border border-cream-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header/Cover Section */}
              <div className="relative h-60 bg-charcoal/10 flex-shrink-0">
                <img
                  src={selectedList.coverImage}
                  alt={selectedList.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent p-6 flex flex-col justify-end">
                  <button
                    onClick={() => setSelectedList(null)}
                    className="absolute top-4 right-4 p-2 bg-charcoal/50 hover:bg-charcoal/80 text-cream rounded-full transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-brand font-bold bg-cream px-2 py-0.5 rounded-full w-fit">
                      {selectedList.bookIds.length} Books Curated
                    </span>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-cream mt-1">
                      {selectedList.title}
                    </h2>
                    
                    {/* Curator info */}
                    {(() => {
                      const author = users.find((u) => u.id === selectedList.userId);
                      return author ? (
                        <p className="text-xs text-cream/80">
                          Curated by{" "}
                          <Link
                            href={`/profile/${author.username}`}
                            className="font-bold hover:underline text-cream hover:text-brand-light"
                            onClick={() => setSelectedList(null)}
                          >
                            {author.name}
                          </Link>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Description & Metadata row */}
              <div className="px-6 py-4 bg-cream-card border-b border-cream-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-charcoal-light leading-relaxed max-w-xl">
                  {selectedList.description}
                </p>
                <div className="flex items-center gap-3 flex-shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => toggleLikeList(selectedList.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedList.isLiked
                        ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                        : "bg-cream hover:bg-cream-dark/20 border-cream-border text-charcoal-muted"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${selectedList.isLiked ? "fill-rose-600 text-rose-600" : ""}`} />
                    <span>{selectedList.likesCount}</span>
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-border bg-cream text-charcoal-muted text-xs font-semibold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{selectedList.commentsCount}</span>
                  </div>
                </div>
              </div>

              {/* Books List Section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-cream/50">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted mb-2">
                  Books in this Collection
                </h4>
                <div className="space-y-3">
                  {selectedList.bookIds.map((bookId: string) => {
                    const book = books.find((b) => b.id === bookId);
                    if (!book) return null;
                    return (
                      <div
                        key={bookId}
                        className="flex gap-4 p-4 bg-cream-card border border-cream-border/60 rounded-xl hover:border-brand-muted/20 hover:shadow-sm transition-all group"
                      >
                        {/* Book Cover */}
                        <Link
                          href={`/book/${bookId}`}
                          onClick={() => setSelectedList(null)}
                          className="w-16 h-24 rounded overflow-hidden shadow-md border border-cream-border/50 flex-shrink-0 hover:scale-105 transition-transform duration-300"
                        >
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80";
                            }}
                          />
                        </Link>

                        {/* Book details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <Link
                                href={`/book/${bookId}`}
                                onClick={() => setSelectedList(null)}
                                className="font-serif text-sm md:text-base font-bold text-charcoal hover:text-brand transition-colors truncate"
                              >
                                {book.title}
                              </Link>
                              <span className="text-[10px] font-bold text-brand-muted bg-brand/5 px-2 py-0.5 rounded flex-shrink-0">
                                ★ {book.averageRating.toFixed(1)}
                              </span>
                            </div>
                            <p className="text-[11px] text-charcoal-muted font-medium mb-1">
                              by {book.author}
                            </p>
                            <p className="text-xs text-charcoal-light line-clamp-2 leading-relaxed font-sans mt-1">
                              {book.description}
                            </p>
                          </div>

                          {/* Page & Year info + action */}
                          <div className="flex items-center justify-between text-[10px] text-charcoal-muted pt-2 mt-2 border-t border-cream-border/30">
                            <span className="flex items-center gap-3">
                              <span>{book.pages} pages</span>
                              <span>•</span>
                              <span>Published {book.year}</span>
                            </span>
                            <Link
                              href={`/book/${bookId}`}
                              onClick={() => setSelectedList(null)}
                              className="text-brand hover:text-brand-light font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
