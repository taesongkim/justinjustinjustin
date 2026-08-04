# PRD: Core Exam Question Workshop

**Date:** 2026-07-30

---

## Problem Statement

### What problem are we solving?

The starting question bank is currently extracted from one private canonical
document, assumes exactly 90 numbered questions, and hard-codes topic assignment
by question number. That source is useful historical input, but it is a poor
editorial surface for retaining, rewriting, removing, adding, and reordering the
questions that will lead the collaborative study product.

### Why now?

The starting questions must be intentionally curated before the first
friends-and-family release. Once real answers and discussion accumulate,
question identity and destructive replacement become materially more costly.

### Who is affected?

- **Primary user:** the Core Exam owner curating the pre-launch question bank.
- **Secondary users:** invited study members who will read and answer the
  finalized questions.

---

## Proposed Solution

### Overview

Add a development-only, owner-only Question Workshop inside Core Exam. It
supports inline rewriting, addition, reversible removal, foundational-to-nuanced
reordering, private draft persistence, real-page preview, CSV backup, and an
explicit finalization step.

Question content and draft snapshots remain under the Git-ignored private
archive. The application database remains the runtime source. Stable identities
are maintained behind the interface.

### User Flow: Curate a topic

1. The owner opens Question Workshop and selects one of the 12 topic tabs.
2. The owner edits question wording, adds questions, removes questions, and
   reorders the active list.
3. The owner saves the private draft.
4. The owner previews that topic in the normal Core Exam card layout.
5. The owner returns and repeats until every topic is approved.

### User Flow: Finalize the bank

1. The owner opens the finalization confirmation.
2. The system writes timestamped baseline and final draft snapshots.
3. The system atomically applies the question bank and archives omitted or
   removed curated questions.
4. The system clears local test answers, comments, study signals, hidden marks,
   and activity attached to curated questions.
5. The finalized private manifest becomes the input for the later production
   import.

### Design Considerations

- The active topic and dirty state remain visible.
- Drag reordering also has keyboard-accessible Move up/Move down controls.
- Removal is reversible and uses archive semantics.
- Technical stable keys are never required editing fields.
- Preview never performs the clean reset; only explicit finalization does.

---

## End State

- [ ] The owner can curate every topic without editing source files.
- [ ] Question count is no longer fixed at 90.
- [ ] Existing retained questions keep stable identities.
- [ ] Removed questions remain archived and restorable.
- [ ] Added questions receive stable identities automatically.
- [ ] Draft, baseline, CSV, and finalized snapshots are recoverable.
- [ ] Finalization clears only local curated-question collaboration data.
- [ ] The workshop cannot be opened outside development or by non-owners.

---

## Acceptance Criteria

### Editorial workflow

- [ ] All 12 topic tabs display their active and removed questions.
- [ ] Inline edits, additions, removals, restores, and reordering survive Save
  draft and reload.
- [ ] Preview applies the draft without clearing current test collaboration.
- [ ] CSV export and import round-trip stable identities and ordering.

### Finalization

- [ ] Finalization requires a separate confirmation action.
- [ ] A timestamped snapshot exists before data cleanup.
- [ ] Curated questions absent from the active draft are archived.
- [ ] Retained question rows keep their stable keys.
- [ ] Curated-question answers, comments, likelihood marks, hidden marks, and
  activity are cleared.
- [ ] Community-submitted questions and their collaboration remain untouched.

### Security and privacy

- [ ] Only an active Core Exam owner can call the sync function.
- [ ] The UI and route return unavailable outside development.
- [ ] Private question manifests are ignored by Git and are not bundled into
  the client.

---

## Technical Context

### Existing Patterns

- `app/core-exam-1/lib/viewer.ts` resolves authenticated membership and role.
- `app/core-exam-1/lib/questions.ts` loads active questions by topic and rank.
- `scripts/core-exam/import-local-question-bank.mjs` performs the current
  hard-coded canonical-document extraction and local upsert.
- `core_exam_questions.stable_key` provides durable curated-question identity.
- Curated questions use `archived_at`; personal and community activity use
  dependent tables protected by RLS.

### Data Model Changes

- Add an owner-only atomic curated-question synchronization function.
- Do not add a public editing table for the temporary workshop.
- Store draft and finalized manifests under
  `.local-archive/core-exam/question-workshop/`.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| A rewrite makes old answers misleading | High | Medium | Clear local curated-question collaboration only at explicit finalization. |
| A removed question loses identity | Low | High | Archive rows and keep stable keys in snapshots. |
| Preview accidentally clears data | Low | High | Separate preview and finalize RPC flags with regression tests. |
| Private content enters the repository | Low | High | Keep manifests in the existing ignored archive and validate the path server-side. |
| Drag controls are inaccessible | Medium | Medium | Provide Move up and Move down buttons for every question. |

---

## Alternatives Considered

### Spreadsheet-first workflow

- **Pros:** fast bulk editing and familiar sorting.
- **Cons:** lacks real card context and requires repeated imports to preview.
- **Decision:** retain CSV as a backup, not the primary editor.

### Chat-only topic review

- **Pros:** no temporary interface work.
- **Cons:** slow, transcription-prone, and poor for global ordering.
- **Decision:** rejected.

---

## Non-Goals

- A production question-administration interface.
- Collaborative editing of curated questions.
- Production preservation of the current local test answers or activity.
- Editing community-submitted questions in the workshop.
- Replacing the later canonical revision/history system.

---

## User-visible copy candidates

### A. Workshop

- **A1** Page title: `"Question Workshop"`
- **A2** Draft action: `"Save draft"`
- **A3** Preview action: `"Preview in site"`
- **A4** Final action: `"Finalize question bank"`
- **A5** Add action: `"Add question"`
- **A6** Remove action: `"Remove from starting questions"`
- **A7** Restore action: `"Restore"`

### B. Finalization

- **B1** Warning: `"This will replace the local starting-question set. Removed questions will remain archived."`
- **B2** Cleanup notice: `"Current local answers, comments, study signals, hidden marks, and activity attached to starting questions will be cleared."`
- **B3** Confirmation: `"Finalize and clear test activity"`
- **B4** Success: `"Question bank finalized. A private snapshot was saved."`

### C. Empty and error states

- **C1** Empty topic: `"No starting questions yet."`
- **C2** Save failure: `"We couldn’t save this draft."`
- **C3** Preview failure: `"We couldn’t apply this preview."`
- **C4** Finalization failure: `"We couldn’t finalize the question bank. No test activity was cleared."`

