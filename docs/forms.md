# Chips, toggle groups, descriptors

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The shared form vocabulary and its CSS contracts. Read before adding any control.

**On/off preferences (settings) render as toggle switches**: `<input class="toggleInput setting">`
+ adjacent `<label class="toggleSwitch">`. Same adjacency contract as chips; the control is still a
checkbox underneath, so settings capture/restore is unaffected.

**A switch on an INPUT TAB is a `.toggleField`** — its text in a label of its own, *then* the switch
(`aspToggleField()`, MarrowAsp.js). Two of them share a `.toggleFieldRow`. Reach for it over a chip
where the control is not an *answer to a question* but a **claim that stands on its own** and needs
a whole sentence to be unambiguous: the aspirate's "Performed on touch preparation" and "Include
blasts in M:E ratio" are unrelated to each other and change things of wildly different size, so
neither may borrow meaning from a shared row label or from its neighbour. A switch also *looks*
different from the chips below it, which is the honest signal — these two are not findings and emit
no report text.

Three things it must keep:
- **`form`, never `setting`.** It looks like a settings control and is not one; `setting` would
  persist case data to localStorage and carry it into the next case.
- **Two labels, one input**, with the input still ADJACENT to `.toggleSwitch`. The text label is a
  hit target as well as the switch, which a bare `<span>` would quietly have cost.
- **The switch cannot simply be reversed.** `.toggleSwitch`'s knob (`::after`) is positioned from the
  *label's* left edge, which coincides with the track's only while the track is the label's first
  thing — `row-reverse` moves the track right and leaves the knob at the left, alone. Moving the text
  out is what avoids that, which is why the settings toggle (switch first, text inside) and this one
  are two arrangements of the same rules rather than a flag on one.

The gap inside a pair (8px) and the gap between pairs (28px) are the only thing grouping them, so
they must not converge. Measured in real Chrome: the row uses 453px of the input panel's 670px at
every scaling from 100% to 167% — the panel bottoms out at 705px wide — so it holds one line
everywhere and never reaches the `flex-wrap`.

**Prefer toggle chips over bare checkboxes/radios, and lay them out horizontally.** This app is
optimized for clicks and time, not for resembling the original. `.chipRow` + `chipHTML()` (see
`MarrowForm.js`) give click-anywhere pills — **~24px tall, padding a third of the chip**. The
padding exists for one reason: a bigger hit target than the ~13px native box a chip replaces. It
was 7px/13px, which made a chip 51% empty space, half again the height of the dropdown beside it in
the same row, and cost ~88px of the Blood tab across its eleven rows. Past a usable target,
generosity buys nothing and is charged by the row; `.chipMatrix` gives a row-label × column grid for
option sets with two dimensions (the template types are 5 entities × 2 contexts, so they're a
matrix, not a 9-item list — one click, not two). Use `.fieldLabel` / `.fieldBlock` rather than
`.lowerGrid` where controls want the panel's full width; `.lowerGrid` spends a fixed 200px on its
label column.

Gotcha: a radio group with nothing selected matches CSS `:indeterminate`. Any `:indeterminate` rule
must be scoped to `input[type="checkbox"]` or it will grey out untouched radio chips.

**A toggle group renders as ONE SEGMENTED CONTROL, not as loose pills** — "Anemia | Adequate |
Polycythemia" is a single bounded control divided by hairlines. It saves the gaps and the doubled
borders a group used to pay between its own members (5–28px a row; 21 of the 26 rows on the three
tabs got narrower), but the bigger thing is that it *draws* what a gap could only mean: these are
alternatives, one box is one answer. A run of separate pills says nothing about whether they are
exclusive — which is exactly how the aspirate's two unrelated switches came to read as one question.

**Wherever a helper emits a whole group, the helper wraps it** (`bloodToggleRow` / `aspToggleRow` /
`coreToggleRow`, and the two qualifier maps in `MarrowDescriptors.js`), so no group those cover can be
missed. **A group assembled from bare `chipHTML()` calls has to be wrapped where it is built** — the
Specimen tab's Laterality is the one of these, a radio group with no helper behind it. So the test is
the group's meaning, not which function drew it:

- **EXCLUSIVE is the whole test — and it does not stop at the input panel.** The Counter Settings
  "Keypad" chips (Numbers only / Numbers and period / Expanded) are a radio group and are segmented
  like any other; a settings panel is not a different kind of screen. A `data-toggle` group, or a radio group like Laterality or the
  template types: one answer, so one control.
- **A multi-select set stays loose pills.** Blood's Morphology row, the aspirate's Touch prep and the
  Specimen tab's Specimens row are checkbox sets — segmenting them would promise an exclusivity they
  do not have. These are the rows that did not get narrower, and that is the correct outcome, not a
  gap. Specimens sits directly above Laterality, so the two now read as different KINDS of question
  from across the panel, which is the segmentation earning its keep rather than just saving 21px.
- **`bloodToggleChip` stays the way to emit ONE chip.** The matrix calls it per cell.

**The matrix is segmented structurally instead of by a wrapper**, because a wrapper would be one grid
cell where there were three and would take the columns with it. `.matrixControls` sets `column-gap:
0` (a subgrid's own gutters override the parent's for the tracks it spans, so the label gap and the
morphology gap are untouched), and an inner edge is *wherever two `.matrixCell`s are adjacent
siblings*. Stating it that way is what makes the **sparse** rows right for free: monocytes offer Low
and High but no Normal, so the row is cell / empty div / cell, neither chip has a `.matrixCell`
beside it, both keep round ends, and the hole stays a hole. Nothing had to be told which rows those
are. This is also what keeps the platelet row and the lineage rows looking alike, which they must —
they ask the same question in two different grids.

**Killing the column gap has to be done in every grid that holds `.matrixCell`s, and there are two**
— `.matrixControls` (Blood's count and presence rows, whose cells sit in a subgrid) and `.chipMatrix`
(the Specimen tab's template matrix, whose cells are the grid's own children). The segment *styling*
keys on `.matrixCell` adjacency and so applies to both automatically; the *gap* does not, and missing
one gives square-edged chips sitting apart with the continuing ones missing a left border — visibly
broken, and it is what the template matrix looked like until `.chipMatrix` got the rule. **A new
matrix needs the gap line as well as the class.** Note this cost a tab nobody rendered: the failure
was two screens away from everything being measured, and no probe that measures widths will report
it. Look at every tab a shared class touches.

**`.chipMatrix`'s track list comes from the data, inline.** `MarrowSpec.js` sets
`repeat(templateEntities.length + 1, auto)` on the element; the `repeat(5, auto)` in the stylesheet is
only what a matrix gets that doesn't say. It was hard coded to four columns there, which made adding a
template entity two edits in two files with nothing to say the second was missed — and the failure is
quiet: a sixth cell in a five-track grid wraps to a row of its own, out of its column, still looking
like a chip. Every track is `auto` either way, so the number changes nothing else about the grid. Same
bargain as `KEY_WIDTH` on the counter pad: the geometry is stated once, where the data is.

**The seam is reached two ways on purpose, and this is the part to not "unify".** Inline, the
segments are flex items laid out by flow, so `margin-left: -1px` genuinely pulls each onto its
neighbour's edge and the group ends up narrower. In the matrix they are grid items in fixed tracks: a
negative margin saves nothing there (`column-gap: 0` already closed the tracks) and knocks the item
1px off its column — measured, as the High chips landing at x=218 on rows offering Low|Normal|High
and x=219 on rows starting their run at High. So the matrix drops the doubled `border-left` instead
and lets the neighbour's right border be the seam. One pixel, invisible, and still the exact thing
the columns exist to prevent.

Overlapping borders means the segment that paints LAST owns the shared hairline, and source order
gives that to the one on the right — so `:checked` and `:hover` lift with `z-index` to take their own
outline back, and focus sits above both.

**In the matrix the seam has one line and it belongs to the chip on the LEFT**, so a chip asserting
itself — hovered or checked — cannot colour its own left edge; it hasn't got one. The neighbour lends
its right border instead, via `.matrixCell:has(+ .matrixCell > .chip:hover)` and the `:checked` twin.
`:has(+ …)` is what makes that sayable at all: it selects the chip *before* the one in the state,
which no combinator can. Without it a hovered segment outlines on three sides and leaves a stale pale
line on the fourth — which is what a hovered template option did. Both alternatives are worse:
restoring `border-left` puts a second line at the seam and shoves the label half a pixel, and an
inset shadow or an outline draws the dark line *inside* this chip while the neighbour's pale one
still sits outside it — 2px either way. Lending the line keeps every seam exactly 1px and changes no
geometry.

**Testing note: disable transitions before reading colours.** `.chip` transitions
background/border/colour over 150ms, so `getComputedStyle` right after a click returns a
mid-transition value — it reported a checked chip as still white and cost a wrong diagnosis here.
Inject `* { transition: none !important }` first. And `:hover` can't be driven headlessly: swap the
`:hover` token in the live `CSSRule.selectorText` for a class you can add, which tests the real
rule's declaration, cascade position and `:has()` shape with only the state token changed.


## Toggle groups, stop chips, and inline qualifiers (`MarrowForm.js`, `MarrowDescriptors.js`)
**Prefer a toggle group over a radio group.** `data-toggle="<group>"` on checkbox chips: at most
one is chosen, and clicking the chosen one *clears* it. Read with `toggleGroupValue(group)`, write
with `setToggleGroup(group, value)` — the canonical pair; **don't reach for ids**. A group's chips
are built by whoever needed them and their ids follow that caller's convention (plain chips are
`<group>_<value>`, a qualifier chip is `<chip>Q<value>`); the only things every member shares are
its `data-toggle` and its value, so those are the only two things to key on. Guessing an id here is
how the CBC autofill silently failed to grade NRBCs. Radios cannot be un-picked, and nearly every question on
an input tab is optional with "no comment" as the **default** answer — with radios, a mis-click on
"Low" is permanent for the life of the case. The old app got burnt from both ends: radios where it
needed clearing (hemoglobin), bare checkboxes where it needed exclusivity (severity, where ticking
both Mild and Marked silently reported "marked").

**Stop chips** are `data-stopgroup="<group>"` + `data-stop`: a chip that *means* the absence of the
others ("Unremarkable morphology", "No atypical"). Ticking it clears its group's ordinary chips and
vice versa; ordinary chips still multi-select among themselves. This replaces the old app's
per-control `onPairedOff` / `offPairedOff` / `data-paired` attributes.

**Descriptor lists are growing dropdowns, not chips** (`descriptorListHTML` +
`renderDescriptorList`). One row per morphology you have named, plus one empty select waiting; a
group costs the height of what you actually said. **Chips are wrong for a list**: seventeen red
cell morphologies as chips are three rows of the panel forever, named or none — that is what "very
bulky" meant. Chips stay for the handful of options that are *questions* rather than list entries
(low/normal/high, none-through-frequent, the four named RBC features), where a dropdown would be
more clicks for fewer options.

The list **is** the state — `descriptorSelected(group)` reads the rows, in naming order, and
there's nothing else to keep in step. Rebuilt whole on every change, which is what keeps the option
lists free of duplicates with no bookkeeping. Three behaviours to preserve, all the old app's:
a named descriptor is offered by no other select (it can't be said twice); a **stop** descriptor
("No atypical") suppresses the trailing select, since it means the absence of the others; and
qualifiers are keyed by *descriptor*, not by row, so one follows its morphology across a rebuild
rather than staying in the slot it sat in.

`.descSelect` carries `class="form"` — that's the opt-in to `fillReport()`, same as a chip. Without
it a dropdown changes nothing, silently.

**The descriptor column is one width, `--descWidth` (160px, measured).** The dropdown and the
"Unremarkable" stop chip standing above it are one control in one column, so they read the number
from one variable rather than each declaring it. The chip additionally needs `box-sizing:
border-box`, and that is not boilerplate: `.chip` carries 9px of padding and a 1px border, there is
no global border-box in this file, and a `<select>` is border-box from the UA stylesheet — so a bare
width renders the chip at 180 against the select's 160 and misses by exactly the thing being asked
for. The RBC row's stop chip is *not* in a `.matrixMorph` (it sits in a row of sibling chips, above
nothing) and is deliberately left hugging its text.

**Every descriptor dropdown is exactly that width, and `flex-shrink: 0` is what makes it true.** The
width is the contract the qualifier chips hang off: the select is the first thing in a `.descRow`,
so a fixed select width is a fixed x for everything after it. A flex item shrinks by *default*, so
without it `width: 176px` is only a preference and a row surrenders dropdown width whenever it can't
fit — by an amount that depends on what sits beside it. `.descRow` wraps instead: too little room
moves the chips down, never the edge they line up on. Don't reintroduce a `max-width` here either —
a percentage cap resolves against each row's own container, which is the same disagreement arriving
by another route.

**The cell-fill rule is `.matrixCell > .chip`, and must never go back to `.chipMatrix .chip`.** That
descendant selector was the source of the above and is the cautionary tale for this whole area: it
reached all 43 chips inside a matrix when only 28 are cells, so the 10 severity chips, 3 qualifier
chips and 2 morphology stop chips were each stretched to fill a cell they do not live in. `width:
100%` on a flex item means 100% of *its row*, so three qualifier chips each demanded the whole row —
an overflow the dropdown beside them shrank to absorb, by an amount depending on which qualifier set
the row carried (`quant` = "Rare | Occasional | Frequent" vs `degree` = "Slight | Mild | Marked":
same three chips, visibly different width). Hence dropdowns at several widths down one list. The
severity pair is a cell *wrapper* but not a cell and is deliberately excluded — its chips are
natural width, like the identical Mild|Marked pair in the hemoglobin row.

**A 1920×1080 screen is not 1920 CSS px.** Windows ships **125% scaling** on most 1080p displays, so
the page gets **1536** and `#inputPanel` gets 753 — not the 925 a "1920" budget assumes. Every width
here must be checked against the *scaled* viewport; sizing against the raw screen number is sizing
for a machine almost nobody has. `.panel` is `flex-basis: 0; flex-grow: 1`, so the two panels split
the row evenly and neither can grow past its half however wide its content, and `.panelBody` is
`overflow-x: hidden` — so an overrun is *clipped*, not scrollable, and therefore invisible.

**Widths are measured, never estimated.** `scratchpad/sweep.js` drives **real Chrome** at 100–167%
scaling and is the check to re-run before adding a chip to a lineage row; `scratchpad/selwidth.js`
asks Chrome what a dropdown intrinsically needs. Every other suite runs on jsdom, which has **no
layout engine** — it can tell you which rules apply, never what anything measures. Arithmetic in
this area has been wrong twice in a row (a text estimate 17px out, then a viewport 384px out), each
time reporting comfortable clearance while the screen wrapped. Don't reintroduce it.

**A broken comment in `Template.css` deletes the rule after it, silently.** This file is mostly
prose, and editing a comment's opening half while leaving its old closing `*/` behind orphans the
text — which then merges with the *next selector* into one invalid selector and drops that whole
rule. It still reads correctly to a human. It cost `.descSelect` outright, and the deletion *looked*
like a fix because a select with no rule falls back to roughly the right intrinsic width. Run
`scratchpad/cssaudit.js` after touching the stylesheet; it checks comment nesting and asserts each
load-bearing rule survived a real parser.

**The morphology cell (`.matrixMorph`) is a `flex-direction: column`** — the stop chip sits *above*
the dropdowns, at any width. It was a wrapping row, and a lineage's cell stacked only because its
row (the label column, three count chips, a severity pair) squeezed its column below chip + 176px, while
the platelet row had width to spare and stayed on one line. Two cells agreeing by accident of what
sits to their left is not agreement.

`qualChipHTML` (the qualifier riding inside a chip, revealed by `.chipWrap:has(> .chipInput:checked)`)
is now only for those named RBC features.

**The qualifier groups the output.** Two descriptors sharing one print as a single phrase — "rare
schistocytes and target cells", not "rare schistocytes and rare target cells". That is what
`descriptorPhrase()` is for, and why a qualifier belongs to each descriptor rather than to the
group.

**And it carries down the list.** An unqualified descriptor takes the nearest qualifier picked
above it, so "occasional" on the first of three prints "occasional x, y, and z" rather than
"occasional x with y and z". The rebuild originally dropped the old `listText`'s inheritance as a
UI workaround; the author asked for it back, and it returned in a stricter form: the run flows
only through rows offering the SAME qualifier set, an explicit pick starts a new run, a row with a
different set (or a `prefix`) breaks it, and rows above the first pick stay bare. All in
`descriptorPhrase()`; nothing is written into the controls — the chips still show exactly what was
clicked.

**"Unremarkable morphology" vs a named one is reconciled in `MarrowDescriptors.js`, not
`MarrowForm.js`.** The stop-chip handler works by unchecking, and a `<select>` has nothing to
uncheck — so naming a morphology clears the group's stop chips, and ticking a stop chip empties the
list, both from the descriptor file where the list is understood.

