# ADR 0002 — Use constrained, versioned TipTap JSON

**Status:** Accepted
**Date:** 2026-07-28

## Context

Canonical content needs structured editing, immutable revisions, citations,
tables, stable block targets, and a deterministic text projection. TipTap is
already installed in the personal-site application.

## Decision

Canonical revision bodies use a constrained TipTap/ProseMirror JSON document
with an explicit `core-exam-v1` schema version.

Allowed block nodes:

- paragraph;
- heading levels 2–4;
- bullet and ordered lists;
- blockquote;
- table, table row, header, and cell;
- horizontal rule;
- Core Exam callout;
- source citation.

Allowed inline content:

- text;
- hard break;
- bold;
- italic;
- code;
- link.

Images and arbitrary HTML are not part of canonical revision bodies. Images
remain private assets referenced through attachment records. Every addressable
block stores its immutable stable key in validated node attributes.

## Stored projections

Each revision stores:

- schema version;
- structured JSON body;
- deterministic plain-text projection for search/parity;
- checksum of normalized JSON;
- actor, timestamp, base revision, and optional edit summary.

## Consequences

- Schema upgrades require a versioned migrator.
- The importer must translate Markdown into this constrained shape and report
  unsupported constructs rather than silently dropping them.
- Rendering must reject unknown nodes and unsafe link protocols.
