# The bone marrow failure candidates

> Split out of the root `CLAUDE.md` like the other family notes, and read alongside
> [diagnosis.md](diagnosis.md), which holds the engine this family scores against.
> `MarrowDxBmf.js`: aplastic anemia, pure red cell aplasia, acquired amegakaryocytic
> thrombocytopenia, agranulocytosis.

## The family that has no classification behind it

Every other family file encodes a criteria box. This one cannot, and that is not a gap in
`docs/who/`: **neither WHO-HAEM5 nor ICC 2022 classifies any of these entities**, because both
documents are classifications of neoplasia and none of these is a neoplasm. There is no box to
paste, so the repo's usual remedy — paste the chapter, read the rule against it, correct the shape
— is unavailable here and always will be.

Against a record of **ten pasted sources correcting ten rules written from memory, nine of them in
the rule's shape rather than in a threshold**, that is worth taking seriously rather than noting.
The mitigation is `MarrowDxPcn.js`'s: **gate only on what a marrow can show, and put everything
else in the caution.** Every one of these is a clinical diagnosis of exclusion, and the app is
holding a slide.

## One pasted source does speak to aplastic anemia, from the other side

`docs/who/mds-h-and-mds-ib.md` — the hypoplastic MDS chapter — describes aplastic anemia because
AA is what hMDS has to be told apart from. Five of its sentences are load-bearing in this file and
each is quoted at the clause it produced:

| the chapter says | it produced |
|---|---|
| "…aplastic anaemia, which typically shows a marked decrease in megakaryocytes and haemoglobin F–containing erythroblasts" | the +3 megakaryocyte support |
| "Aplastic anaemia may be associated with dyserythropoietic changes … hence, morphological support for a diagnosis of hMDS requires identification of dysplastic features in myeloid and/or megakaryocytic lineages" | `dxBmfExcludeDysplasia`, which names **two** lineages |
| "Patients [with hMDS] are usually younger than those with other MDS types but older than those with aplastic anaemia" | the age weight |
| "When cellularity is extremely low, it may be virtually impossible to distinguish hMDS from aplastic anaemia by cytomorphology" | the conditional caution |
| "When PIGA mutation is demonstrated in the absence of bona fide features of MDS, classification as paroxysmal nocturnal haemoglobinuria is preferred" | the PNH caution |

**And one sentence took a clause away.** A relative marrow lymphocytosis was written as a +1
support — an emptied marrow over-represents what survives it, which is true — and the same chapter
says hMDS too "may show an accompanying large granular lymphocyte expansion". A finding both sides
of a differential show cannot rank one above the other, so the clause is gone. It survives on the
PRCA rule, where what it points at is a **cause** (T-LGL) rather than a diagnosis, and it says it
in the caution rather than scoring.

**AA against hypoplastic MDS is the call this family exists to put in front of a reader**, and the
two rules partition on the criterion the hMDS box itself partitions them on. **Nothing changed on
the `mdsH` side**: its essential criterion "hypocellular bone marrow … not explained by
non-neoplastic bone marrow failure conditions" is already operationalised by
`dxGate.myeloidOrMegDysplasia`, which is how its own chapter operationalises it.

## What the marrow cannot answer here, and where each gap is stated

**The reticulocyte count is the load-bearing absence.** It is not in `cbcComponents`
(`MarrowCBC.js`), so it cannot be parsed out of a paste at all. It is definitional for pure red
cell aplasia and is one of Camitta's three limbs for severity — so it is stated in both cautions
and gated in neither. Wiring it in is one line per component plus a finding, and the blocker is
that **the Epic row label has to match exactly** (`parseCBC` matches `cells[0]` against
`cbcUnits`), so a guessed label would parse nothing, silently.

Also unrecorded, each named at the rule that needs it: the PNH clone by flow cytometry, T-cell
clonality, parvovirus B19 serology or PCR, thymoma on imaging, the drug and toxin history, and the
chromosome-breakage and telomere-length studies that answer the inherited syndromes.

## Camitta severity, and why it is counted three-valued

    Severe:       cellularity < 25%, with at least TWO of
                    neutrophils < 0.5 ×10⁹/L, platelets < 20 ×10⁹/L,
                    reticulocytes < 20 ×10⁹/L (or < 1% corrected)
    Very severe:  the same, with neutrophils < 0.2 ×10⁹/L

The reticulocyte limb is carried as a permanent `null` and the limbs are counted the way
`dxBmfCytopenias` counts cytopenias — which answers three cases correctly where "how many can I
see" answered one:

| counts | answer |
|---|---|
| ANC 0.3, platelets 12 | **severe** — two met is two of three whatever the third is |
| ANC 0.3, platelets 30 | **unknown** — one met, one limb left, and the reticulocyte decides it |
| ANC 0.7, platelets 30 | **not severe** — one limb cannot make two |

The first version returned "not assigned" for all three, so a marrow whose counts settled the
question printed a note asking for a test that could not have changed the answer.

**The cellularity limb is ANDed in**, since severity is "< 25% *plus* two of three". Where no
percentage was typed a **markedly** hypocellular chip answers it — the pathologist's own statement
of the same fact, the same substitution `cellularity.hypoForAge` already makes. A *mildly*
hypocellular chip does not.

## What the rules read that nothing read before

`f.lineages` (`MarrowFindings.js`) is new and exists for this family. Every lineage field that
predates it asks how a line **looks**; these ask whether it is **there**, which neither `dysplasia`
nor `cellularity` can say.

- **The count first, the chip second** — the blast row's order, deliberately not the cellularity
  row's. There the chip wins because the arithmetic is a published band applied to one typed
  number; here the number *is* the pathologist's own 500-cell differential.
- **The floors are the counter rows' own published ranges** (`aspCells`, `aspNeutPool`), read
  rather than copied. `LINEAGE_ABSENT_PCT = 1` is the one number no row publishes, and it scores
  rather than gates.
- **`granulocytic` is the neutrophil pool, not the counter's `myeloid` lineage tag**, and the
  difference decides whether agranulocytosis is visible at all: that tag also carries eosinophils,
  basophils, monocytes and conditionally the blasts, every one of which is preserved in the entity
  whose whole finding is that the neutrophil series is gone.
- **`granulocytic.leftShift` is three-valued, and it had to be.** `findingAuerRods()` is
  true-or-null because nothing on that row asserts the negative; this row has an Unremarkable stop
  chip, so a granulocytic line called unremarkable is a real `false`. Without that limb Kleene's OR
  keeps the agranulocytosis marrow gate permanently `null`, and the entity is offered on every
  isolated neutropenia there is.

## Two weights the vignettes found, and one they took away

Running the family through the harness — not reading it — turned up the same defect in three rules:
**the entity's defining finding scored nothing, because it gated.** The kernel's own doctrine says
why that is wrong (a gate decides eligibility, a weight decides rank among the eligible), and the
symptom was concrete: acquired amegakaryocytic thrombocytopenia scored **0 against ICUS's 4** on a
marrow with an isolated thrombocytopenia and no megakaryocytes. Each rule now scores its own
lineage at +4.

**PRCA was the harder version of it.** Its two supports both needed a *counted* differential
("erythroid precursors below 1%", "a markedly elevated M:E ratio"), so on the ordinary path —
chips, no 500-cell count — clicking *markedly decreased erythroids* moved nothing and MDS-LB
outranked it on an unassessed marrow. The two were also **one observation arriving by two
arithmetic routes**, so a counted case was paid twice for one finding. Both are now the single
`erythroid.absent` clause, which reads the count where there is one and the chip where there is
not; the ratio is printed in the comment, where it informs without scoring.

**`dxLikelihood.lineageAplasia` is the other half of that fix.** ICUS was being paid full price for
an "unexplained" cytopenia that had just been explained — a marrow with no erythroid precursors
accounts for the anemia completely, and "idiopathic", "of undetermined significance" and "no
morphologic evidence of a myeloid neoplasm" are all claims that it did not. The three absences
score −3 / −2 / −2 against those rules. **The granulocytic left shift is deliberately not in that
test**, though the agranulocytosis rule scores it: a myeloid left shift is one of the commonest
findings in marrow practice, and reading it as an explanation would penalise ICUS on half the
differential.

`dxLikelihood.marrowHypocellular` is the third registry entry, and it closes the gap
`dxInputCoverageAudit`'s own header names as its worked example. **`mdsH` is weighted alongside the
new rules on purpose** — paying aplastic anemia for hypocellularity and leaving its one real
competitor unpaid would separate the pair by which rule happened to be written second. The
`against` limbs are asymmetric for a stated reason: AA *gates* on the finding, so a normocellular
marrow has already left its differential and a negative weight would be arithmetic on a dead rule;
`mdsH` gates on the tighter percentage, which is null whenever nobody typed one, so a normocellular
chip does real work there.

## Genetics: one rule is three-valued and three are collapsed

Aplastic anemia keeps the three-valued `dxExcludeDefinedNeoplasm` and therefore sits at `pending`
with the study named whenever cytogenetics are out — which is the true state of it, since the
karyotype is half of the AA/hMDS distinction. The three single-lineage rules use a collapsed
`=== true` variant (`dxBmfExcludeClonal`): an isolated erythroid aplasia is not waiting on that
question, a normal karyotype would not make it any more a PRCA, and without the collapse all three
would read as awaiting studies nobody ordered. Same argument as `dxExcludeSubthresholdClone`'s, one
file over.

## Priors

On the table's one denominator — a share of the marrows that reach this differential, never a
population incidence.

| rule | prior | why |
|---|---|---|
| `aplasticAnemia` | −1 | uncommon overall (2–3 per million per year), and much the commonest member of this family |
| `prca` | −2 | rare, and reached only by a marrow whose erythroid line is absent with the other two intact |
| `agranulocytosis` | −2 | uncommon, and usually drug-induced rather than primary |
| `amegakaryocytic` | −3 | the least often reached member |

## What is deliberately not a rule

- **PNH.** Not a morphologic diagnosis and the flow cytometric clone is unrecorded, so it is a
  caution on aplastic anemia carrying the hMDS chapter's own precedence sentence.
- **Inherited bone marrow failure.** No dysmorphology, family history or breakage/telomere input
  exists. It is an age-conditional caution (< 40, or no age pasted) naming the hMDS chapter's own
  gene list — GATA2, DDX41, Fanconi, telomerase complex.
- **T-LGL and thymoma.** Causes of PRCA rather than competing diagnoses, and both are cautions;
  the T-LGL one fires harder when marrow lymphocytes are actually increased.
- **Parvovirus B19.** Giant proerythroblasts have no descriptor key, so the caution asks for the
  slide to be reviewed and for PCR rather than pretending the app can see them.

## Still open

1. **No reference topic exists for any of the four**, so their cards carry no Criteria link where
   most other candidates do. Written from memory they would each need an `unverified` flag, and
   nothing can ever clear it by pasting a criteria box — see the top of this file.
2. **The reticulocyte count** (above). It is the single change that would most improve this family.
3. **No workup type reaches this family.** `dxWorkupBonus` maps five template entities and none of
   them is a cytopenia or marrow failure workup, so `family: 'bmf'` never receives the bonus. That
   is honest as it stands; adding a sixth column to the Specimen matrix is a UI decision.
