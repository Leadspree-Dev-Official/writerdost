"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/app-store";

interface CoverStudioModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export type CoverTheme =
  | "cosmic"
  | "minimal"
  | "prestige"
  | "cyber"
  | "literary"
  | "executive";

interface PresetConfig {
  id: CoverTheme;
  name: string;
  bgGradStart: string;
  bgGradEnd: string;
  textColor: string;
  accentColor: string;
  subtitleColor: string;
  fontType: "serif" | "sans" | "display";
  borderStyle: "frame" | "minimal" | "none" | "ornament";
}

const PRESETS: PresetConfig[] = [
  {
    id: "cosmic",
    name: "Cosmic Galaxy",
    bgGradStart: "#070714",
    bgGradEnd: "#1a1638",
    textColor: "#ffffff",
    accentColor: "#fbbf24",
    subtitleColor: "#cbd5e1",
    fontType: "display",
    borderStyle: "frame",
  },
  {
    id: "prestige",
    name: "Golden Prestige",
    bgGradStart: "#091224",
    bgGradEnd: "#030712",
    textColor: "#fef08a",
    accentColor: "#eab308",
    subtitleColor: "#e2e8f0",
    fontType: "serif",
    borderStyle: "ornament",
  },
  {
    id: "minimal",
    name: "Modern Minimalist",
    bgGradStart: "#f8fafc",
    bgGradEnd: "#e2e8f0",
    textColor: "#0f172a",
    accentColor: "#4f46e5",
    subtitleColor: "#475569",
    fontType: "sans",
    borderStyle: "minimal",
  },
  {
    id: "cyber",
    name: "Cyber Thriller",
    bgGradStart: "#09090b",
    bgGradEnd: "#2e1065",
    textColor: "#38bdf8",
    accentColor: "#f43f5e",
    subtitleColor: "#94a3b8",
    fontType: "display",
    borderStyle: "frame",
  },
  {
    id: "executive",
    name: "Executive Leader",
    bgGradStart: "#062820",
    bgGradEnd: "#02120e",
    textColor: "#ffffff",
    accentColor: "#10b981",
    subtitleColor: "#a7f3d0",
    fontType: "sans",
    borderStyle: "frame",
  },
  {
    id: "literary",
    name: "Warm Literary",
    bgGradStart: "#3b1111",
    bgGradEnd: "#150404",
    textColor: "#fef3c7",
    accentColor: "#d97706",
    subtitleColor: "#fde68a",
    fontType: "serif",
    borderStyle: "ornament",
  },
];

export const CoverStudioModal: React.FC<CoverStudioModalProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const projects = useAppStore((state) => state.projects);
  const setProjectCover = useAppStore((state) => state.setProjectCover);
  const profile = useAppStore((state) => state.profile);

  const project = projects.find((p) => p.id === projectId);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTheme, setActiveTheme] = useState<CoverTheme>("cosmic");
  const [title, setTitle] = useState(() => project?.title || "Untitled Masterpiece");
  const [subtitle, setSubtitle] = useState(
    () =>
      project?.description?.slice(0, 70) ||
      "A Comprehensive Guide to Modern Publishing",
  );
  const [author, setAuthor] = useState(
    () => profile?.penName || profile?.fullName || "Writerdost Author",
  );
  const [badgeText, setBadgeText] = useState("DEFINITIVE EDITION");
  const [customAccent, setCustomAccent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [prevProjectId, setPrevProjectId] = useState(projectId);

  if (prevProjectId !== projectId) {
    setPrevProjectId(projectId);
    if (project) {
      setTitle(project.title || "Untitled Masterpiece");
      setSubtitle(
        project.description?.slice(0, 70) ||
          "A Comprehensive Guide to Modern Publishing",
      );
      setAuthor(profile?.penName || profile?.fullName || "Writerdost Author");
    }
  }

  const preset = PRESETS.find((p) => p.id === activeTheme) || PRESETS[0];
  const accentColor = customAccent || preset.accentColor;

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard high-res Kindle portrait cover dimensions (1:1.6 aspect ratio)
    const width = 800;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width * 0.4, height);
    gradient.addColorStop(0, preset.bgGradStart);
    gradient.addColorStop(1, preset.bgGradEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Cosmic Ambient Stars or Geometric Accents
    if (preset.id === "cosmic" || preset.id === "cyber") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      // Seeded random stars
      for (let i = 0; i < 90; i++) {
        const x = (Math.sin(i * 12.345) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 67.891) * 0.5 + 0.5) * height;
        const r = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Atmospheric Glow
      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.38,
        50,
        width * 0.5,
        height * 0.38,
        width * 0.65,
      );
      glow.addColorStop(
        0,
        preset.id === "cyber" ? "rgba(168, 85, 247, 0.25)" : "rgba(79, 70, 229, 0.3)",
      );
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Borders & Frames
    ctx.save();
    if (preset.borderStyle === "frame") {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(48, 48, width - 96, height - 96);
    } else if (preset.borderStyle === "ornament") {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, width - 100, height - 100);

      // Corner flourishes
      const corner = 24;
      ctx.lineWidth = 5;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(35, 50 + corner);
      ctx.lineTo(35, 35);
      ctx.lineTo(50 + corner, 35);
      ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(width - 35, 50 + corner);
      ctx.lineTo(width - 35, 35);
      ctx.lineTo(width - (50 + corner), 35);
      ctx.stroke();
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(35, height - (50 + corner));
      ctx.lineTo(35, height - 35);
      ctx.lineTo(50 + corner, height - 35);
      ctx.stroke();
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(width - 35, height - (50 + corner));
      ctx.lineTo(width - 35, height - 35);
      ctx.lineTo(width - (50 + corner), height - 35);
      ctx.stroke();
    } else if (preset.borderStyle === "minimal") {
      ctx.fillStyle = accentColor;
      ctx.fillRect(40, 40, 6, height - 80);
    }
    ctx.restore();

    // 4. Badge / Tagline Pill
    if (badgeText.trim()) {
      ctx.save();
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const badgeY = 130;
      const metrics = ctx.measureText(badgeText.toUpperCase());
      const pillWidth = metrics.width + 40;
      const pillHeight = 32;

      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.roundRect(
        width / 2 - pillWidth / 2,
        badgeY - pillHeight / 2,
        pillWidth,
        pillHeight,
        16,
      );
      ctx.fill();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.fillText(badgeText.toUpperCase(), width / 2, badgeY + 1);
      ctx.restore();
    }

    // 5. Main Title (Supports multi-line auto-wrap)
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let titleFontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    if (preset.fontType === "serif") {
      titleFontFamily = "Georgia, Cambria, 'Times New Roman', serif";
    } else if (preset.fontType === "display") {
      titleFontFamily = "Impact, 'Arial Black', -apple-system, sans-serif";
    }

    ctx.font = `bold 64px ${titleFontFamily}`;
    ctx.fillStyle = preset.textColor;

    // Text Wrap logic
    const words = (title || "Book Title").toUpperCase().split(" ");
    const lines: string[] = [];
    let currentLine = "";
    const maxWidth = width - 160;

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 78;
    const totalTitleHeight = lines.length * lineHeight;
    const startY = 440 - totalTitleHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      // Subtle shadow for legibility
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
    }
    ctx.restore();

    // 6. Accent Divider Line
    ctx.save();
    const dividerY = startY + totalTitleHeight + 35;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, dividerY);
    ctx.lineTo(width / 2 + 80, dividerY);
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(width / 2, dividerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Subtitle
    if (subtitle.trim()) {
      ctx.save();
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillStyle = preset.subtitleColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const subWords = subtitle.split(" ");
      const subLines: string[] = [];
      let subCurrent = "";
      const maxSubWidth = width - 200;

      for (const w of subWords) {
        const testSub = subCurrent ? `${subCurrent} ${w}` : w;
        if (ctx.measureText(testSub).width > maxSubWidth && subCurrent) {
          subLines.push(subCurrent);
          subCurrent = w;
        } else {
          subCurrent = testSub;
        }
      }
      if (subCurrent) subLines.push(subCurrent);

      for (let j = 0; j < subLines.length; j++) {
        ctx.fillText(subLines[j], width / 2, dividerY + 30 + j * 34);
      }
      ctx.restore();
    }

    // 8. Author Name & LeadSpree stamp
    ctx.save();
    const authorY = height - 160;

    ctx.font = "600 15px -apple-system, sans-serif";
    ctx.fillStyle = preset.subtitleColor;
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText("WRITTEN BY", width / 2, authorY);

    ctx.font = `bold 32px ${titleFontFamily}`;
    ctx.fillStyle = preset.textColor;
    ctx.fillText((author || "Author").toUpperCase(), width / 2, authorY + 45);

    // Subtle LeadSpree imprint
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText("PUBLISHED WITH WRITERDOST AI", width / 2, height - 70);
    ctx.restore();
  }, [preset, accentColor, badgeText, title, subtitle, author]);

  useEffect(() => {
    if (isOpen) {
      renderCanvas();
    }
  }, [isOpen, renderCanvas]);

  if (!isOpen || !project) return null;

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      // Export at high quality
      const dataUrl = canvas.toDataURL("image/png", 0.95);
      setProjectCover(projectId, dataUrl);
      setCopiedNotification(true);
      setTimeout(() => {
        setCopiedNotification(false);
        onClose();
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${project.title.replace(/\s+/g, "_")}_Kindle_Cover.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-amber-500 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </span>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Autonomous Book Cover Studio
              </h3>
              <p className="text-xs text-on-surface-variant">
                Kindle 1:1.6 standard &bull; Embedded into EPUB &amp; PDF exports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body (Split Preview & Controls) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left Canvas Preview (Kindle frame) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-black/30 rounded-xl p-4 border border-outline-variant/15">
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 max-w-[280px] w-full aspect-[1/1.6] group">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 mt-4 w-full max-w-[280px]">
              <button
                type="button"
                onClick={handleDownload}
                className="btn btn-secondary btn-sm flex-1 text-xs"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Save PNG
              </button>
            </div>
          </div>

          {/* Right Controls */}
          <div className="md:col-span-7 space-y-4">
            {/* Theme Presets */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Style Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveTheme(p.id);
                      setCustomAccent("");
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                      activeTheme === p.id
                        ? "border-primary bg-primary/10 text-on-surface font-semibold shadow-sm"
                        : "border-outline-variant/20 bg-surface-container-high/30 hover:bg-surface-container-high/60 text-on-surface-variant"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${p.bgGradStart}, ${p.accentColor})`,
                      }}
                    />
                    <span className="text-xs truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Book Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="The Main Title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Subtitle / Hook
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="input w-full text-xs"
                  placeholder="A field guide to mastering your craft"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Badge / Edition
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="E.g. DEFINITIVE EDITION"
                  />
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {["#fbbf24", "#38bdf8", "#10b981", "#f43f5e", "#a855f7", "#ffffff"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomAccent(c)}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                        accentColor === c ? "scale-110 border-white shadow-md" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/40">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">
              {copiedNotification ? "check" : "bookmark_added"}
            </span>
            <span>
              {copiedNotification
                ? "Cover Saved!"
                : "Apply as Project Cover"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
