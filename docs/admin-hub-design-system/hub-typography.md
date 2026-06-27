---
type: project
status: active
owner: yulia
last_reviewed: 2026-05-21
tags: [design-system, admin-hub, typography, foundations]
---

# Hub Typography (Foundations)

**Last Updated:** 2026-05-21
**Source(s):** Atiom — Foundations (Figma); mirrored from `juliarainbowx/atiom-design-system/typography.md` (local clone at `~/design-system/`, last reconciled against commit `4c39a51` 2026-05-20). Content verified unchanged since 2026-04-28 snapshot.

## Current Status

Typography foundation for the **admin hub design system only**. Plus Jakarta Sans is the primary UI font; Aeonik is reserved for branding/display headers (page titles in marketing surfaces, not in-product UI). Scope: admin hub. **Font family choice (Plus Jakarta Sans) is the one foundation shared with the app — see [[admin-hub-design-system]] Decisions Log.**

## Key Details

- Font family: **Plus Jakarta Sans** (primary UI font), **Aeonik** (branding/display headers)
- All letter spacing is `0` unless otherwise specified
- Aeonik is used only for marketing/branding headers (page titles), not for UI components
- Plus Jakarta Sans is the default font for all UI elements

### Font Scale (Regular weight — 400)

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `f1`  | 24px | 36px        | Large body / intro text |
| `f2`  | 20px | 30px        | —     |
| `f3`  | 18px | 28px        | —     |
| `f4`  | 16px | 24px        | Default body text |
| `f5`  | 14px | 20px        | Small text |
| `f6`  | 12px | 18px        | — (uses semibold weight) |

### Headings (Semibold weight — 600)

| Token | Size | Line Height |
|-------|------|-------------|
| `h1`  | 24px | 36px        |
| `h2`  | 20px | 30px        |
| `h3`  | 18px | 28px        |
| `h4`  | 16px | 24px        |
| `h5`  | 14px | 20px        |
| `h6`  | 12px | 18px        |

### Font Weights

| Weight   | Value | Usage              |
|----------|-------|--------------------|
| Thin     | 300   | Thin/light text    |
| Regular  | 400   | Body text          |
| Semibold | 600   | Headings, labels, emphasis |
| Bold     | 700   | Strong emphasis    |

## Loading

**Specs and prototypes** in the design system repo load Plus Jakarta Sans from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

Weights loaded: 300, 400, 600, 700 + italic 400 (matches the Font Weights table above).

**Production apps** consuming these specs should self-host the `woff2` files and preload the regular weight to avoid FOUT and the third-party request:

```html
<link rel="preload" href="/fonts/plus-jakarta-sans-400.woff2" as="font" type="font/woff2" crossorigin>
```

Aeonik is licensed and self-hosted separately — not loaded from Google Fonts.

## Related

- [[admin-hub-design-system]] — project context and stewardship
- [[hub-colors]] — companion foundation
- [[meridian]] — separate (external brand) typography system; do NOT cross-wire

## Referenced by

[Auto-maintained by `/brain audit`]
