"use client";

import React, { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import UserAvatar from "@/components/UserAvatar";
import { useLeaf } from "@/context/LeafContext";
import { Camera, Trash2, Check, AlertCircle, ArrowLeft, Sparkles, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const { currentUser, updateProfile, session } = useLeaf();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate size (max 5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    // Validate format
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      let finalAvatarUrl = avatarPreview;

      // Handle avatar image upload (stored as data URL via profile API)
      if (avatarFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        reader.readAsDataURL(avatarFile);
        finalAvatarUrl = await base64Promise;
      }

      // Sync settings to context & database/local storage
      await updateProfile(
        displayName.trim() || "Reader",
        bio.trim(),
        finalAvatarUrl,
        currentUser.favoriteBookIds || []
      );

      setSuccessMsg("Settings saved successfully!");
      setAvatarFile(null);
      
      // Auto dismiss success toast after 3s
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
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
        
        {/* Back navigation link */}
        <Link 
          href="/profile" 
          className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-muted hover:text-charcoal transition-colors group w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Profile</span>
        </Link>

        {/* Card Panel */}
        <section className="bg-cream-card border border-cream-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          
          <div className="border-b border-cream-border pb-4 space-y-1">
            <h1 className="font-serif text-2xl font-bold text-charcoal flex items-center gap-2">
              Account Settings <Sparkles className="w-5 h-5 text-brand" />
            </h1>
            <p className="text-xs text-charcoal-muted">
              Customize your public reading persona, biography details, and user profile image.
            </p>
          </div>

          {/* Success / Error Alerts */}
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
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-cream/40 border border-cream-border rounded-2xl">
              
              {/* Profile Avatar rendering */}
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

              {/* Action buttons */}
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

            {/* General Fields */}
            <div className="space-y-5">
              
              {/* Display Name */}
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

              {/* Username (ReadOnly) */}
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

              {/* Bio */}
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

            {/* Save Button */}
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
      </main>
    </div>
  );
}
