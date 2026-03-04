# Writual App — Rough Guide

## Basic Purpose
Create a writing space where users can design writing practices, save practices as templates, time sessions, and group practices into sequences saved as practice-flows.

---

## Practice Types

### Mantra
- User saves a phrase
- Phrase displays as a guide in low opacity by default
- User types the set phrase over the low opacity guide
- **Settings:**
  - Preset phrase visibility toggle (visible/invisible)
  - Completion Indicator (toggle on/off)
    - Manual declaration
    - Auto-detection (user-defined completion definition)
      - Congruency leniency levels:
        - Match all characters perfectly
        - Capitalization ignored
        - Punctuation ignored (letters in right order only)
  - Timer toggle
    - Records from first character input
    - Can be reset

### Mantra-Lines
- Same as Mantra, but user sets number of repetitions (e.g. 100)
- N lines of the mantra are displayed
- User types each line, hits return to advance to next
- **Settings:**
  - Auto-detect completion indicator per line (same sub-settings as Mantra)
  - Toggle: per-line timer (starts on type, ends on line completion)
  - Toggle: entire session timer (starts on type, ends on all lines complete)

### Prompt
- Prompt set and displayed
- Optional detailed instructions/context can be set and displayed
- Large writing space with simple doc capabilities:
  - 3 header sizes (shortcut via `#`, `##`, `###`)
  - Dotted/bullet lists (shortcut via `- ` + characters + return)
  - Nested lists supported
  - Triple hyphen (`---`) + return creates a divider
- Copy button auto-copies text to clipboard
- **Settings:**
  - Optional timer toggle
    - Starts on first keystroke
    - Ends when user presses complete
  - Optional word-count indicator toggle

---

## Flows

### Practice Creation Flow
- Flow for creating practices (essentially templates)

### Practice-Flow Creation Flow
- Flow for creating practice groups (can be a single practice)
- **Settings:**
  - Auto timer option that times entire session

---

*This is a rough draft spec — subject to iteration.*
