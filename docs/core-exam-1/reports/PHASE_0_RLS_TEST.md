# Phase 0 local RLS test report

**Date:** 2026-07-28
**Environment:** Local Supabase 2.40.7, PostgreSQL 17
**Migration:** `20260728220000_core_exam_foundation.sql`

## Result

The database reset, migration, schema lint, and pgTAP policy suite pass from a
clean local database.

```text
Files=1, Tests=17
Result: PASS
```

## Identities covered

- owner;
- active member;
- suspended member;
- authenticated user belonging only to another space;
- anonymous user.

## Boundaries proved

- Anonymous users cannot read spaces or canonical content.
- Suspended members cannot read spaces or canonical content.
- Active members see only their own active spaces, shared active profiles, and
  canonical content for those spaces.
- Members cannot insert canonical nodes directly.
- Members cannot insert memberships directly.
- Members may update only their own profile.
- Non-owner members cannot update space metadata.
- Active owners may update their space metadata.
- Parent relationships and stable-key aliases cannot cross spaces.

## Remaining before staging

- Add conflict-aware RPCs before granting canonical write capability.
- Add tests for immutable revision insertion/current-pointer advancement.
- Add private Storage policies and file-access tests in the source-library
  migration.
- Repeat the identity matrix against the linked staging project before
  production.
