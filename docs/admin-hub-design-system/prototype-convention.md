---
type: project
status: in-progress
owner: will
last_reviewed: 2026-04-29
tags: [design-system, prototypes, admin-hub, workflow, pilot]
---

# Atiom Prototype Convention

**Last Updated:** 2026-04-29
**Source(s):** Will + Yulia working session 2026-04-24, Yulia proposal `2026-04-24-yulia-ai-prototyping-workflow.md`, Will + Claude structural decision 2026-04-29
**Status:** **PILOT** — running 4–8 May 2026, review Mon 11 May. Conventions below are pilot-state and may iterate.

## Purpose

AI made HTML prototypes cheap. That broke the implicit gate Figma used to provide (Figma was slow enough to force a polish step before engineering consumed the work). This convention reintroduces that gate as a deliberate human moment, not a tool-imposed friction.

The point isn't to slow down prototyping. It's to prevent rough exploratory HTML being mistaken for the spec when it reaches engineering.

## Where prototypes live

**Feature prototypes live with their feature**, not in the design system repo:

```
atiom-brain/projects/{feature}/
├── PRD.md
├── prototype/
│   ├── 00-INDEX.md
│   ├── exploratory/
│   ├── handoff/
│   ├── presentation/
│   └── archive/
└── ...
```

Why not in `~/product-hub/atiom-design-system/`? The design system is a **library** — tokens, components, system-level patterns. Feature prototypes are *applications of the library*, not part of it. Mixing them clutters the system Pae stewards and blurs the boundary between reusable patterns and one-off feature work.

The design system repo continues to host system-level pattern HTML (`patterns/dashboard.html`, `patterns/page-shell.html` etc.). Anything feature-specific lives in `atiom-brain/projects/{feature}/prototype/`.

**Unattached sketches** live at `atiom-brain/projects/_scratch/` with `feature: scratch` in frontmatter. When a sketch attaches to a feature, `/prototype-promote` moves it into the right feature folder.

## Status definitions

| Status | What it means | Validation | Lifecycle |
|---|---|---|---|
| `exploratory` | Rough, AI-generated, may be wrong. Used to validate an idea before committing to it. | None — any HTML accepted | Short-lived, often discarded |
| `handoff` | Engineering-ready. Built on the design system. Interaction-exact. | Must use design system tokens, must link to a PRD | Lives until feature ships, then archived |
| `presentation` | Finish-quality. Real content, best-case states. Suitable for client screenshots and decks. | Real content (no Lorem Ipsum), no placeholder states | Lives as long as it's needed for external comms |
| `archive` | Shipped, superseded, or abandoned. Kept for history. | None | Permanent |
| `scratch` | Not yet attached to a feature. | None | Until attached or pruned |

## Frontmatter schema

Every prototype HTML carries a comment block at the top:

```html
<!--
status: exploratory | handoff | presentation | archive | scratch
feature: pending-exports
prd: projects/pending-exports/PRD.md
owner: yulia
created: 2026-05-04
last_updated: 2026-05-04
override: false
reason: ""
-->
```

Required for all: `status`, `feature`, `owner`, `created`, `last_updated`.
Required for `handoff`: `prd` must point to a real file.
Required if `override: true`: `reason` must explain why.

## Skills (the gate)

Two skills enforce intake and graduation:

- **`/prototype-new`** — at file creation. Asks: purpose, feature, PRD link. Generates frontmatter, places file in correct folder, registers in 00-INDEX.md.
- **`/prototype-promote`** — at status change. Asks: which file, target status. Runs validation appropriate to the new status. Updates frontmatter, moves file (if folder changes), updates index.

**During the pilot, every HTML prototype must pass through these skills.** No manual file creation, no manual status edits. The skills *are* the gate — bypassing them defeats the pilot.

Skills live at `atiom-brain/.claude/skills/prototype-new/` and `atiom-brain/.claude/skills/prototype-promote/`. Project-level so anyone running Claude Code from inside `atiom-brain/` picks them up automatically.

## Engineering rule (DRAFT — pending Pae confirmation)

Engineering builds only from prototypes registered in `00-INDEX.md` with status `handoff`. If something is shared by Slack/DM/email and isn't in an index, the dev asks before building.

This rule is **not yet binding** — it's the proposed engineering-side gate. Confirmed in the Pae socialisation step after pilot review.

## Override path

If `/prototype-promote` validation blocks something legitimate (e.g., handoff target but design system doesn't yet cover the component), the user can override:

1. Add `override: true` to frontmatter
2. Add `reason: "design-system gap: XYZ component not yet specified"`
3. Status updates anyway

Overrides are logged and audited at the Mon 11 May pilot review. If the same gap appears multiple times, it surfaces a system gap to address.

## Engineering rule for `presentation` builds

A `presentation` prototype is a finish-pass on a `handoff` prototype, not a separate rebuild. The HTML stays the same; what changes is content (real names, real data, best-case states) and any final visual polish needed for screenshots. Once the design system tightens, the gap between `handoff` and `presentation` shrinks toward zero.

## Pilot status

- **Pilot dates:** Mon 4 May → Fri 8 May 2026
- **Participants:** Will (decision authority), Yulia (co-owner, design intent)
- **Not yet socialised to:** Pae, Bird (after pilot review only)
- **Friction log:** `design/admin-hub-design-system/prototype-pilot-log.md`
- **Review:** Mon 11 May, 30 min, decide continue/iterate/drop
- **Decision artefact (post-review):** `design/admin-hub-design-system/prototype-pilot-review.md` + Decisions Log row in `admin-hub-design-system.md`

## Related

- [[admin-hub-design-system]] — parent design system project
- [[hub-typography]], [[hub-colors]] — system-level foundations (mirrored from design system repo)
- [[PRD|pending-exports]] — pilot feature surface
