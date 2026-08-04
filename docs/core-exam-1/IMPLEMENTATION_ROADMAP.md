# Core Exam 1 — Implementation Roadmap

## Delivery strategy

Ship through small, reversible phases. Each phase has an explicit gate. Do not accumulate all collaboration features on one branch.

## Phase 0 — Repository and product foundation

### Work

- Connect the personal-site repo as a writable Codex workspace.
- Protect or resolve its current unrelated dirty worktree.
- Create a clean descriptive branch/worktree with no prefix.
- Add the approved planning package.
- Establish `app/core-exam-1/` with route-scoped layout/styles.
- Add Supabase migration ownership and local/staging procedure.
- Reconcile stale source-document status labels.
- Recover or recreate the missing Markdown-to-HTML/content injection procedure.
- Create and review the stable-key migration manifest.
- Decide the structured canonical editor schema.
- Inventory every canonical PDF, image, and text source; record title, source key, page convention, checksum, and intended viewer behavior.
- Build a low-fidelity responsive prototype of the canonical reading area plus discussion column.

### Gate

- Existing study content renders with parity at `/core-exam-1`.
- Every collaborative target has a reviewed stable key.
- No existing personal-site page regresses.
- Justin approves the desktop split-view direction, tablet behavior, and mobile Content/Discussion interaction before full styling begins.

### Justin checkpoint 0 — product frame

Justin reviews:

- desktop reading/discussion proportions;
- whether the commentary column feels present without crowding study content;
- tablet collapse/drawer/tab behavior;
- mobile mode switching;
- persistent identity placement;
- source viewer direction.

Use representative real content—not placeholder cards—for this review.

## Phase 1A — Identity and authorization

### Work

- Add session-aware server/browser Supabase clients.
- Add login, auth callback, persistent session, sign out.
- Create profiles, spaces, memberships, and RLS.
- Pre-create/invite initial members.
- Add persistent identity UI.
- Add multi-user authorization test harness.

### Gate

- Active members enter.
- Authenticated non-members, suspended users, and anonymous users cannot read any study data.
- Wrong-account identity is visible before any edit action.

### Justin checkpoint 1 — identity

Justin tests two accounts and approves the identity prominence, account-switch/sign-out flow, magic-link wording, and unauthorized-account experience.

## Phase 1B — First usable collaborative release

### Work

- Seed canonical content nodes/revisions.
- Seed a reviewed foundational-to-nuanced question sequence for every topic.
- Seed one reviewable, group-visible proposed answer for every finalized
  question under the reserved `AI-Assistant` identity. These are starting
  contributions, not canon; members may comment on them, and the one-time
  bootstrap must not generate unread activity.
- Add Ethics, Polyvagal Theory, Touch and Soft Techniques, and Transference and
  Countertransference as source-less group-built topics. They launch with no
  canon, curated questions, or seeded answers; members build them through
  submitted questions, answers, and discussion.
- Make questions and answers the primary topic-page hierarchy; retain the
  complete canonical corpus as supporting content.
- Add one independently authored personal answer per member/question.
- Add question-level and answer-specific comment threads.
- Turn Group Discussion into a compact page-scoped feed of comments, answers,
  edits, and submitted questions; entries navigate to their exact card/section.
- Add member-submitted topic questions and answer flows.
- Add per-user Likely/Unsure/Unlikely test ratings with an attributable group
  summary.
- Add reversible Hide for me marks with visible attribution, topic-bottom
  recovery, and index badges/filtering. Hiding does not mute activity.
- Add My Answers and All Questions indexes.
- Add shared verification events with actor, time, note, and history.
- Show verification changes in Global Activity and in the page-scoped Group
  Discussion feed; both entries navigate to the exact verified content block.
- Add basic notes and definitions.
- Default contributions to group-visible with a private option.
- Add minimal durable activity for these actions.
- Add explicit legacy verification import flow or defer it with an archive plan.
- Import the complete approved canonical source corpus into the private Source Library.
- Link reliable citations to in-site sources and page targets.
- Add page-level group discussion shell to every canonical page, even if full commenting ships in Phase 2.

### Gate

- Two test members see the same curated and submitted questions.
- Each can create and revise their own answer without changing the other’s.
- All finalized questions have exactly one commentable `AI-Assistant` starting
  answer, and the seed identity cannot receive a real login link.
- Each can create a private answer invisible to the other.
- My Answers shows the current member’s complete answered/unanswered set.
- All Questions includes topic attribution and community submissions.
- Test-likelihood aggregates match the attributable member selections.
- Shared verification and group notes remain available on supporting canon.
- All writes are attributed.
- This is the first production-usable release.
- Every inventoried source file is present, membership-gated, and openable in the chosen viewer.
- Desktop and mobile canonical-page layouts work with representative long content.

### Justin checkpoint 2 — first usable release

Justin performs a guided content/layout review:

- compare migrated pages against the current HTML;
- complete a dedicated pre-launch question-bank pass: retain, rewrite, remove,
  add, and reorder the starting questions for every topic;
- write two personal answers and compare them between accounts;
- sample `AI-Assistant` answers across all twelve topics for accuracy,
  formatting, citation targets, and appropriate uncertainty;
- create and answer a community question;
- review My Answers, All Questions, and the attributable likelihood summary;
- open representative citations and source PDFs/images;
- use desktop content plus commentary side by side;
- switch Content/Discussion on a phone-sized viewport;
- verify private/group note distinctions;
- approve the experience before friends are invited.

## Phase 2 — Canonical editing and discussion

### Work

- TipTap editor with constrained schema.
- Immutable canonical and contribution revisions.
- Edit summary and history.
- Optimistic concurrency conflict handling.
- Restore-as-new-revision.
- One-level comments and tombstone deletion.
- Canonical/collective/personal definition presentation.
- Page-level discussion plus block-specific comment navigation.
- Unread state and mobile mode-aware deep links.

### Gate

- Concurrent edit rehearsal does not lose text.
- Revision restoration works.
- Members cannot edit another person’s contribution.
- Discussion position, canonical reading position, and drafts survive desktop/mobile transitions.

### Justin checkpoint 3 — collaboration behavior

Justin reviews real examples of page discussion, block comments, edit history, conflict resolution, and collective-versus-personal definitions with at least one second account.

## Phase 3 — Files, activity, and notifications

### Work

- Private Storage bucket and policies.
- Member PDF/JPEG/PNG/WebP upload up to 50 MB, with a separately controlled canonical-source import path for larger inventoried files.
- Asset metadata, versions, attachments, and sharing acknowledgement.
- Visibility-aware activity dropdown.
- Personal notifications and read state.
- Deep links to events and resources.

### Gate

- Group files are visible only to active members.
- Private files and their metadata do not leak.
- Replacing a file preserves prior versions.
- Activity never reveals a private target.

### Justin checkpoint 4 — files and activity

Justin approves upload presentation, source/member-upload distinction, activity density, notification relevance, and desktop/mobile file viewing.

## Phase 4 — Personal master sheet

### Work

- One default private master sheet.
- Sections, text, pins, chart embeds, file references, and links.
- Reordering with keyboard alternative.
- Live-source update markers.
- Print-friendly view.

### Gate

- Each member can compose and print an independent study sheet.
- Another user cannot read it.
- Archived or privatized dependencies fail gracefully.

### Justin checkpoint 5 — personal study sheet

Justin assembles and prints a real study sheet, then approves ordering, embeds, update markers, mobile reading, and print output.

## Phase 5 — Deliberate extensions

- Search across permitted content.
- Mentions.
- Follow/subscription controls.
- In-app invitation administration.
- Snapshot pins.
- Shareable master sheets.
- PDF text extraction or annotation.
- Multiple study spaces/cohorts.

## Workstream boundaries

Suggested parallel lanes after Phase 0:

- **Platform/data:** auth, migrations, RLS, storage, RPCs.
- **Product:** content import, editor, contributions, comments, activity.
- **Design:** shell, identity, content layers, responsive states, master sheet.
- **Validation:** policy tests, E2E flows, migration parity, release checks.

Schema contracts and stable IDs must land before dependent UI work. Agents should not invent tables or copy strings independently; they work from the approved documents.

## User dependencies

Justin will need to:

1. Connect `/Users/taesongkim/Code/justinjustinjustin` as a writable workspace.
2. Decide how to handle its current unrelated uncommitted changes.
3. Provide or approve Supabase project access for migrations.
4. Approve redirect URLs and email template/site URL changes.
5. Supply initial member emails and display names through a private channel.
6. Approve proposed defaults and copy.
7. Perform behavioral acceptance checks with at least one friend account.
8. Attend the five visual/behavioral checkpoints above; implementation should pause at each gate for approval rather than treating layout as an end-stage review.

Credentials and email lists must not be committed to the repository or planning documents.
