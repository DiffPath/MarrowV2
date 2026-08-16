# The AML candidates (`dxRules`, the `aml` family)

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. Twelve rules; the blast count means different things in the two classifications.

> **WHO's AML chapter introduction is now pasted** (`docs/who/aml-introduction.md`) and
> CONFIRMS the encoding below rather than correcting it — the first source paste to do so,
> because these rules were built from Khoury's tables, not memory. The per-entity chapters are
> following (`docs/who/aml-*.md`): APL and RUNX1::RUNX1T1 confirmed their generated rules, and
> **the AML-MR chapter with Box 2.25 settled the bare-history question in this file's favour**
> — the essential criteria accept "at least one of" the history and a Box 2.25 abnormality.
> Its "absence of" list also corrected `amlMr` twice: the +1 support for prior cytotoxic
> therapy is deleted (the box *excludes* such cases; ICC keeps them with a qualifier, which is
> why it is not an `excludes` either), and the missing MPN-history exclusion is added.

Twelve rules: the **eight defining-lesion types** (`PML::RARA`, `RUNX1::RUNX1T1`, `CBFB::MYH11`,
`DEK::NUP214`, `RBM15::MRTFA`, `KMT2A`, `MECOM`, `NUP98`) built from one table and one factory,
plus **NPM1**, **CEBPA**, ICC's **TP53** entity, **AML-MR**, and the residual.

**Unlike the MDS and MPN halves, this set was read against the primary papers** — WHO-HAEM5 from
Khoury (*Leukemia* 2022;36:1703, Tables 7 and 8) and ICC 2022 from Arber (*Blood* 2022;140:1200,
Tables 1, 20, 21, 25), the latter from **raw markup**. That last part is not fussiness: two
summarising reads of ICC Table 25 disagreed on a row label, and a comparison review returned the
myelodysplasia-related **gene lists with the two classifications' columns swapped**. A silent swap
there puts *RUNX1* in the wrong classification and changes the answer on every RUNX1-only case.
**Take entity and gene lists from markup, never from a summary.**

**THE BLAST COUNT MEANS DIFFERENT THINGS IN THE TWO CLASSIFICATIONS, and that shapes everything
here.** WHO-HAEM5 **removed** the threshold for its defining-lesion types — not lowered it to 10%,
removed it — so `PML::RARA` is acute promyelocytic leukaemia at any blast count. Only *BCR::ABL1*,
*CEBPA* and AML-MR still need ≥20%. ICC sets a floor of **≥10%** for those same types (counting
promonocytes and neoplastic promyelocytes as blast equivalents) and routes 10–19% **without** a
defining lesion into **MDS/AML**. The same marrow can be AML by one and MDS by the other, which is
printed rather than resolved.

**`dxExcludeAmlDefining` sits on all eight MDS rules** and is what stops a 12%-blast *NPM1* case
being offered as MDS-IB2 *and* as AML at once — the myelodysplastic candidate often winning on its
dysplasia points. **`CEBPA` is deliberately not in it**: WHO keeps the ≥20% rule for *CEBPA*, so a
low-blast *CEBPA* case genuinely stays MDS. That asymmetry is the whole reason the three exempt
types are worth naming separately.

**ONLY FOUR ICC ENTITIES HAVE AN "MDS/AML" FORM** — TP53, the two myelodysplasia-related
categories, and NOS. ICC Table 20 excludes *NPM1*, bZIP *CEBPA* and any AML-defining karyotype from
MDS/AML **by definition**, so a 12%-blast *NPM1* case is `AML with mutated NPM1`; the string
"MDS/AML with mutated NPM1" does not exist. Getting this wrong is the easiest error in the set.

**The myelodysplasia-related lists diverge in BOTH directions**, which is why neither can be a flag
on the other. Genes: ICC adds *RUNX1* to the shared eight. Cytogenetics: **ICC only** +8 and
del(20q); **WHO only** del(11q) and −13/del(13q). So an isolated del(11q) is AML-MR by WHO and not
by ICC, and isolated +8 is the reverse — and the comment names whichever classification applies
rather than asserting both. WHO's list is also **shorter than WHO-HAEM4R's**: the balanced
translocations and −Y are gone from both, and **del(9q) is in neither** (it appeared in one
secondary summary and is spurious).

**WHO's one AML-MR is ICC's two**, and ICC's gene category outranks its cytogenetic one — ICC says
so outright. **An antecedent MDS/MDS-MPN is a CLASSIFIER in WHO and only a QUALIFIER in ICC**:
history alone can carry the WHO category, where ICC records "progressing from MDS" and classifies
on other features. **Morphologic multilineage dysplasia is no longer a route in either** — both
removed it — so dysplasia may score here and may never gate. That is the single item most likely
to be got wrong from memory of WHO-HAEM4R.

**ICC's TP53 entity has no WHO counterpart**, and its criterion is *any* somatic mutation at
**VAF >10%** (strictly greater, as Table 21 prints it) with **multi-hit NOT required** — multi-hit
is the *MDS* rule below 10% blasts. Conflating the two is the easy error. `whoFor` names where WHO
actually lands (AML-MR, or plain AML) rather than leaving the line half-empty.

**`CEBPA` cannot be answered as written, and the code says so.** Both classifications ask a
*positional* question — WHO accepts biallelic at any site **or** a single bZIP mutation *of any
kind*; ICC accepts **only in-frame bZIP** and drops the biallelic route — and no gene symbol
answers it. The gate is the looser "a CEBPA mutation"; `cebpaBzip` matches the words the laboratory
used and stays **null** rather than false when they are absent. **The discordance is three-way**:
ELN 2022 assigns favourable risk to in-frame bZIP only, so a biallelic non-bZIP case is WHO's
entity carrying none of the prognosis the name implies (in one 741-case series only 64% of
WHO-HAEM5 cases also met ICC). **ICC's entity is named only when `cebpaBzip` is true** — printing
it unconditionally produced a comment that asserted the ICC name and then said the reading frame
was unconfirmed, a contradiction in consecutive sentences. Co-mutated *GATA2* is scored (~35% in
bZIP/biallelic against ~7% TAD-only) as the one indirect read on a position this app cannot see.

**`NUP98` and `RBM15::MRTFA` get ICC's catch-all**, `AML with other rare recurring translocations`.
Neither is in ICC's Table 25 — *NUP98* appears **zero** times in its main text — and the supplement
that presumably lists them could not be retrieved. Printing ICC's real catch-all beats inventing a
name it does not publish.

**Comments are two paragraphs**: what was found, then what it is called. `dxLower()` decapitalises
an entity name used mid-sentence but leaves an abbreviation alone (WHO writes entities out, ICC
opens most with `AML`), and `dxPct()` drops a spurious `.0`. **The APL comment says the service
*should* be notified, never that it *has* been** — the tool must not assert an action nobody took.
**The CEBPA comment always raises germline testing**: ~10% are germline, and the classic two-hit
pattern (N-terminal germline frameshift + acquired bZIP indel) is exactly the biallelic genotype
that reads as reassuringly sporadic.

**A CAUTION OUTLIVES THE COMMENT THAT CARRIES IT.** `dxComment()` used to `return` a rule's own
`comment(f, ctx)` directly, so the `divergence` and `caution` sentences appended at the bottom of
that function were reachable only from the default path. Every AML rule has a custom comment, so
**every AML caution would have been written and silently never printed** — nothing errors, no test
that reads the rule table sees it, and the sentence most likely to matter is the one that vanishes.
Both paths now end at `dxAppendNotes()`. Divergence was never affected because it happens to sit
only on MDS/MPN rules, all of which use the default path — which is exactly why the hole stayed
invisible until a caution landed on the other side of it.

**MORPHOLOGIC CORRELATES MAY ONLY SCORE, and the bar for appearing at all is a figure from a primary
series over a finding this app records.** Two clear it: **megakaryocytic dysplasia** on MECOM
(dysmegakaryopoiesis in 90.5%) and **multilineage dysplasia** on DEK::NUP214 (56–100% of series,
most above 75%). They ride on `spec.supports` in the `dxAmlDefining` table and are concatenated by
the factory, so a type's own correlates live next to its name. **They change no answer** — the lesion
already gated the rule — which is the point: they make the Scoring view state why the case looks
like what it is called.

**The correlates that were considered and REJECTED are named at the point they would have gone in,**
because every one of them is something a reader will remember from training and try to add back:

- **Basophilia for t(6;9) DEK::NUP214.** The classic teaching, and it traces to a narrative review;
  two of six cohorts found **none**, and the largest series (n=107) calls it "not a common feature."
- **Thrombocytosis for MECOM.** The quoted 7–22% does not survive checking — it is 5–8%, and **68%
  of cases are thrombocytopenic**. The honest finding is "platelets preserved", which is not
  something this app records.
- **Marrow eosinophilia for inv(16).** Real but weaker than taught (~⅓ of inv(16) cases lack it),
  and the counter's marrow eosinophil count is not exposed through `marrowFindings()` anyway.
- **TP53 morphology.** WHO's own text: *no unique pathological features.* Never score TP53 from the
  marrow — the VAF is the entire criterion.
- **Anything needing blast morphology, flow cytometry or cytochemistry** — cup-like nuclei for
  *NPM1* (98.5% specific and the strongest single correlate in the literature), CD7 for bZIP
  *CEBPA*, monoblastic morphology for *KMT2A*. All are Tier 1 evidence and **none is recordable**,
  because the differentiation-defined entities were scoped out. If that scope ever opens, these are
  the supports to add first.

**Two safety cautions sit on the RESIDUAL rule, not on the defining types,** because both are about
what a case with no named lesion might still turn out to be — the one situation in this set where
the classification is not the last question:

- **Basophilia with BCR::ABL1 unknown** is the app's only caution that can change the *disease*
  rather than the subtype: a basophilic acute leukaemia may be CML in blast phase, which the engine
  already models but cannot reach without the fusion result. It fires only while `bcrAbl` is
  genuinely `null` — a negative settles it, a positive takes the case to `cml` — which is what keeps
  it from printing on every case. `DX_BASOPHILIA_PCT` (2%) is **the one threshold here no
  classification publishes**: WHO says testing "should always be performed" on a leukaemia with a
  prominent basophilic component and names no number, so the conventional upper limit of normal
  stands in for "prominent", set low on purpose. Too low costs a sentence; too high costs a missed
  blast crisis.
- **A normal karyotype does not exclude the cryptic lesions.** *NUP98* rearrangements are undetected
  by karyotype in **88.2%** of cases (frankly normal in about half) and the pericentric inversions
  of *MECOM* were missed in **16 of 17** — both types this engine offers the instant the abnormality
  is recorded, so the gap is in the assay and the comment says which. Fires only once cytogenetics
  have actually resulted with nothing found.

**Verify with `scratchpad/amlDx.js`** — 57 assertions over 20 vignettes, page reloaded between each.
It drives the real seams: blasts by typing a tape, abnormalities by choosing them in the dropdown
and dispatching a real change event. It covers the WHO/ICC split below 10% blasts, both directions
of the cytogenetic divergence, RUNX1-only, history-alone AML-MR, the qualifier formats (WHO appends
unpunctuated, ICC comma-separates), NUP98's catch-all, and an MDS-IB1 regression. Note one
deliberately-passing oddity: on a 25% blast case with the history unanswered, **AML-MR is
`incomplete`, not excluded** — nobody said whether there was an antecedent MDS — and it scores 0 so
it never reaches the Comments view. That is the three-valued design working, not a gap.

Its `T.cbc()` helper is worth copying: a CBC is pasted as the **tab-separated** text Epic produces,
flag riding in the value cell, so the parser is exercised rather than bypassed. `T.desc()` re-queries
the empty `<select>` on every call for the reason `renderDescriptorList` forces — the list is rebuilt
whole, so a held reference is detached. And note the injection trap that cost a run here: `HELPERS`
is a Node **template literal**, so a `\n` inside it becomes a real newline in the injected source and
silently terminates the string it sat in. Escape it `\\n`.

