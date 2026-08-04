# Collaboration UX Specification

## Design posture

Core Exam is a question-and-answer study resource first. Collaboration should
make it easy to build and compare understanding without turning every
supporting paragraph into a control panel.

Three content layers need a consistent visual grammar:

- **Shared source:** canonical study material.
- **Group:** collective definitions, notes, verification, files, and discussion.
- **Mine:** the current user’s notes, private material, and master-sheet state.

## Topic-page hierarchy

Every topic page prioritizes:

1. curated questions, manually ordered from foundational to nuanced;
2. the current member’s answer;
3. other members’ answers and card-level discussion;
4. community-submitted questions;
5. the complete canonical study material as supporting content;
6. an Ask a question section at the bottom of the page.

Definitions use the same answer system. A definitional prompt such as “What is
the Lower Self?” has independently authored answers and discussion; it does not
need a parallel definition-only or consensus-answer interface.

### Question cards

Each question card shows:

- question text and topic;
- curated or community-submitted status;
- rank within the topic;
- author for submitted questions;
- current member’s answer state;
- number of visible member answers;
- question-comment and answer-comment counts;
- Likely, Unsure, or Unlikely summary;
- an accessible way to see which members selected each likelihood.
- Hide for me / Show again;
- an attributable list of members who hid the question.

The personal answer is visually primary within an expanded question. Other
members’ answers remain individually attributed and are never merged
automatically. Every question owns a general thread, and every visible answer
may own a more specific thread.

Group Discussion is a compact, page-scoped preview feed—not a duplicate editing
surface. It includes comments, new answers, answer edits, submitted questions,
and canonical verification changes. Selecting an entry opens and highlights
its exact question, answer, verified block,
or comment. Replies and edits happen on the target card.

### Cross-topic indexes

**My Answers** lists every question in topic/rank order and makes unanswered
questions easy to find. It can reveal other visible answers for comparison, but
defaults to the current member’s work.

**All Questions** compiles curated and submitted questions across topics. Each
row retains topic context and exposes answer count, submitter when applicable,
and likelihood summary.

### Hidden questions

Hide for me is a personal layout choice and a visible relevance vote—not
deletion or muting. Hidden questions leave the main topic sequence and appear
inside a collapsed Hidden questions section at the bottom of that topic.
Members can restore them at any time. Expanded cards disclose which members
have hidden the question.

All Questions and My Answers retain hidden questions with a Hidden for me badge
and a dedicated filter. Hiding does not suppress comments, replies, mentions,
or Activity entries.

## Persistent shell

### Desktop

- Existing topic sidebar remains the primary navigation.
- Sticky top bar contains page context, verification progress, activity, and identity.
- Identity appears at the far edge as avatar color plus display name.
- Clicking identity reveals email, membership role, and sign out.

### Mobile

- Topic navigation moves behind the existing menu control.
- Identity remains visible as color/avatar and short name.
- Activity remains reachable without opening topic navigation.

No authenticated screen may hide the current identity completely.

## Canonical page workspace

Every canonical topic and reference page owns a page-level group discussion in addition to comments attached to individual content blocks.

### Desktop split view

Recommended starting composition:

- canonical reading column: flexible, with a comfortable prose measure;
- discussion column: approximately 320–400 px;
- gutter/divider between them;
- discussion header and composer remain accessible while its thread scrolls;
- reading and discussion can scroll independently;
- discussion may collapse to a labeled rail when the user wants maximum reading width.

The exact column width, divider behavior, sticky regions, density, and collapse animation are a required visual review with Justin before they are baked in. Use a temporary controls panel for live width/gutter/sticky-offset tuning during implementation.

Page-level commentary stays visible in the column. Selecting a block-specific comment highlights and scrolls the corresponding canonical block without discarding the discussion position.

### Tablet

Do not assume tablet equals desktop. At intermediate widths, test:

1. a narrower split view;
2. a slide-over discussion drawer;
3. the mobile Content/Discussion switcher.

Use the option that preserves readable canonical line length and a usable comment composer. The chosen breakpoint and behavior require Justin’s visual approval.

### Mobile

Use an in-page segmented switcher:

- **Content**
- **Discussion**, with unread count when applicable

Requirements:

- never render both columns squeezed side by side;
- preserve independent scroll positions;
- preserve unsent comment/reply drafts;
- keep topic identity, user identity, and mode visible;
- deep links to a comment open Discussion;
- deep links to canonical content open Content;
- “View in content” from a block comment switches modes and highlights the target;
- browser Back returns to the prior mode/position where practical.

The switcher must be keyboard and screen-reader usable and must not masquerade as navigation to a different page.

## Login and account mismatch

- Login is visually restrained and specific to Core Exam.
- After callback, avoid briefly rendering study content before membership is known.
- When the session belongs to a non-member, show the signed-in email and a sign-out/switch-account path.
- Editing surfaces restate “Saving as {name}.”

## Canonical content

Canonical sections read normally by default. Hover/focus or a quiet section action reveals:

- edit shared content;
- add note;
- add definition;
- comment;
- attach document;
- pin.

On touch, one explicit action menu replaces hover behavior.

### Editing

- Edit one stable content node at a time.
- Show editor identity and last revision.
- Edit summary is optional but encouraged.
- Concurrent change blocks save and offers:
  - review latest;
  - copy my draft;
  - reopen against latest.
- History uses a readable timeline with actor, time, and summary.
- Restore creates and labels a new revision.

## Notes and definitions

Display order within a target:

1. Canonical definition/content.
2. “My definition” or “My notes.”
3. “From the group.”

If the current user has no personal contribution, show a compact empty action rather than a blank card.

Every contribution card includes:

- author identity color/name;
- group/private badge;
- created or updated time;
- comment count;
- pin state;
- edit menu for the author only.

The visibility control defaults to the group. Private state uses text and icon—not color alone.

## Verification

Keep the three-state control but expand its popover:

- current state;
- actor and time;
- optional note;
- source link;
- history action.

V1 has one shared current state. A new event replaces the visible current status without deleting history.

## Comments

- Flat comments plus one reply level.
- Replies indent once.
- No reply action appears on a reply.
- Edited comments show “Edited.”
- A deleted parent with replies becomes a tombstone.
- Comments inherit target visibility and cannot make private content visible.

## Uploads

Upload sheet fields:

- file;
- title;
- description;
- visibility;
- permission acknowledgement;
- attachment target.

Show upload progress, validation errors, and a cancel path. PDF/image preview is helpful but not required for the first upload release.

Asset cards show:

- title and file type;
- uploader and time;
- visibility;
- version;
- attachments/references;
- open, comment, pin, and upload-new-version actions.

## Source library and viewer

All approved canonical source material is represented in a dedicated Source Library. System-managed source assets show:

- title and author;
- document type;
- source/citation key;
- page-number convention or offset where known;
- provenance/verification note;
- open action.

PDFs open inside an authenticated viewer with page navigation, zoom, search when the PDF text layer supports it, and a fallback open/download action. Images open in a zoomable viewer. Citations should open the correct source and page when the existing citation map contains a reliable page target.

**Checkpoint 0 decision (2026-07-29):** citations open in a wide modal on
desktop so the study position remains intact. At tablet/mobile widths, the
viewer occupies the full screen. Both forms retain an explicit return-to-study
action; the mobile treatment must also support browser Back when the production
viewer route is introduced.

## Activity and notifications

Use one dropdown with two tabs:

- **Activity:** readable group events.
- **For you:** replies, mentions, followed items, and system notices.

Each row states:

- actor;
- action;
- target;
- relative time;
- unread state where relevant.

The Activity button shows a standard red dot only for visible events created by
someone other than the current user. Opening Activity marks the current set
viewed: rows that were new retain red dots during that open session, and those
dots are gone the next time the panel opens. Group Discussion is continuously
visible on desktop and does not use unread dots.

Selecting a row closes the dropdown and deep-links to the target. Private activity never appears to other users.

## Personal master sheet

V1 provides one private sheet per user.

Sections contain:

- personal rich text;
- live pins;
- chart embeds;
- asset references;
- deep links.

Items support keyboard-accessible move controls in addition to drag and drop. A live pin stores the source revision observed when pinned; a changed source shows an update marker.

Print mode removes collaboration chrome and preserves source attribution.

## Empty, loading, and error states

- Use skeletons only where they prevent layout jumps.
- Never show another account’s cached private data while switching sessions.
- Failed optimistic actions return the UI to its prior state.
- Offline edits are not promised in V1; preserve unsaved editor text locally when practical.
- Errors identify the affected action without exposing database details.

## Accessibility

- WCAG 2.1 AA target.
- Full keyboard access to menus, tabs, dialogs, editors, comments, and reorder controls.
- Visible focus.
- Semantic buttons and headings.
- Verification and privacy state announced as text.
- Reduced-motion preference honored.
- Modal focus trapping and restoration.
- Activity updates do not continuously interrupt screen readers.
- Content/Discussion mode, unread count, and current selection are announced correctly.
- Independent desktop scroll regions have labels and sensible keyboard behavior.
- PDF viewer controls have accessible names and a non-embedded fallback.
