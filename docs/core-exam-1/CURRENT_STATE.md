# Core Exam 1 — Current-State Audit

**Date:** 2026-07-28
**Current source:** `CoreStudies/Y2Exam`
**Target route:** `https://justinjustinjustin.com/core-exam-1`

## Executive summary

Core Exam 1 is currently a polished, single-file browser application backed by a carefully researched Markdown corpus. It is strong as a solo, offline study reader but has no server-side identity or shared data layer. The correct migration is a native Next.js page inside the `justinjustinjustin` repository—not an iframe and not a permanent continuation of the monolithic HTML file.

The Markdown source corpus should remain authoritative during migration. The HTML is generated presentation output.

## Current application

- `Y2Exam/index.html`: approximately 207 KB and 2,217 lines.
- Twelve study topics plus crosswalks, source records, gaps, conflicts, a question bank, and the verified Kessler chart.
- Responsive sidebar, mobile navigation, dark mode, print rules, citation links, and verification controls.
- Handwritten Markdown renderer and hash router.
- Source Markdown embedded in `<script type="text/plain">` blocks.
- No build manifest or injector script is present, although the HTML header says an injector was used.

## Current persistence

Verification state uses browser `localStorage` under `ce_study_verify`.

Each marked claim stores:

- status: `verified` or `flagged`;
- citation text;
- timestamp.

It does not store:

- a user;
- a shared history;
- an edit reason;
- a stable server-side record.

Export/import replaces the browser-local store using JSON.

## Identity weakness

Claims are identified by hashing normalized rendered text, citation text, and occurrence order. Editing the surrounding wording can change the hash and detach previously stored verification state.

Before collaborative data is attached, every addressable topic, section, claim, chart, table, and source excerpt needs an immutable stable key.

## Source corpus status

The source corpus is substantially complete and unusually well documented:

- `00_MASTER_TOC.md`
- `00_EXTRACTION_RECORD.md`
- `01_CONFLICT_REGISTER.md`
- `02_CROSSWALK.md`
- `03_FIVE_PATTERNS.md`
- `04_SEVEN_TOPICS.md`
- `05_GAP_REGISTER.md`
- `06_KESSLER_CHART_VERIFIED.md`
- `07_CORRECTIONS_TODO.md`

Some status prose is stale. For example, the extraction record says synthesis has not started even though synthesis is complete. The corrections appear reflected in downstream documents, but the correction register does not mark completion explicitly. Reconciliation belongs in the migration phase; it should not silently alter study meaning.

## Personal-site findings

The confirmed target repository is:

`/Users/taesongkim/Code/justinjustinjustin`

Relevant characteristics:

- Next.js 16 App Router
- React 19
- strict TypeScript
- Tailwind 4
- Supabase JavaScript client already installed
- TipTap rich-text editor already installed
- GitHub/Vercel deployment from `main`

Recommended destination:

`app/core-exam-1/`

Core Exam should use a route-specific layout and locally scoped styles so the global site CSS does not accidentally alter the study interface.

## Existing patterns that must not be copied blindly

- The shared `app/lib/supabase.ts` is a browser-style singleton. Core Exam needs session-aware server and browser clients.
- The Mindshrine magic-link screen is a partial prototype and points to a different Supabase project.
- The habit tracker documents permissive “allow all” policies and uses public file URLs. Those patterns are unsuitable for private study material.
- There is no existing middleware, `@supabase/ssr`, migration directory, automated test framework, or RLS test harness.

## Repository safety

At audit time, the personal-site repository was on `main` with unrelated modified and untracked files. Core Exam implementation must begin in a clean worktree or after those changes are safely handled. No current work should be overwritten, staged, or absorbed into a Core Exam commit.

## Migration constraints

1. Preserve study content and citation meaning.
2. Introduce permanent content IDs before importing shared state.
3. Do not expose PDFs or uploads through public bucket URLs.
4. Do not treat “authenticated in Supabase” as “authorized for Core Exam.”
5. Preserve attribution when accounts are suspended or display names change.
6. Keep revision and verification history append-only.
7. Do not invent an author for old local verification marks.
