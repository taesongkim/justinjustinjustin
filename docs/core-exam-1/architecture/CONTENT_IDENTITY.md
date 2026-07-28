# Content Identity and Migration Contract

**Status:** Proposed  
**Applies to:** canonical content, citations, comments, notes, pins, uploads, activity, and deep links

## Principle

Content identity must never depend on current wording, rendered HTML, array position, or a database revision ID.

Every addressable canonical object receives:

- an internal UUID;
- an immutable, human-readable `stable_key`;
- a `kind`;
- an optional parent;
- a current revision pointer.

Example keys:

```text
topic-01
topic-01.mask-lower-higher
topic-01.mask.definition
claim.pl-14.higher-self-vibration
chart.kessler.survival-patterns
chart.kessler.age-at-wounding
reference.conflict.s10
```

## Stable-key rules

1. Lowercase ASCII with dots or hyphens.
2. Meaningful enough to audit manually.
3. Unique within the `core-exam-1` study space.
4. Never reused after archival.
5. Never changed because a heading or body is reworded.
6. Renames use an alias table so old links continue resolving.

## Canonical hierarchy

Recommended kinds:

- `page`
- `topic`
- `section`
- `claim`
- `definition`
- `chart`
- `chart_row`
- `table`
- `source_excerpt`
- `reference_entry`

The initial migration should avoid assigning an ID to every paragraph indiscriminately. Assign IDs to blocks that can reasonably be verified, edited, discussed, attached to, or pinned.

## URLs

Canonical deep links:

```text
/core-exam-1/topics/mask-lower-higher#claim.pl-14.higher-self-vibration
```

Database UUIDs should not be the primary public anchor. The router resolves stable keys and aliases.

User-created resources use their own immutable IDs:

```text
/core-exam-1/topics/mask-lower-higher?note=<uuid>
/core-exam-1/activity/<event-id>
```

## Migration manifest

Create a reviewed, version-controlled manifest mapping:

| Legacy location | Stable key | Kind | Source document |
|---|---|---|---|
| Topic 1 heading | `topic-01` | topic | `04_SEVEN_TOPICS.md` |
| PL 14 definition bullet | `claim.pl-14.higher-self-vibration` | claim | `04_SEVEN_TOPICS.md` |

The manifest is the contract between the Markdown corpus and the database seed.

## Revision behavior

- Stable identity lives on `content_nodes`.
- Editable body lives in immutable `content_revisions`.
- Saving inserts a revision and advances `current_revision_id`.
- Restore inserts a new revision containing restored content.
- Archival hides a node but preserves links, attribution, history, and dependencies.
- A revision records the base revision used by the editor.
- A mismatched base revision returns a conflict; it never silently wins.

## Source format

V1 may seed canonical revisions as structured JSON plus a plain-text search projection. TipTap JSON is acceptable only if its allowed node schema is versioned and constrained.

The original Markdown remains committed as migration evidence until content parity has been verified. Do not delete the source corpus immediately after import.

## Existing verification migration

The old browser store uses text hashes and contains no actor. Import choices:

1. **Recommended:** user explicitly imports local marks and confirms they are theirs; retain original timestamp when present.
2. Import as `legacy-unattributed`.
3. Do not import and retain JSON exports as archive.

The system must not infer Justin as actor solely because data came from his browser.

## Validation

- Every migrated addressable block has exactly one stable key.
- Every legacy route/page resolves.
- Stable keys remain unchanged after representative text edits.
- All notes, comments, verification events, attachments, pins, and activity targets use foreign keys—not loose text anchors.
- Alias resolution is tested.

