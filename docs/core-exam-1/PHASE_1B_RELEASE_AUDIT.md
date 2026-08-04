# Core Exam 1 — Phase 1B Release Audit

**Audit date:** 2026-07-30  
**Branch:** `core-exam-product-frame`  
**Target:** first reversible friends-and-family release

## Current verdict

The local collaborative product is substantially through Phase 1B. Identity,
questions, personal answers, comments, study signals, hidden questions,
verification, exact-block contributions, Activity, Group Discussion, indexes,
and deep links are implemented and locally testable.

The phase is **not yet production-ready**. The canonical reader now prefers
member-gated immutable database revisions, and all 29 inventoried sources are
represented by member-gated catalog rows, immutable asset versions, and
private Storage objects. The application no longer needs the local source map
at request time when the database and Storage imports are present. A reviewed
hosted import, staging rehearsal, and deployed multi-account acceptance still
must land before friends are invited.

## Gate matrix

| Phase 1B requirement | Status | Evidence or remaining work |
| --- | --- | --- |
| Active-member identity and authorization | Local pass | Magic-link auth, visible identity, membership checks, and RLS tests exist. Login now refuses to create uninvited users. Production callbacks remain untested. |
| Curated foundational-to-nuanced questions | Pass | The owner finalized 95 active and 4 archived curated questions across the 12 seeded topics. The private Question Workshop preserves rewriting, adding, reversible removal, reordering, preview, CSV backup, and timestamped finalization. |
| Seeded starting answers | Local pass | Every active curated question has one timestamped, group-visible, commentable `AI-Assistant` answer. The reserved identity uses an undeliverable `.invalid` address, and bootstrap events are removed from Activity. A production-safe import path remains required. |
| Questions and answers are primary | Pass | Topic pages lead with questions; complete canon remains supporting content. |
| One personal answer per member/question | Pass | Conflict-aware RPC and unique active-answer constraint. |
| Group/private answers | Local and DB pass | Private visibility is enforced by RLS and excluded from group feeds. |
| Question and answer comments | Local and DB pass | One reply level is enforced; deep links target actual comments. |
| Community questions | Local and DB pass | New questions append to the topic and appear in indexes/activity. |
| Attributable likelihood | Pass | Counts, visible “See who chose each” disclosure, durable activity, and page-feed entries. |
| Reversible Hide for me | Pass | Attribution, recovery section, indexes, Activity, and page-feed entries. |
| My Answers and All Questions | Pass | Complete 95-question indexes with topic attribution and filters. |
| Shared verification | Pass | Actor, time, note, history, activity, page feed, and exact-block navigation. |
| Notes and definitions | Pass for basic Phase 1B | Group/private creation and revision, author-only edits, Activity, page feed, and exact-block navigation. Revision history UI remains Phase 2. |
| Global Activity | Pass locally | Durable per-user viewed state, other-user unread dots, group-only events, space scoping, and exact-target navigation. |
| Page Group Discussion | Pass locally | Page-scoped feed, real mobile count, study-signal entries, and mobile Content switching. |
| Complete canonical reader | Local and DB pass | 550 stable nodes across 16 topics and 5 reference pages; 17 sourced root pages load from immutable, member-gated Markdown revisions. Four new topics are intentionally source-less and group-built. The reader falls back to the private source map only in development. |
| Complete private Source Library | Local and DB pass | All 29 inventoried sources are cataloged and checksum-validated in private Supabase Storage. Active-member policies protect catalog, asset, version, and object reads. PDFs use short-lived signed delivery; text, Markdown, and HTML evidence are escaped into a script-disabled authenticated viewer. |
| Legacy verification disposition | Resolved | Preserve the legacy marks in the archive only; do not import them into the new collaborative history. |
| Two-account acceptance | Partial | Database suite covers multiple identities. Justin/friend browser acceptance is still required. |
| Production backup, rollback, and migration rehearsal | Documented, not executed | See `PHASE_1B_PRODUCTION_RUNBOOK.md`. Requires linked staging/production access and a known-good deploy. |

## Fixes made during this audit

- Prevent uninvited magic-link requests from creating Supabase users.
- Scope Global Activity to the current Core Exam space.
- Keep private answers and contributions out of group-scoped feeds.
- Expose Activity on phone-width layouts.
- Replace the hard-coded mobile Discussion badge with the real entry count.
- Switch mobile feed deep links to Content before revealing their target.
- Show likelihood attribution without requiring hover.
- Include likelihood, hide, and restore actions in page Group Discussion.
- Show the saved visibility state on the member’s answer.
- Add a development-only, owner-only Question Workshop backed by private
  drafts, stable identities, reversible archival, preview, CSV round-trip, and
  timestamped finalization snapshots.
- Import all 17 sourced reader pages as immutable canonical Markdown revisions,
  advance each node’s current-revision pointer, and make the authenticated
  reader database-first.
- Enforce canonical revision immutability at the database layer, including for
  privileged import sessions.
- Add a real five-section Source Library covering all 29 books, lectures,
  school notes, canonical documents, and migration-evidence artifacts.
- Store source files in a private bucket with immutable asset versions,
  member-only metadata/object policies, and authenticated source delivery.
- Keep PDFs range-friendly through short-lived signed URLs and render all
  text-like sources as escaped, script-disabled documents.

## Remaining release blockers

1. Add a reviewed hosted one-time import path for canonical revisions, the
   finalized questions, `AI-Assistant` starting answers, and the 29 source
   catalog/assets/objects. The current deterministic importers intentionally
   refuse remote Supabase URLs.
2. Rehearse migrations against staging, capture backups, and verify the
   application kill switch and prior-deployment rollback.
3. Complete owner/member/non-member acceptance in the deployed preview.

## Automated and behavioral evidence

- 29 source files and checksums validated.
- 550 stable content identities validated: 16 topics, 5 references, and their
  addressable canonical blocks.
- 95 active and 4 archived curated questions finalized across the 12 seeded
  topics; Topics 13–16 intentionally begin empty for human participants.
- Exact 95/95 `AI-Assistant` answer coverage validated, including citation
  syntax and an idempotent local import.
- All 17 sourced reader roots import as database Markdown revisions; a second
  run reports all 17 unchanged.
- All 29 private source files pass byte/checksum validation, import into
  Storage, appear in the Source Library, and report unchanged on a second run.
- A privacy-transition migration and regression suite now withdraw prior group
  activity when its answer or contribution becomes private.
- All 170 database assertions pass across identity, canonical and asset-version
  immutability, source/object privacy, verification, answers, comments, study
  signals, hidden questions, activity, privacy transitions, and owner-only
  question-bank synchronization.
- Core Exam targeted ESLint, full TypeScript, and whitespace checks pass. The
  repository-wide lint command still reports pre-existing errors in unrelated
  pages and experiments.
- Phone-width browser checks pass for Activity access, dynamic Discussion
  counts, visible likelihood attribution, page-feed study signals, and
  Discussion-to-Content exact-target navigation.
- Browser checks pass for the 29-item Source Library, all five catalog
  sections, citation-to-source navigation, PDF signed delivery, and escaped
  text-source rendering.
