"use client";

import React from "react";
import Header from "@/components/Header";
import CoverImage from "@/components/CoverImage";
import { StarDisplay } from "@/components/ReviewCard";
import { useLeaf } from "@/context/LeafContext";
import { Calendar, BookOpen } from "lucide-react";
import Link from "next/link";

export default function ReadingDiaryPage() {
  const { diaryLogs, books, currentUser } = useLeaf();

  // Finished + currently reading (want-to-read stays on the shelf only)
  const userDiaryLogs = diaryLogs
    .filter(
      (log) =>
        log.userId === currentUser.id &&
        (log.status === "Finished" || log.status === "Currently Reading"),
    )
    .sort((a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* Title Header */}
        <div className="space-y-1 mb-8">
          <h1 className="font-serif text-3xl font-bold text-charcoal">
            Reading Diary
          </h1>
          <p className="text-xs text-charcoal-muted">
            A chronological timeline of books you&apos;re reading and have finished on Leaf.
          </p>
        </div>

        {/* Diary List Card Container */}
        <div className="bg-cream-card border border-cream-border rounded-2xl overflow-hidden shadow-sm">
          {userDiaryLogs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-cream-dark/50 border-b border-cream-border font-semibold text-charcoal uppercase tracking-wider text-[9px] select-none">
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Book details</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">My Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-border/60">
                {userDiaryLogs.map((log) => {
                  const book = books.find((b) => b.id === log.bookId);
                  if (!book) return null;
                  const isReading = log.status === "Currently Reading";

                  return (
                    <tr key={log.id} className="hover:bg-cream-dark/15 transition-all">
                      {/* Date logged */}
                      <td className="p-4 pl-6 text-charcoal-muted font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand" />
                          <span>
                            {new Date(log.dateLogged).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isReading
                              ? "bg-brand/10 text-brand border-brand/20"
                              : "bg-cream-dark text-charcoal-muted border-cream-border"
                          }`}
                        >
                          {isReading ? "Reading" : "Finished"}
                        </span>
                      </td>

                      {/* Cover & Title */}
                      <td className="p-4 font-bold text-charcoal">
                        <div className="flex items-center gap-3.5">
                          <Link href={`/book/${book.id}`} className="flex-shrink-0">
                            <CoverImage
                              src={book.coverImage}
                              title={book.title}
                              author={book.author}
                              bookId={book.id}
                              className="w-9 h-14 rounded shadow-sm border border-cream-border hover:scale-95 transition-transform"
                              imgClassName="w-full h-full object-cover"
                            />
                          </Link>
                          <Link href={`/book/${book.id}`} className="hover:text-brand hover:underline transition-colors text-xs font-serif font-bold">
                            {book.title}
                          </Link>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="p-4 text-charcoal-light font-medium">{book.author}</td>

                      {/* Rating */}
                      <td className="p-4">
                        {log.rating !== undefined ? (
                          <StarDisplay rating={log.rating} size={11} />
                        ) : (
                          <span className="text-[10px] text-charcoal-muted italic">
                            {isReading ? "In progress" : "Shelved only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 px-6 space-y-4">
              <BookOpen className="w-10 h-10 text-charcoal-muted mx-auto opacity-50" />
              <div className="space-y-1">
                <p className="font-serif text-lg font-bold text-charcoal">Your diary is empty</p>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                  Log a book as Currently Reading or Finished using the + Log button above.
                </p>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
