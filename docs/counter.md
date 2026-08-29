G# The differential counter (`MarrowCounter.js`)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The engine, its sound, its settings, and the cross-tab applySettings clobber.

`createCounter(config)` per specimen; all instance state lives in the closure. Two ideas the
original app conflated are kept orthogonal, and this is the thing to preserve:

- **`keymap`** — key char → cell id. *Which* cell a keystroke means.
- **`layout`** — 2D array of key chars (`null` = gap). *Where* a key sits on the pad.

**A cell has at most one key, and `defaultKey` is optional.** A cell whose key isn't in the current
`layout` simply has no tile — it still counts when typed, and its tone marks it as off-pad (a cell
on `.` under `'Numbers only'`). A cell with **no `defaultKey` at all** is unbound: no tile, and no
keystroke either, until it is put on a key in Key bindings.

The letter keys `P`/`A`/`O`/`M`/`B` are gone (author's instruction). They used to carry
Plasma/Atypical/Other and the two blast-equivalent rows, which made those cells countable from the
keyboard while showing nothing anywhere — a key you had to already know about. **Both counters
declare fifteen cells against an alphabet of thirteen keys**, so "every cell has a key" was never
something the engine could promise. What it promises is that **the pad is the truth**: everything
countable is on it or one layout away, and nothing counts invisibly. The original's `character: -1`
broke that from the other side — three cell types on screen, uncountable, with no way to fix it —
where here every cell is offered on every tile in the settings.

**The pad is a readout, not a control.** Counting is keyboard-only: tiles are `<div>`s with no
click handler, no hover and no `cursor: pointer`, because a mis-aimed click is a silent miscount
and the hand is on the keyboard with the eye at the scope anyway. Don't "restore" click-to-count.

`hasTile(key)` is the one predicate for "does this slot render a tile" — true only when the key is
non-null **and** binds a cell. Both conditions matter: the presets lay out a real numpad, so
`'Expanded'` offers `/`, `*`, `.` that no blood cell claims. `keyTileHTML()`, `rowTemplate()` and
`buildToneSteps()` all route through it, so the pad's shape, its row heights and its tone ladder
cannot disagree about which slots are real.

**The textarea IS the tally.** Each keystroke appends one character; `readTape()` rescans the
whole string on every input event and nothing is ever incremented. That is what makes backspace,
paste, select-and-delete and Ctrl+Z all work as undo with no extra code — don't "optimize" it into
incremental bookkeeping, and don't add undo/clear buttons: **backspace already is undo.** The tape
stores key characters verbatim (type `7`, see `7`), which is why `rekeyTape()` exists: remapping a
key must transliterate the tape or it silently reinterprets an existing count.

The tape and the CBC paste box share one class, **`.textBox`** — the app's multi-line text field.
Monospace in both for two independent good reasons: the tape is one character per cell, and the
CBC arrives as tab-separated columns that only line up in a monospaced font. It replaced `.extend`
(`width: 98.5%`, a fudge around exactly the overflow `box-sizing: border-box` prevents), whose only
user was the paste box.

**The UI stays bare on purpose.** No hint text, no button bar, no progress bar — the placeholder
("Count here") is the only instruction. The pad and its side rail sit as one centered row; the
tape spans the full panel width below them. Target-reached is signaled by the count number's
color (`.counterCount.done`) and by the completion chime — never by a bar. Progress is something
you hear or glance at, not something that occupies the screen.

A tile is one line — key cap, cell label, percent — and shows the **percent only**: the running
count appears once, in the rail, not once on every tile. An uncounted cell reads
`0.0%`, never a dash: it *is* zero percent, and a dash makes you decide whether the pad has
started working. `.isZero` mutes it instead, so the eye still lands on the cells with counts.
Cell labels stay abbreviated (`Promyelo`, `Metas`), but `KEY_WIDTH` is sized to hold the longest
abbreviation **whole** — a truncated label ("Prom…") is the thing to avoid, not the abbreviation
itself. The tile is **compact and the width budget is tight**: `KEY_WIDTH` (149) is `.key`'s padding
+ cap + gaps + percent column (88px of fixed furniture) plus the measured width of the widest label,
with only a couple of pixels over. That label is **`Pros/blasts` (59.4px)**, not `Promyelo` (50.7px)
— adding the blast-equivalent cells took the pad from 140 to 149, which is the worked example of the
rule: a new label longer than the current widest, or a wider cap/percent, needs `KEY_WIDTH` raised to
match — **re-measure in the page, don't estimate** (`getBoundingClientRect()` on a `.keyName` probe);
`.keyName`'s ellipsis is the safety net, not the intended look.

## Sound
All of it serves one posture: eye at the scope, screen out of view. **The number of notes is the
message**, so nothing needs pitch discrimination to read:

| notes | meaning | figure |
|---|---|---|
| 1 | a cell was counted; its **pitch is the row** | triangle blip, 35ms, C4 ladder |
| 2 | that cell crossed a multiple of 100 | sine, G5→D6 (a fifth, left open) |
| 3 | that cell reached the desired count | sine, G5→D6→G6 (resolved to the octave) |

Pitch carries the same split: cells sound in the click ladder (C4 up to ~Eb5 at five rows), and
both progress figures sit **above** it from G5 so they can never be heard as a row. Below the pad,
on it, above it — off-pad keys (step 0, `P`/`A`/`O`), cells, progress. The milestone is
deliberately the completion left unfinished — "keep going" is literally "done" minus the last note
— which is why they're 2 and 3 notes of one figure rather than two unrelated jingles.

**The figures add to the click, they don't replace it** (delayed `COUNTER_CHIME_DELAY_MS` past its
35ms, so it reads "tick, ding-ding" rather than a chord). Every counted keystroke keeps its row
confirmation; a milestone is extra news, not a hole where the confirmation was.

`counterProgress()` reads the rules off the **denominator** — the rail's number, what the target
measures — so an NRBC correctly moves nothing along. Completion outranks the milestone when the
target is itself a multiple of 100 (most of them), and milestones stop once the target is behind
you: past the desired count there's nothing left to be partway to.

It is sounded from the `input` event, not from keydown like the click, because unlike the click it
**cannot be predicted from the keystroke** — a retyped selection removes cells as it adds one, and
a paste lands hundreds at once (and is still one crossing, not two). `counted` is the one piece of
remembered state in the engine, because a crossing is a comparison and the tape can only say where
the count *is*. It's maintained by `refresh()`, so everything that changes the count without being
a keystroke — `reset()`, a rebind, a rebuilt pad, a target change — resyncs silently instead of
sounding.

Collapsed rows consume no step, or the ladder would stop matching what the eye sees. Tuning lives
in `COUNTER_TONE_*` / `COUNTER_CHIME_*`; the `AudioContext` is one lazy page-wide singleton (built
on the first keystroke, since a context made before a user gesture starts suspended); every note
comes from `counterNote()` so the three sounds can't drift into different envelopes; and every
entry point swallows everything — sound is a nicety, and a thrown keystroke is not acceptable.

### The classic scheme (`MarrowCounterSounds.js`)
The previous app's six recorded sounds, **the default** (`COUNTER_SOUND_DEFAULT`), with the
synthesized figures above kept as the alternative. The choice is **page-wide** —
"Counter sound", one chip pair rendered once at the top of the shared settings panel
(guarded like the Save button; both counters are one sound system). The old app streamed them from
`diffpath.github.io`; here they are **base64-embedded in a generated file**, because the app must
work from `file://` offline (where `fetch()` of a local mp3 is refused) and may make no outbound
request from a screen with patient data. The file is **optional**: a template that doesn't load it
never offers the scheme, and `counterClassicSound()` answers false wherever the control or the
samples are absent.

The scheme swaps **sounds only, never logic**. The click maps by **key pressed** exactly as the
old app's `countNoise` did (`7`-`9` and `/` `*` high, `4`-`6` med, `1`-`3` low, `0` and `.` the
blast click; an unlisted key takes low — a fallback kept even though the alphabet is now exactly
those thirteen, since every counted keystroke must get a confirmation whether or not two lists
agree). `counterProgress()`'s crossing logic decides
*when* just as before; classic mode only substitutes `complete`/`hundred` for the two chime
figures. Decode is lazy (first classic playback, primed at `DOMContentLoaded` whenever the
resolved scheme is classic — with classic the default, effectively every load) and every playback
path **falls back to the synth sound** while a decode is in flight — a chosen scheme must still
confirm the keystroke.

**The first-sound delay and `counterWarmAudio()`.** Two layers sleep, and both had to be fixed. A
context built at load starts suspended, and `resume()` called from the first counted keystroke
lands that sound tens of milliseconds late — so the context is resumed on the first
`pointerdown`/`keydown` anywhere (at latest, the click that reaches the tape). That alone was not
enough: the OS audio endpoint (HDMI and Bluetooth paths especially) powers down after silence and
wakes with latency, so the first click after any quiet stretch still lagged. The cure is the
previous app's, imported deliberately: a **keepalive oscillator at gain 0.00001** (~-100 dB,
inaudible) started once the resume lands and never stopped, so the stream never goes silent and
the hardware never sleeps. Don't "optimize" it to gain 0 — exact digital silence is what lets the
endpoint sleep. The warm-up listeners are deliberately **not** `{ once: true }`: a synthetic event
carrying no user activation would burn the one shot without unblocking anything (observed under
browser automation), so they stay hooked until a `resume()` promise actually resolves — the
browser leaves it pending until a qualifying gesture — and unhook then.

`KEY_WIDTH` / `KEY_HEIGHT` / `KEY_GAP` in `MarrowCounter.js` are the **only** statement of the
pad's geometry: every grid's tracks are set inline from them and `.key` declares no width or
height, so there is nothing in CSS to keep in step. The rail (`.counterSide`) is a second grid
built from the same `rowTemplate()` as the pad, which is what puts "Current count" and its number
*on* tile rows rather than near them — they share one row template so they cannot drift. Keep the
pad's rows explicitly sized, not content-sized: a content-sized row cannot be reproduced by the
rail's separate grid.

**Count speed** is the rail's last line — under the M:E ratio on the aspirate, under the desired
count on blood (`config.meRatio ? 3 : 2`). The rate is `cells/min` over keystroke **intervals**:
each counted keystroke (a tape delta of exactly +1 — the signature that excludes pastes and
retyped selections) closes the interval the previous one opened, a gap longer than
`COUNTER_SPEED_GAP_MS` charges only the cap (a break is not slow counting), and the readout stays
`N/A` until `COUNTER_SPEED_MIN_CELLS` intervals exist — a rate off two clicks is noise wearing
units. The clock advances **only from the input path**, for the same reason the chime sounds only
from there: `reset()`, a rebind and a rebuilt pad move the count without anyone having counted.
`reset()` zeroes it (a cleared count is a new session); a re-render carries the reading across
like the tape and target. The comparison runs on `s.total`, not the denominator — an NRBC
keystroke is real counting work even where it moves no target — via `countedTotal`, maintained
by `refresh()` exactly as `counted` is.

The rail is **two lines, label then value** (`Current count 147` / `Desired count 200`), on two
columns so the two values line up under each other rather than each starting wherever its label
ends — the count and the target are the same kind of thing and must read as a pair. Only the
column gap is CSS; the row template and row-gap come inline from the pad, which is why the markup
sets `row-gap` and not the `gap` shorthand (an inline shorthand would beat the stylesheet's
`column-gap`). The lines take the pad's **first rows that render** — derived via `findIndex`, not
hard-coded, since `'Numbers only'` opens with an all-null row that collapses to `0px` and a line
in a `0px` row is unreadable. Bind a cell to `/` under `'Expanded'` and the top row comes to life
and the rail rises with it.

`.counterCount` and `.counterTarget` **share a box model, not just a type spec**. A number's x is
`border-left + padding-left`, and the two must be equal or the pair stops lining up — so both are
declared once, in the shared rule. The count's `border: 1px solid transparent` is **load-bearing,
not decoration**: it reserves the width of the select's border, and deleting it slides the numbers
1px apart. Only the *left* edge is the contract; `.counterTarget` overriding `padding-right` for
chevron room is fine.

The target select is **outlined like a key tile** (`#C7D0DA`, 8px radius, white) because it sits
on a tile's row among tiles. That requires `appearance: none`, which is not a style preference: a
native menulist **ignores `border` and `background-color` outright on macOS**, and insets its own
text by an amount no author rule can predict — so with it on, the outline can't be drawn *and* the
number can't be lined up. Turning it off makes the box ours (border + padding, nothing else),
which is exactly what the shared rule assumes; the chevron is then ours to draw too, hence the
inline SVG data URI (`#` escaped as `%23`, or the URL truncates) and the `padding-right` holding
its corner.

Per-cell flags replace the original's `cellType` enum: `inDenom` (circulating NRBCs are excluded
from the denominator — reported per 100 WBC), `suffix` (`'%'` vs bare), `hideWhenZero`, `range`,
`lineage`. `suffix` is explicit rather than derived from `inDenom`, because on the **aspirate**
NRBCs mean erythroid precursors: they count in the denominator *and* take a `%`. That prediction
came true exactly: `aspCells` and `bloodCells` differ on `nrbc` in `inDenom`, `suffix` **and**
`range`, and it is one cell with one set of fields.

## `excludes` — two ways of counting one thing

The sixth flag, and the newest. **Blasts**, **Promonos** and **Pros/blasts** exist because
promonocytes are blast equivalents in every myeloid classification: the 20% acute-leukaemia
boundary and CMML's own CMML-1/CMML-2 split are read on "blasts and blast equivalents", so a
differential offering only a Blasts key cannot state the number the criteria ask for. Both
conventions are in use — count the promonocytes apart, or count one combined bucket — and
`excludes: ['blast']` on `proBlast` says the combined bucket is an **alternative** to the separate
keys and not an addition to them. Declared on one of the pair and read both ways.

It is a **report-row rule and nothing else**. No keystroke is refused, no key is unbound, no count
is hidden from the tape; the engine's one promise is that what you counted is what it holds, and
an interlock that silently swallowed a keystroke while your eye is at the scope would break it.
What it does is stop the aspirate's always-on `Blasts 0.0%` row printing beside a
`Blasts & Promonocytes 10.6%` row — the same cells named twice. Suppression is conditional on the
row being **empty** (`supersededRow()`), so a case that somehow counted both prints both rather
than silently printing neither.

Both cells are **unbound** — no `defaultKey` — the same pattern as `atypical`/`other`: no tile and
no keystroke until someone assigns one in Key bindings, so a case that never binds either reads
exactly as it did before they existed. (They were on the letter keys `M` and `B` until those were
taken out; anyone working a monocytic case binds one over a key they are not using.) The report
reference is `[0, 0]` on blood (neither cell is found in normal blood) and **`null` on the
aspirate**, which is the `[0,0]`-vs-`null` distinction earning its keep again: a normal marrow
differential does not enumerate promonocytes at all, so nobody has published a range — do not copy
the blast row's `[0, 3]` onto the combined row.

`MarrowFindings.js` adds the keys up (`findingBlastPct`), so `f.blasts.marrow` and `.blood` ARE the
blast-equivalent percentages, and `f.blasts.equivalentsCounted` says whether they are known to be —
which is what lets a comment print "Blasts and promonocytes account for…" only when that is true.


## The cross-tab `applySettings()` clobber (`MarrowCounter.js`, DOMContentLoaded)
`applySettings()` writes storage into **every** `.setting` control on the page, and each tab calls it
at its own script scope (it must — see the load-order trap below). So the **second** counter's call
re-writes the **first** counter's stored bindings back over the healed ones its `render()` had just
resolved: the pad stays right, and the editor silently goes back to showing two keys on one cell.
Every instance therefore re-renders once on `DOMContentLoaded`, from inside `createCounter` — by
then every tab's `applySettings()` has run, so that is the last write. This lives in the **engine**,
not in a tab, so a third counter is correct without knowing the problem exists. It appeared the
moment a second instance did; nothing about it is the aspirate's.

`range` is `[low, high]`, and **`[0, 0]` is a claim while `null` is an absence of one** — keep them
apart. `[0, 0]` means the cell is not found in normal blood (blasts, NRBCs, anything left of the
band form, plasma cells), so `rangeText()` prints a bare **`0`**: a zero-width range read as an
interval is noise, and bare because zero is zero in every unit — which is also what keeps a `%` off
the NRBC row, whose value is a ratio and not a share. `null` means no reference is known and prints
nothing; no blood cell uses it, since a cell absent from normal blood has the most definite
reference of the lot. Never reach for `null` as shorthand for zero: on the aspirate most of these
cells have real ranges, and a config must be able to say "should be none" and "we have not said" as
two different things — the same reason `suffix` isn't derived from `inDenom`. A real range that
merely *starts* at zero (`[0, 8]` for eosinophils) is untouched by any of this.


## Counter settings (`renderSettings()` on each instance)
`counterKeymap()` / `counterLayout()` are the seam the settings read through: they resolve a
binding from the *controls* via `getSetting()`, so an edit is live on the pad immediately and
**Save only decides whether it outlives the session**. A page with no settings block (another
template, a counter that never rendered one) falls back to the config's defaults, so the engine
still runs standalone.

**`render()` is the only way the pad is ever drawn**, and it always re-reads the seam first —
mount and settings-change are one operation. This is load-bearing: the closure's `keymap`/`layout`
are seeded at `createCounter()` time, necessarily *before* the settings block exists and before
`applySettings()` restores anything into it, so anything that drew from those directly would show
the default pad to a user who had saved their own bindings, every session. `draw()` (the markup)
and `rekeyTape()` (the transliteration) are each half of `render()` and are deliberately **not
exported** — either half alone desynchronizes the pad from its settings, or the tape from its
keymap. `render()` also carries the tape text and the target select across the rebuild; they are
case data, and a rebind may cost neither.

Each instance mounts its own block into `config.settingsPanelId` (`'differentialSettingsPanel'`
for blood) titled `config.settingsLabel`, so the aspirate's block will land beside it with no
coordination beyond the one shared Save button (`counterPanelSave()` keeps exactly one, last).

**The editor IS the pad.** `renderPadEditor()` builds a second numpad from the same `layout`, the
same `KEY_*` geometry and the same `rowTemplate()`, with each tile's percent swapped for a
`<select>` of which cell that key means. So the settings are indexed **by key**, like the keymap
they write and like the pad they edit: position is the key, and the one editable thing is the cell
on it. (A list of cells each picking a key was the first cut and was wrong — it puts the tile you
are editing somewhere other than where it lives, and makes it hop as you edit.) `render()` draws
both pads from one adopted `keymap`/`layout` pair, so a layout change lands on the counter and the
settings in the same breath — they are one render, not two views kept in sync.

Storage is therefore **one setting per key** (`pbCell_7` = `'meta'`), not per cell.
`COUNTER_KEY_SLUGS` exists because `.` `/` `*` are CSS selector syntax and the setting id is an
element id.

**The assignable alphabet is `COUNTER_PAD_KEYS` alone** — digits, `.`, `/`, `*`. The letter keys
(`P`/`A`/`O`/`M`/`B`) are **not** assignable and get no control anywhere: both counters have fifteen
cells against thirteen pad keys, so some cells must live off the numpad, and a row of tiles for keys
no layout can ever show is a row of controls for a pad you are not looking at (the author's call).
They still **count** — that is the engine's one promise and it is untouched — they are simply fixed,
because `getSetting()` reads the *control* and a key with no control always answers with its default
cell. A letter binding saved before this rule is ignored on read and dropped from storage by the next
Save, so there is no stale state to migrate.

`hasSlot()` is the editor's predicate and the weaker half of `hasTile()`: an unbound slot gets an
**editor** but no tile. That is the one place the two pads legitimately differ, and it has to be
that way — nothing to count is not nothing to assign. `rowTemplate(present)` takes the predicate
rather than assuming one, so the difference can't become two copies that drift.

**The pad and the off-pad row together always cover the assignable alphabet**, and this is
load-bearing rather than tidiness: the split between them is derived from the layout alone (never
from what is bound), so `renderSettings()` can build every assignable key's control *before*
`applySettings()` runs. A key with no control is a key `applySettings()` cannot restore — and a cell
saved onto it would be silently lost on the way back in, since `counterKeymap()` reads controls.
The letter keys sit outside that alphabet and so outside the trap: nothing can be saved onto a
control that does not exist.

The off-pad row therefore means exactly **"the keys the other layouts would give you"** — `.` `/` `*`
under `'Numbers only'`, and *nothing* under `'Expanded'`, which is a state that could not arise while
the letters were in it. `renderPadEditor()` hides the whole block when it is empty; an empty grid
under a heading reads as a block that failed to load.

**Rebinding swaps, never overwrites**: putting a cell on an occupied key hands the displaced cell
the key the newcomer gave up. Refusing would make the pad argue with you; letting it through would
drop a cell from the keymap, which is the one thing this engine won't do. `displace()` only ever
moves the *other* select, off the still-outgoing `keymap`. `counterKeymap()` enforces the bijection
independently (second claim on a cell dropped; any keyless cell falls back to its default, then the
first free key) because a blob saved against an older cell list can still collide. `—` is a readout
of a free key, never a command: `disabled`, so it can be shown and set programmatically but never
chosen — there is no "unbind" to express. Since the editor is seeded from the resolved `keymap`
rather than from the controls, a stale blob is **healed on screen** instead of left disagreeing.

Keys and layout stay orthogonal, exactly as `keymap` and `layout` do: choosing `'Expanded'` only
*offers* `.` `/` `*` slots — they stay blank (dashed, `.keyEdit.isEmpty`) until a cell is put on
one, which is how a letter-bound cell (Plasma) gets a tile at all. Nothing auto-assigns.

Percentages use **largest-remainder (Hare)** so the denominator column sums to exactly 100.0%.
Do not port the original's force-sum loop (`../Marrow/Marrow.js:1151-1189`): it divides by each
cell's count (Infinity on any zero), indexes `table[-1]`, and loops on a drifting float compare.

