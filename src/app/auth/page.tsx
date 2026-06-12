"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import { BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const { signIn } = useLeaf();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email);
    router.push("/feed");
  };

  const handleGoogleLogin = () => {
    signIn("google_user@gmail.com");
    router.push("/feed");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      
      {/* Left Column: Form (50% Width) */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 max-w-xl mx-auto w-full">
        
        {/* Top Header */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand" />
          <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
            Leaf
          </span>
        </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
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
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
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
              <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
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
              <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                Password
              </label>
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
              className="w-full h-10 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-2"
            >
              <span>{isSignUp ? "Sign Up" : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Social login divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-cream-border/60"></div>
            <span className="flex-shrink mx-4 text-[10px] font-semibold text-charcoal-muted uppercase">
              Or continue with
            </span>
            <div className="flex-grow border-t border-cream-border/60"></div>
          </div>

          {/* Google Login Mock */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full h-10 bg-cream-card hover:bg-cream-dark/30 border border-cream-border text-charcoal font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Toggle Form Footer */}
        <p className="text-xs text-charcoal-muted text-center">
          {isSignUp ? "Already have a library?" : "New to Leaf?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-bold text-brand hover:underline"
          >
            {isSignUp ? "Sign In" : "Register Now"}
          </button>
        </p>

      </div>

      {/* Right Column: Visual Splendor (50% Width) */}
      <div className="hidden md:block flex-1 relative overflow-hidden bg-charcoal">
        <img
          src="/public/auth_bg.png"
          onError={(e) => {
            // Fallback if public isn't routed yet (NextJS serves from public/ directly as relative root)
            (e.target as HTMLImageElement).src = "/auth_bg.png";
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
