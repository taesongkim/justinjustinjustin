# SongOS Planning

> Freeform thought-stream doc. Not yet applied to codebase.
> Last updated: 2026-03-02

---

## Vision

A unified personal operating system for defining what you want out of life, tracking progress toward it, catching patterns, and staying focused — both long-term and moment-to-moment. Designed as an "ergonomic ride for the distracted mind" — creating constant periods of flow rather than fighting against how the brain actually works.

**Core pillars:**
- **Define** — Declare goals, visions, values. What do I want for my life?
- **Track** — Actions, completions, patterns, history. What have I actually been doing?
- **Focus** — Daily and within-day tools to stay on path. What should I do right now?
- **Connect** — Social layer for friends to share progress and celebrate wins on personal projects.
- **Attribute** — Every action can be seen as contributing toward specific goals/visions, done for its own sake, or tagged as serving an unknown/emerging goal. A unified attribution layer across all tools.

---

## Hierarchy of Intention

The core structure for how purpose flows downward into action:

**Devotions** → **Visions** → **Goals** → **Projects** → **Tasks** → **Subtasks** (n levels deep)

- **Devotions** — Infinite, endless intentions. Things you never "complete" — you just keep showing up for them. (e.g., health, creativity, presence, relationships)
- **Visions** — Concrete pictures of what life looks like when a devotion is being honored. Can contribute upward to devotions.
- **Goals** — Measurable or definable milestones within a vision.
- **Projects** — Can attach to goals OR directly to visions. A body of work with a scope.
- **Tasks / Subtasks** — The atomic units. Hierarchical via nested tasks. Can exist independently (unattributed) or roll up into any level above.

Actions at any level can also exist for their own sake or be tagged as serving an unknown/emerging goal.

---

## Apps / Modules

### Nested Tasks (exists — evolving)
- Already built. Core task management with hierarchical structure.
- **Key evolution: decouple task containers from the page.**
  - Currently feels like one solid day-page with tabs.
  - Task containers (the shell holding the nested tab view) should be portable units — slottable in and out of different tabs/contexts.
  - Containers need a **title** property so they're findable in a directory.
  - **Parent tasks** (a root task with its branches) are also portable units. Title = parent task name + creation date as identifier.
- **Three destinations for stored task trees:**
  - **Hideaway bucket** — Parked. Out of sight, retrievable later.
  - **Template folder** — Reusable scaffolds (connects to Templates Engine).
  - **Bounty folder** — Like a hideaway bucket but signals high priority. "I'm not working on this right now, but it matters."

### Daily Review System
- Three discrete modes, manually toggled by the user:
  - **Pre-day** — Preview/plan the day. Set intentions, pick focus areas.
  - **During-day** — Work mode. Live tracking, quick capture, staying in flow.
  - **Post-day** — Close the day. Review completed tasks, uncompleted tasks, write notes for tomorrow or long-term reference.
- No automatic transitions — users decide for themselves when to shift modes.
- End-of-day review surfaces: what got done, what didn't, why, what to carry forward.

### Calendar / Timeline View
- Multiple view types (day, week, month, longer?)
- Overlays for: accomplishments, stuck points, published things, big ideas, patterns
- Not just scheduling — a history of what actually happened

### Templates Engine
- Templates are scaffolds — pre-designed task trees.
- Duplicated into the user's current nested task page as an editable instance.
- Also editable within the templates library itself (edit the template, not just the instance).
- Types: packing lists, daily rituals, journaling formats, resistance-breaking protocols.

### Journaling
- Own collection/database — not embedded inside daily review.
- Accessible by day (natural link to daily review post-day mode).
- Also browsable in collections: view all, filter by type, search, etc.
- Multiple journaling formats supported (via templates).

### Goal / Vision Tracker
- Visualize the full hierarchy: devotions → visions → goals → projects → tasks.
- See progress over time at any level.
- Actions roll up or exist independently.

### Social Layer
- **Public profile** — Users choose what to share. Opt-in per item or category.
- **Private rooms** — Group goals or group journeys, defined by participants.
- Built iteratively, one room type at a time.

---

## Architecture
_Tech decisions, data flow, how things connect._

- Unified action/event model: every discrete thing you do or declare is an "action" that can be tagged, attributed to any level of the hierarchy, timestamped, and queried across all modules.
- All modules read/write from this shared layer.
- Journaling has its own collection but is queryable alongside everything else by date and tags.
- Templates are stored as task tree structures, cloned on use.

---

## Features & Ideas

- Resistance-breaking protocols: structured flows for tasks you keep avoiding — break down the internal friction, not just the task itself
- Social celebration feed: friends can see when you ship something, hit a milestone, or break a streak
- Pattern detection: surface things like "you always stall on X-type tasks on Wednesdays" or "you're most productive after journaling"
- Unknown-goal attribution: let actions exist in a limbo state where they might be serving a goal you haven't articulated yet — revisit and connect later

---

## Open Questions

- ~~How do the three daily review modes transition?~~ **Resolved:** Manual toggle.
- ~~How structured vs. freeform should templates be?~~ **Resolved:** Scaffolds — pre-designed task trees, cloneable and editable.
- ~~What's the data model for attribution?~~ **Resolved (directionally):** Hierarchical — Devotions → Visions → Goals → Projects → Tasks → Subtasks. Tags also likely. Projects can attach directly to visions.
- ~~Social layer: how much do friends see?~~ **Resolved (directionally):** Public profile (user-curated) + private rooms (group goals/journeys).
- ~~Where does journaling live?~~ **Resolved:** Own collection, accessible by day and via collection views.
- How does the daily review's post-day mode pull from journaling? Is it a link, an embed, or does closing the day prompt a journal entry?
- What's the relationship between a "task container" and a "tab"? Is a tab just a viewport onto a container, or does a tab have its own identity/metadata?
- Can a single task tree live in multiple folders simultaneously (e.g., both bounty and template), or is it one location at a time?
- What does "resistance-breaking protocol" look like concretely as a template? Is it a questionnaire, a guided flow, a decision tree?
- How granular is the calendar overlay system? Can users create custom overlay types or is it a fixed set?

---

## Stream
_Raw thought-stream. Just go._
