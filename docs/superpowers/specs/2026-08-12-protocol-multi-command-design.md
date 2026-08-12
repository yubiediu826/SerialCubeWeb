# Protocol Multi-Command & Unified Config Center — Design Spec

| | |
|---|---|
| **Status** | DRAFT — awaiting user review |
| **Date** | 2026-08-12 |
| **Author** | Mavis |
| **Branch** | `feature/protocol-multi-command` (to be created at implementation time) |
| **Baseline** | SerialCube v1.0.0 (single-file, ~942KB HTML) |
| **Previews** | v1 → v2 → v3 → v4 in `docs/design/protocol-multi-command-*-preview.html` |

---

## 1. Context

### Problem

The dashboard's protocol editor (modal `dh-proto`) lets users define one protocol's **frame template** (header / addr / cmd / length / data / crc / tail) but commands are managed in a **separate** global list (`NS.COMMANDS`) referenced by `cmd.protocol = 'proto_xxx'`. The relationship is a loose string pointer, not first-class ownership. Concretely:

- A protocol's "Commands" UI only shows one preview command at a time. The full set of commands for a protocol is invisible from the protocol editor.
- Adding a command requires opening a different modal (`dh-cmd-config`).
- Deleting a protocol leaves orphan commands; the editor falls back to `COMMANDS[0]`.
- Import/export maintains `protocols` and `commands` as two separate arrays — no atomic guarantee they stay consistent.

In addition, 4 independent config modals (命令管理 / 卡片配置 / 告警配置 / 导入/导出) live side-by-side in the toolbar, each with its own entry button. This is a high navigation cost for what is, conceptually, one "settings" concern.

### Why now

The current data model is being pushed to its limits as protocol count and command count grow. Adding a 9th or 10th protocol means re-deriving the relationship manually. Custom protocols (devices that don't fit any of the 8 built-in kinds) have no clean entry path — users are forced to pick a closest-fit kind and edit fields manually, with no documentation that this is supported.

### Goals

1. **First-class command ownership**: a protocol's commands live inside the protocol (`proto.commands[]`), making the relationship explicit in both data and UI.
2. **Per-command data fields**: each command owns its `dataFields[]` (with `type` and `default`). The global `NS.DATA_FIELDS` array is retired.
3. **One config entry point**: merge 4 separate config modals into 1 unified "配置中心" modal with 5 tabs.
4. **Custom protocol support**: add a 9th kind `Custom` for fully blank-slate protocol definition.
5. **Icon discipline**: all icons inline SVG (Lucide-style: 16x16 viewBox, stroke 1.5, currentColor). No emoji or text icons.
6. **New user onboarding**: guided tour overlay walks through the 4-step flow (协议 → 命令 → 卡片 → 完成).

### Non-Goals

- Replacing the 8 built-in protocol kinds (fixed-header, raw, cmd-split, addr-split, ctrl-bit7, type-high-bit, msgid-mixed, tlv) — they stay.
- Building a plugin/extension system for user-defined protocol kinds (Power-user path is "import JSON" — see §6.3).
- Live serial port connection or hardware integration changes.
- Refactoring the 1-file monolithic HTML structure (out of scope for this spec).

---

## 2. Data Model

### Current (v1.0.0)

```js
// Global, shared across all commands
NS.DATA_FIELDS = [
  { name: 'cell_1_v', type: 'u16', default: '0x0000' },
  // ... 11 fields total
];

// Global command list, references protocol by string id
NS.COMMANDS = [
  { id: 0x01, name: 'Read Voltage', protocol: 'proto_bms', dataFields: ['cell_1_v', ...] }
  // ... 8 commands
];

// Protocol has frame template only
NS.PROTOCOLS = [
  { id: 'proto_bms', fields: [/* header/addr/cmd/length/data/crc/tail */], ... }
];
```

### Target (v2 — this spec)

```js
// Type library: small, global, defines byte sizes for u8/u16/u32/float/etc.
NS.DATA_TYPES = [
  { name: 'u8',  size: 1 },
  { name: 'u16', size: 2, byteOrder: 'BE' },
  { name: 'u32', size: 4, byteOrder: 'BE' },
  { name: 'i16', size: 2, byteOrder: 'BE' },
  { name: 'i32', size: 4, byteOrder: 'BE' },
  { name: 'float', size: 4, byteOrder: 'BE' }
];

// Protocol self-contained: frame template + commands (each with own dataFields)
NS.PROTOCOLS = [{
  id: 'proto_bms',
  name: 'BMS TLV v1',
  kind: 'fixed-header',  // or: raw, cmd-split, addr-split, ctrl-bit7, type-high-bit, msgid-mixed, tlv, **custom** (NEW)
  byteOrder: 'BE',
  crcType: 'crc16-modbus',
  crcInit: '0xFFFF',
  crcEndian: 'LE',
  crcRange: 'all',
  fields: [  // frame template, no 'cmd' field anymore
    { id: 'f1', name: 'header', type: 'header', size: 1, default: '0xAA' },
    { id: 'f2', name: 'addr',   type: 'addr',   size: 1, default: '0x01' },
    { id: 'f4', name: 'length', type: 'length', size: 1, byteOrder: 'BE', default: 'auto' },
    { id: 'f4d',name: 'data',   type: 'data',   size: 0, byteOrder: 'BE', default: '0x00' },
    { id: 'f5', name: 'crc',    type: 'crc',    size: 2, byteOrder: 'LE', default: 'auto' },
    { id: 'f6', name: 'tail',   type: 'tail',   size: 1, default: '0x55' }
  ],
  commands: [  // ← NEW: commands are first-class children
    {
      id: 0x01,
      name: 'Read Voltage',
      direction: 'rx',        // 'tx' | 'rx'
      frameType: 'query',     // 'query' | 'control' | 'response'
      cadence: 200,           // ms; 0 = trigger-only
      expectResponse: 0x80,   // optional
      dataFields: [           // ← NEW: command owns its fields
        { name: 'cell_1_v',    type: 'u16', default: '0x0000' },
        { name: 'cell_2_v',    type: 'u16', default: '0x0000' },
        { name: 'cell_3_v',    type: 'u16', default: '0x0000' },
        { name: 'cell_4_v',    type: 'u16', default: '0x0000' },
        { name: 'pack_v_avg',  type: 'u16', default: '0x0000' }
      ]
    },
    { id: 0x10, name: 'Control Charge', direction: 'tx', frameType: 'control', cadence: 0, dataFields: [...] },
    { id: 0x90, name: 'Charge Ack',     direction: 'rx', frameType: 'response', cadence: 0, dataFields: [...] }
  ]
}, {
  id: 'proto_modbus',
  kind: 'fixed-header',
  fields: [...],
  commands: [...]
}];

// Backward-compat helper: flatten all commands for legacy callers
NS.allCommands = () => NS.PROTOCOLS.flatMap(p => p.commands || []);

// CARDS continue to reference commands by id; lookup now goes via allCommands()
NS.CARDS = [
  { id: 'c1', type: 'trend', cmd: 0x01, field: 'cell_1_v', ... }
  // ↑ card.cmd = 0x01 still works; lookup is now `NS.allCommands().find(c => c.id === 0x01)`
];
```

### Kind taxonomy (9 total)

| Kind | Frame shape | Direction encoding |
|------|-------------|--------------------|
| `fixed-header` | header·addr·cmd·length·data·crc·tail | direction not in frame |
| `raw` | header·cmd·length·data·crc | MB=0x5A, CB=0x55 |
| `cmd-split` | header·cmd·data·crc | cmd bit7 = direction |
| `addr-split` | header·srcAddr·dstAddr·cmd·data·crc | src/dst swapped |
| `ctrl-bit7` | header·addr·ctrl·data·crc | ctrl bit7 = direction |
| `type-high-bit` | header·addr·type·data·crc | type bit7 = direction |
| `msgid-mixed` | header·msgID(2B)·data·crc | msgID[15]=dir, [14:8]=func, [7:0]=addr |
| `tlv` | header·(type·len·val)×N·crc | tlv.type bit7 = direction |
| **`custom`** ⭐ NEW | none (user defines every field) | n/a |

---

## 3. UI Architecture

### Toolbar (1 config entry, was 5)

```
[⚙ 配置中心] | ● 实时 800ms ··· [🎓 引导] [✏️ 编辑模式]
```

- ❌ Removed: 主题 button (project already auto-follows `prefers-color-scheme`)
- ❌ Removed: 命令管理 / 卡片配置 / 告警配置 / 导入导出 (4 separate buttons)
- ✅ Added: 配置中心 (replaces 协议编辑器 button)
- ✅ Added: 引导 (manual-trigger guided tour, see §5.4)

### Config Center Modal (1 modal, 5 tabs)

```
┌─ 配置中心 —————————————————————————————————————————————— [🎓 开始引导] [×] ┐
│                                                                            │
│  [⚙ 协议] [⚡ 命令 5] [▤ 卡片 12] [🔔 告警 6] [↔ 导入/导出]                  │
│  ─────────                                                              │
│                                                                            │
│  [active tab content]                                                    │
│                                                                            │
│  ───────────────────────────────────────────────────────────              │
│  ✓ 已自动保存 · proto_bms · 5 commands         [导出] [完成]              │
└────────────────────────────────────────────────────────────────────────────┘
```

Tabs are **equal peers** (no ① ② ③ ④ numbering, no implied sequence). Each tab:

| Tab | Content |
|-----|---------|
| **协议** | Protocol picker dropdown · frame template table · `[+ 新建协议]` `[📥 导入协议 JSON]` (import reuses Tab 4 logic) |
| **命令** | Command table (id, name, dir, type, cadence, fields, size, edit) · `[+ 新建命令]` |
| **卡片** | Card table (id, title, type, cmd, range, precision, unit, edit) · `[+ 新建卡片]` |
| **告警** | Auto-derived from card ranges. Header: `[↻ 从卡片重建]` `[+ 手动添加]` (optional) |
| **导入/导出** | 2 panes: Export (JSON preview + download/copy) · Import (drop zone or file pick). Danger zone: reset to defaults |

### Sub-modals (all triggered from inside Config Center)

| Sub-modal | Trigger | Purpose |
|-----------|---------|---------|
| **新建协议 (3 步向导)** | `协议` tab → `[+ 新建协议]` | ① Pick kind (8 + Custom) ② Name + base config ③ Adjust frame template (kind pre-fills) |
| **新建命令** | `命令` tab → `[+ 新建命令]` | ID/name/dir/frameType/cadence/expectResponse + data fields list (name, type, default) |
| **新建卡片** | `卡片` tab → `[+ 新建卡片]` | Type (TREND/PAIR) + cmd + field/pairId + title/unit/range/precision |
| **导入 JSON (文件选择)** | `导入/导出` tab → file picker | Reused for full config OR single protocol JSON |

### Icon library (Lucide)

All icons inline SVG, style: `viewBox="0 0 24 24"`, `stroke-width="2"`, `fill="none"`, `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Display size 14px (toolbar) or 12px (inline actions).

Centralized helper:

```js
// Single source of truth, defined once near the top of the dashboard namespace
const ICONS = {
  settings: '<path d="..."/>',
  network:  '<rect.../><path d="..."/>',
  zap:      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  // ... ~30 icons
};

function icon(name, size = 14) {
  const path = ICONS[name];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
```

Icon names used in this spec: `settings`, `network`, `zap`, `layout-grid`, `bell`, `arrow-left-right`, `plus`, `plus-circle`, `x`, `pencil`, `trash`, `copy`, `search`, `filter`, `check`, `check-circle`, `chevron-left`, `chevron-right`, `grip-vertical`, `download`, `upload`, `file-up`, `folder-open`, `alert-triangle`, `rotate-ccw`, `refresh-cw`, `help-circle`, `moon`, `graduation-cap`, `info`.

---

## 4. Interactions

### 4.1 New Protocol (3-step wizard)

| Step | UI | Validation |
|------|----|------------|
| ① Pick kind | Grid of 9 cards (8 + Custom) with description | exactly 1 selected |
| ② Name & config | id (text), name (text), byteOrder (BE/LE), CRC type + init + endian + range | id unique, not empty |
| ③ Frame template | Pre-filled based on kind (e.g. fixed-header → 6 fields). User can drag-reorder, add, delete, edit type/size/byteOrder/default. Live frame preview at bottom. | at least 1 field; crc field required if CRC type ≠ none |

For `Custom` kind, step 3 starts with **empty** field list. User clicks `[+ 添加字段]` to add header/data/crc/etc. one by one.

### 4.2 New Command (single modal)

Form: id (hex), name, direction (RX/TX), frameType (query/control/response), cadence (ms, 0=trigger), expectResponse (optional hex), remark (optional).

Inline data field editor: each row has [name input] [type select] [default input] [× delete]. Total data bytes shown at bottom, auto-computed from `sum(field.type.size)`.

### 4.3 New Card (single modal)

Form: type (TREND/PAIR), title, unit, cmd (dropdown of all commands across protocols), field (for TREND) or pairId (for PAIR), range [lower, upper], precision, fromOtherCmd (boolean, indicates data comes from a different command).

### 4.4 Guided Tour (manual trigger only)

User clicks the 🎓 button (in toolbar OR in modal header). The tour overlay runs through 4 steps:

| Step | Highlight | Tooltip body |
|------|-----------|--------------|
| 1 | `协议` tab + frame template area | "第一步: 选/新建一个协议, 调好帧模板 (header/addr/length/data/crc/tail)。8 种 kind 选一种, 或选 Custom 自己拼。" |
| 2 | `命令` tab + command table | "第二步: 在当前协议下加几条命令 (0x01 读、0x10 写、0x90 响应)。每条命令自带数据字段。" |
| 3 | `卡片` tab + card table | "第三步: 选命令的某个字段做卡片, TREND 看趋势, PAIR 对比 SET vs ACT。设单位、范围、精度。" |
| 4 | `告警` tab | "第四步: 卡片 range 自动派生告警规则, 不需要手维护。关掉 modal 就能看到数据流。" |

Tour controls: progress dots (4) + 上一步 / 下一步 / 跳过引导.

**Trigger semantics (per user decision 2026-08-12)**: tour is **only** triggered by the manual 🎓 button. No first-time auto-popup, no localStorage flag. Each click restarts from step 1.

### 4.5 Custom Protocol (3rd wizard path)

When user picks `Custom` in step 1:
- Step 3 frame template is empty.
- User clicks `[+ 添加字段]` → small inline form pops up: type (header/addr/cmd/length/data/crc/tail) / name / size / byteOrder / default.
- After save, field appears in table; can edit/delete like any other kind.
- Live frame preview at bottom updates as fields are added.

---

## 5. Migration

### 5.1 Backward-compat shim

```js
// Legacy NS.COMMANDS lookup → new allCommands()
NS.allCommands = () => NS.PROTOCOLS.flatMap(p => p.commands || []);

// Anywhere that used NS.COMMANDS.find(c => c.id === id) becomes:
const cmd = NS.allCommands().find(c => c.id === id);
```

Card lookup (`c.cmd === cmdId`) continues to work because cmdId is still a number; only the lookup path changes.

### 5.2 Config import (v1 → v2)

On boot or import, detect legacy format:

```js
// v1 detection: NS.COMMANDS exists as a top-level array (or imported JSON has `commands` outside `protocols`)
if (Array.isArray(uc.commands) && !uc.protocols?.some(p => Array.isArray(p.commands))) {
  // v1 → v2 migration
  uc.commands.forEach(cmd => {
    const proto = uc.protocols.find(p => p.id === cmd.protocol);
    if (proto) {
      if (!Array.isArray(proto.commands)) proto.commands = [];
      proto.commands.push({
        id: cmd.id, name: cmd.name, direction: cmd.direction,
        frameType: cmd.frameType || 'query', cadence: cmd.cadence || 0,
        expectResponse: cmd.expectResponse,
        dataFields: (cmd.dataFields || []).map(name => {
          // Resolve type + default from global DATA_FIELDS
          const fieldDef = (uc.dataFields || []).find(f => f.name === name);
          return fieldDef || { name, type: 'u16', default: '0x0000' };
        })
      });
    }
  });
  // Drop the now-redundant top-level arrays
  delete uc.dataFields;
  delete uc.commands;
  // v2 config: data is now self-describing
  config._migratedFrom = 'v1';
}
```

Toast notification on migration: "已从 v1 配置自动迁移 (X 条命令归并到协议)".

### 5.3 Frame template: cmd field removal

Old protocol `fields[]` may include a `type: 'cmd'` field (one of header/addr/cmd/length/data/crc/tail). New model removes this — `cmd.id` is the source of truth.

Migration: if a v1 protocol has a `cmd` field, drop it from the field template. The CRC range / length calculations must still work without it (CRC range selection already excludes the `crc` field, not `cmd`; verify this is correct).

### 5.4 Removed modal cleanup

Delete these modals from HTML: `dh-cmd-config`, `dh-card-config`, `dh-alerts`, `dh-ie`. Keep `dh-card-edit`; its functionality can be reused as the "edit card" sub-modal launched from the Cards tab, or merged into the Cards tab's detail panel — implementation plan will choose based on screen real estate.

Remove toolbar buttons: `dh-open-cmd-config`, `dh-open-card-config`, `dh-open-alerts`, `dh-open-import-export`.

---

## 6. Implementation Plan (high-level)

This is the high-level shape. The detailed step-by-step plan (2-5 minute granularity) is written by the `writing-plans` skill after this spec is approved.

### Phase 1: Data model + icon utility (~1h)

1. Add `NS.DATA_TYPES` (type library, 6 entries).
2. Migrate `_defaultProtocols()` to nest `commands[]` with inline `dataFields[]`.
3. Remove `NS.DATA_FIELDS` top-level array.
4. Add `NS.allCommands()` helper.
5. Add `icon(name, size)` helper at top of namespace, with `ICONS` map (~30 Lucide icons).
6. Replace 30+ existing emoji/text icons in toolbar + modals with `data-svg="..."` + `icon()` calls.

### Phase 2: New Protocol wizard with Custom kind (~1.5h)

1. Implement `NS.openNewProtocolWizard()` — 3-step modal with state machine.
2. Wizard step 1: render 9 kind cards (8 + Custom), allow selection.
3. Wizard step 2: form (id, name, byteOrder, CRC).
4. Wizard step 3: render field table from `KIND_DEFAULTS[kind]`. For `Custom`, start empty.
5. Add field / delete field / reorder / edit. Live frame preview at bottom.
6. On finish: append to `NS.PROTOCOLS`, set as active, switch to Protocols tab.

### Phase 3: New Command modal (~1h)

1. Implement `NS.openNewCommandModal(protocolId)`.
2. Form (id, name, direction, frameType, cadence, expectResponse, remark).
3. Inline data fields editor: add/remove/reorder rows; auto-compute total bytes.
4. On save: append to `proto.commands[]`.

### Phase 4: Config Center modal + 5 tabs (~2.5h)

1. Implement `NS.openConfigCenter()`.
2. Tab switching logic (5 tabs).
3. Tab 1 协议: render protocol picker + frame template table (read-only-ish; edit via row click or "edit in wizard" button).
4. Tab 2 命令: render command table, inline edit/delete.
5. Tab 3 卡片: render card table, inline edit/delete, "edit" opens a sub-modal reusing `openCardEdit`.
6. Tab 4 告警: render rules auto-derived from `cards` (where `range` is set), plus `[↻ 从卡片重建]` and `[+ 手动添加]`.
7. Tab 5 导入/导出: 2 panes reusing `NS.exportConfig()` / `NS.importConfig()`. Danger zone for reset.

### Phase 5: Guided tour (~1h)

1. Add `NS.startGuidedTour()` that mounts an overlay with 4 steps.
2. Tour state: current step (1-4), progress dots, prev/next/skip.
3. Highlight target via `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` + 2px accent border.
4. No auto-trigger, no localStorage. 🎓 button restarts from step 1.

### Phase 6: Migration + cleanup (~0.5h)

1. v1 config import migration (per §5.2).
2. Delete 4 old modals (HTML + JS render functions).
3. Delete 4 toolbar buttons.
4. Migrate all `NS.COMMANDS` lookups to `NS.allCommands()`.

### Phase 7: e2e verification (~0.5h)

1. agent-browser run 6 baseline scenarios.
2. New: 5-tab switching, new protocol wizard (3 steps), new command modal, guided tour overlay, custom kind, v1 config import.

**Total estimate**: ~8h (1 working day, can fit in a single sprint with review/buffer).

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Frame template without `cmd` field breaks `NS.buildFrame` for legacy protocol JSONs | Verify migration logic in §5.3 covers all 8 kinds; write a unit test that builds a frame for each pre-migration protocol kind |
| Cards reference `cmd` by id; if cmdId is reused across protocols (e.g., 0x03 in both BMS and Modbus), card lookup becomes ambiguous | `NS.allCommands().find(c => c.id === card.cmd)` returns the first match. Add a `card.protocol` field (optional, defaults to first match) for unambiguous lookup. Migration populates it from `card.fromOtherCmd` reverse-lookup or first match. |
| Custom kind has no frame template; if user saves without any field, `NS.buildFrame` errors out | Validation: step 3 save blocked until ≥1 field added. Toast: "请至少添加一个字段" |
| Guided tour target elements don't exist in all states (e.g., user has 0 protocols) | Tour gracefully no-ops or skips: "完成引导" if no protocols |
| Lucide icon path copy-paste introduces subtle stroke-width mismatch | Centralize all 30 icons in a single `ICONS` map; no inline `<svg>` paths in modals |
| `NS.exportConfig` format change breaks v1 importers | Bump `version: 1 → 2` in export; v1 detection + migration on import; document in user guide |

---

## 8. Open Questions (deferred to implementation)

These do not block spec approval. Implementation plan will resolve them.

1. **Card-cmd ambiguity**: should `card.cmd` become `{protoId, cmdId}` composite? Or keep flat with `card.protocol` separate field?
2. **Per-field byte order in `cmd.dataFields[]`**: does it inherit from protocol, or set per-field?
3. **Tour animation**: slide-in tooltip vs fade-in? (visual polish, not architectural)
4. **Custom kind validation rules**: can `cmd` field be missing? (No — `NS.buildFrame` needs it.)

---

## 9. Acceptance Criteria

The spec is considered "done" when:

- [x] All 4 user feedback items from v3 → v4 are addressed (主题 removed, tabs no ①②③④, guided tour manual trigger, Custom kind added)
- [ ] User reviews and approves this spec
- [ ] `writing-plans` skill produces a step-by-step implementation plan
- [ ] User approves the implementation plan
- [ ] Code changes are made and pass agent-browser e2e (6 baseline + 7 new scenarios)
- [ ] v1 config import migration tested with a real v1 export file

---

## 10. References

- Previews: `docs/design/protocol-multi-command-{v1,v2,v3,v4}-preview.html`
- Architecture: `docs/reference/ARCHITECTURE.md`
- Protocol kinds: `docs/reference/PROTOCOL-TEMPLATES.md`
- CRC reference: `docs/reference/CRC-REFERENCE.md`
- SerialCube dev workflow: `.minimax/skills/serialcube-workflow/SKILL.md`
- Brainstorming skill (this spec was produced via): `.minimax/skills/brainstorming/SKILL.md`
