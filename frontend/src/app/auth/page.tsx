"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import { BookOpen, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const { signInWithPassword, signUpWithPassword } = useLeaf();
  const router = useRouter();
  
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) setErrorMsg(error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const data = await signUpWithPassword(email, password, username, name);
        if (data.user?.onboarding_completed) {
          router.push("/feed");
        } else {
          router.push("/onboarding");
        }
      } else {
        const data = await signInWithPassword(email, password);
        if (data.user?.onboarding_completed) {
          router.push("/feed");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (err: any) {
      console.error("Auth action failed:", err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      
      {/* Left Column: Form (50% Width) */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 max-w-xl mx-auto w-full">
        
        {/* Top Header */}
        <Link href="/" className="flex items-center gap-2 group w-fit">
          <BookOpen className="w-5 h-5 text-brand group-hover:rotate-6 transition-transform duration-300" />
          <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
            Leaf
          </span>
        </Link>

        {/* Form Body */}
        <div className="space-y-8 my-auto py-12">
          <div className="space-y-3">
            <h1 className="font-serif text-3xl font-bold text-charcoal tracking-tight">
              {isSignUp ? "Create your library" : "Welcome back, reader"}
            </h1>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              {isSignUp
                ? "Join the network, rate books, and craft your literary identity."
                : "Sign in to log books, check feed updates, and update your diary."}
            </p>
          </div>

          {/* Feedback alerts */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2 font-medium"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-xs text-brand flex items-start gap-2 font-medium"
              >
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Donna Tartt"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="donnareads"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
              />
            </div>

            <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal">
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                />
              </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-brand hover:bg-brand-light disabled:bg-brand/50 text-cream font-semibold text-xs rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Sign Up" : "Sign In"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle Form Footer */}
        <div className="text-xs text-charcoal-muted text-center space-y-2">
          <p>
            {isSignUp ? "Already have a library?" : "New to Leaf?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-brand hover:underline"
            >
              {isSignUp ? "Sign In" : "Register Now"}
            </button>
          </p>
        </div>

      </div>

      {/* Right Column: Visual Splendor (50% Width) */}
      <div className="hidden md:block flex-1 relative overflow-hidden bg-charcoal">
        <img
          src="/auth_bg.png"
          onError={(e) => {
            // Fallback if needed
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=1000&auto=format&fit=crop&q=80";
          }}
          alt="Auth background open book on linen"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        {/* Elegant visual shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-transparent" />

        {/* Quote Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-16 space-y-6 text-cream max-w-xl">
          <blockquote className="font-serif text-2xl md:text-3xl italic leading-relaxed text-cream-dark">
            &ldquo;A room without books is like a body without a soul.&rdquo;
          </blockquote>
          <div>
            <p className="font-semibold text-sm">— Marcus Tullius Cicero</p>
            <p className="text-[10px] text-cream/70 mt-1 uppercase tracking-widest">
              Leaf Library Archive
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
