# The Stains tab (`MarrowStains.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Five growing lists over one vocabulary; the only tab that prints tables.

Five growing lists over one `stainVocabulary`, and **the only tab that prints tables instead of
prose**. `kind` says both what the control is and how it prints: `'select'` (one result carrying its
whole sentence), `'dual'` (Positive/Negative over a noun — "Positive for amyloid.", which is four
stains sharing one shape rather than four copies of it), and `'iron'` (two questions combining into
one or two sentences). `percent: true` adds the "(~N% of total cellularity)" figure.

**Stains are NOT descriptors, and this is the line.** A descriptor is a morphology word printed as a
fragment inside somebody's sentence by `descriptorPhrase()`; a stain is a thing you performed, its
result is a whole sentence, and it prints as a table row. So it gets its own vocabulary and its own
list machinery, even though both are growing dropdown lists rebuilt whole and both use `.descRow`'s
CSS ancestry. What IS shared is the principle: one table keyed by stain, and a list is a **choice of
keys** — the core biopsy and the particle clot are handed the same array rather than two copies.

**Ids are group + stain, never stain alone.** The same stain sits on the core and the clot, and the
original's bug here was one location's count leaking into the other's report. Keying every control
and every toggle group by list makes that structurally impossible instead of remembered.

**A chip must never trigger a list rebuild** — this cost the whole tab silently and is the
generalizable lesson. Rebuilding replaces the DOM, which detaches the element the event is still
travelling from; MarrowForm's toggle handler then runs on `#inputPanel` and clears every chip in the
group that is not `e.target`. The freshly rendered checked chip is not that detached node, so it was
unchecked the instant it was drawn and every iron and Positive/Negative answer read back empty. Only
`.stainSelect` rebuilds (no later listener acts on selects); the iron count block is revealed by CSS
`:has()` instead. That also means a count survives a detour through "Absent" and back, which a
conditional render would have thrown away.

**The tape and the percentage boxes update on `input`, not `change`.** `class="form"` alone is not
enough for a text field: `change` fires on blur, so a report would only catch up when you clicked
away. A chip or a select is decided the instant you click it and `change` is right for those.

**The stain tape is a real textarea and takes the row's full width**, like the differential's. It was
built as a one-line box that scrolled sideways, to stop a growing box walking the rows below it down
the panel — which traded away the thing a tape is *for*: seeing the run you have already counted is
how you know where you are in it, and a box that scrolls its history off the left is a tally with
extra steps. Two lines at rest, `resize: vertical` for a long count, and the width comes from
`.stainList` filling its cell (`.findingChips` is a flex container, so it shrink-wrapped by default
and left the tape a ~230px slot with its placeholder cut in half). `.stainResult` had to go back to
`width: auto` at the same time, or every two-word answer would have stretched across the panel with
it. **The tally readout rides on the percent line, not beside the tape** — that is what frees the
full width, and it puts the counted percentage next to the typed one, which is where the fact that
typing overrides the count is legible.

**Deviations, all flagged in the file.** CD5's labels and results were **cross-wired** for two of its
four options, so "Negative in neoplastic B cells" reported "Negative in B cells." — different claims,
not cosmetic. The `***` percentage placeholder **leaked into the report** when nothing had been
counted ("Shows no increase in blasts (~***% of total cellularity)."); the parenthetical is now
appended by `stainPercentSuffix()` rather than stored in the string, so an absent percentage prints
nothing. Two missing full stops (reticulin's MF-1, CD20's diffuse infiltrate) were the only values in
their lists without one. `~` no longer rides a range — the original printed both forms for the same
stain depending only on which option was picked.

**Report tables are report output and so are styled inline** like every paragraph: `REPORT_TABLE` /
`REPORT_TABLE_NAME` / `REPORT_TABLE_VALUE` in `MarrowReport.js`. The four block styles there are now
composed from one `REPORT_TYPE` by `reportBlockStyle(top, bottom)` — the margins are the only thing
that ever differed, and three retyped copies of a font stack is three fonts waiting to happen. The
composed `REPORT_PARAGRAPH` and `REPORT_HEADING` are byte-identical to the literals they replaced.
`REPORT_SUBLABEL` is the specimen name above a table: not bold, because the section heading above it
is the bold line and a second one reads as a second section. The 8pt separating one specimen block
from the next **is** `REPORT_HEADING`'s spacing and is reused rather than restated as a fourth style
identical to it.

**The counter keys are a setting, and a rebind TRANSLITERATES every tape.** `stainPositiveKey` /
`stainNegativeKey` default to `+`/`-` (the original's) and live in **Counter Settings**, beside the
two differential pads — the tab is called that, this is a counter, and one pair of boxes does not
earn a tab of its own. `stainKeys()` resolves them from the controls, the same seam
`counterKeymap()` reads through, so an edit is live immediately and Save only decides whether it
outlives the session.

The transliteration is the part that matters and it is `rekeyTape()`'s rule arriving here: a tape
stores key characters **verbatim**, so changing a key without rewriting what is already on screen
silently reinterprets a count that is already there — rebind `+` to `1` and a full tape reads as
zero. `stainRekeyTapes()` rewrites every tape character by character, which is deliberately not two
string replaces: **swapping** the two keys is a thing someone will do, and replacing all `+` with `-`
then all `-` with `+` collapses the whole tape to one character. Anything that is neither key is left
exactly as typed — a tape may hold spaces or newlines used as grouping and those are not ours.

**Two keys that are the same character are refused, not accepted.** They cannot be told apart on a
tape, so the last good pair stays in force and both boxes go red (`.stainKeyBad`) until it is fixed.
Verified end to end: a 3-positive/7-negative tape reads 30% before a rebind, after rebinding positive
to `1`, after rebinding negative to `2`, and after swapping the two — the report string is identical
throughout, which is the whole point.

**A workup can order its own stain** (`stainAutoLists`), keyed by template type exactly as
`templateTypeHighlights` is. Today one entry: an **MPN** template names **reticulin on the core**,
because grading the fibrosis is most of what separates those entities and no MPN marrow is signed out
without it. The stain arrives with **no result chosen**, which is already this tab's way of saying
"performed, nothing said yet" — it prints a Reticulin row with an empty right-hand cell, the same
thing you would type to list a pending stain.

**This is the one thing in the app that places itself, and the reason it may is that it claims
nothing.** Naming a stain says it was performed; it says nothing about the marrow. Compare the
diagnosis tab, where a suggestion reaches the report only by being accepted — that is a claim, so it
waits to be made. Keep the line there: a rule that filled in a *result* would be the tool reporting a
finding nobody saw.

**Switching away takes it back — but only while it is still empty.** A reticulin left on the core of
a lymphoma case is a stain the report says was performed and nobody performed. Once a result is
chosen the row is a **finding**, and no finding is ever removed by a click on another tab; that is the
difference between clearing a suggestion and deleting an observation. The test is
`stainResultText() !== ''` rather than the select's value, so the rule reads identically for a stain
of any `kind` — an iron answered only in its Storage chips is as answered as a reticulin answered in
its dropdown. `stainAutoAll()` derives the set this sync may touch from the table itself, so it can
never reach a stain no template ever named, and adding an entry is one edit.

**The listener binds on `#specPanel`, not `#inputPanel`** — the same reason the `.stainSelect` one
binds on `#stainPanel`: an event bubbles outward, so the inner listener rewrites the list before
`fillReport()` reads it. Backwards, it costs exactly one render, invisible until the click that adds
the stain is the one that should have printed it.

**An auto-named reticulin must reach the engine as fibrosis UNKNOWN, never as zero.** `findingFibrosisIn()`
already returns `null` for a named stain with no result, and that is now load-bearing rather than
incidental: the autofill makes "reticulin named, ungraded" the normal state of every MPN case, and
reading it as MF-0 would silently close MDS-f on all of them. Pinned in the harness alongside the
straddling-band case.

**Not yet ported:** `Kappa/Lambda IHC` exists in the original's data but was never in its offered
list, so it is not offered here either.

