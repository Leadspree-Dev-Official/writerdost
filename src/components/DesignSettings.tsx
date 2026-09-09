"use client";

import React, { useState } from "react";
import { useAppStore, ProjectDesignSettings } from "@/lib/app-store";

interface DesignSettingsProps {
  projectId: string;
}

const FONT_SIZES = [
  "12px", "13px", "14px", "15px", "16px", "18px", "20px", "22px", 
  "24px", "26px", "28px", "30px", "32px", "36px", "40px", "44px", 
  "48px", "56px", "64px", "72px"
];

const LINE_HEIGHTS = [
  "1.0", "1.15", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0", "2.5"
];

const SPACINGS = [
  "0px", "2px", "4px", "6px", "8px", "10px", "12px", "16px", "20px", "24px", "32px"
];

const FONT_FIELDS: { key: keyof ProjectDesignSettings; label: string; tag: string }[] = [
  { key: "h1Size", label: "Book Title", tag: "H1" },
  { key: "h2Size", label: "Chapter Title", tag: "H2" },
  { key: "h3Size", label: "Topic", tag: "H3" },
  { key: "h4Size", label: "Sub-topic", tag: "H4" },
  { key: "pSize", label: "Body Text", tag: "P" },
];

const DEFAULTS: ProjectDesignSettings = {
  h1Size: "48px",
  h2Size: "32px",
  h3Size: "24px",
  h4Size: "20px",
  pSize: "16px",
  lineHeight: "1.6",
  paragraphBefore: "0px",
  paragraphAfter: "12px",
};

export const DesignSettings: React.FC<DesignSettingsProps> = ({ projectId }) => {
  const { projects, updateProjectDesign } = useAppStore();
  const project = projects.find((p) => p.id === projectId);
  const [isOpen, setIsOpen] = useState(false);

  if (!project) return null;

  const settings: ProjectDesignSettings = { ...DEFAULTS, ...project.designSettings };

  const handleChange = (key: keyof ProjectDesignSettings, value: string) => {
    updateProjectDesign(projectId, { ...settings, [key]: value });
  };

  return (
    <div className="rounded-2xl border border-outline-variant/10 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">text_fields</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Typography & Spacing</span>
        </div>
        <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {/* Collapsible Body */}
      {isOpen && (
        <div className="px-4 py-4 space-y-5 bg-surface-container-highest/10">
          {/* Font Sizes Section */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Font Sizes</p>
            <div className="space-y-2.5">
              {FONT_FIELDS.map(({ key, label, tag }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                    {label} <span className="text-slate-500/60 font-normal">({tag})</span>
                  </label>
                  <select 
                    value={settings[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-[76px] bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 text-[11px] font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                  >
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Spacing Section */}
          <div className="border-t border-outline-variant/10 pt-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Spacing</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-slate-500">format_line_spacing</span>
                  Line Height
                </label>
                <select 
                  value={settings.lineHeight}
                  onChange={(e) => handleChange("lineHeight", e.target.value)}
                  className="w-[76px] bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 text-[11px] font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                >
                  {LINE_HEIGHTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-slate-500">vertical_align_top</span>
                  Before ¶
                </label>
                <select 
                  value={settings.paragraphBefore}
                  onChange={(e) => handleChange("paragraphBefore", e.target.value)}
                  className="w-[76px] bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 text-[11px] font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                >
                  {SPACINGS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-slate-500">vertical_align_bottom</span>
                  After ¶
                </label>
                <select 
                  value={settings.paragraphAfter}
                  onChange={(e) => handleChange("paragraphAfter", e.target.value)}
                  className="w-[76px] bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 text-[11px] font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                >
                  {SPACINGS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-slate-500 italic pt-1">
            Changes reflect on canvas & exports.
          </p>
        </div>
      )}
    </div>
  );
};
