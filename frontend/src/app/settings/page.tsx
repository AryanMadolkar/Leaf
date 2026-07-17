"use client";

import React, { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import UserAvatar from "@/components/UserAvatar";
import { useLeaf } from "@/context/LeafContext";
import { Camera, Trash2, Check, AlertCircle, ArrowLeft, Sparkles, Loader, Upload, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  parseGoodreadsCsv,
  matchGoodreadsRows,
  type ImportMatchResult,
  type MatchedImportBook,
} from "@/utils/goodreadsImport";

export default function SettingsPage() {
  const { currentUser, updateProfile, session, importLibraryBooks, isAuthenticated } = useLeaf();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [importPhase, setImportPhase] = useState<"idle" | "matching" | "ready" | "importing" | "done">("idle");
  const [matchResult, setMatchResult] = useState<ImportMatchResult | null>(null);
  const [importSummary, setImportSummary] = useState("");

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.name || "");
      setBio(currentUser.bio || "");
      setAvatarPreview(currentUser.avatar || "");
    }
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    const validFormats = ["image/jpeg", "image/png", "image/webp"];
    if (!validFormats.includes(file.type)) {
      setErrorMsg("Invalid file format. Please upload JPG, PNG, or WEBP.");
      return;
    }

    setErrorMsg("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setSuccessMsg("");
    setImportSummary("");
    setMatchResult(null);
    setImportPhase("matching");

    try {
      const text = await file.text();
      const rows = parseGoodreadsCsv(text);
      if (rows.length === 0) {
        throw new Error("No readable shelves found (read / currently-reading / to-read).");
      }
      const result = await matchGoodreadsRows(rows.slice(0, 500));
      setMatchResult(result);
      setImportPhase("ready");
      if (result.matched.length === 0) {
        setErrorMsg("No books could be matched to the Leaf catalog or Open Library.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to parse Goodreads CSV";
      setErrorMsg(message);
      setImportPhase("idle");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!matchResult?.matched.length) return;
    if (!isAuthenticated && !session) {
      setErrorMsg("Sign in to import your Goodreads library.");
      return;
    }

    setImportPhase("importing");
    setErrorMsg("");
    try {
      const payload: MatchedImportBook[] = matchResult.matched;
      const result = await importLibraryBooks(payload);
      setImportPhase("done");
      setImportSummary(
        `Imported ${result.imported} new · updated ${result.updated}` +
          (result.errors.length ? ` · ${result.errors.length} failed` : "") +
          (matchResult.skipped.length ? ` · ${matchResult.skipped.length} skipped` : "")
      );
      setSuccessMsg("Goodreads library imported into your diary.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      setErrorMsg(message);
      setImportPhase("ready");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      let finalAvatarUrl = avatarPreview;

      if (avatarFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        reader.readAsDataURL(avatarFile);
        finalAvatarUrl = await base64Promise;
      }

      await updateProfile(
        displayName.trim() || "Reader",
        bio.trim(),
        finalAvatarUrl,
        currentUser.favoriteBookIds || []
      );

      setSuccessMsg("Settings saved successfully!");
      setAvatarFile(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      console.error("Failed to save settings:", err);
      setErrorMsg("An error occurred while saving your profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 space-y-6">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-muted hover:text-charcoal transition-colors group w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Profile</span>
        </Link>

        <section className="bg-cream-card border border-cream-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          <div className="border-b border-cream-border pb-4 space-y-1">
            <h1 className="font-serif text-2xl font-bold text-charcoal flex items-center gap-2">
              Account Settings <Sparkles className="w-5 h-5 text-brand" />
            </h1>
            <p className="text-xs text-charcoal-muted">
              Customize your public reading persona, biography details, and user profile image.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 shadow-xs animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 shadow-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-cream/40 border border-cream-border rounded-2xl">
              <div className="relative">
                <UserAvatar avatarUrl={avatarPreview} name={displayName} size="xl" className="shadow-md" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-brand text-cream hover:bg-brand-light rounded-full shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  title="Upload Image"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-charcoal">Profile Picture</p>
                  <p className="text-[10px] text-charcoal-muted leading-relaxed">
                    JPG, PNG or WEBP formats. Maximum image size of 5MB.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-4 border border-cream-border hover:border-charcoal hover:bg-cream-dark/30 rounded-lg text-[10px] font-bold text-charcoal transition-colors cursor-pointer"
                  >
                    Choose Photo
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="h-8 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rowan Archer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs bg-cream/40 border border-cream-border focus:border-brand-muted focus:bg-cream rounded-xl text-charcoal focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
                  Username (Fixed)
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser ? `@${currentUser.username}` : ""}
                  className="w-full h-10 px-3.5 text-xs bg-cream-dark/50 border border-cream-border rounded-xl text-charcoal-muted cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                  Short Biography
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell the community about your favorite authors, genres, or reading goals..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3.5 text-xs bg-cream/40 border border-cream-border focus:border-brand-muted focus:bg-cream rounded-xl text-charcoal focus:outline-none transition-all leading-relaxed placeholder-charcoal-muted"
                />
              </div>
            </div>

            <div className="border-t border-cream-border pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-6 bg-brand hover:bg-brand-light disabled:opacity-50 text-cream font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-cream-card border border-cream-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-charcoal flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand" />
              Import from Goodreads
            </h2>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Upload your Goodreads library export CSV to seed books you&apos;ve already read, are reading, or want to read — instead of starting from scratch.
            </p>
          </div>

          <div className="p-4 bg-cream/50 border border-cream-border rounded-xl space-y-3">
            <p className="text-[10px] text-charcoal-muted leading-relaxed">
              In Goodreads: My Books → Import and export → Export Library. We import exclusive shelves{" "}
              <span className="font-semibold text-charcoal">read</span>,{" "}
              <span className="font-semibold text-charcoal">currently-reading</span>, and{" "}
              <span className="font-semibold text-charcoal">to-read</span> only.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                disabled={importPhase === "matching" || importPhase === "importing"}
                className="h-9 px-4 bg-brand hover:bg-brand-light disabled:opacity-50 text-cream font-bold text-xs rounded-lg flex items-center gap-2 transition-colors"
              >
                {importPhase === "matching" ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Matching books…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Choose CSV
                  </>
                )}
              </button>
              {matchResult && matchResult.matched.length > 0 && importPhase !== "importing" && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="h-9 px-4 border border-brand text-brand hover:bg-brand hover:text-cream font-bold text-xs rounded-lg transition-colors"
                >
                  Import {matchResult.matched.length} matched
                </button>
              )}
            </div>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvChange}
              className="hidden"
            />
          </div>

          {matchResult && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-3 font-semibold text-charcoal">
                <span className="text-brand">Matched {matchResult.matched.length}</span>
                <span className="text-charcoal-muted">Skipped {matchResult.skipped.length}</span>
              </div>
              {importPhase === "importing" && (
                <p className="flex items-center gap-2 text-charcoal-muted">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  Importing into your diary…
                </p>
              )}
              {importSummary && <p className="text-emerald-700 font-medium">{importSummary}</p>}
              {matchResult.skipped.length > 0 && (
                <details className="rounded-lg border border-cream-border bg-cream/40 p-3">
                  <summary className="cursor-pointer font-semibold text-charcoal-muted">
                    Skipped titles ({matchResult.skipped.length})
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-[11px] text-charcoal-muted">
                    {matchResult.skipped.slice(0, 40).map((s, i) => (
                      <li key={`${s.title}-${i}`}>
                        <span className="text-charcoal">{s.title}</span>
                        {s.author ? ` — ${s.author}` : ""}{" "}
                        <span className="opacity-70">({s.reason})</span>
                      </li>
                    ))}
                    {matchResult.skipped.length > 40 && (
                      <li>…and {matchResult.skipped.length - 40} more</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
