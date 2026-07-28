# PRD: Core Exam 1 Collaborative Study System

**Date:** 2026-07-28  
**Route:** `/core-exam-1`  
**Status:** Planning draft

---

## Problem Statement

### What problem are we solving?

The current Core Exam study system is a single-user reference document. Its verification marks exist only in one browser, and friends cannot identify one another, add persistent notes, collaboratively revise material, discuss claims, upload supporting documents, or assemble personalized study sheets.

The desired product is a trusted-group study workspace where canonical material, personal understanding, shared interpretation, provenance, and discussion coexist without losing authorship or history.

### Why now?

Friends need to study from the same corpus while building their own interpretations. Adding collaborative data before permanent content identity, permissions, and revision rules would create fragile records that become disconnected as study wording changes.

### Who is affected?

- **Primary users:** Justin and invited friends preparing from the Core Energetics study corpus.
- **Owner:** Justin, who manages membership and can restore or administer content.
- **Secondary users:** Future invited study cohorts using the same product shape.

---

## Proposed Solution

### Overview

Build Core Exam 1 as a native Next.js application at `/core-exam-1`, backed by the existing site-wide Supabase project. Access is limited to explicit Core Exam members using email magic links. The system separates canonical study content, shared contributions, private contributions, discussions, uploaded sources, activity, and personal master sheets while maintaining stable deep links and immutable history.

### Information layers

1. **Canonical content:** the shared study corpus and charts.
2. **Collective knowledge:** group-visible definitions, notes, comments, files, and verification.
3. **Personal knowledge:** a user’s notes and definitions, optionally private.
4. **Personal master sheet:** a composed study page containing personal writing, pins, charts, uploads, and links.

### Primary user flows

#### First login

1. An invited friend opens `/core-exam-1`.
2. The application asks for their allowlisted email.
3. Supabase sends a magic link without creating an uninvited account.
4. The callback establishes a persistent session and returns the user to Core Exam.
5. The interface displays the user’s name and identity color persistently.

#### Verify a claim

1. A member opens a claim’s verification control.
2. They choose Verified, Flagged, or Unverified and may add a note.
3. The shared current state changes.
4. The interface shows who changed it and when.
5. The complete event history remains available.

#### Add a note or definition

1. A member selects a topic, section, claim, chart, or source excerpt.
2. They create a note or definition.
3. Visibility defaults to the group; they may choose Private.
4. Their contribution appears alongside canonical and other collective content.
5. Other members may comment but may not rewrite the author’s contribution.

#### Read and discuss a canonical page

1. A member opens a canonical topic or reference page.
2. On desktop, canonical content remains visible in the primary reading column while page-level group commentary appears in a neighboring discussion column.
3. The member can read, comment, or reply without losing their place in the canonical text.
4. Comments attached to a specific content block deep-link and highlight that block; general page discussion targets the page itself.
5. On mobile, the member switches between Content and Discussion within the page while the application preserves scroll position and unread state for each view.

#### Edit canonical content

1. Any active member enters edit mode.
2. The editor shows the current revision and asks for an optional edit summary.
3. Saving creates an immutable revision and logs actor and time.
4. If another person saved first, the system shows a conflict instead of overwriting.
5. Prior revisions remain readable and restorable.

#### Upload a source

1. A member selects a PDF or supported image.
2. They provide a title, optional description, visibility, and sharing acknowledgement.
3. The application validates type and size and uploads to private storage.
4. The member attaches the asset to relevant content.
5. Authorized users can reference, comment on, or pin it.

#### Open source material

1. A member opens the Source Library or follows a citation from canonical content.
2. The site displays the uploaded PDF or image in an authenticated viewer.
3. When a page reference is available, the viewer opens at that page.
4. The member can return to the originating claim without losing their reading position.
5. Source-library files remain inaccessible outside the active Core Exam membership.

#### Use the activity dropdown

1. A member opens the persistent activity control.
2. They see group-visible changes with actor, time, action, and target.
3. Personal notifications are distinguished from general activity.
4. Selecting an item deep-links to the affected content.

#### Build a personal master sheet

1. Each member receives a private default master sheet.
2. They add personal text or pin content, notes, charts, files, and deep links.
3. They reorder items into study sections.
4. Live references show when their source has changed since it was pinned.
5. A print-friendly view supports individual memorization.

---

## Design Requirements

- Logged-in identity is visible throughout the interface, including mobile layouts.
- Authenticated-but-unauthorized users see no study content.
- Canonical, collective, and personal content are visually distinguishable.
- Every shared item shows author and relevant time.
- Edit and verification history is understandable without technical terminology.
- Private state is visually explicit before and after saving.
- Core reading remains fast; collaboration controls must not overwhelm the study text.
- Desktop topic/reference pages use a side-by-side reading and group-commentary layout where viewport width permits.
- The commentary column remains independently scrollable or sticky enough to keep both conversation and canonical context visible.
- Mobile layouts use an in-page Content/Discussion switcher rather than squeezing two columns side by side.
- Switching mobile views preserves content scroll position, discussion scroll position, draft text, and unread indicators.
- Tablet breakpoints must be tested explicitly; they may use a collapsible discussion drawer or the mobile switcher depending on usable width.
- Source PDFs and images are viewable directly within the authenticated site, with a fallback open/download action.
- Keyboard navigation, focus visibility, labels, contrast, reduced motion, and screen-reader announcements target WCAG 2.1 AA.

---

## End State

- [ ] Core Exam is available at `/core-exam-1`.
- [ ] Only active Core Exam members can access it.
- [ ] Magic-link sessions persist safely.
- [ ] Current identity is always clear.
- [ ] Canonical content has stable IDs and immutable revisions.
- [ ] Verification shows state, actor, time, note, and history.
- [ ] Notes and definitions default to group-visible and may be private.
- [ ] Members can comment with one reply level.
- [ ] PDFs and images can be uploaded privately or for the group.
- [ ] The complete approved source corpus is available in an authenticated Source Library.
- [ ] Canonical pages show content and group commentary together on desktop.
- [ ] Canonical pages provide usable Content/Discussion switching on mobile.
- [ ] Activity and personal notifications deep-link to readable content.
- [ ] Each user has a private personal master sheet.
- [ ] Tests prove private content does not leak between accounts.
- [ ] Migration, backup, deployment, and rollback are documented.

---

## Success Metrics

### Quantitative

| Metric | Target |
|---|---|
| Invited-user login completion | Every invited test user can log in without admin intervention after invitation |
| Wrong-account awareness | Current identity visible on every authenticated route and editing surface |
| Attribution completeness | 100% of shared writes carry actor and timestamp |
| History preservation | 100% of canonical edits and verification changes retain prior events |
| Privacy isolation | Zero cross-user private-data reads in automated RLS tests |
| Deep-link integrity | All migrated content nodes resolve through stable keys |
| Upload authorization | Zero public bucket URLs and zero unauthorized signed-file access |

### Qualitative

- Friends can explain whether they are reading canonical, collective, or personal content.
- A user can recover from an accidental canonical edit without database intervention.
- A user can build a useful individual study sheet without copying shared material manually.

---

## Acceptance Criteria

### Access and identity

- [ ] Ordinary login uses `shouldCreateUser: false`.
- [ ] Membership, not Supabase account existence, gates access.
- [ ] Suspended members cannot access study data or files.
- [ ] User chip displays name and identity color at all times.
- [ ] Login callbacks preserve only validated Core Exam destinations.

### Canonical content and editing

- [ ] Every addressable block has an immutable stable key.
- [ ] Saving creates a revision; it never overwrites revision history.
- [ ] Concurrent edits produce a conflict state.
- [ ] Restore creates a new revision.
- [ ] Any active member can edit canonical content.

### Contributions and discussion

- [ ] Notes and definitions default to group visibility.
- [ ] Authors can switch eligible contributions to private.
- [ ] Only the author edits their contribution.
- [ ] Group members can comment on visible content.
- [ ] Replies cannot exceed one level.
- [ ] Deleted parent comments with replies remain as tombstones.
- [ ] Every canonical page has a page-level group commentary target.
- [ ] Desktop layouts display canonical content and commentary concurrently at supported widths.
- [ ] Mobile layouts preserve scroll position and comment drafts when switching Content/Discussion.

### Verification

- [ ] The latest event determines the shared current status.
- [ ] History includes actor, time, state, and optional note.
- [ ] Old browser-local marks are labeled legacy/unattributed unless the user explicitly imports them as their own.

### Uploads

- [ ] V1 accepts member uploads of PDF, JPEG, PNG, and WebP up to 50 MB.
- [ ] Owner/admin source imports support the existing corpus, including PDFs larger than 50 MB.
- [ ] Files use a private bucket and authorization-aware access.
- [ ] Group visibility defaults on; Private is available.
- [ ] Replacement creates a version rather than overwriting.
- [ ] The uploader acknowledges permission to share.
- [ ] Existing canonical source files are imported as system-managed group assets.
- [ ] Source citations open the relevant in-site file and page when known.
- [ ] Source files remain unavailable to anonymous and authenticated non-member users.

### Activity and master sheets

- [ ] Private events never appear in another user’s feed, counts, search, or notifications.
- [ ] Activity entries deep-link to their target.
- [ ] Each user has one private default master sheet.
- [ ] Pins are live by default and signal source updates.
- [ ] Master sheets have a print-friendly view.

---

## User-visible copy candidates

### A. Authentication

- **A1** Page title: `"Core Exam 1"`
- **A2** Login heading: `"Sign in to your study space"`
- **A3** Login body: `"Use the email Justin invited. We’ll send you a sign-in link."`
- **A4** Login button: `"Send magic link"`
- **A5** Sent confirmation: `"Check your email for your sign-in link."`
- **A6** Unauthorized heading: `"This account doesn’t have access"`
- **A7** Unauthorized body: `"You’re signed in, but this email isn’t a member of Core Exam 1."`
- **A8** Identity prefix: `"Studying as"`
- **A9** Sign-out action: `"Sign out"`

### B. Contributions and privacy

- **B1** New note action: `"Add note"`
- **B2** New definition action: `"Add definition"`
- **B3** Group visibility: `"Everyone in Core Exam"`
- **B4** Private visibility: `"Only me"`
- **B5** Visibility helper: `"Notes are shared with the group unless you make them private."`
- **B6** Privacy warning: `"Pins or comments from other people may stop working if you make this private."`

### C. Editing and revisions

- **C1** Edit action: `"Edit shared content"`
- **C2** Edit-summary label: `"What changed? (optional)"`
- **C3** Save action: `"Save revision"`
- **C4** Conflict heading: `"Someone edited this while you were working"`
- **C5** Conflict body: `"Review the latest version before saving your changes."`
- **C6** History action: `"View history"`
- **C7** Restore action: `"Restore as a new revision"`

### D. Verification

- **D1** Verified attribution: `"Verified by {name} · {time}"`
- **D2** Flagged attribution: `"Flagged by {name} · {time}"`
- **D3** Verification note label: `"Add a note (optional)"`
- **D4** History action: `"Verification history"`
- **D5** Legacy label: `"Imported from an earlier browser — attribution unavailable"`

### E. Comments

- **E1** Comment action: `"Comment"`
- **E2** Reply action: `"Reply"`
- **E3** Deleted tombstone: `"This comment was deleted."`
- **E4** Page discussion heading: `"Group discussion"`
- **E5** Empty discussion: `"No discussion yet. Start the conversation."`
- **E6** Mobile content tab: `"Content"`
- **E7** Mobile discussion tab: `"Discussion"`
- **E8** Unread discussion label: `"{count} new"`

### F. Uploads

- **F1** Upload action: `"Add document or image"`
- **F2** Sharing acknowledgement: `"I have permission to share this file with this study group."`
- **F3** Type error: `"Upload a PDF, JPEG, PNG, or WebP file."`
- **F4** Size error: `"This file is larger than 50 MB."`
- **F5** Replace action: `"Upload a new version"`
- **F6** Source library title: `"Source library"`
- **F7** Open source action: `"View source"`
- **F8** Viewer fallback: `"Open file"`

### G. Activity and master sheet

- **G1** Activity title: `"Activity"`
- **G2** Empty activity: `"No new activity."`
- **G3** Personal sheet title: `"My study sheet"`
- **G4** Pin action: `"Pin to my study sheet"`
- **G5** Updated-pin marker: `"Updated since you pinned this"`
- **G6** Print action: `"Print study sheet"`

---

## Technical Context

See:

- `CURRENT_STATE.md`
- `architecture/CONTENT_IDENTITY.md`
- `architecture/SUPABASE_MODEL.md`
- `architecture/AUTH_PERMISSIONS_STORAGE.md`
- `IMPLEMENTATION_ROADMAP.md`

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Text-derived IDs break references | High | Stable keys and migration manifest before collaboration |
| Weak RLS leaks private notes/files | High | Deny-by-default policies and multi-user policy tests |
| Concurrent canonical edits overwrite work | High | Base-revision checks and conflict UI |
| Private changes leak through activity | High | Visibility-aware event reads and explicit leak tests |
| Existing permissive site patterns are copied | High | Dedicated Core Exam clients, migrations, policies, and review |
| Rich text introduces unsafe HTML | High | Constrained TipTap schema and sanitized rendering |
| Uploaded files become public | High | Private bucket, signed/authenticated access, mirrored policies |
| Source viewer exposes licensed files | High | Membership-gated metadata and file access; no public object URLs |
| Discussion column crowds canonical reading | Medium | Responsive width rules, adjustable/collapsible column, and layout review gate |
| Mobile switching loses reading context or drafts | High | Preserve per-view state and test on real devices |
| Scope becomes one giant release | High | Phased gates and first-usable release boundary |

---

## Non-Goals for the first usable release

- Fully threaded discussions beyond one reply level.
- Simultaneous live cursor editing.
- Public signup or public sharing.
- Advanced full-text document OCR.
- In-browser PDF annotation.
- Multiple custom master sheets per user.
- Complex notification preferences or follows.

---

## Proposed Defaults Requiring Final Approval

1. One shared verification status with complete event history.
2. Users edit canonical content and their own contributions, never another person’s note.
3. Master sheets are private in the initial release.
4. Canonical edits publish immediately with revision history.
5. Pins are live and show an update marker; optional snapshots are deferred.
6. Member uploads support PDF/JPEG/PNG/WebP up to 50 MB; controlled canonical-source imports may be larger.
7. Making a group contribution private is blocked while other users’ comments or pins depend on it.
8. Comment edit history is deferred; edited comments display an edited timestamp.
9. Desktop canonical pages use a resizable or collapsible commentary column, with final width behavior approved during a visual prototype.
10. Mobile canonical pages use Content/Discussion tabs with independent scroll restoration.
