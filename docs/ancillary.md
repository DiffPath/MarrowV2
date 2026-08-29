# The Ancillary tab (`MarrowAncillary.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. NGS parsing, cytogenetics, study status, the Clinical block.

## What is on screen now

**NGS first (status, paste box, the variant list the paste fills), then cytogenetics (status,
paste box, and the growing list of disease-defining abnormalities)** — the block order is the
user's. The abnormality list was the first parked block restored; everything else parked below
stays off screen.

**The abnormality list is a growing dropdown over `ancAbnVocabulary` in `ancAbnOrder`** —
`renderAncAbnList()` / `ancAbnSelectHTML()`, rebuilt whole from the `#ancillaryPanel` change
listener (which runs before `#inputPanel`'s `fillReport()`, per the binding note below). Every
behaviour promised in the parked notes holds: an abnormality already named is offered by no other
select, one empty select always waits, and removal is setting a row back to "—". The readers
(`ancAbnNamed`, `ancCytoFinding`, `ancAbnAny`, `ancAbnPhrase`) resumed answering with no change of
their own, exactly as designed — verified end to end: naming `complex` beside `del5q` puts MDS-5q
in `excluded` (its ≤1-additional-abnormality criterion) and lifts AML-MR on myelodysplasia-related
cytogenetics.

`MarrowFindings.js` still asks for everything that was taken off screen, and every reader still
answers — with the "nobody has said" value, because `toggleGroupValue()` on a group with no chips
returns `''` and `ancAbnNamed()` on a missing list returns `[]`. Nothing throws, and
`marrowFindings()` runs clean.

**No candidate leaves the differential for it, and expecting otherwise is the checklist misreading
this engine exists to refuse.** The app suggests comments a pathologist chooses between; it never
required the form to be complete. An unanswered `requires` lands a rule in `pending` or `incomplete`,
and `DX_TIER` ranks those **level with `supported`** — candidates rank on evidence, with completeness
worth `DX_CONFIRMED_BONUS`, one point. Verified against the running engine: a CML-shaped marrow with
no genetics at all anywhere (WBC 62, 7% basophils, eosinophilia, circulating immature granulocytes,
increased megakaryocytes) ranks **CML first at 11 points**, bucket `pending`, and writes *"…the
findings would be best classified as chronic myeloid leukemia, BCR::ABL1-positive. Final
classification will depend on the results of cytogenetic and molecular studies, which are
outstanding."* The conditional register is the whole point: the comment cannot assert what the
ranking has not proven, and it does not have to in order to be the right comment.

**What is genuinely lost is narrower**: a finding nobody can enter cannot score. The +8 for a
demonstrated BCR::ABL1, PV's erythropoietin and its sex-specific thresholds, PMF's minor criteria and
every point coming off a named karyotype abnormality are unavailable, so those entities compete on
morphology alone. The readers, `ancAbnVocabulary` and `ancAbnOrder` all stay — restoring any block is
a row in `renderAncillaryPanel()` and nothing else. (The vocabulary could not leave in any case:
`MarrowDxAml.js` reads it at load time to build its rules.)

**Pasting answers the status.** A report in a box *is* the study having resulted, so `Performed` is
set for you and `Pending` / `Not performed` are the two left to click. `ancAutoPerformed()` holds two
rules, both about not overruling a person:

- **It fires only on the empty → filled transition**, not per keystroke. Paste into a box you have
  deliberately marked Pending and the next character typed would otherwise snap it back to Performed,
  repeatedly, with nothing on screen saying why.
- **It takes back only what it set.** `data-autoStatus` marks a chip the function chose, so emptying
  the box clears it again — but a `Performed` you clicked yourself survives, because typing the
  variants in by hand without pasting anything is an ordinary way to work. Clicking any status chip
  drops the flag.

The chip's **value is still `resulted`**, which is what `MarrowFindings.js` compares against; only the
label reads `Performed`. Label and value are separate here for the usual reason.

**No report section is registered** — the comment and addendum text these variants will feed is later
work. What that work reads is **`ngsVariants()`**, which returns `{ gene, variant, vaf }` for every
non-empty row, parsed and typed alike, in the order shown. The rows already carry `class="form"`, so
that section will be live from its first keystroke.

## Parked: the blocks still off screen

Their code is gone from the render only; the rationale below is what makes putting them back a
five-minute job rather than a re-derivation, which is why it is kept in full. (The cytogenetic
abnormality list was restored exactly this way — its design notes stay here because they document
the running code.)

**The cytogenetic abnormalities are a growing dropdown over `ancAbnVocabulary`, not chips.** Four
checkboxes were right while the engine asked only MDS's questions; the AML entities are almost all
defined by a fusion, and nineteen chips would be three rows of the panel forever, named or none —
the calculation the dropdown idiom exists to lose. **One table keyed by abnormality**, because the
MDS-defining and AML-defining sets are one question ("what did the karyotype show") and several
entries sit in both answers at once: del(5q) is MDS-5q's defining lesion *and* a
myelodysplasia-related abnormality, and keyed by category it would be two entries free to drift.

It is the descriptor list's *mechanism* deliberately **reimplemented rather than borrowed** — same
line the stains tab draws. A cytogenetic abnormality is no more a descriptor than a stain is;
registering it as a descriptor group would put it one edit away from being pooled into a morphology
sentence by `descriptorPhrase()`. What carries over is every *behaviour*: an abnormality already
named is offered by no other select, the list is rebuilt whole so option lists need no bookkeeping,
one empty select always waits, and **removal is setting a row back to "—"** with no remove button.

- **`ancCytoFinding()` takes a vocabulary KEY, not an element id.** With a list there is no
  per-abnormality element for an id to name, and keeping the old `ancDel5q` spelling would have been
  a name for something that no longer exists.
- **`label` is the scan form, `phrase` the report form** — the app's usual split. `Complex (≥3)` is a
  chip; `a complex karyotype (≥3 abnormalities)` is a sentence, and a comment built from the label
  printed nested parentheses.
- **An entry carries what can be recorded, never what it MEANS.** Which abnormalities are
  myelodysplasia-related and which define an AML type are clinical judgements living in
  `MarrowFindings.js` beside `dysplasticDescriptors` — exactly as the descriptor vocabulary holds the
  words while Findings holds which are dysplasia. Adding an abnormality here is therefore inert until
  something there names it, which is the safe direction for the dependency to run.
- **The rebuild listener binds on `#ancillaryPanel`, not `#inputPanel`.** This file loads *after*
  `MarrowReport.js`, so an outer binding would be added second and fire second, and `fillReport()`
  would read the list one render stale. Same reason `.stainSelect` binds on `#stainPanel`. (That
  `#ancillaryPanel` `change` listener still exists — it now clears the auto-status flag — so restoring
  the list means adding a branch to it, not adding a listener.)
- **`--abnWidth` is 197px, measured in real Chrome.** The estimate that preceded it said 224 — 27px
  of dead space, and the third time arithmetic has been wrong in this codebase. Re-measure before
  adding a longer label; a closed select ellipsises silently and these labels differ at the END,
  where the fusion name is.

**History is its own block, not two more Clinical rows.** Sex, spleen, LDH and EPO are the patient's
*current state*; prior cytotoxic therapy and an antecedent neoplasm are things that *happened*, and
they act differently — each is a qualifier or a classifier rather than a criterion to be weighed.
**Neither is the same as the `historyMDS` template type**: that says why the case was sent and is
capped at one ranking point precisely so it can never move a gate, where this asserts the disease
existed and is allowed to. An antecedent **MPN** is recorded but read only as context — WHO's
criterion names MDS and MDS/MPN only, and blast crisis of an established MPN is a different event.

**BCR::ABL1 is one row with FOUR answers** — Positive | Negative | Pending | Not performed. It is not
on the NGS panel (it is a fusion, found by FISH or RT-PCR), so nothing above can report it, and it is
the most consequential gate in the myeloid space: positive makes the case CML, and its **absence** is
a requirement of PV, ET and PMF. The result is one bit, so the result and the study status are **one
question in one group** — splitting them into a status group plus a result group would be two chips to
say what one says and would let the two disagree. It sits in *Studies* rather than *Cytogenetics*
because Pending belongs to a study and the abnormality chips have no pending state to sit beside.
`ancBcrAbl()` collapses it to the engine's tri-state; Pending and Not performed both become `null`,
and `dxPendingStudies()` reads the raw value when it needs to say which is which.

**The Clinical block is required criteria, not scope creep.** Sex, palpable splenomegaly, LDH and
serum EPO look like a different specialty's fields until you read the criteria: **subnormal EPO is the
only minor criterion for PV**, and PMF requires all three major criteria *plus at least one minor* —
anaemia, leucocytosis ≥11, splenomegaly, LDH, leukoerythroblastosis. Without these four controls
neither entity can ever leave `pending`, whatever the marrow shows.

- **Sex is typed, not parsed.** PV's thresholds are sex-specific, and `MarrowCBC.js` reads the paste
  for demographics exactly once — for the DOB, reduced to an integer age on the spot — precisely so no
  demographic field lives anywhere. Sex is not an identifier under safe harbour and is ordinary
  saveable state, but it is not worth a second exception to that rule to save one click.
- **With no sex recorded, `findingErythrocytosis()` tests BOTH thresholds and answers only when they
  agree.** Hb 19.4 is erythrocytosis whoever the patient is; Hb 16.2 genuinely depends on the answer
  nobody gave, and stays `null`. Same move as `dxBandAtLeast()` on a straddling reticulin, for the
  same reason: rounding it either way invents a fact.
- **LDH and EPO are recorded as above/below/within the lab's own range, never as numbers.** The
  criteria are written that way, the range differs by assay and lab, and a raw number would invite the
  app to own a cutoff it has no business owning. (This used to cite the blood thresholds shipping
  blank as the same move. They no longer do — see [blood.md](blood.md) — and the two cases are not
  alike: a blood threshold decides an *adjective* in the microscopic description, where these decide
  whether a diagnostic criterion is met. A default adjective is editable and visible in the report; a
  default criterion would be the engine inventing a diagnosis.)

## NGS parsing

**PHI: both paste boxes are `noSave`**, like `#pbCBC`. An NGS report carries the accession, the
collection date and the clinical indication, and a cytogenetics report pasted whole carries the same
— which is why `#ancIscn` gained the marker when it stopped being a hand-typed ISCN field and became
an import box. The raw text lives in those textareas and **nowhere else** — it is never copied into a
module variable, so a future case-save has nothing here to pick up by accident. The variants parsed
out of the NGS box are findings and are ordinary saveable state.

**Only the "Variants of known or potential clinical significance" table is read.** That is the ask,
and it is also the honest boundary: the report's own second table is headed "of Unknown
Significance", so pulling those in would put words in the lab's mouth. `NGS_SECTION_START` /
`NGS_SECTION_END` are where they would be added.

**A record starts at a bare gene symbol and runs to the next one**, because the table arrives with
each variant spread over three lines (gene / protein + transcript / cDNA + VAF). Reading it that way
rather than by line count is what makes it survive the same table pasted flat — verified against the
real report both as pasted and tab-separated, plus a flattened layout, a non-parenthesised `p.` form,
a cDNA-only variant, a decimal VAF and the hyphenated `H1-4`. `NGS_GENE` is strict about what it
will *not* match: the transcript `NM_003016.4`, `p.(P95L)`, `c.284C>T` and the word `None` all fail
it. The VAF is read as "the first thing with a percent sign", never "the next number", which is what
keeps the transcript version out of it.

**Two rules make paste and hand-entry coexist**, and they are the whole design:
- **Editing a row makes it yours** (`data-source` flips to `manual`). A re-paste replaces what it
  parsed last time and leaves your rows alone.
- **A variant you have claimed is not re-added from the report.** Without this, correcting a parsed
  VAF and re-pasting left two rows for the one variant — the lab's and yours. Keyed on gene + change,
  never the VAF, since a corrected VAF is the commonest reason a row was touched at all.

**The list grows and shrinks in place, never by re-rendering.** Its rows are free-text inputs, so the
descriptor/stain rebuild-whole idiom would move the caret out of the field being typed in. Only a
paste rebuilds it, where the caret is in the paste box. **The gene is upper-cased in the reader, not
in the input** — rewriting a box on every keystroke fights the caret, but leaving it alone let the
screen show `JAK2` (`text-transform`) while the value stayed `jak2` and a comment built from it would
print the typo.

**The manual gene field autocompletes from the panel roster** (`NGS_GENE_PANEL`, 203 genes) via a
native `<datalist>` — the browser does the type-to-filter matching, so there is no dropdown to build
or keep open. It is **not a whitelist**: the field still accepts anything, because a variant from a
different assay or a gene added to the panel later must not be un-typeable. The `<datalist>` renders
**once, outside `#ngsList`**, since `renderNgsRows()` replaces that container on every paste and the
gene inputs reference the list by id.

**The status line exists for one case**: a report in a layout the parser does not recognise looks
exactly like a report with no significant variants, and the pathologist has to be able to tell those
apart before trusting an empty list.

