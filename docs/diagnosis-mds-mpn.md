# The MDS/MPN overlap candidates

> Split out of the root `CLAUDE.md` so it is read on demand. Two rules today —
> `cmml`, written from its own criteria box, and `mdsMpnSf3b1T`, which was not.

## The chapter re-read (2026-07-27)

**CMML's defining count drove the NAME and never the score.** `dxCmmlSubtype` reads
the white count against the chapter's own cut-off — *"The clinical and molecular
distinction between MD-CMML and MP-CMML based on a white blood cell count cut-off point
of 13 × 10⁹/L { 7986717 }, has been substantiated in multiple studies"*, with MP-CMML
*"ranged from 39% to 63% of all CMML cases"* — and then scored nothing for it. It is now
the lowest rung of the registry's shared `wbcMagnitude` ladder, which is the argument for
a shared ladder rather than three private ones: CML's rungs start at 25 because 13 is far
below its range, and each entity draws only the rungs it has a chapter for.

**The monocytosis was a boolean and the chapter quantifies it.** `f.counts.monocytosis`
fires identically at 0.51 and at 12.0 ×10⁹/L; *"Although the majority of patients with
CMML have absolute monocytosis with monocyte counts of ≥ 1 × 10⁹/L"* is a separate,
higher statement, now +2 on `f.counts.monocyteAbs`.

**The marrow monocytes went 2 → 3**, because no other rule in the table scores them at
all *and* the chapter nominates the finding as its own tie-breaker for the band where the
criteria are strictest: *"Such an increase is helpful in cases where the absolute
monocytosis count in the peripheral blood is ≥ 0.5 × 10⁹/L but < 1.0 × 10⁹/L."* A finding
a chapter names as its discriminator should not be priced like a supporting one.

**Two negatives the chapter states and the rule never read.** *"Detection of Auer rods is
rare, and such a finding should first prompt a thorough molecular genetic evaluation to
exclude AML"* → −2, and never an exclusion, because the same paragraph says such cases
stay CMML absent an alternative. *"complex karyotype is less common"* (against *"The
majority (~70%) of patients with CMML have a normal karyotype"*) → −1, where a complex
karyotype is >90% of MDS-biTP53.

**Dysgranulopoiesis went 2 → 1.** It discriminates against the MPN and boundary half of
the table and not against the eight-rule myelodysplastic block it most often competes
with, where dysplasia is definitional — and the chapter hedges it twice (*"is present to
varying degrees"*, *"Dysplastic changes may be mild in MP-CMML"*).

**A weight was REMOVED for being unsourced.** `dxLikelihood.neutropenia` carried
`cmml: {for: 1}`, justified by the quote *"Most patients present with anaemia"* — which is
the anemia entry's sentence, pasted under neutropenia. The word "neutropenia" appears
**zero times** in the chapter (verified by grep). An unsourced number is worse than a
missing one: it cannot be checked and it moves the ranking anyway.

## What has been read, and what has not

**CMML is the third rule in the engine written from its own criteria box** (WHO-HAEM5
Box 2.19, with the chapter text alongside it), after MDS-5q and MDS-SF3B1. **The box is now
pasted at `docs/who/cmml-box-2.19.md` and the rule reads correctly against it** — the essential
criteria, the count-dependent requirement rule, the footnote-b history exclusion, and the
CMML-1/CMML-2 split all match; only the reference topic's reconstruction (made after the original
box text was lost) had drifted, and has been corrected. Criteria,
subtyping, subgrouping, the mutation landscape and the demographics all come from
there. `mdsMpnSf3b1T` is still secondary-literature recollection and is the worked
example of the known deviation in [diagnosis.md](diagnosis.md): anaemia sits in its
`requires` as a hard gate, so recording anaemia as *absent* drops an *SF3B1*-mutated,
thrombocytotic case off the list entirely.

**ICC 2022's Table 13 has now been read too**, which makes `cmml` the only rule in this
family with both classifications behind it — and they agree on less than the shared name
suggests. `icc` stays `null` because there is no second *name* to print (both call it
chronic myelomonocytic leukaemia, and both lowered the absolute monocyte threshold to
0.5 × 10⁹/L — the item most often misreported as a WHO-only change). The **criteria**
differ in four places, and those are carried by `divergence`; see below. ICC's own
subtyping and subgrouping text was **not** part of what was read, so the MD/MP and
CMML-1/CMML-2 wording in the comment is WHO-HAEM5's and says so.

**Table 2.13 has been read** and is now `CMML_GENES` (`MarrowFindings.js`), in the table's
own four pathway groups. Two genes are in the list without being in the table — `PTPN11`,
which is in the chapter's prose, and nothing else; and `NPM1` is in the table and kept even
though an *NPM1*-mutated case is excluded from the rule outright, because the exclusion is
the rule's job and a landscape list quietly missing a gene the table prints is the harder
thing to check.

Still unread for this family: **ICC 2022's criteria for `mdsMpnSf3b1T`**.

## The requirement rule is the unusual part

Four essential criteria, three **desirable** criteria, and then a rule saying how many
of the desirable ones are needed — which depends on the monocyte count:

    monocytosis >= 1.0 x10^9/L    one or more desirable criteria
    monocytosis <  1.0 x10^9/L    desirable criteria 1 AND 2 (both)

So the oligomonocytic band is the *strict* one: dysplasia **and** a clonal abnormality,
with monocyte partitioning explicitly not substituting for either. That is the formal
route by which "oligomonocytic CMML" came in from MDS, and it is why `dxCmmlDesirable()`
reads the band rather than applying one test to every case.

**The low band hardens twice over**, and the second turn of the screw is Table 2.13's
footnote a: between 0.5 and 1.0 × 10⁹/L, desirable criterion 2 is met *only* by a mutation
in one of twelve named genes (`CMML_DESIRABLE_GENES`). An abnormal karyotype alone does not
meet it there, and neither does *TET2* or *DNMT3A* — the two commonest genes in the disease,
and the two commonest in age-related clonal haematopoiesis, which is what the footnote is
guarding the band against. `dxCmmlClonal()` therefore reads the band and answers two
different questions, and `dxCmmlDesirableText()` names the criteria from the same source so
the comment cannot credit a *TET2* mutation the box would not accept. **The practical
consequence is sharp**: an oligomonocytic case whose only variant is *TET2* is `excluded`,
where before Table 2.13 was read it was `supported`.

**The two branches differ in whether they may return `false`, and that asymmetry is the
whole safety property.** Below 1.0 both criteria are mandatory and a genuine double
negative is a real exclusion — verified: that case lands in `excluded` with the clause
named. At or above 1.0 one of *three* suffices and the third cannot be assessed here, so
a false is downgraded to **null**: the candidate stays on screen as `incomplete` and the
caution says which criterion was never tested. Two absent criteria out of three do not
establish that none is met, and a hard false there is exactly the silent removal
[diagnosis.md](diagnosis.md)'s known-deviation note is about.

## Three criteria this app cannot answer, and what it does instead

Each is handled by *saying so*, never by guessing or by leaving a gate unknown forever:

- **Desirable 3, monocyte subset partitioning** (classic CD14+/CD16− monocytes > 94% by
  flow). No flow input exists. This is what makes the `>= 1.0` branch above unable to
  return false. The caution states the criterion, the >94% figure, and its own
  limitation — it is uninterpretable in active autoimmune or inflammatory disease,
  present in about 20% of these patients, where a reduced slan-positive non-classic
  subset (<1.7%) has been proposed instead.
- **Essential 4, the tyrosine kinase gene fusions.** *PDGFRA*, *PDGFRB*, *FGFR1* and
  *JAK2* fusions are not in the cytogenetic vocabulary. This is a **caution raised on
  eosinophilia** — which is what the footnote itself asks for ("should be specifically
  excluded in cases with eosinophilia") — and never a gate that would sit unknown on
  every case.
There used to be a third, and it is worth recording how it closed. **Promonocytes are blast
equivalents and the differential could not count them** — both the 20% ceiling and the
CMML-1/CMML-2 split are read on "blasts and blast equivalents (myeloblasts, monoblasts,
promonocytes)", and there was a Blasts key and nothing else. It was named as a gap in the
*counter* rather than worked around in the rule, and the counter is where it was fixed:
`Promonos` and a combined `Pros/blasts` bucket, `excludes` between the two, and
`findingBlastPct()` adding them into `f.blasts`. See [counter.md](counter.md). What survives
here is a caution that now says which of two things the printed percentage is — counted with
the promonocytes, or needing to be confirmed to include them.

**Persistence is the fourth thing a single specimen cannot show.** The monocytosis
criterion says *persistent*, a fact about serial counts; the app sees one. Named in the
caution, exactly as the MDS introduction's proliferative redirect is.

## The name carries the subtype and the subgroup

`dxCmmlName()` builds it, and `whoFor` points at the same function so the name in the
report and the name in the comment cannot drift. The two subtype strings are the
chapter's own ICD-O entries — *myelodysplastic chronic myelomonocytic leukaemia*, not
"CMML, myelodysplastic type". **No post-cytotoxic-therapy qualifier**, unlike the AML
names: that case belongs to myeloid neoplasms post cytotoxic therapy, a different
category rather than a suffix on this one, so it gets a caution pointing there instead.

**CMML-1 and CMML-2 are not symmetric, and `dxCmmlSubgroup()` respects it.** CMML-2
needs only ONE specimen to reach its threshold (≥5% blood *or* ≥10% marrow), while
CMML-1 requires BOTH to be below theirs. So an uncounted blood film can confirm CMML-2
and can never confirm CMML-1 — the honest reading of "< 5% in peripheral blood **and**
< 10% in bone marrow". **CMML-0 is gone**: those cases "have been shown to have little
to no correlation with outcome measures".

## What ICC 2022 asks that WHO does not

`cmml` is **the only rule whose divergence paragraph is computed** rather than fixed.
Everywhere else the two classifications differ in one stable way and the paragraph is a
constant string; here they differ in four independent places, and *which* of them applies is
a fact about the case. So `divergence` may now be a **string or a function** — `dxRank()`
resolves both, the same seam as `whoFor` and the counter's `tableCaption` — and
`dxCmmlDivergence()` returns `''` when the two agree, which is what `diverges` is asked.

1. **Clonality is essential in ICC, desirable in WHO** — "abnormal cytogenetics and/or at
   least one myeloid neoplasm associated mutation of at least 10% allele frequency". The VAF
   floor is real: a case whose only variant is a 4% subclone is clonal to WHO and not to ICC,
   and the paragraph says so in those words. An unreported VAF leaves it `null`, never
   `false` — the same reading `tp53Vaf` gets.
2. **ICC's alternative route for a non-clonal case**, and its blast thresholds are a trap
   worth naming: **≥5% marrow and/or ≥2% blood**, which look like the CMML-1/CMML-2 split
   and are not — 5 is the *marrow* number here and the *blood* number there. Its third limb
   is an immunophenotype consistent with CMML, which this app cannot record, so a `false` in
   the feature half is downgraded to `null` exactly as WHO's desirable 3 is. Only the count
   half may return `false`, and it does: below 1.0 × 10⁹/L the route is genuinely unavailable.
3. **A cytopenia at MDS thresholds**, which WHO does not require at all. Fires only on
   `cytopenia.any === false` — a `null` there is an unfinished workup and not a divergence —
   and carries ICC's own footnote that a small proportion of cases, usually early phase, show
   only borderline or none.
4. **CMUS and CCMUS**, two categories WHO names nowhere, for a monocytosis whose marrow does
   not show CMML. ⚠ The acronym *expansions* printed in the comment (clonal monocytosis of
   undetermined significance; clonal cytopenia and monocytosis of undetermined significance)
   were **not** in the pasted table, which gives only the acronyms — they should be checked
   against ICC before this text is trusted verbatim.

One deliberate imprecision: ICC's alternative route reads "> 10% of the WBC" where its own
first criterion reads "≥ 10%". The app has one monocyte-percentage answer and it is the
`≥` one, so a case at exactly 10.0% is treated as meeting both. Recorded rather than
engineered around; nothing in this app can report a percentage that finely.

## The likelihood ladder

Everything below the defining criterion is a frequency or a demographic the chapter
publishes, never a criterion said twice — which is what [diagnosis.md](diagnosis.md)
asks `supports` to be. The demographics are the part no other rule had: **median age at
diagnosis 71–76 years** and a **male predominance of 1.6–2.6:1** across four series, a
point each because neither discriminates strongly alone.

The mutation landscape scores **2, not 4**: every gene on `CMML_GENES` is also mutated in
MDS, so a hit says "myeloid neoplasm of this family", not "CMML". Its criterion
(desirable 2) is an acquired clonal abnormality of *any* kind, which `dxCmmlClonal()`
answers from the karyotype or the panel — deliberately broader than the gene list, since
narrowing the criterion to the genes CMML usually mutates would make the engine stricter
than the classification.

Two negatives, both the chapter's own hedges: **dense megakaryocyte clustering** at −2
("megakaryocyte clustering is not a prominent feature" — it is the prefibrotic-PMF
pattern and argues for that instead) and **MF-2/MF-3** at −2 (~3% of CMML at diagnosis).
Neither disqualifies, because neither is written as a criterion; the fibrosis case
instead raises the caution naming what discriminates it from primary myelofibrosis.

**Footnote b is split between a gate and a point.** A *documented history of MPN*
excludes, categorically, in the box's own words — an MPN evolving to a CMML-like
phenotype is progression of that disease. The rest of it ("a high burden of
MPN-associated mutations tends to support MPN with monocytosis") is scored: **CALR or
MPL** at −2, those being the two of the three that are not on the CMML gene list at all.
*JAK2* is on both lists and "high burden" has no published figure, so it is left to the
fibrosis caution rather than scored against the case — the same restraint
`DX_BASOPHILIA_PCT` documents.

## What reading this rule fixed elsewhere

**`counts.monocytosis` was not three-valued.** It required both halves of the criterion
and collapsed a missing half to `false`, so a differential reporting only the absolute
count made "the percentage is ≥10%" read as a *no* — the file's own rule broken in the
one place it decides a diagnosis. Now AND-ed three-valued, with a *known* failing half
still deciding it: a monocyte count of 0.2 is not CMML whatever the percentage is.

**The comment does not use `dxMorphologySentence()`**, which every other comment does.
It states the dysplastic lineages and the blast percentage, and on this rule both are
said again downstream — the lineages by the desirable-criteria sentence and the blasts
by the subgrouping sentence, which is where each earns its place. Using it printed the
blast count twice in one comment, once to a decimal and once not.

**The differential learned to count blast equivalents.** Three cells, one new per-cell flag
(`excludes`) and a wider `KEY_WIDTH`, all in the counter rather than here — see
[counter.md](counter.md). Every rule reading `f.blasts` gained the promonocytes with it,
which is right: the 20% boundary is written the same way in AML and in MDS as it is here.

**`f.genetics.chMaxVaf` became `maxVaf`.** ICC's clonality criterion asks the same question
the clonal-haematopoiesis comment does — how big is the largest clone — and a `ch`-prefixed
name reading it from a CMML rule would have implied a second number.
