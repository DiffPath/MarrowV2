/* ============================================================================
   MarrowDxMdsMpn.js — the myelodysplastic/myeloproliferative overlap

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. Reads dxMpn from MarrowDxMpn.js, which must load first.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   Chronic myelomonocytic leukemia

   THE THIRD RULE WRITTEN FROM ITS OWN CRITERIA BOX (WHO-HAEM5 Box 2.19, with the
   chapter text beside it), and the first entity in the
   myelodysplastic/myeloproliferative family to get one. Everything below is from
   that chapter unless it says otherwise.

   THE BOX'S SHAPE IS UNUSUAL AND THE ENGINE HAS TO RESPECT IT. Four essential
   criteria, three DESIRABLE criteria, and then a rule that says how many of the
   desirable ones are needed — and that rule depends on the monocyte count:

       monocytosis >= 1.0 x10^9/L   one or more desirable criteria
       monocytosis <  1.0 x10^9/L   desirable criteria 1 AND 2 (both)

   So the oligomonocytic band is the strict one: dysplasia AND a clonal
   abnormality, and monocyte partitioning does not substitute for either. That is
   the formal route by which "oligomonocytic CMML" came in from MDS, and it is
   why dxCmmlDesirable() reads the band rather than applying one test.

   THREE OF THE CRITERIA CANNOT BE ANSWERED FROM ANYTHING THIS APP RECORDS, and
   each is handled by saying so rather than by guessing:

     - DESIRABLE 3, abnormal partitioning of the blood monocyte subsets (classic
       CD14+/CD16- monocytes >94% by flow cytometry). No flow input exists. This
       is why the ">= 1.0" branch below can never return FALSE: two of three
       desirable criteria being absent does not establish that none is met, and a
       hard false there would silently drop a case whose flow was never sent.
     - ESSENTIAL 4, the myeloid/lymphoid neoplasms with eosinophilia and tyrosine
       kinase gene fusions. PDGFRA, PDGFRB, FGFR1 and JAK2 fusions are not in the
       cytogenetic vocabulary, so this is a caution raised on eosinophilia — which
       is what the footnote itself asks for ("should be specifically excluded in
       cases with eosinophilia") — and never a gate that would sit unknown forever.
   PROMONOCYTES ARE BLAST EQUIVALENTS, and this used to be a third one. Both the
   20% ceiling and the CMML-1/CMML-2 split are read on "blasts and blast
   equivalents (myeloblasts, monoblasts, promonocytes)", and the differential had
   a Blasts key and no promonocyte key. It has both now — Promonos, and a combined
   Pros/blasts bucket for the other convention — so f.blasts.marrow and .blood ARE
   the blast-equivalent percentages whenever they were counted. What survives is a
   caution, and it now says which of the two the case is: a differential that used
   neither key still needs its percentage confirmed to include the promonocytes,
   and one that used them says so instead.

   PERSISTENCE IS THE OTHER THING A SINGLE SPECIMEN CANNOT SHOW. The monocytosis
   criterion says "persistent", which is a fact about serial counts; the app sees
   one. Named in the caution, exactly as the MDS introduction's proliferative
   redirect is.

   ICC 2022 (Table 13) HAS BEEN READ, and the two classifications agree on less
   than the shared name suggests. Four differences matter, and each is printed
   rather than resolved — gating on either reading would silently pick one:

     - ICC REQUIRES CLONALITY of every case (abnormal cytogenetics and/or a
       myeloid-neoplasm-associated mutation at a VAF >=10%), where WHO makes it a
       desirable criterion. A case with no clonal marker can be WHO's CMML and not
       ICC's, unless it takes ICC's own alternative route (see dxCmmlIccRoute).
     - ICC REQUIRES A CYTOPENIA, at MDS thresholds, which WHO does not ask for at
       all — softened by its own footnote that a small proportion of cases, usually
       early phase, show only borderline or none.
     - ICC's alternative route for a non-clonal case takes increased blasts at
       >=5% marrow / >=2% blood, thresholds that exist nowhere in WHO's box and are
       NOT the CMML-1/CMML-2 split.
     - ICC names two lesser categories WHO does not: CMUS and CCMUS, for a
       monocytosis whose marrow does not show CMML.
------------------------------------------------------------------------------ */

/* Both thresholds of essential criterion 1, and the band inside it where the
   desirable criteria harden. `findingCounts` owns the comparison; these exist so
   the comment can print the numbers it was read against. */
const DX_CMML_MONO_ABS = 0.5;
const DX_CMML_MONO_PCT = 10;
const DX_CMML_CLONALITY_BAND = 1.0;

/* The subtyping cut-off, unchanged since Bennett's 1994 series and substantiated
   in five later ones. The chapter puts 39-63% of cases on the proliferative side. */
const DX_CMML_MP_WBC = 13;

/* The subgrouping thresholds. CMML-0 IS GONE — cases with <1% blood and <5%
   marrow blasts were a subgroup in the previous edition and "this has been shown
   to have little to no correlation with outcome measures". Two tiers now. */
const DX_CMML_BLAST_PB = 5;
const DX_CMML_BLAST_BM = 10;

/* ICC 2022's clonality criterion, which is a different question from WHO's
   desirable criterion 2 in two ways: it is required of every case, and a mutation
   only counts "of at least 10% allele frequency". A laboratory that printed no
   fraction leaves this null rather than false — an unreported VAF is not a small
   one, the same reading tp53Vaf gets. */
const DX_CMML_ICC_VAF = 10;

/* ICC's own blast thresholds for its non-clonal route. NOT the CMML-1/CMML-2
   split, and the resemblance is the trap: 5 is the marrow number here and the
   BLOOD number there. */
const DX_CMML_ICC_BLAST_BM = 5;
const DX_CMML_ICC_BLAST_PB = 2;

/* DESIRABLE CRITERION 2: "acquired clonal cytogenetic or molecular abnormality".
   EITHER study can satisfy it, so this is a Kleene OR over the two, and each side
   keeps the file's usual asymmetry — a named finding is a finding whatever the
   status says, and an empty list is a negative only once that study has resulted.

   Deliberately ANY abnormality and any somatic variant, not the CMML gene list:
   the criterion asks whether the hematopoiesis is clonal, and narrowing it to
   the genes CMML usually mutates would make the engine stricter than the
   classification. CMML_GENES scores instead.

   EXCEPT IN THE OLIGOMONOCYTIC BAND, where Table 2.13's footnote a narrows it for
   the box: between 0.5 and 1.0 x10^9/L the criterion is met only by a mutation in
   one of twelve named genes — not by an abnormal karyotype, and not by TET2 or
   DNMT3A, the two commonest genes in the disease and the two commonest in
   age-related clonal hematopoiesis. That is the same band where the criterion is
   also mandatory, so the low band hardens twice over; see CMML_DESIRABLE_GENES. */
function dxCmmlClonal(f) {
    if (f.counts.monocytosisNeedsClonality === true) {
        return f.genetics.cmmlDesirableGenes.present;
    }
    const cyto = f.genetics.abnormalities.length ? true
        : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
    return dxAnyOf([f.genetics.anySomatic, cyto]);
}

/* The same question as ICC asks it. Cytogenetics carry no fraction and are read
   as they are; a molecular finding has to clear the 10% bar, so a case whose only
   variant is a 4% subclone is clonal to WHO and not to ICC. */
function dxCmmlIccClonal(f) {
    const cyto = f.genetics.abnormalities.length ? true
        : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
    const molecular = f.genetics.anySomatic === true
        ? dxAtLeast(f.genetics.maxVaf, DX_CMML_ICC_VAF)
        : f.genetics.anySomatic;
    return dxAnyOf([molecular, cyto]);
}

/* ICC's route for a case with no demonstrated clone: monocytes >=1.0 x10^9/L and
   >10% of leucocytes, PLUS increased blasts or dysplasia or a CMML
   immunophenotype. The immunophenotype is not something this app records, so a
   false here means "neither of the two we can see", never "none of the three" —
   the same asymmetry dxCmmlDesirable() applies to WHO's desirable 3. */
function dxCmmlIccAlternative(f) {
    const count = dxAllOf([
        dxNot(f.counts.monocytosisNeedsClonality),
        f.counts.monocytosis
    ]);
    const feature = dxAnyOf([
        f.dysplasia.any,
        dxAtLeast(f.blasts.marrow, DX_CMML_ICC_BLAST_BM),
        dxAtLeast(f.blasts.blood, DX_CMML_ICC_BLAST_PB)
    ]);
    return dxAllOf([count, feature === false ? null : feature]);
}

/* The requirement rule, which is the one clause in this engine whose STRENGTH
   depends on another finding. See the header: below 1.0 x10^9/L both desirable
   criteria are mandatory and a false is real; at or above it, one of three
   suffices and the third is unassessable here, so a false is downgraded to
   unknown and the caution says which criterion was never tested. */
function dxCmmlDesirable(f) {
    const dysplasia = f.dysplasia.any;
    const clonal = dxCmmlClonal(f);
    const band = f.counts.monocytosisNeedsClonality;

    if (band === true) return dxAllOf([dysplasia, clonal]);
    if (band === false) {
        const either = dxAnyOf([dysplasia, clonal]);
        return either === false ? null : either;
    }
    return null;
}

/* Myelodysplastic or myeloproliferative, on the white cell count alone. */
function dxCmmlSubtype(f) {
    if (f.counts.wbc === null) return null;
    return f.counts.wbc >= DX_CMML_MP_WBC ? 'mp' : 'md';
}

/* CMML-1 or CMML-2, three-valued, and the asymmetry between them is the point:
   CMML-2 needs only ONE specimen to reach its threshold, while CMML-1 requires
   BOTH to be below theirs. So an uncounted blood film can confirm CMML-2 and can
   never confirm CMML-1 — which is the honest reading of "< 5% in peripheral blood
   and < 10% in bone marrow". */
function dxCmmlSubgroup(f) {
    const pb = f.blasts.blood, bm = f.blasts.marrow;
    if ((pb !== null && pb >= DX_CMML_BLAST_PB) || (bm !== null && bm >= DX_CMML_BLAST_BM)) {
        return 'CMML-2';
    }
    return (pb !== null && bm !== null) ? 'CMML-1' : null;
}

/* The name, subtype and subgroup included where the case supports them. The two
   subtype strings are the chapter's own ICD-O entries — "myelodysplastic chronic
   myelomonocytic leukemia", not "CMML, myelodysplastic type".

   NO POST-CYTOTOXIC-THERAPY QUALIFIER, unlike the AML names: a CMML phenotype
   after cytotoxic therapy is classified under myeloid neoplasms post cytotoxic
   therapy — a different category, not a suffix on this one — so that case gets a
   caution pointing there rather than a name that quietly absorbs it. */
function dxCmmlName(f) {
    const subtype = dxCmmlSubtype(f);
    const group = dxCmmlSubgroup(f);
    const base = subtype === 'mp' ? 'Myeloproliferative chronic myelomonocytic leukemia (MP-CMML)'
        : (subtype === 'md' ? 'Myelodysplastic chronic myelomonocytic leukemia (MD-CMML)'
            : 'Chronic myelomonocytic leukemia (CMML)');
    return group ? `${base}, ${group}` : base;
}

/* What the case says about the monocytes — the sentence this diagnosis turns on,
   and the reason the counts are printed rather than characterised. */
function dxCmmlMonocyteText(f) {
    const c = f.counts;
    const parts = [];

    if (c.monocyteAbs !== null && c.monocytePct !== null) {
        parts.push(`The peripheral blood shows an absolute monocytosis of ` +
            `${c.monocyteAbs} × 10⁹/L (${dxPct(c.monocytePct)}% of leucocytes).`);
    } else if (c.monocyteAbs !== null) {
        parts.push(`The absolute monocyte count is ${c.monocyteAbs} × 10⁹/L.`);
    } else if (c.monocytePct !== null) {
        parts.push(`Monocytes account for ${dxPct(c.monocytePct)}% of leucocytes.`);
    }

    const m = f.marrowMonocytes;
    if (m.pct !== null) {
        parts.push(`Monocytes account for ${dxPct(m.pct)}% of marrow nucleated cells` +
            (m.increased === true ? `, above the reference range of ${m.upper}%.` : '.'));
    }
    return parts.join(' ');
}

/* Which desirable criteria are met, named. The comment has to be able to say
   WHICH, because the requirement rule differs by monocyte count and a reader
   checking it against the box needs the same two lines the box has. */
function dxCmmlDesirableText(f) {
    const met = [];

    if (f.dysplasia.any === true) {
        const named = [];
        if (f.dysplasia.erythroid.atLeast10) named.push('erythroid');
        if (f.dysplasia.myeloid.atLeast10) named.push('granulocytic');
        if (f.dysplasia.megakaryocytic.atLeast10) named.push('megakaryocytic');
        met.push(named.length
            ? `dysplasia involving the ${addCommas(named)} ${named.length > 1 ? 'lineages' : 'lineage'}`
            : 'dysplasia involving at least one myeloid lineage');
    }

    /* THE SAME SOURCE THE CRITERION IS READ FROM, band and all — a comment that
       named a TET2 mutation as meeting desirable criterion 2 in the
       oligomonocytic band would be naming something the box does not accept
       there, and the karyotype clause below drops out with it for the same
       reason. See dxCmmlClonal(). */
    const low = f.counts.monocytosisNeedsClonality === true;
    const genes = low ? f.genetics.cmmlDesirableGenes.genes : f.genetics.somaticGenes;
    const abn = f.genetics.abnormalities;
    if (genes.length) met.push(`an acquired clonal molecular abnormality (${addCommas(genes)})`);
    if (abn.length && !low) {
        met.push(`an acquired clonal cytogenetic abnormality (${addCommas(abn.map(function (k) {
            return ancAbnVocabulary[k].label;
        }))})`);
    }

    if (!met.length) return '';

    /* WHICH RULE APPLIED, not merely which criteria were met — the box asks for a
       different number of them on either side of 1.0 × 10⁹/L, and a reader
       checking the comment against it needs to see the same two lines. */
    const rule = low
        ? `both are required at an absolute monocyte count below ` +
          `${DX_CMML_CLONALITY_BAND.toFixed(1)} × 10⁹/L, where the clonal criterion is met ` +
          `only by a mutation in one of the genes of the recommended minimal panel`
        : 'at least one is required at this monocyte count';
    return `Of the desirable diagnostic criteria, ${addCommas(met)} ` +
        `${met.length > 1 ? 'are' : 'is'} met; ${rule}.`;
}

/* How the subtype and the subgroup were arrived at. Printed as the numbers and
   the thresholds rather than as the label alone: both are read off counts that
   the reader can check, and the subgroup's rests on a blast percentage this app
   cannot fully assemble (see the caution). */
function dxCmmlSubtypeText(f) {
    const parts = [];
    const wbc = f.counts.wbc;
    if (wbc !== null) {
        parts.push(`The white cell count of ${wbc} × 10⁹/L places this in the ` +
            `${wbc >= DX_CMML_MP_WBC ? 'myeloproliferative' : 'myelodysplastic'} subtype ` +
            `(the two are separated at ${DX_CMML_MP_WBC} × 10⁹/L).`);
    } else {
        parts.push(`The myelodysplastic and myeloproliferative subtypes are separated at a ` +
            `white cell count of ${DX_CMML_MP_WBC} × 10⁹/L, which is not available.`);
    }

    const group = dxCmmlSubgroup(f);
    const counts = [];
    if (f.blasts.marrow !== null) counts.push(`${dxPct(f.blasts.marrow)}% of marrow cells`);
    if (f.blasts.blood !== null) counts.push(`${dxPct(f.blasts.blood)}% of blood leucocytes`);
    if (group && counts.length) {
        /* WHAT THE PERCENTAGE IS OF, and it is not a stylistic choice: the
           criterion is written on blasts and blast equivalents, so a case that
           counted the promonocytes has to say so and a case that did not must not
           claim it. The caution says the same thing at length; this is the noun in
           front of the number. */
        parts.push(`${f.blasts.equivalentsCounted ? 'Blasts and promonocytes' : 'Blasts'} ` +
            `account for ${addCommas(counts)}, placing this in ${group} ` +
            `(CMML-2 is ≥${DX_CMML_BLAST_PB}% in the blood or ≥${DX_CMML_BLAST_BM}% in the marrow).`);
    } else if (!group) {
        parts.push(`The subgroup cannot be assigned: CMML-1 requires blasts and promonocytes ` +
            `<${DX_CMML_BLAST_PB}% in the blood and <${DX_CMML_BLAST_BM}% in the marrow, and both ` +
            `specimens must be counted to establish it.`);
    }
    return parts.join(' ');
}

/* THE ICC DIFFERENCES THAT BITE ON THIS CASE, assembled rather than fixed. The
   two classifications diverge in four places here — more than anywhere else in
   the myelodysplastic tables — and printing all four on every case would bury the
   one that decides this one. Each clause fires only where the case actually falls
   on the far side of it, so a fully clonal, cytopenic, dysplastic case prints
   nothing and the two classifications simply agree.

   Returns '' when they do, which is what `diverges` below is asked. */
function dxCmmlDivergence(f) {
    const notes = [];
    const clonal = dxCmmlIccClonal(f);

    if (clonal !== true) {
        /* AN UNPRINTED ALLELE FRACTION IS NOT A LOW ONE, and this clause read it
           as one. `anySomatic === true` says a variant was reported and says
           nothing whatever about its size, so every case whose laboratory omitted
           the VAF column was told "the variants reported here do not reach that
           allele fraction" — a negative asserted from a measurement nobody made,
           and against ICC's own criterion at that.

           The shortfall is now claimed only where a fraction exists and falls
           under the bar. Where none was recorded the sentence says so instead
           rather than falling silent: a missing fraction is the reason ICC's
           criterion cannot be answered on this case, and the reader has to be able
           to tell which of the two situations is in front of them. */
        let fraction = '.';
        if (f.genetics.anySomatic === true) {
            if (f.genetics.maxVaf === null) {
                fraction = ', and no variant allele fraction is recorded for the variants ' +
                    'reported here.';
            } else if (f.genetics.maxVaf < DX_CMML_ICC_VAF) {
                fraction = ', and the variants reported here do not reach that allele fraction.';
            }
        }
        notes.push('ICC 2022 requires evidence of clonality in every case — an abnormal ' +
            'karyotype and/or at least one myeloid neoplasm–associated mutation at a variant ' +
            `allele fraction of at least ${DX_CMML_ICC_VAF}% — where WHO-HAEM5 lists an acquired ` +
            'clonal abnormality among the desirable criteria rather than the essential ones' +
            fraction);

        const route = dxCmmlIccAlternative(f);
        const alternative = 'In the absence of clonality ICC accepts a monocyte count of at ' +
            `least ${DX_CMML_CLONALITY_BAND.toFixed(1)} × 10⁹/L and above ${DX_CMML_MONO_PCT}% of ` +
            'leucocytes together with increased blasts ' +
            `(≥${DX_CMML_ICC_BLAST_BM}% in the marrow and/or ≥${DX_CMML_ICC_BLAST_PB}% in the ` +
            'blood), morphologic dysplasia, or an immunophenotype consistent with CMML';
        if (route === true) {
            notes.push(`${alternative}; this case meets that alternative.`);
        } else if (route === false) {
            notes.push(`${alternative}; this case does not meet it, and would not be classified ` +
                'as CMML by ICC 2022 on the findings available.');
        } else {
            notes.push(`${alternative}; whether this case meets that alternative is not ` +
                'established by the findings available.');
        }
    }

    /* ICC's cytopenia criterion, and its own footnote softening it. Fired only on
       a case that HAS no cytopenia — a null means nobody has said, which is not a
       divergence, it is an unfinished workup. */
    if (f.cytopenia.any === false) {
        notes.push('ICC 2022 also lists a cytopenia, at the thresholds it uses for MDS, among ' +
            'its diagnostic criteria; WHO-HAEM5 does not require one, and none is recorded here. ' +
            'ICC notes that a small proportion of cases, usually in early phase disease, show ' +
            'only borderline or no cytopenia.');
    }

    /* The two lesser categories WHO does not name, raised where the marrow is the
       thing that is not diagnostic. */
    if (f.dysplasia.any === false && dxAtLeast(f.blasts.marrow, DX_CMML_ICC_BLAST_BM) !== true) {
        notes.push('Where the marrow does not show the findings of CMML, ICC 2022 recognises ' +
            'clonal monocytosis of undetermined significance (CMUS) — or clonal cytopenia and ' +
            'monocytosis of undetermined significance (CCMUS) where a cytopenia is present — as ' +
            'categories short of the diagnosis; WHO-HAEM5 names neither, and in either setting ' +
            'an alternative cause for the monocytosis must be excluded clinicopathologically.');
    }

    return notes.join(' ');
}

/* NOT dxMorphologySentence() IN THE HEAD, which every other comment in this file
   uses. It states the dysplastic lineages and the blast percentage — and on this
   rule both are said again downstream, the lineages by the desirable-criteria
   sentence and the blasts by the subgrouping sentence, which is where each of
   them earns its place. Using it here printed the blast count twice in one
   comment, once to one decimal and once not. */
function dxCmmlComment(f, mode, rule) {
    const head = mode === 'addendum'
        ? 'The previously reported findings have been reviewed in conjunction with the ' +
          'now-available studies.'
        : dxCmmlMonocyteText(f);

    const parts = [];
    const desirable = dxCmmlDesirableText(f);
    if (desirable) parts.push(desirable);
    parts.push(dxClassificationSentence(rule, f, dxLower(dxCmmlName(f))));
    parts.push(dxCmmlSubtypeText(f));

    const waiting = dxPendingStudies(f);
    if (waiting.length) {
        /* DESIRABLE OR REQUIRED IS THE MONOCYTE COUNT'S ANSWER, not a fixed one,
           and the sentence has to move with it — calling clonality "desirable" in
           the band where footnote a makes it mandatory understates exactly the
           criterion the reader is being told to wait for. */
        parts.push(`${addCommas(waiting).replace(/^./, function (c) { return c.toUpperCase(); })} ` +
            `studies are outstanding; a demonstrated clonal abnormality is ` +
            (f.counts.monocytosisNeedsClonality === true
                ? `required for this diagnosis at this monocyte count`
                : `a desirable criterion for this diagnosis`) +
            ` and an addendum will follow.`);
    }

    return (head ? head + '\n\n' : '') + parts.join(' ');
}

/* THE CAUTIONS, and there are more here than on any other rule because more of
   this entity's criteria live outside what a marrow can answer. Each fires on the
   case in front of it; the first two fire on every case, because they are the two
   things a single specimen can never establish. */
function dxCmmlCaution(f) {
    const notes = [];

    /* Persistence, and the differential the chapter opens with. */
    notes.push('The monocytosis must be persistent and other causes of monocytosis — ' +
        'infection, inflammatory and autoimmune conditions, malignancy, and drug and ' +
        'growth factor effect — should be excluded before this diagnosis is made; a ' +
        'single count cannot establish persistence.');

    /* PROMONOCYTES, and which of the two things the printed percentage is. The
       differential now has keys for them, so this says one of two different
       things: that the count included them, or that it should be confirmed to.
       Both are worth printing, because the difference decides the AML boundary and
       the subgroup, and neither is visible in a bare percentage. Said whenever a
       blast count was read at all. */
    if (f.blasts.marrow !== null || f.blasts.blood !== null) {
        notes.push('Blasts and blast equivalents in this classification comprise myeloblasts, ' +
            'monoblasts and promonocytes, promonocytes being counted as blast equivalents. ' +
            (f.blasts.equivalentsCounted
                ? 'Promonocytes were enumerated in this differential and are included in the ' +
                  'percentages above. The distinction between a promonocyte and an immature ' +
                  'monocyte is not always reproducible, and it decides both the 20% ceiling ' +
                  'and the CMML-1/CMML-2 subgroup.'
                : 'Promonocytes were not separately enumerated in this differential, and the ' +
                  'percentages above should be confirmed to include them; the distinction ' +
                  'between promonocytes and immature monocytes decides both the 20% ceiling ' +
                  'and the CMML-1/CMML-2 subgroup.'));
    }

    /* BCR::ABL1, and the reason it is not enough to have looked at the karyotype:
       the p190 fusion mimics CMML and the cytogenetics may be cryptic. */
    if (f.drivers.bcrAbl !== false) {
        notes.push('Chronic myeloid leukemia with the p190 BCR::ABL1 fusion can mimic CMML ' +
            'hematologically and morphologically. RT-PCR and/or FISH for BCR::ABL1 should be ' +
            'performed alongside conventional karyotyping, because rare fusion variants may ' +
            'be cytogenetically cryptic and lack t(9;22)(q34;q11.2) on G-banding.');
    }

    /* Essential criterion 4, raised where its own footnote raises it. */
    if (f.counts.eosinophilia === true) {
        notes.push('Eosinophilia is present. The criteria for myeloid/lymphoid neoplasms with ' +
            'eosinophilia and tyrosine kinase gene fusions (PDGFRA, PDGFRB, FGFR1, JAK2) should ' +
            'be specifically excluded before this diagnosis is made.');
    }

    /* Desirable criterion 3, which nothing in this app can answer. Its own
       limitation is stated alongside it: the test is not interpretable in the
       autoimmune and inflammatory setting, which is common in this disease. */
    notes.push('Partitioning of the peripheral blood monocyte subsets has not been assessed. ' +
        'An increase in classic CD14+/CD16− monocytes above 94% is a desirable diagnostic ' +
        'criterion and distinguishes CMML from reactive monocytosis, but it is not ' +
        'interpretable in patients with active autoimmune disease or a systemic inflammatory ' +
        'syndrome — present in about 20% of patients with CMML — in whom a reduced ' +
        'slan-positive non-classic subset (<1.7% of monocytes) has been proposed instead.');

    /* The distinction the chapter says is genuinely difficult, raised on the
       finding that makes it difficult. */
    if (dxBandAtLeast(f.fibrosis.grade, 2) === true) {
        notes.push('Moderate to severe reticulin fibrosis is present at diagnosis in only about ' +
            '3% of CMML, and those cases tend to be myeloproliferative with marked monocytosis, ' +
            'splenomegaly and a JAK2 p.V617F mutation. Distinction from primary myelofibrosis ' +
            'and other myeloproliferative neoplasms with monocytosis may be difficult; the ' +
            'megakaryocyte morphology and the JAK2 variant allele fraction are of ' +
            'discriminatory value.');
    }

    /* Prior therapy takes the case to a different category outright. */
    if (f.history.priorTherapy === true) {
        notes.push('A history of cytotoxic chemotherapy and/or radiation therapy is recorded. ' +
            'Such cases are classified according to the criteria for myeloid neoplasms post ' +
            'cytotoxic therapy rather than as CMML.');
    }

    /* The two histories that point in opposite directions. An antecedent MPN
       excludes and is gated; an antecedent MDS explicitly permits reclassification,
       which is worth saying because the reader may expect the opposite. */
    if (f.history.antecedentMyeloid === true) {
        notes.push('A patient who presents with a myelodysplastic neoplasm and subsequently ' +
            'develops the diagnostic criteria for CMML may be reclassified as having CMML.');
    }

    /* THE PROGNOSIS, once there is a genetic result to read it against. Printed
       here rather than scored, for the reason every prognostic finding in this
       engine is: it says what the case means, never how likely the diagnosis is.
       The four genes named are the ones the CMML-specific models actually weight,
       which is why this waits for a molecular result instead of printing the
       median survival on its own. */
    if (f.genetics.anySomatic !== null) {
        notes.push('CMML carries a median overall survival of 2–3 years and a 15–30% risk of ' +
            'transformation to acute myeloid leukemia. The CMML-specific prognostic models ' +
            'weight ASXL1, RUNX1, NRAS and SETBP1 mutations alongside high-risk cytogenetics, ' +
            'the blast percentage, the degree of cytopenia and the extent of the monocytosis; ' +
            'correlation with a validated model is recommended.');
    }

    return notes.join(' ');
}


/* ---- Myelodysplastic/myeloproliferative overlap ---- */
dxRules.push(
    /* ---- Myelodysplastic/myeloproliferative overlap ---------------------- */

    /* CMML IS THE COMMONEST MDS/MPN and is written from its own criteria box; see
       the section above dxRules for the three criteria this app cannot answer and
       what it does instead of guessing at them. */
    {
        id: 'cmml',
        /* Incidence 0.35-0.51 cases per 100 000 person-years across the Düsseldorf,
           Swedish, Netherlands and US registries — roughly half MDS-SF3B1's 0.84
           and several times MDS-5q's 0.1, so it is a common entity in absolute
           terms and much the commonest of the MDS/MPN overlaps.

           INCIDENCE, NOT SHARE OF ITS FAMILY, and the distinction matters here in
           a way it does not inside the MDS block. "45% of MDS" and "45% of MDS/MPN"
           are not comparable quantities, and the candidates this rule competes
           with on a real case are mostly myelodysplastic.

           BUT CASES PER 100 000 IS NOT THE CURRENCY EITHER, WHICH IS WHAT THIS NOTE
           USED TO CLAIM. A general-population incidence and a share-of-family are
           both wrong for the same reason: neither is the share of MARROWS REACHING
           THIS DIFFERENTIAL, which is what a prior in this table means and what
           DX_PRIOR_BAND now states. The currency argument is the one that put CML
           at the top of the band on 1-2 per 100 000, above every myelodysplastic
           neoplasm and above a cytopenia with a clone.

           Read on the right denominator CMML lands at 0. It is uncommon in the
           population and much the commonest of the MDS/MPN overlaps, but it is also
           a diagnosis nobody makes without a marrow, so its share of marrow practice
           is higher than 0.35-0.51 per 100 000 suggests and lower than the
           myelodysplastic neoplasms it is ranked against. */
        prior: 0,
        priorReason: 'CMML incidence is 0.35-0.51 per 100 000 person-years; the commonest ' +
            'MDS/MPN overlap, below the myelodysplastic neoplasms in marrow practice',
        family: 'overlap',
        who: 'Chronic myelomonocytic leukemia (CMML)',
        /* The two classifications NAME the entity identically and both revised it
           in the same direction — the absolute threshold fell to 0.5 × 10⁹/L in
           BOTH, which is the item most often reported as a WHO-only change. So
           there is no second name to print, and `icc: null` means exactly that.
           It does NOT mean the criteria agree: they diverge in four places, which
           is what `divergence` below carries. ICC's own subtyping and subgrouping
           text was not part of what was read, so the subtype and subgroup wording
           in the comment is WHO-HAEM5's and says so. */
        icc: null,
        requires: [
            /* Essential criterion 1. Definitional — it is the entity's subject. */
            ['persistent monocytosis ≥0.5 × 10⁹/L and ≥10% of leucocytes',
                function (f) { return f.counts.monocytosis; }],
            /* Essential criterion 2, and the AML boundary, which is the one kind of
               clause this engine always gates on. Both specimens, since the
               criterion reads "in the peripheral blood and bone marrow". */
            ['blasts <20% in the blood and bone marrow', function (f) {
                return dxNot(dxBlastAtLeast(f, DX_BLAST_AML));
            }],
            /* Essential criterion 3, in the half of it this app can answer.
               BCR::ABL1 makes the case CML in every classification. The rest of
               "not meeting criteria for another MPN" is carried by the exclusions
               below and by the JAK2/CALR/MPL points, per footnote b. */
            dxMpn.noBcrAbl,
            /* The requirement rule over the desirable criteria. Its strength
               depends on the monocyte count — see dxCmmlDesirable(). */
            ['dysplasia and/or a clonal abnormality, as required at this monocyte count',
                dxCmmlDesirable]
        ],
        excludes: [
            /* Footnote b, and it is CATEGORICAL in the box's own words: "a
               documented history of MPN excludes CMML". A myeloproliferative
               neoplasm that evolves to a CMML-like phenotype is progression of
               that disease, not a new entity. */
            ['a documented history of a myeloproliferative neoplasm',
                function (f) { return f.history.antecedentMpn; }],
            /* NPM1-mutated cases "fulfil the diagnostic criteria for AML with NPM1
               mutation" in this edition — 2-5% of CMML, and those with a high
               mutation burden progress rapidly. dxExcludeAmlDefining carries both
               that and the defining karyotypes. */
            dxExcludeAmlDefining
        ],
        /* THE LIKELIHOOD LADDER. Everything below the defining criterion is a
           frequency or a demographic the chapter publishes, never a criterion said
           twice — the two negatives included, which are its own "megakaryocyte
           clustering is not a prominent feature" and its 3% figure for fibrosis at
           diagnosis. Neither disqualifies, because neither is written as a
           criterion. */
        supports: [
            ['sustained monocytosis is the defining feature', 4,
                function (f) { return f.counts.monocytosis; }],
            /* THE MAGNITUDE, WHICH THE +4 ABOVE COLLAPSED. `f.counts.monocytosis` is
               a boolean at 0.5 x10^9/L plus 10%, so it fired identically at 0.51 and
               at 12.0 — and the chapter's own sentence is about the higher number:
               "Although the majority of patients with CMML have absolute monocytosis
               with monocyte counts of >= 1 × 10^9/L". Nothing else in this table
               reaches 1.0 except the p190 CML the chapter names as the mimic. */
            ['absolute monocytes >=1.0 x10^9/L', 2,
                function (f) { return dxAtLeast(f.counts.monocyteAbs, 1.0); }],
            /* "Monocytes in the bone marrow are usually increased and show
               left-shifted maturation", and the increase is what the chapter
               offers for the oligomonocytic band specifically.

               +3, AND IT WAS +2. No other rule in this table scores marrow monocytes
               at all, so the likelihood ratio against the field is near its maximum —
               and the chapter itself nominates this finding as the tie-breaker for
               the band where the criteria are strictest: "Such an increase is helpful
               in cases where the absolute monocytosis count in the peripheral blood
               is >= 0.5 × 10^9/L but < 1.0 × 10^9/L." A finding a chapter names as
               its own discriminator should not be priced like a supporting one. */
            ['marrow monocytes increased', 3, function (f) { return f.marrowMonocytes.increased; }],
            /* "Dysgranulopoiesis is present to varying degrees in CMML and is
               usually more common in MD-CMML... often more prominent in the bone
               marrow than in the peripheral blood." The granulocytic lineage
               specifically, which is why this is not the generic dysplasia clause
               already in the gate. */
            /* +1, not +2: the field this competes in is the eight-rule
               myelodysplastic block, where dysplasia is definitional, and the
               chapter qualifies the finding twice — "is present to varying degrees"
               and "Dysplastic changes may be mild in MP-CMML". It discriminates
               against the MPN and boundary half of the table and not against the
               half it most often competes with. */
            ['dysgranulopoiesis', 1, function (f) { return f.dysplasia.myeloid.atLeast10; }],
            /* "The majority of patients with CMML have a hypercellular bone marrow
               with a myelomonocytic predominance and a relative decrease in
               erythroid precursors" — one sentence, scored in its two halves. */
            ['myeloid predominance', 2, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'myeloid';
            }],
            ['hypercellular for age', 1, function (f) { return f.cellularity.hyperForAge; }],
            /* The mutational landscape, in "as many as 91.8%" of patients. Two
               points and not four: every gene on the list is also mutated in MDS,
               so this says myeloid neoplasm of this family rather than CMML. */
            ['mutations in the CMML landscape', 2, function (f) {
                return f.genetics.cmmlGenes.present;
            }],
            /* "Most patients present with anemia." */
            /* Anemia moved to dxLikelihood.anemia — see the note in MarrowDxMds.js
               where MDS-LB's clause went the same way. */
            /* "Circulating immature myeloid cells (promyelocytes, myelocytes, and
               metamyelocytes) are SIGNIFICANTLY INCREASED in MP-CMML", and separately
               "Immature myeloid cells tend to be present in the peripheral blood in
               patients with MP-CMML." Two sentences, one of them emphatic; raised
               from 1 to 2. A myelodysplastic or boundary film rarely carries
               promyelocytes through metamyelocytes. */
            ['circulating immature granulocytes', 2,
                function (f) { return f.circulatingImmature; }],
            /* "DETECTION OF AUER RODS IS RARE, and such a finding should first prompt
               a thorough molecular genetic evaluation to exclude AML." Scored
               nowhere, though in the field it is MDS-IB2's own promoting criterion
               and an acute leukemia finding. It argues and does not disqualify — the
               chapter is explicit that such cases stay CMML absent something else:
               "In the absence of evidence to support an alternative diagnosis, the
               longstanding recommendation to subgroup such cases as CMML-2 remains
               unchanged." */
            ['Auer rods, which are rare in CMML', -2,
                function (f) { return f.blasts.auerRods; }],
            /* "The majority (~70%) of patients with CMML have a normal karyotype",
               and of the abnormalities that do occur "complex karyotype is less
               common". Against a field where a complex karyotype is >90% of
               MDS-biTP53 and common in MDS-IB2 and AML-MR, that is a real negative.
               −1 rather than −2: the chapter gives no percentage for it. */
            ['complex karyotype, which is less common in CMML', -1,
                function (f) { return f.genetics.complex; }],
            /* "Dysmegakaryopoiesis, characterized by small megakaryocytes and/or
               megakaryocytes with hypolobated or abnormally lobated nuclei, is
               common." Scored at 1, not at the 3 MDS-5q gives the same finding:
               there it is the entity's characteristic morphology, here it is a
               common accompaniment. */
            ['small or hypolobated megakaryocytes', 1,
                function (f) { return f.megakaryocytes.hypolobated; }],
            /* Splenomegaly is the commonest site of extramedullary disease and is
               concentrated in the proliferative subtype. */
            ['palpable splenomegaly', 1, function (f) { return f.clinical.splenomegaly; }],
            /* THE DEMOGRAPHICS, which are what a likelihood ladder is for and what
               the criteria cannot supply: median age at diagnosis 71-76 years, and
               a male predominance of 1.6-2.6:1 across four series. Neither
               discriminates strongly on its own, hence a point each. */
            ['age ≥70 (median at diagnosis 71–76 years)', 1, function (f) {
                return f.age === null ? null : f.age >= 70;
            }],
            ['male (M:F 1.6–2.6:1)', 1, function (f) {
                return f.clinical.sex === null ? null : f.clinical.sex === 'male';
            }],
            /* "An increased number of megakaryocytes may be seen in some cases, but
               megakaryocyte clustering is not a prominent feature." Dense
               clustering is the prefibrotic-PMF pattern and argues for that
               instead. */
            ['dense megakaryocyte clustering (not a feature of CMML)', -2, function (f) {
                return f.megakaryocytes.named.indexOf('megDenseClusters') !== -1 ? true
                    : (f.megakaryocytes.assessed ? false : null);
            }],
            ['reticulin fibrosis MF-2 or MF-3 (~3% of CMML at diagnosis)', -2, function (f) {
                return dxBandAtLeast(f.fibrosis.grade, 2);
            }],
            /* Footnote b: "the presence of MPN features in the bone marrow and/or a
               high burden of MPN-associated mutations (JAK2, CALR, or MPL) tends to
               support MPN with monocytosis rather than CMML". CALR and MPL are the
               two of the three that are NOT on the CMML gene list at all, so their
               presence is the version of this the app can read without a published
               figure for what "high burden" means. JAK2 is on both lists and is
               left to the fibrosis caution rather than scored against the case. */
            ['CALR or MPL mutation, which supports an MPN with monocytosis', -2, function (f) {
                return dxAnyOf([f.drivers.calr, f.drivers.mpl]);
            }]
        ],
        whoFor: dxCmmlName,
        /* The only rule whose divergence is COMPUTED. Everywhere else the two
           classifications differ in a fixed way and the paragraph is a constant;
           here they differ in four independent places, and which of them applies
           is a fact about the case. See dxCmmlDivergence(). */
        diverges: function (f) { return dxCmmlDivergence(f) !== ''; },
        divergence: dxCmmlDivergence,
        /* CLONALITY IS DEFINING ONLY IN THE OLIGOMONOCYTIC BAND, and that is the
           criteria table's own arithmetic rather than a shortcut: at monocytes
           0.5–1.0 x10^9/L footnote a makes BOTH desirable criteria mandatory, so
           there the clone is required and the entity cannot be asserted without
           it; at or above 1.0 one of three suffices and the same finding is
           genuinely only desirable. `dxCmmlDesirable` already splits on the band —
           this reads the same split rather than a second copy of it.

           So the `finding` is `true` (nothing to condition on) wherever clonality
           is not required, which is the honest answer for an entity whose
           definition is count-dependent. This is the one rule in the table whose
           `definedBy` is not a single fixed lesion, and it is the criteria that
           make it so, not the case. */
        definedBy: {
            finding: function (f) {
                if (f.counts.monocytosisNeedsClonality !== true) return true;
                return dxCmmlClonal(f);
            },
            phrase: 'a clonal abnormality',
            study: 'cytogenetic and molecular'
        },
        comment: function (f, ctx) { return dxCmmlComment(f, ctx.mode, ctx.rule); },
        caution: dxCmmlCaution
    },
    {
        id: 'mdsMpnSf3b1T',
        family: 'overlap',
        /* NO PRIOR, AND THAT IS A FINDING RATHER THAN AN OMISSION. The entity's
           own chapter is now pasted (docs/who/mdsmpn-sf3b1t.md, with Box 2.21)
           and gives a median age of 68-75 and a slight female predominance — but
           still no incidence and no share of the family, so there is still no
           number to set a prior from.

           Left at the default 0 rather than guessed. It is the entity most
           enriched by the `expects` work so far, so a fabricated prior on top
           would compound the coverage bias instead of correcting it — see the
           note on dxLikelihoodAudit's coverage count. */
        who: 'MDS/MPN with SF3B1 mutation and thrombocytosis (MDS/MPN-SF3B1-T)',
        icc: 'MDS/MPN with SF3B1 mutation and thrombocytosis',
        /* THE MUTATION IS IN THE ENTITY'S OWN NAME, in both classifications, so
           this name cannot be asserted while the panel is out — the thrombocytosis
           and the anemia are counts and are always available, which is exactly how
           the rule reached `pending` with its defining half unanswered.

           NO VAF FLOOR HERE, deliberately, and it is not an oversight: unlike
           mdsSf3b1 this rule's own `requires` clause reads f.genetics.sf3b1 raw,
           and a definedBy stricter than the gate would put the comment into the
           conditional on a case the engine had already accepted. The pasted
           chapter settled the floors: WHO's Box 2.21 states NONE ("SF3B1
           heterozygous mutation" — the earlier ≥5% claim here was unsourced and
           is gone), ICC's Table 16 asks for VAF > 10%; `divergence` below is
           where that difference is printed. */
        definedBy: {
            finding: function (f) { return f.genetics.sf3b1; },
            phrase: 'an SF3B1 mutation',
            study: 'molecular'
        },
        /* THE MUTATION AND THE PLATELET COUNT STAY HARD; THE ANEMIA DOES NOT.

           SF3B1 and the thrombocytosis are both definitional and both always
           answerable — SF3B1 is half the entity's name, and a platelet count is
           on every CBC, so a false there really is false rather than "nobody
           looked". They also partition: ET excludes SF3B1-with-thrombocytosis and
           this rule is where those cases go, so softening either would offer both
           entities at once on the same marrow. */
        requires: [
            ['SF3B1 mutation', function (f) { return f.genetics.sf3b1; }],
            ['platelets >=450 x10^9/L', function (f) { return f.counts.thrombocytosis; }],
            dxMpn.noBcrAbl
        ],
        /* THE CASE THAT NAMED THE WHOLE DEFECT. Anemia was a `requires`, so
           recording it as ABSENT deleted this candidate outright — an SF3B1
           mutation, a platelet count over 450 and 20% ring sideroblasts, and the
           entity those three findings describe was not on screen, with nothing
           anywhere to say why. It scored 8 and ranked first with anemia present;
           one click and it was gone.

           It is heavily weighted because the anemia genuinely is expected here —
           this is a disease of ineffective erythropoiesis and the chapter pairs it
           with dyserythropoiesis — but "expected" is not "definitional", and the
           difference is the whole distinction the `expects` array exists to draw.
           The candidate now stays in the differential wearing the contradiction. */
        /* +1/-4, not +2/-4: anemia is one of this entity's own criteria and so is
           near-universal in it, which means meeting it separates this candidate
           from very little while failing it separates it from a great deal. The
           first cut paid +2 and the entity promptly led cases where its defining
           mutation had not even been looked for. See the asymmetry note in
           MarrowDxKernel.js's rule-shape block. */
        expects: [
            ['anemia with dyserythropoiesis', 1, -4, function (f) { return f.cytopenia.anemia; }]
        ],
        /* THE SECOND AND THIRD EXCLUSIONS ARE BOX 2.21's OWN "to be excluded"
           list, added when the chapter was pasted: myeloid neoplasms with a
           double-hit TP53 alteration, and t(3;3)/inv(3) (the MECOM
           rearrangement). Therapy-related neoplasms are on the same list and are
           not gated — the history control is off screen and would answer null
           forever, which an exclusion cannot use. */
        excludes: [
            ['del(5q) present', function (f) { return f.genetics.del5q; }],
            ['multi-hit TP53 alteration', function (f) { return f.genetics.tp53MultiHit; }],
            ['t(3;3)/inv(3) MECOM rearrangement', function (f) {
                return f.genetics.abnormalities.indexOf('mecom') !== -1 ? true
                    : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
            }]
        ],
        supports: [
            ['SF3B1 with thrombocytosis is the defining combination', 4, function (f) {
                return dxAllOf([f.genetics.sf3b1, f.counts.thrombocytosis]);
            }],
            /* The co-mutation is the mechanism, not a coincidence: JAK2 drives the
               proliferative half (the thrombocytosis) and SF3B1 the dysplastic half
               (the ring sideroblasts and the anemia). It is present in 50-65% of
               these cases and strongly supports the diagnosis — and it is CRITERIAL
               in WHO's Box 2.21, which asks for JAK2 V617F "or, in the absence of
               JAK2 V617F, mutation in another myeloproliferative gene such as MPL
               or CALR". Scored rather than gated: the box's own substitute path
               (sustained thrombocytosis >= 3 months where molecular testing is
               unavailable) is not recordable here, and ICC does not require the
               co-mutation at all. */
            ['co-mutated JAK2', 3, function (f) { return f.drivers.jak2; }],
            ['co-mutated MPL or CALR, the box\'s alternative to JAK2', 2, function (f) {
                return dxAnyOf([f.drivers.mpl, f.drivers.calr]);
            }],
            ['ring sideroblasts >=15%', 2, function (f) { return dxAtLeast(f.ringSideroblasts.pct, 15); }],
            ['erythroid dysplasia', 2, function (f) { return f.dysplasia.erythroid.atLeast10; }]
        ],
        diverges: function () { return true; },
        /* THE OLD STRING HAD THE RING-SIDEROBLAST DIRECTION BACKWARDS AND A VAF
           FLOOR FROM NOWHERE. It read "WHO-HAEM5 ... admits cases with <15% ring
           sideroblasts, requiring a variant allele fraction of ≥5%; ICC 2022
           requires ≥10%" — but the pasted chapter's essential criteria REQUIRE
           >=15% ring sideroblasts, its box states no VAF floor at all, and it is
           ICC that admits ring-sideroblast-free cases on the mutation. */
        divergence: 'WHO-HAEM5\'s essential criteria require ≥15% ring sideroblasts beside the ' +
            'SF3B1 mutation, and its Box 2.21 asks for a concurrent JAK2, MPL, or CALR ' +
            'mutation; ICC 2022 requires the SF3B1 mutation at a variant allele fraction ' +
            '>10% and does not require ring sideroblasts. The two also part ways on clonal ' +
            'evolution: MDS-SF3B1 that acquires a JAK2, MPL, or CALR mutation with ' +
            'thrombocytosis may be reclassified as this entity by WHO-HAEM5, whereas ICC ' +
            'regards it as thrombocytotic progression of MDS-SF3B1.'
    }

);
