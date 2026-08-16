# Building an input tab (follow `MarrowSpec.js`, then `MarrowBlood.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The tab-authoring guide: data table -> render -> fill -> register.

Tabs generate their own markup into the shell-created `#<id>Panel`; do **not** hand-write form
markup into `Marrow.html`, which must stay interchangeable with `Liver.html` (one differing line).
A tab file is: data table → `render<X>Panel()` → `fill<X>()` → `registerReportSection()`.
`MarrowSpec.js` is the smallest whole example; `MarrowBlood.js` is the one to copy for a real tab —
compact grid, matrices, descriptor groups, and a `fill<X>()` that is one function per sentence.

**A tab is mostly a data table.** Every question on the Blood tab is a row in one, and the ~40 rows
of controls the original needed are **11**. Four things bought that, in rough order of value:

1. **A dropdown for anything list-shaped.** A group costs the height of what you named, not of
   what you might have named.
2. **One row per subject, not one per question.** A lineage's count, severity *and* morphology are
   one line — `bloodLineages` carries `descGroup`, so "Neutrophils" is asked once. The original
   asked it three times in three labelled blocks. **The converse is the trap**: two *subjects* may
   not share a row, however few chips they are. A label column claims its label for everything in
   the row, so the aspirate's "Counted on: [Touch preparation] [Blasts in M:E ratio]" read as two
   answers to one question — when one changes which specimen the whole differential describes and
   the other changes a single number. See the toggle-field note below for where that one landed.
3. **No headings.** Not section headings (a hairline between `.findingGroup`s says "different
   thing now" without a row), and not column headings — a chip labelled "Low" under a heading
   saying "Low" is the same word twice and a whole row to say it.
4. **A matrix for questions that repeat.** Five lineages × low/normal/high, blasts and plasma
   cells × none-through-frequent. The columns are what make "which lineages did I comment on" a
   glance instead of a read. `.findingGrid` spends 100px on its label column where `.lowerGrid`
   spends 200px — width the chips need to stay on one line.

   **`--findingLabel` must be re-measured whenever a label is added**, and nothing will tell you
   if it isn't: `.findingLabel` has no background and does not clip, so a label too long for the
   column slides silently under the control beside it. It sat at 88px — right for Blood, whose
   longest is "Lymphocytes" (76px) — while the aspirate and core had since added "Megakaryocytes"
   (94.7px), which ran under its own chips on both tabs for as long as those tabs have existed.
   The shared value is now **100px**, which holds "Megakaryocytes" with 5.3px to spare.

   **A tab whose longest label the shared column will not hold overrides it for itself.**
   `#corePanel { --findingLabel: 108px }` — the property inherits, so one rule re-columns that tab
   and `.findingGrid` needs no idea it happened. The core needs it for "Myeloid/Erythroid"
   (100.4px), the longest label in the app; widening `:root` instead would charge those 8px to
   every row of every tab to seat one label on one. **What it costs is a shared left edge across
   tabs**: Blood's and the aspirate's controls start at 116px, the core's at 124px, so switching to
   the core shifts its controls 8px. That is affordable only because the tabs are never on screen
   together and each tab is still internally aligned — which is the alignment the eye actually
   follows. Don't reach for a per-tab override to save a few pixels; it is for a label that has
   nowhere else to go. The other way out is always to shorten the label ("Precursors" is 63px and
   fits the shared column) — report strings are untouchable, on-screen labels are not.

A row that only sometimes applies is **hidden, not removed** (`visibility`), so the grid never
reflows under the cursor — see `syncBloodSeverity()`, which is bound to its own listener rather
than called from `fill()`, because `registerReportSection`'s `fill()` must stay a pure reader. The
one exception earns it: the aniso list is `display: none` until anisopoikilocytosis is claimed,
because it is meaningless until then. It lives *inside* the RBC morphology cell rather than in a
row of its own — a row would need a label, and the label would just repeat the chip above it.

