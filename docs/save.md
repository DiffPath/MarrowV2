# Saving a case

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The two stores, the fixed-point restore, and the handshake that keeps two windows
> off one draft. Read before adding a control that holds state the DOM does not.

`MarrowSave.js`. **Loads early** — after `MarrowSettings.js`, before every tab — because it
defines `registerCaseState()` and a tab file calls that at its own script scope, exactly as it
calls `registerReportSection()`. It runs nothing at load: the whole bootstrap is a
`setTimeout(0)` off `DOMContentLoaded`, which is the only ordering guaranteed to be *last*
(listeners fire in the order they were added, and a restore has to happen after
`buildReportSections()` and after the counters' final `render()`).

## Two stores

| | key | written by | shape |
|---|---|---|---|
| **Named saves** | `marrowCasesBM` | you pressed Save | `{ "<name>": { savedAt, data } }` |
| **The draft** | `marrowDraftBM:<caseId>` | nobody pressed anything | `{ savedAt, caseId, name, data }` |

Settings are neither — they live under `MARROW_SETTINGS_KEY` and are preferences that outlive
a case. Nothing in this file reads or writes them, and capture skips `class="setting"` so a
case can never carry someone's bindings into another case.

**One draft per case, rewritten in place.** An autosave that appends is a thousand
near-identical marrows by lunchtime, and finding the right one costs more than retyping the
case. Every write lands on the same key; the write is debounced 1500 ms and then deferred to
idle, so a burst of counting is one write and no keystroke ever waits on JSON.

**A pristine case gets no draft at all.** The empty worksheet is captured as JSON at bootstrap
(`casePristine`) and a snapshot equal to it removes the draft instead of writing one — so a
page opened and abandoned leaves nothing behind, and undoing every change takes the draft back
down. This is also what makes New Marrow honest.

## Which draft is whose

`caseId` lives in **sessionStorage**, which is per tab and survives a reload. That alone gets
two of the three cases right: F5 finds the same draft, and a second window opened from the
drawer mints its own id and cannot touch the first one's.

The third case is a **duplicated tab**, which the browser hands a *copy* of sessionStorage —
two live pages holding one caseId. A reload and a duplicate are indistinguishable from the
inside, so the question is asked out loud, over `localStorage`'s `storage` event (delivered to
every *other* page on the origin and to no other page):

1. On load, write `marrowPingBM:<caseId>` and note the time.
2. Any live page holding that caseId hears it and answers at once, by writing its token and the
   clock into `marrowBeatBM:<caseId>`.
3. 400 ms later, look. **An answer stamped after the ping** means someone else holds the case:
   restore the content anyway — it is what the user was looking at when they duplicated — but
   **fork**, minting a new caseId so the two pages own one draft each from here on.

Comparing against the ping's own timestamp rather than against a staleness window is what makes
this survive a crash: a beat left behind by a page that died cannot be newer than a question
asked afterwards, so it never answers. Every page also beats every ten seconds and clears its
beat on `pagehide`; that beat is what the Save page reads to say "open in another window", and
a beat younger than one interval is trusted *unanswered*, for the backgrounded tab whose timers
Chrome has throttled but whose data is still live.

**Forking is the safe direction** and nothing rides on getting it exactly right: a fork that was
not needed costs one extra row in the drafts list, where a missed one costs two windows
overwriting each other's marrow.

The restore happens *before* the handshake and the identity is settled after — what is on
screen is the same either way, so there is no reason to make anyone watch. `caseClaiming` holds
draft writes back in the meantime, and `draftPending` is what stops an edit made inside that
400 ms from being dropped.

## Capture: everything with an id, and a registry for the rest

Every `input`/`select`/`textarea` under **`#inputPanel`** that carries an id. Scoped to that
panel rather than the document because the panel *is* the case — the settings live in
`#settingPanel` and the report in `#templatePanel`.

Two exclusions, both by class on the control itself:

- **`noSave`** is the PHI marker (`CLAUDE.md`): `#pbCBC`, `#ngsPaste`, `#ancIscn`. What that
  costs on restore is the ISCN karyotype string, which *is* a finding — `ancKaryotypeText()`
  answers `''` after a restore. The abnormality **list**, which is what the diagnosis engine
  reads, comes back whole.
- **`setting`** — belt and braces, for a settings control rendered into an input tab.

Checked boxes store a bare `1` and unchecked ones nothing; everything else stores its value
**including the empty string**, because a select that is empty in the snapshot and full on
screen has to be emptied on restore and an absent key cannot ask for that. Unchecked boxes get
the same service from the single `clearControls()` pass. A maximal case — every immunostain on
both sections, every red-cell descriptor, a 300-cell tape — is **4 KB**.

Anything that is *not* one of those controls registers itself:

```js
registerCaseState({ id, capture, restore, rebuild, settle });   // all four optional
```

| hook | when | for |
|---|---|---|
| `capture()` | on every draft write | state the DOM does not hold, or holds without ids |
| `restore(v)` | once, before the passes | the same, put back. Called with `undefined` for a snapshot older than the handler |
| `rebuild()` | after **every** pass — must be idempotent | a growing list that builds itself from its own DOM |
| `settle()` | once, after the passes | derived UI no event will fire for |

Registered today: `descriptors` and `stains` (rebuild only), `ancillary` (the NGS rows and the
abnormality selects — **the only two controls in the app with no ids**), `cbc`, `comment`,
`spec`, `pbCounter`, `aspCounter`.

## Restore is a fixed point, not a dependency graph

Half the controls in this app do not exist until another control names them. Choosing
"Schistocytes" is what creates the qualifier chips beside it *and* the empty select below it;
naming a stain is what creates its result dropdown, its percentage boxes and its tape. A single
write-everything-by-id pass restores the first row of every list and silently drops the rest.

So: **write what exists, let every list rebuild, and go round again until a pass changes
nothing.** Each round makes the next row exist, so it converges in as many passes as the
longest list is long (`CASE_RESTORE_MAX_PASSES` is 60 against a longest list of 19), and the
app's own rebuild functions do all the work of deciding what a row looks like. Nothing in
`MarrowSave.js` knows what a descriptor or a stain is. A maximal case restores in ~100 ms,
once, on load.

A value the control refuses — a select option that no longer exists, under an old snapshot —
leaves the control empty and reports **no change**, or the loop would spin forever trying to
write it.

**No events are dispatched.** Setting `.checked` from code deliberately does not fire `change`,
and that is what makes this safe: a snapshot is already internally consistent, so re-running the
toggle-group, stop-chip and single-parent handlers over it could only undo it (the exclusivity
handler clears every chip in a group that is not the event's `target`, and a restored group has
no target). What those handlers would have maintained is maintained by `settle()` instead —
`syncSpecAll()` for the "All specimens" indeterminate state, `counter.refresh()` for the pad's
percentages and the report table.

The autofills are deliberately **not** re-run. `syncAspPredominance()` and
`syncCoreCellularity()` answer a *paste*, not a reload: the chip they would set is itself saved,
so re-deriving it would overwrite whatever the user chose over it.

## PHI

The rule as stated in `CLAUDE.md` is `noSave`, and that is honoured. Two decisions go past it,
both in `MarrowCBC.js` where the state lives rather than here:

- **The parsed CBC values are saved.** They are a whitelist of numeric components and they are
  report content — without them a restored case loses its clinical table.
- **The collection timestamp is not.** A date tied to an individual is an identifier under
  HIPAA's own Safe Harbor list, and it is not a result; the marrow reads the same whichever
  draw it was. `SAVE_CBC_COLLECTED` is a constant rather than an inline `delete` because the
  decision belongs to whoever deploys this, and it should be one word to change and impossible
  to change by accident. A restored case shows the values without the "Collected" line;
  re-pasting the CBC brings it back. **This is the only difference between a case and the same
  case restored** — verified by diffing the whole rendered report before and after a reload.
- **Age is never saved.** `cbcAge` stays out for the reason its own comment gives; the only
  thing that reads it is the core cellularity autofill, and a restored case already carries the
  cellularity that autofill produced.

## The tapes

Both the differential tapes and the stain tapes are saved **as typed**, in key characters, and
that is deliberate: the tape *is* the tally, and storing the derived counts instead would throw
away the backspace/paste/undo the model exists for. The key bindings are a **setting** and
outlive any case, so this is stable in practice; a case saved under one set of bindings and
loaded under another re-reads as the new bindings say — the same thing that happens to a tape
already on screen when the keys are rebound, minus the transliteration that would have kept it
honest.

## New Marrow

`marrowNewCase()` (called from `MarrowReport.js`'s button, guarded so a template that never
loaded this file still has a working New button) drops this case's draft and beat and forgets
the caseId, so the reload mints a fresh one and comes up empty. Without it the reload would
find the draft and restore the case that was just cleared. Named saves are untouched.

## The Save page

`#savePanel`, filled from here. The body is found by **selector, not id**, so the shell chrome
stays byte-identical across template entry pages — the only per-template line is still the
`<script>`.

Three blocks: the name box and Save button (one line, because naming a marrow and saving it are
one act), the named saves, and the drafts. This window's own draft is **shown but not offered** —
loading it would replace the worksheet with what the worksheet already is, and discarding it is
what New Marrow is for. Naming it is the point: it tells you which row *not* to touch when a
second window has one too.

**Nothing on the page explains itself in prose.** A standing note saying what a draft is was
written and cut — the rows already carry a timestamp each, this window's is marked, and one open
elsewhere says so. The same applies to the status line under the name box: it says when, not
what, because the name is in the box directly above it.

Ctrl+S / Cmd+S saves under the current name, or opens the page to ask for one.

The page re-renders on every autosave, so a half-typed name is preserved **with its caret** —
and only while the box has focus, so that after a Save or a Load the box shows the name this
window is now working under.

## Gotchas

- **An autosave never toasts.** One that interrupts is worse than one that fails; a storage
  failure is reported on the Save page's status line, and manual Save reports properly.
- **The autosave listeners are document-level**, not `#inputPanel` — the report comment is
  edited in the *right* panel and a counter rebind in the settings transliterates the tapes.
  `#savePanel` is the one place excluded: typing a name is not a change to the case.
- **A `rebuild()` runs up to 60 times.** Anything expensive belongs in `settle()`.
- **A handler that throws does not take the restore with it** (`caseRunHandlers` catches and
  logs). A case that comes back missing its variants is recoverable; a blank page is not.
