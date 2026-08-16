# The template-type highlight cue (`templateTypeHighlights`, `MarrowReport.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Which inputs a workup turns on, and why the box is a box-shadow.

Which inputs a workup turns on. Tag the controls and list their key: `data-key="hgb"` in the tab
file, `'hgb'` under each type that cares. Two places, nothing else knows — keying on `data-key`
rather than ids is what keeps `MarrowReport.js` ignorant of any tab's id scheme.

**A key is a question, not a row.** Where a row asks two — a lineage's count and its morphology —
it carries two (`neut` / `neutMorph`), boxed and satisfied independently. They are answered at
different times and by different things: a pasted CBC answers **every count on the tab and none of
the morphologies**, so one key over both would let the CBC withdraw the cue asking for a dysplasia
nobody has looked for. The split is `bloodLineages`' `morphKey` (spelled out, not derived from
`key`, so the map's keys grep back to their row) plus `bloodChipSet()` for the platelet row, which
asks the same two questions in a `.findingGrid` instead of a matrix.

**The map is a clinical judgement and is meant to be argued with**; the mechanism around it isn't.
It is **one baseline plus three exceptions**: `HL_BASE` is what nearly every workup wants flagged,
every type is `HL_BASE.concat(...)`, and only three findings are entity-specific — **plasma cells**
on plasma-cell-neoplasm workups, **lymphocytes** (`HL_LYMPH`) on lymphoma, and the **peripheral-blood
blast** (`HL_BLAST` = `blast` only) on MDS, **MPN** and acute leukaemia. The aspirate blast
(`aspBlast`) and
**core adequacy** (`coreAdequacy`) are in the baseline, not the exception: a blast count is part of
every differential and adequacy gates whether the section is interpretable, so both are asked on
every case. So is **laterality** (the Specimen tab's one cued control): it is part of the specimen
line on every case, and the one answer nobody can reconstruct later from the slide. Everything else is identical across the eleven
types, which is the point: a cue that means the same thing on every case is one you learn to trust.
This replaced a set of bespoke per-type lists — several shorter than the baseline — that drifted and
were hard to reason about. Rule-out and history-of are still spelled out separately rather than
derived: they agree today and there's no reason they must.

**MPN takes the MDS set exactly, and that is a finding rather than a copy.** The two are the chronic
myeloid differential and are worked up *against each other* — the cytopenias, the dysplasias, the
megakaryocytes and the blast count are the findings that separate them, so they are the same
findings. What an MPN workup adds is not a cue but a **stain**: see `stainAutoLists` below. That is
the general shape to reach for when a workup wants something the baseline doesn't — a cue asks you
to look at a control that already exists, and if the answer is "you will need this stain", naming
the stain is the more useful act.

**Advisory, and it clears when answered.** Nothing is hidden or disabled, and the box goes as soon
as anything inside it is checked or chosen — so what stays green is what this workup wants and you
haven't got to yet. That's the old app's `needsSelection` behaviour, and it was right.

The clearing is **pure CSS** — `[data-key].keyInput:has(input:checked)` / `:has(option:not([value=""]):checked)`.
Deliberately not JS: the box then clears however the answer arrived, including a pasted CBC filling
half the tab at once, with no list of "places that must re-check the cue" to keep complete. A
`<select>` always has a checked option (the empty `—`), which is why it must ask whether the checked
one is *real* rather than just `:has(:checked)`.

**Tag the controls, never the label** (`.findingChips` / `.matrixControls`) — the box points at
what you're being asked to fill, and a box round the word "Hemoglobin" points at nothing. It's the
old app's green (`#d4f4dd` / `#3a9d5d`), because that was the right colour for "look here".

**The box is a spread `box-shadow`, not a border + padding**, and that is load-bearing. Border +
padding would need a negative margin to cancel (the old app did exactly that), and on
`.matrixControls` — a **subgrid** — padding shifts its tracks and drags every chip in the row out of
line with the rows above. A shadow draws entirely outside the box model, so `[data-key].keyInput`
carries **no padding, margin or border**. The highlighted set changes under the cursor as you pick
a type; nothing may jump when it does. (`.findingChips` additionally needs `width: fit-content`,
since its column is `1fr` and the box would otherwise span the panel; the matrix columns are
content-sized, so the span already hugs.) The `[data-key]` in the selector wins on specificity
rather than source order.

**A shadow ignores layout, so the gaps around a box are its whole geometry.** It reaches 3px, so
every gap between two boxable things must clear 6px: `--findingRowGap` (8px) vertically, and
sideways the 6px column gap plus `.matrixMorph`'s 10px step. That step is a **margin, not padding** —
padding is inside the box, so it would be 10px of dead green left of the chips instead of air
between two boxes. An auto column charges the same for either.

**`.matrixControls` exists only so the cue has something to box** — a matrix row's count chips are
loose grid cells with nothing to hang it on. It's `grid-template-columns: subgrid`, so its cells sit
in the *parent's* columns exactly as when they were the parent's own children and every chip still
lines up down the panel. A nested ordinary grid would size its tracks per row and go ragged. The
`@supports` flex fallback degrades an old browser to a ragged row rather than a vertical stack,
which is what dropping an unsupported `subgrid` would otherwise leave.

It spans `2 / -1` by default, but `2 / -2` in **both** `.countMatrix` and `.presenceMatrix` — "every
column but the last", stated that way so a new column can't break it — because that last column is
`.matrixMorph`, which is a second question and boxes itself. The presence matrix used to keep the
full span, and the note here used to say why ("blasts and plasma cells have no morphology column");
it gained one when the blast row got its morphology dropdown, and the `-2` spelling is the reason
that took one selector and not a re-count. The severity rides *inside* the count's box, since it
grades the count rather than being an answer of its own (and so is a `.chipQualInput` — see below).

