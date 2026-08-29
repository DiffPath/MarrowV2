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


**All 22 thresholds now ship with values.** They used to ship blank, as the old app's did, on the
reasoning that what counts as marked anemia is a clinical judgement the app has no business
inventing. That was reversed at the author's instruction: twenty-two empty boxes is not neutrality,
it is a form nobody fills in, and an ungraded CBC on every case is itself a clinical outcome. Two
rules generate the whole table, and each row's comment in `bloodCbcRules` says which one it follows
and where it departs:

- **Marked = the critical value**, the number the lab would phone. Four components have no published
  critical value (lymphocytes, monocytes, eosinophils, basophils); there the severe end of the
  conventional grading stands in.
- **Mild = a round number 10–15% or less outside the reference range** — avowedly arbitrary, and
  close enough to normal that "mild" means "abnormal and barely so".

Three rows depart and say so: **neutropenia** takes the standing 1.5 / 0.5 lines rather than a bound
derived from the reference floor, because those are what every other document the reader has seen
uses; **eosinophilia** takes 1.5 / 5.0, the international consensus boundaries for hypereosinophilia
and its severe band (Valent et al., *J Allergy Clin Immunol* 2012;130(3):607-612), which is why its
mild bound sits at three times the reference ceiling; and **lymphopenia** has both bounds at 0.2,
because `ignoreBetween: [0.2, 4.0]` means nothing above 0.2 ever reaches grading and every
lymphopenia this app reports is already past the mild question.

They are **defaults, not constants** — a `value` on the input, so `applySettings()` still writes a
saved setting over one, and a box someone cleared and saved stays cleared. An empty threshold parses
to NaN, every comparison against NaN is false, and `bloodGradeFrom()` falls through to "no grade";
that remains the way to say *do not grade this one*, and shipping defaults must not take it away.
**Restore defaults** (`bloodRestoreThresholdDefaults()`) puts the whole panel back, thresholds and
NRBC limits alike — the counter's button and the counter's contract, reverting the controls and
leaving Save to decide whether the reversion outlives the session. It is also how anyone whose saved
settings predate the defaults gets them, since a stored `''` would otherwise win forever.

The bounds read **outward from the reference range** and mirror between directions: for a High
result "mild" is the one that hasn't gone far (at or below the mild bound) and "marked" is past the
marked bound; Low is the reverse. Between them the finding is graded by neither, which is a real
answer — and with these defaults it is the *common* answer, since mild sits near the reference range
and marked at the critical value: a haemoglobin of 9 is anemia that neither word describes, and the
report says "There is anemia" with no adjective. The settings labels spell the operator out
("Mild ≥") because getting one backwards is silent.

**The mild bound is inclusive, matching its label.** It was `>` against a label reading `≥` until the
defaults landed, so a value sitting exactly on the bound — 130 platelets against `Mild ≥ 130` — was
graded by neither word. Round default bounds make that likelier, since a CBC reports round numbers.
`bloodGradeFrom()` also tests **marked first**, which states the priority plainly now that the two
bounds can meet (they do on the lymphocyte row).

Two knowing deviations from the old app, both where it was plainly broken rather than deciding
something: NRBCs autofill from **either** the percentage or the absolute count (it required both,
and had a dead `else if` clearly meaning otherwise), and the spacing fix noted above.

