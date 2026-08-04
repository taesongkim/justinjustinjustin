# Core Exam 1 Planning Package

**Target:** `https://justinjustinjustin.com/core-exam-1`
**Prepared:** 2026-07-28

## Read in this order

1. [`CURRENT_STATE.md`](CURRENT_STATE.md)
2. [`prd-collaborative-study-system.md`](prd-collaborative-study-system.md)
3. [`architecture/CONTENT_IDENTITY.md`](architecture/CONTENT_IDENTITY.md)
4. [`architecture/SUPABASE_MODEL.md`](architecture/SUPABASE_MODEL.md)
5. [`architecture/AUTH_PERMISSIONS_STORAGE.md`](architecture/AUTH_PERMISSIONS_STORAGE.md)
6. [`design/COLLABORATION_UX.md`](design/COLLABORATION_UX.md)
7. [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)
8. [`EXECUTION_RUNBOOK.md`](EXECUTION_RUNBOOK.md)
9. [`QA_AND_RELEASE.md`](QA_AND_RELEASE.md)
10. [`NEXT_ACTIONS.md`](NEXT_ACTIONS.md)
11. [`PHASE_1B_RELEASE_AUDIT.md`](PHASE_1B_RELEASE_AUDIT.md)
12. [`PHASE_1B_PRODUCTION_RUNBOOK.md`](PHASE_1B_PRODUCTION_RUNBOOK.md)
13. [`Question Workshop PRD`](../../prd-question-workshop.md)

## Approved inputs

- Personal-site repo: `/Users/taesongkim/Code/justinjustinjustin`
- Route: `/core-exam-1`
- Supabase email magic-link login
- Persistent logged-in session
- Identity visible throughout the interface
- Notes and definitions group-visible by default with a private option
- Any active member may edit canonical content
- Canonical edits log actor, time, and optional edit summary
- One reply level for comments
- First usable release: identity, verification, and basic notes
- Users may upload PDFs/images for private or group reference
- Canonical pages show group commentary beside the study content on desktop
- Mobile pages provide a purpose-built Content/Discussion interaction
- The complete approved source corpus is available through an authenticated in-site library/viewer
- Existing personal-site Supabase project should be reused

## Approved defaults

Approved by Justin on 2026-07-28.

1. One shared verification state with append-only history.
2. Users may edit canonical content and their own contributions, but not another person’s note or definition.
3. Master sheets are private in V1.
4. Canonical edits publish immediately.
5. Pins are live and show when their source changed.
6. Member-upload limit is 50 MB; formats are PDF, JPEG, PNG, and WebP. Owner/admin canonical-source imports may be larger.
7. A shared contribution cannot become private while other users’ comments or pins depend on it.
8. Comment revisions are deferred; edited comments show an edited timestamp.
9. Desktop discussion uses a collapsible/resizable neighboring column, with final proportions chosen in a live visual review.
10. Mobile discussion uses Content/Discussion tabs with independent scroll and draft preservation.

Future behavioral changes require an explicit override and a corresponding PRD
or architecture update.

## Required Justin review checkpoints

1. Product frame: desktop split view, tablet response, mobile switching, identity, source viewer.
2. Identity: two-account login and wrong-account clarity.
3. First usable release: migrated content, sources, notes, verification, and responsive layout.
4. Collaboration: editing, history, comments, definitions, and conflicts.
5. Files/activity: uploads, viewer, feed, and notifications.
6. Master sheet: composition, mobile use, embeds, and print.

The implementation run should pause at each checkpoint and provide a focused preview/review script.

## Current handoff state

The planning package now lives in the personal-site repository. Its pre-existing
uncommitted work has been separated into active documentation, labeled
historical archives, and a Git-ignored local archive for private or unused
material. These changes remain uncommitted for Justin's review.

Before implementation:

1. Review and approve the repository-cleanup diff and commit grouping.
2. Establish a clean Core Exam feature branch/worktree after cleanup lands.
3. Establish scoped Supabase access and a staging migration workflow.
