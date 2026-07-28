# Core Exam 1 — Next Actions and Justin Checkpoints

## Immediate next actions

### 1. Approve or override the proposed defaults

Reply with either:

```text
Ship the proposed defaults.
```

or overrides such as:

```text
6 → 50 MB member uploads
9 → fixed-width commentary column
```

The numbered list is in `README.md`.

### 2. Review the preserved repository cleanup

The personal-site repository is now writable and the planning package has been
moved into `docs/core-exam-1/`. Existing uncommitted work has been preserved
without committing or pushing.

### 3. Land the reviewed cleanup separately

The personal-site `main` still contains the reviewed cleanup as uncommitted
changes. Before Core Exam implementation:

- approve the proposed file destinations;
- split the cleanup into the agreed focused commits/PRs;
- keep private local-archive material out of Git.

Do not mix them into Core Exam commits.

### 4. Establish a clean Core Exam branch/worktree

Recommended branch:

```text
core-exam-foundation
```

The project convention is descriptive kebab-case with no prefix.

### 5. Connect Supabase safely

For planning, no credential is needed. Before schema work, Codex needs a scoped way to:

- run and record migrations;
- create/test RLS;
- configure or verify the private bucket;
- test auth redirects in a non-production environment.

Justin may need to complete an initial CLI login or approve dashboard changes. Never paste service-role credentials into chat or commit them.

### 6. Provide initial membership privately

When authentication is ready, provide:

- invited email;
- display name;
- optional preferred identity color;
- owner/member role.

Do not add member emails to public planning documents.

## Source-library preparation

The current CoreStudies source inventory includes PDFs, lecture PDFs/text files, the verified chart material, and extraction/source records. Phase 0 will produce a canonical inventory with:

- source key;
- title/author/edition;
- local file;
- checksum;
- page-number convention/offset;
- citation mappings;
- viewer type;
- import status.

Justin verifies the inventory before upload. This is the point to flag any source that should not appear in the live library.

## Where Justin steps in

### Checkpoint 0 — layout prototype

Before full UI implementation, review a representative topic with:

- real long-form canonical text;
- desktop commentary column;
- tablet behavior;
- mobile Content/Discussion switching;
- persistent identity;
- a sample source viewer.

Tune column width, gutter, sticky behavior, density, and breakpoints live. Do not approve from static wireframes alone.

### Checkpoint 1 — authentication and identity

Use two accounts. Confirm that you can always tell who is signed in, especially before editing or verifying.

### Checkpoint 2 — first usable release

Compare old and new content, open source citations, create group-visible/private notes, verify a claim, and test desktop plus a real phone. Friends are not invited until this passes.

### Checkpoint 3 — editing and discussion

With a second account, test concurrent editing, revision history, restore, page discussion, block comments, replies, and mobile deep links.

### Checkpoint 4 — uploads, activity, and notifications

Upload group/private files, view sources on desktop/mobile, and decide whether feed density and notifications feel useful rather than noisy.

### Checkpoint 5 — personal master sheet

Build a real study sheet, use it on mobile, print it, and review live-pin update behavior.

## What Codex can handle after access is connected

- move the approved planning package;
- create the clean application structure;
- build migration files and RLS policies;
- create the source inventory/import tooling;
- implement auth and membership;
- build preview deployments;
- prepare focused review scripts;
- coordinate parallel implementation/review agents;
- run automated checks and migration rehearsals;
- document any dashboard-only action Justin must perform.

Justin’s recurring job is product judgment at the checkpoints—not manual database construction.
