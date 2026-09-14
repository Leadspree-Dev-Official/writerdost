"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FontCategory,
  FontOption,
  getAllFonts,
  loadGoogleFont,
  addCustomFont,
  removeCustomFont,
} from "@/lib/fonts";

interface FontLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFont: (font: FontOption) => void;
  activeFontId?: string;
}

const CATEGORIES: { id: "All" | FontCategory; label: string }[] = [
  { id: "All", label: "All Fonts" },
  { id: "Serif", label: "Serif" },
  { id: "Sans", label: "Sans-Serif" },
  { id: "Display", label: "Display" },
  { id: "Handwriting", label: "Handwriting" },
  { id: "Monospace", label: "Monospace" },
  { id: "System", label: "System Safe" },
  { id: "Custom", label: "Custom" },
];

export default function FontLibraryModal({
  isOpen,
  onClose,
  onSelectFont,
  activeFontId,
}: FontLibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<"All" | FontCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customFontInput, setCustomFontInput] = useState("");
  const [customFontStatus, setCustomFontStatus] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [fontsList, setFontsList] = useState<FontOption[]>([]);

  // Refresh list on open or change
  useEffect(() => {
    if (isOpen) {
      setFontsList(getAllFonts());
    }
  }, [isOpen]);

  const filteredFonts = useMemo(() => {
    return fontsList.filter((font) => {
      const matchesCategory =
        selectedCategory === "All" ? true : font.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        font.label.toLowerCase().includes(q) ||
        font.category.toLowerCase().includes(q) ||
        font.note.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [fontsList, selectedCategory, searchQuery]);

  // Preload visible fonts when browsing
  useEffect(() => {
    if (!isOpen) return;
    const slice = filteredFonts.slice(0, 20);
    slice.forEach((font) => {
      if (font.isGoogleFont) {
        loadGoogleFont(font.family);
      }
    });
  }, [isOpen, filteredFonts]);

  if (!isOpen) return null;

  const handleAddCustomFont = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customFontInput.trim();
    if (!clean) return;

    try {
      const added = addCustomFont(clean);
      setFontsList(getAllFonts());
      setSelectedCategory("Custom");
      setCustomFontInput("");
      setCustomFontStatus(`Added "${added.label}"! Loaded from Google Fonts.`);
      setTimeout(() => setCustomFontStatus(null), 4000);
      onSelectFont(added);
    } catch (err) {
      setCustomFontStatus(err instanceof Error ? err.message : "Failed to add font");
    }
  };

  const handleRemoveCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomFont(id);
    setFontsList(getAllFonts());
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-2xl border border-outline-variant/15 flex flex-col overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">font_download</span>
            <div>
              <h2 className="text-base font-bold tracking-tight">Typeface & Font Library</h2>
              <p className="text-[12px] text-on-surface-variant">
                100+ curated typefaces for manuscripts, books, and blog drafts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Close modal"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Top Controls: Search & Custom Font Importer */}
        <div className="px-6 py-3 bg-surface-container-low/40 dark:bg-slate-800/40 border-b border-outline-variant/10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Search 100+ fonts by name, style, or vibe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/15 rounded-xl pl-9 pr-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Custom Google Font Input */}
          <form onSubmit={handleAddCustomFont} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter ANY Google Font name..."
              value={customFontInput}
              onChange={(e) => setCustomFontInput(e.target.value)}
              className="w-48 sm:w-56 bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/15 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!customFontInput.trim()}
              className="btn btn-primary btn-sm whitespace-nowrap !py-2 !h-auto text-xs"
              title="Import and load this font from Google Fonts"
            >
              + Import
            </button>
          </form>
        </div>

        {customFontStatus && (
          <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border-b border-emerald-200/50">
            {customFontStatus}
          </div>
        )}

        {/* Category Tabs & Sample Text customizer */}
        <div className="px-6 pt-3 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/10">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span>Preview text:</span>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Sphinx of black quartz, judge my vow."
              className="bg-transparent border-b border-outline-variant/30 px-1 py-0.5 text-xs text-on-surface focus:outline-none focus:border-primary max-w-[200px]"
            />
          </div>
        </div>

        {/* Font Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[300px]">
          {filteredFonts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
              <p className="text-sm font-semibold">No fonts found matching &quot;{searchQuery}&quot;</p>
              <p className="text-xs mt-1">
                You can import it directly by typing the name into the &quot;Enter ANY Google Font name&quot; box above!
              </p>
            </div>
          ) : (
            filteredFonts.map((font) => {
              const isActive = activeFontId === font.id || activeFontId === font.family;
              return (
                <div
                  key={font.id}
                  onClick={() => {
                    if (font.isGoogleFont) loadGoogleFont(font.family);
                    onSelectFont(font);
                  }}
                  onMouseEnter={() => {
                    if (font.isGoogleFont) loadGoogleFont(font.family);
                  }}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                      : "border-outline-variant/15 hover:border-primary/40 hover:bg-surface-container-low/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-on-surface">{font.label}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant uppercase tracking-wider">
                          {font.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                        {font.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {font.category === "Custom" && (
                        <button
                          onClick={(e) => handleRemoveCustom(font.id, e)}
                          className="text-[11px] text-rose-500 hover:text-rose-700 p-1"
                          title="Remove custom font"
                          type="button"
                        >
                          ✕
                        </button>
                      )}
                      {isActive && (
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          check_circle
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Typographic Specimen */}
                  <div
                    className="mt-2 p-3 rounded-lg bg-surface-container-lowest dark:bg-slate-950/60 border border-outline-variant/10 text-on-surface"
                    style={{ fontFamily: font.stack }}
                  >
                    <p className="text-[17px] leading-snug line-clamp-2">
                      {sampleText || "Sphinx of black quartz, judge my vow."}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant/70 font-mono text-[10px] truncate max-w-[180px]">
                      {font.family}
                    </span>
                    <button
                      type="button"
                      className={`font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-primary group-hover:bg-primary group-hover:text-white"
                      }`}
                    >
                      {isActive ? "Selected" : "Use Font"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-outline-variant/10 bg-surface-container-low/40 dark:bg-slate-800/40 flex items-center justify-between text-xs text-on-surface-variant">
          <div>
            Showing <strong className="text-on-surface">{filteredFonts.length}</strong> fonts.
            Explore 1,600+ more at{" "}
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              fonts.google.com
            </a>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="btn btn-secondary btn-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
