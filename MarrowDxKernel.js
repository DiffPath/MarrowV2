/* ============================================================================
   MarrowDxKernel.js — the Diagnosis tab (#diagnosisPanel), file 1 of 9

   Reads marrowFindings() and suggests, ranked and with its reasoning shown, how
   the case would be classified and what the comment might say. Suggestions are
   SUGGESTIONS: nothing is written to the report, nothing is applied on your
   behalf, and the comment box is editable free text the moment you accept one.

   ---------------------------------------------------------------------------
   THIS WAS ONE FILE AND IS NOW NINE, and the reason is worth stating because it
   is not a code-quality argument. At ~4000 lines of mostly clinical prose it had
   become unreadable in one sitting for a person and unloadable in one piece for
   a machine — an assistant asked to correct one threshold in one entity had to
   take the whole classification into its context to find it. The cut is BY
   FAMILY so that the unit of work matches the unit of reading: one entity's
   criteria box arrives, and one file answers it.

       MarrowDxKernel.js    this file: three-valued helpers, shared gates and
                            thresholds, shared formatters, and `dxRules` empty
       MarrowDxMds.js       myelodysplastic neoplasms
       MarrowDxMpn.js       myeloproliferative neoplasms
       MarrowDxMdsMpn.js    the MDS/MPN overlap (CMML)
       MarrowDxAml.js       acute myeloid leukemia
       MarrowDxCh.js        the boundaries: CHIP, CCUS, ICUS, no neoplasm
       MarrowDxEngine.js    scoring, ranking, comment assembly
       MarrowDxPanel.js     render, views, the comment box

   Each family file holds ITS OWN HELPERS AND ITS OWN RULES TOGETHER, which is
   the property that makes the split worth having: the CMML text builders sit
   above the CMML rule, not four hundred lines away from it. The `<script>` block
   in Marrow.html states the three ordering constraints and why each is real.

   The split moved no logic. Four trailing commas were dropped where the one
   array literal became five `dxRules.push(...)` calls, and dxLower, dxPct and
   dxNameLine were hoisted here from the AML section because four families use
   them. Nothing else changed.

   ---------------------------------------------------------------------------
   *** THE CRITERIA BELOW ARE A DRAFT AND MUST BE VERIFIED ***

   They are deliberately isolated in one table so they can be checked and
   corrected line by line. Until that has been done, treat the ranking as a prompt
   for thought and not as a reference. (The app is not for clinical use; this part
   of it least of all.) The two halves are draft for DIFFERENT reasons, and the
   difference matters when you come to check them:

     THE MDS RULES were written from recollection of the classifications. SEVEN
     sources have since been read — the MDS family's boxes are now done — and no
     MPN or AML entity's box has been. Assume nothing in their thresholds, and
     expect the same rate of correction when each is checked.

     THE SINGLE MOST PRODUCTIVE CHECK, across all seven: read every criterion that
     joins two numbers and ask which conjunction it uses. "<5% in the marrow AND
     <2% in the blood" had lost its second half in four separate rules; ">=5% in
     the marrow AND/OR >=2% in the blood" had lost its first meaning in three,
     and the missing 20% ceiling across the two limbs let the engine offer frank
     acute leukemia as MDS-IB2. Half-open bands are the same class of error:
     dxBetween is inclusive, the boxes are not, and a marrow of 9.5% fell through
     every subtype into no candidate at all.

     The rate is holding, and it held in ONE DIRECTION for the first four:
     every box read so far has made its rule STRICTER, never looser. MDS-5q's
     corrected three of its five criteria; MDS-SF3B1's added two of six that were
     missing outright (erythroid dysplasia, and the blood blast ceiling — the SAME
     omission both entities had) plus the variant-allele-fraction floor; and
     MDS-biTP53's added the cytopenia and the dysplasia, both of which had been
     left out on the assumption that the genetic lesion diagnosed the case by
     itself. A rule written from recollection is too permissive, not too strict.

     MDS-LB'S BOX IS THE EXCEPTION THAT SHARPENS THE RULE, and it is worth knowing
     before you check the next one. Its corrections ran the OTHER way: the residual
     category was too STRICT, because its excludes read the superseding entities'
     lesions where the criterion is about their criteria. A del(5q) with monosomy 7
     is not MDS-5q and is not MDS-LB either, so the case came back with no
     myelodysplastic candidate at all. The generalisation that survives both is
     therefore about direction of ERROR and not direction of strictness: a rule
     written from recollection states its own criteria too loosely and other
     entities' criteria too crudely. Defining rules leak in; residual rules leak out.

     Read: WHO-HAEM5's "MDS with low blasts and 5q deletion", which is why mds5q
     carries the note that it is the first rule written from its own criteria
     box; "MDS with low blasts and SF3B1 mutation"; "Myelodysplastic neoplasm
     with biallelic TP53 inactivation", which is the one whose chapter this app
     can answer the least of — four of its facts have no finding behind them and
     are stated in its caution instead of guessed at (docs/diagnosis.md);
     "Myelodysplastic neoplasm with low blasts", the residual category, whose
     corrections were mostly to what it defers to rather than to what it is; and
     "Myelodysplastic neoplasm with increased blasts" and "Myelodysplastic
     neoplasm, hypoplastic", read as a pair because they share a boundary — hMDS
     excludes MDS-IB outright while MDS-IB is hypocellular in a minority, and the
     two are kept apart by arithmetic alone (docs/diagnosis.md). And WHO-HAEM5's
     "Myelodysplastic neoplasms: Introduction" — the framing chapter — everything from which is marked at the point of use:
     the
     unified cytopenia definitions (MDS_CYTOPENIA in MarrowFindings.js), the
     10% dysplasia threshold, the 500-cell and 200-cell differentials, the
     mild-anemia waiver, biallelic TP53 superseding MDS-5q and MDS-SF3B1, the
     MDS-LB-RS alternative name, the proliferative-count redirect, and the
     general precaution every mds rule now carries as its caution. The chapter
     does not restate the individual entities' criteria, so it cannot confirm
     the blast bands or the del(5q) rules — those remain recollection.

     THE MPN RULES were assembled from the secondary literature — review articles
     and the primary classification papers where they were reachable — and NOT from
     the WHO blue book, which could not be accessed. Several specific items are
     known to be unsettled and are flagged where they appear: PV's major-criterion
     ORDERING differs between the two classifications in a way that changes which
     combinations suffice, and no review corroborates the consequence; WHO-HAEM5's
     PV marrow-waiver wording is from weak sources; and whether ICC adopted CEL's
     4-week interval is genuinely unresolved in the sources.

     THE BOUNDARY RULES — CHIP, CCUS, ICUS — are the exception to all of the
     above: their criteria, figures and wording were read from WHO-HAEM5's clonal
     hematopoiesis chapter itself, its Table 2.02 driver-gene list is transcribed
     whole in MarrowFindings.js, and the comments quote the chapter's own framing.

     THE MDS/MPN OVERLAP FAMILY is half and half. CMML was written from Box 2.19,
     Table 2.13 and the chapter text together, with ICC 2022's Table 13 beside
     them — criteria, subtyping, subgrouping, the mutation landscape and the
     demographics all come from there, and the criteria this app cannot answer are
     named at the rule rather than guessed at. It is the only rule in the family
     whose two classifications have BOTH been read, and they turn out to differ
     more than the shared name suggests; the differences are printed, not resolved.
     mdsMpnSf3b1T is still secondary-literature recollection and its `requires`
     array is the worked example of the known deviation below: anemia sits in it
     as a hard gate, so recording anemia as ABSENT drops an SF3B1-mutated,
     thrombocytotic case off the list entirely — and ICC 2022's criteria for THAT
     entity have not been read. Where a rule names only WHO-HAEM5, that is a
     statement about what was read and NOT a claim that the two agree.

   Three things were verified against multiple independent readings and are worth
   stating because each is the reverse of the obvious guess: WHO-HAEM5 calls the
   residual category "not otherwise specified" while ICC 2022 keeps
   "unclassifiable" (it was WHO that moved); PV's hemoglobin and hematocrit
   thresholds are IDENTICAL in the two classifications; and the CMML absolute
   monocyte threshold dropped to 0.5 x10^9/L in BOTH, not in WHO alone.

   ---------------------------------------------------------------------------
   HOW IT DECIDES — gates first, points second, and never one without the other.

   `requires` / `excludes` are CATEGORICAL. 12% blasts is not MDS-IB1 however
   much other evidence piles up, so no amount of points may reach past a gate.
   `supports` are POINTS, and they only ever rank candidates that are already
   eligible. A pure score would be able to produce a nonsense answer; pure gates
   would produce a set with no order and no explanation.

   Every clause carries a reason string. A score whose reasoning cannot be read
   is not usable in this domain, so the UI always shows what counted and what is
   still missing.

   THREE-VALUED THROUGHOUT: true / false / null, where null is "nobody has said".
   A gate that evaluates to null does NOT fail — it makes the candidate
   *unconfirmed*, which is a different bucket and a different comment. That is
   the property the whole engine rests on; see MarrowFindings.js.

   THE POINT LADDER, so the numbers are not arbitrary:
       +8  PATHOGNOMONIC — the finding IS the diagnosis. Nothing else in this
           table is compatible with it, so no accumulation of ordinary evidence
           for anything else may come near it.
       +4  a defining criterion of this entity that another entity can also show
       +3  a major morphologic criterion
       +2  supportive
       +1  context
       -2  argues against

   THE TOP TIER WAS MISSING AND ITS ABSENCE WAS NOT COSMETIC. The ladder stopped
   at +4 and "a defining genetic abnormality is present" was written at +4 for
   BCR::ABL1, for PML::RARA, for RUNX1::RUNX1T1 — findings with a sensitivity of
   about 1 and a specificity of about 1 against this entire differential. Four
   points is what three ordinary morphologic observations add up to, so a
   demonstrated fusion could be caught and passed by a pile of soft findings on
   another candidate. A finding that settles the diagnosis has to be able to
   settle the ranking.

   THE TEST FOR THE TOP TIER, so it does not become a synonym for "important":
   name one other rule in this table that a case carrying this finding could
   plausibly be. If you can, it is +4. BCR::ABL1 and the AML-defining fusions
   pass; del(5q) and SF3B1 do not, because each is read by two rules, and JAK2
   does not, because three MPN rules share it.

   AND THE ONE RULE THAT DECIDES WHERE ON THAT LADDER A FINDING GOES. The ladder
   says how big a point may be; this says whether it is a point at all:

       A weight is a LIKELIHOOD RATIO AGAINST THE REST OF THE DIFFERENTIAL —
       how much commoner this finding is in THIS entity than in the candidates
       it is competing with. It is not a measure of how important the criterion
       is to the definition.

   Three consequences, and every one of them was violated somewhere in this table
   before it was written down:

     A FINDING AS COMMON IN THE FIELD AS IN THE ENTITY IS WORTH ZERO, however
     central it is. This is the `amlNpm1` pattern named in MarrowDxLikelihood.js:
     gate on NPM1, then score +4 because NPM1 is defining. The gate already
     removed everything the point would have separated it from.

     A FINDING RARER IN THE ENTITY THAN IN THE FIELD IS NEGATIVE, even where the
     entity's own chapter names it. Anemia is the worked example. The CML chapter
     lists it among six presenting findings, which is a true sentence about CML
     and was read as +1 — but the marrows CML is ranked against are MDS, CCUS and
     ICUS, which are anemic by definition or close to it. Against that field an
     anemic marrow is evidence AGAINST chronic myeloid leukemia. A weight read off
     one chapter, without its rivals' numbers beside it, has no sign it can trust;
     this is the whole reason MarrowDxLikelihood.js is keyed by input.

     ABSENCE IS THE `against` HALF OF ONE ENTRY, NEVER A POSITIVE `for` ON A
     NEGATED STATEMENT. "granulocytic dysplasia absent, +1" paid every
     non-dysplastic marrow in the world a point towards CML. Where a criterion is
     the absence of something, its `for` is 0 and its `against` carries the whole
     weight — dxLikelihoodAudit() now warns on any other combination.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Three-valued helpers
-------------------------------------------------------------------------- */

/* null propagates. Comparing against a number nobody entered yields "unknown",
   never false — the one mistake that would let an unanswered question quietly
   satisfy a classification. */
function dxBetween(value, low, high) {
    if (value === null || value === undefined) return null;
    return value >= low && value <= high;
}

function dxAtLeast(value, low) {
    if (value === null || value === undefined) return null;
    return value >= low;
}

function dxBelow(value, high) {
    if (value === null || value === undefined) return null;
    return value < high;
}

/* A [low, high] band against a threshold. UNKNOWN when the band straddles it —
   "MF-1 to MF-2" genuinely does not answer "is this MF-2 or worse", and rounding
   it either way would be inventing a grade the pathologist declined to give. */
function dxBandAtLeast(band, threshold) {
    if (!band) return null;
    if (band[0] >= threshold) return true;
    if (band[1] < threshold) return false;
    return null;
}

function dxNot(value) {
    return value === null ? null : !value;
}

/* Three-valued OR and AND — Kleene's, which is the only pair that keeps "nobody
   has said" from behaving like a no.

   OR is true as soon as anything is true (an unanswered question cannot take a met
   criterion away), false only when everything is false, unknown otherwise. AND is
   false as soon as anything is false, true only when everything is true. Both are
   needed the moment a criterion is a list of alternatives — "all three major
   criteria, or the first two plus the minor one" is an OR of ANDs, and evaluating
   it with plain || would read a blank erythropoietin as a normal one. */
function dxAnyOf(values) {
    if (values.some(function (v) { return v === true; })) return true;
    if (values.every(function (v) { return v === false; })) return false;
    return null;
}

function dxAllOf(values) {
    if (values.some(function (v) { return v === false; })) return false;
    if (values.every(function (v) { return v === true; })) return true;
    return null;
}


/* ----------------------------------------------------------------------------
   The rule table

   Each rule:
     who / icc   the names. `icc` only where the two classifications diverge —
                 CLAUDE.md requires naming both when they do, and naming ICC
                 where it agrees would imply a distinction that is not there.
     family      'mds' | 'mpn' | 'overlap' | 'boundary' — which workup bonus and
                 which cross-family bonuses may reach it. Declared rather than
                 inferred from the id, and that is not tidiness: the bonus used to
                 key on `id.indexOf('mds') === 0`, which the moment an overlap
                 entity arrived would have handed the MDS workup bonus to
                 `mdsMpnSf3b1T` on the strength of its first three letters.
     requires    [label, f => true|false|null]   all must hold — DEFINITIONAL ONLY
     excludes    [label, f => true|false|null]   any true kills it
     expects     [label, for, against, f => true|false|null]   soft criteria
     supports    [label, points, f => true|false|null, key?]
     prior       number | (f) => number          the prevalence baseline
     priorReason string                          why, for the Scoring view
     comment     (f, ctx) => string

   `requires` VERSUS `expects` is the distinction the whole differential rests on.
   A gate is categorical, so a false one removes the candidate from the list
   entirely and silently. That is right for a fact that DEFINES the entity — 12%
   blasts is not MDS-IB1 however much else fits — and wrong for a fact that is
   merely usual, which is what most criteria are. A case that fits an entity in
   every respect but one is exactly the case a reader most needs named.

   A clause stays in `requires` only if one of these holds:

     PARTITION      it is one limb of a split of a single input shared by two or
                    more rules, so softening it would let rules that differ ONLY
                    in that limb both go live. The MDS-IB1/IB2 blast bands, the
                    four boundary rules' cytopenia limbs, BCR::ABL1.
     ALWAYS ANSWERED  a CBC, a differential, a cellularity — where `false` really
                    is false rather than "nobody looked", so nothing is lost to
                    missing information and `expects` has no work to do.

   Everything else is an `expects`. See docs/diagnosis.md.

   WHEN YOU MOVE A GATE TO `expects`, THE TWO WEIGHTS ARE NOT SYMMETRIC — but the
   asymmetry is NOT "always pay a small `for`", which is what this note used to
   say and which was wrong in a way that cost real points.

       `against` is set by how universal the finding is IN THE ENTITY.
       `for`     is set by how rare the finding is IN THE FIELD.

   Those are different questions and they have different answers. The old advice
   collapsed them: "a criterion worth gating on is near-universal for its entity,
   so meeting it discriminates almost nothing." That is true only of discriminating
   among the candidates the rule has already kept — which is not the comparison the
   score is making. The score ranks this entity against the OTHER rules, and there
   a near-universal criterion is worth a great deal whenever the other rules'
   candidates rarely show it.

   CML'S NEUTROPHILIC LEUKOCYTOSIS IS THE CASE THAT PROVED IT. An essential
   criterion, present in nearly every chronic-phase CML, and it was written at
   `for: 1` on exactly the reasoning above — the same +1 the rule paid for ANEMIA,
   a finding that is commoner in half the rest of the table than it is in CML. The
   two questions give opposite answers here: leukocytosis is near-universal in the
   entity (so a large `against`) AND rare in the field of myelodysplastic,
   boundary and acute candidates it is ranked against (so a large `for`). It is now
   +4/−3.

   The genuinely small `for` is for a criterion that is near-universal in the
   entity AND common in the field — a hypercellular marrow, absent dysplasia,
   normal cytogenetics. Ask the second question explicitly; do not infer it from
   the first.
-------------------------------------------------------------------------- */

/* THE PREVALENCE BASELINE. How common the entity is before anything about this
   marrow is known, on the same ladder as everything else so the numbers stay
   comparable. A number, or a function of the case returning one — the same seam
   `whoFor`, `caution` and `divergence` already use, and it earns the seam here:
   the prevalence that matters is strongly age-conditional, so one fixed number
   would be wrong at both ends of the same table.

   *** ONE DENOMINATOR FOR THE WHOLE TABLE, AND IT IS NOT POPULATION INCIDENCE. ***

       A prior is this entity's share of THE MARROWS THAT REACH THIS DIFFERENTIAL
       — the specimens a hematopathologist is actually handed with the question
       "is this a myeloid neoplasm?".

   The first version of this table had three denominators summed into one total
   and nobody could see it, because each rule's `priorReason` was individually
   true. The MDS rules quoted a share OF MDS ("MDS-SF3B1 is about 17% of MDS"),
   the MPN rules quoted an annual incidence PER 100 000 OF THE GENERAL POPULATION
   ("1-2 per 100 000"), and the boundary rules — CHIP, CCUS, ICUS, no neoplasm —
   quoted nothing at all and so scored zero.

   The result was the inversion that prompted this rewrite. Chronic myeloid
   leukemia sat at +2, the top of the band, on 1-2 cases per 100 000 population;
   clonal cytopenia of undetermined significance sat at 0, on a marrow that was
   cytopenic. Of the marrows that get sent, CCUS is one of the commonest answers
   and CML is an uncommon one, and the numbers said the reverse — not because
   either figure was wrong, but because they were not the same kind of figure.

   HOW TO PLACE A NEW ENTITY: put its FAMILY on the band first, then rank within
   the family. This is what lets the MDS rules keep quoting shares of MDS: the
   family is anchored at +1 and the subtypes are spread around it. Quoting a
   figure on any other denominator is only legitimate as the derivation of the
   tier — never as the tier itself.

   BAND: -3 .. +2, as named tiers rather than free numbers.

       +2  what most of these marrows turn out to be — the non-neoplastic and
           boundary outcomes. A marrow evaluated for an unexplained cytopenia is
           more often not a neoplasm than it is one, and that fact belongs in the
           ranking rather than in the reader's head.
       +1  common: the myelodysplastic neoplasms as a family, and the clonal and
           idiopathic cytopenias
        0  unremarkable, and the default where a chapter has not been read. The
           classical myeloproliferative neoplasms sit here: each is roughly as
           common in the population as all of CML, and all of them together are
           a smaller share of marrow practice than MDS.
       -1  uncommon
       -2  rare
       -3  vanishingly rare

   RESIDUAL CATEGORIES ARE BOUNDED. MDS-LB is 45-50% of all MDS by its own
   chapter, MPN-NOS and AML-NOS are common for the same reason — they are what is
   left over. So an honest prevalence number would raise exactly the rules that
   must rank LAST, which is the inversion dxResidualCategory already exists to
   undo. A residual's prior may not exceed the highest prior among the entities it
   defers to.

   IT IS PRINTED as its own evidence row, never folded silently into the total. A
   hidden constant that reorders the list is the least auditable thing there is,
   and this app's position is that a score whose reasoning cannot be read is not
   usable in this domain. */
const DX_PRIOR_BAND = [-3, 2];

function dxPriorFor(rule, f) {
    const p = typeof rule.prior === 'function' ? rule.prior(f) : rule.prior;
    return typeof p === 'number' && isFinite(p) ? p : 0;
}

function dxPriorText(rule) {
    return rule.priorReason || 'how common this entity is';
}

const DX_BLAST_AML = 20;

/* ICC 2022's lowered floor for a genetically defined acute leukemia, and the
   number that does not exist in WHO-HAEM5 at all — see the AML section below. */
const DX_BLAST_ICC = 10;

/* THE ONE THRESHOLD HERE THAT NO CLASSIFICATION PUBLISHES. WHO's instruction is
   that BCR::ABL1 testing "should always be performed" on an acute leukemia with
   a prominent basophilic component, and it names no number — so 2% is the
   conventional upper limit of normal standing in for "prominent", chosen low on
   purpose. It drives a caution and nothing else: no gate, no score, and the
   caution only ever says to perform a test. Getting it too low costs a sentence;
   too high costs a missed CML blast crisis. */
const DX_BASOPHILIA_PCT = 2;

/* Blasts at or above a threshold in EITHER specimen, three-valued. Both
   classifications write their thresholds as "blood or marrow", and an uncounted
   specimen must not be able to fail the criterion on its own — so this is false
   only when at least one was counted and neither reached it. */
function dxBlastAtLeast(f, threshold) {
    const marrow = dxAtLeast(f.blasts.marrow, threshold);
    if (marrow === true) return true;
    const blood = dxAtLeast(f.blasts.blood, threshold);
    if (blood === true) return true;
    return marrow === null && blood === null ? null : false;
}

/* Was this cytogenetic abnormality named? The same asymmetry findingGene() uses
   for a mutation: a named abnormality is a finding whatever the study status
   says, and its absence is a real negative only once the karyotype has resulted. */
function dxAbn(f, key) {
    if (f.genetics.abnormalities.indexOf(key) !== -1) return true;
    return f.genetics.karyotypeStatus === 'resulted' ? false : null;
}

/* "Definitive cytogenetic findings" — the second half of the mild-anemia
   waiver below. Read as an MDS-defining or myelodysplasia-related abnormality
   actually named on a karyotype, never as "the karyotype was abnormal": a
   waiver is only as good as the finding waiving the criterion. */
function dxDefinitiveCytogenetics(f) {
    return dxAnyOf([f.genetics.del5q, f.genetics.minus7, f.genetics.complex,
        f.genetics.mrCytoWHO.present]);
}

/* The other half of the waiver: the findings the chapter names as sufficient to
   carry a diagnosis past a hemoglobin that does not reach the threshold. */
function dxWaiverFindings(f) {
    return f.dysplasia.any === true && dxDefinitiveCytogenetics(f) === true;
}

/* Applies the waiver to any cytopenia criterion: a FALSE becomes unknown when
   the waiving findings are there, and everything else passes through untouched.
   One function so the general gate and MDS-5q's anemia-specific one cannot
   drift apart. */
function dxWaive(f, value) {
    return value === false && dxWaiverFindings(f) ? null : value;
}

/* Did a waiver fire on this case? Shared by the gates and the caution so the two
   cannot disagree — and it asks about the ANEMIA as well as about the set,
   because MDS-5q requires anemia specifically and can be waived on it while
   another lineage is frankly cytopenic. */
function dxCytopeniaWaived(f) {
    return dxWaiverFindings(f) &&
        (f.cytopenia.any === false || f.cytopenia.anemia === false);
}

/* Shared gates, written once. The blast bands especially: they are the spine of
   the whole MDS set and must not drift between rules. */
const dxGate = {
    cytopenia: ['at least one cytopenia', function (f) { return f.cytopenia.any; }],

    /* THE MILD-ANEMIA WAIVER, and the reason the MDS rules do not share the
       plain cytopenia gate above.

       "A diagnosis of MDS may still be made in patients with milder degrees of
       anemia if definitive morphological and cytogenetic findings are present"
       (Myelodysplastic neoplasms: Introduction). Nearly every criterion in this
       engine is read as written; this is one the source itself says may be
       waived, and a hard false here drops a del(5q) marrow with unequivocal
       dysplasia off the list entirely over a hemoglobin of 13.2 — the exact
       failure mode the known-deviation note in docs/diagnosis.md is about.

       IT RETURNS NULL, NEVER TRUE. The criterion genuinely is not met, and
       inventing a "met" would be a worse lie than the one it replaces; but
       unknown is what "the classification permits this to be decided clinically"
       looks like in a three-valued engine. The candidate stays on screen as
       unconfirmed and its caution prints the waiver.

       CCUS and ICUS keep the unwaived gate: their cytopenia is the whole subject
       of the category rather than a supporting criterion, and there is no
       definitive morphology or cytogenetics on that branch to waive it with. */
    mdsCytopenia: ['at least one cytopenia', function (f) {
        return dxWaive(f, f.cytopenia.any);
    }],

    /* MDS-5q's essential criterion is ANEMIA specifically — "anemia, with or
       without other cytopenias and/or thrombocytosis" — not the family's
       generic "at least one cytopenia". A thrombocytopenic, non-anemic marrow
       does not meet it, and the chapter says separately that thrombocytopenia
       here is uncommon and marks advanced disease. Same waiver: the mild-anemia
       sentence in the introduction is about exactly this criterion.

       A CONSEQUENCE WORTH KNOWING: on MDS-5q this gate can never hard-exclude,
       because del(5q) plus megakaryocytic dysplasia — the rule's own two other
       essential criteria — is itself the waiver's condition. So a non-anemic
       del(5q) marrow lands in `incomplete` with the waiver printed rather than
       vanishing. That is the intended behavior and not an accident of ordering:
       the classification says this is the case to decide clinically, and the
       comment puts the thresholds in front of the reader to decide it with. */
    mdsAnemia: ['anemia', function (f) {
        return dxWaive(f, f.cytopenia.anemia);
    }],

    /* Also MDS-5q's, and also essential: "dysplasia involving megakaryocytes,
       with or without dysplasia involving other lineages". The megakaryocyte is
       the lineage this entity is about, which is why it gates here and is merely
       counted everywhere else. */
    megDysplasia: ['dysplasia involving megakaryocytes', function (f) {
        return f.dysplasia.megakaryocytic.atLeast10;
    }],

    /* MDS-SF3B1's, and essential to it in the same way the megakaryocyte is to
       MDS-5q: "erythroid lineage dysplasia". The entity is a disease of
       ineffective erythropoiesis — the ring sideroblast is an erythroid
       precursor — and the chapter's own histopathology says the granulocytes are
       usually spared and megakaryocytic dysplasia is uncommon. So the one
       lineage that must be dysplastic is named, and the generic "dysplasia in
       >=1 lineage" would let a purely granulocytic case through. */
    erythroidDysplasia: ['dysplasia involving the erythroid lineage', function (f) {
        return f.dysplasia.erythroid.atLeast10;
    }],
    dysplasia: ['dysplasia in >=1 lineage', function (f) { return f.dysplasia.any; }],
    /* hMDS's, and the one gate in the family that is NARROWER than f.dysplasia.any.
       The differential diagnosis is the reason, and it is worth knowing rather than
       taking on trust: aplastic anemia — the entity hMDS has to be separated from —
       "may be associated with dyserythropoietic changes", so erythroid dysplasia
       cannot carry this diagnosis at all. The box says so twice, once as an
       essential criterion ("dysplasia involving the granulocytic and/or
       megakaryocytic lineage") and once in the differential ("morphological support
       for a diagnosis of hMDS requires identification of dysplastic features in
       myeloid and/or megakaryocytic lineages").

       Kleene's OR, so an unassessed megakaryocyte line cannot take a dysplastic
       granulocyte line away; only two assessed-and-negative lineages close it. */
    myeloidOrMegDysplasia: ['dysplasia involving the granulocytic and/or megakaryocytic lineage',
        function (f) {
            return dxAnyOf([f.dysplasia.myeloid.atLeast10, f.dysplasia.megakaryocytic.atLeast10]);
        }],
    /* THE BLOOD LIMB IS ASYMMETRIC ON PURPOSE. Every classification reads the 20%
       boundary as blood OR marrow — MDS-biTP53's criteria box is explicit, "blasts
       constitute <20% of cells in the peripheral blood AND bone marrow" — but a
       blood differential is often absent, and an uncounted film must not put every
       myelodysplastic candidate in doubt. So the blood may only ever FAIL this
       gate; it never contributes an unknown. A null blood leaves the answer the
       marrow's, which is the behavior this gate had before the limb existed. */
    notAML: ['blasts below 20% in blood and marrow', function (f) {
        const blood = f.blasts.blood === null ? null : f.blasts.blood < DX_BLAST_AML;
        if (blood === false) return false;
        return dxNot(dxAtLeast(f.blasts.marrow, DX_BLAST_AML));
    }],
    lowBlasts: ['marrow blasts <5%', function (f) { return dxBelow(f.blasts.marrow, 5); }],
    /* THE LOW-BLAST CRITERION IS TWO NUMBERS, and MDS-LB's criteria box writes them
       as one: "<5% bone marrow blasts and <2% peripheral blood blasts". They used to
       be two gates, and the second one's null was the bug — an uncounted film left
       the gate unknown, so MDS-LB could never reach `supported` without a blood
       differential, while MDS-h and MDS-IB (which carry no blood limb) could. Bucket
       beats score in dxRank, so a hypocellular marrow with no film headlined as
       MDS-h purely because the residual category had an extra way to be unsure.

       So the limb is asymmetric, for the same reason dxGate.notAML's is: the blood
       may only ever FAIL, never contribute an unknown, and a null blood leaves the
       answer the marrow's. The cost is one line of audit trail — the reader sees a
       single combined criterion rather than two — which is the right trade for a
       bucket that was wrong on every case without a differential. */
    lowBlastsBoth: ['blasts <5% in marrow and <2% in blood', function (f) {
        const blood = f.blasts.blood === null ? null : f.blasts.blood < 2;
        if (blood === false) return false;
        return dxBelow(f.blasts.marrow, 5);
    }]
};

/* THE CLAUSE THAT KEEPS A CASE FROM BEING OFFERED AS MDS AND AS AML AT ONCE.

   WHO-HAEM5 removed the blast threshold for its defining-lesion types, so an
   NPM1-mutated marrow with 12% blasts is acute myeloid leukemia — not MDS-IB2 —
   and a PML::RARA marrow is acute promyelocytic leukemia at any blast count at
   all. Before this existed the engine offered both, confidently, with the
   myelodysplastic candidate often ranked first on the strength of its dysplasia
   points. Categorical, because precedence is what a gate is for.

   CEBPA IS DELIBERATELY NOT IN THIS LIST. WHO keeps a >=20% blast requirement for
   it, so a CEBPA mutation at low blasts does NOT take the case out of MDS — the
   very asymmetry that makes the three exempt types worth naming separately.

   The ICC reading below 10% blasts differs and is not resolved here but SAID: see
   the divergence paragraph in dxAmlComment, which states that ICC would assess
   such a case as a myelodysplastic neoplasm. Silently picking one classification
   is the thing this app does not do. */
const dxExcludeAmlDefining = ['an AML-defining genetic abnormality is present, which is ' +
    'acute leukemia in WHO-HAEM5 at any blast count', function (f) {
        return dxAnyOf([f.genetics.amlDefining.present, f.genetics.npm1]);
    }];


/* ---------------------------------------------------------------------------
   Shared formatters

   These three live here rather than with the AML rules they were written for:
   dxPct is used by the CMML text builders and by the summary table, dxLower by
   dxCmmlComment, and dxNameLine by dxComment. A formatter used by four families
   is not one family's.
------------------------------------------------------------------------------ */

/* AN ENTITY NAME USED MID-SENTENCE LOSES ITS CAPITAL — but only if it has one to
   lose. "The findings are diagnostic of Acute promyelocytic leukemia…" is wrong;
   "…of aML with mutated NPM1" would be worse. WHO writes its entities out in
   words and ICC opens most of its with an abbreviation, so the test is whether
   the first token is already all upper case. */
function dxLower(name) {
    if (!name) return name;
    const first = name.split(' ')[0];
    if (first === first.toUpperCase() && /[A-Z]/.test(first)) return name;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

/* A percentage as a reader would write it: 72%, not 72.0%, but 8.5% kept whole.
   A counted differential lands on an integer far more often than not, and a
   spurious decimal reads as precision the count does not have. */
function dxPct(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/* The two classifications' names, joined for use inside a sentence. */
function dxNameLine(who, icc) {
    if (!icc || icc === who) return dxLower(who);
    return `${dxLower(who)} (WHO-HAEM5); ${dxLower(icc)} (ICC 2022)`;
}


/* ---------------------------------------------------------------------------
   The conditional register

   AN ENTITY DEFINED BY A GENETIC ALTERATION CANNOT BE ASSERTED BEFORE THE STUDY
   THAT FINDS IT HAS RESULTED. The engine will and should still offer such a
   candidate on morphology alone — conspicuously hypolobated megakaryocytes
   really do point at MDS-5q — but the comment has to stay in the conditional
   mood while the karyotype is out. The flat register produced this, in two
   consecutive sentences:

     "In the absence of disease-defining genetic alterations, the findings are
      best classified as MDS with low blasts and 5q deletion (MDS-5q)… Final
      classification will depend on the results of cytogenetic and molecular
      studies, which are outstanding."

   An alteration declared absent, then named as the classification, then declared
   untested. Three claims and no two of them compatible — and the middle one is
   the dangerous one, because del(5q) is not a morphologic diagnosis. The
   megakaryocytes support it; only the karyotype makes it.

   `definedBy` is a rule's own declaration of what defines it: the three-valued
   `finding`, the `phrase` that names it in a sentence, and the `study` that
   answers it. A rule that declares nothing is not genetically defined — MDS-LB,
   the classical MPN triad, AML defined by differentiation — and keeps the flat
   register it has always had.

   KEYED ON THE RULE, NOT ON THE CASE, which is exactly what the first attempt at
   this got wrong. `dxDefiningGeneticsFound()` asks "did this case turn up
   anything defining?" — a question about the findings. The sentence is a claim
   about the ENTITY being named, and MDS-5q carries its alteration in its own
   title whatever else the case's genetics do or do not show.
------------------------------------------------------------------------------ */

/* Is the alteration this entity is DEFINED by actually demonstrated? True for a
   rule that declares no `definedBy`, so every caller reads the same either way. */
function dxDefiningConfirmed(rule, f) {
    return !rule.definedBy || rule.definedBy.finding(f) === true;
}

/* "In correlation with cytogenetic studies demonstrating deletion of 5q, " — the
   opening that turns an assertion into a condition. Empty when the alteration is
   in hand, which is what lets the flat sentence stand unchanged. */
function dxConfirmationPrefix(rule, f) {
    if (dxDefiningConfirmed(rule, f)) return '';
    const d = rule.definedBy;
    return `In correlation with ${d.study} studies demonstrating ${d.phrase}, `;
}

/* The classification sentence in whichever mood the genetics allow. `register`
   is the verb the family uses: the MDS, MPN and overlap comments classify, the
   AML comments are diagnostic of. */
function dxClassificationSentence(rule, f, line, register) {
    const verb = register === 'diagnostic'
        ? ['are diagnostic of', 'would be diagnostic of']
        : ['are best classified as', 'would be best classified as'];
    const prefix = dxConfirmationPrefix(rule, f);
    return prefix
        ? `${prefix}the findings ${verb[1]} ${line}.`
        : `The findings ${verb[0]} ${line}.`;
}

/* THE SAME RULE APPLIED TO A FINDING SENTENCE. "Cytogenetic studies show
   t(15;17)/PML::RARA" was printed from the rule's own spec whether or not the
   karyotype had resulted — a fabricated result, and the worst form this bug
   takes, because it reads as a fact rather than as a conclusion. A finding is
   reported only when it is `true`. */
function dxFindingReported(value) {
    return value === true;
}


/* ---------------------------------------------------------------------------
   The rule table

   Declared empty here and filled by the five family files in LOAD ORDER, which
   is therefore the array's order: MDS, MPN, MDS/MPN overlap, AML, boundaries.
   That order is not cosmetic — dxUnresolvedPair() and the tie-breaks read it,
   so a family file moved in Marrow.html moves its rules with it. Add a family
   by adding a file and a script tag, never by editing this line.
------------------------------------------------------------------------------ */
const dxRules = [];
