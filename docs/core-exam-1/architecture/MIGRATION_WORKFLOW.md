# Core Exam migration workflow

## Ownership

Core Exam migrations live in `supabase/migrations/` and use the prefix
`core_exam_` for tables, functions, enums, policies, indexes, and buckets.
Each migration owns one coherent schema change and lands with its RLS policies.

No production-only SQL is permitted. Dashboard changes must be represented by a
checked-in migration or documented configuration step.

## Environments

1. Local Supabase for syntax, reset, and seed rehearsal.
2. A linked staging project for multi-identity RLS tests and private Storage.
3. Production only after the phase gate passes and a backup exists.

The existing `.env.local` browser credentials do not authorize migrations.
Linking a staging project requires a scoped Supabase CLI login or access token.

## Commands

```sh
supabase start
supabase db reset
supabase db lint
supabase test db
```

When staging access is configured:

```sh
supabase link --project-ref <staging-project-ref>
supabase db push --dry-run
supabase db push
```

Never place project refs, database passwords, service-role keys, or access
tokens in committed files.

## First migration

`20260728220000_core_exam_foundation.sql` creates:

- profiles;
- spaces;
- memberships;
- canonical content nodes and immutable revisions;
- stable-key aliases;
- active-membership and owner authorization helpers;
- initial RLS policies and grants.

It intentionally does not create member uploads, comments, notes, verification,
or Storage buckets. Those belong to later coherent migrations.

Canonical tables are read-only to ordinary authenticated clients in this
migration. A later migration will add conflict-aware RPCs for revision writes;
granting raw table writes would allow callers to bypass immutable stable keys
and base-revision checks.

## Rollback and mitigation

Before shared data exists, rollback may drop the Core Exam objects in reverse
dependency order. After data exists, do not drop tables. Disable affected write
paths, restore the prior application commit, and ship a forward repair
migration.
