"use client";

import { useState, useId, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  COPYWRITING_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  type CopywritingTemplate,
  type CopywritingCategory,
  type TemplateInputField,
} from "@/lib/copywriting-templates";
import { TONE_GUIDE } from "@/lib/tone-standards";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore } from "@/lib/app-store";
import { GenerationEngine } from "@/lib/store-types";
import { mdToHtml } from "@/lib/markdown-utils";
import SafeHtml from "@/components/SafeHtml";
import { AiEngineSelectorModal } from "@/components/AiEngineSelectorModal";

const CATEGORY_TABS: Array<{ id: CopywritingCategory | "all"; label: string; icon: string }> = [
  { id: "all", label: "All Templates", icon: "dashboard_customize" },
  { id: "authority", label: "Authority & Publishing", icon: "school" },
  { id: "sales", label: "Sales & Conversion", icon: "point_of_sale" },
  { id: "traffic", label: "Traffic & Video", icon: "videocam" },
];

export default function CopywritingStudioPage() {
  const router = useRouter();
  const searchInputId = useId();
  const repurposeSelectId = useId();

  // App Store selectors
  const projects = useAppStore((state) => state.projects);
  const api = useAppStore((state) => state.api);
  const preferredEngine = useAppStore((state) => state.preferredEngine);
  const checkQuota = useAppStore((state) => state.checkQuota);
  const spendCredits = useAppStore((state) => state.spendCredits);
  const recordMonthlyUsage = useAppStore((state) => state.recordMonthlyUsage);
  const addGeneratedProject = useAppStore((state) => state.addGeneratedProject);

  // Studio UI state
  const [selectedCategory, setSelectedCategory] = useState<CopywritingCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("cold-email");
  const [selectedTone, setSelectedTone] = useState<string>("Professional");
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Engine modal & status
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [activeEngine, setActiveEngine] = useState<GenerationEngine>(preferredEngine || "bizai");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [generationDuration, setGenerationDuration] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Output preview state
  const [generatedOutput, setGeneratedOutput] = useState<string>("");
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const [copied, setCopied] = useState(false);

  // Repurpose from project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Get active template
  const currentTemplate: CopywritingTemplate = useMemo(() => {
    return getTemplateById(selectedTemplateId) || COPYWRITING_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    const list = getTemplatesByCategory(selectedCategory);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.framework.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q)
    );
  }, [selectedCategory, searchQuery]);

  // Reset form inputs when switching templates
  const handleSelectTemplate = (template: CopywritingTemplate) => {
    setSelectedTemplateId(template.id);
    const defaults: Record<string, any> = {};
    template.inputFields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        defaults[f.id] = f.defaultValue;
      }
    });
    setFormInputs(defaults);
    setValidationErrors({});
    setStatusMessage(null);
  };

  // Initialize defaults on initial load
  useEffect(() => {
    const defaults: Record<string, any> = {};
    currentTemplate.inputFields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        defaults[f.id] = f.defaultValue;
      }
    });
    setFormInputs(defaults);
  }, [currentTemplate]);

  // Handle input change
  const handleInputChange = (fieldId: string, value: any) => {
    setFormInputs((prev) => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Repurpose from Project helper
  const handleRepurposeProject = () => {
    if (!selectedProjectId) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const updated = { ...formInputs };
    const manuscriptSnippet = project.manuscript ? project.manuscript.slice(0, 1500) : "";
    const descriptionText = project.description || project.manuscript?.slice(0, 300) || "";

    currentTemplate.inputFields.forEach((field) => {
      const fid = field.id.toLowerCase();
      if (fid.includes("prospect") || fid.includes("audience") || fid.includes("market") || fid.includes("icp")) {
        updated[field.id] = project.audience || "Industry Professionals";
      } else if (fid.includes("pain") || fid.includes("problem") || fid.includes("bottleneck")) {
        updated[field.id] = descriptionText;
      } else if (fid.includes("solution") || fid.includes("product") || fid.includes("offer") || fid.includes("business")) {
        updated[field.id] = project.title + (descriptionText ? `: ${descriptionText}` : "");
      } else if (fid.includes("title") || fid.includes("book") || fid.includes("seed") || fid.includes("topic") || fid.includes("headline")) {
        updated[field.id] = project.title;
      } else if (fid.includes("content") || fid.includes("source") || fid.includes("manuscript") || fid.includes("article") || fid.includes("body")) {
        updated[field.id] = manuscriptSnippet || descriptionText;
      } else if (fid.includes("keyword") && project.seoKeywords?.length) {
        updated[field.id] = project.seoKeywords.join(", ");
      }
    });

    if (project.tone && TONE_GUIDE[project.tone as keyof typeof TONE_GUIDE]) {
      setSelectedTone(project.tone);
    }

    setFormInputs(updated);
    setStatusMessage({
      type: "info",
      text: `Populated parameters from project "${project.title}".`,
    });
  };

  // Validate inputs before generation
  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    currentTemplate.inputFields.forEach((field) => {
      if (field.required && !formInputs[field.id]?.toString().trim()) {
        errors[field.id] = `${field.label} is required.`;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Execute Generation
  const handleExecuteGeneration = async (engine: GenerationEngine) => {
    setActiveEngine(engine);
    setEngineModalOpen(false);

    if (!validateInputs()) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required template inputs highlighted below.",
      });
      return;
    }

    const quota = checkQuota("blog", engine);
    if (!quota.allowed) {
      if (engine === "byok") {
        setStatusMessage({
          type: "error",
          text: "Add your custom API key in Settings to use BYOK unlimited generation.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Monthly quota reached (${quota.used}/${quota.limit}). Top up credits or configure BYOK in Settings.`,
        });
      }
      return;
    }

    if (engine === "byok" && (!api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama"))) {
      setStatusMessage({
        type: "error",
        text: "Please configure your API provider, model, and key in Settings to use BYOK.",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStep("Analyzing target parameters & framework...");
    setStatusMessage(null);
    const startTime = Date.now();

    try {
      setTimeout(() => setGenerationStep("Injecting direct-response persuasive triggers..."), 800);
      setTimeout(() => setGenerationStep("Synthesizing conversion copy & formatting..."), 1800);

      const toneDirective = TONE_GUIDE[selectedTone as keyof typeof TONE_GUIDE]
        ? `\n\nTONE AND EXECUTION DIRECTIVE (${selectedTone}):\n${TONE_GUIDE[selectedTone as keyof typeof TONE_GUIDE].objective}\n${TONE_GUIDE[selectedTone as keyof typeof TONE_GUIDE].execution}`
        : "";

      const fullSystemPrompt = `${currentTemplate.systemPrompt}${toneDirective}\nAlways output clean, high-conversion copy using clean Markdown.`;
      const userPrompt = currentTemplate.promptBuilder(formInputs);

      const result = await generateAiText({
        api,
        systemPrompt: fullSystemPrompt,
        userPrompt,
        temperature: 0.7,
        topP: 0.95,
      });

      const duration = Number(((Date.now() - startTime) / 1000).toFixed(1));
      setGenerationDuration(duration);
      setGeneratedOutput(result);

      const words = result.split(/\s+/).filter(Boolean).length;
      const estimatedTokens = Math.floor(words * 1.35);

      if (engine === "bizai") {
        if (quota.source === "credits") {
          const creditsToDeduct = Math.max(50, Math.round(estimatedTokens * 1.2));
          spendCredits(creditsToDeduct);
          setStatusMessage({
            type: "success",
            text: `Generated successfully in ${duration}s (${creditsToDeduct.toLocaleString()} credits deducted).`,
          });
        } else {
          recordMonthlyUsage("blog");
          setStatusMessage({
            type: "success",
            text: `Generated successfully in ${duration}s (monthly quota used).`,
          });
        }
      } else {
        setStatusMessage({
          type: "success",
          text: `Generated successfully in ${duration}s using BYOK.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Generation encountered an unexpected failure. Please try again.",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // Copy to clipboard
  const handleCopyClipboard = async () => {
    if (!generatedOutput) return;
    try {
      await navigator.clipboard.writeText(generatedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Send to Editor
  const handleSendToEditor = () => {
    if (!generatedOutput) return;
    const title = `${currentTemplate.name} - ${
      formInputs.productName || formInputs.topic || formInputs.seedKeyword || formInputs.videoTitle || "Draft"
    }`;
    const wordCount = generatedOutput.split(/\s+/).filter(Boolean).length;

    const newProject = addGeneratedProject({
      title,
      description: `Created via Copywriting Studio using the ${currentTemplate.framework} framework.`,
      audience: formInputs.targetAudience || formInputs.prospectRole || formInputs.targetMarket || "Target Audience",
      tone: selectedTone,
      positioning: `${currentTemplate.name} Direct Response Asset`,
      chapterCount: 1,
      targetLength: wordCount,
      seoKeywords: [currentTemplate.name, "copywriting", "marketing"],
      chapters: [
        {
          id: "chapter-1",
          title: `${currentTemplate.name} Copy`,
          outline: [],
          content: mdToHtml(generatedOutput),
          summary: `${currentTemplate.name} copy draft.`,
          status: "Done",
          wordCount,
        },
      ],
      blogTitle: title,
      blogDraft: generatedOutput,
      metaDescription: `Copywriting draft for ${title}.`,
    });

    if (newProject?.id) {
      router.push(`/editor`);
    } else {
      router.push("/editor");
    }
  };

  // Export to Automations
  const handleExportToAutomations = () => {
    router.push("/automations");
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    if (!generatedOutput) return;
    const blob = new Blob([generatedOutput], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTemplate.id}-copy.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Statistics
  const outputWordCount = useMemo(() => {
    if (!generatedOutput) return 0;
    return generatedOutput.split(/\s+/).filter(Boolean).length;
  }, [generatedOutput]);

  const outputCharCount = generatedOutput ? generatedOutput.length : 0;

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0c0c14] text-on-surface">
      {/* Studio Header Bar */}
      <div className="border-b border-outline-variant/30 bg-surface/80 dark:bg-[#10101c]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/25">
              <span className="material-symbols-outlined text-[24px]">campaign</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-on-surface">Copywriting Studio</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                  Autonomous Suites
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                High-converting direct response copy, marketing frameworks, and SEO power packs.
              </p>
            </div>
          </div>

          {/* Quick Engine Status Indicator */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setEngineModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                {activeEngine === "byok" ? "key" : "bolt"}
              </span>
              <span>Engine: <strong className="font-semibold text-primary">{activeEngine === "byok" ? "BYOK Custom Key" : "BizAI Managed"}</strong></span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">expand_more</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-outline-variant/20 pt-2 pb-2">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-white shadow-xs shadow-primary/30"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Workbench Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Status Alert Banner */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
                statusMessage.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {statusMessage.type === "error" ? "error" : statusMessage.type === "success" ? "check_circle" : "info"}
                </span>
                <span>{statusMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-current opacity-70 hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================ */}
          {/* LEFT COLUMN: Template Selector & Inputs Form (5 of 12 cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-6">
            {/* Template Selector Card */}
            <div className="bg-surface-container-low dark:bg-[#121220] border border-outline-variant/30 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor={searchInputId} className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">auto_fix_high</span>
                  Select Copywriting Template
                </label>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {filteredTemplates.length} available
                </span>
              </div>

              {/* Template Search Filter */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  search
                </span>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Filter templates by name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest dark:bg-[#181828] border border-outline-variant/30 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Scrollable Templates List / Grid */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredTemplates.map((template) => {
                  const isSelected = template.id === currentTemplate.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary dark:bg-primary/15"
                          : "bg-surface dark:bg-[#161626] border-outline-variant/20 hover:border-outline-variant/50 text-on-surface"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"
                      }`}>
                        <span className="material-symbols-outlined text-[16px] block">{template.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate text-on-surface">{template.name}</span>
                          {template.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-primary/15 text-primary shrink-0 uppercase tracking-wider">
                              {template.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5 font-normal">
                          {template.framework} • {template.headline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Repurpose from Existing Project Bridge */}
            {projects.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">transform</span>
                  <span>Repurpose from Existing Project</span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant mb-3">
                  Instantly extract title, audience, problem and tone from your long-form projects into this template.
                </p>
                <div className="flex gap-2">
                  <select
                    id={repurposeSelectId}
                    aria-label="Select a project to repurpose"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="flex-1 bg-surface dark:bg-[#181828] border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleRepurposeProject}
                    disabled={!selectedProjectId}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                    <span>Extract</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Template Inputs Form */}
            <div className="bg-surface-container-low dark:bg-[#121220] border border-outline-variant/30 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-outline-variant/20 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[18px]">{currentTemplate.icon}</span>
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-on-surface">{currentTemplate.name}</h2>
                      <p className="text-[11px] text-primary font-medium">{currentTemplate.framework}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormInputs({});
                      setValidationErrors({});
                    }}
                    className="text-[11px] text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Reset</span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  {currentTemplate.description}
                </p>
              </div>

              {/* Dynamic Field Inputs */}
              <div className="space-y-3.5">
                {currentTemplate.inputFields.map((field: TemplateInputField) => {
                  const val = formInputs[field.id] ?? "";
                  const error = validationErrors[field.id];
                  const charCount = typeof val === "string" ? val.length : 0;

                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {/* Character count feedback for character-sensitive fields */}
                        {(field.id.toLowerCase().includes("headline") ||
                          field.id.toLowerCase().includes("meta") ||
                          field.id.toLowerCase().includes("title")) && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                              field.id.toLowerCase().includes("headline") && charCount > 30
                                ? "bg-rose-500/10 text-rose-500 font-bold"
                                : field.id.toLowerCase().includes("title") && charCount > 60
                                ? "bg-amber-500/10 text-amber-500 font-bold"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {charCount} chars
                          </span>
                        )}
                      </div>

                      {field.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={val}
                          placeholder={field.placeholder}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={`w-full bg-surface-container-lowest dark:bg-[#181828] border rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-hidden focus:ring-2 transition-all ${
                            error
                              ? "border-rose-500 focus:ring-rose-500/40"
                              : "border-outline-variant/30 focus:ring-primary/40 focus:border-primary"
                          }`}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={val}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={`w-full bg-surface-container-lowest dark:bg-[#181828] border rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-hidden focus:ring-2 transition-all ${
                            error
                              ? "border-rose-500 focus:ring-rose-500/40"
                              : "border-outline-variant/30 focus:ring-primary/40 focus:border-primary"
                          }`}
                        >
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          placeholder={field.placeholder}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={`w-full bg-surface-container-lowest dark:bg-[#181828] border rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-hidden focus:ring-2 transition-all ${
                            error
                              ? "border-rose-500 focus:ring-rose-500/40"
                              : "border-outline-variant/30 focus:ring-primary/40 focus:border-primary"
                          }`}
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[11px] text-on-surface-variant/80">{field.helpText}</p>
                      )}
                      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Tone Selection Accordion / Control */}
              <div className="pt-2 border-t border-outline-variant/20 space-y-1.5">
                <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">record_voice_over</span>
                    Copywriting Voice & Tone
                  </span>
                  <span className="text-[11px] text-primary font-medium">{selectedTone}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.keys(TONE_GUIDE).map((toneKey) => {
                    const isSelected = selectedTone === toneKey;
                    const toneMeta = TONE_GUIDE[toneKey as keyof typeof TONE_GUIDE];
                    return (
                      <button
                        key={toneKey}
                        type="button"
                        onClick={() => setSelectedTone(toneKey)}
                        className={`p-2 rounded-xl text-left border text-[11px] transition-all flex flex-col gap-1 ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-surface dark:bg-[#161626] border-outline-variant/20 hover:border-outline-variant/40 text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">{toneMeta.icon}</span>
                          <span className="font-semibold truncate">{toneKey}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Action Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => handleExecuteGeneration(activeEngine)}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-primary text-white font-bold text-xs tracking-wide shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Generating Copy...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span>Generate {currentTemplate.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Output Workbench & Action Toolbar (7 of 12 cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-surface-container-low dark:bg-[#121220] border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[580px]">
              {/* Output Header Bar */}
              <div className="px-5 py-3.5 border-b border-outline-variant/30 bg-surface dark:bg-[#151525] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Workbench Output Preview
                  </span>
                  {generationDuration !== null && (
                    <span className="text-[10px] font-mono bg-surface-container px-2 py-0.5 rounded-md text-on-surface-variant">
                      {generationDuration}s
                    </span>
                  )}
                </div>

                {/* View Mode Toggle & Metrics */}
                <div className="flex items-center gap-2">
                  {generatedOutput && (
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mr-2 hidden sm:flex">
                      <span>{outputWordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span>{outputCharCount.toLocaleString()} chars</span>
                    </div>
                  )}

                  <div className="bg-surface-container-lowest dark:bg-[#1c1c30] p-0.5 rounded-lg border border-outline-variant/30 flex items-center">
                    <button
                      type="button"
                      onClick={() => setViewMode("rendered")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                        viewMode === "rendered"
                          ? "bg-primary text-white"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                      <span>Rendered</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("raw")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                        viewMode === "raw"
                          ? "bg-primary text-white"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">code</span>
                      <span>Markdown</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Workbench Body */}
              <div className="flex-1 p-6 relative overflow-y-auto max-h-[620px]">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                        <span className="material-symbols-outlined text-[36px]">auto_fix_high</span>
                      </div>
                      <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">Assembling Direct-Response Copy</h3>
                      <p className="text-xs text-primary font-medium mt-1">{generationStep || "Synthesizing framework..."}</p>
                    </div>
                  </div>
                ) : generatedOutput ? (
                  viewMode === "rendered" ? (
                    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-on-surface">
                      <SafeHtml html={mdToHtml(generatedOutput)} />
                    </div>
                  ) : (
                    <pre className="p-4 bg-surface dark:bg-[#0e0e18] rounded-xl border border-outline-variant/20 font-mono text-xs whitespace-pre-wrap text-on-surface leading-relaxed overflow-x-auto">
                      {generatedOutput}
                    </pre>
                  )
                ) : (
                  /* Empty state */
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 text-on-surface-variant">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[30px]">{currentTemplate.icon}</span>
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-sm font-bold text-on-surface">Ready to generate {currentTemplate.name}</h3>
                      <p className="text-xs mt-1 text-on-surface-variant leading-relaxed">
                        Fill in the template parameters on the left and click <strong>Generate</strong>. Your output will render here with full formatting, exportable directly to your book manuscript, blog editor, or automated publishing pipeline.
                      </p>
                    </div>

                    <div className="mt-4 p-3.5 bg-surface dark:bg-[#141424] border border-outline-variant/20 rounded-xl text-left max-w-md w-full">
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                        Framework Breakdown: {currentTemplate.framework}
                      </p>
                      <p className="text-[11px] text-on-surface-variant leading-normal">
                        {currentTemplate.headline}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Output Actions Footer Toolbar */}
              <div className="px-5 py-3 border-t border-outline-variant/30 bg-surface dark:bg-[#151525] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    disabled={!generatedOutput || isGenerating}
                    className={`btn btn-sm flex items-center gap-1.5 transition-all ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "btn-secondary text-xs"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    <span>{copied ? "Copied!" : "Copy Output"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    disabled={!generatedOutput || isGenerating}
                    className="btn btn-ghost btn-sm text-xs flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
                    title="Download as .md file"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span className="hidden sm:inline">Download .md</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportToAutomations}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                    title="Dispatch copy to WordPress, Ghost, Webflow, or custom webhooks"
                  >
                    <span className="material-symbols-outlined text-[16px] text-indigo-500">schedule_send</span>
                    <span>Export to Automations</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendToEditor}
                    disabled={!generatedOutput || isGenerating}
                    className="btn btn-primary btn-sm text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20"
                    title="Create a project and open in deep editor"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Send to Editor</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Engine Selector Modal */}
      <AiEngineSelectorModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
        onConfirm={handleExecuteGeneration}
        taskType="blog"
        taskTitle={`Copywriting: ${currentTemplate.name}`}
      />
    </div>
  );
}
