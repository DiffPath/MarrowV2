# The peripheral blood template

> The port of the author's standing peripheral blood smear template
> (`https://diffpath.github.io/pages/pbnorthwest.html`) onto this shell. A separate page —
> `PB.html` + `PBConfig.js` — not a marrow tab. **Complete**: every finding, every report string
> and all 36 comments are ported.

## Why a separate page and not the marrow's Blood tab

They report different documents about the same specimen. The marrow's Blood tab writes a
paragraph of the **microscopic description** — *"The peripheral blood smear shows mild anemia.
There is absolute neutropenia."* This template writes a **final diagnosis**: one line per
finding, *"Microcytic hypochromic anemia (8.2 g/dL)."* — plus a **comment** assembled from a
gated list of standing paragraphs. Different register, different output, no shared fill.

## What is shared, and the naming debt

Four of the marrow's content scripts were written as libraries that declare no marrow data, and
`PB.html` loads them unchanged: `MarrowForm.js` (chips, toggle groups, stop chips),
`MarrowDescriptors.js` (the morphology vocabulary and the growing dropdown list),
`MarrowReport.js` (the section registry, `REPORT_PARAGRAPH`, the copy buttons) and
`MarrowCBC.js` (the Epic paste parser — an Epic CBC is an Epic CBC). `MarrowSettings.js` and
`MarrowSave.js` come too.

**The `Marrow` prefix on those six is now historical.** Renaming them is a mechanical follow-up
worth doing once the page settles; it touches every `<script>` line and nothing else.

Three things had to be generalised for a second real template, all config-driven with the
marrow's current behaviour as the fallback:

| config key | replaces | why |
|---|---|---|
| `storeScope` | the hard-coded `…BM` storage keys | see below |
| `copyClaims` | `COPY_CLAIMED` in MarrowReport.js | the section ids are the template's own |
| `newButton` | the hard-coded `newMarrowBtn` + its confirm string | a blood case is not a marrow |

### storeScope

Every persistence key now ends in `templateConfig.storeScope` — `marrowSettingsBM` /
`marrowCasesBM` / `marrowDraftBM:` for the marrow, `…PB` for this page. **Without it a
peripheral blood case would appear in the marrow's save list and the two pages would fight over
one autosave draft slot.** `'BM'` reproduces the marrow's original key strings exactly, so no
existing settings or drafts are orphaned.

### The dependency this exposed

`registerCaseState()` lives in `MarrowSave.js`, and the shared libraries call it at script
scope. A page that loaded `MarrowDescriptors.js` **without** `MarrowSave.js` threw there and
silently lost everything below the throw — including the delegated `change` listener that
rebuilds the descriptor lists. Load them together; the scoping above is what makes that safe.

## The source, section by section

Line numbers are into `pbnorthwest.html`.

| block | source | status |
|---|---|---|
| Reason / requested-by header | 1735-1739 | **dropped** — see below |
| CBC paste + table | 1464-1538 | **done** — shared `MarrowCBC.js`, mounted by `PBClinical.js` |
| RBC1-RBC8 findings + text | 487-560, 1775-1915 | **done** — `PBRbc.js` |
| WBC1-WBC12 findings + text | 561-650, 1916-2200 | **done** — `PBWbc.js` |
| PLT findings + text | 651-718, 2203-2302 | **done** — `PBPlt.js` |
| 36 gated comments | 719-909, 2320-2519 | **done** — `PBComment.js` |
| Settings | the settings table | **done** for every value that prints |

### The comment engine is the interesting part

36 standing paragraphs — `RBCC1`-`RBCC14`, `WBCC1`-`WBCC13`, `PLTC1`-`PLTC8`, `HEMC1` — each
revealed only when the findings make it relevant (`RBCC8`, *"The presence of schistocytes raises
the possibility of a microangiopathic hemolysis"*, appears once any schistocyte is named), then
**multi-selected** and concatenated into the comment.

That is the marrow's Diagnosis tab in miniature: suggestions gated by a findings snapshot,
chosen by the pathologist, written into the report comment. The one structural difference is that
these are multi-select where a diagnosis is one-of.

**Each comment carries one `when()` predicate.** The original expressed the same behaviour as
~130 `show()`/`hide()` calls threaded through `fillFinal`'s branches, which made the answer
depend on the order the branches happened to run in — and in one place they genuinely disagree:
naming bite cells shows `RBCC10`, then the normocytic branch hides it again, so bite cells plus a
normocytic anemia offered no Heinz body comment at all. Declared gating asks the question once
and cannot answer it twice; that bug is the deviation it produces (`RBCC10` now shows on any
anemia).

Three properties worth keeping when this is edited:

- **Rows are rendered once and shown/hidden in place**, never rebuilt, so a tick survives every
  re-render for free.
- **A ticked comment stays visible** even when the finding that revealed it is taken back —
  hiding it would silently drop a chosen sentence out of the report.
- **`WBCC7` has no gate**, and that is faithful: it appears in the source's `showComments()` and
  nowhere else, so Show all is the only way to it. `HEMC1` is the opposite — no gate and no Show
  all, always on screen — and says so with an explicit `when: () => true` so the two cannot be
  mistaken for each other.

## Deviations from the source

Carried in each file's header; the standing ones so far:

- **The anemia row is a toggle group**, so `***Incompatible RBC Characteristics***` cannot
  happen. The original made microcytic/macrocytic/normocytic three unguarded checkboxes,
  detected the impossible state afterwards, and printed that string *into the report*.
  Exclusivity by construction is this app's answer (see MarrowForm.js), and it also makes the
  finding clearable, which three checkboxes were and a radio group would not be.
- **Hypochromic is one chip, not two.** `hypochromicNormo` and `hypochromicMicro` attached the
  qualifier to the row rather than to the answer, so setting it and then switching anemia type
  silently dropped it.
- **The aniso list is the shared descriptor machinery**, not a bespoke `createAniso()` over
  eighteen `<select>`s. Same words, same "including" phrasing, and qualifier pooling —
  *"occasional schistocytes and target cells"* rather than the qualifier written twice. Two
  words the marrow's list lacked (`macrocytes`, `microcytes`) went into the shared vocabulary.
- **Blocks are paragraphs, not `<br><br>`.** The original separated lineages with literal
  breaks; here each is a `REPORT_PARAGRAPH`, which survives the clipboard into Epic where a pair
  of `<br>`s does not (see the copy notes in MarrowReport.js).
- **Monocytosis / eosinophilia / basophilia autofill from the CBC's High FLAG**, where the
  original compared the value to the reference range Epic printed beside it (`cbcArray[i][3]`).
  This app's parser keeps the flag and not the range; it is the same judgement by the same lab,
  and it survives a range the parser could not read.
- **The platelet reference range is a setting** (150-450 default), for the same reason: the
  mild/marked multipliers are the original's (`0.9x` / `0.2x` low, `1.1x` / `2x` high) but the
  range they multiply came from the paste. This is a number the app now owns and did not before,
  which is why it is editable.
- **The blast line loses a space.** The original built `"Blasts are present " + "(5%) " + ". See
  comment."` — a space before the full stop on every case with a percentage. Whitespace is the
  one sanctioned deviation (CLAUDE.md).
- **The reason / requested-by header is dropped**, at the author's instruction. The original
  opened the report with either a free-text reason or *"Peripheral Blood Smear Pathologist
  Interpretation Requested by: …"*; both are gone along with the `pbHeader` report section, and
  the report now opens on the CBC table. `PBClinical.js` is what remains — one textarea, which
  earns its own file only because `MarrowCBC.js` binds to `#pbCBC` at script scope and needs the
  box to exist first.

Every report string is otherwise the original's, verbatim — including the two that differ by one
word, where an adequate platelet count takes *"with unremarkable morphology"* and an abnormal one
takes *"with unremarkable platelet morphology"*.

## Not yet wired

- **No counter.** The original has none either; if a manual differential is wanted,
  `MarrowCounter.js` is a library and `bloodCounterConfig` is the worked example.
- **No reference section.** `MarrowRef*.js` is marrow content; the book icon opens an empty
  panel on this page.
- **Autosave works** (the save layer is loaded and scoped), but nothing on this page has been
  exercised against a reload yet.
