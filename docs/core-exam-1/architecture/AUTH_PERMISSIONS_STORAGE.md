# Authentication, Permissions, and Storage

## Authentication

Use the existing site-wide environment-backed Supabase project.

Add session-aware Supabase browser and server clients, preferably with `@supabase/ssr`. A browser singleton alone cannot reliably protect the initial server render or prevent wrong-account/loading flashes.

### Magic-link flow

1. User enters email at `/core-exam-1/login`.
2. Login calls OTP with `shouldCreateUser: false`.
3. Email returns to a dedicated callback.
4. Callback exchanges the code for a cookie-backed session.
5. Callback validates a safe `next` destination limited to Core Exam.
6. Server checks active Core Exam membership.
7. Authorized users enter; unauthorized authenticated users see a restrained access screen.

Configure Supabase redirect allowlists for:

- production;
- local development;
- intended Vercel previews.

## Authorization boundary

Authentication answers “Who are you?” Membership answers “May you enter Core Exam?”

Every Core Exam query requires an active membership in `core-exam-1`. Do not authorize by email after invitation; authorize by `auth.uid()`.

## Roles

### Owner

- manage membership;
- suspend access;
- restore canonical revisions;
- administer exceptional removals;
- perform migration/import tasks.

### Member

- read group content;
- edit canonical content;
- create and edit own notes/definitions;
- comment on visible resources;
- verify or flag claims;
- upload visible/private assets;
- manage own master sheet.

Any member may edit canonical content per the approved product decision. Revision history is the safety mechanism.

## RLS rules

- Deny by default on every Core Exam table.
- Group data requires active membership.
- Private data requires ownership.
- Contributions are writable only by their author.
- Canonical edits occur through controlled functions.
- Revision and verification event rows are append-only.
- Notification rows are readable only by the recipient.
- Activity is readable only when the underlying subject is readable.
- Membership administration is owner-only.
- Client input cannot choose `actor_id`.
- Service-role credentials never reach the browser.

## Privacy transitions

Proposed V1 rule: prevent a group-visible note/file from becoming private while another user has comments or pins depending on it. Explain the blockers and allow the author to resolve them first.

This avoids silently breaking another person’s study sheet or hiding an active discussion.

## Storage

Use a private bucket, proposed name:

```text
core-exam-files
```

“Group-visible” means visible to active members, not public on the internet.

### V1 formats and limit

- PDF
- JPEG
- PNG
- WebP
- maximum 50 MB per member-uploaded file

Owner/admin source imports use a separately controlled limit sized for the inventoried corpus and may exceed 50 MB; they do not loosen ordinary member uploads.

### Validation

- Validate extension, reported MIME type, and file signature.
- Sanitize filenames for display and generate storage paths independently.
- Strip image EXIF metadata where practical.
- Constrain rich-text rendering and sanitize links.
- Require an acknowledgement that the uploader may share the file with the group.

### Access

Serve through short-lived signed URLs or an authenticated server route after authorization. Storage policies must mirror asset-table visibility.

The Source Library uses the same private bucket and membership boundary. Canonical source files must not be copied into Next.js `public/` or exposed through permanent public URLs.

System-managed source assets may be read by active members but changed only through an owner/admin migration path.

### Versioning

Replacing a file creates a new immutable asset version. Existing comments and citations retain historical intelligibility.

## Identity display

The persistent identity chip includes:

- avatar color;
- display name;
- “Studying as” label in expanded contexts;
- account menu with email and sign out.

Editing, commenting, uploading, verifying, and master-sheet surfaces repeat the identity cue near the action. Display-name changes do not rewrite historical ownership.

## Required security tests

Use at least:

- owner;
- active member A;
- active member B;
- authenticated non-member;
- suspended member;
- anonymous user.

Test direct table reads, filtered queries, counts, search, activity, notifications, signed file access, and attempted writes. Private titles and existence must not leak through metadata or counts.
