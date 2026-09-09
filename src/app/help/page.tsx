"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/app-store";
import { generateAiText } from "@/lib/ai-client";
import { mdToHtml } from "@/lib/markdown-utils";

const WRITERDOST_CONTEXT = `
Writerdost AI is a premium writing workspace for authors and content creators. 
Key Features:
1. Dashboard: Overview of projects, total words managed, tokens used, and generation stats.
2. Create Ebook: A structured pipeline to generate ebooks. You provide a vision, audience, and tone. AI agents collaborate to generate a blueprint and then the chapters.
3. Manuscript Editor: A powerful editor with AI slash commands (type '/') and contextual bubble menus for rephrasing or expanding text. Supports chapter management and status tracking.
4. Rewrite Ebook: Allows uploading (PDF/DOCX/EPUB) or pasting existing drafts to humanize, deep-rewrite, or translate them.
5. Blog Generator: Turns ebook projects into SEO-optimized blog posts, complete with meta descriptions and social snippets.
6. Author Profile: Set your pen name, professional tagline, and bio. These settings act as a style guide for the AI.
7. Settings: Configure AI providers (OpenAI, Anthropic, Ollama), models, and creative parameters like temperature.
8. Exporting: Work can be downloaded as PDF, DOCX, or TXT.
The app uses a 'Midnight' dark theme by default, focusing on an elegant, distraction-free writing experience.
`;

const categories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket_launch",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    articles: [
      { id: "g1", title: "Creating your first Ebook", content: "To start a new project, click 'Create New Ebook' on the dashboard. You'll need to provide a vision, target audience, and preferred tone. Our AI agents will then generate a comprehensive outline and chapter structure for you." },
      { id: "g2", title: "Setting up your Author Profile", content: "Go to the Profile section to set your pen name, bio, and writing preferences. These settings act as a 'Style Guide' for the AI, ensuring every chapter it writes matches your unique voice." },
      { id: "g3", title: "Connecting your API Keys", content: "Writerdost requires an LLM provider (like OpenAI, Anthropic, or local Ollama). Go to Settings > API Settings to enter your keys. We support custom base URLs for proxy services as well." },
    ]
  },
  {
    id: "editor",
    title: "Manuscript Editor",
    icon: "edit_note",
    color: "text-primary",
    bg: "bg-primary/10",
    articles: [
      { id: "e1", title: "Using Slash Commands", content: "Type '/' anywhere in the editor to trigger AI commands. You can generate new thoughts, expand the current section, or ask for structural suggestions without leaving your flow." },
      { id: "e2", title: "Chapter Management", content: "Use the sidebar in the editor to switch between chapters, add new ones, or delete existing ones. Progress and word counts are tracked automatically as you write." },
      { id: "e3", title: "Exporting your work", content: "Once your manuscript is ready, use the 'Export' button in the header. You can download your work as a polished PDF, Word Document (DOCX), or plain text file." },
    ]
  },
  {
    id: "ai-features",
    title: "AI Power Tools",
    icon: "psychology",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    articles: [
      { id: "a1", title: "Smart Rewrite Engine", content: "The Rewrite module allows you to take existing content and transform it. You can humanize AI text, translate to different languages, or simply polish a rough draft while maintaining the original core message." },
      { id: "a2", title: "Blog Content Generator", content: "Turn your long-form ebooks into marketing assets. The Blog Generator extracts key insights from your project to create SEO-optimized blog posts, meta descriptions, and social snippets." },
      { id: "a3", title: "Interactive AI Assist", content: "Highlight any text and use the bubble menu to rephrase or expand specifically that section. You can give custom instructions like 'Make this more dramatic' or 'Explain this in simpler terms'." },
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const api = useAppStore((state) => state.api);

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    setAiError(null);
    setAiResponse(null);

    try {
      const response = await generateAiText({
        api,
        systemPrompt: `You are the Writerdost Help Assistant. Use the following context about the application to answer user questions concisely and accurately. 
        Always use Markdown formatting (bold, lists, etc.) to make answers easy to read. 
        If you don't know the answer, suggest contacting support via WhatsApp.

        CONTEXT:
        ${WRITERDOST_CONTEXT}`,
        userPrompt: searchQuery,
      });
      setAiResponse(response);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Failed to get AI response.");
    } finally {
      setIsAiSearching(false);
    }
  };

  const allArticles = categories.flatMap(cat => cat.articles.map(art => ({ ...art, category: cat.title })));
  const filteredArticles = searchQuery 
    ? allArticles.filter(art => art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex-1 w-full min-h-screen bg-surface transition-colors duration-300">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-8 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-black text-on-surface mb-6 tracking-tight"
        >
          How can we <span className="text-primary">help you?</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto"
        >
          Search our knowledge base for instructions, tips, and troubleshooting guides for the Writerdost AI workspace.
        </motion.p>

        {/* Search Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden px-6 h-16 transition-all duration-300">
            <span className="material-symbols-outlined text-slate-400 mr-4">search</span>
            <input 
              type="text" 
              placeholder="Search for articles, features, or issues..."
              className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-slate-500 font-medium pr-4"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAiResponse(null);
                setAiError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            />
            {searchQuery && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAiSearch}
                  disabled={isAiSearching}
                  className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiSearching ? (
                    <span className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-sm">psychology</span>
                  )}
                  Ask AI
                </button>
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setAiResponse(null);
                    setAiError(null);
                  }}
                  className="material-symbols-outlined text-slate-400 hover:text-on-surface transition-colors"
                >
                  close
                </button>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {(searchQuery || isAiSearching || aiResponse || aiError) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl z-50 overflow-y-auto max-h-[80vh] text-left"
              >
                {/* AI Assistant Section */}
                <div className="p-4 bg-primary/5 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Assistant</p>
                  </div>
                  
                  {isAiSearching && (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-primary/10 rounded animate-pulse" />
                    </div>
                  )}

                  {aiResponse && (
                    <div 
                      className="py-2 text-sm text-on-surface leading-relaxed help-ai-content prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: mdToHtml(aiResponse) }}
                    />
                  )}

                  {aiError && (
                    <div className="py-2 text-rose-500 text-xs font-medium flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {aiError}
                    </div>
                  )}

                  {!isAiSearching && !aiResponse && !aiError && (
                    <p className="text-xs text-slate-500 italic">Type your question and press Enter or click &apos;Ask AI&apos; for intelligent help.</p>
                  )}
                </div>

                {/* Static Articles Section */}
                {filteredArticles.length > 0 && (
                  <>
                    <div className="p-4 border-b border-outline-variant/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Related Articles</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {filteredArticles.map(art => (
                        <button 
                          key={art.id}
                          onClick={() => {
                            setSelectedArticle(art.id);
                            setSearchQuery("");
                          }}
                          className="w-full text-left p-4 hover:bg-primary/5 rounded-xl transition-all group"
                        >
                          <p className="text-sm font-bold text-on-surface mb-1 group-hover:text-primary">{art.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{art.content}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {categories.map((cat, idx) => (
            <motion.div 
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/5 hover:border-primary/20 transition-all group"
            >
              <div className={`w-14 h-14 ${cat.bg} ${cat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
              </div>
              <h3 className="text-xl font-black text-on-surface mb-4">{cat.title}</h3>
              <ul className="space-y-3">
                {cat.articles.map(art => (
                  <li key={art.id}>
                    <button 
                      onClick={() => setSelectedArticle(art.id)}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center text-left"
                    >
                      <span className="material-symbols-outlined text-xs mr-2 opacity-50">arrow_forward</span>
                      {art.title}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Contact Support Section */}
        <div className="bg-surface-container-high rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="relative z-10 max-w-xl text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-on-surface mb-4">Still need help?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Our support team is available 24/7 to assist you with any technical issues or writing challenges.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <a 
                href="https://wa.me/919051822558" 
                target="_blank" 
                className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#25D366]/20"
              >
                <span className="material-symbols-outlined">chat</span>
                WhatsApp Support
              </a>
              <a 
                href="https://writerdost.ai" 
                target="_blank" 
                className="bg-surface-container-lowest text-on-surface px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border border-outline-variant/10 shadow-xl"
              >
                <span className="material-symbols-outlined">language</span>
                Official Website
              </a>
            </div>
          </div>
          
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl"></div>
            <span className="material-symbols-outlined text-[10rem] text-primary/20 animate-pulse">support_agent</span>
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[2rem] shadow-2xl border border-outline-variant/10 overflow-hidden"
            >
              <div className="p-8 pb-0 flex justify-between items-start">
                <div className="px-3 py-1 bg-primary/10 rounded-full">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    {allArticles.find(a => a.id === selectedArticle)?.category}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-slate-400">close</span>
                </button>
              </div>
              <div className="p-8 pt-6">
                <h2 className="text-3xl font-black text-on-surface mb-6">
                  {allArticles.find(a => a.id === selectedArticle)?.title}
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    {allArticles.find(a => a.id === selectedArticle)?.content}
                  </p>
                </div>
                <div className="mt-12 pt-8 border-t border-outline-variant/10 flex items-center justify-between">
                  <p className="text-xs text-slate-500 italic">Was this helpful?</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all">Yes, thanks!</button>
                    <button className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition-all">Not really</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
