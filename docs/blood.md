# The Blood tab

## The red cell Morphology row is stacked, in three tiers

`Unremarkable` / `Polychromasia · Rouleaux · NRBCs` / `Anisopoikilocytosis`, one under the
next inside a single `.chipStack` in one `.findingChips` cell. **The split is by how each
chip behaves, not by what it means:**

- **Top** is the stop chip alone. `Unremarkable` negates everything under it (the
  `data-stopgroup` handler in `MarrowForm.js`), so it is not one option among four and
  should not sit in a line with them.
- **Middle** is the three findings that are only ever a chip plus a qualifier. They never
  change height.
- **Bottom** is anisopoikilocytosis and the descriptor list it owns, which grows a line
  every time a poikilocyte is named. On one wrapping flex line that growth reflowed the
  chips after it; on its own tier it grows downward into empty space. Measured: naming two
  poikilocytes now moves the middle tier by 0px.

`bloodRbcFeatures` holds the middle three and `bloodRbcAniso` the bottom one — a one-item
list rather than a bare object so both tiers render through the same map. **Their order is
the on-screen order and nothing else reads it**: `fillBlood()` assembles the sentence from
named ids, so moving an entry moves a chip and never a word of the report.


> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The CBC autofill, the blood thresholds, and the blast morphology row.

## Blast morphology (`pbBlastDesc`, `bloodPresenceText`)

The Blasts row of the presence matrix carries a morphology dropdown after its five None-through-
Frequent chips, offering `BLAST_DESCRIPTORS` — the same list the Aspirate tab offers, held once in
`MarrowDescriptors.js` because the diagnosis engine reads Auer rods out of both groups. **No
"Unremarkable" stop chip** (a circulating blast is abnormal by its presence, so there is no normal to
assert) and **no cell at all on the plasma row** (the Blood tab has no plasma descriptor list, so the
column is left empty rather than invented — the same as the eosinophil and basophil rows above). This
is what gave `.presenceMatrix` its seventh column; see [the highlight-cue notes](highlight-cue.md).

**A named morphology breaks every merge.** All three combined shapes put one adjective in front of
both nouns — "Rare circulating blasts and plasma cells are identified" — which cannot survive a
qualifier belonging to one of them: *"rare circulating blasts with Auer rods and plasma cells"* reads
as plasma cells with Auer rods. So the blasts take their own sentence.

**Naming a morphology is itself the assertion that the blasts are there**, so the list can carry the
sentence with no presence chip set ("Circulating blasts with Auer rods are identified") — but it must
never contradict one, so a chip saying `No` suppresses it entirely.

**The shift-to-immaturity swallow carries the morphology across with it.** A named shift already
absorbs the blast count into the neutrophil sentence so it is said once; the morphology now rides in
the same phrase — "a mild shift to immaturity including rare blasts with Auer rods" — because a
morphology left behind for a sentence that will not be written simply vanishes. `bloodBlastSwallowed()`
is the single test both halves read, rather than the condition written out twice.

## The CBC autofill (`bloodApplyCBC`, on the `cbcParsed` event)
A pasted CBC already answers half the Blood tab: Epic flags every result against the lab's
reference range, so "is there anemia" is decided before the slide is on the stage, and making the
user re-answer it is asking them to transcribe. Ported from `../Marrow/MarrowText.js:128-260`.

**One table, two readers.** `bloodCbcRules` says which component answers which toggle group;
`bloodApplyCBC()` reads it to fill the form and `renderBloodSettings()` reads it to render that
rule's thresholds — so a rule and its settings cannot disagree about which thresholds exist. A rule
with no `severity` (MCV) gets no settings rows at all.

Absent `low`/`normal`/`high` means **the sentence does not exist**: eosinophils are never called
low or adequate, monocytes never adequate, so a CBC saying so chooses nothing. That's the old map
leaving the key out, and it's why an in-range eosinophil count is silence rather than a finding.


**Thresholds ship unset, deliberately** — all 22 *blood* thresholds, exactly as the old app did.
The aspirate's two predominance limits are the exception and ship at 4:1 and 1:1, because the old
app committed to those values. What counts as marked
anemia is a clinical judgement and the app has no business inventing one (and CLAUDE.md's
"thresholds are meaningful" rule says so). An unset threshold parses to NaN, every comparison
against NaN is false, and `bloodGradeFrom()` falls through to "no grade" — so out of the box a CBC
picks the finding and leaves the grade alone. The NRBC limits (0.3 / 1.0) are the only ones the old
app shipped with values, so they're the only ones carried over.

The bounds read **outward from the reference range** and mirror between directions: for a High
result "mild" is the one that hasn't gone far (below the mild bound) and "marked" is past the
marked bound; Low is the reverse. Between them the finding is graded by neither, which is a real
answer. The settings labels spell the operator out ("Mild ≥") because getting one backwards is
silent — the grade just never fires.

Two knowing deviations from the old app, both where it was plainly broken rather than deciding
something: NRBCs autofill from **either** the percentage or the absolute count (it required both,
and had a dead `else if` clearly meaning otherwise), and the spacing fix noted above.

