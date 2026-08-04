# Core Exam 1 — Claude UI Redesign Handoff

**Status:** Ready for UI redesign after local Phase 1B functional acceptance  
**Data state:** Local Supabase only; hosted import and deployment remain pending

## Handoff recommendation

The product is now at a good UI-redesign boundary. Core reader, question,
answer, comment, activity, verification, source-library, citation, and
authentication contracts are implemented and locally exercised. A redesign can
change presentation and interaction composition without inventing the data
model or waiting for hosted migration work.

Keep the redesign on the current uncommitted branch until Justin reviews the
functional migration as a whole. Do not commit, push, migrate a hosted
database, or deploy without separate approval.

## Product hierarchy to preserve

1. Topic questions and their answers are the primary study experience.
2. Questions remain ordered from foundational to nuanced.
3. Each question card contains the current user’s answer, other group answers,
   comments/discussion, test-likelihood signals, and Hide for me.
4. Canonical material remains complete but visually supporting.
5. Group Discussion is a page-scoped activity preview; Global Activity is the
   complete slide-out log.
6. Every activity/discussion deep link opens the relevant card, scrolls the
   actual entry into view, and blinks that content—not its input field.
7. Source citations open a wide modal on desktop and a full-screen viewer on
   tablet/mobile.
8. The Source Library includes books, lectures, school notes, canonical
   documents, and clearly de-emphasized migration evidence.

## Approved visual constants

```text
discussionWidth: 336px
gutter: 28px
readingMeasure: 620px
headerHeight: 68px
```

- Headings/ordinary emphasis cap at weight 500.
- Semantic `strong` emphasis uses weight 600.
- H2 tight tracking uses `-0.025em`.
- Citations use approximately `rgb(200, 200, 200)`.
- Text selection uses a soft classic yellow while text remains dark.
- Mobile Group Discussion has no collapse control.
- Desktop Group Discussion must always expose a visible reopen control after
  collapse.
- Motion should be fast and purposeful. Preserve the two-blink, one-second
  destination confirmation.

## Reading and typography intent

Long canon should be visually parsed rather than rendered as undifferentiated
copy:

- turn fact sequences into real lists when categories are determinable;
- add paragraph breaks at concept/context transitions;
- use tighter spacing within one conceptual unit and larger spacing between
  distinct units;
- keep citations legible but visually recessive;
- preserve source wording and citation identity while improving visual
  compartmentalization.

## Stable routes and contracts

- `/core-exam-1` — topic/reference reader
- `/core-exam-1?view=all-questions`
- `/core-exam-1?view=my-answers`
- `/core-exam-1/sources` — complete Source Library
- `/core-exam-1/sources/[sourceKey]` — responsive source viewer
- `/core-exam-1/source?key=[sourceKey]` — authenticated file delivery
- `/core-exam-1/login`
- `/core-exam-1/question-workshop` — development-only owner tool

Do not replace stable topic/content/question keys with display-text-derived
anchors. Deep-link query parameters and activity target IDs are product
contracts.

## Primary implementation surfaces

- `app/core-exam-1/CoreExamFrame.tsx`
- `app/core-exam-1/QuestionIndexView.tsx`
- `app/core-exam-1/ActivityPanel.tsx`
- `app/core-exam-1/SourceViewerDialog.tsx`
- `app/core-exam-1/MobileSourceViewer.tsx`
- `app/core-exam-1/sources/page.tsx`
- `app/core-exam-1/core-exam.css`
- `docs/core-exam-1/design/COLLABORATION_UX.md`

The Supabase migrations, import scripts, RLS policies, stable-key manifests,
and server data loaders are not redesign surfaces unless a visual requirement
proves the current contract insufficient.

## Redesign acceptance

- Desktop, tablet, and phone layouts preserve every functional control.
- Questions remain more prominent than canon.
- Collapsing/reopening Discussion works without clipped remnants.
- Activity and Discussion navigation remains immediate and exact.
- Unread dots retain the approved other-user-only semantics.
- All 29 sources remain discoverable and member-only.
- PDF, text, Markdown, and migration-evidence viewers remain usable.
- Identity stays visible before users write or change shared state.
- No font weight 700 is introduced.
- Keyboard use, focus visibility, dialog behavior, and reduced motion remain
  supported.

