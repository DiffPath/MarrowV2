# The MPN candidates (`dxRules`, the `mpn` and `overlap` families)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Eight entities plus the overlap; fibrosis may gate, megakaryocyte morphology may not.

Eight entities: **CML**, **PV**, **ET**, **prefibrotic PMF**, **overt PMF**, **CNL**, the residual
**MPN-NOS / MPN-U**, and the overlap entity **MDS/MPN-SF3B1-T**. CEL and JMML are deliberately absent
— CEL needs the *PDGFRA/PDGFRB/FGFR1/JAK2* fusion exclusions the app collects no input for, so it
could only ever sit at `pending`, and JMML is paediatric.

**FIBROSIS GRADE MAY GATE; MEGAKARYOCYTE MORPHOLOGY MAY ONLY SCORE.** This one rule shapes the whole
section and it is an evidence claim, not a taste. Fibrosis grading reproduces at **kappa ≥0.8** across
observers; the ET-versus-prefibrotic-PMF morphologic call reproduces at **kappa 0.41**, with six
hematopathologists reaching full consensus on **13%** of non-fibrotic trephines (*Haematologica*
2012;97:360). Weighting the two alike would assert a confidence the reference standard does not have.
So `MF ≥ 2` is a hard exclusion of ET and prefibrotic PMF and a requirement of overt PMF, while every
megakaryocyte feature is a support point.

**THE CML RULE WAS SCORED OFF HALF A PARAGRAPH, AND THE HALF IT KEPT WAS THE NEGATIVE ONE.** Worth
knowing before reading any other rule written the same way. The chapter's histopathology opens:
*"The peripheral blood shows leukocytosis (white blood cell count: 12–1000 × 10⁹/L, median: ~80 ×
10⁹/L) due primarily to neutrophils in various stages of maturation, with peaks in the proportions
of myelocytes and segmented neutrophils. … Granulocytic dysplasia should be absent. Absolute
basophilia and eosinophilia are common."* What was encoded from it was **`granulocytic dysplasia
absent`** — the one clause that is an absence and the only one that cannot raise CML above a rival.
The maturation spectrum had no clause at all; basophilia existed only at the ≥20% *high-risk*
threshold and not at the "common" one this sentence is about; eosinophilia was worth one point; the
count's **magnitude** was invisible behind a boolean at ≥11; and the dwarf-megakaryocyte half of
*"increased in number … typically with altered morphology that includes small size and hyposegmented
nuclei"* was dropped while the number half was kept. What is scored now:

| finding | was | now |
|---|---|---|
| BCR::ABL1 | +4 | **+8** (pathognomonic tier) |
| neutrophilic leukocytosis (`expects`) | +1 / −3 | **+4** / −3 |
| WBC ≥25 / ≥50 / ≥100 ×10⁹/L | *nothing* | **+2 / +3 / +4**, registry ladder |
| circulating immature granulocytes | *nothing* | **+3** |
| absolute basophilia (≥2%) | *nothing* | **+2** |
| basophilia ≥20% (high-risk feature) | +2 | +2 |
| eosinophilia | +1 | **+2** |
| dwarf (small hypolobated) megakaryocytes | *nothing* | **+2** |
| myeloid predominance | +1 | **+2** |
| monocytes ≥10% (the CMML mimic) | *nothing* | **−2** |
| anemia | **+1** | **−1** (see the registry) |

**PV and ET were re-read the same way, and each turned up the identical shapes.**

*Polycythaemia vera.* Its `expects` label promised panmyelosis and its predicate tested cellularity
alone — relabelled rather than rebuilt, because a genuine trilineage `dxAllOf` is false-dominant and
would take the full −3 from a PV whose megakaryocytes were merely charted "adequate". The limbs it
was silently missing are now their own weights: **erythroid predominance +2** and **myeloid
predominance −2**, from "Bone marrow smears show a prominent erythroid proliferation with either a
normal or a reduced myeloid-to-erythroid ratio" — a sentence naming the two states the chapter
permits, of which a myeloid predominance is neither. Also **megakaryocytes increased +1** (the rule
scored the morphology and never the number — the same half-a-sentence omission CML had),
**neutrophilia** and **thrombocytosis** split out of a disjunction that paid one point for either or
both, **left shift +1**, and the erythropoietin pair merged into one `expects [3, −1]` after being
written as two support clauses for one finding. The **erythrocytosis ladder** is new: major
criterion 1 at +3, footnote b's higher bar at +4 — the bar at which the chapter will let a diagnosis
be made *without a marrow biopsy at all*, which is its own statement that the magnitude carries more
than the threshold does. The chapter also **retires one open question and leaves the other open**:
footnote b's waiver wording is now confirmed verbatim, while the ICC criterion-ordering divergence
is untouched, because a WHO chapter says nothing about ICC.

*Essential thrombocythaemia.* Its driver clause was **scored twice in one rule** — `expects` at +1
and `supports` at +4 both reading `f.drivers.anyDriver`, so a driver-positive ET took +5 for one
finding. The `expects` `for` is now 0, which the doctrine reaches independently: that predicate's
weaker limbs are `anySomatic` and any named karyotypic abnormality, both common right across the
field, so paying a `for` scored a DNMT3A-mutant marrow with platelets of 460 exactly like a
JAK2-mutant ET. **Thrombocytosis is the one weight in the registry deliberately mirrored rather than
discriminating**: it is ET's defining count and near-absent from the field, but prefibrotic PMF
presents with it too — *"the peripheral blood smear usually shows thrombocytosis and/or
leukocytosis"*. Note the chapter, now pasted, makes this a **described feature and not one of the
four minor criteria** (which are anaemia, leukocytosis, splenomegaly, LDH); the mirroring stands on
the description, not on criterion status. `dxUnresolvedPair()` compares the prior-free subtotal
within a margin of 2 — an ET-only +4 would dissolve the "unresolved" answer on exactly the cases it
exists for, so both carry +4 and the margin is untouched.

**The magnitude ladder is the first one in the registry**, and it is why the ladder mechanism exists:
a count of 12 and a count of 300 were the same finding. The three rungs overlap deliberately and
`dxCollapseLadders` keeps the strongest, so a WBC of 120 scores +4 once and shows the two lower rungs
as suppressed. **CNL carries no weight there on purpose** — it is the one other entity defined by the
height of the white count, and its chapter has not been pasted; weighting it from recollection beside
a CML figure read from source is the uneven-migration bias `docs/diagnosis.md` warns about.

**`dxUnresolvedPair()` makes "unresolved" a first-class answer.** When ET and prefibrotic PMF are both
live and within `DX_UNRESOLVED_MARGIN` (2) of each other, both carry a `caution` saying the
distinction is not resolved by the present findings. It is the only place the engine reasons about a
*pair* rather than one candidate, and it earns the exception: the distinction is worth 15-year
survival of 80% against 59% and 10-year leukaemic transformation of 0.7% against 5.8% (Barbui, *JCO*
2011;29:3179), and it is also the call the literature itself gets wrong a third of the time. Silently
ranking one a point above the other would manufacture a decision.

**`dxResidualCategory()` stops the residual category being confirmable.** MPN-NOS/MPN-U asks almost
nothing — a driver and no BCR::ABL1 — so it is the easiest rule in the table to satisfy *completely*,
and it reached `supported` while ET scored 8 to its 2 and sat at `incomplete` awaiting a reticulin.
The bucket sort then put it first. This is the same inversion `unassessed` exists to prevent, arriving
from the other side: `unassessed` stops a candidate with **no** evidence ranking high, this stops one
whose criteria are **too weak to fail**. It is not a scoring tweak — "cannot be assigned to a specific
subtype" is a real unmet requirement of the category, which a rule evaluated in isolation cannot see.
The contender test is **any** better-scoring live candidate, not just another MPN: restricting it to
`family === 'mpn'` let MDS/MPN-SF3B1-T (score 7) sit below it, and the subtype question is as open
against an overlap entity as against ET.

**`family` is declared on every rule, never inferred from the id.** The workup bonus used to key on
`id.indexOf('mds') === 0`, which would have handed the MDS bonus to **`mdsMpnSf3b1T`** on its first
three letters. An MPN workup must not lift the MDS candidates and vice versa — they are worked up
*against each other*, so a bonus reaching both cancels to nothing and one reaching the wrong side
tips the exact comparison the tab was opened to make.

**`dxAnyOf` / `dxAllOf` are Kleene's three-valued OR and AND**, and they arrived the moment a
criterion became a list of alternatives. PV's rule — "all three major criteria, **or** the first two
plus the minor one" — is an OR of ANDs, and evaluating it with plain `||` reads a blank
erythropoietin as a normal one.

**ET'S WAIVER FALLS ON THE DRIVER MUTATION, PV'S FALLS ON THE MARROW — and getting that backwards
is the whole bug.** "Either all the major criteria or the **first three** major criteria plus a
minor criterion." Major 4 is *JAK2*/*CALR*/*MPL*, so it is the waivable one; the bone marrow is
major 2 and sits inside both accepted paths. It is the cleanest asymmetry in the classical triad,
and the rule had it inverted by omission: the driver was a `+4` support and *no criterion at all*,
so a **reactive thrombocytosis** — every study resulted and negative, marrow bland — met every gate
ET had and landed `supported`. A confident call of ET on the commonest cause of a platelet count
over 450. It is now an `expects` clause reading "a driver mutation, or in its absence a clonal
marker", at `for: 1 / against: −4`: low `for` because ~90% of ET meets it, heavy `against` because
failing it means no driver **and** no clonal marker at once.

**The minor criterion's second arm is unanswerable here, and that is a recorded gap.** "Exclusion
of reactive thrombocytosis" is a clinical judgement the template collects nothing for — no iron
studies, no inflammatory markers, no splenectomy history. So a genuinely triple-negative ET
diagnosed by excluding secondary causes will be marked against on a criterion it actually met. Same
class of gap as CMML's three unanswerable criteria; the fix is an input, not a rule edit.

**"Not hypercellular for age" is true of a hypocellular marrow, and the chapter minds.** ET's
support clause used to read exactly that, so a hypocellular marrow *earned* ET two points for a
finding the chapter lists as a reason to doubt it: "Hypocellularity **or** hypercellularity without
a clear cause should prompt careful consideration of other differential diagnostic possibilities."
The clause is now `normocellular for age` — neither end — which is also what the definition says
("in a normocellular bone marrow"). Worth remembering as a shape: `dxNot(x)` is not "normal" when
`x` is one end of a band.

**A recorded lineage predominance argues against ET whichever way it leans**, which is why one
clause covers both directions. Major criterion 2's second half is "no significant increase or left
shift in neutrophil granulopoiesis or erythropoiesis", restated as "the myeloid-to-erythroid ratio
is usually in the normal range". Myeloid points at prefibrotic PMF or CML, erythroid at PV. It is
**only ever negative**: `cellularity.predominance` is `null` both when the ratio was balanced and
when no aspirate was counted, so there is no reading of it that means "normal ratio, confirmed" —
claiming points on a `null` would be claiming them on an uncounted aspirate.

**Reticulin fibrosis now means four different things across this table**, and it is the entry that
most justifies a registry keyed by input rather than by entity:

| grade | ET | prefibrotic PMF | CML | PV |
|---|---|---|---|---|
| MF-2/MF-3 | hard exclusion | hard exclusion | **neutral** (~30% at diagnosis) | **−3** (post-PV MF) |
| MF-1 | **−1** ("very rarely" in the criterion) | 0 (where the entity lives) | — | — |

MF-1 is a separate entry rather than a rung on a ladder: its predicate is *grade 1 and not ≥ 2*, so
the two can never both fire and there is nothing to collapse. Note that ET's two sentences about
fibrosis disagree — the histopathology section is permissive ("usually absent (MF-0) or mild
(MF-1)") while the criteria box allows "very rarely a minor (grade 1) increase". The box governs,
but only at −1: reticulin grading at the 0/1 boundary is the least reproducible end of the scale
whose reliability is the reason fibrosis may gate at all.

**Anemia is negative for CML as well as for ET, and the CML entry is the one that shows why a
weight needs its rivals' numbers.** The chapter lists anaemia among six presenting findings, in
roughly half of cases — a true sentence, read as +1. But the marrows CML is ranked against on an
anaemic case are MDS, CCUS and ICUS, anaemic by definition or close to it, so half is *below* the
field and the sign was wrong. The practical effect was that ticking anaemia moved CML up the list
faster than it moved the myelodysplastic candidates. Now −1: it may argue, never disqualify, and
BCR::ABL1 outranks it eight to one.

**ET's negative is a different argument.** Descriptively,
"most often, the red and white cells do not show any changes"; prognostically, anemia is a risk
factor for *post-ET MF and blast phase transformation*, so where it appears it marks progression
away from chronic-phase ET. Only −1, because the same chapter allows that "concurrent anaemia may
result in expansion of precursors" — and the finding's real work is done by the neighbours it
favours, where anemia is a named minor criterion of **both** PMF stages.

**The masked-PV flag is a caution, not points, because the chapter's instruction is to go and
check.** "Any amount of erythrocytosis **or iron deficiency** (especially in the setting of the
*JAK2* p.V617F mutation) should raise the question of whether the diagnosis is more accurately
polycythaemia vera." The erythrocytosis half is already a hard exclusion, so only the iron half
needed saying: microcytosis plus *JAK2* V617F prints a caution to correlate with iron studies and
reassess the counts after repletion. This is the same case PV's chapter refuses to name *masked PV*
— there, a *JAK2* case short of threshold becomes MPN-NOS; here, the reason it fell short may
simply be that the iron is gone.

**THE TRAP THE SET EXISTS TO CATCH: *SF3B1* + thrombocytosis is not ET.** A *JAK2* V617F case with
thrombocytosis reads as textbook ET, but *SF3B1* co-occurs with *JAK2* in 50–65% of MDS/MPN-SF3B1-T,
where the *JAK2* drives the platelets and the *SF3B1* drives the anaemia and ring sideroblasts. It is
a **categorical redirect in both directions** — one clause on ET's `excludes` and its mirror on
`mdsSf3b1`'s — because points would let the engine offer both at once, confidently.

**Three findings that are the reverse of the obvious guess**, all verified across independent reads
and each already encoded: WHO-HAEM5 calls the residual category *not otherwise specified* while ICC
2022 keeps *unclassifiable* (**it was WHO that moved**); PV's Hb/Hct thresholds are **identical** in
the two classifications (M >16.5 g/dL or >49%, F >16.0 or >48%); and the CMML absolute monocyte
threshold dropped to 0.5 ×10⁹/L in **both**, not in WHO alone — and only counts alongside the ≥10%
relative figure, which is why `counts.monocytosis` tests both.

**Divergences encoded, each fired only when it applies:** CML's **accelerated phase** (WHO abolished
it, ICC retained it — same findings, different name, so `whoFor`/`iccFor` both speak); CNL's **white
count threshold** (ICC drops it to ≥13 ×10⁹/L with activating *CSF3R*, WHO holds ≥25); PV's **red cell
mass** (ICC retains it, WHO removed it) together with the criterion-**ordering** difference, whose
consequence is now **verified against the pasted ICC paper** (`docs/who/icc-2022-arber-blood.md`,
Table 3): ICC's "first 2 majors + minor" is a marrow-free route (threshold + *JAK2* + subnormal EPO),
WHO's is a mutation-free one (threshold + biopsy + EPO). The old hedge in the divergence string is
gone. Print also confirmed the encoded ICC sides of the CML AP/BP table and the CNL threshold, and
surfaced one divergence encoded nowhere: ICC's PMF splenomegaly minor requires a **palpable** spleen
where WHO accepts imaging — recorded in the reference topics; the engine's `ancSpleen` control is
off-screen, so nothing scores it yet.

> **A divergence was DELETED here**, and it is worth knowing which. The rule claimed prefibrotic
> PMF's leukoerythroblastosis as a WHO minor criterion that ICC omits. `docs/who/mpn-pmf.md` shows
> WHO-HAEM5's prefibrotic box carries **four** minors — anaemia, leukocytosis, splenomegaly, LDH —
> and the fibrotic box carries those four **plus leukoerythroblastosis**. The two classifications
> agree; there was no divergence to print, and `dxPmfMinorAny(f, false)` is now what the prefibrotic
> rule asks. A `caution` carries the clinical half that was true: a leukoerythroblastic picture
> reflects disrupted marrow architecture and warrants correlating with the reticulin grade.

> **The same error recurred on `mpnU` and was caught by its own chapter paste**
> (`docs/who/mpn-nos.md`, Box 2.14): the clonality criterion is "driver mutations … or another
> clonal marker" in both classifications, and the rule gated on `dxMpn.driver` alone — so a
> TET2-mutated or karyotypically clonal marrow with no driver was `excluded` from the residual
> category. `dxMpnUClonality` now carries both limbs; unlike PMF's criterion there is no third
> limb, so an all-resulted-negative case is a real false and the category genuinely closes.

## Major criterion 3 is a disjunction, and it ends in a negative

The single most expensive error found in this file. Both PMF boxes read *"JAK2, CALR, or MPL mutation
**or** presence of another clonal marker **or** absence of reactive bone marrow fibrosis"*, and the
rule had it as `dxMpn.driver` — a bare driver requirement. So `anyDriver === false` **failed** the
gate, and triple-negative PMF landed in `excluded`: gone from the differential on a marrow with MF-3
and classic atypical megakaryocytes. The tell was already in the file — `pmf` carried a support
clause and a `caution` written for the triple-negative case, and neither could ever fire.

`dxPmfClonality()` now evaluates all three limbs, and **the third is permanently `null`**: "absence of
reactive bone marrow fibrosis" is a clinical exclusion (footnote d — infection, autoimmune disease,
hairy cell leukaemia and other lymphoid neoplasms, metastatic malignancy, toxic myelopathy) that this
app records nothing about. Since `dxAnyOf` is false only when everything is false, a permanently null
limb makes the criterion **unfailable** — met on a driver or any other clonal marker, unknown
otherwise. A triple-negative fibrotic case now ranks first at 6 points in bucket `pending`, with that
one criterion listed as outstanding and the secondary-causes caution finally reachable.

**Another clonal marker** is any somatic variant or any clonal cytogenetic abnormality. Footnote c's
gene list (*ASXL1, EZH2, TET2, IDH1, IDH2, SRSF2, SF3B1*) is prefixed "e.g." — an illustration of
where to look, not a list to match against.

**Two findings that widen the differential rather than narrowing it**, both written as *negative*
support: a fibrotic marrow with **no driver mutation** raises a `caution` naming metastatic carcinoma,
hairy cell leukaemia, autoimmune myelofibrosis and infection — triple-negative PMF is only 5–15% of
PMF while the reactive causes are collectively commoner. And **triple-negativity means opposite things
in the two diseases** (indolent in ET, adverse in PMF), so it is never scored as one fact with one
sign.

**Enabling changes made for the engine**, all of which leave report prose byte-identical:
`grade: [low, high]` on the reticulin options; an optional **% dysplastic** per lineage on the
aspirate's three MDS lineages (engine input only, revealed once a morphology is named); the
cytogenetics and study-status blocks on Ancillary; and for the MPN set, **nine megakaryocyte
descriptors** on `coreMegDesc`, a **BCR::ABL1** row and a **Clinical** block on Ancillary.

The megakaryocyte descriptors (`megDenseClusters`, `megStaghorn`, `megCloudLike`, …) go in the **same
row** as the dysplastic ones, because "what do the megakaryocytes look like" is one question and a
fibrotic marrow may honestly answer it with both kinds of word. The original six **keep their order**
and the new ones follow. They are **not** in `dysplasticDescriptors.megakaryocytic`, which is what
keeps naming a staghorn nucleus from counting as dysplasia toward an MDS criterion — that list is
written out by hand precisely so a new descriptor cannot join it by accident. Their prose is **new,
with no original to port** (the old app had dysplastic words only), so there is nothing to be
byte-compatible with; `staghorn` is ICC 2022's term, kept because it is what the finding is called.

`findingMegakaryocytes()` splits them into `pmfLike` / `etLike` — tri-state, so nothing named on an
*assessed* core is a real negative and an unassessed core stays silent.

**`cellularity.hyperForAge`** is the other end of `hypoForAge`'s band and is a criterion in its own
right: increased age-adjusted cellularity is part of prefibrotic PMF's major morphologic criterion,
and a normocellular-for-age marrow is one of the things that keeps a thrombocytosis in ET.

Also a latent bug fixed: `MarrowCore.js`'s
`.cellNum` `input` listener was unscoped, so a percent box on any other tab re-derived the core's
cellularity — it is now scoped to `#corePanel`.

**Verify with the vignette harness**, which drives real headless Chrome through the same public seams
and asserts the ranked output: empty case → nothing suggested; MDS-LB with genetics pending → the
"in the absence of a demonstrated disease-defining genetic alteration" comment; + *SF3B1* →
MDS-SF3B1 and an addendum; 12% blasts → MDS-IB2 with **MDS/AML (ICC)** named and MDS-IB1 excluded;
25% → AML with every MDS candidate excluded; MF-1-to-MF-2 → fibrosis *unknown*, MF-2 → supported;
cytopenia without dysplasia → ICUS, and CCUS once a somatic variant is present; isolated del(5q) →
MDS-5q.

**The gap that set of vignettes left** was *genetically defined entity + genetics pending*: the
del(5q) case enters the deletion as a result, so the guard fires and the case passes, and the case
that asserts the absence clause is MDS-LB, where the clause is right. Neither covers MDS-5q with the
karyotype still out — which is where the comment contradicted itself. Any new vignette set should
pair every `definedBy` rule with a pending-studies variant.

`scratchpad/mpnDx.js` is the MPN half — 90 checks over 13 vignettes, page **reloaded between each** so
no case inherits the last one's state: BCR::ABL1 → CML, with PV/ET/PMF all excluded and accelerated
phase named for ICC only; *CALR* type 2 + platelets 712 → ET; adding the prefibrotic pattern + LDH +
spleen → the unresolved-pair caution on both; MF-2 → both gated out and overt PMF opened;
MF-1-to-MF-2 → neither gated; *SF3B1* added to a *JAK2* thrombocytosis → ET **and** MDS-SF3B1 both
excluded and the overlap entity on top; *CSF3R* T618I at WBC 18 → CNL open for ICC and the divergence
stated, and CMML-level monocytosis excluding it anyway; the workup bonus staying inside its family;
and the whole MDS set re-run unchanged.

Two harness lessons worth keeping. **The CBC flag rides in the value cell, space-separated** ("9.8
Low") — that is the shape Epic pastes and the only thing `cbcFlagged()` reads, and a paste without it
silently fails every cytopenia gate. And **a descriptor list cannot be cleared by iterating a
NodeList**: `renderDescriptorList` rebuilds the list on every change, so the collection is detached
after the first clear — re-query each time.

