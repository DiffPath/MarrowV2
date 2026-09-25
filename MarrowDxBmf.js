/* ============================================================================
   MarrowDxBmf.js — bone marrow failure: aplastic anemia and the three
   single-lineage aplasias

   Split by family like every other file here; see MarrowDxKernel.js for the
   point ladder, the three-valued contract and what a gate is for. Loads AFTER
   MarrowDxCh.js, which is a real constraint and not a preference: the aplastic
   anemia rule reads `dxExcludeDefinedNeoplasm` at load time, so a later
   boundary file is a ReferenceError.

   ---------------------------------------------------------------------------
   *** NO CRITERIA BOX EXISTS FOR ANY OF THESE, AND THAT IS NOT AN OMISSION IN
   docs/who/. ***

   Every other family in this table encodes a classification. This one cannot:
   neither WHO-HAEM5 nor ICC 2022 classifies acquired aplastic anemia, pure red
   cell aplasia, acquired amegakaryocytic thrombocytopenia or agranulocytosis —
   they are not neoplasms, and both documents are classifications of neoplasia.
   So there is no box to paste and no box to read a rule against, and the usual
   remedy in this repo (paste the chapter, correct the rule, clear the flag)
   does not apply. What these rules encode is the general hematology
   literature: Camitta's severity criteria for aplastic anemia, which are the
   ones every guideline still uses, and the standard marrow descriptions of the
   three single-lineage aplasias.

   TREAT THEM ACCORDINGLY. The repo's record is ten pasted sources correcting
   ten rules written from memory, nine of them in the SHAPE of the rule rather
   than in a threshold. Nothing has corrected these, and nothing is going to.
   The mitigation used instead is to gate only on what a marrow can actually
   show and to put everything else in the caution, which is MarrowDxPcn.js's
   approach for the same reason (its serum studies) and is the honest one:
   these are all clinical diagnoses of exclusion, and the app is holding a
   slide.

   ---------------------------------------------------------------------------
   WHAT THE MARROW CAN AND CANNOT SAY HERE

   Can:  cellularity for age, which lineages are present and in what proportion
         (f.lineages, MarrowFindings.js), the blood counts, dysplasia, blasts,
         fibrosis and the genetics.
   Cannot: the reticulocyte count — it is not in cbcComponents and so cannot be
         parsed out of a paste at all. That is the single most load-bearing
         absence in this file. Reticulocytopenia is definitional for pure red
         cell aplasia and is one of Camitta's three limbs for severity, so both
         are stated in the caution and neither is gated. Also unrecorded: the
         PNH clone by flow cytometry, T-cell clonality, parvovirus B19 serology
         or PCR, thymoma on imaging, the drug and toxin history, and the
         chromosome-breakage and telomere-length studies that answer the
         inherited syndromes. Each is named at the rule that needs it.

   ---------------------------------------------------------------------------
   ONE PASTED SOURCE DOES SPEAK TO APLASTIC ANEMIA, AND IT IS WORTH MORE THAN
   ITS LENGTH SUGGESTS: docs/who/mds-h-and-mds-ib.md

   Hypoplastic MDS's chapter describes aplastic anemia from the other side,
   because AA is what hMDS has to be told apart from. Everything WHO-HAEM5 says
   about this family it says there, and five sentences of it are load-bearing
   here. Each is quoted at the clause it produced rather than paraphrased:

     "The main differential diagnosis is with aplastic anaemia, which typically
      shows a marked decrease in megakaryocytes and haemoglobin F–containing
      erythroblasts."                                    -> the +3 support
     "Aplastic anaemia may be associated with dyserythropoietic changes … hence,
      morphological support for a diagnosis of hMDS requires identification of
      dysplastic features in myeloid and/or megakaryocytic lineages."
                                                         -> dxBmfExcludeDysplasia
     "Patients [with hMDS] are usually younger than those with other MDS types
      but older than those with aplastic anaemia."        -> the age weight
     "When cellularity is extremely low, it may be virtually impossible to
      distinguish hMDS from aplastic anaemia by cytomorphology."
                                                         -> the caution
     "When PIGA mutation is demonstrated in the absence of bona fide features of
      MDS, classification as paroxysmal nocturnal haemoglobinuria is preferred."
                                                         -> the PNH caution

   AND ONE SENTENCE THAT TOOK A CLAUSE AWAY. A relative marrow lymphocytosis was
   written as a +1 support — an emptied marrow over-represents what survives it,
   which is true — and the same chapter says hMDS too "may show an accompanying
   large granular lymphocyte expansion" in blood and marrow. A finding both
   sides of a differential show cannot rank one above the other, whatever it
   does for the reader's impression, so the clause is gone. It is still worth
   saying on the pure red cell aplasia rule, where what it points at is a cause
   (T-LGL) rather than a diagnosis, and it says it in the caution.

   THE DIFFERENTIAL THAT MATTERS IS THEREFORE ALREADY IN THE TABLE. Aplastic
   anemia against `mdsH` (MarrowDxMds.js) is the call this family exists to put
   in front of a reader, and the two rules partition on the criterion the hMDS
   box itself partitions them on. Nothing needed to change on the mdsH side: its
   essential criterion "hypocellular bone marrow … not explained by
   non-neoplastic bone marrow failure conditions" is operationalised by the same
   dysplasia gate it already carries (dxGate.myeloidOrMegDysplasia), which is
   how its own chapter operationalises it.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Shared helpers
-------------------------------------------------------------------------- */

/* AT LEAST N CYTOPENIAS, three-valued and counting the unknowns as still
   available. `f.cytopenia.count` cannot answer this: it counts the positives
   among the lineages that have an answer, so one cytopenia with a second
   lineage unmeasured reads as 1 and would fail a "two or more" gate on a case
   nobody has finished measuring. Here a case that could still reach n is null. */
function dxBmfCytopenias(f, n) {
    const all = [f.cytopenia.anemia, f.cytopenia.neutropenia, f.cytopenia.thrombocytopenia];
    const yes = all.filter(function (v) { return v === true; }).length;
    const unknown = all.filter(function (v) { return v === null; }).length;
    if (yes >= n) return true;
    if (yes + unknown < n) return false;
    return null;
}

/* THE CRITERION THAT SEPARATES THIS FAMILY FROM HYPOPLASTIC MDS, and it names
   two lineages rather than three for the reason the file header gives: the hMDS
   box excludes erythroid dysplasia from carrying that diagnosis precisely
   because aplastic anemia shows it. Kleene's OR, so one unassessed lineage
   cannot take a dysplastic other one away.

   An `excludes` rather than a `requires`, so an unanswered marrow leaves the
   candidate `incomplete` with the criterion named instead of failing it. */
const dxBmfExcludeDysplasia = ['granulocytic or megakaryocytic dysplasia is present, which is ' +
    'the criterion separating this from hypoplastic MDS', function (f) {
        return dxAnyOf([f.dysplasia.myeloid.atLeast10, f.dysplasia.megakaryocytic.atLeast10]);
    }];

/* MF-2/MF-3 IS NOT MARROW FAILURE, it is a marrow being replaced, and the
   differential it opens (primary myelofibrosis, a fibrotic MDS, metastatic
   disease) is a different question from an empty one.

   COLLAPSED TO A BOOLEAN with `=== true`, which is dxExcludeSubthresholdClone's
   trick and is load-bearing for the same reason: a reticulin stain is not
   performed on most of these marrows, so a three-valued clause would push every
   candidate in this family to `incomplete` awaiting a stain nobody ordered. */
const dxBmfExcludeFibrosis = ['reticulin fibrosis of MF-2 or MF-3 has been demonstrated',
    function (f) { return dxBandAtLeast(f.fibrosis.grade, 2) === true; }];

/* A DEMONSTRATED CLONAL LESION, for the three SINGLE-LINEAGE rules — and
   collapsed to a boolean where aplastic anemia's is not. The asymmetry is
   deliberate and is about what the study would settle.

   For aplastic anemia the karyotype is half the diagnosis: hypoplastic MDS is
   the thing it has to be separated from, and a case with cytogenetics
   outstanding genuinely IS unresolved, so that rule keeps the three-valued
   dxExcludeDefinedNeoplasm and sits at `pending` with the study named. An
   isolated erythroid aplasia is not waiting on the same question — a normal
   karyotype would not make it any more a pure red cell aplasia — so here only a
   DEMONSTRATED lesion may act, and silence stays silence. Without the collapse
   all three would read as awaiting studies nobody ordered, which is
   dxExcludeSubthresholdClone's argument applied one file over. */
const dxBmfExcludeClonal = ['a genetic abnormality defining a myeloid neoplasm has been ' +
    'demonstrated', function (f) {
        return dxAnyOf([f.genetics.amlDefining.present, f.genetics.npm1, f.genetics.del5q,
            f.genetics.tp53MultiHit, f.drivers.bcrAbl]) === true;
    }];

/* Every rule in this family ends here. These are diagnoses of exclusion in the
   strict sense — the marrow shows an absence, and what caused the absence is a
   clinical question — so no comment may close without saying so. */
const DX_BMF_CORRELATE = 'Correlation with the clinical history, including drugs, toxins and ' +
    'infection, is recommended.';


/* CAMITTA'S SEVERITY CRITERIA, and the limb this app cannot read.

       Severe:       marrow cellularity < 25%, with at least TWO of
                       neutrophils   < 0.5 ×10⁹/L
                       platelets     < 20 ×10⁹/L
                       reticulocytes < 20 ×10⁹/L (or < 1% corrected)
       Very severe:  the same, with neutrophils < 0.2 ×10⁹/L
       Non-severe:   everything else.

   THE RETICULOCYTE LIMB IS UNRECORDED, so it is carried as a permanent `null`
   and the count is done the way dxBmfCytopenias does it — which turns out to
   answer three different cases correctly where a "how many can I see" test
   answered one:

       ANC 0.3, platelets 12   two met, so two of three whatever the third is
                               -> SEVERE, and the reticulocyte adds nothing
       ANC 0.3, platelets 30   one met and one unknown limb left
                               -> UNKNOWN, and the reticulocyte would decide it
       ANC 0.7, platelets 30   neither met, and one limb cannot make two
                               -> NOT SEVERE, definitively, with no third count

   The first version of this returned "not assigned" for all three, so a marrow
   whose counts settled the question printed a note asking for a test that could
   not have changed the answer.

   THE CELLULARITY LIMB IS PART OF THE CRITERION and is ANDed in — severity is
   "cellularity < 25% plus two of three", not two of three alone. Where no
   percentage was typed, a MARKEDLY hypocellular chip answers it: that is the
   pathologist's own statement of the same fact, and reading the chip in place
   of a number nobody entered is what cellularity.hypoForAge already does one
   file over. A mildly hypocellular chip does not answer it and leaves it null. */
function dxBmfSeverity(f) {
    const anc = f.counts.anc;
    const plt = f.counts.plt;
    const limbs = [
        anc === null ? null : anc < 0.5,
        plt === null ? null : plt < 20,
        null                                 // the reticulocyte count: never recorded
    ];
    const yes = limbs.filter(function (v) { return v === true; }).length;
    const unknown = limbs.filter(function (v) { return v === null; }).length;
    const twoOfThree = yes >= 2 ? true : (yes + unknown < 2 ? false : null);

    const hypo = f.cellularity.pct !== null ? f.cellularity.pct < 25
        : (f.cellularity.quality === 'hypocellular' && f.cellularity.severity === 'markedly'
            ? true : null);

    const met = [];
    if (limbs[0] === true) met.push(`neutrophils ${anc} ×10⁹/L`);
    if (limbs[1] === true) met.push(`platelets ${plt} ×10⁹/L`);

    const state = dxAllOf([twoOfThree, hypo]);
    return {
        state: state,
        grade: state !== true ? null : (anc !== null && anc < 0.2 ? 'very severe' : 'severe'),
        met: met,
        /* The one case where naming the missing test is worth a sentence: a
           single limb met, so the reticulocyte count is the deciding one. */
        reticWouldDecide: twoOfThree === null && yes >= 1
    };
}

/* THE NEGATIVES, AND ONLY THE ESTABLISHED ONES — dxBlandMarrowText's rule
   (MarrowDxCh.js), which this family needs more than any other in the table.
   Every entity here is diagnosed by what is NOT in the marrow, so a comment
   that recited absences nobody had looked for would be the diagnosis itself
   fabricated. Each of the four rules first stated its preserved lineages
   outright, from the rule's own criteria; each now prints only what the case
   answered, and drops the clause otherwise.

   `names` is which lineages this rule wants to say are preserved — never all
   three, since the one the entity is about is the one that is gone. */
const DX_BMF_LINEAGE_NOUN = {
    erythroid: 'erythroid precursors',
    granulocytic: 'granulocytic maturation',
    megakaryocytic: 'megakaryocytes'
};

function dxBmfNegativeText(f, names) {
    const preserved = (names || []).filter(function (name) {
        return dxNot(name === 'megakaryocytic'
            ? f.lineages.megakaryocytic.decreased
            : f.lineages[name].reduced) === true;
    }).map(function (name) { return DX_BMF_LINEAGE_NOUN[name]; });

    const clauses = [];
    if (preserved.length) {
        clauses.push(`${addCommas(preserved)} ${preserved.length > 1 ? 'are' : 'is'} preserved`);
    }
    if (dxAnyOf([f.dysplasia.myeloid.atLeast10, f.dysplasia.megakaryocytic.atLeast10]) === false) {
        clauses.push('there is no granulocytic or megakaryocytic dysplasia');
    }
    if (dxBelow(f.blasts.marrow, 5) === true) clauses.push('blasts are not increased');
    if (dxBandAtLeast(f.fibrosis.grade, 2) === false) clauses.push('reticulin is not increased');

    if (!clauses.length) return '';
    const joined = addCommas(clauses);
    return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}

/* "No morphologic evidence of a myeloid neoplasm" is a conclusion and may only
   be drawn once the two findings it rests on have actually been made. */
function dxBmfNoNeoplasmText(f) {
    const bland = dxAnyOf([f.dysplasia.myeloid.atLeast10,
        f.dysplasia.megakaryocytic.atLeast10]) === false && dxBelow(f.blasts.marrow, 5) === true;
    return bland ? 'There is no morphologic evidence of a myeloid neoplasm.' : '';
}

/* The cytopenias this case actually has, named. dxCytopeniasNamed (MarrowDxCh.js)
   does the same job for the boundary comments and is reused rather than
   reimplemented; this wrapper exists only to put a count with it, because
   "pancytopenia" is a word the reader expects when all three are present and
   "anemia, neutropenia and thrombocytopenia" is the sentence when they are not. */
function dxBmfCytopeniaPhrase(f) {
    const named = dxCytopeniasNamed(f);
    if (!named.length) return '';
    return named.length === 3 ? 'pancytopenia' : addCommas(named);
}


dxRules.push(
    /* ---- Aplastic anemia ------------------------------------------------- */
    {
        id: 'aplasticAnemia',
        family: 'bmf',
        who: 'Aplastic anemia',
        icc: null,
        /* ON THE TABLE'S ONE DENOMINATOR — this entity's share of the marrows
           that reach this differential, never its population incidence. That
           incidence is 2-3 per million per year, which on the population scale
           is the bottom of the band; but the marrows this rule competes for are
           the hypocellular pancytopenic ones, where it is one of only three or
           four answers available. −1 is the compromise the band's own
           instruction produces: place the FAMILY first (uncommon), then rank
           within it (this is much the commonest member of it). */
        prior: -1,
        priorReason: 'uncommon overall, and much the commonest of the marrow failure states',
        requires: [
            /* ALWAYS ANSWERED, which is what qualifies it as a gate: a core is
               reported with a cellularity or it is not reported. The chip
               answers it where no percentage was typed — see
               cellularity.hypoForAge in MarrowFindings.js. */
            ['a hypocellular marrow for age', function (f) { return f.cellularity.hypoForAge; }],
            /* TWO, NOT THREE. Pancytopenia is the classic presentation and is
               scored below, but the diagnosis does not require the third
               lineage to have fallen yet, and a two-lineage case is exactly the
               one a reader needs the candidate named on. */
            ['at least two cytopenias', function (f) { return dxBmfCytopenias(f, 2); }],
            dxGate.lowBlasts
        ],
        excludes: [
            dxBmfExcludeDysplasia,
            dxBmfExcludeFibrosis,
            /* A DEMONSTRATED CLONAL LESION ENDS THIS DIAGNOSIS, and unlike the
               fibrosis clause this one is deliberately left three-valued. The
               aplastic anemia / hypoplastic MDS distinction genuinely turns on
               the karyotype, so a case with cytogenetics outstanding SHOULD sit
               at `pending` with the study named — that is the true state of it,
               and the comment says so rather than asserting a diagnosis the
               study could overturn. */
            dxExcludeDefinedNeoplasm
        ],
        expects: [
            /* All three lineages, which is what the entity is: a marrow that
               has stopped rather than one lineage that has. Against is small
               because two-lineage disease is common enough to be the gate. */
            ['pancytopenia', 2, -1, function (f) { return dxBmfCytopenias(f, 3); }]
        ],
        supports: [
            /* Camitta's cellularity limb, which is a tighter number than the
               gate's "hypocellular for age" and is therefore worth a point of
               its own. The ABSOLUTE field only (cellularity.pct), for the reason
               stated at it: the midpoint of a typed range is not a measurement. */
            ['marrow cellularity below 25%', 2, function (f) {
                return dxBelow(f.cellularity.pct, 25);
            }],
            /* THE ONE MORPHOLOGIC FINDING WHO-HAEM5 NAMES FOR THIS ENTITY, and
               it names it in exactly the comparison that matters: "The main
               differential diagnosis is with aplastic anaemia, which typically
               shows a marked decrease in megakaryocytes and haemoglobin
               F–containing erythroblasts" (hMDS chapter, Differential
               diagnosis). Typical in the entity and discriminating against the
               competitor it is quoted from, which is what a +3 is for. The
               haemoglobin F erythroblasts have no stain entry and no finding;
               they are not scored and not claimed. */
            ['megakaryocytes markedly reduced', 3, function (f) {
                return f.lineages.megakaryocytic.markedlyDecreased;
            }],
            ['erythroid and granulocytic precursors both reduced', 2, function (f) {
                return dxAllOf([f.lineages.erythroid.reduced, f.lineages.granulocytic.reduced]);
            }],
            /* "Patients [with hMDS] are usually younger than those with other MDS
               types but OLDER than those with aplastic anaemia" — a direction and
               no number, so the threshold is this file's and is said to be. 40 is
               chosen as the age below which an MDS of any type is uncommon, and
               it is deliberately the same number the inherited-syndrome caution
               fires at rather than a second, differently-derived age. Compare
               mdsH's own 'younger than the usual age for MDS' at 60: the two
               rungs are in the order their chapter puts the entities in. */
            ['younger than the usual age for a hypoplastic MDS', 1, function (f) {
                return dxBelow(f.age, 40);
            }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            const severity = dxBmfSeverity(f);
            const cytopenias = dxBmfCytopeniaPhrase(f);

            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            } else {
                parts.push('The marrow is hypocellular for age' +
                    (f.cellularity.pct !== null ? ` (${dxPct(f.cellularity.pct)}%)` : '') + '.');
            }

            if (cytopenias) {
                parts.push(`The blood shows ${cytopenias}.`);
            }

            /* No lineage is named as preserved here: in this entity all three
               are down, which is what separates it from the other three rules. */
            parts.push(dxBmfNegativeText(f, []));
            parts.push(dxBmfNoNeoplasmText(f));

            /* The boundary family's register, and for its reason: this is not a
               classification and not a morphologic diagnosis — it is what the
               findings are, once somebody else has excluded the causes. The
               conditional clause is doing real work and is not hedging. */
            parts.push('With other causes of marrow hypoplasia excluded, the findings are ' +
                'consistent with aplastic anemia.');

            if (severity.state === true) {
                parts.push(`The counts (${addCommas(severity.met)}) meet the criteria for ` +
                    `${severity.grade} aplastic anemia.`);
            } else if (severity.state === false) {
                parts.push('The counts do not meet the criteria for severe aplastic anemia.');
            }
            parts.push(DX_BMF_CORRELATE);
            return parts.filter(Boolean).join(' ');
        },
        /* FOUR THINGS THIS APP CANNOT SEE AND ONE IT CAN, and every one of them
           changes what happens to the patient. Stated rather than guessed at,
           which is this repo's rule wherever a criterion is out of reach. */
        caution: function (f) {
            const notes = [];

            /* THE MISSING TEST, NAMED ONLY WHERE IT WOULD CHANGE SOMETHING: the
               comment has already assigned a severity or said the counts do not
               reach one; this fires on the middle case alone. */
            const severity = dxBmfSeverity(f);
            if (severity.state === null) {
                notes.push(severity.reticWouldDecide
                    ? 'Severity grading requires the reticulocyte count.'
                    : 'Severity grading requires the neutrophil, platelet and reticulocyte counts.');
            }

            /* PNH: the flow cytometric clone is not recorded by this app, so this
               can only ever be a recommendation. */
            notes.push('Flow cytometry for a PNH clone is recommended.');

            /* Inherited marrow failure presents in adulthood more often than its
               reputation suggests, telomere biology disorders in particular. */
            if (f.age !== null && f.age < 40) {
                notes.push('An inherited marrow failure syndrome should be excluded, including ' +
                    'chromosome breakage and telomere length testing.');
            }
            return notes.join(' ');
        },
        /* The pathologist's half: the competitor and how it is separated, the
           adequacy question, and what the app does not know. */
        check: function (f) {
            const notes = ['Hypoplastic MDS is separated by granulocytic or megakaryocytic ' +
                'dysplasia and by cytogenetics; dyserythropoiesis occurs in aplastic anemia and ' +
                'does not distinguish them. FISH for MDS abnormalities helps if the karyotype fails.'];
            if (f.cellularity.severity === 'markedly') {
                notes.push('At this cellularity the two may be indistinguishable, and the aspirate ' +
                    'may be too sparse to assess dysplasia.');
            }
            if (f.age === null) {
                notes.push('No age is recorded: exclude an inherited marrow failure syndrome in a ' +
                    'younger patient.');
            }
            notes.push('Confirm the core is adequate; a short, crushed or subcortical core ' +
                'underestimates cellularity.');
            return notes.join(' ');
        }
    },

    /* ---- Pure red cell aplasia -------------------------------------------- */
    {
        id: 'prca',
        family: 'bmf',
        who: 'Pure red cell aplasia',
        icc: null,
        prior: -2,
        priorReason: 'rare, and reached only by a marrow whose erythroid line is absent with the other two intact',
        requires: [
            /* ALWAYS ANSWERED (a CBC), and the subject of the entity. */
            ['anemia', function (f) { return f.cytopenia.anemia; }],
            /* THE ENTITY ITSELF. `absent` is the counted erythroid share below
               1% where a differential exists, and a markedly-decreased chip
               where it does not — see findingLineageQuantity. A gate because
               nothing else in this table is compatible with it: an erythroid
               line that is simply reduced is not this diagnosis, and the rule
               would otherwise collect every anemic marrow with a raised M:E. */
            ['erythroid precursors absent or markedly reduced', function (f) {
                return f.lineages.erythroid.absent;
            }],
            dxGate.lowBlasts
        ],
        excludes: [
            /* PURE, which is the first word of the name. A neutropenia or a
               thrombocytopenia beside it makes this a two-lineage failure, and
               the candidate for that is aplastic anemia. */
            ['another cytopenia is present, so the aplasia is not confined to the erythroid line',
                function (f) { return dxAnyOf([f.cytopenia.neutropenia, f.cytopenia.thrombocytopenia]); }],
            dxBmfExcludeDysplasia,
            dxBmfExcludeFibrosis,
            dxBmfExcludeClonal
        ],
        expects: [
            /* THE OTHER HALF OF "PURE", asked of the marrow rather than of the
               blood. A large `against`: an aplasia that has taken the
               granulocytic or megakaryocytic line with it is not this entity,
               and the marrow says so before the counts do. */
            ['granulocytic and megakaryocytic lines preserved', 2, -3, function (f) {
                return dxNot(dxAnyOf([f.lineages.granulocytic.reduced,
                    f.lineages.megakaryocytic.decreased]));
            }],
            /* Normocytic normochromic is the described anemia. Macrocytosis is
               not an exclusion — it points at MDS and at the deficiency mimics,
               which is what the small negative says. */
            ['a normocytic anemia', 1, -1, function (f) {
                return dxNot(dxAnyOf([f.counts.macrocytic, f.counts.microcytic]));
            }]
        ],
        supports: [
            /* THE DEFINING FINDING, SCORED THOUGH IT ALSO GATES — the same
               correction the megakaryocytic rule below needed, and this rule was
               the harder version of it. It carried two clauses that both needed a
               COUNTED differential ("erythroid precursors below 1%" and "a
               markedly elevated M:E ratio"), so on the ordinary path — chips, no
               500-cell count — the entity's whole finding scored zero and MDS-LB
               outranked it on an unassessed marrow. Clicking "markedly decreased
               erythroids" moved nothing.

               ONE CLAUSE, NOT THREE. The two it replaces were the same
               observation arriving by two arithmetic routes: an erythroid share
               below 1% IS a markedly raised M:E, so a counted case was paid
               twice for one finding — the "same finding scored twice in one rule"
               deviation that dxMergeEvidence cannot catch, because it dedupes
               local against registry and not local against local. `absent` reads
               the count where there is one and the chip where there is not, which
               is what the clause was trying to say all along. The ratio is still
               printed in the comment, where it informs without scoring. */
            ['erythroid precursors absent or markedly reduced', 4, function (f) {
                return f.lineages.erythroid.absent;
            }],
            ['a normocellular marrow', 1, function (f) {
                return f.cellularity.quality === 'normocellular' ? true : null;
            }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }

            parts.push('Erythroid precursors are markedly reduced' +
                (f.lineages.erythroid.pct !== null ? ` (${dxPct(f.lineages.erythroid.pct)}%` +
                    (f.lineages.meRatio !== null ? `; M:E ratio ${f.lineages.meRatio}:1)` : ')')
                    : (f.lineages.meRatio !== null ? ` (M:E ratio ${f.lineages.meRatio}:1)` : '')) +
                '.');
            parts.push(dxBmfNegativeText(f, ['granulocytic', 'megakaryocytic']));
            parts.push('The findings are consistent with pure red cell aplasia, pending ' +
                'correlation with the reticulocyte count.');
            return parts.filter(Boolean).join(' ');
        },
        /* THE CAUSES, WHICH ARE THE WHOLE OF THE WORKUP AND NONE OF WHICH THIS
           APP RECORDS. This caution is longer than most in the table on purpose:
           the diagnosis is a pattern, and a pattern with an unstated cause list
           is a dead end for whoever reads the report. */
        caution: function (f) {
            /* THE CAUSES ARE THE WHOLE OF THE WORKUP, and none is recorded here.
               A marrow lymphocytosis beside an erythroid aplasia is the T-LGL
               presentation, the one cause the app can point at. */
            const lgl = f.lineages.lymphocytes.increased === true
                ? 'flow cytometry and TCR gene rearrangement studies for the increased lymphocytes'
                : 'flow cytometry and TCR gene rearrangement studies for T-cell large granular ' +
                  'lymphocytic leukemia';
            const notes = [`Evaluation for an underlying cause is recommended, including parvovirus ` +
                `B19 PCR, imaging for thymoma, ${lgl}, and cytogenetics to exclude MDS; drugs and ` +
                `autoimmune disease should also be considered.`];
            if (f.age !== null && f.age < 5) {
                notes.push('In a young child, Diamond-Blackfan anemia and transient ' +
                    'erythroblastopenia of childhood should be considered.');
            }
            return notes.join(' ');
        },
        check: function () {
            return 'Look for giant proerythroblasts with intranuclear inclusions (parvovirus). ' +
                'Reticulocytopenia is required and is not recorded here.';
        }
    },

    /* ---- Acquired amegakaryocytic thrombocytopenia ------------------------ */
    {
        id: 'amegakaryocytic',
        family: 'bmf',
        who: 'Acquired amegakaryocytic thrombocytopenia',
        icc: null,
        prior: -3,
        priorReason: 'vanishingly rare, and the least often reached member of this family',
        requires: [
            ['thrombocytopenia', function (f) { return f.cytopenia.thrombocytopenia; }],
            ['megakaryocytes absent or markedly reduced', function (f) {
                return f.lineages.megakaryocytic.absent;
            }],
            dxGate.lowBlasts
        ],
        excludes: [
            ['another cytopenia is present, so the failure is not confined to the ' +
                'megakaryocytic line',
                function (f) { return dxAnyOf([f.cytopenia.anemia, f.cytopenia.neutropenia]); }],
            dxBmfExcludeDysplasia,
            dxBmfExcludeFibrosis,
            dxBmfExcludeClonal
        ],
        expects: [
            ['erythroid and granulocytic lines preserved', 2, -3, function (f) {
                return dxNot(dxAnyOf([f.lineages.erythroid.reduced,
                    f.lineages.granulocytic.reduced]));
            }]
        ],
        supports: [
            /* THE DEFINING FINDING, SCORED THOUGH IT ALSO GATES — and the first
               run of this family is what showed it has to be. Without it the
               rule scored 0 on its own worked example and ranked FIFTH, below
               idiopathic cytopenia of undetermined significance, on a marrow
               whose cytopenia the morphology plainly explains. The kernel's
               rule says why: a gate decides eligibility and a weight decides
               rank among the eligible, and ICUS — the candidate this loses to
               — is not gated on megakaryocytes at all. +4 is the tier for a
               defining criterion another entity can also show, which is
               exactly right here: aplastic anemia shows it too, and is kept
               out by the cytopenia count rather than by this. */
            ['megakaryocytes markedly reduced', 4, function (f) {
                return f.lineages.megakaryocytic.absent;
            }],
            ['a normocellular marrow', 1, function (f) {
                return f.cellularity.quality === 'normocellular' ? true : null;
            }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            parts.push('Megakaryocytes are markedly reduced to absent.');
            parts.push(dxBmfNegativeText(f, ['erythroid', 'granulocytic']));
            parts.push('With isolated thrombocytopenia, the findings are consistent with acquired ' +
                'amegakaryocytic thrombocytopenia.');
            return parts.filter(Boolean).join(' ');
        },
        /* THE POINT OF THE ENTITY IS THAT IT IS NOT ITP, and a report that does
           not say so will be read as one anyway — immune thrombocytopenia is
           several orders of magnitude commoner and is the working diagnosis of
           nearly every patient who reaches this marrow. */
        caution: function (f) {
            const notes = ['The absent megakaryocytes argue against immune thrombocytopenia.'];
            notes.push('MDS, drug effect, T-cell large granular lymphocytic leukemia and evolving ' +
                'aplastic anemia should be excluded; cytogenetic and molecular studies are ' +
                'recommended.');
            if (f.age !== null && f.age < 5) {
                notes.push('In an infant, congenital amegakaryocytic thrombocytopenia (MPL) and ' +
                    'thrombocytopenia with absent radii should be considered.');
            }
            return notes.join(' ');
        }
    },

    /* ---- Agranulocytosis --------------------------------------------------- */
    {
        id: 'agranulocytosis',
        family: 'bmf',
        who: 'Agranulocytosis',
        icc: null,
        prior: -2,
        priorReason: 'uncommon, and usually drug-induced rather than primary',
        requires: [
            ['neutropenia', function (f) { return f.cytopenia.neutropenia; }],
            /* THE MARROW HALF, AS TWO ROUTES. The classical description is
               either an absent granulocytic series or one arrested at the
               promyelocyte — the second of which looks like a PRESERVED early
               series with nothing beyond it, so a rule that asked only for
               reduction would miss the commoner picture. Kleene's OR: the left
               shift is true-or-null (nothing asserts full maturation), so it can
               only ever rescue the criterion, never fail it. */
            ['granulocytic precursors markedly reduced, or maturation arrested', function (f) {
                return dxAnyOf([f.lineages.granulocytic.absent,
                    f.lineages.granulocytic.markedlyDecreased,
                    f.lineages.granulocytic.leftShift]);
            }],
            dxGate.lowBlasts
        ],
        excludes: [
            ['another cytopenia is present, so the failure is not confined to the ' +
                'granulocytic line',
                function (f) { return dxAnyOf([f.cytopenia.anemia, f.cytopenia.thrombocytopenia]); }],
            dxBmfExcludeDysplasia,
            dxBmfExcludeFibrosis,
            dxBmfExcludeClonal
        ],
        expects: [
            ['erythroid and megakaryocytic lines preserved', 2, -3, function (f) {
                return dxNot(dxAnyOf([f.lineages.erythroid.reduced,
                    f.lineages.megakaryocytic.decreased]));
            }],
            /* The count that makes the word mean what it says. Agranulocytosis
               is conventionally an ANC below 0.5, where the cytopenia gate above
               is satisfied at 1.8 — so this is the difference between a
               neutropenia and this entity, and it carries a real weight. */
            ['neutrophils below 0.5 ×10⁹/L', 3, -3, function (f) {
                return dxBelow(f.counts.anc, 0.5);
            }]
        ],
        supports: [
            /* The same argument as the megakaryocytic rule's, on this rule's own
               defining finding: the marrow half gates, and the candidate it
               competes with on an isolated neutropenia is not gated on anything
               about the granulocytic series. The two routes score the same —
               an arrested series and an absent one are one finding seen at two
               points, and a marrow shows one or the other, never both. */
            ['granulocytic maturation arrested at an early stage', 3, function (f) {
                return f.lineages.granulocytic.leftShift;
            }],
            ['granulocytic precursors markedly reduced', 3, function (f) {
                return dxAnyOf([f.lineages.granulocytic.absent,
                    f.lineages.granulocytic.markedlyDecreased]);
            }],
            ['a normocellular marrow', 1, function (f) {
                return f.cellularity.quality === 'normocellular' ? true : null;
            }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            parts.push(f.lineages.granulocytic.leftShift === true
                ? 'Granulocytic maturation is arrested, with preserved early forms and few or no ' +
                  'maturing neutrophils.'
                : 'Granulocytic precursors are markedly reduced.');
            parts.push(dxBmfNegativeText(f, ['erythroid', 'megakaryocytic']));
            parts.push('With isolated severe neutropenia, the findings are consistent with ' +
                'agranulocytosis.');
            return parts.filter(Boolean).join(' ');
        },
        caution: function (f) {
            const notes = ['Review of the medication history (antithyroid drugs, clozapine, ' +
                'sulfonamides, antiepileptics, chemotherapy) is recommended.'];
            if (f.lineages.granulocytic.leftShift === true) {
                notes.push('If the promyelocytes are atypical or hypergranular, PML::RARA testing ' +
                    'is recommended to exclude acute promyelocytic leukemia.');
            }
            return notes.join(' ');
        },
        check: function () {
            return 'Also consider T-cell large granular lymphocytic leukemia, autoimmune ' +
                'neutropenia, benign ethnic neutropenia and MDS.';
        }
    }
);
