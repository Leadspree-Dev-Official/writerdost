/* eslint-disable @next/next/no-img-element -- avatar and cover are data:
   URIs produced by FileReader; next/image cannot optimise those and would
   need `unoptimized`, which is just a heavier <img>. */
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";

export default function ProfilePage() {
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const saveWorkspaceNow = useAppStore((state) => state.saveWorkspaceNow);
  const workspaceSaving = useAppStore((state) => state.workspaceSaving);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "avatar") {
          updateProfile({ avatarUrl: reader.result as string });
        } else {
          updateProfile({ coverUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page">
      <section className="mb-5 relative w-full">
        <input 
          type="file" 
          ref={coverInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, "cover")} 
        />
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, "avatar")} 
        />

        {/* Identity strip: cover as a thin band, the rest on one row */}
        <div className="panel overflow-hidden">
          <div className="h-16 relative group">
            {profile.coverUrl ? (
              <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 dark:bg-primary/[0.12]" />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="btn btn-secondary btn-sm absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">photo_camera</span>
              Cover
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-3">
            <div className="relative group shrink-0 -mt-8">
              <div className="w-14 h-14 rounded-[var(--radius-lg)] border-2 border-surface overflow-hidden bg-surface-container flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[20px] font-semibold text-on-surface-variant">
                    {(profile.fullName ? profile.fullName.slice(0, 1) : "A").toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute inset-0 bg-on-surface/50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-[var(--radius-lg)] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-white text-[17px]">upload</span>
              </button>
            </div>

            <div className="min-w-0 flex-1 basis-40">
              <h1 className="text-[17px] font-semibold tracking-[-0.017em] text-on-surface truncate">
                {profile.fullName || "Your Name"}
              </h1>
              <p className="text-[12.5px] text-on-surface-variant truncate">{profile.tagline || "Author & Writer"}</p>
            </div>

            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <button className="btn btn-secondary btn-lg flex-1 sm:flex-none" type="button">
                Preview
              </button>
              <button
                className={`btn btn-primary btn-lg flex-1 sm:flex-none min-w-[135px] flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  saveStatus === "saved"
                    ? "!bg-emerald-600 hover:!bg-emerald-500 !text-white border-transparent"
                    : saveStatus === "error"
                    ? "!bg-rose-600 hover:!bg-rose-500 !text-white border-transparent"
                    : ""
                }`}
                onClick={async () => {
                  setSaveStatus("saving");
                  try {
                    await saveWorkspaceNow(true);
                    const currentError = useAppStore.getState().workspaceError;
                    if (currentError) {
                      setSaveStatus("error");
                      setMessage(`Save failed: ${currentError}`);
                      setTimeout(() => setSaveStatus("idle"), 4000);
                    } else {
                      setSaveStatus("saved");
                      setMessage("Profile preferences saved. Future projects will use these defaults.");
                      setTimeout(() => setSaveStatus("idle"), 2500);
                    }
                  } catch (err) {
                    setSaveStatus("error");
                    setMessage(err instanceof Error ? err.message : "Failed to save profile.");
                    setTimeout(() => setSaveStatus("idle"), 4000);
                  }
                }}
                disabled={saveStatus === "saving" || workspaceSaving}
                type="button"
              >
                {saveStatus === "saving" || (workspaceSaving && saveStatus !== "saved") ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Saving…</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Saved!</span>
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>Failed</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {message ? <p role="status" className="mb-4 px-3 py-2 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/25 text-[12.5px] text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full">
        {/* Author details: one form, not a field per card */}
        <div className="lg:col-span-7 w-full min-w-0">
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Author details</span>
            </div>

            <div className="panel-pad grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label htmlFor="pf-name" className="label">Full name</label>
                <input
                  id="pf-name"
                  className="input"
                  type="text"
                  placeholder="Aniruddha Das"
                  value={profile.fullName || ""}
                  onChange={(event) => updateProfile({ fullName: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="pf-pen" className="label">Pen name</label>
                <input
                  id="pf-pen"
                  className="input"
                  placeholder="e.g. Julian Thorne (optional)"
                  type="text"
                  value={profile.penName || ""}
                  onChange={(event) => updateProfile({ penName: event.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="pf-tagline" className="label">Tagline</label>
                <input
                  id="pf-tagline"
                  className="input"
                  placeholder="Bestselling Sci-Fi & Technology Author"
                  type="text"
                  value={profile.tagline || ""}
                  onChange={(event) => updateProfile({ tagline: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="pf-email" className="label">Email</label>
                <input
                  id="pf-email"
                  className="input"
                  type="email"
                  placeholder="aniruddha@example.com"
                  value={profile.email || ""}
                  onChange={(event) => updateProfile({ email: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="pf-web" className="label">Website</label>
                <input
                  id="pf-web"
                  className="input"
                  type="url"
                  placeholder="https://www.julianthorne.com"
                  value={profile.website || ""}
                  onChange={(event) => updateProfile({ website: event.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="pf-bio" className="label !mb-0">Bio</label>
                  <span className="row-meta">
                    {(profile.bio || "").split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  id="pf-bio"
                  className="textarea mt-1.5 min-h-[9.5rem] leading-relaxed p-3 text-[14px]"
                  placeholder="Julian Thorne is a visionary author exploring the intersection of human consciousness and artificial intelligence. Having spent over a decade researching computational neuroscience and speculative philosophy..."
                  value={profile.bio || ""}
                  onChange={(event) => updateProfile({ bio: event.target.value })}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Defaults applied to new projects */}
        <div className="lg:col-span-5 w-full min-w-0">
          <section className="panel rail overflow-hidden lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
            <div className="panel-head">
              <span className="panel-title">Ebook defaults</span>
            </div>

            <div className="rail-section">
              <p className="rail-title">Default tone</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    className="tile"
                    data-selected={profile.defaultTone === tone}
                    aria-pressed={profile.defaultTone === tone}
                    onClick={() => updateProfile({ defaultTone: tone })}
                    title={`${TONE_GUIDE[tone].objective}\n\n${TONE_GUIDE[tone].execution}`}
                    type="button"
                  >
                    <span className="tile-name">
                      <span className="material-symbols-outlined text-[15px]">
                        {TONE_GUIDE[tone].icon}
                      </span>
                      {tone}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rail-section">
              <div className="flex items-baseline justify-between">
                <label htmlFor="pf-length" className="label !mb-0">Default length</label>
                <span className="text-[12px] font-semibold text-on-surface num">
                  {profile.defaultLength.toLocaleString()} words
                </span>
              </div>
              <input
                id="pf-length"
                className="w-full h-1 mt-2 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                max="50000"
                min="5000"
                step="1000"
                type="range"
                value={profile.defaultLength || 10000}
                onChange={(event) => updateProfile({ defaultLength: Number(event.target.value) })}
              />
              <div className="flex justify-between mt-1.5 text-[11px] text-on-surface-variant">
                <span>5k</span>
                <span>50k</span>
              </div>
            </div>

            <div className="rail-section">
              <p className="rail-title">Editorial rules</p>
              <p className="text-[12px] text-on-surface-variant">
                Writing language, auto-save and auto-punctuation are workspace-wide, so they moved to{" "}
                <Link href="/settings?tab=application" className="text-primary font-semibold hover:underline">
                  Settings → Application
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>

      <p className="mt-4 text-[12.5px] text-on-surface-variant">
        These preferences drive the default tone, writing rules and save behaviour across the app.
      </p>
    </div>
  );
}
