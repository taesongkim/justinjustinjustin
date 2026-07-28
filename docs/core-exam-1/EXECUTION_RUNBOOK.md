# Core Exam 1 — Long-Run Execution Runbook

## Purpose

This runbook coordinates future Codex tasks and agents from approved product documents through production without losing decisions, content provenance, or security boundaries.

## Authority order

When documents conflict, use:

1. Explicit latest instruction from Justin.
2. Approved PRD and labeled copy overrides.
3. Architecture documents.
4. Implementation roadmap.
5. Existing code patterns, only when they do not conflict with the above.

Do not copy permissive legacy RLS or public Storage patterns.

## Session startup

Every implementation task begins by recording:

- branch/worktree and Git status;
- current phase and acceptance gate;
- relevant approved documents;
- existing unrelated changes;
- Supabase target environment;
- whether schema contracts needed by the task already exist.

Stop if the task would absorb or overwrite unrelated work.

## Task packet format

Each delegated task receives:

```markdown
Objective:
In scope:
Out of scope:
Authoritative documents:
Files/tables owned:
Dependencies:
Acceptance criteria:
Required tests:
User-visible copy labels:
Handoff evidence:
```

No two active agents own the same files or migration numbers.

## Phase coordination

### Before schema-dependent UI

- Land and review migrations.
- Generate or define database types.
- Approve RPC inputs/outputs.
- Prove RLS with multiple identities.
- Seed representative fixtures.

### Before content-dependent collaboration

- Approve stable-key manifest.
- Run content parity checks.
- Freeze key renames or add aliases.

### Before merging a workstream

- Rebase/refresh against its target safely.
- Run proportional tests.
- Review user-visible copy against labeled candidates.
- Document deviations and unresolved risks.
- Keep commits focused and imperative.
- Include the required co-author trailer.

### User review gates

Tasks that reach a roadmap “Justin checkpoint” pause after producing a preview and a concise review script. Do not proceed into high-cost visual polish or the next product phase until Justin approves or provides overrides.

Each review handoff includes:

- preview URL or locally runnable state;
- exact desktop, tablet, and mobile scenarios;
- what is real versus mocked;
- known differences from the PRD;
- labeled copy awaiting approval;
- 3–6 focused questions, not an open-ended “thoughts?”;
- screenshots when they make comparison easier.

Layout reviews must use representative long canonical pages, active discussion, private/group notes, identity, and source viewing. Empty demo cards are insufficient.

## Decision log

Non-trivial changes to product behavior require an ADR or PRD amendment. Examples:

- shared vs per-user verification;
- who may edit contributions;
- privacy transition behavior;
- pin live/snapshot behavior;
- upload limits;
- notification fan-out;
- canonical publishing/review.

Agents must not silently resolve these in code.

## Database migration rules

- One ordered migration per coherent schema change.
- Forward migration and rollback/mitigation note.
- No manual production-only SQL without capturing it in version control.
- RLS enabled in the same delivery that creates a table.
- Policies and grants reviewed as part of the schema.
- Service-role operations isolated to trusted server code.
- Actor identity derived from `auth.uid()`.

## Content migration rules

- Preserve original Markdown and source files during parity validation.
- Import through a deterministic seed/migration tool.
- Store a migration version and checksum.
- Produce counts by content kind.
- Resolve missing/duplicate stable keys before collaboration opens.
- Never invent legacy verification attribution.
- Inventory and checksum every canonical source file.
- Upload canonical sources through a deterministic owner/admin import.
- Verify source keys, page offsets, and citation links against the catalog.
- Keep source files out of the web app’s public directory.

## Design iteration

For identity prominence, content-layer styling, activity density, and master-sheet layout, use a temporary in-product controls panel when numeric visual choices need live tuning. Bake approved values and remove or development-gate the panel.

All new strings must be added to the PRD’s labeled copy section or a successor copy document before implementation.

## Required review roles

For meaningful phases, use independent review passes:

- product/UX acceptance;
- data/RLS security;
- migration/content parity;
- accessibility/responsive behavior;
- regression/build.

The coordinating task synthesizes findings, assigns owners, and decides whether the phase gate passes. Review agents do not make overlapping fixes unless assigned.

## Release procedure

1. Merge only after phase acceptance criteria pass.
2. Deploy to a preview/staging environment.
3. Test with owner, member A, member B, non-member, and anonymous sessions.
4. Verify production Supabase redirect allowlist.
5. Rehearse migration and rollback.
6. Back up database and relevant Storage metadata.
7. Deploy.
8. Run production smoke tests.
9. Invite the first friend only after Justin completes Checkpoint 2.
10. Record release outcome and follow-ups.

## Blockers requiring Justin

- target repo is not writable/connected;
- unrelated dirty work overlaps the planned files;
- Supabase access or redirect configuration requires dashboard approval;
- member email list is unavailable;
- a proposed default is rejected without a replacement;
- source-content or sharing authorization changes;
- production release approval.

## Completion standard

A phase is not complete because code exists. It is complete when:

- its acceptance gate passes;
- migrations and policies are reproducible;
- user-visible copy is approved;
- automated checks pass;
- behavioral verification is recorded;
- documentation matches the shipped behavior;
- no known high-severity privacy or data-loss issue remains.
