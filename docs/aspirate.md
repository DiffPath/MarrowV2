# The Aspirate tab

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Lineage count language, the predominance autofill, the M:E ratio and pooled rows.

## The aspirate lineage count language (`aspPrecursorLine` / `aspLymphText`, `MarrowAsp.js`)
Erythroid, myeloid and lymphoid rows carry a **Low/Normal/High** count with a severity grade, like
the megakaryocyte row. This is the one piece of aspirate report text with **no original to port** —
the old app described these lineages by morphology only — so the wording was a pathologist decision,
not a reconstruction:

- **"[Cells] are [grade] increased/decreased"** (`mildly`/`markedly`), *not* the megakaryocyte's
  "appear …" nor "hyperplasia/hypoplasia". Chosen deliberately; don't "harmonise" it.
- **Normal is silent** — it prints no count sentence (the morphology sentence still prints), because
  the predominance and the M:E ratio already speak to erythroid/myeloid quantity and repeating it is
  noise. `'adequate'` is offered only so the chip can say "I looked, it was normal" and clear the cue.
- **Count and morphology merge into one sentence**, "and" when they agree (abnormal count + a named
  dysplasia), "but" when they disagree (abnormal count + unremarkable morphology) — the exact rule
  `aspMegaText` already used.

**The no-count output is byte-for-byte the old behaviour**, which is what keeps the `fillAsp` oracle
valid: with no count chosen these functions produce exactly the morphology-only sentences they did
before, including the combined "Myeloid and erythroid precursors show progressive maturation…" line
(which now also requires that neither lineage is counted abnormal, since a count splits them).
`scratchpad/aspCounts.js` pins the new sentences; `scratchpad/aspOracle.js` still proves the
no-count paths against the original.

## Blast morphology (`aspBlastDesc`, `aspBlastPlasmaText`)

The Blasts row carries a morphology dropdown beside its Increased/Not-increased chips, offering
`BLAST_DESCRIPTORS` — the same list the Blood tab's blast row offers, held once in
`MarrowDescriptors.js` because the diagnosis engine reads Auer rods out of both groups. **No
"Unremarkable" stop chip**, unlike every other morphology cell on the tab: "Blasts show unremarkable
morphology" is not a sentence anyone writes, so there is no normal for the chip to assert. See
[the diagnosis notes](diagnosis.md) for what Auer rods do to the MDS-IB subtype.

**Same conjunction rule as the lineages above** — `and` when the count and the morphology agree
("Blasts are markedly increased and show Auer rods"), `but` when they do not ("Blasts are not
increased but show Auer rods"), and the morphology carries the sentence alone when no count was
given. A named blast morphology also **breaks the combined "Blasts and plasma cells are not
increased" line**, for the reason a named plasma morphology already did: that sentence puts one
predicate over both nouns, and a morphology belongs to only one of them.

**With no blast descriptor named the output is byte-for-byte what it was**, which is what keeps the
`fillAsp` oracle above valid. The merge condition is now computed once as `combined` and read twice;
the old `blast !== 'adequate'` guard in the plasma branch was the complement of that condition only
while the two chips were the only things that could break the merge, and getting it wrong prints
"Plasma cells are not increased" twice or not at all.

## The aspirate's predominance autofill (`syncAspPredominance`, `MarrowAsp.js`)
The M:E ratio decides the predominance the way a pasted CBC decides anemia: it is the objective
measure of the thing the chip claims, so counting overrides a manual pick and an in-range ratio
clears a stale one. Two knowing deviations from `../Marrow/Marrow.js:1255-1285`, both flagged:

- **`≥` and `≤`, not `>` and `<`.** The old settings *label* promised "Greater than or equal to 4:1"
  while the code tested `> 4`, so at exactly 4.0 the settings said myeloid predominance and the app
  said nothing. One of the two is wrong; the label is the clinical statement, so the label wins.
- **No count means no opinion.** The original re-asserted this from `countCells()` on every input
  event, and with nothing counted it cleared `erythroidPredominance` — but not, asymmetrically,
  `myeloidPredominance` — so half the control was unusable on an uncounted aspirate. You cannot
  always count one; a predominance can be called off the core. It now fires only when the ratio can
  have changed (a keystroke on the tape, an edited threshold), never on unrelated clicks.


## The M:E ratio and pooled rows (the aspirate's two additions to the engine)
Both were config fields that nothing read until the aspirate landed. `config.meRatio` is
`{ label, range, includeBlasts }` — absent on blood, which gets no ratio, no rail line and no table
row. `config.pools` is a list of `{ id, reportLabel, cells, range }`, and `rowOrder` names pools and
cells alike (which an id is, is the engine's business, not the config's).

The **blast-equivalent cells** (`Promonos`, `Pros/blasts`) are the same shape of addition — two more
cells and one more per-cell flag, `excludes` — and they land on both specimens rather than this one.
Their `lineage` puts promonocytes with the monocytes on the myeloid side and the combined bucket with
the blasts, so the combined row follows the "Blasts in M:E ratio" chip and the separate promonocyte
row does not. Full note in [counter.md](counter.md).

**`lineage` drives the ratio, and it already existed.** It *is* the old `cellType` 1/2/3/5 split —
1 and 2 are both `myeloid` here, because the only thing separating them was which report row they
land on, which is now `pools`. Filling it in truthfully on blood, where it was inert, is the whole
reason the aspirate needed no new field.

**The ratio is computed from the ALLOCATED PERCENTAGES, not from raw counts** — the original's basis
(`../Marrow/Marrow.js:1204-1218`), and keep it that way. It prints three lines under the percentages
it is a ratio *of*, so the reader checks one against the other: "Neutrophils & Precursors 66.0%,
Erythroid Precursors 34.0% — so about 1.9." From raw counts that same case prints **2.0:1** beside a
table that says 1.9. The count-based number is arithmetically better and contradicts the table it
sits in; a report has to agree with itself, and a decimal of precision nobody can verify is worth
nothing beside that. The two bases differ only where the allocation rounds and rarely at one decimal
place, so this costs almost no accuracy. `aspCounter.js` pins it with a case that distinguishes them
(2:1 at a 50-cell target) — most counts do not, and a test that cannot tell them apart is not
testing this.

**A pool also sums the ALLOCATION** — same basis, second reason: largest-remainder is what makes the
column reach exactly 100.0%, so a pooled row must be a sum of its output. Re-deriving from counts
would let the Total drift off 100.

**Largest-remainder ties break by `config.cells` order** (the sort is stable). 3:1 at a 50-cell
target puts both ideals on `.5`, and `nrbc` is declared before `neut`, so the spare unit goes to the
erythroid side: 74/26, not 76/24. Deterministic, but worth knowing before reordering that list.

**`stats` vs `readStats`.** `stats()` deliberately does *not* re-read the tape — its
in-file callers just did. Anything outside the engine must use **`readStats()`**, which re-reads
first. Today `fillAsp()` would get away with `stats()` only because `fillTable()` happens to run
before it in the section registry; that is registration order holding a correctness property up.

