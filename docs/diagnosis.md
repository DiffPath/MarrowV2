# The Diagnosis tab and the findings snapshot

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The engine: gates vs points, three-valued logic, buckets, the comment.

## The Diagnosis tab (`MarrowDx*.js`) and the findings snapshot (`MarrowFindings.js`)

> The tab is **nine files** split by disease family, not one. `MarrowDxKernel.js` is the one to read
> first — it carries the file header, the point ladder and the three-valued contract, and declares
> `dxRules` empty for the family files to push onto. Everything this document says about `dxRules`,
> gates, points and buckets is unchanged by that split; only where you open it changed. The table in
> the root `CLAUDE.md` maps family to file.

> **The criteria in `dxRules` are a DRAFT, and the three families are draft to DIFFERENT degrees.**
> They are isolated in one table so they can be checked line by line.
>
> - The **MDS** rules were written from recollection. Three sources have now been read: the
>   *framing* chapter (see "What the MDS introduction settled") and the criteria boxes of
>   **MDS-5q** and **MDS-SF3B1**. Each box corrected criteria the recollected rule had wrong —
>   three of five for MDS-5q, two of six for MDS-SF3B1 — so the rate is holding. Every other
>   entity's criteria box remains unread: assume nothing in their thresholds, and expect the same
>   rate of correction when each is checked.
> - The **MPN** rules were assembled from the secondary literature and the primary classification
>   papers where reachable, but *not* from the WHO blue book, which could not be accessed.
>   **CML, PV and ET are now the exceptions**, all three read against their own chapters.
>   - CML (`docs/who/mpn-cml.md`): the box has *two* essential criteria and the rule carried one,
>     having missed peripheral blood neutrophilic leukocytosis outright.
>   - PV (`docs/who/mpn-pv.md`): the **path structure** was wrong. Both accepted routes contain
>     major criterion 2 (the marrow), and the rule let a *JAK2*-positive erythrocytosis satisfy it
>     with no marrow criterion at all. The thresholds were right — 16.5/49 male, 16.0/48 female,
>     verified against the box — so the error was in the shape, not the numbers.
>   - ET (`docs/who/mpn-et.md`): the path structure again, and worse. **Major criterion 4 — the
>     driver mutation — was not represented at all**, scored +4 and required nothing. So a reactive
>     thrombocytosis met every gate ET had and landed `supported`: a confident call on the
>     commonest cause of a raised platelet count. The box's second path waives major 4 in exchange
>     for a *minor* criterion, and neither path lets a thrombocytosis through with no clonal
>     evidence and no secondary cause excluded.
>
>   PMF, prefibrotic PMF, CNL and MPN-NOS remain unread, and three corrections out of three read
>   is a reason to expect the same in each.

**PV's footnote b is the second waiver in the engine, and the shape is `dxWaive`'s.** "Major
criterion 2 (bone marrow biopsy) may not be required in patients with sustained absolute
erythrocytosis … if major criterion 3 and the minor criterion are present" — a *second, higher*
set of thresholds (Hb > 18.5 male / > 16.5 female; Hct > 55.5 / > 49.5) which are easy to conflate
with major criterion 1's, since 16.5 is the male diagnostic haemoglobin **and** the female waiver
haemoglobin. `dxPvMarrowCriterion` returns **null, never true**, when the waiver fires: the
criterion genuinely has not been met, and unknown is what "not required here" looks like in a
three-valued engine. Same reasoning as the MDS mild-anaemia waiver.

**Erythrocytosis stays a hard gate on PV because the chapter answers the objection itself.** It
concedes that erythrocytosis "may be masked by an underlying iron deficiency" and that thrombotic
presentations "can have normal blood counts" — then rules that such cases are *not* to be called
masked PV but **MPN-NOS**, reviewed closely. The alternative diagnosis is one this table already
carries, so the gate loses nothing.
> - The **AML** rules were read against both primary papers directly, ICC's tables from raw markup —
>   so they are the most trustworthy of the three, though the blue book's per-entity criteria boxes
>   and ICC's supplemental Table 5 remain unread. Items that could not be verified are flagged at
>   the point of use.
>
> The specific unsettled items are flagged at each rule; the header of `MarrowDxKernel.js` lists them.

**Gates decide eligibility; points rank and explain.** `requires` / `excludes` are categorical — 12%
blasts is not MDS-IB1 however much other evidence accumulates, so no score may reach past a gate.
`supports` only ever order candidates that are *already* eligible. A pure score could produce a
nonsense answer; pure gates would give a set with no order and no explanation. Every clause carries a
reason string, and the UI always shows what counted and what is still missing — **a score whose
reasoning cannot be read is not usable in this domain**. The ladder is documented in the file (+4
defining, +3 major morphologic, +2 supportive, +1 context, −2 against) so the numbers are not magic.

> **THE SCORE IS A LIKELIHOOD NOW, NOT AN IMPORTANCE TALLY (reworked 2026-07-27).**
> The paragraph above still describes what a *gate* is for, but the sentence "points rank and
> explain" understates what points now carry, and the ladder it quotes has been superseded.
>
> **A weight is how much an input moves THIS entity relative to its competitors — not how important
> the criterion is.** A clause that fires identically for every eligible candidate is worth nothing
> however central it is to the definition; `amlNpm1` requiring an *NPM1* mutation and then scoring
> +4 for "NPM1 is a defining mutation" is the pattern being removed. The discriminating numbers are
> frequencies: how often this entity shows this finding, against how often its rivals do.
>
> Four mechanisms carry that, and they are documented at their own definitions rather than here:
>
> - **`expects`** (`[label, for, against, test]`) — soft criteria. False costs points and prints as
>   evidence against; it never excludes. This is what lets a finding carry likelihood at all: while
>   anaemia was a gate it was pass/fail, so it could not say "this raises MDS-SF3B1 a lot and
>   MDS-IB2 a little". **The two weights are asymmetric, and they answer two different questions:
>   `against` is set by how universal the finding is *in the entity*; `for` is set by how rare it is
>   *in the field*.** This note used to say "pay a small `for` and a large `against`" on the grounds
>   that a gate-worthy criterion is near-universal for its entity — which is a fact about
>   discriminating among the candidates the rule already kept, not about the comparison the score is
>   making. CML's neutrophilic leukocytosis is the case that proved it: an essential criterion, rare
>   in the field of myelodysplastic and boundary candidates it competes with, written at `for: 1` —
>   the same point the rule paid for *anaemia*. Now +4/−3. A genuinely small `for` is for a criterion
>   near-universal in the entity **and** common in the field (a hypercellular marrow, absent
>   dysplasia). See `MarrowDxKernel.js`. **Where the criterion is an *absence*, `for` is 0** —
>   "granulocytic dysplasia absent, +1" paid a point towards CML to every non-dysplastic marrow in
>   the world. `dxLikelihoodAudit()` warns on any other combination.
> - **`prior`** — the prevalence baseline, band −3…+2, printed as its own evidence row.
>   **One denominator for the whole table: the entity's share of the marrows that reach this
>   differential**, never a general-population incidence and never a share of its own family.
>   Residual categories are **capped** at the highest prior among the entities they defer to:
>   MDS-LB is 45–50% of MDS, but it is common *because* it is what is left over.
> - **`MarrowDxLikelihood.js`** — the registry, keyed by **input** rather than by entity, so
>   "I ticked anaemia, what did that do?" is answerable in one place. Family defaults plus
>   per-entity overrides, an explicit `against`, and `ladder` groups so threshold rungs compete
>   rather than stack. **A weight is a likelihood ratio against the rest of the differential** —
>   how much commoner the finding is here than in the candidates it competes with — so a finding
>   *rarer* in the entity than in the field scores negative even where its own chapter names it,
>   and **a gate does not silence a weight** (eligibility and rank are different questions).
> - **The bucket no longer sorts.** `supported` meant "no definitional criterion is unanswered",
>   which is a fact about how much of the form was filled in, not about fit — and the engine
>   carried two separate patches for the inversions that caused. Live candidates now rank on score
>   with a one-step confirmation bonus.
>
> The `mdsMpnSf3b1T` bug this started from is fixed: with anaemia recorded absent the candidate
> stays on the list, ranks first, and shows `anemia with dyserythropoiesis (not met) −4`.

> **STILL A DRAFT, AND UNEVENLY.** The migration is incremental, which creates a bias worth knowing
> about: **an entity with more registered inputs outscores one with fewer for reasons that have
> nothing to do with the case.** As of 2026-07-27 `mds5q`, `mdsSf3b1`, `mdsMpnSf3b1T`, `cml`, `pv`
> and `et` have `expects`; priors are set for the eight MDS rules, CMML, CML, PV, ET and the four
> boundary rules; the registry holds fifteen entries (the myelodysplasia-related mutation migrated
> out of the engine, anemia, neutropenia, thrombocytopenia, thrombocytosis, any-somatic-mutation, the
> four white-cell-magnitude ladder rungs, the two erythrocytosis rungs, and reticulin fibrosis
> MF-2/3 and MF-1). Of the MPN family only CML, PV and ET are sourced; **no AML chapter has been
> pasted at all**.

> ## The chapter re-read (2026-07-27)
>
> Every pasted chapter was audited against its rule under the corrected doctrine, because the CML
> error was not a one-off — it was produced by advice that applied to all of them. Nine parallel
> audits, one per entity or family, each required to quote the chapter verbatim; the quotes were
> then grep-verified against `docs/who/` before anything was encoded. **The same four shapes came
> back from every chapter:**
>
> 1. **The essential criterion that scored nothing**, because it gated the rule and the old policy
>    read a gate as silencing a weight. CML's neutrophilic leukocytosis was the first; PV's
>    erythrocytosis, ET's thrombocytosis and CMML's white count are the same shape. All four are now
>    registry entries — an erythrocytosis of 62% and one of 49.5% used to rank PV identically.
> 2. **The magnitude collapsed into a boolean** where the app records the number and the chapter
>    publishes a figure. hMDS was keyed to `wbc < 3`, a midpoint the chapter never states, with both
>    of its published medians (2.4 and 3.7 ×10⁹/L) sitting unused in the comment above the clause.
> 3. **The clause pointing the wrong way**, sourced to a sentence about which stain to order rather
>    than what the finding means. hMDS paid itself +1 for ring sideroblasts >5% — the finding that
>    defines its rival, as the next sentence of its own chapter says.
> 4. **The same finding scored twice in one rule**, which `dxMergeEvidence` cannot catch because it
>    dedupes local against *registry*, not local against local. ET paid +5 for one driver mutation;
>    MDS-SF3B1 paid +5 for ring sideroblasts, more than it pays for the mutation it gates on;
>    MDS-5q paid +4 from a single checkbox, because `MEG_5Q_PATTERN`'s two keys are also members of
>    `dysplasticDescriptors.megakaryocytic`.
>
> **`dxLikelihoodAudit()` read `expects` and not `supports`, which is why none of this surfaced.**
> An audit that checks one of the two places a weight can live reports zero problems and means
> nothing; four absence-scored-positive clauses were sitting in `supports` while it reported clean.
> It now reads both, plus a third check for a **positive `against`** in the registry — the same bug
> in the one file it did not inspect at all. `fibrosisMf2` carried `pv: {against: 1}`, so every
> non-fibrotic marrow in the table — nearly all of them — was paying polycythemia vera a point.
>
> **What was deliberately NOT encoded**, in every case because the source does not support it: a
> platelet-magnitude ladder for ET (the chapter publishes no median, unlike CML's ~80 ×10⁹/L); a
> JAK2 VAF weight for PV (no threshold and no direction in the chapter); a "very complex" karyotype
> rung for MDS-biTP53 (the app records a ticked key, not a count); a CNL weight on the white-cell
> ladder (chapter unpasted — weighting it beside a sourced CML figure is the uneven-migration bias);
> and a CMML neutropenia weight, which was **removed**: it was justified by a quote that turns out
> to be the anemia entry's sentence, and the word "neutropenia" appears zero times in that chapter.

> **THE LADDER GAINED A TOP TIER, `+8` — PATHOGNOMONIC.** It stopped at +4, and "a defining genetic
> abnormality is present" was written at +4 for BCR::ABL1 and for every AML-defining fusion —
> findings with a sensitivity and a specificity of about 1 against this whole differential. Four
> points is what three ordinary morphologic observations come to, so a demonstrated fusion could be
> caught and passed by soft findings on another candidate. **The test, so the tier does not become a
> synonym for "important": name one other rule in this table a case carrying this finding could
> plausibly be.** BCR::ABL1 and the eight AML fusions pass; del(5q) and SF3B1 do not (two rules read
> each), and JAK2 does not (three MPN rules share it).
>
> **ET's prior is the sharpest instance of that bias, and it is stated on the rule.** Prefibrotic
> PMF carries no prior because its chapter has not been pasted, so ET's prior currently means
> "ET has been read and prefibrotic PMF has not" as much as it means "ET is commoner". It happens
> to be true that ET is the commoner of the two, but revisit the pair when the PMF chapter lands
> rather than treating the gap as evidence. `dxUnresolvedPair()` is unaffected either way — it
> compares the prior-free subtotal precisely so a prevalence figure can never settle the one
> comparison the engine refuses to settle.

> **THE PRIORS WERE ON THREE DENOMINATORS AT ONCE, AND THAT IS WHAT THE ONE-DENOMINATOR RULE ABOVE
> FIXES.** The MDS rules quoted a share *of MDS*, the MPN rules quoted an annual incidence *per
> 100 000 of the general population*, and the four boundary rules quoted nothing and scored zero —
> three incomparable quantities summed into one total, each individually true. The visible symptom
> was chronic myeloid leukaemia at `prior: 2`, the top of the band, on 1–2 cases per 100 000, while
> a cytopenia with a clone scored 0. Of the marrows that actually get sent, CCUS is one of the
> commonest answers and CML is an uncommon one. **Rescaled:** the boundary family now sits at the
> top (`noNeoplasm` +2, `ccus`/`icus` +1, `chip` 0), the MDS block is unchanged around +1, and the
> MPN family sits at 0 — the figures did not change, the denominator did. Place a **family** on the
> band first, then rank within it; a per-100 000 figure is legitimate as the *derivation* of a tier
> and never as the tier itself.

> **NEITHER POST-PV NOR POST-ET MYELOFIBROSIS HAS A RULE, though both have criteria.** They are
> recorded at the foot of `docs/who/mpn-pv.md` and `docs/who/mpn-et.md`. Both require a documented
> previous diagnosis plus MF-2/3, then two of a short list; post-ET MF adds an elevated LDH to that
> list and requires anemia to be paired with a > 2 g/dL fall from baseline. These are not rare
> corners — ~20% of PV and 10–15% of ET patients develop them — but several criteria are outside
> what this app records: the phlebotomy history, the *change* in spleen size from a baseline, the
> *change* in hemoglobin from a baseline, and the constitutional symptoms. That is why they are not
> yet rules rather than an oversight, and adding them means new Ancillary-tab inputs, not a rule
> edit. The fibrosis weights on `pv` and `et` are what currently carry the signal.

**`cml.prior` is the first function-valued prior, and the pattern to copy.** Its chapter gives a
thirty-fold spread inside one entity — "< 0.1 cases per 100 000 children to ≥ 2.5 cases per
100 000 elderly individuals" — so a single number would offer CML too readily in a child and too
grudgingly in the eighth decade. Reading `f.age` costs the same seam `whoFor` and `caution`
already use, and the untiered value is the overall figure, which is what to assume when the
CBC carried no date of birth. **The age tier survived the denominator correction and the base tier
did not** — the tier is a statement *within* the entity, so it is denominator-free; the base was
+2 on a general-population incidence and is now 0, level with PV and ET, whose incidences CML's
matches almost exactly.

**Reticulin fibrosis is the case that justifies an input-keyed table.** MF-2/MF-3 hard-excludes
essential thrombocythaemia and prefibrotic PMF on reproducibility grounds, and is seen in "as many
as 30% of cases at diagnosis" of CML — where it had no weight at all. The same finding means
opposite things three rules apart, and only a table keyed by the finding makes that legible.

**No confidence percentage is ever shown.** Rank, evidence, and gaps. A percentage would be
pseudo-precision over a categorical classification.

**The two toggles share one toolbar row** (`.dxToolbar`, space-between): the comment register
(Final diagnosis / Addendum) at the left, the view switcher (Comments / Scoring) at the right, no
labels — a two-word segmented control names itself, and a heading over it is a row spent twice. Both
are **radio groups** (read by `name`, like Laterality and the template types), not `data-toggle`
checkboxes: a mode and a view must always have exactly one selected, and a radio cannot be clicked
off — the clearable toggle-group pattern would let both pills go blank.

**The tab has two views, a `.chipGroup` toggle apart.** **Comments** (default) is the working
surface: the candidates that scored **> 0** and are not excluded/unassessed, ONE per page with the
comment prose it would produce and a "Use this comment" button, paged with `‹ n of m ›` arrows so a
long differential is never a scroll. **Scoring** is the debug surface: the "What the case says"
findings summary at its head (the raw material the scoring is derived from, so it heads the audit
rather than riding above the working view as chrome), then every candidate — its bucket and total,
the gates it met, and each support point that fired — so the number is auditable, not asserted.
Paging draws from the **stored** ranking (`dxResults` / `dxFindings`), never re-ranking, so
the arrows cannot reorder the list they move through; only `refreshDx()` re-ranks. The Use button and
the page index both read that same stored ranking for the same reason.

**Template type is capped at +1 and can never move a gate.** "Rule out MDS" says why the case was
sent, not what it is; letting it open or close a criterion would make the tool agree with whoever
filled in the Specimen tab.

**THREE-VALUED THROUGHOUT: true / false / null, where null is "nobody has said."** This is the
property everything else rests on, and it is the same distinction the counter draws between `[0,0]`
and `null`. A gate evaluating to null does **not** fail — it makes the candidate *unconfirmed*, which
is a different bucket and a different comment. `dxBetween` / `dxAtLeast` / `dxBelow` all propagate
null rather than comparing against it.

**`dxBandAtLeast` is the shape of the idea.** Reticulin options carry `grade: [low, high]`, so
"MF ≥ 2" is true when `low ≥ 2`, false when `high < 2`, and **unknown for a straddling option**
("MF-1 to MF-2"). Rounding that either way would invent a grade the pathologist declined to give.

**Four buckets, and the fourth was earned.** `supported` / `pending` / `incomplete` / `excluded`,
plus **`unassessed`** — a candidate with nothing met and nothing scored. Without it an empty case
suggested MDS-5q: every requirement unknown, so "pending", which sorted to the top. A candidate with
nothing *for* it is the rule table reciting itself, not a suggestion.

**`pending` and `incomplete` rank TOGETHER, by score.** They are two reasons for the same thing — not
confirmed — and the difference between them is about *wording*, not likelihood. Ranking pending above
incomplete let MDS-5q (score 3, nothing met, karyotype outstanding) sit above MDS-LB (score 6).

**Genetically-defined categories EXCLUDE MDS-LB rather than merely outscoring it.** MDS-LB is the
residual category, and generic morphology (multilineage dysplasia + no excess blasts) can out-point a
single defining criterion — a confirmed *SF3B1* case ranked MDS-LB first until the exclusion was
added. Precedence here is categorical, which is what a gate is for.

**A RECORDED FINDING IS A FINDING; the study status only licenses an ABSENCE.** This asymmetry is
the rule for every genetic input and it was learned the hard way — gating positives behind the status
toggle meant ticking del(5q) changed nothing at all, silently, with nothing on screen to say why.

    recorded            -> true    (whatever the status says)
    absent + resulted   -> false   (a real negative that can close a criterion)
    absent + otherwise  -> null    (an empty list is not evidence)

Marking a study Resulted still matters — it is what turns the *other* abnormalities' absence into
real negatives, which is what moves a candidate from `pending` to `supported`. So the toggle changes
confidence, never whether a finding registers.

**Myelodysplasia-related (MR) gene mutations elevate the myeloid candidates and name the MR
subtypes.** `MR_GENES_WHO` / `MR_GENES_ICC` in `MarrowFindings.js` (a DRAFT — verify) are the same
eight-gene core, with ICC adding **RUNX1** where WHO-HAEM5 dropped it; the two are kept apart so a
RUNX1-only case reads as MR by ICC and plain by WHO. `findingMR()` computes each as the usual
tri-state (recorded → present, absent+resulted → false, else null). In the engine a present MR
mutation adds **+2** to every `mds*` and `aml` candidate (like the workup bonus), and it renames at
the blast thresholds via `iccFor`/`whoFor`: at 10–19% ICC becomes *MDS/AML with myelodysplasia-related
gene mutations* (WHO stays MDS-IB2 — its AML-MR starts only at 20%); at ≥20% it is *AML,
myelodysplasia-related* (WHO, `mrWHO` only) / *AML with myelodysplasia-related gene mutations* (ICC).
`whoFor` is the reason the evaluator now carries a dynamic `who` alongside `icc`, and
`dxDiagnosisLine` reads `result.who`. The comment names the genes and, in the pending branch, **drops
the "in the absence of a demonstrated disease-defining genetic alteration" clause** when a mutation
is in fact present — it would contradict the sentence naming it. That clause is now reachable only
for a rule with no `definedBy`; a genetically defined entity takes the conditional register instead
(see *the register is a property of the entity*, below).

**Entering a result also means that study is no longer outstanding** (`karyotypeOutstanding` /
`ngsOutstanding`), and `dxPendingStudies()` reads those rather than re-deriving from the toggles.
Without it, ticking del(5q) produced a comment that used del(5q) *and* said the cytogenetics were
awaited — a contradiction in consecutive sentences. An explicit **Pending** still wins over the
inference: the toggle is a deliberate statement ("more is coming"), and silently overriding it would
be worse than the slight oddity of classifying on a partial result.

**Pending genetics is a first-class state, not a gap.** A comment is usually written before
cytogenetics and NGS result, so `dxComment()` in Final mode says the morphologic classification and
that final classification depends on the outstanding studies — never the word "temporary". The
**Final ↔ Addendum** toggle switches register; Addendum writes it as a revision against previously
reported findings. This is why `ancStudyStatus()` exists: `ngsVariants()` returning `[]` cannot tell
"no variants found" (a real negative that closes a criterion) from "not resulted" (an unknown that
must not).

**The comment goes in the report and is EDITED THERE.** `#dxCommentSectionDiv` is made
`contenteditable`, so the Comment paragraph in the report *is* the field — there is no textarea on
the Diagnosis tab. A suggestion reaches it only by being accepted (`dxSetComment`), and only as text
you can then edit; **nothing here ever places itself**. Blank lines split into separate `<p>`s, each
carrying `REPORT_PARAGRAPH` inline so it copies into Word.

**`live: true` is what makes in-report editing safe.** A `live` section owns its own body —
`fillReport()` shows or hides its container but never touches its innerHTML, so a comment being typed
survives every unrelated change elsewhere. (Without it, `fillReport` rebuilds every section's body on
each keystroke anywhere, which would drop the caret mid-word.) Its `fill()` returns only a truthiness
signal; `MarrowDx` keeps the body current.

**Visibility uses ONE predicate, `dxCommentVisible()`**, shared by `fill()` and `dxSyncComment()` so
they cannot disagree: shown when the comment has text, OR while it is being edited even if momentarily
empty. The second half is load-bearing — deleting the last character, or a `fillReport` fired
mid-edit, must not fold the box away with the caret still in it. It folds on **blur** instead, once
an empty comment has actually been left. The consequence to know: an empty, unfocused comment is
`display:none`, so **a freehand comment is created by accepting a suggestion and rewriting it** —
there is no separate blank box to click into. Ask before adding one; it was a deliberate omission,
not an oversight.

**`after: '<id>'` on a section is the one exception to "registration order is report order",** and it
exists because load order and report order genuinely disagree in exactly one place: the comment
belongs directly under the specimen line at the top of the report, but the tab that produces it must
load LAST to read every other tab's state. `orderReportSections()` resolves it on `DOMContentLoaded`
— not at registration — so it does not matter whether the target has been registered yet, and an
`after` naming a section that does not exist falls back to the registration position. Deliberately
not a numeric `order`: numbers invite gaps, renumbering, and arguments about what 50 means, where
`after: 'spec'` states the actual intent.

**`MarrowFindings.js` is the only file that knows other tabs' group names.** Rules score against the
snapshot and never touch the DOM, because the rules are the part most likely to be rewritten. Three
irregularities it absorbs: `pbAnisoDesc`'s stop chip is `pbRbcUnremarkable`; `coreMEDesc` pools
myeloid and erythroid so the core cannot say "erythroid assessed, myeloid not"; `stainPercent()`
returns `null` where `coreNum()` returns `NaN`.

**Driver mutations are read at VARIANT level, and `findingVariantMatch()` has three outcomes, not
two.** For these genes the change matters as much as the gene — *JAK2* V617F versus exon 12 is a
different marrow, *CALR* type 1 versus type 2 is a prognostic split — so each test is a loose regex
over the change string as the lab wrote it (`L367` **or** the words "type 1"), never an equality. The
middle case is the one to keep: if the **gene** is mutated and the change does not match, the answer
is a real `false` whatever the study status says, because the study did report on that gene and said
something else. Only "gene not in the list at all" defers to the status.

`jak2NonV617F` is deliberately **not** called `jak2Exon12` — without coordinates this cannot tell exon
12 from a non-canonical *JAK2* (V625F, F556V), and both exist. Nothing is lost: every criterion asks
"JAK2 V617F **or** exon 12", which `jak2` already answers; the split exists only so an exon-12
phenotype (isolated erythroid hyperplasia, bland megakaryocytes) is not read as evidence *against* PV
in the one case where that marrow is expected.

`jak2Vaf` is scored and never gated. A burden over ~50% is one of the few quantitative discriminators
between ET and prefibrotic PMF (ET median ~24% and not one case above 40% in a 490-patient series;
prefibrotic PMF median ~38%), but VAF depends on the assay and on whether the specimen was blood,
marrow or sorted granulocytes — so the effect is far more robust than any cutoff.

## What the MDS introduction settled

WHO-HAEM5's *Myelodysplastic neoplasms: Introduction* is a **framing** chapter, not a criteria
chapter. It fixes the vocabulary the whole family shares and says nothing about any individual
entity, so it settles the items below and leaves the blast bands, the del(5q) rules and the
MDS-SF3B1 criteria exactly as unverified as they were.

**One set of cytopenia numbers now serves three families.** `MDS_CYTOPENIA` (`MarrowFindings.js`)
— Hb < 13 g/dL male / < 12 female, ANC < 1.8 × 10⁹/L, platelets < 150 × 10⁹/L — is adopted across
CCUS, MDS and MDS/MPN "in view of their biological and clinical overlap", which is why it lives in
one constant rather than inside any rule.

**`findingCytopenia` is deliberately no longer "chip first", and `bloodApplyCBC()` is the reason.**
The Blood tab autofills `pbHgb` / `pbNeut` / `pbPlt` from the analyser's flag the moment a CBC is
pasted, so on the common path the chip is not a judgement at all — it is the flag wearing a chip's
clothes, and taking it at face value let the *reporting laboratory's* reference range decide a WHO
criterion. That is the one thing `MDS_CYTOPENIA` exists to prevent. So the chip is compared against
what the autofill would have written: **agreeing with the flag means nobody has weighed in and the
number decides; disagreeing means a human moved that chip deliberately, and the override still
wins** — the half of "chip first" that was ever load-bearing. With no number at all the chip is the
only answer there is.

**The blood report is a different question and still says what the laboratory said.** "The blood
shows anemia" describes a count against the range it was measured in; "at least one cytopenia" is a
criterion with published numbers. At the boundary the two may legitimately disagree, and a female
haemoglobin of 12.6 flagged low is exactly that case.

**Haemoglobin is the one criterion that can straddle**, and `findingAnemiaValue` treats it the way
`findingErythrocytosis` treats the other end of the same measurement: with no sex recorded, < 12 is
anaemia whoever the patient is, ≥ 13 is not, and the band between stays **null** rather than picking
a side.

**The mild-anaemia waiver is the first criterion in the engine the source itself says may be
waived.** "A diagnosis of MDS may still be made in patients with milder degrees of anaemia if
definitive morphological and cytogenetic findings are present." `dxGate.mdsCytopenia` returns
**null, never true**, when dysplasia is present alongside a definitive cytogenetic finding
(`dxDefinitiveCytogenetics` — del(5q), −7/del(7q), complex, or an MR abnormality *named on a
karyotype*). The criterion genuinely is not met and claiming otherwise would be worse than the
failure it replaces; unknown is what "decide this clinically" looks like in a three-valued engine,
and it keeps a del(5q) marrow with unequivocal dysplasia from vanishing over a haemoglobin of 13.2 —
the exact failure mode the known-deviation note above describes. **CCUS and ICUS keep the unwaived
`dxGate.cytopenia`**: their cytopenia is the subject of the category, not a supporting criterion, and
there is no definitive morphology on that branch to waive it with.

**`dxExcludeBiTp53` is the family's one internal precedence rule, and it is one-directional.** MDS
with biallelic *TP53* inactivation "supersedes MDS-5q and MDS-SF3B1" — categorical, since that is
what supersedes means. The converse is explicitly *not* true and must not be added: an *SF3B1*
mutation, or a *TP53* mutation that is not multi-hit, "does not per se override the diagnosis of
MDS-5q". The asymmetry is the rule, not an omission.

**`dxMdsCaution()` is attached to the family rather than to any rule**, because its first half is the
chapter's own general precaution and it is true of every MDS candidate: cytopenia and dysplasia are
not specific, no case should be classified without the clinical and drug history, and none should be
reclassified on growth factor therapy. Three further clauses fire only on the case in front of them
— the waiver, the proliferative-count redirect, and what the blast percentage actually rests on.
`{ thrombocytosisAllowed: true }` exists for **MDS-5q alone**, the one type in which platelets
≥ 450 × 10⁹/L are permitted instead of a redirect to the overlap family.

**Neutrophilia defers to the laboratory.** The chapter names it among the proliferative features that
redirect a cytopenic, dysplastic case to MDS/MPN and gives no count; CNL's ≥ 25 × 10⁹/L is a
criterion for a different disease. So `counts.neutrophilia` reads the analyser's own *high* flag
through `findingCbcFlag` (tri-valued — null when the component was not in the paste) rather than a
threshold invented here.

**MDS-LB-RS is an alternative NAME, not an entity**, and `mdsLB.whoFor` is where it lives. MDS-SF3B1
now captures > 90% of what used to be MDS-RS, so the old name was retained only "for cases with
wildtype *SF3B1* and/or ≥ 15% ring sideroblasts". **The and/or is load-bearing** — either half
suffices — but ring sideroblasts nobody looked for gives the plain name, since the alternative
asserts a finding. *SF3B1*-mutated cases cannot reach the rule at all (MDS-LB excludes them as the
residual category), so this can never rename the entity that supersedes it.

**The blast-count caution says what the percentage rests on**: 500 nucleated cells in the marrow and
200 leukocytes in the blood are the recommended differentials, and in this family the blast
percentage frequently *is* the classification. A short count is named with its actual denominator; a
CD34 immunohistochemical estimate gets its own sentence, because an estimate and a differential are
not the same claim (`f.blasts.marrowBasis` already carried the distinction).

**The Cytopenias audit row names lineages rather than counting them.** With the thresholds now
deciding this from pasted numbers, "1" cannot be audited — and a straddling haemoglobin with no sex
recorded reads as unknown, which is not the same as normal.

**MDS-IB2's divergence note carries the AML-equivalence sentence**, since it is the practical
consequence of the WHO/ICC split it already explains: WHO retains MDS-IB2 where ICC says MDS/AML, but
WHO itself notes IB2 may be regarded as AML-equivalent for therapy and trial eligibility.

**MDS-h gets a caution the rest of the family does not**, naming aplastic anaemia and PNH: the three
share a T cell-mediated attack on stem and progenitor cells and an association with clonal
haematopoiesis, so they overlap in exactly the marrow that reaches that rule.

## MDS-5q — the first rule written from its own criteria box

Everything below came from WHO-HAEM5's *MDS with low blasts and 5q deletion* chapter. It is the one
`mds*` rule that is no longer recollection, and reading it against the source corrected three
criteria, the entity's name, and the shape of its `supports`.

**The name lost a word.** WHO-HAEM5 calls it *MDS with low blasts and 5q deletion* — not "isolated
5q deletion", which was the 4th edition's name and remains ICD-11's label. The word had to go
because the entity no longer requires isolation.

**Three criteria were wrong.** The `requires` array is now the box's five essential criteria in its
order: **anaemia** (not the family's generic "at least one cytopenia" — `dxGate.mdsAnemia`),
**megakaryocytic dysplasia** (essential, where it had been a +2 support — `dxGate.megDysplasia`),
marrow blasts < 5%, **blood blasts < 2%** (missing entirely), and del(5q) alone or with **one**
additional abnormality other than −7/del(7q). That last one counts `genetics.abnormalities`, since
"isolated or with one additional" is a criterion about the karyotype's size; a complex karyotype
recorded as the single key `complex` is caught by an exclusion instead.

**On this rule the anaemia gate can never hard-exclude, and that is deliberate.** del(5q) plus
megakaryocytic dysplasia — two of the rule's own essential criteria — is itself `dxWaiverFindings`,
so a non-anaemic del(5q) marrow lands in `incomplete` with the waiver printed rather than vanishing.
The classification says this is the case to decide clinically; the comment puts the thresholds in
front of the reader to decide it with. `dxWaive(f, value)` is the shared applicator so the generic
gate and this one cannot drift.

**Its `supports` are the first real likelihood ladder in the table** — the thing
`docs/diagnosis.md` has been asking for above and that no rule had. Every clause below the defining
abnormality is a frequency the chapter publishes rather than a criterion restated: non-lobated /
hypolobated megakaryocytes **+3** (the characteristic morphology, where the gate takes the generic
form), megakaryocytes increased in number **+2**, macrocytic anaemia **+2**, thrombocytosis **+1**
(one third of cases), female sex **+1** (the introduction names MDS-5q as the exception to MDS's
male predominance). Two negatives carry the chapter's own hedges: significant granulocytic dysplasia
**−2** ("uncommon") and MF-2/MF-3 **−2** ("typically absent"). Neither disqualifies, because neither
is written as a criterion.

**`MEG_5Q_PATTERN` is two keys and the restraint is the point.** `hypolobatedForms` and
`smallHypolobated` — `micromegakaryocytes` and the widely-separated-lobe descriptors are the general
MDS megakaryocyte vocabulary, and folding them in would score every dysplastic marrow as 5q-like.
What discriminates is the *lobation*. Unlike the two MPN patterns it reads the aspirate as well as
the core: those are architectural and exist only in a section, but lobation is a feature of a single
cell and a smear shows it at least as well.

**Four cautions, each firing on a finding that would otherwise mislead**: a *TP53* mutation (reduced
lenalidomide response, higher transformation risk, up to 18% at diagnosis) or, when *TP53* is
unresolved, the p53 immunohistochemistry note; *SF3B1* or ring sideroblasts **do not exclude** this
diagnosis (mutated in ~20%, probably a secondary event) — said because the engine visibly drops
MDS-SF3B1 and the reader would otherwise wonder; a concomitant *JAK2*/*MPL* mutation alters neither
phenotype nor prognosis and may sit in a different clone — said because the engine will have an MPN
candidate on the list; and thrombocytopenia as a marker of advanced disease, which is reported and
never scored.

**One bug fell out of reading the output, and the first fix for it was aimed at the wrong
question.** "In the absence of disease-defining genetic alterations" was dropped only when a
myelodysplasia-related *mutation* was named, so a del(5q) case read *"in the absence of
disease-defining genetic alterations, the findings are best classified as MDS with low blasts and 5q
deletion"* — the abnormality naming the entity in the same sentence. `dxDefiningGeneticsFound()` was
extended to cover the cytogenetic half, which fixed the case where del(5q) is **present** and left
untouched the one where it is **unknown**: with the karyotype outstanding the guard read `null` as
absent, the clause printed, and the very next sentence said the cytogenetics were awaited. Three
claims in two sentences, no two compatible — and the middle one is the dangerous one, because
del(5q) is not a morphologic diagnosis.

**The register is a property of the ENTITY, not of the case's findings**, which is what the first
attempt missed. `dxDefiningGeneticsFound()` asks "did this case turn up anything defining?"; the
sentence is a claim about the entity being named, and MDS-5q carries its alteration in its own title
whatever else the genetics show. So a rule now declares what defines it —

```js
definedBy: { finding: f => f.genetics.del5q, phrase: 'deletion of 5q', study: 'cytogenetic' }
```

— and `dxClassificationSentence()` (kernel) writes the conditional whenever that finding is not
`true`: *"In correlation with cytogenetic studies demonstrating deletion of 5q, the findings **would
be** best classified as…"*. The candidate is still offered and still ranks on its morphology; only
the mood moves. A rule that declares no `definedBy` is not genetically defined — MDS-LB, the
classical MPN triad, AML defined by differentiation — and keeps the flat register.

Declared by: `mds5q`, `mdsSf3b1`, `mdsTp53`, `cml`, the eight defining-lesion AML rules, `amlNpm1`,
`amlCebpa`, `amlTp53`.

Two smaller members of the same family were fixed with it. `dxAmlFindings()` printed *"Cytogenetic
studies show t(15;17)/PML::RARA"* from the **rule's own spec**, with no reference to the case — a
fabricated laboratory result, and the worst form of the bug, since every other form states a
conclusion the reader can weigh. And the surviving absence clause now reads "in the absence of a
**demonstrated** disease-defining genetic alteration": unknown is not absent, and nothing has been
demonstrated is all that can honestly be claimed while the studies are out.

## MDS-SF3B1 — the second rule read against its box

From WHO-HAEM5's *MDS with low blasts and SF3B1 mutation*. Two of six essential criteria were
missing and one was being applied more loosely than the box allows.

**Two criteria were absent.** `requires` is now the box's list: SF3B1 mutation, **erythroid lineage
dysplasia** (`dxGate.erythroidDysplasia`, new — the rule had the generic "dysplasia in ≥ 1 lineage",
which admits a purely granulocytic marrow to a disease of ineffective erythropoiesis), marrow blasts
< 5%, **blood blasts < 2%** (missing, exactly as in MDS-5q), and at least one cytopenia. The
"without thrombocytosis" half of the cytopenia criterion was already carried as an exclusion,
pointing at MDS/MPN-SF3B1-T.

**The mutation criterion has a floor.** "The presence of a SF3B1 variant at a VAF of < 5% does not
qualify" — so `genetics.sf3b1Vaf` is read *inside* the gate and a reported fraction below 5 makes it
**false** even though the gene is mutated. This is the only place in the table where a recorded
mutation does not count as one. A variant the laboratory reported without a fraction is unaffected:
no number is not a low number, and the gate stays true.

**The surrogate is stated, not admitted.** The box lets ring sideroblasts ≥ 15% stand in for the
mutation "if SF3B1 mutation analysis is not available" — but the terminology note is equally
explicit that a case diagnosed that way is called *MDS with low blasts and ring sideroblasts*, which
is precisely what `mdsLB.whoFor` already emits. Admitting the surrogate into `mdsSf3b1.requires`
would put one case on screen twice under the same name. So an untested case sits at `pending`
(`findingGene` returns null until NGS results), the caution states that the surrogate satisfies the
criterion and names the term to use, and the two candidates the reader sees are the honest pair:
*MDS-SF3B1 once you sequence*, or *MDS-LB-RS if you cannot*.

**The wildtype exclusion names the gene.** "A mutation in a spliceosome component in a case with
wildtype SF3B1 excludes MDS-SF3B1" is only reachable once the SF3B1 gate has already failed, so it
never changes a bucket. It is there for the audit trail: *excluded: a spliceosome mutation with
wildtype SF3B1* tells the reader something *excluded: no SF3B1* does not, and the chapter says the
optimal classification of those cases is unresolved. `SPLICEOSOME_GENES_NON_SF3B1` deliberately
omits SF3B1 — including it would have the clause exclude the entity it defines.

**The second likelihood ladder.** SF3B1 **+4**; ring sideroblasts identified **+3** and ≥ 15%
a further **+2** (found in 90% of low-blast MDS with ≥ 5% ring sideroblasts, so each is strong
evidence of the other and neither is a criterion once the other is known); erythroid predominance
**+2** and hypercellular for age **+1** (the chapter's marrow description, in two halves);
microcytosis **−2**, granulocytic dysplasia **−1** ("most cases show none"), megakaryocytic
dysplasia **−1** ("uncommon"), MF-2/MF-3 **−2** ("typically absent"). Erythroid dysplasia is
**absent** from the list because it gates — restating a gate as a point is the deviation this
document opens with.

**Sex is deliberately unscored here**, and the contrast with MDS-5q is the reason to say so. The
chapter calls the male preponderance slight, and MDS overall has a slight male preponderance — so it
does not discriminate between this entity and the family it sits in, which is the only thing a point
is for. MDS-5q earns female **+1** precisely because it is the *exception* to that baseline.

**Macrocytosis scores nothing either.** The chapter allows "macrocytic normochromic **or**
normocytic normochromic" anaemia, so neither presentation is evidence. What means something is
*microcytosis*, and what it means is look elsewhere — hence the −2 and the mimic list below.

**The cautions are mostly about things a marrow cannot answer.** The non-neoplastic causes of ring
sideroblasts (alcohol, lead, benzene, isoniazid, zinc-induced copper deficiency, congenital
sideroblastic anaemia) are listed whenever ring sideroblasts are present, not merely when this rule
wins — the chapter says they "must be excluded", which is an instruction to the reader, and the
engine's job is to put the list in front of them rather than pretend it can check it. Congenital
sideroblastic anaemia gets its own sentence on a microcytic or a young patient. The favourable
prognosis is stated — this is the best-outcome MDS type — and withdrawn by name when
`SF3B1_ADVERSE_CO_GENES` fires, that list being the two published generations merged (TP53, RUNX1,
EZH2, FLT3, plus IPSS-M's BCOR, BCORL1, NRAS, SRSF2, STAG2).

**One bug fell out of running it, which the unit tests could not have caught.** `cellularity
.predominance` was written one closing brace too late and landed as a top-level `f.predominance`,
so the rule read `undefined` and the support never fired. The scratchpad fixture is hand-built and
had the field in the right place, so all 109 assertions passed against a shape the app did not
produce. Loading the page found it in one call. The same session also collapsed `chTest.js`'s
duplicate copy of that fixture into `harness.js`, since two copies is how the drift got there.

## MDS-biTP53 — the third rule read against its box, and the most under-representable

Its criteria box added **two essential criteria the rule did not have**: the cytopenia and the
dysplasia. Both had been left out on the assumption that the genetic lesion carried the diagnosis
alone — the same shape of error MDS-5q's box corrected — and it is worth naming the pattern, because
it is now three for three: **a rule written from recollection is too permissive, not too strict.**
The blast criterion also gained its other half; the box reads "<20% of cells in the peripheral blood
**and** bone marrow", and `dxGate.notAML` tested the marrow alone.

**That gate now carries a blood limb for every rule that uses it, and the limb is asymmetric.** The
blood may only ever *fail* it — a `null` blood leaves the answer to the marrow — because a blood
differential is often absent and an uncounted film must not put every myelodysplastic candidate in
doubt. Verified both ways: 25% blood blasts with a 12% marrow fails the gate; no blood differential
at all leaves it exactly as it was.

**Supersession widened from two entities to the family.** The Introduction says biallelic TP53
"supersedes MDS-5q and MDS-SF3B1" and that is all the narrower reading ever had; the entity's own
chapter says it "supersedes other MDS types", unqualified. The omission had a consequence worth
recording: a multi-hit TP53 marrow at 12% blasts scored 7 as MDS-IB2 against 6 as MDS-biTP53, so the
engine **ranked the superseded entity first** — on exactly the case the same chapter calls enriched
for biallelic TP53. `dxExcludeBiTp53` is now on `mdsIB1`, `mdsIB2`, `mdsF` and `mdsH` as well.

### Open items — what this chapter asks that the app cannot answer

More than any rule so far. Each is stated in the caution rather than guessed at, but four are
genuine gaps in `marrowFindings()` and are listed here because the code comments point at this list:

1. **Copy-neutral LOH has no finding, and its absence is a FALSE NEGATIVE rather than an unknown.**
   `tp53MultiHit` reaches `true` by two routes only — two mutations, or one plus `del17p`. A single
   mutation with documented cnLOH and no 17p deletion currently evaluates to **`false`** once the
   karyotype has resulted (`MarrowFindings.js`), which is an affirmative WHO case scored as failing
   the defining gate. This is the one item here that is a defect and not merely a limitation: it is
   the silent removal this document's known-deviation note is about, and it should probably become
   `null` until a `tp53Loh` finding exists. **Not changed without a decision** — `tp53MultiHit` is
   read by `amlTp53`, `mdsLB` and the two supersession excludes, so widening it to `null` weakens
   every one of them.
2. **A banding-level del(17p) is being used as a definitive second hit.** The chapter says the "mere
   detection of 17p13.1 deletion is not usually sufficient" and asks for FISH or another copy-number
   technique alongside sequencing of exons 4–11. Nothing distinguishes a FISH-confirmed 17p13.1 loss
   from a karyotype call, so the gate cannot be softened without a `tp53Fish` finding. Handled by
   saying so: `tp53VariantCount` was added to the findings surface for exactly this, so the caution
   can tell whether biallelic status *rested* on the karyotype and ask for the confirmatory study
   only then.
3. **Proerythroblasts are not counted at all.** ≥30% of marrow cellularity makes the case acute
   erythroid leukaemia and not this entity — a boundary that appears in the definition and in the
   differential diagnosis but *not* in the essential criteria, which is why it is a caution and not
   an exclusion. A counter cell would close it, the way `Promonos` closed the promonocyte gap; see
   [counter.md](counter.md).
4. **A VAF >49% is presumptive of the second hit — and the chapter says "not definitive".** So it is
   stated and never scored or gated, which is the clearest instance yet of a source explicitly
   asking for the null state. Its own precondition, that a constitutional TP53 variant be ruled out,
   is also unrecorded, and the caution says so in the same sentence.

Two smaller ones: the complex-karyotype support says "≥3 abnormalities" in its label but the finding
behind it is a ticked vocabulary key with no arity test, so the count is whatever the person ticking
it meant; and p53 immunohistochemistry, which the chapter offers as a screen correlating with VAF,
has no stain entry.

## MDS-LB — the fourth box read, and the one that corrected in the other direction

The residual category, and the first rule whose errors ran **outward** rather than inward. The three
boxes before it had each made their rule stricter — criteria left out on the assumption that a
defining lesion diagnosed the case by itself. This one was too **strict**, and in a way that is
specific to being a residual category.

### The supersession excludes read a lesion where the criterion is about criteria

MDS-LB's fifth essential criterion is "not fulfilling diagnostic criteria for MDS with defining
genetic alterations or hypoplastic MDS". That is a statement about the superseding entity's
*criteria*, not about its *lesion* — and the excludes were reading the lesion:

```js
['del(5q) defines this case', function (f) { return f.genetics.del5q; }],
['SF3B1 defines this case',   function (f) { return f.genetics.sf3b1; }],
```

A del(5q) accompanied by monosomy 7 is expressly **not** MDS-5q; an SF3B1 variant below 5% VAF
expressly does not qualify for MDS-SF3B1. WHO classifies both as MDS-LB. But `mds5q` excluded itself
on the monosomy 7, `mdsSf3b1` failed its own VAF floor — and then `mdsLB` excluded itself on the bare
lesion. **Both candidates were excluded, and excluded rows are filtered out of the Comments view, so
those cases came back with no myelodysplastic candidate at all.** This is the over-gating failure
this document names, arriving exactly where it was predicted to.

`dxMds5qTakesCase` and `dxMdsSf3b1TakesCase` (`MarrowDxMds.js`) mirror the disqualifiers of the rule
they defer to, and pass the finding's own three-valued answer through where the lesion is absent or
unknown — so an outstanding karyotype still leaves MDS-LB *unconfirmed* rather than *confirmed*.
**They must be kept in step with `mds5q`'s and `mdsSf3b1`'s own gates**, which is why they sit
immediately above them rather than inline. `mdsTp53` has no disqualifier beyond
`dxExcludeAmlDefining`, so the multi-hit clause stays a bare finding.

The generalisation that survives all four boxes is therefore about direction of **error**, not
direction of strictness: *a rule written from recollection states its own criteria too loosely and
other entities' criteria too crudely.* Defining rules leak in; residual rules leak out.

### The two-number blast criterion, and a bucket that was wrong on every case without a film

"< 5% bone marrow blasts **and** < 2% peripheral blood blasts" was encoded as two gates, and the
second one's `null` was the bug. An uncounted film left `lowBloodBlasts` unknown, so **MDS-LB could
never reach `supported` without a blood differential** — while `mdsH` and the MDS-IB rules, which
carry no blood limb at all, could. Bucket beats score in `dxRank`, so a hypocellular marrow with no
film headlined as MDS-h purely because the residual category had an extra way to be unsure.

`dxGate.lowBlastsBoth` merges them with the asymmetric limb `dxGate.notAML` established: **the blood
may only ever FAIL, never contribute an unknown.** The cost is one line of audit trail — one combined
criterion where the reader used to see two — which is the right trade for a bucket that was wrong on
every case without a differential.

### `dysplasia.count` is a floor, not a count

`summariseDysplasia` returns `positive.length` as soon as *any* lineage has an answer, and carries
`assessed` beside it precisely so a caller can tell the two apart. Nothing in the rule table read
`assessed`. So a case where only the erythroid lineage was looked at, and it was dysplastic, was
**named** "single lineage dysplasia" in the ICC line and scored +2 for it.

The asymmetry is the fix: two dysplastic lineages are multilineage whatever the third turns out to
be, so MLD is safe on `count >= 2`; single-lineage is a claim only once `assessed === 3`. Applied in
three places — the support, `whoFor` and `iccFor`.

**The subtypes are named, not split into two rules.** SLD and MLD share every gate and differ only in
a lineage count, so a split would double four gates, put two near-identical cards on screen, and ask
the engine to rank a distinction that is arithmetic.

### Open items

1. **Megaloblastoid change alone satisfies the dysplasia gate, and it is the deficiency mimic.** The
   chapter says megaloblastic changes "by themselves are insufficient to establish dyserythropoiesis",
   and the fourth essential criterion asks for nutritional deficiency to be excluded — so the one
   feature that cannot establish erythroid dysplasia is also the morphologic signature of the thing
   most likely to be causing it. `megaloblastoid` currently sits in `dysplasticDescriptors.erythroid`
   (`MarrowFindings.js`) like any other descriptor, so a marrow whose only erythroid finding is
   megaloblastoid change returns `dysplasia.any === true`. **Not changed without a decision** — the
   fix is to split the vocabulary so the descriptor is admitted only alongside another feature, and
   that touches every rule that reads dysplasia. Handled meanwhile by a caution on `mdsLB` that fires
   when it is the *only* erythroid feature recorded.
2. **`mdsH`'s cellularity gate says "age-adjusted" and tests the raw percentage.**
   `f.cellularity.hypoForAge` is the age-adjusted question and `f.age` is often available via
   `cbcPatientAge()`. `mdsLB`'s new hypoplastic exclude deliberately reads the *same* raw number as
   `mdsH`'s gate, so the two agree — fixing one without the other would split them. Out of scope for
   this box; it is `mdsH`'s bug, and its own chapter has not been read yet.
3. **ICC 2022 recognises "MDS, NOS without dysplasia"** (for cases with −7/del(7q) or a complex
   karyotype and no dysplastic lineage). That case is unreachable here, because `dxGate.dysplasia` is
   a `requires` — correctly, per WHO. So it is an ICC-side gap rather than a bug, and `iccFor`'s
   `'MDS, NOS'` fallback would be its natural home.
4. **Serial differentials have no representation.** "The finding of rare blasts in the peripheral
   blood on two separate occasions may qualify as MDS with excess blasts" — the app records one
   occasion and has no view of a prior count, so this can only ever be the prompt it now is.

## MDS-IB and hMDS — the fifth and sixth boxes, read together

They were read as a pair because they share a boundary: hMDS's essential criteria exclude MDS-IB
outright, while MDS-IB's chapter says the marrow is hypocellular "in a minority of cases". Read
together they are unambiguous — **the blast count decides, and cellularity is the tie-break only
below 5%.** A 20%-cellular marrow with 8% blasts is MDS-IB1 *because* of the blasts, not in spite of
the hypocellularity.

### The engine was offering frank AML as MDS-IB

The worst defect found in any box so far. The IB blast gates OR-ed a marrow limb and a blood limb
with **no ceiling read across them**, and neither IB rule carried `dxGate.notAML`:

```js
const marrow = dxBetween(f.blasts.marrow, 10, 19);
if (marrow === true) return true;
const blood = dxBetween(f.blasts.blood, 5, 19);
if (blood === true) return true;
```

A marrow of 25% with 6% blood blasts returned `true` on the blood limb: `mdsIB2` reached `supported`
with nothing in `excludes` to stop it, because `dxExcludeAmlDefining` fires only on a *genetic*
lesion. The same case at 3% blood passed `mdsIB1`.

`dxMdsIbBand` folds the 20% ceiling in rather than adding `dxGate.notAML`, because that gate's marrow
limb returns `null` on an uncounted marrow — which would leave every blood-only case `incomplete` for
want of an aspirate, the same bug `lowBlastsBoth` exists to prevent, arriving from the other side.
Here the ceiling may only ever **fail**.

### `dxBetween` is inclusive; the box's bands are half-open

The bands were spelled `5–9` and `10–19` with `dxBetween`, which is inclusive at both ends. Blast
percentages are not integers — `findingBlastPct` sums allocated percentages off a 500-cell
differential, and `dxPct` exists precisely because a non-integer is expected. **A marrow of 9.5% was
`false` on IB1 and `false` on IB2**, and `mdsLB` had already excluded it: no candidate at all. 19.4%
did the same at the top. `dxAllOf([dxAtLeast(…), dxBelow(…)])` is the half-open form and has no hole.

### Three more things the and/or sentence was hiding

- **`mdsF` had no blood limb at all** — and it is the one subtype where the aspirate routinely fails
  ("bone marrow smears are often suboptimal or inadequate"). The rule refused to read the blood on
  exactly the cases that have nothing else.
- **The +4 support read the marrow only.** On marrow 7% / blood 6% — MDS-IB2 by the box — IB1 scored
  4+3 and IB2 scored 0+3, so the engine head-lined the wrong subtype on the case the blood limb
  exists to promote. Both now read the same helper as the gate.
- **Nothing made IB2 take precedence over IB1** when both limbs were live. `dxMdsIb2TakesCase` is an
  exclude on IB1, and it defers rather than vanishes because IB2 shares every other gate IB1 has.
- **IB1/IB2 were not gated on the absence of fibrosis**, so a fibrotic case was offered under all
  three names at equal score. `dxExcludeMdsFibrosis` collapses to a boolean, so an *unperformed*
  reticulin leaves IB1/IB2 alone and only `mdsF` unconfirmed.

### hMDS: three of five essential criteria were wrong

- **The cellularity threshold is two-tiered and the tier is the patient's age** — "below 30% in
  patients younger than 70 years and below 20% in patients aged ≥70". The gate was a single raw cut
  at 25% whose label already claimed an age adjustment it never made. This is the open item the
  MDS-LB pass flagged, answered by its own chapter. `f.age` comes from a DOB line in the pasted CBC,
  so it is null on most cases; `dxHypoplasticCellularity` therefore **straddles** — outside 20–30 the
  two tiers agree and the answer is given regardless, inside it the answer is `null`, because picking
  a tier would be inventing the patient's age.
  `f.cellularity.hypoForAge` is *not* this criterion and must not be substituted: its band floor
  bottoms out at 30% for every age over 60, so at 75 it calls a 26% marrow hypocellular where the
  entity does not.
- **The dysplasia criterion is narrower than the family's** — "granulocytic and/or megakaryocytic",
  and the differential says why: aplastic anaemia itself "may be associated with dyserythropoietic
  changes", so erythroid dysplasia cannot carry this diagnosis at all. `dxGate.myeloidOrMegDysplasia`
  joins `megDysplasia` and `erythroidDysplasia` as the third lineage-specific gate.
- **The blast criterion was missing its blood limb**, which is what implements this box's exclusion
  of MDS-IB. MDS-IB1 starts at 2% *blood* blasts, so a hypocellular marrow with 3% marrow and 3%
  blood blasts satisfied hMDS and MDS-IB1 at once. With `lowBlastsBoth` the two partition exactly.

**The partition is arithmetic, and must stay that way.** No cross-exclude is needed in either
direction, and **the MDS-IB rules must never acquire a cellularity gate, exclude, or negative
support** — not even a mirrored −2 on hypocellularity. `mdsLB`'s hypoplastic exclude must not be
copied onto them either. Any of those would send a hypocellular 8%-blast marrow into a hole with no
myelodysplastic candidate: excluded from hMDS by blasts, from MDS-LB by blasts, and from MDS-IB by
cellularity.

`mdsLB`'s exclude moved in step, from the raw cellularity to `dxMdsHTakesCase`, because once hMDS's
dysplasia gate narrowed the two entities stopped agreeing on every case that clears the cellularity:
a 15%-cellular marrow whose only dysplastic lineage is erythroid is **not** hMDS but **is** MDS-LB.

### Open items

1. ~~**Auer rods are not recorded anywhere in the application.**~~ **Closed** — see
   "Auer rods, and the shape of a finding that can only promote" below.
2. **A cellularity entered as a range is invisible to every rule.** `f.cellularity.pct` reads
   `#coreCellAbs` only, and `coreCellExclusive()` clears the absolute the moment a range is typed. So
   "10–20% cellular" leaves `pct === null`, hMDS's defining gate permanently unknown, and `mdsLB`'s
   hypoplastic exclude never firing. `f.cellularity.quality` and `f.cellularity.severity` are exposed
   and read by no rule in the table. The fix is a `pctRange` field graded by its worse edge, the
   convention `coreCellDerive` already uses.
3. **ALIP has no finding.** "Abnormal localization of immature precursors" is the chapter's
   characteristic architectural feature and the `coreIncreasedBlasts` descriptor is the closest
   thing, which `marrowFindings()` does not read at all.
4. **Neither the germline status of a variant nor the family history is recorded**, and hMDS's box
   asks for both — germline GATA2, DDX41, Fanconi and telomerase-complex mutations "should be
   excluded, especially in younger individuals, on the basis of comorbidities and family history".
   The caution names whichever of those genes the panel reported and says the app cannot tell
   germline from somatic, which is the honest half-answer.
5. **PNH by flow cytometry cannot be seen at all** — there is no flow finding of any kind. `PIGA` is
   at least on the NGS panel and is read out of `f.genetics.somaticGenes` for the caution.

## Auer rods, and the shape of a finding that can only promote

**The gap that closed this was in the FORM, not in the engine.** MDS-IB2's definition has two halves
joined by "or" — "≥10% and <20% blasts in the bone marrow and/or ≥5% and <20% in the peripheral
blood; without significant reticulin fibrosis **or with the presence of Auer rods**" — and the
second half needs no number at all. A 6% marrow with Auer rods is MDS-IB2; the same marrow without
them is MDS-IB1. One morphological finding, one subtype apart. The engine could not read it because
nothing in the application recorded it, so `dxMdsIbCaution` said so in prose and gated nothing.

**Blasts now carry a morphology dropdown on both smears** — `pbBlastDesc` on the Blood tab's presence
row and `aspBlastDesc` on the Aspirate tab's Blasts row, both offering `BLAST_DESCRIPTORS`
(`MarrowDescriptors.js`). `findingAuerRods()` reads both groups and surfaces `f.blasts.auerRods`;
`dxMdsIb2TakesCase` adds a second band spanning the whole of MDS-IB (5–19% marrow, 2–19% blood) that
only opens when the rods are named.

**The field is `true` or `null` and NEVER `false`, and that asymmetry is the design rather than an
omission.** A negative would have to be a stop chip, and a stop chip clears its group — which would
make "no Auer rods" contradict "agranular cytoplasm", two statements that are not alternatives.
So silence here means *nobody looked*, and the caution says exactly that on every case that did not
name them. What the asymmetry buys is that this clause **can only ever add**: a case that never
touched the dropdown scores precisely as it did before the clause existed, and no rule may read
`=== false`. Verified: 1890 synthetic cases across the blast, cellularity and rod axes, no throws,
and every `auerRods: null` row identical to its pre-change ranking.

**What it must NOT do is drag a low-blast case upward.** The criterion is "at any blast count *within
this range*", so the rod limb is a band and not a bypass: a 3% marrow with Auer rods stays MDS-LB,
and a 25%/6% case stays acute leukaemia because `dxMdsIbBand`'s 20% ceiling is read before either
limb. Both are in the verification matrix, and the second is the one to keep pointed at — a rod limb
written as a bare `auerRods === true` would have re-opened the AML leak from the other side.

**`BLAST_DESCRIPTORS` is the one key list that lives in `MarrowDescriptors.js` rather than in a tab**,
and the reason is this engine seam. Every other group's keys are spelled out in the tab that offers
them, and the lymphocyte list is duplicated between Blood and the aspirate on purpose — the two
happen to agree today and either may add a word. Here they may not: the engine reads Auer rods out of
*both* groups, so a key in one list and missing from the other would make the same finding
classifying on one slide and invisible on the other.

## The boundary rules — CHIP, CCUS, ICUS, and no neoplasm

**Three of them are one decision tree and must be read together.** A clone with intact counts is
CHIP; the same clone with an unexplained cytopenia is CCUS; the same cytopenia with no clone found
is ICUS. The cytopenia gate separates the first from the second and the somatic mutation separates
the second from the third, so those three sets are disjoint by construction and the engine can never
offer two of them at once.

**`noNeoplasm` is not the fourth leaf of that tree, and building it as one was a real bug.** It used
to carry `['no cytopenia', …]` as a gate so the four rules would partition the space — which meant
recording **anaemia excluded "no morphologic evidence of a myeloid neoplasm"**, and the card read
*Ruled out by no cytopenia* on a marrow whose only finding was that the patient was anaemic. A
cytopenia is a blood count; it cannot create morphologic evidence of a neoplasm in a marrow that
shows none. The other three name a **clinical** entity, each asserting something about the count and
about clonality that a pathologist cannot establish from a slide; this one makes a **morphologic**
statement and nothing more, so it is legitimately available underneath all three. The gate is gone,
`noNeoplasm` carries the table's highest prior (+2 — most marrows sent to answer "is this a myeloid
neoplasm?" are not one), and on a cytopenic bland marrow it is *expected* to rank beside ICUS rather
than instead of it. Two candidates saying compatible things is not a defect; the earlier silence
was. What keeps it honest is what always did — the dysplasia and blast gates, which a dysplastic
marrow cannot pass whatever the count says.

**Its comment is new, and it exists because of that change.** `noNeoplasm` used to fall through to
the generic `dxComment`, producing "the findings are best classified as no morphologic evidence of a
myeloid neoplasm" — a sentence that classifies a case as an absence and says nothing at all about
the blood count. It now names the cytopenias (`dxCytopeniasNamed`), says they are *not explained by
the marrow findings*, and — where nobody has sequenced — says out loud that a clonal cytopenia is
not excluded on morphologic grounds. `dxBlandMarrowText` prints only the negatives actually
established: "blasts are not increased" is a claim about a count and is dropped on an uncounted
marrow, the same rule `dxFindingReported` enforces for positive results.

**They are the one family read from the source text.** The criteria, the driver-gene table, the
0.5–1%/year progression rate, the higher-risk genes, the clone-size and multiple-gene risk factors,
the cardiovascular association and the VEXAS findings all come from WHO-HAEM5's clonal
haematopoiesis chapter — unlike the MDS rules (recollection) and the MPN rules (secondary
literature).

**Table 2.02 is transcribed whole** into `CH_DRIVER_TABLE` (`MarrowFindings.js`) — all-or-nothing by
necessity, since a partial copy would let a real driver read silently as a passenger. Each row
carries the criteria column in the four shapes it takes (`truncating`, `ranges`, `positions`,
`changes`) plus the table's own common/other `tier`. Separately, `CH_HIGH_RISK_GENES` is the
chapter's *prose* list of genes carrying a greater risk of progression, which is **prognostic and
never scored** — a high-risk gene does not make clonal haematopoiesis a likelier answer than any
other clone would.

**The gate is gene membership; the qualifying region only scores.** This is the chapter's own
division, not a convenience: a mutation *outside* the specified region "may still qualify if
predicted to be deleterious and not a rare, non-pathogenic variant", so a region mismatch can never
close the criterion — it costs the +2 and prints the waiver question back to the reader
(`dxChRegionText`). A mutation in no listed gene at all *is* a real negative; that is what the table
is for, and it takes the case to `noNeoplasm` with a caution naming the gene.

**`chVariantQualifies()` reads free text and must be allowed to shrug.** Labs write `p.R882H`,
`p.Arg882His`, `R882H`, `c.2645G>A (p.Arg882His)` and bare transcript coordinates for the same
variant. The parser handles three-letter codes, stop and frameshift notations, and splice sites
written as intronic coding positions; it returns **null** for anything it cannot place, and null for
a residue whose substitution is unreadable when the row lists several alternatives at that codon
(`p.W515X` — MPL lists W515A/R/K/S/L, and which one it is decides the answer). The `c.` half of a
string is never read as a residue: that is precisely how a variant would land in a range it has
nothing to do with. Exon-restricted rows (ASXL1 11–12, PPM1D 5/6, CALR 9, NOTCH1 26–34) accept the
class match and record `exonUnverified` — a variant string carries no exon number, and guessing is
the one thing not allowed.

**CCUS deliberately does NOT gate on the table.** Table 2.02 is the published essential criterion
for *CHIP*; the criteria for a clonal cytopenia are their own chapter, unread here, and clonality
can be shown by findings the table does not cover. Being stricter than the source is worse than
being general, so the table informs CCUS's comment and never closes the category.

**The clone-size criterion excludes, and is never required.** VAF ≥2% (≥4% for an X-linked gene in a
male — a hemizygous X reads at twice the fraction, so the higher bar is the same clone size) is
`dxExcludeSubthresholdClone`, which fires only on a *known* sub-threshold fraction. As a `requires`
clause it would read unknown whenever the VAF column was blank, which is most cases, and every CHIP
comment would then be written as though awaiting a study that had already resulted. A sub-threshold
clone lands on `noNeoplasm`, whose caution says the chapter's own line about it rather than leaving
a reported variant unmentioned.

**Clone size is named as a risk factor and never asserted for the case.** "A large clone portends an
increased risk" is the chapter's sentence; what counts as large it does not say, and both cutoffs in
circulation (VAF ≥10%, ≥20%) come from outside it. The allele fraction is printed a sentence
earlier, so the reader can weigh it — better than inventing a threshold and hiding it in a
judgement. The other two factors, multiple mutated genes and a higher-risk gene, are categorical.

**`noNeoplasm` scores a clone at −2 rather than gating on it.** The absence of morphologic features
of a myeloid neoplasm is precisely what CHIP requires, so a clone does not make that statement
false — it makes it the wrong headline, and without the penalty the marrow that *is* clonal
haematopoiesis ranked "no morphologic evidence" first, 5 to 4, with the clone mentioned nowhere.
Gating it instead would make every unsequenced reactive marrow — most of them — read as awaiting a
study nobody ordered.

**ICUS says which of two things it is looking at.** ICUS and CCUS are separated by sequencing alone,
and the chapter says in terms that flow cytometric and immunohistochemical surrogates are not
recommended for the purpose. So a cytopenia with NGS genuinely negative is ICUS; a cytopenia nobody
sequenced gets the *provisional* wording and a sentence saying why. **Its support clause's label and
predicate used to disagree** — "cytopenia without dysplasia or a clonal marker" tested the dysplasia
alone, so it scored identically on an unsequenced case and on a sequenced-negative one, which is the
entire difference the comment spends a paragraph on. What separates ICUS from CCUS is a *negative
molecular result*, so that is what earns the points now; the absent dysplasia is the gate and is not
paid twice.

**VEXAS is the one gene symbol that changes what the comment is about.** A recorded *UBA1* variant
raises `dxVexasNote` on CHIP and CCUS — the syndrome, the vacuolated myeloid and erythroid
precursors to go back to the slide for, and the instruction that a marrow meeting MDS criteria is
diagnosed as MDS. There is no reverse test: this app does not record cytoplasmic vacuolation, so a
marrow cannot prompt the sequencing.

**Toggle-group VALUES are not guessable from their labels** — the platelet row reads Low/Normal/High
but stores `decreased`/`adequate`/`increased`, while the lineage matrix stores `low`/`normal`/`high`,
and the aspirate's blast chip stores `adequate` for "not increased". A wrong guess fails **silently**:
it reads as "assessed, not cytopenic" and quietly removes a criterion from every case. The vignette
harness caught exactly this; keep it pointed there.

