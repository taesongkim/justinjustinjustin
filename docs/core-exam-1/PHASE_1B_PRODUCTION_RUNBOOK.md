# Core Exam 1 — Phase 1B Production Runbook

This runbook makes the first friend release reversible. It does not authorize a
deployment and contains no project references or credentials.

## Current release status

Go-live in progress (2026-08-04). Schema is pushed to the live project
(`supabase db push`; all `core_exam_*` tables present and empty). Remaining
before friends are invited: provision members (Phase 2), import content +
sources + reconciled questions/answers (Phase 3), configure hosted Auth (Site
URL + magic-link callback allowlist), deploy with `CORE_EXAM_PREVIEW_ENABLED`
off, then flip it on and run the smoke test. The user-hue system + top-bar
scoreboard (added 2026-08-04) ship with this release.

## Environment contract

Vercel preview and production require:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CORE_EXAM_PREVIEW_ENABLED=true` only for an approved preview/release

The production build must not depend on:

- `.local-archive/`
- `CORE_EXAM_SOURCE_MAP`
- local Supabase ports or credentials
- a service-role key in browser-accessible environment variables

Setting `CORE_EXAM_PREVIEW_ENABLED=false` and redeploying is the route-level
kill switch.

## Supabase auth checklist

- Site URL uses the approved production origin.
- Exact callback URLs are allowlisted for local, preview, and production.
- Invited users are pre-created and assigned an active membership before they
  request a magic link.
- Email sign-in remains enabled.
- Uninvited-user creation remains disabled by application code and is verified
  with a non-member address.
- Owner, active member, suspended member, authenticated non-member, and
  anonymous behavior are smoke-tested.

## Staging migration rehearsal

1. Link only the intended staging project.
2. Confirm the linked project before every remote command.
3. Rebuild and test locally:

   ```sh
   npm run core-exam:test-db
   npm run core-exam:verify-sources
   npm run core-exam:local-auth-fixture
   npm run core-exam:import-content-nodes
   npm run core-exam:import-content-revisions
   npm run core-exam:import-source-library
   npm run core-exam:import-question-bank -- --dry-run
   ```

4. Preview remote changes:

   ```sh
   supabase db push --dry-run
   ```

5. Review the exact migration list and then apply it:

   ```sh
   supabase db push
   ```

6. Import deterministic content, questions, source catalog metadata, and
   system-managed source objects through the approved production-safe import
   path.
   - Import the 17 sourced page roots as `canonical-markdown` revisions and
     verify each content node points to the expected immutable current
     revision.
   - Keep the four `collaborative-empty` topics revision-less.
   - Import all 29 catalog entries and checksum-validated files as
     system-managed group assets with immutable versions in the private
     `core-exam-files` bucket.
   - Include the finalized `AI-Assistant` answer bank only after verifying
     exact one-answer-per-active-question coverage.
   - Create the reserved identity as a non-owner member with an undeliverable
     `.invalid` email.
   - Remove its one-time bootstrap events so the initial answer corpus does not
     create fake unread activity; keep the answers group-visible and
     commentable.
7. Record row/object counts and checksums.
8. Run the owner/member/non-member browser matrix against staging.

**Hosted import path (decided 2026-08-04, supersedes the earlier "local-only,
never repoint" rule).** The import scripts now share
`scripts/core-exam/lib/target.mjs` (`resolveAdminTarget()`). They default to
local (`supabase status`, localhost-only) and reach hosted **only** with an
explicit `CORE_EXAM_TARGET=hosted` plus `HOSTED_SUPABASE_URL` +
`HOSTED_SERVICE_ROLE_KEY`, at which point the guard inverts to require an
`https://<ref>.supabase.co` URL and refuse localhost. A hosted write now takes
deliberate opt-in and cannot happen by accident. Member provisioning uses
`scripts/core-exam/provision-hosted-members.mjs` (creates confirmed users,
upserts the space, upserts profiles without `avatar_color` so the hue trigger
assigns colors, upserts active memberships).

**Questions + answers reconcile to the live local set, not the archive.** The
finalized archives hold 95 questions / 95 AI answers, but the owner's current
curation is **84 active questions / 80 AI answers** (11 trimmed after
finalization; 4 kept questions intentionally left without an AI answer). Prod
mirrors the live local set: import, then trim to the current active/answered
stable-keys. Content nodes, revisions, and the 29 sources are unchanged from the
archive and import normally.

## Backup before production migration

Store exports only under the Git-ignored local archive, for example:

```text
.local-archive/core-exam/backups/<timestamp>/
```

After confirming the linked project:

```sh
supabase db dump --linked --role-only \
  --file .local-archive/core-exam/backups/<timestamp>/roles.sql

supabase db dump --linked \
  --file .local-archive/core-exam/backups/<timestamp>/schema.sql

supabase db dump --linked --data-only --use-copy \
  --file .local-archive/core-exam/backups/<timestamp>/data.sql
```

Also record:

- the source-object inventory and checksums;
- the deployed application commit;
- the prior known-good Vercel deployment;
- the migration list applied to the database.

Database exports do not back up Storage objects. Canonical source-object
retention must be verified separately.

## Production deployment

1. Confirm Checkpoint 2 approval.
2. Confirm the backup artifacts and prior deployment.
3. Run local database, source, lint, type, and production-build checks.
4. Apply the already-rehearsed migrations.
5. Import production data and source objects; verify counts/checksums.
6. Deploy the exact reviewed commit.
7. Run the production smoke test:
   - owner login;
   - member login;
   - non-member denial;
   - topic and reference navigation through authenticated database revisions;
   - all five Source Library sections, representative PDF/text sources, and
     direct anonymous/non-member source denial;
   - shared/private answer isolation;
   - `AI-Assistant` answer attribution, Markdown formatting, and citation
     targets, with no AI bootstrap events in Activity;
   - shared/private note isolation;
   - verification;
   - question/comment/study-signal activity;
   - Activity and Group Discussion deep links;
   - desktop and phone source viewing;
   - sign out and protected-route denial.
8. Invite the first friend only after the smoke test passes.

## Rollback and mitigation

Application rollback:

1. Set `CORE_EXAM_PREVIEW_ENABLED=false` and redeploy if access must stop
   immediately.
2. Promote the prior known-good Vercel deployment.
3. Verify `/core-exam-1` no longer exposes the failed release.

Database rollback:

- Do not drop collaborative tables after member data exists.
- Disable the affected write path in the application.
- Preserve revisions, activity, verification events, and attribution.
- Ship a forward repair migration rehearsed against a restored backup.
- Restore from backup only for confirmed destructive corruption, with explicit
  approval and a separately verified Storage recovery plan.

Record the incident, deployed commit, migration state, data checks, and final
recovery result.
