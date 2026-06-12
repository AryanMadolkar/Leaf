"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLeaf } from "@/context/LeafContext";
import { Heart, MessageSquare, CornerDownRight, ArrowRight } from "lucide-react";
import { Review } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewCardProps {
  review: Review;
  showBookCover?: boolean;
}

// Minimal Star Renderer for display (read-only)
export const StarDisplay = ({ rating, size = 14 }: { rating: number; size?: number }) => {
  return (
    <div className="flex items-center gap-0.5 select-none">
      {[1, 2, 3, 4, 5].map((index) => {
        const isFull = rating >= index;
        const isHalf = rating === index - 0.5;

        return (
          <div key={index} style={{ width: size, height: size }} className="relative">
            <svg
              viewBox="0 0 24 24"
              className="absolute inset-0 w-full h-full"
              fill="none"
              stroke="#D4CECE"
              strokeWidth="2"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                className="fill-cream-dark stroke-cream-border"
              />
              <g
                style={{
                  clipPath: isFull
                    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
                    : isHalf
                    ? "polygon(0 0, 50% 0, 50% 100%, 0 100%)"
                    : "polygon(0 0, 0% 0, 0% 100%, 0 100%)",
                }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#2E4D38"
                  stroke="#2E4D38"
                />
              </g>
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default function ReviewCard({ review, showBookCover = true }: ReviewCardProps) {
  const { books, users, comments, addComment, toggleLikeReview, currentUser } = useLeaf();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const book = books.find((b) => b.id === review.bookId);
  const authorUser = users.find((u) => u.id === review.userId);
  const reviewComments = comments.filter((c) => c.reviewId === review.id);

  if (!book || !authorUser) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(review.id, newComment.trim());
    setNewComment("");
  };

  return (
    <div className="bg-cream-card border border-cream-border rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex gap-4 md:gap-6">
        
        {/* Book Cover Thumbnail (Left Column) */}
        {showBookCover && (
          <Link href={`/book/${book.id}`} className="flex-shrink-0 group">
            <div className="relative w-20 h-28 md:w-24 md:h-36 rounded-md overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-charcoal/20 z-10" />
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </Link>
        )}

        {/* Review Context (Right Column) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Header info */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${authorUser.username}`}>
                  <img
                    src={authorUser.avatar}
                    alt={authorUser.name}
                    className="w-6 h-6 rounded-full object-cover border border-cream-border"
                  />
                </Link>
                <div className="text-xs leading-tight">
                  <Link
                    href={`/profile/${authorUser.username}`}
                    className="font-semibold text-charcoal hover:text-brand transition-colors"
                  >
                    {authorUser.name}
                  </Link>
                  <span className="text-charcoal-muted text-[10px] ml-1">
                    @{authorUser.username}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-cream px-2 py-0.5 rounded border border-cream-border">
                <StarDisplay rating={review.rating} />
              </div>
            </div>

            {/* Book Info */}
            <div className="mb-2">
              <Link
                href={`/book/${book.id}`}
                className="font-serif text-base font-bold text-charcoal hover:text-brand transition-colors"
              >
                {book.title}
              </Link>
              <span className="text-charcoal-muted text-xs ml-1.5">by {book.author}</span>
            </div>

            {/* Review Content */}
            <p className="text-xs text-charcoal-light leading-relaxed font-sans line-clamp-4 md:line-clamp-none">
              &ldquo;{review.content}&rdquo;
            </p>
          </div>

          {/* Card Actions (Footer) */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-cream-border/60 text-[11px] font-medium text-charcoal-muted">
            <span className="text-[10px] text-charcoal-muted/70">{review.dateString}</span>

            {/* Like Trigger */}
            <button
              onClick={() => toggleLikeReview(review.id)}
              className={`flex items-center gap-1.5 transition-colors duration-200 group focus:outline-none ${
                review.isLiked ? "text-red-500 font-bold" : "hover:text-charcoal"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${
                  review.isLiked ? "fill-red-500 stroke-red-500" : ""
                }`}
              />
              <span>{review.likesCount}</span>
            </button>

            {/* Comments Toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 hover:text-charcoal transition-colors group focus:outline-none"
            >
              <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>{reviewComments.length} {reviewComments.length === 1 ? "Comment" : "Comments"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-cream-border pl-0 md:pl-28 space-y-4">
              
              {/* Existing Comments list */}
              {reviewComments.length > 0 && (
                <div className="space-y-3">
                  {reviewComments.map((comment) => {
                    const commentUser = users.find((u) => u.id === comment.userId);
                    if (!commentUser) return null;
                    return (
                      <div key={comment.id} className="flex gap-2 text-xs leading-normal">
                        <CornerDownRight className="w-3.5 h-3.5 text-charcoal-muted mt-1 flex-shrink-0" />
                        <img
                          src={commentUser.avatar}
                          alt={commentUser.name}
                          className="w-5.5 h-5.5 rounded-full object-cover border border-cream-border flex-shrink-0"
                        />
                        <div className="flex-1 bg-cream border border-cream-border/70 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-charcoal text-[11px]">
                              {commentUser.name}
                            </span>
                            <span className="text-[9px] text-charcoal-muted">
                              {comment.dateString}
                            </span>
                          </div>
                          <p className="text-[11px] text-charcoal-light font-sans">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Comment input */}
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-2">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-5.5 h-5.5 rounded-full object-cover border border-cream-border flex-shrink-0"
                />
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full h-8 pl-3 pr-8 text-[11px] bg-cream border border-cream-border rounded-lg text-charcoal placeholder-charcoal-muted focus:outline-none focus:border-brand-muted"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 p-1 text-charcoal-muted hover:text-brand focus:outline-none"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </form>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
