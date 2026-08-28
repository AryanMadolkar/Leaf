"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { authFetch } from "@/utils/auth/client";
import Link from "next/link";
import { Dna, Loader2, RefreshCw, Sparkles } from "lucide-react";

type DnaGenre = { name: string; weight: number };
type ReadingDnaClient = {
  genres: DnaGenre[];
  pacing_preference: number;
  character_preference: number;
  worldbuilding_preference: number;
  emotional_preference: number;
  profile_summary: string | null;
  confidence: number;
  signals: Record<string, unknown>;
  updated_at: string;
};

function hasEnoughSignal(dna: ReadingDnaClient | null): boolean {
  if (!dna) return false;
  return (dna.confidence || 0) >= 0.2 || (dna.genres?.length || 0) > 0;
}

function PrefBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold text-charcoal">{label}</span>
        <span className="text-charcoal-muted tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-cream-dark overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ReadingDnaPage() {
  const { isAuthenticated, isProfileLoading } = useLeaf();
  const [dna, setDna] = useState<ReadingDnaClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await authFetch(force ? "/api/reading-dna?force=1" : "/api/reading-dna");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load Reading DNA");
      setDna(data.dna);
    } catch (err: any) {
      setError(err.message || "Could not load Reading DNA");
      setDna(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isProfileLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAuthenticated, isProfileLoading, load]);

  const enough = hasEnoughSignal(dna);
  const signals = (dna?.signals || {}) as Record<string, any>;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand">
              <Dna className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Taste profile</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal tracking-tight">
              Reading DNA
            </h1>
            <p className="text-sm text-charcoal-muted max-w-lg leading-relaxed">
              A living sketch of what you finish, abandon, and rate — not a quiz, not a horoscope.
            </p>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="h-9 px-3 rounded-lg border border-cream-border text-[11px] font-bold text-charcoal-muted hover:text-charcoal inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </button>
          )}
        </div>

        {!isProfileLoading && !isAuthenticated && (
          <div className="bg-cream-card border border-cream-border rounded-2xl p-8 text-center space-y-3">
            <h2 className="font-serif text-xl font-bold text-charcoal">Sign in to see your DNA</h2>
            <p className="text-xs text-charcoal-muted">Finish a few books and Leaf will start sketching your taste.</p>
            <Link href="/login" className="inline-block text-xs font-bold text-brand hover:underline">
              Sign in
            </Link>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-charcoal-muted gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Mapping your shelves…
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
        )}

        {!loading && isAuthenticated && dna && !enough && (
          <div className="bg-cream-card border border-cream-border rounded-2xl p-8 space-y-3">
            <Sparkles className="w-6 h-6 text-brand" />
            <h2 className="font-serif text-2xl font-bold text-charcoal">Still learning you</h2>
            <p className="text-sm text-charcoal-muted leading-relaxed max-w-md">
              Finish a handful of books, rate what stuck, or mark a DNF with reasons — then your bars and summary will appear.
              We won&apos;t invent preferences from thin air.
            </p>
            <div className="flex gap-3 pt-2">
              <Link
                href="/discover"
                className="px-4 py-2 bg-brand text-cream text-xs font-bold rounded-lg hover:bg-brand-light"
              >
                Discover books
              </Link>
              <Link href="/diary" className="px-4 py-2 border border-cream-border text-xs font-bold rounded-lg text-charcoal">
                Open diary
              </Link>
            </div>
          </div>
        )}

        {!loading && isAuthenticated && dna && enough && (
          <div className="space-y-8">
            {dna.profile_summary ? (
              <blockquote className="font-serif text-xl md:text-2xl text-charcoal leading-snug border-l-2 border-brand pl-5">
                {dna.profile_summary}
              </blockquote>
            ) : (
              <p className="text-sm text-charcoal-muted italic">
                Summary unlocks after roughly 5 finished books or 8 ratings — preference bars below are ready now.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Finished", value: signals.finished ?? "—" },
                { label: "Rated", value: signals.rated ?? "—" },
                { label: "DNFs", value: signals.dnfCount ?? "—" },
                { label: "Confidence", value: `${Math.round((dna.confidence || 0) * 100)}%` },
              ].map((s) => (
                <div key={s.label} className="bg-cream-card border border-cream-border rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">{s.label}</p>
                  <p className="font-serif text-2xl font-bold text-charcoal mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <section className="bg-cream-card border border-cream-border rounded-2xl p-6 space-y-5">
              <h2 className="font-serif text-lg font-bold text-charcoal">Preference axes</h2>
              <PrefBar label="Pacing tolerance" value={Number(dna.pacing_preference)} />
              <PrefBar label="Character focus" value={Number(dna.character_preference)} />
              <PrefBar label="Worldbuilding appetite" value={Number(dna.worldbuilding_preference)} />
              <PrefBar label="Emotional intensity" value={Number(dna.emotional_preference)} />
            </section>

            {dna.genres?.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-charcoal">Genres that stick</h2>
                <div className="flex flex-wrap gap-2">
                  {dna.genres.map((g) => (
                    <span
                      key={g.name}
                      className="px-3 py-1.5 rounded-full border border-cream-border bg-cream-card text-xs font-medium text-charcoal"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
