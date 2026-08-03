---
name: SerialCube
description: Browser-native serial protocol debugger for embedded engineers — operate-mode, single-file, Chromium-only.
colors:
  accent: "#5672cd"
  accent-strong: "#3451b2"
  accent-soft: "rgba(100, 108, 255, 0.14)"
  signal: "#3a5ccc"
  warning: "#d97706"
  danger: "#e0575e"
  bg: "#ffffff"
  bg-elevated: "rgba(255, 255, 255, 0.92)"
  bg-panel: "rgba(255, 255, 255, 0.84)"
  bg-panel-strong: "rgba(255, 255, 255, 0.94)"
  bg-terminal: "#f6f6f7"
  text: "#3c3c43"
  text-soft: "#67676c"
  border: "rgba(60, 60, 67, 0.16)"
  border-strong: "rgba(60, 60, 67, 0.24)"
  brand-green: "rgba(34, 197, 94, 0.14)"
  overlay-backdrop: "rgba(12, 18, 24, 0.46)"
  # Dark-theme variants (referenced via `body.theme-dark` overrides)
  accent-dark: "#818cf8"
  accent-strong-dark: "#c7d2fe"
  signal-dark: "#6366f1"
  warning-dark: "#ffb14d"
  danger-dark: "#f87171"
  bg-dark: "#1b1b1f"
  text-dark: "#dfdfd6"
  text-soft-dark: "#98989f"
typography:
  display:
    fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.03em"
  title:
    fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.05
  body:
    fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
  micro:
    fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1
  mono:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  sm: "10px"
  md: "14px"
  pill: "999px"
spacing:
  gap: "10px"
  pad-sm: "6px"
  pad-md: "12px"
  pad-lg: "16px"
  header-height: "52px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-soft}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  button-icon:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text-soft}"
    rounded: "{rounded.md}"
    size: "32px"
  panel-card:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px"
  input-field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  status-chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: SerialCube

## Overview

**Creative North Star: "The Engineer's Workbench"**

The Workbench is never decorative. Every pixel either carries information or
stays out of the way. The aesthetic vocabulary is "iOS / macOS HIG, but for
serial terminals": rounded cards on a clean surface, soft elevation, a single
muted indigo accent that says *active state* without shouting. Density is
engineered for a 14" laptop with two side-by-side panels, not a 32" monitor
with room to breathe. Whitespace is a luxury; the Workbench would rather add
a chip.

Brand voice is dry, declarative, action-first. Labels are verbs (`连接设备`,
`清空缓存`, `冻结实时视图`). The UI never explains itself twice — no
`?`-icons asking "what does this do?", no tooltips restating the button.
Engineers read fast; the interface respects that.

Personality: **quiet competence**. Anti-references are AI-purple gradients,
hero marketing copy, "Designer Edition" typography, decorative animation that
distracts from the data. The Workbench is the opposite of a sales page.

**Key Characteristics:**

- Operate-mode tool, not a landing page; visitor is here to *do*, not *decide*
- Single accent color (muted indigo) used for active state and primary CTA;
  everything else is neutral
- Soft, low-contrast elevation; surfaces float on a clean background, not on
  a dark canvas
- Bilingual UI strings (zh-CN primary, en secondary), with font stack that
  covers Segoe UI / PingFang SC / Microsoft YaHei / Cascadia Code
- Compact density with 10px grid; collapses to a single column at ≤720px
- Mono font reserved for terminal/data panes; UI chrome is sans
- Status colors (warning / danger / signal) are reserved for state, never
  decoration

## Colors

The palette is built around one accent (muted indigo) over a near-white
neutral, with a small set of reserved semantic colors. There is no
"secondary" tier — every non-accent surface is a neutral.

### Primary

- **Workbench Indigo** (`#5672cd` light / `#818cf8` dark): the only
  saturated color in the system. Reserved for primary CTA, active toggle
  state, and selected mode chip. Its rarity is the point.
- **Workbench Indigo Deep** (`#3451b2` / `#c7d2fe`): the pressed/active
  state of the primary accent, and the body color of `status-pill` /
  numeric data highlights.
- **Signal Blue** (`#3a5ccc` / `#6366f1`): used only for the live data
  stream indicator (timeline live bar, parser field highlights). Visually
  close to the primary but reserved for "data is flowing".

### Neutral

- **Paper White** (`#ffffff` / `#1b1b1f`): the surface. Light theme is
  true white; dark theme is near-black, not pure black.
- **Panel Frost** (`rgba(255,255,255,0.84..0.94)` / `rgba(32,33,39,0.86..0.96)`):
  layered panels (floating menus, version modal). The 8-16% alpha range
  gives a subtle frosted-glass feel without `backdrop-filter` cost.
- **Terminal Ash** (`#f6f6f7` / `#161618`): reserved for the serial
  monitor pane and binary/timeline data views. One shade off the page bg
  to delineate the data zone.
- **Soft Border** (`rgba(60,60,67,0.16)` / `rgba(60,63,68,0.32)`): the
  default border. Strong variant (`0.24` / `0.44`) for selected/focused.
- **Ink Text** (`#3c3c43` / `#dfdfd6`): body text. Slightly desaturated,
  not pure black/white.
- **Whisper Text** (`#67676c` / `#98989f`): labels, secondary metadata,
  monospace timestamps in the monitor.

### Status (semantic, not decorative)

- **Warning** (`#d97706` / `#ffb14d`): only on disconnect notices and
  reconnection banners.
- **Danger** (`#e0575e` / `#f87171`): only on destructive actions
  (`清空配置`, `确认`) and persistent error states.
- **Brand Green** (`rgba(34,197,94,0.14)`): reserved for `REC` button
  active state; never used elsewhere.

### Named Rules

**The Indigo Rarity Rule.** The primary accent covers ≤8% of any
given screen. When the same indigo appears as both a primary CTA *and*
a selected state, the design has failed at the IA level — collapse one
into neutral first.

**The One Status Color Per Moment Rule.** At any given state, only one
semantic color (warning / danger / signal) speaks. A button cannot be
both warning and dangerous; the moment must pick.

## Typography

**Display Font:** Segoe UI 18px / 800 weight / `letter-spacing: 0.03em`
(used for topbar primary CTA only)

**Body Font:** Segoe UI 13px / 500 weight, with fallback chain
`"PingFang SC", "Microsoft YaHei", sans-serif` for CJK and Windows

**Mono Font:** Cascadia Code 13px, with `SFMono-Regular, Consolas,
monospace` fallback. **Reserved for terminal, parser tokens, timeline
data, and version stamps.** Never used in chrome.

**Character:** The pairing is deliberately plain — Segoe UI is the
default Windows / Office font, picked for ubiquity on engineer
machines. No display-serif, no geometric sans, no personality choice.
The Workbench is anti-fashion; if the user feels nothing about the
typeface, the typeface has done its job.

### Hierarchy

- **Display** (800, 18px, ls 0.03em): the topbar primary CTA
  ("连接设备 | 当前未连接") and the status-pill title. Two places
  total.
- **Title** (700-800, 13-16px): panel headers, version modal title,
  card titles. The workhorse of the system.
- **Body** (400-500, 13px): default text, button labels, list rows.
  Max ~80ch before wrap.
- **Label** (700, 11px, ls 0.04em): metadata labels, section
  captions, mode-tabs. Often uppercase or pseudo-caps via weight.
- **Micro** (700, 9px, ls 0.04em): chip / tag text, the 1-2
  character axis labels. Never wraps.
- **Mono** (400, 13px): terminal monitor, parser preview, timeline
  data, version string in about modal. Always `var(--font-mono)`.

### Named Rules

**The Mono Reservation Rule.** Cascadia Code appears only inside data
panels. UI chrome, button labels, panel titles — all sans. Mixing
mono into chrome makes the data look less special and the chrome
look busier.

**The Weight-Over-Size Rule.** Hierarchy is communicated by `font-weight`
(400 → 500 → 700 → 800) more than by `font-size` (9 → 11 → 13 → 16 → 18).
The size scale is narrow on purpose; engineers scan by weight, not by
picking out the largest text.

## Layout

The workspace is a fixed three-region shell that responds to width
by collapsing or widening, never by reflowing into a marketing-page
pattern.

### Region structure

- **Topbar** (`height: 52px`): brand block (logo + status pill +
  mode switch) on the left, timeline ribbon in the center, system
  menu + version chip on the right. Fixed; never scrolls with main.
- **Main** (`.workspace`): a CSS Grid with two columns (`left-column`
  and `right-column`). Left holds device management, parser config,
  charts; right holds the live monitor. The two columns are
  *visually parallel*, not hierarchical.
- **Floating layers**: system menu, version modal, toast layer.
  All `position: fixed` with `--overlay-backdrop` + `blur(10px)`.

### Breakpoints

- **≥1180px** (default): two columns side-by-side, full density,
  sidebar expanded.
- **1080-1179px**: left/right still side-by-side but compact
  spacing; sidebar optional collapse.
- **720-1079px**: parser/charts and monitor stack vertically in
  single column (`.compact-single`).
- **<720px**: topbar collapses to essential elements; timeline
  ribbon shrinks; modal goes full-width.

### Density and rhythm

- **Base unit**: 10px (`--grid-gap`). All paddings and gaps are
  multiples of 10 or 5; 7px or 13px never appear.
- **Panel internal padding**: 12px (`--pad-md`).
- **Card-to-card gap**: 10px.
- **Section-to-section gap**: 16px (`--pad-lg`).

### Named Rules

**The Stable Header Rule.** The topbar never scrolls. The timeline
ribbon (REC indicator + freeze/scrub) stays fixed to the right of
the brand block at all times — it's the Workbench's "power button"
and the user's mental anchor.

**The Sidebar Equality Rule.** `left-column` and `right-column` are
not "main + sidebar". The monitor has equal weight to the controls;
neither column is decorative. The mode-switch in the topbar toggles
which surface is foreground, but both are always addressable.

## Elevation & Depth

The Workbench is *flat-with-soft-lift*. Surfaces are defined first by
color and border, with shadow as a response to state (overlay,
hover, focus), not as a structural property.

### Shadow vocabulary

- **Ambient Soft** (`0 18px 48px rgba(0,0,0,0.10)` light /
  `0 24px 54px rgba(0,0,0,0.38)` dark): reserved for the version
  modal and floating menu. Soft, low-contrast, no hard edge.
- **Hover Soft** (`0 10px 30px rgba(0,0,0,0.07)`): transient, on
  card hover or primary button hover.
- **No card shadow on body surfaces**: the `.panel` cards
  (config-panel, monitor-panel, parser-panel, charts-panel) have
  **no shadow** at rest. They sit on `--bg` with `--border` and a
  panel background tint.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow
appears only as a response to state (hover, focus, modal, toast).
A panel that "floats" without a state reason is showing off.

**The Tinted Shadow Rule.** Shadows are tinted by the page background,
not pure black on light surfaces. The light-theme shadow is a 10% gray;
the dark-theme shadow is a 38% black. This is the difference between
"lifted card" and "card with a smudge under it".

## Shapes

The form language is a single soft radius (14px) repeated across all
interactive elements, with a tighter radius (10px) for inline inputs.

### Radius scale

- **`--radius` (14px)**: every card, button, panel, modal, menu,
  chip, tab. Universal. If a new element needs a corner, it gets
  14px unless it has a specific reason not to.
- **`--radius-small` (10px)**: text inputs, inline tags, parser
  token fragments — anything that nests inside a 14px card and
  needs a slightly tighter form to feel coherent.
- **Pill (999px)**: only for `status-pill` (logo block) and the
  REC button when active. Not for buttons; buttons are 14px.

### Border treatment

- All borders use the soft-border color (`rgba(60,60,67,0.16)`).
  No black borders. No 1px black hairlines. Selected/focused state
  shifts to `--border-strong` (0.24 alpha) and may add a
  `--accent-soft` tint inside.
- No double borders, no inset shadows as borders. One border, one
  source of truth.

## Components

The component library is small and named by role, not by Material
tier. There is no separate `elevated` / `filled` / `outlined` axis;
the variant name tells you what the button *does*.

### Buttons

- **Primary** (`.primary-btn`): indigo bg, white text, 14px
  radius, 8/16 padding, 13px / 500. Used for: connect device,
  confirm destructive action, apply parser changes.
- **Secondary** (`.secondary-btn`): panel bg, ink text, 14px
  radius, 8/16 padding. Used for: add chart, apply preset,
  open picker.
- **Ghost** (`.ghost-btn`): transparent bg, whisper text, 14px
  radius, 6/10 padding. Used for: cancel, dismiss, system menu
  line items.
- **Icon** (`.icon-btn`): panel bg, whisper text, 14px radius,
  32×32 size. Used for: theme switch, expand/collapse, timeline
  picker toggle.
- **Danger** (`.danger-btn` overlay): applied to any of the above
  when the action is destructive (clear config, clear cache).
  Swaps text color to `--danger` and border to `--danger`.

**Hover / focus:** primary darkens to `--accent-strong`; secondary
and ghost shift text to `--text`; icon shifts to `--accent`. All
transitions are 120-180ms ease.

**Disabled:** 50% opacity, no hover treatment, no pointer.

### Chips

- **Status chip** (status pill text, mode indicator): accent-soft
  bg, accent-strong text, pill radius, 9px / 700 uppercase.
- **REC chip** (timeline recording state): brand-green bg,
  ink text, 14px radius. Pulse animation when active.
- **Mode chip** (serial-monitor / parser tabs): transparent bg
  with bottom border indicator; active state has accent border.

### Cards / Containers

- **Panel** (`.panel`): 14px radius, `--bg-panel` background,
  `--border` 1px, **no shadow at rest**. 12px internal padding.
  Used for: config panel, parser panel, monitor panel.
- **Chart card** (`.chart-card`): same panel rules but with a
  fixed aspect header (32-40px) for chart title + close button.

### Inputs

- **Text input**: bg (`--bg`), 10px radius, 1px `--border`,
  6/10 padding, 13px body font. Focus shifts border to
  `--accent` and adds a 2px `--accent-soft` outer ring.
- **Number / hex input**: same shape as text input, monospace
  font when content is bytes.
- **Select** (custom-styled): same as text input plus a
  chevron icon; popup uses the floating menu style.

### Navigation

- **Topbar tabs** (logo-mode-switch): two pill buttons side by
  side, active state shows indigo-soft background. The
  "antd-style card tab" pattern requested by the team.
- **Floating menu** (`#system-menu`): 14px radius, panel-strong
  background, soft shadow, anchored to the system-menu button.
  6-8px internal padding between items.

### Signature Components

- **Status Pill** (`.status-pill`): the brand block itself.
  Pill radius, holds the brand mark + status dot + title +
  subtitle. On hover, shows the connection summary as a
  tooltip-like overlay. The pill is the Workbench's avatar.
- **Timeline Ribbon** (`#timeline-ribbon-shell`): the live
  data bar that sits inline in the topbar. A 4-6px tall bar
  with a moving indicator (live sweep animation) when data is
  flowing; freezes when paused; collapses to a "REC" button
  + scrub slider when in playback. The ribbon is what makes
  the Workbench feel "alive" without being decorative.
- **Parser Result Grid** (`.parser-result-grid`): a flex
  layout of token blocks, each with name (mono) + value
  (mono) + unit. Used to render decoded TLV fields in real
  time. 6-8px gap between blocks, 10px radius on each block,
  alternating subtle bg tint for visual grouping.

## Do's and Don'ts

### Do:

- **Do** use the indigo accent for one and only one thing per
  surface. If the active row is already indigo, the section
  title is not.
- **Do** prefer weight (500 → 700 → 800) over size changes for
  hierarchy. Reach for a larger size only at the topbar CTA
  and the version modal title.
- **Do** use `--font-mono` for any byte, hex, or timestamp
  display. UI chrome is sans, data is mono, never the twain.
- **Do** keep all spacing on a 10px (or 5px half-step) grid.
  7px, 13px, 17px paddings are bugs, not choices.
- **Do** use the panel-pattern (14px radius + 1px border, no
  shadow) for new card-like surfaces. Reach for shadow only
  when the element genuinely floats above the page (modal,
  floating menu).
- **Do** reserve warning / danger / signal colors for state,
  not decoration. A red heading on neutral text is decoration;
  a red REC-state is state.
- **Do** label actions as verbs (`连接设备`, `清空缓存`,
  `冻结实时视图`). No noun-only buttons, no emoji-prefixed
  labels, no question-mark help icons next to obvious buttons.

### Don't:

- **Don't** introduce a second accent color. The Workbench is
  one-accent by design. A second accent means the IA is
  confused; collapse the role first.
- **Don't** use 1px black borders, hard 4px shadows, or any
  "outlined" Material look. The Workbench is soft, layered,
  one-radius. Material is the wrong reference family.
- **Don't** add tooltips that restate the button. If a
  tooltip is needed, the label is wrong.
- **Don't** add a 32px display font for "marketing flair" in
  the workspace. The 18px topbar CTA is the largest text in
  the system. Larger = wrong.
- **Don't** mix mono into UI chrome (panel titles, button
  labels, version modal subtitle). The mono reservation
  protects the data panes.
- **Don't** use AI-default purple gradients, glassmorphism on
  every surface, or infinite-loop micro-animations. The
  Workbench is quiet; if a user notices the motion, the
  motion is wrong.
- **Don't** ship a new component before checking it against
  this file. If a new shape / color / radius is needed that
  isn't in DESIGN.md, that's a token gap, not a shortcut.
