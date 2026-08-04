# Supabase Data Model

**Status:** Implemented locally through Phase 1B; hosted rehearsal pending
**Project:** Existing environment-backed Supabase project for `justinjustinjustin.com`

## Boundary

All collaborative data belongs to a study space. Initial space:

```text
slug: core-exam-1
```

Use `core_exam_*` table and bucket names to avoid collisions with existing site applications.

## Identity and membership

### `core_exam_profiles`

- `user_id uuid` → `auth.users.id`
- `display_name text`
- `avatar_color text`
- `avatar_path text null`
- timestamps

### `core_exam_spaces`

- `id uuid`
- `slug text unique`
- `title text`
- timestamps

### `core_exam_memberships`

- `space_id`
- `user_id`
- `role`: `owner | member`
- `status`: `active | suspended`
- `joined_at`
- unique `(space_id, user_id)`

Optional later: `core_exam_invites` for in-app invitation administration.

## Canonical content

### `core_exam_content_nodes`

- UUID identity
- `space_id`
- immutable `stable_key`
- `kind`
- `parent_id`
- `sort_key`
- `current_revision_id`
- `created_by`
- timestamps
- `archived_at`

Unique `(space_id, stable_key)`.

### `core_exam_content_revisions`

- `node_id`
- `revision_number`
- structured `body jsonb`
- `plain_text`
- `edit_summary`
- `edited_by`
- `based_on_revision_id`
- `created_at`

Immutable after insert. Unique `(node_id, revision_number)`.

Phase 1B stores each sourced reader root as:

```json
{
  "type": "canonical-markdown",
  "markdown": "# Exact approved Markdown…",
  "source": {
    "key": "canonical.seven-topics",
    "legacyLine": 7
  }
}
```

The database also stores a plain-text search projection and a SHA-256 of the
versioned body. An insert advances the root node’s `current_revision_id`; the
revision row itself cannot be updated or deleted, including by a privileged
import session. The reader loads this member-gated revision first. The private
source map is a development-only fallback and is never a production
dependency.

### `core_exam_content_aliases`

- `space_id`
- `old_stable_key`
- `node_id`
- `created_at`

## Notes and definitions

### `core_exam_contributions`

- `space_id`
- `kind`: `note | definition`
- `target_node_id`
- `author_id`
- `visibility`: `group | private`, default `group`
- `current_revision_id`
- timestamps
- `archived_at`

### `core_exam_contribution_revisions`

- contribution ID and revision number
- structured body and plain-text projection
- `edit_summary`
- `edited_by`
- `based_on_revision_id`
- `created_at`

Only the author edits a contribution, even when group-visible.

Definitions remain supported for canonical annotations and legacy migration,
but the primary study definition flow uses answers to curated definitional
questions.

## Questions and answers

### `core_exam_questions`

- `space_id`
- `topic_node_id` → canonical topic node
- `stable_key` for curated questions; nullable for submitted questions
- `origin`: `curated | submitted`
- `prompt`
- `detail null`
- `rank` for foundational-to-nuanced ordering
- `submitted_by null` for curated questions
- timestamps
- `archived_at`

Curated question rank is owner-managed. Submitted questions remain attached to
the topic and sort after the curated sequence by default.

### `core_exam_answers`

- `space_id`
- `question_id`
- `author_id`
- `visibility`: `group | private`, personal answers default `group`
- `current_revision_id`
- timestamps
- `archived_at`

Unique constraints enforce:

- one personal answer per `(question_id, author_id)`.

Only the author edits a personal answer. There is no shared/consensus answer.

### `core_exam_answer_revisions`

- answer ID and revision number
- structured body and plain-text projection
- edit summary
- `edited_by`
- `based_on_revision_id`
- `created_at`

Revisions are immutable and stale writes fail rather than overwrite.

### `core_exam_question_likelihood_marks`

- `space_id`
- `question_id`
- `user_id`
- `likelihood`: `likely | unsure | unlikely`
- timestamps

Unique `(question_id, user_id)`. Active members may read the marks and member
identities so the UI can show both aggregate counts and who selected each
option. Each user may change only their own mark.

### `core_exam_question_hidden_marks`

- `space_id`
- `question_id`
- `user_id`
- timestamps

Unique `(question_id, user_id)`. Presence means hidden for that user; restoring
deletes the mark. Active members may read marks and identities because hiding
is an attributable relevance signal. It does not change question visibility,
authorization, notifications, or activity generation.

## Comments

### `core_exam_comments`

- `space_id`
- exactly one target: canonical resource, question, or personal answer
- `author_id`
- `parent_comment_id null`
- `body`
- timestamps
- `edited_at`
- `deleted_at`

Database rules enforce:

- exactly one valid target;
- parent and reply share a target;
- a reply’s parent has no parent;
- one reply level maximum.

Question comments form the general card discussion. Answer comments attach to
one independently authored answer. Group Discussion reads these comments plus
page-scoped activity events, but comment creation and replies occur on the
target card.

Deleted parents with replies become tombstones.

## Verification

### `core_exam_verification_events`

- `space_id`
- `content_node_id`
- `state`: `verified | flagged | unverified`
- `actor_id`
- `note null`
- `prior_event_id null`
- `created_at`

Append-only. V1 uses one shared current status determined by the latest event.

An optional `core_exam_verification_current` projection may be maintained transactionally for efficient reads.

## Files

### `core_exam_assets`

- `space_id`
- `uploader_id`
- `visibility`: `group | private`, default `group`
- title and description
- original filename
- MIME type
- byte size
- checksum
- `current_version_id`
- timestamps
- `archived_at`
- `asset_role`: `canonical_source | member_upload`
- `system_managed boolean`

### `core_exam_asset_versions`

- `asset_id`
- version number
- private storage path
- MIME type, size, checksum
- uploader and timestamp

### `core_exam_attachments`

- asset ID
- target resource
- caption
- sort key
- creator and timestamp

### `core_exam_source_catalog`

- asset ID
- short source key used by citations
- author/title/edition metadata
- page-number convention and optional PDF offset
- provenance note
- sort order

System-managed canonical sources are group-visible and not editable/archiveable by ordinary members. Member uploads use the normal ownership rules.

Phase 1B implementation:

- all 29 approved inventory entries have one system-managed asset and one
  current immutable version;
- the private `core-exam-files` bucket mirrors database visibility through an
  authenticated object-read policy;
- catalog, asset, version, and object metadata are invisible to non-members;
- PDFs are delivered through short-lived signed URLs so the browser PDF viewer
  retains range/page behavior;
- text, Markdown, and legacy HTML evidence are downloaded server-side and
  rendered as escaped text inside a script-disabled document;
- the local importer validates byte counts and SHA-256 checksums and refuses
  non-local Supabase URLs.

Recommended storage path:

```text
core-exam-1/{uploader-id}/{asset-id}/{version-id}
```

Canonical source imports use a separate system path:

```text
core-exam-1/system/sources/{asset-id}/{version-id}
```

## Activity and notifications

### `core_exam_activity_events`

- `space_id`
- actor
- action
- subject resource
- target resource
- structured, minimal metadata
- effective visibility
- timestamp

Created by trusted transactional functions or triggers—not arbitrary client inserts.

### `core_exam_notifications`

- event ID
- recipient ID
- reason: `reply | mention | followed_item | system`
- `read_at`
- timestamp

Global activity is not the same as personal notifications. Do not notify everyone about every edit.

## Personal master sheets

### `core_exam_master_sheets`

- space
- owner
- title
- visibility, initially fixed to `private`
- timestamps

### `core_exam_master_sheet_sections`

- sheet
- title
- sort key

### `core_exam_master_sheet_items`

- section
- kind: `personal_text | pin | chart_embed | asset | link`
- referenced resource
- personal annotation
- sort key
- `reference_mode`: V1 `live`
- source revision observed when pinned

The UI compares the current source revision with the observed revision to show “Updated since you pinned this.”

## Transactional operations

Use database functions/RPCs for:

- save canonical revision;
- restore canonical revision;
- save contribution revision;
- submit a topic question;
- save a personal answer revision;
- set the current user’s question-likelihood mark;
- set or clear the current user’s hidden-question mark;
- change verification;
- change visibility;
- finalize an uploaded asset;
- archive referenced content.

The database derives actor from `auth.uid()` and updates revision pointers, activity, and notifications atomically.

## Search

Keep plain-text projections for canonical and contribution revisions. V1 search must apply the same visibility rules as direct reads. Uploaded-document OCR is out of scope.

## Deletion

- Prefer soft archival.
- Never hard-delete referenced canonical content.
- Suspended accounts retain historical attribution.
- File deletion requires dependency checks and storage cleanup.
- Database backups do not automatically guarantee Storage object recovery; both require a retention plan.
