# ADR 0001 — Keep canonical study content outside public Git

**Status:** Accepted
**Date:** 2026-07-28

## Context

The personal-site repository is public. The Core Exam corpus includes licensed
books, lecture files, extracted text, and synthesized canonical study prose.
Route authentication does not protect content committed to public Git.

## Decision

- PDFs, extracted lecture text, canonical Markdown, and imported canonical JSON
  stay out of this repository.
- The repository may contain neutral source keys, byte counts, SHA-256
  checksums, viewer behavior, stable content keys, schemas, and deterministic
  import/validation tooling.
- Local development maps neutral keys to private files through
  `.local-archive/core-exam/source-map.json`, which Git ignores.
- Staging and production content will live in membership-gated Supabase tables
  and private Storage buckets.
- Import tools must accept content through explicit local paths or protected
  environment configuration. They must never infer or publish source files.

## Consequences

- A public clone cannot reconstruct the study corpus.
- Content parity requires access to the private source directory.
- The prior instruction to commit original Markdown as migration evidence is
  superseded. Checksums and import reports provide the public audit trail;
  private originals remain the authoritative evidence.
- Preview deployments must render an access/setup state until private staging
  content is connected.

## Reversal

This boundary can be replaced by a separate private content repository later.
Moving source content into this public repository is not an acceptable reversal.
