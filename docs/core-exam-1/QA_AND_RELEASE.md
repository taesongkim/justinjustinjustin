# Core Exam 1 — QA, Migration, and Release Plan

## Test layers

### Unit

- stable-key and alias resolution;
- content serialization/sanitization;
- visibility helpers;
- revision conflict detection;
- activity copy generation;
- upload validation;
- master-sheet update markers.

### Database and RLS

Run policy tests as:

- owner;
- active member A;
- active member B;
- authenticated non-member;
- suspended member;
- anonymous user.

Cover select, insert, update, delete/archive, RPC execution, counts, search, Realtime subscriptions, notifications, and Storage access.

### Integration

- invite/login/callback/logout;
- membership enforcement;
- canonical revision transaction;
- verification event and current-state transaction;
- contribution visibility changes;
- comment reply-depth constraint;
- upload finalization and version replacement;
- activity/notification creation;
- pin source-revision tracking.

### End-to-end

1. Member A logs in and sees their identity.
2. Member A verifies a claim.
3. Member B sees actor, time, and history.
4. Member A creates a group note; B comments and replies once.
5. Member A creates a private note; B cannot discover it by URL, search, feed, count, or API.
6. A and B edit the same canonical node; one receives a conflict.
7. A restores a prior canonical revision.
8. A uploads a group PDF and private image.
9. B opens the group PDF but cannot access the private image or its metadata.
10. A pins content; B edits it; A sees the update marker.
11. Non-member and suspended accounts cannot enter.
12. A long canonical page and page discussion remain simultaneously usable on desktop.
13. Mobile Content/Discussion switching preserves both scroll positions and an unsent comment draft.
14. A block-comment deep link opens the correct mobile mode and highlights its canonical target.
15. Every canonical source opens for a member and fails for a non-member.

## Content parity

Before launch compare old and new:

- page/topic count;
- heading hierarchy;
- claim and citation count;
- chart section/row/cell count;
- source links;
- conflict and gap entries;
- topic navigation;
- dark/mobile/print behavior.
- complete source-file inventory and checksums;
- citation-to-source and citation-to-page resolution;
- page-level discussion target for every canonical page.

Differences must be classified as intentional, fixed, or accepted with an owner.

## Accessibility

- keyboard-only primary flows;
- focus order and restoration;
- screen-reader labels for verification/privacy;
- dialog semantics;
- reduced motion;
- color contrast;
- zoom and small viewport;
- non-drag reordering;
- error announcement.
- labeled independent desktop reading/discussion regions;
- accessible Content/Discussion switcher with selected/unread state;
- accessible PDF/image viewer controls and fallback.

## Responsive matrix

Test at minimum:

- narrow phone portrait;
- phone landscape;
- large phone/small tablet;
- tablet portrait;
- tablet landscape;
- laptop;
- wide desktop.

For each, verify:

- canonical line length and no horizontal overflow;
- identity remains obvious;
- navigation and activity access;
- discussion access and unread state;
- comment composer and on-screen keyboard behavior;
- scroll/draft preservation;
- source viewer controls;
- orientation changes.

Use at least one real iOS Safari device and one real Chromium-based mobile browser before inviting friends.

## Performance

- initial protected-route loading does not flash study data;
- long topic pages remain responsive;
- activity and comments paginate;
- files load on demand;
- editor code is lazy-loaded where practical;
- Realtime subscriptions are scoped and cleaned up.

## Migration rehearsal

1. Create staging schema/bucket.
2. Run migrations from empty state.
3. Seed profiles/membership fixtures.
4. Import deterministic canonical content.
5. Generate migration report with checksums/counts.
6. Run parity and RLS suites.
7. Import a sample legacy verification export.
8. Re-run migration to prove idempotence or safe failure.
9. Rehearse rollback/restore.

## Release gates

### First usable release

- No high-severity RLS findings.
- No lost canonical content.
- Identity visible throughout.
- Verification and notes work between two accounts.
- Private note isolation proven.
- Production callback and email link tested.
- Backup and rollback steps recorded.
- Justin has approved Checkpoints 0, 1, and 2.
- Canonical source inventory is complete and member-only viewing is proven.

### File release

- Private bucket only.
- Type/size/signature checks.
- Private file isolation proven.
- Version replacement proven.
- Removal/archive cleanup documented.

### Master-sheet release

- Private isolation proven.
- Broken/archived references degrade gracefully.
- Updated-pin state works.
- Print output manually reviewed.

## Production smoke test

- owner login;
- member login;
- non-member denial;
- topic navigation;
- identity display;
- create/read private note;
- create/read group note;
- verification event;
- activity deep link;
- upload/open file when that phase ships;
- sign out and protected-route denial.

## Rollback

- Application rollback uses the previous known-good Vercel deployment.
- Database changes require migration-specific mitigation; do not assume application rollback reverses schema.
- Prefer additive migrations and compatibility windows.
- Preserve revision/event data during rollback.
- Storage object recovery and database recovery are separate concerns.
