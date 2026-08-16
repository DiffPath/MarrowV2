/* ============================================================================
   MarrowDxMds.js — the myelodysplastic neoplasms

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. Loads first of the five family files.
   ========================================================================= */

/* THE PRECEDENCE RULE, and the source states it in as many words: MDS with
   biallelic TP53 inactivation "supersedes MDS-5q and MDS-SF3B1" (Myelodysplastic
   neoplasms: Introduction). Categorical, because that is what "supersedes" means
   — a multi-hit TP53 marrow with an isolated del(5q) is one entity and not a
   choice between two.

   IT REACHES THE WHOLE FAMILY, not only the genetically defined half, and that
   was widened when the entity's own chapter was read: "MDS-biTP53 supersedes
   other MDS types", unqualified, where the Introduction had named only the two.
   The narrower reading was not a wrong inference from the Introduction — it was
   simply all the Introduction said — and it had a consequence worth recording,
   because it was the blast-defined rules it left out. A multi-hit TP53 marrow at
   12% blasts scored 7 points as MDS-IB2 against 6 as MDS-biTP53, so the engine
   ranked the superseded entity FIRST on exactly the case the same chapter calls
   enriched for biallelic TP53. Gates outrank points; this is why.

   THE CONVERSE IS EXPLICITLY NOT TRUE and must not be added: the same paragraph
   says an SF3B1 mutation, or a TP53 mutation that is *not* multi-hit, "does not
   per se override the diagnosis of MDS-5q" however much it may alter the biology
   or the prognosis. So mds5q carries no SF3B1 and no single-hit TP53 exclusion —
   the asymmetry is the rule, not an omission. */
const dxExcludeBiTp53 = ['biallelic (multi-hit) TP53 inactivation supersedes this category',
    function (f) { return f.genetics.tp53MultiHit; }];

/* ---------------------------------------------------------------------------
   Does the entity that would supersede MDS-LB actually take the case?

   MDS-LB's fifth essential criterion is "not fulfilling diagnostic criteria for
   MDS with defining genetic alterations" — a statement about the CRITERIA, and
   not about the lesion. A del(5q) accompanied by monosomy 7 is expressly not
   MDS-5q; an SF3B1 variant below 5% VAF expressly does not qualify for
   MDS-SF3B1. WHO classifies both as MDS-LB.

   Reading the lesion alone excluded BOTH rules, and an excluded candidate is
   filtered out of the Comments view entirely — so those cases came back with no
   myelodysplastic candidate at all. That is the over-gating failure docs/
   diagnosis.md names, arriving exactly where it was predicted to.

   Each helper therefore mirrors the disqualifiers of the rule it defers to, and
   the finding's own three-valued answer passes through where the lesion is
   absent or unknown — so an outstanding karyotype still leaves MDS-LB
   unconfirmed rather than confirmed. Keep these in step with mds5q's and
   mdsSf3b1's own gates below; they are the same criteria read from the other
   side, which is why they live next to each other rather than inline.
------------------------------------------------------------------------------ */
function dxMds5qTakesCase(f) {
    if (f.genetics.del5q !== true) return f.genetics.del5q;
    if (f.genetics.minus7 === true || f.genetics.complex === true) return false;
    return f.genetics.abnormalities.length <= 2;
}

function dxMdsSf3b1TakesCase(f) {
    if (f.genetics.sf3b1 !== true) return f.genetics.sf3b1;
    if (f.genetics.sf3b1Vaf !== null && f.genetics.sf3b1Vaf < 5) return false;
    if (f.genetics.del5q === true || f.genetics.minus7 === true ||
        f.genetics.complex === true || f.counts.thrombocytosis === true) return false;
    return true;
}

/* ---------------------------------------------------------------------------
   hMDS's cellularity threshold — two-tiered, and the tier is the patient's age

   "Significantly decreased" is given a number by the chapter, and it is two
   numbers: "below 30% of normal cellularity in patients younger than 70 years
   and below 20% in patients aged >= 70 years". The gate used to be a single raw
   cut at 25% whose label claimed an age adjustment it never made.

   READ AS AN ABSOLUTE MARROW CELLULARITY. "Below 30% of normal cellularity" is
   literally ambiguous — 30 percentage points, or 30% of the age-expected value —
   and the absolute reading is both the conventional one and the only one
   #coreCellAbs can answer. Stated here rather than chosen silently.

   f.cellularity.hypoForAge IS NOT THIS CRITERION and must not be substituted for
   it: its band floor bottoms out at 30% for every age over 60, so at 75 it calls
   a 26% marrow hypocellular where this entity does not.

   WITH NO AGE THE ANSWER STRADDLES. f.age comes from a DOB line in the pasted
   CBC (cbcPatientAge), so it is null on every case where nothing was pasted —
   the common path, not an edge case. Outside 20-30 the two tiers agree and the
   answer is given regardless; inside it the answer genuinely depends on the
   question nobody answered, and picking a tier would be inventing the patient's
   age. Same shape as the hemoglobin straddle between the two sex thresholds. */
const DX_HMDS_CELL_UNDER70 = 30;
const DX_HMDS_CELL_70PLUS = 20;
const DX_HMDS_AGE_TIER = 70;

function dxHypoplasticCellularity(f) {
    const pct = f.cellularity.pct;
    if (pct === null) return null;
    if (f.age === null) {
        if (pct < DX_HMDS_CELL_70PLUS) return true;
        if (pct >= DX_HMDS_CELL_UNDER70) return false;
        return null;
    }
    return pct < (f.age >= DX_HMDS_AGE_TIER ? DX_HMDS_CELL_70PLUS : DX_HMDS_CELL_UNDER70);
}

/* Does hypoplastic MDS actually take the case? Same shape and the same reason as
   dxMds5qTakesCase: the criterion names the superseding entity's CRITERIA, and
   the cellularity alone does not answer them — hMDS also requires dysplasia in
   the granulocytic or megakaryocytic lineage specifically. A 15%-cellular marrow
   whose only dysplastic lineage is erythroid is NOT hMDS but IS MDS-LB, and
   excluding it on the cellularity alone would leave it with no myelodysplastic
   candidate at all. Collapsed to a boolean, which is what mdsLB's exclude needs. */
function dxMdsHTakesCase(f) {
    return dxHypoplasticCellularity(f) === true &&
        dxAnyOf([f.dysplasia.myeloid.atLeast10,
            f.dysplasia.megakaryocytic.atLeast10]) === true;
}

/* ---------------------------------------------------------------------------
   The MDS-IB blast criterion — one "and/or" sentence read three times

   ">= 5% and < 20% in the bone marrow AND/OR >= 2% and < 20% in the peripheral
   blood". EITHER specimen carries the criterion alone, and the three subtypes
   differ only in which pair of numbers they read. Written once because a blast
   band that drifts between IB1, IB2 and MDS-F is the spine of the family
   drifting.

   THE BANDS ARE HALF-OPEN, as the box writes them: [min, max). dxBetween is
   inclusive at both ends, and the rules used to spell the bands 5-9 and 10-19
   with it — so a marrow of 9.5%, which findingBlastPct can perfectly well
   produce off a 500-cell differential, was false on IB1 AND false on IB2 and
   came back with no candidate at all. dxAllOf([dxAtLeast, dxBelow]) is the
   half-open form and has no such hole.

   THE 20% CEILING IS READ ACROSS BOTH SPECIMENS, and is folded in here rather
   than bolted on as dxGate.notAML: that gate's marrow limb returns null on an
   uncounted marrow, so a blood-only case would sit at `incomplete` for want of
   an aspirate — the bug dxGate.lowBlastsBoth exists to prevent, arriving from
   the other side. Here the ceiling may only ever FAIL. A specimen at >=20% is
   acute leukemia whatever the other reads; an uncounted one contributes no
   unknown of its own.

   Null only when NEITHER specimen was counted, which is the right asymmetry: a
   blood differential is often missing and a marrow count nearly always present,
   so a marrow of 7% must be able to answer the criterion by itself. */
function dxMdsIbBand(f, marrowMin, marrowMax, bloodMin, bloodMax) {
    if (dxBlastAtLeast(f, DX_BLAST_AML) === true) return false;
    const marrow = dxAllOf([dxAtLeast(f.blasts.marrow, marrowMin),
        dxBelow(f.blasts.marrow, marrowMax)]);
    if (marrow === true) return true;
    const blood = dxAllOf([dxAtLeast(f.blasts.blood, bloodMin),
        dxBelow(f.blasts.blood, bloodMax)]);
    if (blood === true) return true;
    return marrow === null && blood === null ? null : false;
}

/* Does MDS-IB2 take the case? IB1 and IB2 come out of ONE and/or sentence with
   two pairs of numbers, so a marrow already inside IB2's band can still satisfy
   IB1's blood limb, and a blood count of 6% promotes a 7% marrow to IB2. The
   higher assignment is the diagnosis. Deferring rather than vanishing, on the
   dxMds5qTakesCase precedent: IB2 shares every other gate IB1 has, so it is
   always on the list when this fires.

   AUER RODS PROMOTE THE WHOLE MDS-IB RANGE, and are the second half of IB2's
   definition rather than a refinement of the first: "≥10% and <20% blasts in the
   bone marrow and/or ≥5% and <20% blasts in the peripheral blood; without
   significant reticulin fibrosis **or with the presence of Auer rods**". A 6%
   marrow with Auer rods is MDS-IB2 and a 6% marrow without them is MDS-IB1 — one
   morphological finding, one subtype apart, no number involved. So the second
   band spans the whole of MDS-IB (5–19% marrow, 2–19% blood) and it is the rods,
   not the count, that decide.

   THE ROD LIMB CAN ONLY EVER ADD. f.blasts.auerRods is true or null and never
   false (findingAuerRods), so a case that did not name them is scored exactly as
   it was before this clause existed; nothing here can take a subtype away. */
function dxMdsIb2TakesCase(f) {
    const band = dxMdsIbBand(f, DX_BLAST_ICC, DX_BLAST_AML, 5, DX_BLAST_AML);
    if (band === true || f.blasts.auerRods !== true) return band;
    return dxAnyOf([band, dxMdsIbBand(f, 5, DX_BLAST_AML, 2, DX_BLAST_AML)]);
}

/* "Without significant reticulin fibrosis" — the clause that separates IB1 and
   IB2 from MDS-F, which is the same blast range with MF-2/MF-3 beside it.
   Collapsed to a boolean on mdsLB's cellularity precedent: it fires only on an
   affirmative MF-2/MF-3, so an unperformed reticulin leaves IB1/IB2 alone rather
   than leaving them unconfirmed. Excluding is safe here in the way over-gating
   usually is not, because MDS-F carries the case — and carries the ICC reading
   with it. */
const dxExcludeMdsFibrosis = ['MF-2 / MF-3 fibrosis (MDS with increased blasts and fibrosis)',
    function (f) { return dxBandAtLeast(f.fibrosis.grade, 2) === true; }];

/* ---------------------------------------------------------------------------
   The MDS-IB likelihood ladder, shared by all three subtypes

   One copy because the three subtypes come out of one chapter and its published
   frequencies are about MDS-IB as a whole. Only the blast clause and MDS-F's
   fibrosis differ between them, and those stay in the rules.
------------------------------------------------------------------------------ */

/* The box's desirable criterion, and the same clause mdsLB carries — but the
   frequencies here are higher: clonal cytogenetics in 50-70% against MDS-LB's
   "sizeable subset with a normal karyotype", and mutations in 90%. */
/* THE SOMATIC LIMB DOES NOT FIRE ON A MYELODYSPLASIA-RELATED MUTATION ALONE, and
   that carve-out is the same one dxMdsIbHighRiskGenes documents twenty lines
   below — it was simply never applied here.

   An MR mutation is already worth +2 to every mds and aml candidate through
   dxLikelihood.mrMutation. Letting the generic "a clonal abnormality" clause also
   fire on it scored one SF3B1 twice, and it was visible on screen: MDS-IB2 listed
   "a clonal cytogenetic or molecular abnormality +2" directly above
   "myelodysplasia-related mutation (SF3B1) +2" for the same single variant.

   The clause keeps its full reach over CYTOGENETICS and over any non-MR somatic
   variant, which is what it was for. What it may no longer do is re-score a
   finding another clause has already paid for. */
const dxMdsIbClonal = ['a clonal cytogenetic or molecular abnormality', 2, function (f) {
    const cyto = f.genetics.abnormalities.length ? true
        : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
    const somatic = f.genetics.mrICC.present === true &&
        f.genetics.somaticGenes.length === f.genetics.mrICC.genes.length
        ? false                      // the only clone IS the MR mutation, already scored
        : f.genetics.anySomatic;
    return dxAnyOf([somatic, cyto]);
}];

/* "The prevalence of high-risk aberrations such as 7q deletion, monosomy 7, and
   complex karyotype is significantly higher than in MDS with low blasts." A
   frequency that discriminates WITHIN the family, which is the only thing a
   point is for. */
const dxMdsIbHighRiskCyto = ['−7 / del(7q) or a complex karyotype', 2, function (f) {
    return dxAnyOf([f.genetics.minus7, f.genetics.complex]);
}];

/* "An overrepresentation of higher-risk mutations, such as ASXL1, RUNX1, EZH2,
   NRAS, KRAS, and TP53." Three of those six are myelodysplasia-related genes and
   are ALREADY worth +2 to every myeloid candidate through the engine's family
   bonus — scoring them again would double-count a point MDS-LB receives just as
   readily, and a point that does not discriminate within the family is noise in
   the ranking. What is left is the three the MR lists do not carry. */
const dxMdsIbHighRiskGenes = ['NRAS, KRAS or TP53 mutation (over-represented in MDS-IB)', 1,
    function (f) {
        const genes = f.genetics.somaticGenes;
        const hit = ['NRAS', 'KRAS', 'TP53'].some(function (g) { return genes.indexOf(g) !== -1; });
        return hit ? true : (f.genetics.ngsStatus === 'resulted' ? false : null);
    }];

/* "Dysmegakaryopoiesis is almost invariably present."

   A SOFT CRITERION, NOT A SUPPORT, AND THE WORD "invariably" IS WHY. A `supports`
   clause fires only on `true` and contributes nothing on a `false`, so an ASSESSED,
   NON-DYSPLASTIC megakaryocyte line cost the three MDS-IB rules nothing at all —
   on a finding their own chapter says is almost always there. That is precisely
   what `expects` is for, and none of the three rules had an `expects` array.

   The two weights answer their two different questions. `against` is set by how
   universal the finding is in the entity: "almost invariably" is as universal as
   this table gets, so -3. `for` is set by how rare it is in the field, and
   megakaryocytic dysplasia is common to every myelodysplastic rule and to
   prefibrotic PMF, so 1. Same shape MDS-5q's own megakaryocyte criterion already
   uses at [0, -4]. */
const dxMdsIbDysmeg = ['dysplastic megakaryocytes (almost invariably present in MDS-IB)', 1, -3,
    function (f) { return f.dysplasia.megakaryocytic.atLeast10; }];

/* "The core biopsy usually shows hypercellular bone marrow" — a likelihood, so a
   point. THERE IS DELIBERATELY NO NEGATIVE AT THE OTHER END: the same chapter
   says "in a minority of cases, the bone marrow is normocellular or
   hypocellular", and a −2 on hypocellularity would push exactly those cases
   toward hypoplastic MDS — which their blast count has already excluded them
   from. A minority is not an argument against. Do not add the mirror. */
const dxMdsIbHypercellular = ['hypercellular marrow for age', 1, function (f) {
    return f.cellularity.hyperForAge;
}];

/* The MDS-IB caution, shared by all three subtypes. */
function dxMdsIbCaution(f) {
    const notes = [];

    /* AUER RODS MAKE THE CASE MDS-IB2 AT ANY BLAST COUNT IN THIS RANGE, and they
       are now recordable — the Blasts row of the Aspirate and Blood tabs carries
       them, and dxMdsIb2TakesCase gates on them. What has NOT changed is that
       their ABSENCE is not a finding: there is no chip to leave un-ticked, so
       f.blasts.auerRods is true or null and never false (see findingAuerRods).

       So the reminder stays on every case that did not name them, and it is not
       boilerplate — silence here means "nobody looked", and the difference
       between IB1 and IB2 may be sitting on the slide unread. Naming them turns
       the note into a statement of what the classification did with them, which
       is the sentence a reader needs when the subtype is not the one the blast
       percentage would predict. */
    if (f.blasts.auerRods === true) {
        notes.push('Auer rods are recorded. Their presence classifies the case as MDS with ' +
            'increased blasts-2 (MDS-IB2) in WHO-HAEM5 at any blast count within the MDS with ' +
            'increased blasts range, irrespective of the blast percentage.');
    } else {
        notes.push('No Auer rods have been recorded. Their presence, at any blast count within ' +
            'this range, classifies the case as MDS with increased blasts-2 (MDS-IB2) in ' +
            'WHO-HAEM5; their absence is not recorded as a finding, so the smears should be ' +
            'reviewed for them directly.');
    }

    /* Monoallelic TP53 is present in about a third of cases and — unusually for
       this gene — means nothing prognostically here: "outcomes for patients with
       monoallelic TP53 mutations do not appear to differ from those with wildtype
       TP53". Which is why it is stated and never scored. The ICC half matters
       because mdsIB2's iccFor renames the case on a single mutation above 10%
       VAF, with no multi-hit requirement — so the two classifications genuinely
       part company on this case, and the reader should be told rather than left
       to notice the names disagree. */
    if (f.genetics.tp53 === true && f.genetics.tp53MultiHit !== true) {
        notes.push('A single TP53 mutation is present. Monoallelic TP53 mutation is found in ' +
            'approximately one third of cases of MDS with increased blasts, and the outcome of ' +
            'these patients does not appear to differ from that of patients with wildtype ' +
            'TP53; biallelic (multi-hit) inactivation would reclassify the case as MDS with ' +
            'biallelic TP53 inactivation. Note that ICC 2022 names a TP53-mutated category at ' +
            '10–19% blasts on any somatic TP53 mutation above a 10% variant allele fraction, ' +
            'without requiring multi-hit status.');
    }

    return notes.join(' ');
}

/* ---------------------------------------------------------------------------
   The caution every myelodysplastic candidate carries

   Its first half is the chapter's own general precaution, and it is the reason
   this is attached to the whole family rather than to any one rule: cytopenia
   and dysplasia are not specific findings, and the differential is a clinical
   one that no amount of morphology settles. The remaining clauses fire only on
   the case in front of them.

   `thrombocytosisAllowed` exists for MDS-5q alone, which is the single MDS type
   in which a platelet count >=450 x10^9/L is permitted rather than a redirect to
   the myelodysplastic/myeloproliferative family.
------------------------------------------------------------------------------ */
function dxMdsCaution(options) {
    const thrombocytosisAllowed = !!(options && options.thrombocytosisAllowed);

    return function (f) {
        const notes = ['Cytopenia and dysplasia are not specific findings: drugs, toxic ' +
            'exposures, infection, nutritional deficiency — in particular of vitamin B12 and ' +
            'folate — and immune disorders can produce ' +
            'both, and these should be excluded before a myelodysplastic neoplasm is ' +
            'diagnosed. No case should be classified without knowledge of the clinical and ' +
            'drug history, or reclassified while the patient is receiving growth factor ' +
            'therapy, including erythropoietin.'];

        if (dxCytopeniaWaived(f)) {
            notes.push('No lineage reaches the thresholds defining cytopenia (hemoglobin ' +
                '<13 g/dL in men and <12 g/dL in women, neutrophils <1.8 × 10⁹/L, platelets ' +
                '<150 × 10⁹/L). WHO-HAEM5 nonetheless permits the diagnosis at milder ' +
                'degrees of anemia where the morphological and cytogenetic findings are ' +
                'definitive, as they are here; the decision is a clinical one.');
        }

        /* THE REDIRECT OUT OF THE FAMILY. "Persistent neutrophilia, monocytosis,
           erythrocytosis, or thrombocytosis in a patient with cytopenias and
           dysplastic morphology generally warrants classification as a
           myelodysplastic/myeloproliferative neoplasm or myeloproliferative
           neoplasm." Named and not gated: persistence is a fact about serial
           counts, which this app records one of. */
        const proliferative = [];
        if (f.counts.monocytosis === true) proliferative.push('monocytosis');
        if (f.counts.neutrophilia === true) proliferative.push('neutrophilia');
        if (f.counts.erythrocytosis === true) proliferative.push('erythrocytosis');
        if (!thrombocytosisAllowed && f.counts.thrombocytosis === true) {
            proliferative.push('thrombocytosis');
        }
        if (proliferative.length) {
            notes.push(`A ${addCommas(proliferative)} accompanies the cytopenia and dysplasia. ` +
                `If persistent, this generally warrants classification as a ` +
                `myelodysplastic/myeloproliferative neoplasm or a myeloproliferative ` +
                `neoplasm rather than as a myelodysplastic neoplasm.`);
        }

        /* WHAT THE BLAST PERCENTAGE RESTS ON, said wherever it is thinner than
           the recommendation — because in this family the blast percentage is
           frequently the whole classification (MDS-LB / IB1 / IB2 / AML). */
        if (f.blasts.marrowBasis === 'counted' && f.blasts.countedCells > 0 &&
            f.blasts.countedCells < 500) {
            notes.push(`The marrow blast percentage rests on a ${f.blasts.countedCells}-cell ` +
                `differential; a 500-cell count of all nucleated cells is recommended where ` +
                `the blast percentage determines the classification.`);
        } else if (f.blasts.marrowBasis === 'cd34' || f.blasts.marrowBasis === 'cd34Range') {
            notes.push('The blast percentage is estimated from CD34 immunohistochemistry ' +
                'rather than from a differential count. The two are not equivalent, and a ' +
                '500-cell aspirate or touch preparation differential should be performed ' +
                'where one can be obtained.');
        }

        return notes.join(' ');
    };
}

/* ---------------------------------------------------------------------------
   The MDS-biTP53 caution

   This entity's chapter is unusual in how much of it the app cannot answer, and
   every clause below is a case of saying so rather than guessing. Four of them
   are traps the chapter lays deliberately:

   1. A KARYOTYPE CALL OF del(17p) IS NOT COPY-NUMBER LOSS. The chapter is
      explicit — "the mere detection of 17p13.1 deletion is not usually sufficient
      to establish TP53 copy-number loss" — and asks for FISH or another
      copy-number technique alongside sequencing of at least exons 4–11. This app
      infers multi-hit status from the karyotype checkbox (MarrowFindings.js), so
      wherever that inference is what made the case, the note says which evidence
      would settle it. See also the open item in docs/diagnosis.md.

   2. A VAF ABOVE 49% IS PRESUMPTIVE AND THE CHAPTER SAYS "NOT DEFINITIVE". It is
      therefore stated, never scored and never gated, and it carries its own
      precondition: a constitutional TP53 variant must be excluded first, which
      nothing here records.

   3. COPY-NEUTRAL LOH IS THE OTHER ROUTE TO BIALLELIC and the app has no finding
      for it. That gap is a FALSE NEGATIVE rather than an unknown — see the note
      at the rule — so the caution names it wherever a single mutation is present.

   4. >=30% PROERYTHROBLASTS MAKES THE CASE ACUTE ERYTHROID LEUKEMIA, not this.
      The boundary is in the entity's definition and in its differential diagnosis
      but NOT in its essential criteria, which is why it is here and not a gate:
      the app cannot count proerythroblasts at all, so it can only raise it.

   The fifth clause is the chapter's prognostic fallback for the case this app
   most often has — multi-hit status unresolved — and the sixth states what
   monoallelic TP53 means, because a single-hit case reads as a near miss on
   screen and is, per the chapter, an entirely different prognosis.
------------------------------------------------------------------------------ */
/* The chapter's own figure, and it is a PRESUMPTION rather than a threshold: ">49%"
   is where a heterozygous mutation's fraction stops being explicable without loss
   of the other allele. Nothing gates on it. */
const DX_TP53_PRESUMPTIVE_VAF = 49;

function dxTp53Caution(f) {
    const g = f.genetics;
    const notes = [];
    const single = g.tp53 === true && g.tp53MultiHit !== true;

    if (g.tp53MultiHit === true && g.tp53VariantCount === 1 && g.del17p === true) {
        notes.push('Biallelic status here rests on a 17p deletion reported by chromosome ' +
            'banding. WHO-HAEM5 notes that detection of a 17p13.1 deletion alone is not ' +
            'usually sufficient to establish TP53 copy-number loss: confirmation by FISH ' +
            'for the TP53 locus, or another copy-number technique alongside sequencing of ' +
            'at least exons 4–11, is recommended.');
    }

    if (single) {
        notes.push('A single TP53 mutation is reported. Monoallelic TP53 alteration is not ' +
            'this entity — its outcomes resemble those of TP53-wildtype disease — and ' +
            'biallelic involvement requires a second mutation, TP53 copy loss, or ' +
            'copy-neutral loss of heterozygosity. Copy-neutral LOH is not recorded by this ' +
            'application and must be excluded from the molecular report directly.');
        if (g.tp53Vaf !== null && g.tp53Vaf > DX_TP53_PRESUMPTIVE_VAF) {
            notes.push('The variant allele fraction of ' + dxPct(g.tp53Vaf) + '% may be regarded ' +
                'as presumptive, though not definitive, of copy loss on the trans allele or ' +
                'copy-neutral loss of heterozygosity, provided a constitutional TP53 variant ' +
                'has been ruled out.');
        }
    }

    if (g.tp53MultiHit === null && g.tp53 === true) {
        notes.push('Multi-hit status is unresolved. Where comprehensive analysis is not ' +
            'available, WHO-HAEM5 notes that a TP53 variant allele fraction of ≥40% ' +
            'and/or complex cytogenetics may carry a similarly poor prognosis.');
    }

    if (g.tp53MultiHit === true) {
        notes.push('Cases in which proerythroblasts constitute ≥30% of marrow cellularity ' +
            'are classified as acute erythroid leukemia rather than as this entity; ' +
            'proerythroblasts are not enumerated by this application. This entity should ' +
            'also be distinguished from the defined types of acute myeloid leukemia.');
    }

    return notes.join(' ');
}


/* ---- Myelodysplastic neoplasms ---- */
dxRules.push(
    /* ---- Genetically defined -------------------------------------------- */
    /* MDS-5q IS THE FIRST RULE WRITTEN FROM ITS OWN CRITERIA BOX rather than from
       recollection, and the five `requires` clauses below are that box's five
       essential criteria in its own order. Three of them were wrong before:
       the cytopenia was generic where the criterion names ANEMIA, megakaryocytic
       dysplasia was a +2 support where it is essential, and the blood blast
       ceiling was missing entirely.

       THE NAME LOST A WORD. WHO-HAEM5 calls this "MDS with low blasts and 5q
       deletion" — not "isolated 5q deletion", which was the 4th edition's name
       and is still ICD-11's label. The word had to go because the entity no
       longer requires isolation: one additional abnormality is allowed. */
    {
        id: 'mds5q',
        family: 'mds',
        /* "MDS-5q accounts for about 2.5% of all MDS cases and has an incidence of
           about 0.1 cases per 100 000 person-years." The least common of the
           myelodysplastic types this engine carries, by an order of magnitude
           against MDS-LB — so it starts behind, and a del(5q) has to be found for
           it to get in front. That is the correct order of operations for an
           entity whose defining lesion is a cytogenetic result. */
        prior: -1,
        priorReason: 'MDS-5q is about 2.5% of MDS',
        who: 'MDS with low blasts and 5q deletion (MDS-5q)',
        icc: 'MDS with del(5q)',
        /* THE DELETION IS NOT A MORPHOLOGIC DIAGNOSIS. Non-lobated megakaryocytes
           in a macrocytic anemia are as close as the smear gets, and they are
           still only a +3 support — so until the karyotype names the deletion this
           entity may be offered but must not be asserted. See dxConfirmationPrefix
           in the kernel for the sentence this produces. */
        definedBy: {
            finding: function (f) { return f.genetics.del5q; },
            phrase: 'deletion of 5q',
            study: 'cytogenetic'
        },
        /* MEGAKARYOCYTIC DYSPLASIA MOVED TO `expects`, AND IT IS THE ONE CLAUSE ON
           THIS RULE THAT COULD STILL SILENTLY DELETE A CASE.

           Anemia cannot: dxWaive turns its false into null whenever del(5q) sits
           beside any dysplasia, which is this rule's own situation, so the anemia
           gate was already incapable of excluding here (the chapter's mild-anemia
           sentence, implemented). Megakaryocytic dysplasia had no such waiver — so
           a confirmed del(5q) marrow whose only dysplastic lineage was erythroid
           left the differential outright, with the entity its karyotype names
           nowhere on screen.

           The lesion is what defines this entity; the megakaryocyte morphology is
           what usually accompanies it. Weighted heavily in both directions because
           the chapter makes it essential and names non-lobated forms as
           characteristic — but "usually" is not "always", and this is exactly the
           case a reader needs offered rather than withheld. */
        requires: [
            dxGate.mdsAnemia,
            dxGate.lowBlastsBoth,
            /* "5q deletion, isolated or with one additional cytogenetic
               aberration other than monosomy 7 or 7q deletion" — so the count is
               a criterion, and cases with one additional abnormality "have
               similar features and outcomes". Two or more takes the case out.
               `abnormalities` is what the pathologist NAMED, which is the app's
               only view of the karyotype; a complex karyotype recorded as the
               single key `complex` is caught by the exclusion below instead. */
            ['5q deletion, alone or with one other abnormality', function (f) {
                if (f.genetics.del5q !== true) return f.genetics.del5q;
                return f.genetics.abnormalities.length <= 2;
            }]
        ],
        /* LOW FOR, HIGH AGAINST — the asymmetry a near-universal criterion needs.
           Meeting it says almost nothing, because nearly every case of this entity
           meets it; failing it says a great deal. Paying +3 for the met case would
           have been the gate restated as a point, which is the pattern this whole
           rework replaces — and it showed up immediately, lifting every ordinary
           del(5q) marrow by three for a finding that does not discriminate. */
        /* `for` IS 0, AND HERE IT IS A CONFIRMED DOUBLE COUNT RATHER THAN A DOCTRINE
           CALL. `MEG_5Q_PATTERN` is `['hypolobatedForms', 'smallHypolobated']`, and
           both keys are ALSO members of `dysplasticDescriptors.megakaryocytic`. So
           ticking the single descriptor "hypolobated forms" sets
           `megakaryocytes.hypolobated` true AND `dysplasia.megakaryocytic.atLeast10`
           true, scoring +3 on the support below and +1 here — four points from one
           checkbox, with nothing to dedupe them, because dxEvaluate keys evidence by
           label text and the two labels differ.

           The doctrine reaches the same answer independently: megakaryocytic
           dysplasia is one of the three MDS lineages and is common across MDS-LB,
           MDS-IB and prefibrotic PMF, so its likelihood ratio against the field is
           about one. `against` stays -4 — it is an essential criterion, so an
           assessed, non-dysplastic megakaryocyte line genuinely argues. */
        expects: [
            ['dysplasia involving megakaryocytes', 0, -4, dxGate.megDysplasia[1]]
        ],
        excludes: [
            dxExcludeAmlDefining,
            dxExcludeBiTp53,
            ['−7 / del(7q) present', function (f) { return f.genetics.minus7; }],
            ['complex karyotype (more than one additional abnormality)',
                function (f) { return f.genetics.complex; }]
        ],
        /* THE FIRST LIKELIHOOD LADDER IN THE TABLE. Everything below the defining
           abnormality is a frequency the chapter publishes, not a criterion said
           twice — which is what docs/diagnosis.md asks supports to be and what
           none of them were. The two negatives are the chapter's own "significant
           granulocytic dysplasia is uncommon" and "bone marrow fibrosis is
           typically absent"; neither disqualifies, because neither is written as
           a criterion. */
        supports: [
            ['del(5q) is a defining abnormality', 4, function (f) { return f.genetics.del5q; }],
            /* "Conspicuously non-lobated and hypolobated nuclei" is the entity's
               characteristic morphology, and unlike plain megakaryocytic dysplasia
               it discriminates — hence +3 where the gate takes the generic form. */
            ['non-lobated / hypolobated megakaryocytes', 3, function (f) {
                return f.megakaryocytes.hypolobated;
            }],
            ['megakaryocytes increased in number', 2, function (f) {
                return f.megakaryocytes.increased;
            }],
            ['macrocytic anemia', 2, function (f) { return f.counts.macrocytic; }],
            // Thrombocytosis in one third of cases — characteristic, not usual.
            /* +3, AND IT WAS +1 ON THE REASONING THAT ONE THIRD OF CASES IS NOT
               "usual". That is the prevalence-in-entity question, which sets
               `against`; `for` is set by rarity in the FIELD, and the introduction
               chapter states this one outright: "Persistent neutrophilia,
               monocytosis, erythrocytosis, or thrombocytosis in a patient with
               cytopenias and dysplastic morphology generally warrants classification
               as a myelodysplastic/myeloproliferative neoplasm or myeloproliferative
               neoplasm. HOWEVER, THROMBOCYTOSIS (PLATELET COUNT >= 450 × 10^9/L) IS
               ALLOWED IN MDS-5q."

               So within the myelodysplastic family this finding is near-unique to
               this entity — every rival either redirects out of MDS on it or, in
               MDS-SF3B1's case, excludes on it explicitly. One third of cases here
               against approximately none elsewhere is a large likelihood ratio, and
               it was being paid the same point as "macrocytic anemia". */
            ['thrombocytosis', 3, function (f) { return f.counts.thrombocytosis; }],
            /* "The bone marrow is usually normocellular or hypercellular, and it
               frequently exhibits ERYTHROID HYPOPLASIA." The rule read neither half.
               A myeloid predominance is the aspirate's way of recording erythroid
               hypoplasia, and MDS-5q is the one myelodysplastic entity whose
               erythroid line is expected to be hypoplastic — MDS-SF3B1, its nearest
               low-blast rival, is scored +2 for the opposite chip. */
            ['myeloid predominance (erythroid hypoplasia)', 2, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'myeloid';
            }],
            /* Female predominance, and it is the exception that makes it worth a
               point: the introduction names MDS-5q as the one type more common in
               women where MDS overall has a slight male predominance. */
            ['female (MDS-5q is more common in women)', 1, function (f) {
                return f.clinical.sex === null ? null : f.clinical.sex === 'female';
            }],
            ['significant granulocytic dysplasia (uncommon in MDS-5q)', -2, function (f) {
                return f.dysplasia.myeloid.atLeast10;
            }],
            ['reticulin fibrosis MF-2 or MF-3 (typically absent in MDS-5q)', -2, function (f) {
                return dxBandAtLeast(f.fibrosis.grade, 2);
            }]
        ],
        /* THE ONE MDS TYPE IN WHICH THROMBOCYTOSIS IS ALLOWED — platelets
           >=450 x10^9/L do not redirect this case to the overlap family. */
        caution: function (f) {
            const notes = [dxMdsCaution({ thrombocytosisAllowed: true })(f)];

            /* TP53, AND IT IS THE ONE THING THAT CHANGES MANAGEMENT HERE. Present
               at diagnosis in as many as 18%, and associated with both a reduced
               response to lenalidomide — the drug this deletion is the target for
               — and a higher risk of transformation. Single-hit only: multi-hit
               takes the case to MDS-biTP53 through dxExcludeBiTp53 and would be a
               different diagnosis rather than a modifier of this one. */
            if (f.genetics.tp53 === true) {
                notes.push('A TP53 mutation is present. In MDS with 5q deletion this is ' +
                    'associated with a decreased response to lenalidomide and an increased ' +
                    'risk of transformation to acute myeloid leukemia, and is detectable at ' +
                    'diagnosis in as many as 18% of cases.');
            } else if (f.genetics.tp53 === null) {
                notes.push('TP53 mutation status is not established. It is detectable at ' +
                    'diagnosis in as many as 18% of cases of MDS with 5q deletion and predicts ' +
                    'a decreased response to lenalidomide; strong p53 expression in ≥1% of ' +
                    'marrow cells by immunohistochemistry has also been associated with a ' +
                    'higher risk of transformation and a shorter overall survival.');
            }

            /* WHY THE ENGINE IS NOT OFFERING MDS-SF3B1, said before the reader
               has to wonder. SF3B1 is mutated in 20% of MDS-5q and is probably a
               secondary event, so ring sideroblasts do not take the case out of
               this category — the exclusion runs the other way, and only one of
               the two rules should be on screen. */
            if (f.genetics.sf3b1 === true || f.ringSideroblasts.state === 'present') {
                notes.push('Ring sideroblasts and SF3B1 mutation do not exclude this ' +
                    'diagnosis. SF3B1 is mutated in approximately 20% of cases of MDS with 5q ' +
                    'deletion, where it is probably a secondary event.');
            }

            /* THE OTHER FALSE ALARM. A JAK2 or MPL mutation alongside del(5q) is
               a minority finding that alters neither the phenotype nor the
               prognosis, and in some cases the two have been shown to sit in
               DIFFERENT clones — so this is worth saying precisely because the
               engine will have a myeloproliferative candidate on the list. */
            if (f.drivers.jak2V617F === true || f.drivers.mplW515 === true) {
                notes.push('A concomitant JAK2 or MPL mutation is present. In MDS with 5q ' +
                    'deletion these do not appear to alter the disease phenotype or ' +
                    'prognosis, and the two abnormalities have in some cases been shown to ' +
                    'occupy different clones.');
            }

            /* Not a criterion and not scored — the chapter reports it as a marker
               of where the disease has got to, which is a different claim from
               how likely the diagnosis is. */
            if (f.cytopenia.thrombocytopenia === true) {
                notes.push('Thrombocytopenia is uncommon in MDS with 5q deletion and ' +
                    'reflects more advanced disease.');
            }

            return notes.join(' ');
        }
    },
    {
        id: 'mdsSf3b1',
        family: 'mds',
        /* "MDS-SF3B1 accounts for 17% of all MDS cases … incidence of 0.84 cases
           per 100 000 person-years." The commonest of the genetically defined
           types by a wide margin, and seven times MDS-5q. */
        prior: 1,
        priorReason: 'MDS-SF3B1 is about 17% of MDS',
        who: 'MDS with low blasts and SF3B1 mutation (MDS-SF3B1)',
        icc: 'MDS with mutated SF3B1',
        /* Ring sideroblasts are the morphologic correlate and they are explicitly
           NOT this entity's name — a case diagnosed on the surrogate is MDS-LB with
           ring sideroblasts, which is what mdsLB.whoFor emits. So this name requires
           the mutation, at the same VAF floor the criterion carries. */
        definedBy: {
            finding: function (f) {
                if (f.genetics.sf3b1 !== true) return f.genetics.sf3b1;
                return f.genetics.sf3b1Vaf === null ? true : f.genetics.sf3b1Vaf >= 5;
            },
            phrase: 'an SF3B1 mutation',
            study: 'molecular'
        },
        requires: [
            /* THE VARIANT ALLELE FRACTION IS PART OF THE CRITERION, not a
               footnote to it: "the presence of a SF3B1 variant at a VAF of < 5%
               does not qualify for MDS-SF3B1". So a reported fraction below the
               floor makes this FALSE even though the gene is mutated — the one
               place in the table where a recorded mutation does not count as
               one. A variant the laboratory reported without a fraction is
               unaffected: no number is not a low number.

               THE SURROGATE IS DELIBERATELY NOT HERE. The box allows ring
               sideroblasts >=15% to stand in "if SF3B1 mutation analysis is not
               available", but the terminology note is equally explicit that a
               case diagnosed that way is called MDS with low blasts and ring
               sideroblasts — which is precisely what mdsLB's whoFor already
               emits for it. Admitting the surrogate here would put the same case
               on screen twice under the same name. Instead an untested case sits
               at `pending` (findingGene returns null until NGS results) and the
               caution below states that the surrogate satisfies the criterion
               and gives the term to use. */
            ['SF3B1 mutation', function (f) {
                if (f.genetics.sf3b1 !== true) return f.genetics.sf3b1;
                return f.genetics.sf3b1Vaf === null ? true : f.genetics.sf3b1Vaf >= 5;
            }],
            dxGate.lowBlastsBoth,
            dxGate.mdsCytopenia
        ],
        /* ERYTHROID DYSPLASIA MOVED TO `expects`, the same trade as MDS-5q's
           megakaryocyte clause and for the same reason: the mutation defines the
           entity, the lineage morphology accompanies it. An SF3B1-mutated marrow
           whose recorded dysplasia was megakaryocytic used to leave the list
           entirely, which is the wrong way round — the chapter's own
           histopathology says the granulocytes are usually spared and
           megakaryocytic dysplasia is uncommon, so an atypical lineage pattern is
           evidence to weigh, not grounds to refuse the diagnosis.

           Weighted like MDS-5q's, and deliberately so: this is a disease of
           ineffective erythropoiesis, the ring sideroblast IS an erythroid
           precursor, and its absence in the erythroid line genuinely argues. */
        expects: [
            ['dysplasia involving the erythroid lineage', 1, -4, dxGate.erythroidDysplasia[1]]
        ],
        excludes: [
            dxExcludeAmlDefining,
            dxExcludeBiTp53,
            ['del(5q) present', function (f) { return f.genetics.del5q; }],
            ['−7 / del(7q) present', function (f) { return f.genetics.minus7; }],
            ['complex karyotype', function (f) { return f.genetics.complex; }],
            /* The redirect, from the other side. SF3B1 WITH thrombocytosis is the
               overlap entity, not MDS — and this half is what stops the engine
               offering both at once. It is the same clause ET carries, pointing the
               other way: one finding, two categories it takes a case out of. */
            ['thrombocytosis (MDS/MPN-SF3B1-T rather than MDS)', function (f) {
                return f.counts.thrombocytosis;
            }],
            /* Only reachable on the wildtype branch, where the SF3B1 gate has
               already failed — so this never changes a bucket. It is here to name
               the gene in the audit trail, because "excluded: SRSF2 mutation with
               wildtype SF3B1" tells the reader something "excluded: no SF3B1"
               does not. */
            ['a spliceosome mutation with wildtype SF3B1', function (f) {
                if (f.genetics.sf3b1 !== false) return false;
                return f.genetics.otherSpliceosome.present;
            }]
        ],
        /* THE SECOND LIKELIHOOD LADDER IN THE TABLE, and everything below the
           defining mutation is a frequency the chapter publishes rather than a
           criterion said twice. Erythroid dysplasia is absent from this list on
           purpose: it gates, and restating a gate as a point is the deviation
           docs/diagnosis.md is about.

           THE MALE PREPONDERANCE IS DELIBERATELY NOT SCORED. The chapter calls it
           slight, and MDS overall has a slight male preponderance — so it does
           not discriminate between this entity and the family it sits in, which
           is the only thing a point is for. Contrast MDS-5q, where female sex
           earns +1 precisely because it is the exception to that baseline. */
        supports: [
            ['SF3B1 is a defining mutation', 4, function (f) { return f.genetics.sf3b1; }],
            /* Ring sideroblasts are the phenotype, not the definition — SF3B1 is
               found in 90% of low-blast MDS with >=5% ring sideroblasts, so their
               presence is strong evidence for the mutation and neither is a
               criterion once the other is known. The >=15% tier stacks because it
               is the figure the classification itself trusts as a surrogate. */
            /* *** THESE TWO USED TO STACK TO +5, AND THE CHAPTER'S OWN NUMBER WAS
               UNUSED. *** `['ring sideroblasts identified', 3]` fired on the chip
               alone and `['ring sideroblasts >=15%', 2]` fired on top of it, so a
               15% count scored five points — more than the +4 this rule pays for the
               defining mutation it already gates on. And the lower clause paid +3 to
               a count of 1-2%, which is field background: ring sideroblasts turn up
               in alcohol excess, copper deficiency, MDS-LB and hypoplastic MDS.

               The chapter publishes the tier that was missing: "SF3B1 mutation is
               detected in 90% of MDS cases that have >= 5% of ring sideroblasts",
               and the introduction says the same from the other side — MDS-SF3B1
               "includes > 90% of cases of MDS with >= 5% ring sideroblasts". 5% is
               where the posterior for this entity turns over, and it was recorded,
               available in `f.ringSideroblasts.pct`, and read by nothing.

               THE BANDS ARE DISJOINT rather than a ladder, because dxCollapseLadders
               lives in the registry and this is a rule-local finding — the same
               pattern fibrosisMf1/fibrosisMf2 use. Half-open, [5,15) and [15,∞), so
               no count can satisfy two. The unquantified chip is the lowest rung: a
               reader who ticked "present" without counting has said something, just
               not much. */
            ['ring sideroblasts present, not quantified', 2, function (f) {
                if (f.ringSideroblasts.pct !== null) return false;
                return f.ringSideroblasts.state === null ? null : f.ringSideroblasts.state === 'present';
            }],
            ['ring sideroblasts 5-14% of erythroid precursors', 3, function (f) {
                return dxAllOf([dxAtLeast(f.ringSideroblasts.pct, 5),
                    dxNot(dxAtLeast(f.ringSideroblasts.pct, 15))]);
            }],
            ['ring sideroblasts >=15% of erythroid precursors', 4, function (f) {
                return dxAtLeast(f.ringSideroblasts.pct, 15);
            }],
            ['erythroid predominance', 2, function (f) {
                return f.cellularity.predominance === null
                    ? null : f.cellularity.predominance === 'erythroid';
            }],
            ['hypercellular for age', 1, function (f) { return f.cellularity.hyperForAge; }],
            /* Both are allowed presentations — "macrocytic normochromic or
               normocytic normochromic" — so neither earns a point. MICROCYTIC is
               the one that means something, and it means look elsewhere:
               congenital sideroblastic anemia presents microcytic, and so do
               several of the acquired mimics. The caution names them. */
            ['microcytic anemia (suggests a non-neoplastic cause of ring sideroblasts)', -2,
                function (f) { return f.counts.microcytic; }],
            ['significant granulocytic dysplasia (most cases show none)', -1, function (f) {
                return f.dysplasia.myeloid.atLeast10;
            }],
            ['megakaryocytic dysplasia (uncommon in MDS-SF3B1)', -1, function (f) {
                return f.dysplasia.megakaryocytic.atLeast10;
            }],
            ['reticulin fibrosis MF-2 or MF-3 (typically absent in MDS-SF3B1)', -2, function (f) {
                return dxBandAtLeast(f.fibrosis.grade, 2);
            }]
        ],
        caution: function (f) {
            const notes = [dxMdsCaution()(f)];

            /* THE SURROGATE, said at the only moment it is usable — SF3B1 not
               resulted, ring sideroblasts at or above the figure. Names the
               alternative term too, because the chapter restricts it to exactly
               this circumstance and a reader offered "MDS-SF3B1, pending" needs
               to know what to sign out if sequencing never happens. */
            if (f.genetics.sf3b1 === null && dxAtLeast(f.ringSideroblasts.pct, 15) === true) {
                notes.push('SF3B1 mutation analysis is not available. Ring sideroblasts ' +
                    'constituting ≥ 15% of the erythroid precursors may substitute for the ' +
                    'molecular criterion, in which case the term "MDS with low blasts and ring ' +
                    'sideroblasts" is used rather than MDS with low blasts and SF3B1 mutation.');
            }

            /* The reported fraction, when it is below the floor the box sets. */
            if (f.genetics.sf3b1 === true && f.genetics.sf3b1Vaf !== null &&
                f.genetics.sf3b1Vaf < 5) {
                notes.push('The SF3B1 variant allele fraction is below 5% and does not qualify ' +
                    'for this diagnosis; SF3B1 mutations in this entity are typically ' +
                    'heterozygous and at a high allele fraction (median: 35–43%).');
            }

            /* THE NON-NEOPLASTIC MIMICS, and the reason they are a caution rather
               than an exclusion: not one of them is answerable from a marrow. The
               chapter lists them as things that "must be excluded", which is a
               clinical instruction to the reader, so the engine's job is to put
               the list in front of them rather than to pretend it can check it.
               Fires on the finding, not on the diagnosis — ring sideroblasts
               anywhere raise the same question. */
            if (f.ringSideroblasts.state === 'present') {
                notes.push('Non-neoplastic causes of ring sideroblasts should be excluded, ' +
                    'including alcohol, toxins such as lead and benzene, drugs such as ' +
                    'isoniazid, copper deficiency (which may be induced by zinc ' +
                    'administration), and congenital sideroblastic anemia.');
                if (f.counts.microcytic === true || dxBelow(f.age, 40) === true) {
                    notes.push('Congenital sideroblastic anemia typically presents at a much ' +
                        'younger age and with a microcytic rather than a macrocytic anemia.');
                }
            }

            /* The prognosis, and the two findings that take it away. Worth saying
               together: this is the best-outcome MDS type, which is a fact a
               report is entitled to carry, and both qualifications are readable
               from data the engine already has. */
            if (f.genetics.sf3b1 === true) {
                const adverse = f.genetics.sf3b1AdverseCo;
                if (adverse.present === true) {
                    /* "co-mutation of X" rather than "the co-mutation X",
                       because the phrasing has to survive one gene and five
                       without a number-agreement branch. */
                    notes.push('MDS with low blasts and SF3B1 mutation otherwise has the most ' +
                        'favorable outcome of the MDS types, but co-mutation of ' +
                        adverse.genes.join(', ') + ' has been associated with a significantly ' +
                        'worse outcome. Mutations in DNMT3A, TET2 and ASXL1, by contrast, do ' +
                        'not appear to affect it.');
                } else {
                    notes.push('MDS with low blasts and SF3B1 mutation has the most favorable ' +
                        'outcome of the MDS types; the favorable outcome is lost as soon as an ' +
                        'excess of blasts appears, and multilineage dysplasia carries no ' +
                        'significant prognostic impact in the presence of the mutation.');
                }
            }

            return notes.filter(Boolean).join(' ');
        }
    },
    /* WRITTEN FROM ITS OWN CRITERIA BOX (WHO-HAEM5, "Myelodysplastic neoplasm with
       biallelic TP53 inactivation"), and the box added TWO essential criteria this
       rule did not have: the cytopenia and the dysplasia. Both had been left out
       on the assumption that the genetic lesion carried the diagnosis by itself —
       the same mistake MDS-5q's box corrected, and the reason a rule written from
       recollection tends to be too permissive rather than too strict.

       The blast criterion also gained its other half. The box reads "<20% of cells
       in the peripheral blood AND bone marrow"; dxGate.notAML tested the marrow
       alone until this entity was read, and now carries both for every rule that
       uses it.

       "Acceptable: myelodysplastic neoplasm with multi-hit TP53 inactivation" —
       the box's own alternative name, which is also the phrase ICC uses, so the
       two classifications' labels differ less than the `icc` line suggests. */
    {
        id: 'mdsTp53',
        family: 'mds',
        /* "TP53 alterations … detected in 7-11% of all MDS cases", and "biallelic
           in about two thirds of MDS cases with TP53 alteration" — so roughly
           5-7% of MDS, which would put it just behind MDS-SF3B1.

           ITS OWN CHAPTER'S TWO NUMBERS DO NOT AGREE, and the disagreement is
           left visible rather than resolved. The same paragraph estimates "about
           0.03 cases per 100 000 person-years", which is a THIRD of MDS-5q's 0.1
           — yet MDS-5q is 2.5% of MDS against this entity's 5-7%. Both cannot be
           right. 0 sits between what the two imply, and the next reader gets the
           conflict rather than a number that hides it. */
        prior: 0,
        priorReason: 'MDS-biTP53 is roughly 5-7% of MDS',
        who: 'MDS with biallelic TP53 inactivation (MDS-biTP53)',
        icc: 'MDS with mutated TP53 (multi-hit)',
        /* Both studies are named because either can be the second hit: two
           mutations is molecular alone, one mutation plus 17p loss needs the
           karyotype as well (see tp53MultiHit in MarrowFindings.js). */
        definedBy: {
            finding: function (f) { return f.genetics.tp53MultiHit; },
            phrase: 'biallelic (multi-hit) TP53 inactivation',
            study: 'molecular and cytogenetic'
        },
        requires: [
            dxGate.mdsCytopenia,
            dxGate.dysplasia,
            ['biallelic / multi-hit TP53', function (f) { return f.genetics.tp53MultiHit; }],
            dxGate.notAML
        ],
        excludes: [dxExcludeAmlDefining],
        /* THE RULE HAD NO `expects` ARRAY AT ALL, so nothing in it could ever argue
           against the candidate — every clause was a `supports`, which fires only on
           `true` and contributes nothing on a `false`. The complex karyotype is the
           one criterion that should: "More than 90% of patients have complex — mostly
           very complex (more than three) — chromosome abnormalities."

           At that rate a RESULTED, non-complex karyotype is genuinely surprising, so
           `against` is large. `for` is large too, and for the separate reason: both
           other genetically defined myelodysplastic rules EXCLUDE on a complex
           karyotype, so within the family this is close to unique to this entity.
           This is the rare case where the two questions give the same answer. */
        expects: [
            ['complex karyotype (>=3 abnormalities)', 3, -3,
                function (f) { return f.genetics.complex; }]
        ],
        /* The desirable criterion is the complex karyotype, scored above as a soft
           criterion because >90% of these patients have one, and mostly a VERY
           complex one (more than three abnormalities).
           The other two are the chapter's epidemiology rather than its criteria —
           biallelic TP53 is "highly enriched in MDS with increased blasts", and the
           entity is associated with marrow fibrosis — so they rank and do not gate.

           The label names the >=3 threshold the box states. The finding behind it
           is a ticked vocabulary key rather than a count, so the number is what the
           person ticking it meant; see the open item in docs/diagnosis.md. */
        supports: [
            /* +6, one rung below the pathognomonic tier. The +8 test asks whether
               another rule in this table could take a case carrying this finding, and
               one narrowly can — but only narrowly: `amlTp53` does not read
               `tp53MultiHit` at all (it reads `f.genetics.tp53` with a VAF above 10)
               and it gates on blasts >= 10%, so below that blast level nothing else
               in the table can claim the case. Sensitivity 1.0 in the entity,
               essentially zero across the MPN, overlap and boundary families. At +4
               it was worth exactly what mdsIB2 is paid for a 10-19% blast band, which
               is orders of magnitude less specific. */
            ['multi-hit TP53 is defining', 6, function (f) { return f.genetics.tp53MultiHit; }],
            ['biallelic TP53 is enriched in MDS with increased blasts', 1,
                function (f) { return dxAtLeast(f.blasts.marrow, 5); }],
            ['marrow fibrosis, which is associated with this entity', 1,
                function (f) { return dxBandAtLeast(f.fibrosis.grade, 1); }]
        ],
        /* ICC caps this category at <10% blasts; at 10-19% the case becomes
           MDS/AML with mutated TP53 and at >=20% AML with mutated TP53. WHO keeps
           MDS-biTP53 to <20% and has no TP53-defined AML at all. Said in the
           comment rather than gated, so the divergence is visible instead of
           silently resolved.

           THE TWO CRITERIA ARE ALSO DIFFERENT, not just the blast bands: WHO
           requires biallelic inactivation at every blast count, whereas ICC
           requires multi-hit only BELOW 10% and accepts any somatic mutation at a
           VAF above 10% once the blast count reaches 10%. A monoallelic case at
           12% blasts is therefore ICC's entity and not WHO's. */
        diverges: function (f) { return dxAtLeast(f.blasts.marrow, DX_BLAST_ICC) === true; },
        divergence: 'At 10–19% blasts ICC 2022 classifies this as MDS/AML with mutated TP53 — on ' +
            'any somatic TP53 mutation at a variant allele fraction above 10%, without requiring ' +
            'multi-hit status — whereas WHO-HAEM5 retains MDS with biallelic TP53 inactivation ' +
            'below 20% and requires biallelic involvement.',
        /* The entity's own caution FIRST, then the family's. The family caution
           opens with the general precaution about cytopenia and dysplasia not
           being specific findings, which is the right last word but the wrong
           first one on a rule whose specific traps are this numerous. */
        caution: function (f) {
            return [dxTp53Caution(f), dxMdsCaution()(f)].filter(Boolean).join(' ');
        }
    },

    /* ---- Blast-defined --------------------------------------------------- */
    {
        id: 'mdsIB2',
        family: 'mds',
        /* "MDS-IB represents 28-39% of MDS cases" — the chapter does not split
           that between IB1 and IB2, so neither does this: both carry the band's
           prior, and nothing here pretends to a precision the source does not
           have. The two are partitioned by their blast gates anyway, so the
           prior never has to choose between them. */
        prior: 1,
        priorReason: 'MDS-IB is 28-39% of MDS',
        who: 'MDS with increased blasts-2 (MDS-IB2)',
        icc: 'MDS/AML',
        requires: [
            /* dxMdsIb2TakesCase, not the band directly — it is the same helper
               mdsIB1 excludes on, so the two rules cannot disagree about which of
               them a case belongs to. The Auer-rod limb lives inside it. */
            ['marrow blasts 10–19% and/or blood blasts 5–19%, or Auer rods at any blast count in this range',
                dxMdsIb2TakesCase],
            dxGate.dysplasia,
            dxGate.mdsCytopenia
        ],
        excludes: [dxExcludeAmlDefining, dxExcludeBiTp53, dxExcludeMdsFibrosis],
        supports: [
            /* The +4 reads the SAME helper as the gate, not the marrow alone.
               It used to read `dxBetween(f.blasts.marrow, 10, 19)`, so a case
               qualifying on its blood — marrow 7%, blood 6%, which is MDS-IB2 by
               the box — scored 0 for its own defining criterion while MDS-IB1
               scored 4 for the marrow. The engine head-lined the wrong subtype on
               exactly the case the blood limb exists to promote. An Auer-rod case
               is that same trap arriving through morphology instead of a count. */
            ['blasts 10–19% in the marrow or 5–19% in the blood, or Auer rods', 4, dxMdsIb2TakesCase],
            ['multilineage dysplasia', 3, function (f) { return dxAtLeast(f.dysplasia.count, 2); }],
            dxMdsIbClonal,
            dxMdsIbHighRiskCyto,
            dxMdsIbHighRiskGenes,
            dxMdsIbHypercellular
        ],
        expects: [dxMdsIbDysmeg],
        /* ICC's 10–19% category is *MDS/AML*, and when a myelodysplasia-related
           mutation is present it is the named subtype *MDS/AML with
           myelodysplasia-related gene mutations*. WHO-HAEM5 stays MDS-IB2 at this
           blast range whatever the genetics — its AML-MR only starts at 20% — so
           only the ICC name moves. */
        /* ICC's FOUR MDS/AML subtypes, in ICC's own precedence: TP53 first, then
           the myelodysplasia-related gene mutations, then the myelodysplasia-related
           cytogenetic abnormalities, then NOS. The residual is "MDS/AML, not
           otherwise specified" — ICC Table 1's wording — and not the bare
           "MDS/AML", which is the family name rather than a diagnosis. */
        iccFor: function (f) {
            if (f.genetics.tp53 === true && f.genetics.tp53Vaf !== null && f.genetics.tp53Vaf > 10) {
                return 'MDS/AML with mutated TP53';
            }
            if (f.genetics.mrICC.present === true) {
                return 'MDS/AML with myelodysplasia-related gene mutations';
            }
            if (f.genetics.mrCytoICC.present === true) {
                return 'MDS/AML with myelodysplasia-related cytogenetic abnormalities';
            }
            return 'MDS/AML, not otherwise specified';
        },
        /* KEYED ON THE ACTUAL ICC THRESHOLD, not on reaching this rule. IB2 can
           now be reached on the blood limb alone — marrow 7%, blood 6% is MDS-IB2
           by the box — and on that case the blast count is not 10-19%, so ICC's
           MDS/AML category does not apply and there is no divergence to print. */
        diverges: function (f) { return dxBlastAtLeast(f, DX_BLAST_ICC) === true; },
        divergence: 'ICC 2022 classifies 10–19% blasts as MDS/AML rather than as a subtype of MDS; ' +
            'WHO-HAEM5 retains MDS-IB2. Both names are given because the distinction changes ' +
            'how the case is treated. WHO-HAEM5 notes that MDS-IB2 may be regarded as ' +
            'AML-equivalent for therapeutic purposes and for clinical trial eligibility, which ' +
            'narrows the practical distance between the two names.',
        caution: function (f) { return [dxMdsIbCaution(f), dxMdsCaution()(f)].filter(Boolean).join(' '); }
    },
    {
        id: 'mdsIB1',
        family: 'mds',
        /* Same 28-39% as MDS-IB2, and undivided in the source for the same
           reason — see the note there. */
        prior: 1,
        priorReason: 'MDS-IB is 28-39% of MDS',
        who: 'MDS with increased blasts-1 (MDS-IB1)',
        icc: 'MDS with excess blasts (MDS-EB)',
        requires: [
            ['marrow blasts 5–9% and/or blood blasts 2–4%', function (f) {
                return dxMdsIbBand(f, 5, DX_BLAST_ICC, 2, 5);
            }],
            dxGate.dysplasia,
            dxGate.mdsCytopenia
        ],
        excludes: [
            dxExcludeAmlDefining,
            dxExcludeBiTp53,
            dxExcludeMdsFibrosis,
            ['the blast count reaches MDS-IB2', dxMdsIb2TakesCase]
        ],
        supports: [
            ['blasts 5–9% in the marrow or 2–4% in the blood', 4, function (f) {
                return dxMdsIbBand(f, 5, DX_BLAST_ICC, 2, 5);
            }],
            ['multilineage dysplasia', 3, function (f) { return dxAtLeast(f.dysplasia.count, 2); }],
            dxMdsIbClonal,
            dxMdsIbHighRiskCyto,
            dxMdsIbHighRiskGenes,
            dxMdsIbHypercellular
        ],
        expects: [dxMdsIbDysmeg],
        caution: function (f) { return [dxMdsIbCaution(f), dxMdsCaution()(f)].filter(Boolean).join(' '); }
    },
    {
        id: 'mdsF',
        family: 'mds',
        /* "In about 15% of MDS-IB cases, the bone marrow shows moderate or severe
           fibrosis" — 15% of the 28-39% band, so roughly 4-6% of MDS overall. It
           starts behind its two unfibrotic siblings, which is right: the fibrosis
           gate is what should promote it, not a standing head start. */
        prior: -1,
        priorReason: 'MDS-F is about 15% of MDS-IB',
        who: 'MDS with increased blasts and fibrosis (MDS-F)',
        icc: null,   // filled per case: the base category moves at 10% blasts
        requires: [
            /* THE BLOOD LIMB MATTERS MOST HERE, and it was missing entirely. This
               is the one subtype in which the aspirate routinely fails — "bone
               marrow smears are often suboptimal or inadequate" — so the rule that
               refused to read the blood was refusing it on exactly the cases that
               have nothing else. A dry tap with MF-3 and 8% blood blasts used to
               leave this gate null. */
            ['marrow blasts 5–19% and/or blood blasts 2–19%', function (f) {
                return dxMdsIbBand(f, 5, DX_BLAST_AML, 2, DX_BLAST_AML);
            }],
            ['reticulin fibrosis MF-2 or MF-3', function (f) { return dxBandAtLeast(f.fibrosis.grade, 2); }],
            dxGate.dysplasia,
            dxGate.mdsCytopenia
        ],
        excludes: [dxExcludeAmlDefining, dxExcludeBiTp53],
        supports: [
            ['blasts 5–19% with MF-2/MF-3 fibrosis', 4, function (f) {
                return dxMdsIbBand(f, 5, DX_BLAST_AML, 2, DX_BLAST_AML);
            }],
            ['multilineage dysplasia', 3, function (f) { return dxAtLeast(f.dysplasia.count, 2); }],
            /* "A characteristic finding is an increased number of megakaryocytes
               with a high degree of dysplasia" — so the megakaryocyte carries more
               weight here than in the other two subtypes, where the chapter says
               only "normal or increased". */
            ['megakaryocytes increased in number', 2, function (f) {
                return f.megakaryocytes.increased;
            }],
            dxMdsIbClonal,
            dxMdsIbHighRiskCyto,
            dxMdsIbHighRiskGenes
        ],
        expects: [dxMdsIbDysmeg],
        /* THE QUALIFIER IS RIGHT BUT THE BASE CATEGORY MOVES. MDS-F spans 5–19%
           blasts, and at 10–19% ICC's base category is MDS/AML rather than MDS
           with excess blasts — so a fixed string was wrong over half this rule's
           range. */
        iccFor: function (f) {
            return dxBlastAtLeast(f, DX_BLAST_ICC) === true
                ? 'MDS/AML, with fibrosis (a qualifier, not a separate entity)'
                : 'MDS with excess blasts, with fibrosis (a qualifier, not a separate entity)';
        },
        diverges: function () { return true; },
        divergence: 'ICC 2022 treats fibrosis as a qualifier appended to the blast-defined ' +
            'category rather than as the separate entity WHO-HAEM5 recognises, and at 10–19% ' +
            'blasts that category is MDS/AML rather than MDS with excess blasts.',
        caution: function (f) { return [dxMdsIbCaution(f), dxMdsCaution()(f)].filter(Boolean).join(' '); }
    },

    /* ---- Morphologically defined ----------------------------------------- */
    {
        id: 'mdsH',
        family: 'mds',
        /* "hMDSs represent about 10-15% of all MDSs." Comparable to MDS-biTP53 and
           well behind MDS-LB, which matters because these two are the pair the
           engine most often has to separate — hypoplastic MDS used to headline
           over MDS-LB purely by having one fewer way to be unsure. */
        prior: 0,
        priorReason: 'hypoplastic MDS is 10-15% of MDS',
        who: 'MDS, hypoplastic (MDS-h)',
        icc: 'MDS, NOS with hypocellularity (a qualifier, not a separate entity)',
        requires: [
            ['marrow cellularity <30%, or <20% at age ≥70', dxHypoplasticCellularity],
            /* The blood limb is what implements this box's "not fulfilling
               criteria for MDS with increased blasts", and it has to be here
               rather than as an exclude: MDS-IB1 starts at 2% BLOOD blasts, so a
               hypocellular marrow with 3% marrow blasts and 3% blood blasts used
               to satisfy this rule and MDS-IB1 at once. With both limbs the two
               partition exactly, and no cross-exclude is needed in either
               direction — which matters, because MDS-IB is hypocellular in a
               minority of cases and must never acquire a cellularity clause. */
            dxGate.lowBlastsBoth,
            dxGate.myeloidOrMegDysplasia,
            dxGate.mdsCytopenia
        ],
        excludes: [
            dxExcludeAmlDefining,
            dxExcludeBiTp53,
            ['del(5q) defines this case', dxMds5qTakesCase],
            ['SF3B1 defines this case', dxMdsSf3b1TakesCase]
        ],
        /* THE LADDER, and note what is NOT on it. `markedly hypocellular for age`
           used to score +3 and has been removed: every cellularity band's floor is
           at least 30%, so once the gate is <30% (or <20%) the support is implied
           by the gate on every case where the age is known — the "gate said twice"
           deviation. Its label was wrong too; "markedly" lives in
           f.cellularity.severity, which no rule reads.

           Multilineage dysplasia is kept although this chapter publishes no
           frequency for it, because it is what separates hMDS from aplastic
           anemia — the one differential this entity is really about. */
        supports: [
            ['multilineage dysplasia', 2, function (f) { return dxAtLeast(f.dysplasia.count, 2); }],
            /* Desirable: "detection of a clonal cytogenetic and/or molecular
               abnormality" — the same clause mdsLB and the MDS-IB rules carry. */
            /* THE SHARED CLAUSE, WHICH THIS RULE HAD A PRIVATE COPY OF — WITHOUT THE
               CARVE-OUT. dxMdsIbClonal drops the somatic limb when the only clone IS
               a myelodysplasia-related mutation, because dxLikelihood.mrMutation
               already pays every mds rule +2 for that. The copy here did not, so a
               lone SRSF2 or ASXL1 variant scored +4 and printed "a clonal cytogenetic
               or molecular abnormality +2" directly above "myelodysplasia-related
               mutation (SRSF2) +2" on one card. Two rules carried the uncarved copy;
               both now read the shared one. */
            dxMdsIbClonal,
            /* "a lower median white blood cell count (2.4 vs 3.7 × 10^9/L, P = 0.002)"

               THE THRESHOLD WAS 3, WHICH IS A MIDPOINT THE CHAPTER NEVER STATES.
               Both of its numbers were sitting in the comment above the clause and
               neither was used; 3 is what you get by splitting the difference, and
               splitting a difference is inventing a threshold. The two published
               medians are the two rungs: below 3.7 is below what the other MDS types
               run at, below 2.4 is at or under what this entity runs at. Disjoint
               bands, so they cannot stack. */
            ['white cell count below 3.7 ×10⁹/L (the other MDS types’ median)', 1, function (f) {
                return dxAllOf([dxBelow(f.counts.wbc, 3.7), dxNot(dxBelow(f.counts.wbc, 2.4))]);
            }],
            ['white cell count below 2.4 ×10⁹/L (this entity’s own median)', 3, function (f) {
                return dxBelow(f.counts.wbc, 2.4);
            }],
            /* "Patients are usually younger than those with other MDS types." This
               is a point mdsLB deliberately does NOT have — its eighth-decade peak
               is true of MDS as a whole — and it is legitimate here for exactly the
               opposite reason: youth discriminates WITHIN the family. */
            ['younger than the usual age for MDS', 1, function (f) {
                return dxBelow(f.age, 60);
            }],
            /* "More low- and intermediate-risk cytogenetic changes such as trisomy
               8 and del(20q)", against the −7 / complex karyotype that dominate the
               blast-defined types. */
            ['trisomy 8 or del(20q)', 1, function (f) {
                return dxAnyOf([dxAbn(f, 'trisomy8'), dxAbn(f, 'del20q')]);
            }],
            /* *** THIS CLAUSE POINTED THE WRONG WAY AND THE RULE'S OWN CAUTION SAID
               SO. *** It read `['ring sideroblasts >5% of erythroid precursors', 1]`,
               sourced to "Iron stain on the bone marrow aspirate is helpful to
               identify an increased proportion (> 5%) of ring sideroblasts" — a
               sentence about which STAIN TO ORDER, not about what the finding means.
               The very next sentence in the chapter is the meaning: "If the
               percentage of ring sideroblasts exceeds 15%, then MDS with low blasts
               and SF3B1 mutation should be considered." And the introduction settles
               the field rate outright — MDS-SF3B1 "includes > 90% of cases of MDS
               with >= 5% ring sideroblasts".

               So ring sideroblasts above 5% point at MDS-SF3B1, not at this entity,
               and this rule was paying itself a point for its rival's finding. Now
               negative, and only -1 because hypoplastic MDS is not incompatible with
               a few ring sideroblasts — it is simply not what they suggest. */
            ['ring sideroblasts >5% of erythroid precursors (which suggest MDS-SF3B1)', -1,
                function (f) {
                    return f.ringSideroblasts.pct === null ? null : f.ringSideroblasts.pct > 5;
                }],
            // "Reticulin fibrosis is rare."
            ['reticulin fibrosis MF-2 or MF-3 (rare in hypoplastic MDS)', -2, function (f) {
                return dxBandAtLeast(f.fibrosis.grade, 2);
            }],
            /* "The presence of micromegakaryocytes is rare."

               −2, AND THE −1 WAS ARGUED AGAINST AN ENTITY THAT IS NOT IN THIS TABLE.
               The halving was justified by aplastic anemia — "the same finding is
               real evidence AGAINST aplastic anemia, which is this entity's main
               differential" — which is true clinically and irrelevant to a score.
               A weight ranks this rule against the rules the engine can actually
               offer, and among those the finding runs the other way in every one:
               MDS-F calls it "characteristic", MDS-IB "almost invariably present",
               and MDS-5q and MDS-LB both score it. Rare here, common in all of them.

               The aplastic-anemia point is real and belongs in the caution, which
               already recommends the PNH clone and the cytogenetics. */
            ['micromegakaryocytes (rare in hypoplastic MDS)', -2, function (f) {
                const named = f.megakaryocytes.named.concat(f.dysplasia.megakaryocytic.features);
                if (named.indexOf('micromegakaryocytes') !== -1) return true;
                return f.megakaryocytes.assessed ? false : null;
            }]
        ],
        diverges: function () { return true; },
        divergence: 'ICC 2022 records hypocellularity as a qualifier rather than as the separate ' +
            'entity WHO-HAEM5 recognises.',
        /* THE ONE MDS TYPE WITH A NON-NEOPLASTIC DIFFERENTIAL OF ITS OWN, which
           is why it gets a sentence the rest of the family does not. Hypoplastic
           MDS, aplastic anemia and paroxysmal nocturnal hemoglobinuria share a
           T cell-mediated attack on hematopoietic stem and progenitor cells,
           several morphologic features, and an association with clonal
           hematopoiesis — so the three overlap in exactly the marrow that
           reaches this rule. */
        caution: function (f) {
            const notes = [];

            notes.push('Hypoplastic MDS overlaps clinically and morphologically with aplastic ' +
                'anemia and paroxysmal nocturnal hemoglobinuria, which share a T cell-mediated ' +
                'attack on hematopoietic stem and progenitor cells and an association with ' +
                'clonal hematopoiesis, and the diagnosis requires that the hypocellularity not ' +
                'be explained by a non-neoplastic bone marrow failure condition. Where ' +
                'cellularity is extremely low it may be virtually impossible to distinguish the ' +
                'two by cytomorphology; aplastic anemia typically shows a marked decrease in ' +
                'megakaryocytes and in hemoglobin F-containing erythroblasts, and may itself ' +
                'show dyserythropoietic changes — which is why erythroid dysplasia alone does ' +
                'not support this diagnosis. Flow cytometric screening for a PNH clone and ' +
                'correlation with the clinical findings are recommended, and where cytogenetic ' +
                'analysis fails, FISH for MDS-associated alterations may further separate the ' +
                'two.');

            if (f.genetics.somaticGenes.indexOf('PIGA') !== -1) {
                notes.push('A PIGA mutation is reported. Where a PIGA mutation is demonstrated ' +
                    'in the absence of bona fide features of MDS, classification as paroxysmal ' +
                    'nocturnal hemoglobinuria is preferred.');
            }

            /* The chapter's four predisposition groups, as an NGS panel would
               report them. Named and never gated, because this application cannot
               tell a germline variant from a somatic one — and that is precisely
               the question the chapter is asking. Neither the germline status nor
               the family history it asks to be weighed is recorded anywhere. */
            const predisposition = ['GATA2', 'DDX41', 'TERT', 'TERC', 'DKC1', 'RTEL1', 'SRP72',
                'SAMD9', 'SAMD9L', 'FANCL', 'BRCA2', 'PALB2', 'BRIP1']
                .filter(function (g) { return f.genetics.somaticGenes.indexOf(g) !== -1; });
            notes.push(predisposition.length
                ? 'A variant in ' + addCommas(predisposition) + ' is reported. This application ' +
                    'does not record whether a variant is germline; germline testing should be ' +
                    'considered, since patients with a germline predisposition to bone marrow ' +
                    'failure do not usually respond to immunosuppressive therapy.'
                : 'A genetic predisposition to bone marrow failure — germline GATA2, DDX41, ' +
                    'Fanconi anemia or telomerase complex gene mutation — should be excluded, ' +
                    'particularly in younger patients, on the basis of comorbidities and family ' +
                    'history; neither the germline status of a reported variant nor the family ' +
                    'history is recorded by this application.');

            /* Same clause mdsLB carries, and the sf3b1 === null guard is exactly
               right rather than a duplicate of the exclude above: once
               dxMdsSf3b1TakesCase is an exclude, a SEQUENCED SF3B1 case can no
               longer reach this rule at all. */
            if (dxAtLeast(f.ringSideroblasts.pct, 15) === true && f.genetics.sf3b1 === null) {
                notes.push('Ring sideroblasts constitute ≥15% of the erythroid precursors. ' +
                    'SF3B1 mutation analysis is recommended; MDS with low blasts and SF3B1 ' +
                    'mutation (MDS-SF3B1) should be considered.');
            }

            notes.push(dxMdsCaution()(f));
            return notes.filter(Boolean).join(' ');
        }
    },
    {
        id: 'mdsLB',
        family: 'mds',
        /* THE RESIDUAL BOUND, and this rule is what it was written for.

           "MDS-LB-SLD accounts for 15-20% of MDS cases, and MDS-LB-MLD for 30%" —
           45-50% together, the commonest myelodysplastic neoplasm by some way, and
           on prevalence alone it earns the top of the band at +2.

           It does not get +2. MDS-LB is common BECAUSE it is what is left when
           every defined type has been excluded, so its prevalence is an artefact
           of its position in the algorithm rather than a fact about any marrow.
           Paying it out in full would raise the residual category above the
           specific ones on every case — the exact inversion dxResidualCategory
           already exists to undo on the MPN side. So it is capped at the highest
           prior among the entities it defers to (MDS-IB and MDS-SF3B1, both +1).
           See DX_PRIOR_BAND in MarrowDxKernel.js. */
        prior: 1,
        priorReason: 'MDS-LB is 45-50% of MDS, capped as the residual category',
        who: 'MDS with low blasts (MDS-LB)',
        icc: null,   // filled per case: SLD vs MLD
        requires: [
            dxGate.lowBlastsBoth,
            dxGate.dysplasia,
            dxGate.mdsCytopenia
        ],
        /* MDS-LB IS THE RESIDUAL CATEGORY. A case with a defining genetic
           abnormality is that entity, not this one — so the genetically defined
           categories exclude it outright rather than merely outscoring it.
           Without this, a confirmed SF3B1 case still ranked MDS-LB first, because
           generic morphology (multilineage dysplasia + no excess blasts) can
           out-point a single defining criterion. Precedence is categorical here,
           and that is exactly what a gate is for.

           The first two read the superseding rule's CRITERIA rather than its
           lesion — see dxMds5qTakesCase / dxMdsSf3b1TakesCase above for why that
           distinction is the difference between deferring and vanishing.
           mdsTp53 has no disqualifier beyond dxExcludeAmlDefining, so the
           multi-hit clause stays a bare finding. */
        excludes: [
            dxExcludeAmlDefining,
            ['del(5q) defines this case', dxMds5qTakesCase],
            ['SF3B1 defines this case', dxMdsSf3b1TakesCase],
            ['multi-hit TP53 defines this case', function (f) { return f.genetics.tp53MultiHit; }],
            /* The box's fifth essential criterion also names hypoplastic MDS, and
               this reads MDS-h's CRITERIA rather than its cellularity alone — the
               same distinction dxMds5qTakesCase exists for, and it became load
               bearing when MDS-h's dysplasia gate narrowed to the granulocytic and
               megakaryocytic lineages. A 15%-cellular marrow whose only dysplastic
               lineage is erythroid is not MDS-h; excluding it here on the
               cellularity alone would leave it with no myelodysplastic candidate.
               Collapsed to a boolean inside the helper, because an untyped
               cellularity is most cases and an unknown here would unconfirm the
               residual category on all of them. */
            ['the criteria for MDS, hypoplastic are met', dxMdsHTakesCase]
        ],
        /* THE LADDER. `no excess blasts` used to sit here and was dxGate.lowBlasts
           said a second time — the deviation this file's other supports headers
           name. What replaces it is the box's two DESIRABLE criteria (desirable,
           so points and never gates) and two frequencies the chapter publishes.
           The eighth-decade age peak is deliberately absent: it is true of MDS as
           a whole, and a point that does not discriminate within the family is
           noise in the ranking. */
        supports: [
            ['multilineage dysplasia', 3, function (f) { return dxAtLeast(f.dysplasia.count, 2); }],
            /* `count` is a FLOOR, not a count — summariseDysplasia returns it as
               soon as any one lineage has an answer — so single-lineage dysplasia
               is a claim only once all three have been assessed. Multilineage is
               the safe direction: two dysplastic lineages are multilineage whatever
               the third turns out to be. */
            ['single lineage dysplasia', 2, function (f) {
                return f.dysplasia.count === 1 && f.dysplasia.assessed === 3;
            }],
            // Desirable: "hypercellular bone marrow for age". "The bone marrow is
            // usually hypercellular", so this is likelihood and not a gate restated.
            /* +1, not +2. "The bone marrow is usually hypercellular" — near-universal
               in the entity, which sets `against` and not `for`, and common right
               across the field: MDS-IB "usually shows hypercellular bone marrow"
               (+1), MDS-SF3B1 "typically hypercellular" (+1). The kernel's point
               ladder names a hypercellular marrow as its own example of the
               genuinely small `for`. At +2 this was a standing point to the RESIDUAL
               category over the defined ones on a finding all three share — and the
               one hypocellular rival, MDS-h, is already removed by an exclude. */
            ['hypercellular marrow for age', 1, function (f) { return f.cellularity.hyperForAge; }],
            /* Desirable: "detection of clonal cytogenetic and/or molecular
               abnormality" — the criterion asks whether the hematopoiesis is
               clonal, so any named abnormality or any somatic variant answers it.
               The myelodysplasia-related subset is already scored by the engine's
               family bonus; this catches a clonal karyotype or a non-MR variant. */
            /* THE SHARED CLAUSE, WHICH THIS RULE HAD A PRIVATE COPY OF — WITHOUT THE
               CARVE-OUT. dxMdsIbClonal drops the somatic limb when the only clone IS
               a myelodysplasia-related mutation, because dxLikelihood.mrMutation
               already pays every mds rule +2 for that. The copy here did not, so a
               lone SRSF2 or ASXL1 variant scored +4 and printed "a clonal cytogenetic
               or molecular abnormality +2" directly above "myelodysplasia-related
               mutation (SRSF2) +2" on one card. Two rules carried the uncarved copy;
               both now read the shared one. */
            dxMdsIbClonal,
            /* Anemia moved to dxLikelihood.anemia, which carries the same ">70%"
               figure alongside every other entity's rate — MDS-SF3B1's 57%, and
               the MDS-IB chapter naming it as merely one of three cytopenias. The
               number only discriminates when it can be read against its rivals'
               numbers, which is the whole reason that table is keyed by input. */
            // "The erythrocytes frequently show anisopoikilocytosis with macrocytosis."
            ['macrocytosis', 1, function (f) { return f.counts.macrocytic; }]
        ],
        /* MDS-LB-RS — AN ACCEPTABLE ALTERNATIVE NAME, NOT A SEPARATE ENTITY.
           MDS-SF3B1 now captures >90% of the cases that used to be called MDS with
           ring sideroblasts, so WHO-HAEM5 retained "MDS with low blasts and ring
           sideroblasts" only "for cases with wildtype SF3B1 and/or >=15% ring
           sideroblasts" — to keep the classification usable where sequencing is
           not available, and to leave somewhere for the rare cases driven by a
           different splicing component.

           "AND/OR" IS LOAD-BEARING, so both halves stand alone: a wildtype-SF3B1
           marrow with ring sideroblasts at any percentage qualifies, and so does
           one at >=15% where SF3B1 was never sequenced. What neither half allows
           is ring sideroblasts nobody looked for — iron stain state null gives the
           plain name, since the alternative asserts a finding.

           SF3B1-MUTATED CASES CANNOT REACH HERE AT ALL: mdsLB excludes them
           outright as the residual category, so this can never quietly rename the
           entity that supersedes it. */
        whoFor: function (f) {
            const wildtype = f.genetics.sf3b1 === false;
            const fifteen = dxAtLeast(f.ringSideroblasts.pct, 15) === true;
            if (f.ringSideroblasts.state === 'present' && (wildtype || fifteen)) {
                return 'MDS with low blasts and ring sideroblasts (MDS-LB-RS)';
            }
            /* THE BOX'S TWO NAMED SUBTYPES, and they are named here rather than
               split into two rules: SLD and MLD share every gate and differ only
               in a lineage count, so a split would double four gates, put two
               near-identical cards on screen, and ask the engine to rank a
               distinction that is arithmetic. Same floor-versus-count asymmetry as
               the supports — MLD is safe on two, SLD is a claim only at three. */
            if (dxAtLeast(f.dysplasia.count, 2) === true) {
                return 'MDS with low blasts and multilineage dysplasia (MDS-LB-MLD)';
            }
            if (f.dysplasia.count === 1 && f.dysplasia.assessed === 3) {
                return 'MDS with low blasts and single-lineage dysplasia (MDS-LB-SLD)';
            }
            return 'MDS with low blasts (MDS-LB)';
        },
        iccFor: function (f) {
            if (dxAtLeast(f.dysplasia.count, 2) === true) {
                return 'MDS, NOS with multilineage dysplasia';
            }
            if (f.dysplasia.count === 1 && f.dysplasia.assessed === 3) {
                return 'MDS, NOS with single lineage dysplasia';
            }
            return 'MDS, NOS';
        },
        /* A divergence of NAME and not of criteria, which is the useful thing to
           say: the diagnosis line prints both names, and the reader should know
           there is nothing to reconcile between them. */
        diverges: function () { return true; },
        divergence: 'The divergence here is one of nomenclature rather than of criteria. ' +
            'WHO-HAEM5 names the entity by its blast level — MDS with low blasts — where ICC ' +
            '2022 keeps it as the residual category, MDS, not otherwise specified. Both subtype ' +
            'it identically, by whether one lineage or more than one is dysplastic.',
        caution: function (f) {
            const notes = [];

            /* MEGALOBLASTOID CHANGE ON ITS OWN DOES NOT ESTABLISH DYSERYTHROPOIESIS
               — the chapter says so in as many words — and it is the morphologic
               signature of the very deficiency the fourth essential criterion asks
               to be excluded. The app currently admits it as an erythroid
               dysplastic descriptor like any other, so a marrow whose only
               erythroid finding is megaloblastoid change satisfies the dysplasia
               gate on the one feature that cannot satisfy it. Said here rather
               than fixed in the vocabulary because the fix belongs in
               MarrowFindings.js and would touch every rule that reads dysplasia —
               see the open item in docs/diagnosis.md. */
            if (f.dysplasia.erythroid.features.length === 1 &&
                f.dysplasia.erythroid.features[0] === 'megaloblastoid') {
                notes.push('The only erythroid feature recorded is megaloblastoid change, which ' +
                    'is common in this setting but is by itself insufficient to establish ' +
                    'dyserythropoiesis. Vitamin B12 and folate deficiency should be excluded.');
            }

            /* "Identification of rare (≤1%) peripheral blood blasts in conjunction
               with <5% blasts in the bone marrow does not alter the classification.
               However, the finding of rare blasts in the peripheral blood on two
               separate occasions may qualify as MDS with excess blasts." The app
               records one occasion and has no view of a prior differential, so the
               second sentence can only ever be a prompt. */
            if (f.blasts.blood !== null && f.blasts.blood > 0 && f.blasts.blood < 2) {
                notes.push('Rare blasts are present in the blood. In conjunction with fewer ' +
                    'than 5% marrow blasts this does not alter the classification, but the ' +
                    'finding of rare circulating blasts on two separate occasions may qualify ' +
                    'as MDS with increased blasts; correlation with any prior differential is ' +
                    'recommended.');
            }

            /* Ring sideroblasts "are typically <15% of erythroid precursors" in
               this category. Above that with SF3B1 never sequenced, whoFor above
               quietly renames the case MDS-LB-RS — an acceptable alternative name
               that exists precisely for where sequencing is unavailable, so the
               reader should be told sequencing would settle it. */
            if (dxAtLeast(f.ringSideroblasts.pct, 15) === true && f.genetics.sf3b1 === null) {
                notes.push('Ring sideroblasts constitute ≥15% of the erythroid precursors, ' +
                    'above the proportion typical of this category. SF3B1 mutation analysis is ' +
                    'recommended; a mutation would reclassify the case as MDS with low blasts ' +
                    'and SF3B1 mutation (MDS-SF3B1).');
            }

            notes.push(dxMdsCaution()(f));
            return notes.filter(Boolean).join(' ');
        }
    }

);
