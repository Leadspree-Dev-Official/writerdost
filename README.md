# Writerdost AI

Writerdost AI is a localhost-first Next.js testing build for AI-assisted ebook generation, rewriting, blog generation, and editing.

## What works now

- Dashboard, projects, profile, settings, help
- Rich text chapter editor with AI assist
- Rewrite flow with live AI or fallback local generation
- Blog title and draft generation with live AI or fallback local generation
- Multi-agent-style ebook generation from the Create page
- Local persistence using Zustand in the browser

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Configure AI

Open `/settings` and fill in:

- Provider: `OpenAI`, `OpenRouter`, `Ollama`, or `Custom`
- Model
- Base URL
- API key
- Optional app name and site URL

Then click `Test Connection`.

### Common local examples

OpenAI:

- Provider: `OpenAI`
- Model: `gpt-4o-mini`

OpenRouter:

- Provider: `OpenRouter`
- Model: `openai/gpt-4o-mini`

Ollama:

- Provider: `Ollama`
- Model: `llama3.1:8b`
- Make sure Ollama is running locally on `http://localhost:11434`

## Create flow

The `Create Ebook` page supports two modes:

- `Quick Draft`: creates a local project immediately from form input
- `Generate With AI Agents`: runs a localhost orchestration pipeline:
  - Research agent
  - Planning agent
  - Chapter planning agent
  - Parallel chapter writing agents

If no live API is configured, the route falls back to a local generated structure so the UI is still testable.

## Current limitations

- API keys are stored in browser state for localhost testing only
- No WordPress backend integration yet
- No user auth, credit system, export engine, or async queue workers yet
- No server-side encrypted secrets yet

## Next planned backend phase

- Headless WordPress for users, projects, and chapters
- Custom plugin for AI orchestration and credit tracking
- JWT auth
- Encrypted key storage
- Background jobs for long-running chapter generation
