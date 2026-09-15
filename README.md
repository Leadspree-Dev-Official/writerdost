# WriterDost AI

> **Autonomous AI-Assisted Book, Ebook, Manuscript Rewriting & Blog Automation Engine.**

WriterDost AI is a modern, high-performance platform engineered for creators, authors, agencies, and publishers. It combines a multi-agent orchestration architecture with rich canvas editing, contextual translations, plagiarism-free rewriting swarms, and scheduled blog publishing pipelines.

---

## 🌟 Core Features

### 1. Multi-Agent Book & Ebook Generator
- **Autonomous Swarm Pipeline**:
  - **Research Agent**: Ingests prompts and reference documents to extract core concepts, facts, and structure.
  - **Planning Agent**: Formulates high-retention outlines, Table of Contents, and positioning.
  - **Quota & Pacing Manager**: Allocates targeted word counts across sections (800–1,000 words per section) to scale from 1,000 up to 100,000+ words.
  - **Parallel Writing Agents**: Concurrently drafts chapters with contextual continuity.
  - **Proofreading & QA Engine**: Analyzes flow, resolves structural gaps, and ensures narrative rhythm.
- **Rich Text Canvas Editor**: Powered by TipTap, featuring custom typography selectors, bubble menus, formatting controls, and inline AI assists.
- **Exporting Options**: Export seamlessly to clean **Markdown**, **Word (`.docx`)**, or **PDF**.

### 2. Plagiarism-Free Ebook & Manuscript Rewriter
- **4-Stage Deconstruction Swarm**:
  1. *Concept Extractor*: Strips away original author phrasing to extract raw factual outlines.
  2. *Voice Drafter*: Rebuilds narrative from sterile facts using selected tone and stylistic criteria.
  3. *Structural Formatter*: Formats prose into scannable typography, subheadings, and blockquotes.
  4. *Anti-Plagiarism Auditor*: Enforces strict n-gram checks against original input.

### 3. Contextual Multi-Language Translator
- Context-aware localization across global and Indian languages (Bengali, Hindi, Gujarati, Spanish, Portuguese, etc.) preserving idioms, emotional depth, and formatting.

### 4. Automated Scheduled Blog Engine
- **Source Ingestion**: Monitors RSS feeds, Atom feeds, Sitemaps, or custom topic queues.
- **Deduplication**: URL hash-based indexing to ensure no article is ever processed twice.
- **Pluggable Publishing Destinations**:
  - **WordPress** (Direct REST API or via the custom `WriterDost Connect` plugin)
  - **Ghost**
  - **Webflow**
  - **Strapi**
  - **Sanity**
  - **Custom HMAC-SHA256 Signed Webhooks**
- **Quality Gates**: Pre-publish verification for minimum word counts, meta descriptions, and placeholder checks.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with React 19 & Turbopack.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with typography plugin and modern design tokens.
- **Editor**: [TipTap 3](https://tiptap.dev/) ecosystem (`@tiptap/react`, `@tiptap/starter-kit`).
- **State Management**: [Zustand](https://github.com/pmndrs/zustand), persisted to Appwrite (never to browser storage).
- **Backend & Database**: [Appwrite 2.0](https://appwrite.io/) (TablesDB for automated campaigns, runs, destinations, and logs).
- **Security & Networking**: Outbound SSRF guard (`net-guard`), AES-256-GCM encrypted credential vault (`secure-store`), HMAC-SHA256 signature verification.
- **AI Integrations**: BYO (Bring Your Own) Keys supporting **OpenAI**, **OpenRouter**, and **Ollama** (localhost).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or Node.js 20+
- npm, yarn, or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/Leadspree-Dev-Official/writerdost.git
cd writerdost/writerdost-frontend
npm install
```

### 2. Development Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Production
```bash
npm run build
npm run start
```

---

## ⚙️ Environment Configuration

For standard ebook generation and rewriting, no external server is required—simply set your API key in **Settings → AI Settings** in the web UI.

For **Blog Automations** using Appwrite:
1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required environment keys:
   ```env
   APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_server_api_key
   APPWRITE_DATABASE_ID=writerdost

   WRITERDOST_ENCRYPTION_KEY=your_32_byte_base64_encryption_key
   WRITERDOST_CRON_SECRET=your_cron_secret
   ```
3. Initialize the database schema:
   ```bash
   npm run appwrite:setup
   ```

---

## 📁 Repository Structure

```text
writerdost/
├── appwrite/                 # Appwrite 2.0 schema setup scripts & functions
│   ├── setup.mjs             # TablesDB migration script
│   └── functions/            # Automation tick cron function
├── src/
│   ├── app/                  # Next.js App Router (Dashboard, Create, Editor, Automations, API routes)
│   ├── components/           # UI components, layout, TipTap editor, website sections
│   └── lib/                  # Multi-agent pipelines, NetGuard, Appwrite server SDK, store
├── public/                   # Static assets, fonts, icons
├── package.json              # Project dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

---

## 🔌 WordPress Integration
A companion WordPress plugin (`WriterDost Connect`) is available under `wordpress-plugin/` in the project root. It provides high-fidelity receiving endpoints (`/wp-json/writerdost/v1/posts`) for automated publishing with Yoast/RankMath SEO integration.

---

## 📄 License
Private & Confidential. All rights reserved by Leadspree.
