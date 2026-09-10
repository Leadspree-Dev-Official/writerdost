"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

const LANGUAGE_GROUPS: Array<{ label: string; options: string[] }> = [
  {
    label: "India",
    options: [
      "English (India)",
      "Hindi",
      "Bengali",
      "Telugu",
      "Marathi",
      "Tamil",
      "Gujarati",
      "Urdu",
      "Kannada",
      "Odia",
      "Malayalam",
      "Punjabi",
      "Assamese",
    ],
  },
  {
    label: "International",
    options: [
      "American English",
      "British English",
      "Spanish",
      "French",
      "German",
      "Italian",
      "Portuguese",
      "Russian",
      "Chinese (Simplified)",
      "Japanese",
      "Korean",
      "Arabic",
      "Turkish",
    ],
  },
];

/**
 * Settings → Application. Preferences that apply to the whole workspace rather
 * than to one project: appearance, editor behaviour and the writing rules every
 * generation inherits. The author's identity stays on the Profile page.
 */
export function ApplicationTab() {
  const profile = useAppStore((state) => state.profile);
  const settings = useAppStore((state) => state.settings);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const projects = useAppStore((state) => state.projects);
  const currentUser = useAppStore((state) => state.currentUser);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const resetUsage = useAppStore((state) => state.resetUsage);

  const [message, setMessage] = useState("");

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-[var(--radius-lg)] p-4 text-sm bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-4 items-start">
        <div className="min-w-0 space-y-3">
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Appearance</span>
            </div>
            <div className="panel-pad space-y-2">
              <div className="setting">
                <span className="setting-label">Dark theme</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="Dark theme"
                  className="switch"
                  data-on={isDarkMode}
                  onClick={toggleDarkMode}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="app-font" className="label !mb-0">Editor font size</label>
                  <span className="text-[12px] font-semibold text-on-surface num">{settings.fontSize}px</span>
                </div>
                <input
                  id="app-font"
                  className="w-full h-1 mt-2 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                  max="28"
                  min="14"
                  step="1"
                  type="range"
                  value={settings.fontSize || 20}
                  onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })}
                />
                <p className="hint">Applies to the manuscript editor, not to exports.</p>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Editor behaviour</span>
            </div>
            <div className="panel-pad space-y-2">
              <div className="setting">
                <span className="setting-label">Chapter auto-save</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.autoSave}
                  aria-label="Chapter auto-save"
                  className="switch"
                  data-on={profile.autoSave}
                  onClick={() => updateProfile({ autoSave: !profile.autoSave })}
                />
              </div>
              <div className="setting">
                <span className="setting-label">AI auto-punctuation</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.autoPunctuation}
                  aria-label="AI auto-punctuation"
                  className="switch"
                  data-on={profile.autoPunctuation}
                  onClick={() => updateProfile({ autoPunctuation: !profile.autoPunctuation })}
                />
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Writing language</span>
            </div>
            <div className="panel-pad">
              <label htmlFor="app-lang" className="label">Language</label>
              <select
                id="app-lang"
                className="select md:max-w-xs"
                value={profile.language || "English (India)"}
                onChange={(event) => updateProfile({ language: event.target.value })}
              >
                {LANGUAGE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="hint">
                Every agent drafts, rewrites and translates in this language unless a project overrides it.
              </p>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Workspace data</span>
              <span className="row-meta">Stored in this browser</span>
            </div>
            <div className="panel-pad space-y-3">
              <p className="text-[12.5px] text-on-surface-variant">
                Projects, keys and usage all live in this browser&rsquo;s local storage. Clearing site data removes
                them, and nothing syncs to another device.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (confirm("Reset all usage data?")) {
                      resetUsage();
                      setMessage("Usage counters reset.");
                    }
                  }}
                >
                  <span className="material-symbols-outlined">restart_alt</span>
                  Reset usage counters
                </button>
                <Link href="/profile" className="btn btn-ghost">
                  <span className="material-symbols-outlined">account_circle</span>
                  Author profile
                </Link>
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="panel panel-pad space-y-3">
            <h3 className="section-title">Workspace</h3>
            <dl className="space-y-0.5">
              <div className="kv">
                <dt>Signed in as</dt>
                <dd className="truncate">{currentUser?.fullName ?? "—"}</dd>
              </div>
              <div className="kv">
                <dt>Plan</dt>
                <dd>{currentUser?.role === "admin" ? "Admin" : currentUser?.plan ?? "—"}</dd>
              </div>
              <div className="kv">
                <dt>Projects</dt>
                <dd>{projects.length}</dd>
              </div>
              <div className="kv">
                <dt>Theme</dt>
                <dd>{isDarkMode ? "Dark" : "Light"}</dd>
              </div>
            </dl>
          </div>

          <div className="panel panel-pad">
            <p className="rail-title">Elsewhere</p>
            <ul className="space-y-1.5 text-[12px] text-on-surface-variant">
              <li>· Pen name, bio and ebook defaults → Profile</li>
              <li>· Per-project fonts and spacing → Editor</li>
              <li>· Users and plans → Admin</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
