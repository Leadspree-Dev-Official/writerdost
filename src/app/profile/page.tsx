"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/app-store";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";

const tones = TONES;

export default function ProfilePage() {
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
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

        <div className="h-28 md:h-36 rounded-[var(--radius-lg)] overflow-hidden relative group mb-[-2.5rem]">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-100 dark:from-[#1c1c2e] dark:via-[#141420] dark:to-[#0c0c14]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 to-transparent" />
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-4 right-4 bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-white transition-all shadow-lg z-20" 
            type="button"
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span>
            Change Cover
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4 px-8 relative z-10 w-full">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[var(--radius-lg)] border-4 border-surface overflow-hidden shadow-xl shadow-on-surface/10 bg-surface-container flex items-center justify-center">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-slate-500">{profile.fullName.slice(0, 1)}</span>
              )}
            </div>
            <button 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 bg-on-surface/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[var(--radius-lg)] cursor-pointer" 
              type="button"
            >
              <span className="material-symbols-outlined text-white text-3xl">upload</span>
            </button>
          </div>
          <div className="flex-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-on-surface">{profile.fullName}</h1>
            <p className="text-on-surface-variant font-medium">{profile.tagline}</p>
          </div>
          <div className="flex gap-3 mb-2">
            <button className="px-6 py-2.5 rounded-[var(--radius)] border border-outline-variant/30 text-sm font-bold hover:bg-surface-container-low transition-all" type="button">
              Preview Profile
            </button>
            <button
              className="px-6 py-2.5 rounded-[var(--radius)] bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-bold shadow-lg shadow-primary/20"
              onClick={() => setMessage("Profile preferences saved. Future projects will use these defaults.")}
              type="button"
            >
              Save Changes
            </button>
          </div>
        </div>
      </section>

      {message ? <div className="mb-4 rounded-[var(--radius-lg)] bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">{message}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full">
        <div className="lg:col-span-7 space-y-8 w-full">
          <div className="bg-surface-container-lowest rounded-[2rem] p-4 shadow-sm border border-outline-variant/10">
            <h2 className="text-sm font-semibold text-on-surface-variant mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">history_edu</span>
              Professional Bio
            </h2>
            <div className="bg-surface-container-low rounded-[var(--radius)] p-4 border-2 border-transparent focus-within:border-primary/20 transition-all">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg leading-relaxed text-on-surface font-body resize-y outline-none min-h-[250px]"
                placeholder="Write your editorial bio here..."
                value={profile.bio || ""}
                onChange={(event) => updateProfile({ bio: event.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-tighter rounded-full">
                AI Suggested Tone: {profile.defaultTone}
              </span>
              <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter rounded-full">
                Word count: {profile.bio.split(/\s+/).filter(Boolean).length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10">
              <label className="text-[10px] font-semibold text-primary mb-2 block">Full Name</label>
              <input className="w-full bg-surface-container-low border-none rounded-[var(--radius)] py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold outline-none" type="text" value={profile.fullName || ""} onChange={(event) => updateProfile({ fullName: event.target.value })} />
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10">
              <label className="text-[10px] font-semibold text-primary mb-2 block">Pen Name</label>
              <input className="w-full bg-surface-container-low border-none rounded-[var(--radius)] py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold outline-none" placeholder="Optional" type="text" value={profile.penName || ""} onChange={(event) => updateProfile({ penName: event.target.value })} />
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10 md:col-span-2">
              <label className="text-[10px] font-semibold text-primary mb-2 block">Professional Tagline</label>
              <input className="w-full bg-surface-container-low border-none rounded-[var(--radius)] py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold outline-none" placeholder="e.g. Bestselling Sci-Fi & Technology Author" type="text" value={profile.tagline || ""} onChange={(event) => updateProfile({ tagline: event.target.value })} />
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10">
              <label className="text-[10px] font-semibold text-primary mb-2 block">Email Address</label>
              <input className="w-full bg-surface-container-low border-none rounded-[var(--radius)] py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold outline-none" type="email" value={profile.email || ""} onChange={(event) => updateProfile({ email: event.target.value })} />
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10">
              <label className="text-[10px] font-semibold text-primary mb-2 block">Website</label>
              <input className="w-full bg-surface-container-low border-none rounded-[var(--radius)] py-3 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold outline-none" type="text" value={profile.website || ""} onChange={(event) => updateProfile({ website: event.target.value })} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8 w-full">
          <div className="bg-surface-container-low rounded-[2rem] p-4 border border-outline-variant/20 sticky top-24">
            <h2 className="text-sm font-semibold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
              Ebook Defaults
            </h2>
            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant block mb-4">Default Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      className={
                        profile.defaultTone === tone
                          ? "flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-[var(--radius)] text-xs font-bold transition-all shadow-md shadow-primary/20 scale-[1.05]"
                          : "flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface-variant rounded-[var(--radius)] text-xs font-bold hover:bg-outline-variant/20 transition-all"
                      }
                      onClick={() => updateProfile({ defaultTone: tone })}
                      title={`${TONE_GUIDE[tone].objective}\n\nRules: ${TONE_GUIDE[tone].execution}`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {TONE_GUIDE[tone].icon}
                      </span>
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Default Ebook Length</label>
                  <span className="text-xs font-bold text-primary">~{profile.defaultLength.toLocaleString()} Words</span>
                </div>
                <input className="w-full h-2 bg-surface-container-highest rounded-[var(--radius)] appearance-none cursor-pointer accent-primary" max="50000" min="5000" step="1000" type="range" value={profile.defaultLength || 10000} onChange={(event) => updateProfile({ defaultLength: Number(event.target.value) })} />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                  <span>Novella</span>
                  <span>Standard</span>
                  <span>Epic</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block mb-4">Editorial Rules</label>
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-[var(--radius)]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">translate</span>
                    <span className="text-sm font-semibold">{profile.language}</span>
                  </div>
                  <select 
                    className="bg-transparent text-sm outline-none cursor-pointer max-w-[150px] appearance-none text-right pr-4" 
                    value={profile.language || "English (India)"} 
                    onChange={(event) => updateProfile({ language: event.target.value })}
                  >
                    <optgroup label="India Specific">
                      <option value="English (India)">English (India)</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Odia">Odia</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Punjabi">Punjabi</option>
                      <option value="Assamese">Assamese</option>
                    </optgroup>
                    <optgroup label="Global / International">
                      <option value="American English">American English</option>
                      <option value="British English">British English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Italian">Italian</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Russian">Russian</option>
                      <option value="Chinese (Simplified)">Chinese (Simplified)</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Korean">Korean</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Turkish">Turkish</option>
                    </optgroup>
                  </select>
                </div>
                <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-[var(--radius)] w-full" onClick={() => updateProfile({ autoPunctuation: !profile.autoPunctuation })} type="button">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">auto_fix_high</span>
                    <span className="text-sm font-semibold">AI Auto-Punctuation</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer ${profile.autoPunctuation ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`w-3 h-3 bg-surface rounded-full absolute top-1 shadow-sm ${profile.autoPunctuation ? "right-1" : "left-1"}`} />
                  </div>
                </button>
                <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-[var(--radius)] w-full" onClick={() => updateProfile({ autoSave: !profile.autoSave })} type="button">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">history</span>
                    <span className="text-sm font-semibold">Chapter Auto-Save</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer ${profile.autoSave ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`w-3 h-3 bg-surface rounded-full absolute top-1 shadow-sm ${profile.autoSave ? "right-1" : "left-1"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 bg-surface-container-lowest rounded-[2rem] p-5 shadow-sm border border-outline-variant/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <h3 className="display-sm text-3xl font-semibold tracking-tight text-on-surface mb-4">The Editorial Identity</h3>
          <p className="text-on-surface-variant font-body leading-relaxed mb-4">
            This profile now drives your default tone, writing rules, and save behavior throughout the app.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold">Public Profile Online</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
              <span className="text-xs font-bold">Premium Account</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
