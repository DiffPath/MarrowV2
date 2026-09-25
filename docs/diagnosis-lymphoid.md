# The lymphoid candidates

> `MarrowDxLymphoid.js` — the lymphoid axis. Read alongside [diagnosis.md](diagnosis.md), which
> holds the engine, and the `dxAxis` note in `MarrowDxKernel.js`, which this family is the first to
> use.

## Phase 1 of three, and it answers the involvement question rather than the classification one

A bone marrow does not classify most lymphoid neoplasms. It answers a narrower set: **is there a
lymphoid infiltrate, what architecture does it have, does it look reactive or neoplastic, and if a
lymphoma is already known, is this marrow involved.** Those are the four rules. **No rule here
carries the name of an entity**, and that is the design rather than a stage it has not reached.

| rule | what it says |
|---|---|
| `noLymphoidInfiltrate` | scattered interstitial lymphocytes and nothing else |
| `lymphoidAggregates` | benign lymphoid aggregates |
| `lymphoidInvolvement` | involvement by a lymphoid neoplasm, pattern named |
| `lymphoidIndeterminate` | an infiltrate that is neither — the residual |

**`family: 'lymphoma'`, which is not this file's name and is deliberate.** `dxWorkupBonus` has
mapped `ruleOutLymphoma` and `historyLymphoma` to that family since before any rule declared it, so
picking either on the Specimen tab was wiring itself to nothing. `axis: 'lymphoid'` is the separate
statement about which question these rules answer.

## Why it classifies nothing: the inputs

**There is no flow cytometry input anywhere in this app.** That is the decisive fact. The
immunohistochemistry that does exist is a dozen stains with fixed option lists, of which CD3, CD20
(with a percentage), CD5, cyclin D1, TdT, CD30 and Ki-67 bear on this family — enough to support a
suspicion, nowhere near enough to separate CLL from mantle cell from marginal zone.

Also absent: CD10, BCL2, BCL6, CD23, CD200, SOX11, CD25, CD103, annexin A1; **every lymphoid
cytogenetic lesion** — `ancAbnVocabulary` is entirely myeloid, with no t(14;18), t(11;14), t(8;14)
or trisomy 12; MYD88, BRAF, STAT3, NOTCH1; and a lymphoma option on the antecedent-history row,
which does not exist even though "History of lymphoma" is a template type.

**And no lymphoid chapter is pasted.** `docs/who/` holds fifteen myeloid chapters and the ICC paper
and no lymphoid text at all, against a record of ten pasted sources correcting ten rules written
from memory — nine of them in the *shape* of the rule. A pattern is what a reader can check against
the slide in front of them; a classification would have been this app's least verifiable claim.

The two precedents are already in the table and were built the same way for the same reason:
`MarrowDxPcn.js` names the plasma cell umbrella and lets the serum studies subclassify, and
`MarrowDxBmf.js` gates only on what a marrow can show.

## What the findings layer had to learn

`f.lymphoid` (`MarrowFindings.js`) is new. Every field above it in that file serves a myeloid
question.

**The architecture was already being recorded and no rule had ever read it.** The core's lymphocyte
row has offered focal / focal loose / non-paratrabecular / **paratrabecular** / multifocal / diffuse
since the tab was built, and that list is the axis marrow involvement is actually read on.

**`paratrabecular` is tri-state and the middle value is the common one.** The vocabulary offers
"Focal aggregates" unqualified precisely so a reader can record an aggregate without claiming to
have judged its relation to the trabeculae — the descriptor's own comment says so. So an unqualified
aggregate answers this **unknown**, and only the two explicit options answer it either way. Rounding
it to "not paratrabecular" would manufacture the most load-bearing negative in the family.

**A diffuse infiltrate is not a large aggregate.** `coreLymphDiffuse` is kept out of the aggregate
key list: folding the two together would let the commonest benign finding and one of the least
benign ones answer the same question.

**The reader may already have called it.** Two of CD5's four options and one of cyclin D1's two are
worded "…in neoplastic B cells" — *including the negative ones*. Choosing either says the
pathologist has decided a neoplastic population is present and is now characterising it, which is a
stronger statement than any architecture and is free to read (`neoplasticAsserted`, true-or-null:
no option here asserts the absence of a neoplasm).

**The smear cytology list is richer than expected**, and shared by the blood and aspirate lymphocyte
rows: `predominantlyCllLike`, `subsetCllLike`, `marginalZoneLike`, `hairyCellLike`,
`predominantlyLargeGranular`, against `polymorphous` / `reactive`, with `lymphNoAtypical` as a true
stop chip and therefore a real negative. These are read as "this is atypical and worth
phenotyping", **never as the entity their labels name**. `smallMature` is deliberately not in the
reactive list: small mature lymphocytes are what CLL is made of too, so it discriminates nothing.

## Gates, and the one that does the work

`lymphoidInvolvement` requires an infiltrate **and at least one neoplastic feature** — a Kleene OR
over paratrabecular localisation, a diffuse infiltrate, CD5 coexpression, cyclin D1, TdT, an atypical
smear population, and `neoplasticAsserted`. Without that second gate the rule's only criterion would
be "there is an infiltrate", which is true of the commonest benign finding in the table, and a card
offering involvement by a neoplasm on a nodule of reactive lymphocytes is the one output this family
must not produce.

**Paratrabecular localisation is an `expects` on `lymphoidAggregates` and not an exclusion**, though
the teaching is near-categorical. The kernel's test decides it: a clause may gate only if it is a
PARTITION or is ALWAYS ANSWERED, and this is neither, because the unqualified descriptor leaves it
unknown on most cases. As a soft criterion the card stays on screen with "non-paratrabecular
localisation (not met) −4" printed, which is the reader seeing the argument rather than its
conclusion. Its two weights are asymmetric on the involvement rule for the reason the kernel sets
out — `for: 4` because it is rare in the field this rule competes with, `against: -1` because plenty
of marrow involvement is not paratrabecular either.

**A criterion the app can never answer, declared so the view can say so.** The first run put
*"Nothing outstanding — every criterion this rule states has been answered"* in the Further workup
column of **involvement by a lymphoid neoplasm** — on a marrow whose whole point is that it has not
been phenotyped. True of the rule as written, and the worst thing this family could print: the
comment said immunophenotyping was required and the table beside it said there was nothing left to
do. `dxLymphoidPhenotypeStep` is a soft criterion returning `null` forever, weighted **0 on both
sides** so it can never move a score — it exists to be listed, not counted — and an `expects` rather
than a `requires` because a permanently unanswered gate would make `supported` unreachable for these
rules forever.

## The axis, and the two places it changes behaviour

`dxAxis(rule)` defaults to `'myeloid'`, so the thirty-seven myeloid rules are untouched. **The two
axes are not alternatives, which is the whole point** — a marrow can be a myelodysplastic neoplasm
*and* carry a lymphoid infiltrate, so a lymphoid candidate at 6 above a myelodysplastic one at 5
would read as "rather than" where the answer is "as well as".

1. **`dxResidualCategory` is now flag-driven and axis-scoped.** It used to test
   `r.rule.id === 'mpnU'`; `residual: true` is declared on the rule instead, because the lymphoid
   axis brought a second residual. The axis limit arrived with it: a myelodysplastic candidate
   scoring 9 says nothing about whether an atypical lymphoid infiltrate has been characterised, and
   without the test the strongest myeloid candidate would demote the lymphoid residual on every case
   that had one.
2. **The Differential view takes its threshold per axis and renders one table each**, with a heading
   only when both are live. Against one global leader, a marrow with a confident myeloid candidate at
   12 would silently drop every lymphoid candidate it had — including *involvement by a lymphoid
   neoplasm* on a marrow that is involved. The runner-up line is per axis for the same reason.

The Comments view is unchanged and still pages one interleaved list; it shows one candidate at a
time, so the category error the grouping prevents does not arise there in the same way.

## Still open

1. **Extent of involvement is not estimated.** It is a reporting requirement for a staging marrow
   and nothing in the app derives it; the caution says so rather than guessing.
2. **No reference topic exists for any of the four**, so the cards carry no Criteria link. There is
   no `lymphoid` section in `MarrowRefData.js` at all.
3. **Phase 2 is inputs, not rules** — flow cytometry above all, then the missing antibodies, the
   lymphoid cytogenetics and genes, and the lymphoma history option. **Phase 3 is entity rules**,
   each against a pasted chapter. Entity rules written before those inputs exist would score
   nothing, which is the defect the last three families each turned up in their first run.
