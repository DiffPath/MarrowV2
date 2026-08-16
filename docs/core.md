# The Core biopsy tab (`MarrowCore.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Adequacy, the reworded rows, the age-based cellularity autofill, the particle clot.

Findings only, no counter. Most of it ports cleanly and is oracle-verified against the original's
`fillCore`/`fillClot` (`scratchpad/coreOracle.js`, 29 checks). Three things are worth knowing:

**Adequacy carries a verb, not a qualifier.** Each adequacy descriptor prints with `shows` or `is`
baked in (`coreVerb` in the vocabulary), and `coreAdequacyPhrase()` groups the selected ones by that
verb — "is fragmented and small", "shows a crush artifact and is fragmented". Two verbs exist, so at
most two groups, joined with "and". `article: true` marks the artifacts that take a/an, resolved
against the noun (crush → a, aspiration → an). This is where a **bug is fixed**: the original printed
"**a** shows crush artifact", the article landing before the verb (`../Marrow/MarrowText.js:40-60`) —
ungrammatical and unambiguously meant to be "shows a crush artifact". `scratchpad/coreExtras.js`
asserts the fixed form directly (no oracle — the original is wrong).

**The lymphocyte row has no fixed subject, and that is the point.** Every other row prints
`<subject> <verb> <descriptor list>`; the original did the same for lymphocytes ("Lymphocytes are
present as focal loose aggregates"), which forces the aggregate — the thing actually being reported —
to arrive as a predicate of the lymphocytes. A hematopathologist writes the aggregate as the subject,
so `coreLymphText()` does too, and `coreLymphFrame` in the vocabulary says which shape a descriptor
takes: `'aggregate'` makes `text` an **adjective** pooled into one "Focal paratrabecular and
multifocal lymphoid aggregates are seen.", `'sentence'` makes it the whole clause (scattered
lymphocytes have no aggregate to be the subject of; a diffuse infiltrate takes "There is"). Pooling
by frame is the same move `coreAdequacyPhrase()` makes with `coreVerb`, and it is why this group
skips `descriptorPhrase()` — that function assumes a stem to hang a list off. **Wording deviation,
findings unchanged**: the six options and their order are the original's; only the prose is new, at
the author's direction. It breaks the `fillCore` oracle for these strings — assert them directly.

**The myeloid/erythroid and megakaryocyte rows were reworded for the same reason** (same deviation
class as the lymphocytes: prose only, findings and order untouched, oracle broken for these strings).
Both were a fixed stem forcing a descriptor into a shape it doesn't fit:

- **Myeloid/erythroid print existentially, with no stem.** "Myeloid and erythroid precursors show
  left-shifted myeloid maturation" named the lineage twice, because the stem named both and the
  descriptor named one again. The lineage belongs to the finding, so the finding says it once:
  "There is left-shifted myeloid maturation." `coreMEFrame` gives two shapes — `'lineage'` descriptors
  contribute only their lineage and **pool** ("There is left-shifted myeloid and erythroid
  maturation", one finding said once rather than the same sentence twice), `'noun'` ones contribute a
  noun phrase via `descriptorNounPhrase()`. The **unremarkable sentence keeps the stem**: it names no
  lineage, nothing repeats, and it is the line the aspirate prints too. Two agreement rules are
  load-bearing and easy to get wrong: only the **first** finding's number picks is/are (that is how
  the existential agrees over a mixed list), and the lineage pool is **always singular** however many
  lineages it names, because "maturation" is a mass noun.
- **Megakaryocytes take a verb per descriptor kind.** A population *includes* micromegakaryocytes (a
  kind of cell) but *shows* widely separated nuclear lobes (a feature of one); the original used
  "show" for both and so said megakaryocytes show micromegakaryocytes. `isForm` in the vocabulary
  marks the cell-kind descriptors and `coreMegText()` groups by the verb it implies, exactly as
  `coreAdequacyPhrase()` groups by `coreVerb`. `isForm` is a property of the **descriptor**, not of
  the core — `hypolobatedForms` carries it for every lineage offered it. When a clause is itself a
  list the two clauses join with **", and"**: a bare "and" would be the third in a row and the whole
  thing reads as one list.

**The megakaryocyte COUNT** — Low | Normal | High with a Mild/Marked qualifier, the aspirate's
question (`aspLineageCount`) asked of the section, with no original to port. It merges into
`coreMegText()`'s sentence under the aspirate's conjunction rule (`aspMegaText`): abnormal **and** a
named list, abnormal **but** unremarkable, adequate **but** a named list — and adequate-plus-
unremarkable leaves the stock sentence untouched, since it already says "adequate". Unlike the
aspirate's lineage rows, Normal *prints* ("Megakaryocytes are adequate."), because meg number is a
primary finding no ratio tells; the core says "are" where the aspirate says "appear". An abnormal
count spends an "and" of its own, so a two-verb tail takes the comma join. The toggle group is
**`coreMeg`** — the name `findingMegakaryocytes()` was *already reading* (its `increased` falls back
to the core where the aspirate is silent), so the reader predated the control. The morphology cell's
highlight key moved to **`coreMegMorph`**, the same count/morphology two-key split as
`aspMega`/`aspMegaMorph`; both keys are in `HL_BASE`. Severity shows only on Low/High
(`syncCoreSeverity`, which now serves both this row and cellularity).

**The plasma cell row** — the aspirate's plasma half (`aspBlastPlasmaText`) asked of the section,
with no original to port. Not increased | Increased plus Mild/Marked (shown only on Increased),
and the **same descriptor keys** as `aspPlasmaDesc` in a second group (`corePlasmaDesc`), exactly
as the clot lymphocytes reuse the core's. `corePlasmaText()` reproduces the aspirate's branches —
including the mass-noun rewrite ("not increased, but multinucleated forms are seen") — minus the
blast merge, since the core has no blast row for the combined sentence to exist against. Its
sentence prints last in `fillCore()`, as plasma prints last on the aspirate. Keys `corePlasma` /
`corePlasmaMorph` ride in **`HL_PLASMA`** (entity-specific, not baseline), so only plasma-cell
workups cue them. The dx engine reads no plasma input from any tab, so `MarrowFindings.js` is
untouched.

Both go through `descriptorPhrase(group, filter)` / `descriptorNounPhrase()` / `descriptorJoin()`.
The `filter` argument and the two extracted helpers are what let a caller build its own sentence
without duplicating the qualifier-pooling and the "with"/semicolon join — the join in particular is
one rule with three callers now, and it is the one that keeps a pooled phrase from colliding with
the "and" around it. **The aspirate still prints "Megakaryocytes show …" for the same shared
descriptors** (`aspMegText`), where the same category error is possible; left alone deliberately —
its morphology merges into the count sentence and was not part of this change.

**The age-based cellularity autofill** (`syncCoreCellularity`, ported from
`../Marrow/MarrowText.js:1912-2027`) sets hypo/normo/hypercellular + severity from the entered
percentage, the patient's age, and the method + thresholds in the Core Settings tab. Three methods:
"100 minus patient's age" grades the entered % against an expected of `100 − age`; "Strict evidence
based" uses fixed per-age normal bands (no grade); and "Hybrid" grades against the **average** of
those two — `(100 − age + evidence-band-midpoint) / 2` — which moderates the rule's known
overestimate of decline in the elderly (at 70 the rule says 30% but the evidence mean is 45%, so the
hybrid expects ~37.5%). Only the *expected value* differs between "100 minus age" and "Hybrid"; they
share one grading ladder. (The original's Hybrid was an empty no-op; this fills it in.)

**The evidence-based bands are literature-current.** `coreCellBand()` returns 45–85 / 40–70 / 35–65
/ 30–60 for <20 / 20–40 / 40–60 / >60, whose midpoints are the reported means (65/55/50/45%). These
match the age-dependent normocellularity ranges reaffirmed by Nguyen et al., *AJCP* 2024 (PMID
37904278), which also found the plain "100 − age" rule overstates the elderly decline — so the
Strict and Hybrid options are the more defensible ones. **Lower bound inclusive**: a patient exactly
40.0 years old is in the 40–60 band and 60.0 in the >60 band (the original used `<=`, putting the
boundary age in the *younger* band). Age parses to whole years, so 39y364d → 39 → 20–40 and 40y0d →
40 → 40–60, the intended split. It fires on a percentage keystroke, a new age, or an edited threshold; a re-entered
percentage overrides a manual pick (the objective measure wins, as on the aspirate predominance),
while **no age means no opinion** — the choice stays manual, exactly as the original did for
`patientAge === -1`. An out-of-range percentage or an inverted range goes red (`.cellNumBad`) and
derives nothing. **Absolute and Range are mutually exclusive** — one overall cellularity, two ways
to state it — so editing one clears the other (`coreCellExclusive`); the Variable range is a
separate statement (how much the cellularity *varies*) and is untouched by that. `fillCore` reads the resulting chips directly, so the autofill only ever *clicks
them for you*; the manual path still works with no CBC. Verified in `scratchpad/cellFill.js` against
hand-computed expectations (see the note there on why it is not oracle'd against the original).

**Patient age is parsed from the CBC's DOB, runtime-only** (`parseAge`/`cbcPatientAge` in
MarrowCBC.js). DOB is PHI: it is read from the raw paste, reduced to an integer age on the spot, and
held nowhere — kept OUT of `cbcData` so a future case-save can never carry it out through there, and
the paste box is already `class="noSave"`. No DOB pasted ⇒ `cbcPatientAge()` is null ⇒ the autofill
stays dormant. A save that later wants age must decide that in the open, not inherit it here.

**Adequacy has three grades, and the conjunction carries the argument.** `suboptimal` sits between
adequate and inadequate — a core can be readable but not good, and the original offered only the two
ends. The value *is* the report word, so it needed no third branch in `coreAdequacyText()`; what it
did need is the join, which was already doing real work and is now explicit: an artifact is a
**concession** against adequate ("shows a crush artifact **but** is overall adequate") and a
**reason** for the other two ("**and** is overall suboptimal"). Both original strings still come out
byte-for-byte. The sentence is deliberately *not* the aspirate's "suboptimal for evaluation, limiting
the accuracy of a differential count" — a core carries no differential for the limitation to be about.

**The particle clot has its own lymphocyte list, and it is the SAME KEYS in a second group.**
`coreClotLymphDesc` names the identical six descriptors as `coreLymphDesc`, which is exactly what "a
group is a choice of keys, not a copy of the words" is for — two groups that could never drift into
two different sentences. Both print through `coreLymphText(group)`, which takes its group as an
argument for that reason. Two behaviours to keep:

- **"No particles" overrides the lymphocytes**, as it already overrides the quantity and "similar to
  core biopsy". There is nothing to have seen an aggregate in, and a clot reporting both would
  contradict itself in consecutive sentences.
- **The lymphocyte sentence prints on its own.** Naming an aggregate is itself a claim that there was
  a clot to see it in, so the paragraph appears with no quantity chosen. `fillClot()` joins its parts
  rather than concatenating, so the particle sentences stay byte-identical when it is absent.

It is a **row of its own** labelled "Clot lymphocytes" — not another control on the Particle clot
row, which would put two questions under one label (the aspirate's "Counted on" lesson), and not a
bare "Lymphocytes", which the core biopsy's own Lymphocytes row one group up would be read as. It is
tagged `coreClotLymph` and joins `coreLymph` in both lymphoma workups: the clot is a second place the
same aggregates show, and a workup that asks the question of the section has no reason to stop there.

**Variable-cellularity-alone closes its sentence.** The original left "…variably cellular (ranging
from 20-80% cellular)" without a trailing period when no overall quality was given, running it into
the next sentence. Assembled from parts here, so it closes cleanly — the same class of fix as the
whitespace rule, one notch up (a period, not a space). Also in `coreExtras.js`.

