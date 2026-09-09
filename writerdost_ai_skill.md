# Writerdost AI - Complete Agent System Directive (v2)

## Includes:

-   Memory Agent (Pipeline Supervisor)
-   Dynamic Quota & Pacing Manager
-   Writing Agent Sub-Swarm
-   Multi-AI Parallel Execution (OpenAI, Gemini, Claude, Ollama)

------------------------------------------------------------------------

# 1. SYSTEM OVERVIEW

This is a multi-agent AI writing pipeline designed to generate ebooks
from 1,000 to 100,000+ words.

Core philosophy: - Modular execution - Controlled parallelism -
State-driven architecture - Token-efficient design

------------------------------------------------------------------------

# 2. MEMORY AGENT (Pipeline Supervisor)

Core role: - Central controller of entire pipeline - Manages state,
retries, execution flow

Responsibilities: - Track section-level progress - Dispatch agents -
Validate outputs - Handle failures - Maintain summaries

------------------------------------------------------------------------

# 3. DYNAMIC QUOTA & PACING MANAGER

Core objective: Convert user word count into: - Chapters - Sections -
Exact word quotas

Hard constraint: - 1 section = max 800--1000 words

Quota formula: 1. Total Sections = Target Words / 800\
2. Total Chapters = Sections / 5\
3. Section Target ≈ 800--900 words

Example (50,000 words): - \~60 sections - \~12 chapters - \~833 words
per section

State injection fields: - section_word_target - actual_word_count -
status

Audit loop: - Detect deficit - Redistribute targets - Ensure final count
is met

------------------------------------------------------------------------

# 4. WRITING AGENT SUB-SWARM

Execution pipeline: Sub-Agent 1 → Context Agent\
Sub-Agent 2 → Prose Drafter\
Sub-Agent 3 → Formatter\
Sub-Agent 4 → QA Critic

Key features: - Internal retry loop (max 2) - Strict QA rejection - No
fluff output

------------------------------------------------------------------------

# 5. PARALLEL EXECUTION SYSTEM

Cloud models (high parallelism): - OpenAI (ChatGPT) - Gemini - Claude

All support: - Multiple parallel API calls - Multi-agent execution

Local models (Ollama): - Limited concurrency - Safe: 1 agents

Memory Agent responsibilities: - Queue control - Load balancing

------------------------------------------------------------------------

# 6. EXECUTION FLOW (UPDATED -- WITH RESEARCH LAYER)

1.  User Input\

-   Topic\
-   Target audience (optional)\
-   Tone\
-   Word count\
-   Optional research files

2.  Research Agent Execution\

-   Analyze topic deeply\
-   Process uploaded files\
-   Extract key concepts, arguments, examples\
-   Generate Research Knowledge Base (RKB)

3.  Planning Agent\

-   Define purpose, audience, positioning\
-   Generate Table of Contents using RKB

4.  Dynamic Quota & Pacing Manager\

-   Convert word count into sections & chapters\
-   Assign word targets

5.  Chapter Micro-Outlining\

-   Expand chapters into sections\
-   Align with research

6.  Section Dispatch\

-   Memory Agent sends structured payload

7.  Writing Sub-Swarm Execution\

-   Context Agent\
-   Prose Drafter\
-   Formatter\
-   QA

8.  QA Approval

9.  Checkpoint Save

10. Audit & Quota Adjustment

11. Loop Until Completion

12. Stitch Final Book

13. Final Proofreading

14. Export Output

------------------------------------------------------------------------

FINAL FLOW: Research → Plan → Structure → Write → Validate → Store →
Adjust → Stitch → Polish → Export
------------------------------------------------------------------------

# 7. ERROR HANDLING

-   Retry failed sections only
-   Exponential backoff
-   Log errors
-   Never restart full book

------------------------------------------------------------------------

# 8. FINAL PRINCIPLE

This system is not a simple AI writer.

It is a distributed AI production pipeline designed for: - Scale -
Accuracy - Cost efficiency - Human-like writing quality

------------------------------------------------------------------------

## END
