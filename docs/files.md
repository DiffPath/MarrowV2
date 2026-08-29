# Per-file notes (full)

> The original long-form `## Files` section, preserved verbatim when the root `CLAUDE.md` was
> condensed to a table. Nothing here is superseded — the table in the root is a summary of this.
> Read the entry for the file you are about to work on.


**Shared shell** (template-agnostic; never edited per-template):

- **`Template.css`** — two sections: the app shell, and generic primitives kept for
  rebuilding forms (`.flex`, `.lowerGrid`, `.select`, `.textBox`, `.saveButton`,
  checkbox/radio row spacing).
- **`Template.js`** — the shell controller: builds the drawer links, tab bars, panel
  bodies, and copy buttons from the global `templateConfig`; owns `headerObject`, the
  tab switcher, the nav drawer, and `showAlert`.

**Per-template pairs** (one entry page + one config each):

- **`Marrow.html` + `MarrowConfig.js`** — the bone marrow template (the primary one).
- **`Liver.html` + `LiverConfig.js`** — a basic worked example.

**Marrow content scripts** (loaded after `Template.js`, in this order):

- **`MarrowSettings.js`** — the settings **store**, plus the Miscellaneous panel's own content.
  localStorage persistence (`MARROW_SETTINGS_KEY`): controls carrying class `setting` are
  captured/restored by id; read one with `getSetting(id, fallback)`. Committed by a Save button,
  never on change. Other files render their own settings blocks against this store — see
  `renderSettings()` in `MarrowCounter.js` — and must mind the load-order trap below.
- **`MarrowSave.js`** — the case **store**: the autosave draft, the named saves, and the Save
  page's content. Sits here in the load order, before every tab, because it defines
  `registerCaseState({ id, capture, restore, rebuild, settle })` and a tab calls that at its own
  script scope exactly as it calls `registerReportSection()`. It runs nothing at load — the
  bootstrap is a `setTimeout(0)` off `DOMContentLoaded`, which is the only ordering guaranteed to
  come after `buildReportSections()` and the counters' final `render()`.
  **One draft per case, rewritten in place** (`marrowDraftBM:<caseId>`), debounced and then
  deferred to idle; named saves are a separate store (`marrowCasesBM`) written only by the Save
  button. The `caseId` lives in sessionStorage — per tab, surviving a reload — and a
  ping/answer handshake over the `storage` event forks it when a tab is *duplicated*, so two
  windows can never overwrite each other's marrow. Capture is by id under `#inputPanel`, skipping
  `.noSave` and `.setting`; restore is a fixed point (write, let the lists rebuild, repeat) rather
  than a dependency graph, so it knows nothing about descriptors or stains.
  See [save.md](save.md).
- **`MarrowForm.js`** — the shared form vocabulary: `chipHTML()`, `addCommas()`,
  `settingsPanelSave()`, and the **toggle group** / **stop chip** behaviours every tab's chips are
  built on. Knows no tab, cell or report string. **Must load before `MarrowReport.js`** — see the
  listener-order note below.
- **`MarrowDescriptors.js`** — the morphology descriptor vocabulary (`descriptorVocabulary`) and
  the machinery to render it as a growing dropdown list (`registerDescriptorGroup`,
  `descriptorListHTML`, `renderDescriptorList`) and print it (`descriptorPhrase`). Shared: Blood
  uses it five times over, the Aspirate six. **One table for every tab, keyed by descriptor rather
  than by group** — the aspirate added only 16 words to it, because its lymphocyte list is blood's
  entire (all ten) and its myeloid list shares four of five with the neutrophil list, adding
  `monolobatedForms` and dropping `toxicChanges` (a blood finding, not a marrow one).
  `hypolobatedForms` is *one* descriptor offered to three lineages; keyed by group it would be
  three entries free to drift into three different sentences. A group is a **choice of keys**, not
  a copy of the words — which is why the lists can overlap without agreeing.
- **`MarrowReport.js`** — cross-tab orchestration: the report section registry,
  `fillReport()`, the delegated `.form` listener, and the template-type highlight cue.
- **`MarrowCounter.js`** — the differential counter **engine**. A shared library, not a tab:
  it declares no cell data, mounts nothing *of its own accord*, and registers no report
  section — an instance renders its pad into `config.panelId` and its settings block into
  `config.settingsPanelId`, so the engine knows no Marrow id. (The pad does **not** own its tab:
  Blood puts a findings form beneath it, and `draw()` replaces its mount's innerHTML wholesale.
  Ids *inside* the pad still come from `config.id`.) One instance per specimen via
  `createCounter(config)` — Blood and the Aspirate today. Only needs to load before its instances.
- **`MarrowCounterSounds.js`** — the previous app's six counter sounds (high/med/low/blast clicks,
  the hundred and completion figures), **base64-embedded and GENERATED** — regeneration recipe in
  its header. Embedded rather than vendored as mp3 files because the app must work from `file://`
  offline, where `fetch()` of a local file is refused. Loads before `MarrowCounter.js`, which
  consumes it and treats it as **optional**: drop the script tag and the counter keeps its
  synthesized sounds and simply stops offering the "Classic clicks" scheme.
- **`MarrowSpec.js`** — the Specimen tab. **The model for the other six tabs**: data table
  at the top, `renderSpecPanel()` builds the form from it, `fillSpecimen()` reads the DOM
  back into prose, `registerReportSection()` at the bottom.
- **`MarrowCBC.js`** — parses the `#pbCBC` Epic paste and renders the most recent result set
  as a table. Only whitelisted names in `cbcComponents` are read, which is what keeps order
  numbers, comments, and demographics out of the results. Read results with `cbcResult(name)` /
  `cbcValue(name)` / `cbcFlagged(name, flag)`; it fires a **`cbcParsed`** event so a tab can fill
  its own controls in without this file knowing any tab exists.
- **`MarrowBlood.js`** — the Blood tab (`#pbPanel`), in two halves: the counter instance
  (`bloodCells` + `bloodCounterConfig` handed to `createCounter` — the model for instantiating
  one, including the load-bearing bootstrap order `renderBloodPanel` → `renderSettings` →
  `applySettings` → `render`), and the findings form (haemoglobin through plasma cells) built
  from its own tables and read back by `fillBlood()`. It registers **two** sections: `pb` (the
  prose) and `pbDiff` (the differential table).
- **Report sections combine two specimens under one dynamic heading.** The aspirate section
  (`fillAspirateSection`) prints the aspirate smear and the touch preparation together — heading
  "Bone Marrow Aspirate", "…/Touch Preparation", or "Touch Preparation" depending on which parts
  speak — and the core section (`fillCoreSection`) does the same for the core biopsy and the particle
  clot. The heading is emitted *inside* the combined fill (as a `REPORT_HEADING` paragraph), so an
  empty section still takes its heading down with it; there is no separate `touch` or `clot`
  registration. This matches how the original grouped them (`../Marrow/MarrowText.js:1033-1078`). The
  differential table (`aspDiff`) stays its own section, ahead of the aspirate prose.
- **`MarrowAsp.js`** — the Aspirate tab (`#aspPanel`), the same two halves and deliberately the
  same shape, plus the three things blood has no use for: an **M:E ratio**, **pooled report rows**,
  and NRBCs that mean erythroid precursors. Registers **two** sections: `aspDiff` (the differential
  table) and `asp` (the smear + touch-prep prose, combined under one dynamic heading — see above).
  Its settings block (the M:E ratio at which a predominance is called) lands in
  `#aspSettingsPanel`; its *counter* settings land beside blood's in `#differentialSettingsPanel`,
  which is the arrangement `settingsPanelId` exists for. The erythroid, myeloid, lymphoid and
  megakaryocyte rows are all the same **Low/Normal/High + severity + morphology** shape, built by
  one `aspLineageRow()` helper — see the count-language note below.
- **`MarrowCore.js`** — the Core biopsy tab (`#corePanel`). **No counter** — a core is a section,
  not a smear — so it is findings only: adequacy, cellularity, myeloid/erythroid precursors,
  megakaryocytes, lymphocyte distribution, particle clot and its own lymphocyte distribution.
  Registers **one** section, `core`, whose
  fill combines the core-biopsy and particle-clot prose under one dynamic heading (see above). Its
  cellularity autofill and thresholds live in `#coreSettingsPanel`. See the core notes below for its
  deviations from the original.
- **`MarrowStains.js`** — the Stains tab (`#stainPanel`). Five growing lists — special stains on the
  aspirate, core and clot, immunostains on the core and clot — over one `stainVocabulary` keyed by
  stain. Registers **two** sections, `specialStains` and `immunostains`, which print **tables**
  rather than prose. The only tab whose output is not sentences, and the one that owns the report's
  table styling. See the stains notes below.
- **`MarrowAncillary.js`** — the Ancillary tab (`#ancillaryPanel`), **currently a placeholder**: a
  cytogenetics import box and an NGS one, each under its own **status row** (Pending | Performed |
  Not performed) that pasting into the box answers for you, plus the variant list. It still parses
  the clinically significant variants and their VAFs out of a pasted NGS report and still lets them
  be typed by hand. The **BCR::ABL1** row, the **Clinical** block (sex, splenomegaly, LDH, serum EPO)
  and the **History** block are off screen, as is the cytogenetic abnormality list — every reader
  survives and answers the "nobody has said" value, so nothing throws and nothing leaves the
  differential; those entities simply lose their genetic points and compete on morphology, with an
  unanswered gate landing them in `pending`, which `DX_TIER` ranks level with `supported`.
  **Registers no report section** — `ngsVariants()`, `ancStudyStatus()`,
  `ancCytoFinding()`, `ancKaryotypeText()`, `ancBcrAbl()` and `ancClinical()` are the seams it exists
  to feed. See the ancillary notes below.
- **`MarrowFindings.js`** — `marrowFindings()`, one normalised **three-valued** view of the whole
  case, composed from every tab's public seam. Deliberately the ONE file that knows other tabs'
  group names, so the diagnosis rules never touch the DOM. Registers nothing.
- **`MarrowDx*.js`** (nine files) — the Diagnosis tab (`#diagnosisPanel`). A gated, scored suggestion
  engine over `marrowFindings()`, with the WHO-HAEM5 / ICC 2022 rule set — MDS, the boundary states,
  the eight **MPN** entities, the MDS/MPN overlap, and the twelve **AML** candidates. Registers
  **one** section, `dxCommentSection` (`after: 'spec'`, `live: true`, heading `Comment`) — an
  editable comment in the report, never a suggestion. See the diagnosis notes below.

  It was one ~4000-line file until it was **split by disease family**, on the reasoning that an
  entity's criteria box is the unit of work and should be the unit of reading — one file now answers
  one pasted box. `MarrowDxKernel.js` (three-valued helpers, shared gates and thresholds, the shared
  formatters, and `dxRules` declared **empty**), then `MarrowDxMds.js`, `MarrowDxMpn.js`,
  `MarrowDxMdsMpn.js`, `MarrowDxAml.js` and `MarrowDxCh.js` each pushing their own helpers *and*
  rules, then `MarrowDxEngine.js` (scoring, ranking, comment assembly) and `MarrowDxPanel.js`
  (render, views, comment box). **Script order in `Marrow.html` is the rule table's order**, since
  each family appends; the three ordering constraints are stated there. The split moved no logic —
  four trailing commas went where the array literal became `push()` calls, and `dxLower` / `dxPct` /
  `dxNameLine` were hoisted to the kernel because four families use them.

