/* ============================================================================
   MarrowDxCh.js — the boundary rules (CHIP, CCUS, ICUS, no neoplasm)

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. Loads last of the five family files.
   ========================================================================= */

/* ----------------------------------------------------------------------------
   Clonal hematopoiesis — the prose shared by the boundary rules

   CHIP and CCUS are ONE FINDING SEEN FROM TWO SIDES: a clone with no morphologic
   evidence of a myeloid neoplasm, and a blood count that is either intact (CHIP)
   or not (CCUS). Everything the comment says ABOUT THE CLONE is therefore the same
   in both, and only the classification line and what to do next differ — so the
   clone sentence, the risk sentence and the VEXAS note are written once here
   rather than twice in two rules free to drift apart.

   Source: WHO-HAEM5, Clonal hematopoiesis (the CH/CHIP chapter), including its
   Table 2.02 driver-gene list — transcribed whole in MarrowFindings.js. Unlike
   the MDS and MPN rules above, THIS FAMILY WAS READ FROM THE CHAPTER TEXT: the
   essential criteria, the driver genes and their qualifying regions, the
   0.5–1%/year progression rate, the higher-risk genes, the clone-size and
   multiple-gene risk factors, the cardiovascular association and the VEXAS
   findings are all its own.
-------------------------------------------------------------------------- */

/* The clone, as a reader would write it: every variant with the change and the
   allele fraction as the laboratory reported them. Long lists stay long — a
   comment that summarised four variants as "four mutations" would drop the one
   thing the reader needs to check the classification against. */
function dxChCloneText(f) {
    const variants = f.genetics.variants;
    if (!variants.length) return '';
    return addCommas(variants.map(function (v) {
        return v.gene + (v.variant ? ' ' + v.variant : '') +
            (v.vaf ? ` (VAF ${v.vaf}%)` : '');
    }));
}

/* THE CHAPTER'S WAIVER CLAUSE, which is the reason a region mismatch is not a
   negative anywhere in this file: "cases with mutations in CH driver genes outside
   the regions specified in the table may qualify for a diagnosis of CHIP if the
   mutations are predicted to be deleterious and not rare, non-pathogenic
   variants."

   That is a question for whoever reads the molecular report, not one the app can
   settle from a gene symbol and a change string — so the comment asks it and hands
   it back. Silence would be the alternative, and silence here reads as though the
   variant had met a criterion it did not. */
function dxChRegionText(f) {
    const d = f.genetics.chDrivers;
    const parts = [];
    if (d.outside.length) {
        parts.push(`The reported ${d.outside.length > 1 ? 'changes' : 'change'} in ` +
            `${addCommas(d.outside)} ${d.outside.length > 1 ? 'lie' : 'lies'} outside the ` +
            `regions specified for ${d.outside.length > 1 ? 'those genes' : 'that gene'}; such ` +
            `mutations may still qualify if predicted to be deleterious rather than rare, ` +
            `non-pathogenic variants.`);
    }
    if (d.unlisted.length) {
        parts.push(`${addCommas(d.unlisted)} ${d.unlisted.length > 1 ? 'are' : 'is'} not among ` +
            `the listed clonal hematopoiesis driver genes.`);
    }
    return parts.join(' ');
}

/* WHAT MOVES THE RISK OF PROGRESSION, general statement first and then this case's
   own features — in that order, because the general figure is what makes the
   case-specific clause mean anything.

   The three risk factors are stated whether or not the case has them; the
   `raised` clause is added only for the ones it actually does. A comment that
   listed the risk factors and then said nothing about which applied would leave
   the reader to do the matching, and one that named only the case's own would read
   as though the others did not exist.

   CLONE SIZE IS NAMED AS A RISK FACTOR AND NEVER ASSERTED FOR THIS CASE, and that
   asymmetry is deliberate. "A large clone portends an increased risk" is the
   chapter's own sentence; what size counts as large it does not say, and the two
   cutoffs in circulation (VAF >=10% from the founding cohort studies, VAF >=20% in
   the later risk scores) come from outside it. The allele fraction is already
   printed in the sentence before this one, so a reader can weigh it — which is
   better than the app inventing the threshold and then hiding it inside a
   judgement. The other two factors are categorical and need no cutoff. */
/* THE GENE LIST IS THE CALLER'S, because the two chapters publish two lists and
   this function is called by both comments. It printed the CHIP list on the CCUS
   comment until the CCUS chapter was pasted — a report-facing sentence naming the
   wrong genes for the entity it was written under.

     CHIP  TP53, U2AF1, SRSF2, IDH2, IDH1, SF3B1, ASXL1
     CCUS  TP53, PPM1D, JAK2, RUNX1, SF3B1, SRSF2, U2AF1, IDH2, IDH1

   `which` is 'chip' or 'ccus'. The additional CCUS risk factors are its own too:
   the CCUS chapter adds the number and severity of the cytopenias, particularly
   after cytotoxic therapy, and singles out isolated DNMT3A as low risk. */
function dxChRiskText(f, which) {
    const ccus = which === 'ccus';
    const readout = ccus ? f.genetics.ccusHighRisk : f.genetics.chHighRisk;
    const genes = ccus
        ? 'TP53, PPM1D, JAK2, RUNX1, SF3B1, SRSF2, U2AF1, IDH2 and IDH1'
        : 'TP53, U2AF1, SRSF2, IDH2, IDH1, SF3B1 and ASXL1';

    const raised = [];
    if (f.genetics.somaticGenes.length > 1) raised.push('more than one mutated gene');
    if (readout.present === true) {
        raised.push(`a mutation involving ${addCommas(readout.genes)}`);
    }

    const general = `The risk of progression is greater for a large clone, for more than one ` +
        `mutated gene, and for mutations in ${genes}.`;
    /* The CCUS chapter's own extra sentence, and it is worth saying: an isolated
       DNMT3A clone is the commonest CCUS there is, and the chapter reports it at
       low risk. Only printed when that is actually the case on the bench. */
    const solitaryDnmt3a = f.genetics.somaticGenes.length === 1 &&
        f.genetics.somaticGenes[0] === 'DNMT3A';
    const tail = ccus && solitaryDnmt3a
        ? ' An isolated DNMT3A mutation appears to confer a low risk of progression.'
        : '';

    if (!raised.length) return general + tail;
    return general + ` The present case carries ${addCommas(raised)}.` + tail;
}

/* BOTH OF THESE ARE DIAGNOSES OF EXCLUSION, so an outstanding study is not a
   footnote on them — it is the thing that could take the case out of the category
   altogether. A del(5q) arriving on a cytopenic marrow with no dysplasia is
   MDS-5q, not CCUS. Empty when nothing is awaited; the callers filter. */
function dxChPendingText(f) {
    const waiting = dxPendingStudies(f);
    if (!waiting.length) return '';
    return `The ${addCommas(waiting)} studies are outstanding; an addendum will follow if they ` +
        `alter the classification.`;
}

/* VEXAS, and the one gene symbol in this app that changes what the comment is
   about rather than what it is called. Every reported case carries a somatic UBA1
   mutation, so a UBA1 variant beside an otherwise unremarkable or cytopenic marrow
   is worth saying out loud — the marrow findings (vacuolated precursors, a
   hypercellular marrow usually without dysplasia) are ones the pathologist can go
   back to the slide for, and the clinical syndrome is one nobody will find unless
   somebody asks.

   Fires on a RECORDED UBA1 variant only. There is no reverse test: this app does
   not record cytoplasmic vacuolation, so a marrow cannot suggest the sequencing. */
function dxVexasNote(f) {
    if (f.genetics.uba1 !== true) return '';
    return 'A somatic UBA1 mutation is present. UBA1 is mutated in all reported cases of VEXAS ' +
        'syndrome, a progressive systemic autoinflammatory disorder of adults involving the ' +
        'skin, lungs, blood vessels, joints and cartilage, frequently with cytopenias. ' +
        'Cytoplasmic vacuolation of myeloid and erythroid precursors is its characteristic ' +
        'marrow finding, the marrow is usually hypercellular and usually without dysplasia, ' +
        'and progression to a myelodysplastic neoplasm is common — a marrow meeting the ' +
        'criteria for MDS should be diagnosed as such. Re-examination of the aspirate for ' +
        'vacuolated precursors and correlation with the clinical features of the syndrome are ' +
        'recommended.';
}

/* "Absence of features diagnostic for defined myeloid neoplasms" — the essential
   criterion CHIP and CCUS share, as far as this app can answer it. The
   AML-defining lesions and the two lesions that define a myelodysplastic neoplasm
   on genetics alone; the morphologic half of the same criterion is already carried
   by the dysplasia and blast gates on each rule.

   Null propagates, which is the point: with the karyotype outstanding this is
   unknown rather than absent, and an unknown exclusion is what keeps the candidate
   `pending` instead of letting it read as confirmed.

   BCR::ABL1 IS ON THE LIST AND WAS NOT, which the noNeoplasm regression below
   turned up. A BCR::ABL1-positive case with a co-mutation in a driver gene met
   every criterion CHIP and CCUS state — the fusion is not a somatic variant in
   the NGS sense and nothing else here looked at it — so clonal hematopoiesis was
   offered on a marrow that is chronic myeloid leukemia by definition. It is the
   single clearest "feature diagnostic for a defined myeloid neoplasm" there is. */
const dxExcludeDefinedNeoplasm = ['a genetic abnormality defining a myeloid neoplasm is present',
    function (f) {
        return dxAnyOf([f.genetics.amlDefining.present, f.genetics.npm1,
            f.genetics.del5q, f.genetics.tp53MultiHit, f.drivers.bcrAbl]);
    }];

/* Sub-threshold clones are excluded; UNMEASURED ones are not. `chClone` is
   tri-valued, and only its `false` — every reported fraction below the bar — is a
   finding this clause may act on, so the test is against `false` explicitly and
   the clause itself never returns null.

   Written this way round on purpose. As a `requires` clause the criterion would be
   unknown whenever the VAF column was left blank, which is most cases, and every
   CHIP comment would then be written as though it were awaiting a study that had
   already resulted. The chapter's threshold does real work where the number exists
   and says nothing where it does not. */
const dxExcludeSubthresholdClone = ['the clone is below the diagnostic threshold ' +
    '(VAF <2%, or <4% for an X-linked gene in a male)',
    function (f) { return f.genetics.chClone === false; }];


/* WHICH CYTOPENIAS, NAMED, for the no-neoplasm comment. That rule no longer
   excludes a cytopenic case, so its comment has to account for one: a report that
   says "no morphologic evidence of a myeloid neoplasm" and never mentions the
   anemia the marrow was taken for reads as though the count had not been looked at.
   Only `true` is named — an unassessed lineage is not a normal one. */
function dxCytopeniasNamed(f) {
    const named = [];
    if (f.cytopenia.anemia === true) named.push('anemia');
    if (f.cytopenia.neutropenia === true) named.push('neutropenia');
    if (f.cytopenia.thrombocytopenia === true) named.push('thrombocytopenia');
    return named;
}

/* THE NEGATIVE FINDINGS, AND ONLY THE ONES ACTUALLY ESTABLISHED. "Blasts are not
   increased" is a claim about a count, so it may not be printed off the back of a
   gate that is merely unknown — the same rule dxFindingReported enforces for a
   positive result, applied to a negative one. An uncounted marrow simply drops the
   clause; the candidate is `incomplete` in that case anyway and the Scoring view
   says which criterion is outstanding. */
function dxBlandMarrowText(f) {
    const observed = [];
    if (dxNot(f.dysplasia.any) === true) {
        observed.push('dysplasia does not meet the diagnostic threshold in any assessed lineage');
    }
    if (dxBelow(f.blasts.marrow, 5) === true) observed.push('blasts are not increased');
    if (!observed.length) return '';
    const joined = addCommas(observed);
    return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}


/* ----------------------------------------------------------------------------
   The clone is the whole of these two entities, and it has to be demonstrated

   CHIP AND CCUS ARE DEFINED BY A MOLECULAR RESULT AND BY NOTHING ELSE. Every
   other criterion either rule carries is a negative — no cytopenia (or, for CCUS,
   one that any cause could produce), no dysplasia, no excess blasts, no defining
   lesion — so a marrow with the panel outstanding SATISFIES all of them, and the
   candidate reaches `pending` on morphology that cannot in principle point at a
   clone. The comment then wrote "A somatic mutation is present in a clonal
   hematopoiesis driver gene" out of the rule's own criteria rather than out of
   the case: a fabricated result, on the one finding the entity consists of.

   ICUS DELIBERATELY DECLARES NOTHING HERE. Its defining finding is the ABSENCE of
   a clone, which no study can be awaited for in the same sense, and its comment
   already branches on `anySomatic === false` and says "Clonality has not been
   assessed" otherwise — the mirror of this and the model for it.

   Each rule declares its own `definedBy` inline below and its comment reads that
   declaration back through `ctx.rule`, so there is exactly one copy of the
   finding and the comment cannot drift from the gate.
------------------------------------------------------------------------------ */

/* ---- Boundaries ---- */
dxRules.push(
    /* ---- Boundaries ------------------------------------------------------ */
    /* THE THREE OF THEM ARE ONE DECISION TREE, and reading them apart is how they
       drift: a clone with intact counts is CHIP, the same clone with an
       unexplained cytopenia is CCUS, and the same cytopenia with no clone found is
       ICUS. The cytopenia gates separate the first from the second and the somatic
       mutation separates the second from the third, so the three sets are disjoint
       by construction and the engine can never offer two of them at once.

       `noNeoplasm` IS NOT THE FOURTH LEAF OF THAT TREE, and it used to be built as
       though it were — gated on "no cytopenia" so the four rules would partition
       the space. That is a category error and it produced the complaint that broke
       it: a marrow with anemia and nothing else ruled out "no morphologic evidence
       of a myeloid neoplasm" BECAUSE THE PATIENT WAS ANEMIC. A cytopenia is a blood
       count, not a morphologic finding; it cannot create evidence of a neoplasm in
       a marrow that shows none. The rule now says only what its name says, and it
       overlaps ICUS and CCUS deliberately — see the note on it below. */
    {
        id: 'chip',
        family: 'boundary',
        /* The boundary family sits at the top of DX_PRIOR_BAND: of the marrows sent
           to answer "is this a myeloid neoplasm?", more turn out not to be than to
           be. CHIP is the one member that needs a positive molecular result AND an
           intact blood count, so it is the least often reached of the four and sits
           a tier below its siblings rather than with them. */
        prior: 0,
        priorReason: 'a boundary outcome, but the only one needing both a clone and intact counts',
        who: 'Clonal hematopoiesis of indeterminate potential (CHIP)',
        /* Both classifications use the term unchanged, so naming ICC here would
           imply a divergence that is not there — the same rule the AML table
           follows. */
        icc: null,
        /* The clone IS the entity — see the block above. */
        definedBy: {
            finding: function (f) { return f.genetics.chDrivers.present; },
            phrase: 'a somatic mutation in a clonal hematopoiesis driver gene',
            study: 'molecular'
        },
        /* THE ESSENTIAL CRITERIA, in the chapter's own three parts: a somatic
           mutation in a CH driver gene; no unexplained cytopenia; and no features
           diagnostic of a defined myeloid neoplasm. The last is split across the
           dysplasia and blast gates here and the genetic exclusion below.

           THE GATE IS GENE MEMBERSHIP, NOT THE QUALIFYING REGION, and that is the
           chapter's own division rather than a convenience: a mutation outside the
           specified region "may still qualify if predicted to be deleterious", so
           the region can never close the criterion. It scores instead, and the
           comment puts the waiver question back to the reader. A mutation in no
           listed gene at all IS a real negative — that is what the table is for. */
        requires: [
            ['a mutation in a clonal hematopoiesis driver gene (WHO-HAEM5 Table 2.02)',
                function (f) { return f.genetics.chDrivers.present; }],
            ['no unexplained cytopenia', function (f) { return dxNot(f.cytopenia.any); }],
            ['no dysplasia meeting threshold', function (f) { return dxNot(f.dysplasia.any); }],
            dxGate.lowBlasts
        ],
        excludes: [dxExcludeDefinedNeoplasm, dxExcludeSubthresholdClone],
        supports: [
            /* THE LABEL USED TO RECITE THE GATES AND THE POINTS USED TO PAY FOR THEM.
               It read "a clonal marker with intact counts and no morphologic evidence
               of a neoplasm" at +4 — three findings named, one tested, and the other
               two are hard gates on this rule that are equally hard gates on CCUS and
               ICUS. Label laundering, and the reason the absence audit never saw it:
               the predicate is positive, so only a reader comparing it against its
               own text would notice. Relabelled to what it actually tests, and
               repriced against the field, where a Table 2.02 driver mutation is at
               least as frequent in MDS, CMML and AML as it is here. */
            ['a mutation in a clonal hematopoiesis driver gene', 2,
                function (f) { return f.genetics.chDrivers.present; }],
            /* CLONE SIZE AT OR ABOVE THRESHOLD SCORES NOTHING, and dropping it from
               +2 is the same argument. Every MDS, CMML and AML clone clears 2% as
               well, so the finding has a likelihood ratio of about one; the chapter's
               only statement about the threshold is what happens BELOW it —
               "Mutations involving CH driver genes with a very low VAF (< 2%) may be
               highly prevalent by middle age … but such clones have not been
               demonstrated to have pathological consequences" — and that direction is
               already carried categorically by dxExcludeSubthresholdClone. */
            /* The half of the criterion the gate deliberately does not enforce. A
               change that lands in the gene's specified region is the textbook
               case and outranks one that needs the deleteriousness waiver. Reduced
               to +1: the specified regions are what make a variant a driver
               anywhere, so an in-region DNMT3A is equally in-region in a
               myelodysplastic neoplasm. */
            ['the change meets the criteria specified for the gene', 1,
                function (f) { return f.genetics.chDrivers.qualifying.length > 0; }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            const clone = dxChCloneText(f);

            if (ctx.mode === 'addendum') {
                parts.push('The previously reported findings have been reviewed in conjunction ' +
                    'with the now-available molecular studies.');
            } else {
                parts.push('The marrow shows no morphologic evidence of a myeloid neoplasm and ' +
                    'the blood counts are not cytopenic.');
            }

            /* THE FINDING, ONLY WHERE THERE IS ONE. Printed from the case, never
               from the criterion: a driver-gene mutation is reported when the
               value is `true`, and an outstanding panel drops this sentence
               altogether rather than writing the result it is waiting for. */
            if (dxFindingReported(f.genetics.chDrivers.present)) {
                parts.push(clone
                    ? `A somatic mutation is present in a clonal hematopoiesis driver gene: ${clone}.`
                    : 'A somatic mutation is present in a clonal hematopoiesis driver gene.');
            }
            parts.push(dxChRegionText(f));

            /* THE BOUNDARY FAMILY'S OWN VERB, which is why the kernel's
               dxClassificationSentence is not called here. It carries two
               registers, classify and diagnostic, and neither is what these three
               rules have always said: CHIP is not a classification and not a
               diagnosis, it is what the findings ARE. Only the mood moves — the
               prefix is the kernel's, unaltered, and the flat sentence is the one
               that was already here. */
            const prefix = dxConfirmationPrefix(ctx.rule, f);
            parts.push(prefix
                ? prefix + 'and in the absence of unexplained cytopenia and of features ' +
                  'diagnostic of a defined myeloid neoplasm, the findings would be those of ' +
                  'clonal hematopoiesis of indeterminate potential (CHIP).'
                : 'In the absence of unexplained cytopenia and of features diagnostic of a ' +
                  'defined myeloid neoplasm, the findings are those of clonal hematopoiesis of ' +
                  'indeterminate potential (CHIP).');

            /* THE SENTENCE THIS COMMENT EXISTS FOR. CHIP is read by clinicians as a
               pre-leukemic result, and the chapter's own framing is the opposite:
               a precursor state, distinct from a neoplasm, with a predominantly
               benign natural history. Naming the rate is what makes that concrete. */
            parts.push('CHIP is a precursor state rather than a hematological neoplasm and has ' +
                'a predominantly benign natural history, progressing to an overt myeloid ' +
                'neoplasm in approximately 0.5–1% of cases per year.');
            parts.push(dxChRiskText(f, 'chip'));
            parts.push('An increased risk of all-cause mortality has also been reported, ' +
                'attributed principally to atherosclerotic cardiovascular disease.');
            parts.push(dxChPendingText(f));
            parts.push('Correlation with the clinical findings and periodic monitoring of the ' +
                'blood counts are recommended.');
            return parts.filter(Boolean).join(' ');
        },
        caution: dxVexasNote
    },
    {
        id: 'ccus',
        family: 'boundary',
        who: 'Clonal cytopenia of undetermined significance (CCUS)',
        icc: null,
        /* A CYTOPENIA WITH A CLONE AND NO DYSPLASIA IS ONE OF THE COMMONEST THINGS
           A MARROW SENT FOR "RULE OUT MDS" ACTUALLY IS, and this rule scored a prior
           of zero while chronic myeloid leukemia scored +2. The word is in the
           entity's name: cytopenia is the presenting problem in most of the marrows
           this table is consulted about, and only a minority of those marrows are
           myelodysplastic. */
        prior: 1,
        priorReason: 'a clonal cytopenia without dysplasia is among the commonest outcomes of a ' +
            'marrow evaluated for unexplained cytopenia',
        /* The clone IS the entity — see the block above. The cytopenia is what
           separates this from CHIP and is available from the count; the clone is
           what separates it from ICUS and is not. */
        definedBy: {
            finding: function (f) { return f.genetics.anySomatic; },
            phrase: 'a somatic mutation',
            study: 'molecular'
        },
        requires: [
            dxGate.cytopenia,
            ['no dysplasia meeting threshold', function (f) { return dxNot(f.dysplasia.any); }],
            ['a somatic mutation is present', function (f) { return f.genetics.anySomatic; }],
            dxGate.lowBlasts
        ],
        excludes: [dxExcludeDefinedNeoplasm, dxExcludeSubthresholdClone],
        /* THE CLONE MOVED TO THE REGISTRY, as dxLikelihood.anySomatic. It was
           `['clonal marker without morphologic dysplasia', 3, …]` — the same label
           laundering CHIP's clause carried, since the predicate tests only the clone
           and "without morphologic dysplasia" is a gate — and the same finding was
           written two other ways on the two sibling rules, one of them paying for an
           absence. One entry now states all four boundary weights together.

           No `supports` array remains: everything this rule scores is either a gate
           or a per-input weight, which for a category defined by one molecular
           finding and three absences is the honest shape. */
        comment: function (f, ctx) {
            const parts = [];
            const clone = dxChCloneText(f);

            if (ctx.mode === 'addendum') {
                parts.push('The previously reported findings have been reviewed in conjunction ' +
                    'with the now-available molecular studies.');
            } else {
                const morphology = dxMorphologySentence(f);
                if (morphology) parts.push(morphology);
            }

            parts.push('Dysplasia does not meet the diagnostic threshold in any assessed lineage ' +
                'and blasts are not increased, so the findings do not meet the criteria for a ' +
                'myelodysplastic neoplasm.');
            /* The same gate CHIP's clone sentence carries, on this rule's own
               finding: reported means `true`, and an unsequenced case says
               nothing here. */
            if (dxFindingReported(f.genetics.anySomatic)) {
                parts.push(clone
                    ? `A somatic mutation is present (${clone}).`
                    : 'A somatic mutation is present.');
            }
            /* THE DRIVER TABLE IS NOT A GATE ON THIS RULE, and the asymmetry with
               CHIP is deliberate. Table 2.02 is the published essential criterion
               for CHIP; the criteria for a clonal cytopenia are their own chapter,
               which this app has not read, and clonality can be demonstrated by
               findings the table does not cover at all. Being stricter than the
               source is worse than being general — so the table informs the
               sentence and never closes the category. */
            parts.push(dxChRegionText(f));

            /* THE CLAUSE THAT HAD TO MOVE WITH THE MOOD, and the reason this is
               not the same edit as CHIP's. "With an unexplained cytopenia and a
               demonstrated clone" recites the clone as a fact, so it cannot stand
               in front of a conditional that exists precisely because the clone is
               not demonstrated — it would read as though the prefix were listing a
               second, separate requirement. The cytopenia is the half that IS in
               hand, so it is the half the conditional keeps. */
            const prefix = dxConfirmationPrefix(ctx.rule, f);
            parts.push(prefix
                ? prefix + 'and with an unexplained cytopenia, the findings would be those of ' +
                  'clonal cytopenia of undetermined significance (CCUS).'
                : 'With an unexplained cytopenia and a demonstrated clone, the findings are ' +
                  'those of clonal cytopenia of undetermined significance (CCUS).');

            /* WHY THIS IS NOT CHIP, said explicitly. The two terms are used
               interchangeably in requests and in clinical notes, and the cytopenia
               is the whole of the difference: the essential criteria for CHIP
               require that unexplained cytopenia be ABSENT. */
            parts.push('The distinction from clonal hematopoiesis of indeterminate potential is ' +
                'the cytopenia — the essential criteria for CHIP require that unexplained ' +
                'cytopenia be absent — and other causes of the cytopenia should be excluded ' +
                'before the finding is attributed to the clone.');
            parts.push(dxChRiskText(f, 'ccus'));
            parts.push(dxChPendingText(f));
            parts.push('Continued observation with repeat evaluation if the blood counts change ' +
                'is recommended.');
            return parts.filter(Boolean).join(' ');
        },
        caution: dxVexasNote
    },
    {
        id: 'icus',
        family: 'boundary',
        who: 'Idiopathic cytopenia of undetermined significance (ICUS)',
        icc: null,
        /* The same argument as CCUS's, on the other side of the sequencing result —
           and the commoner side, since most unexplained cytopenias that get a marrow
           never turn up a clone. */
        prior: 1,
        priorReason: 'an unexplained cytopenia with no clone and no dysplasia is among the ' +
            'commonest outcomes of a marrow evaluated for unexplained cytopenia',
        requires: [
            dxGate.cytopenia,
            ['no dysplasia meeting threshold', function (f) { return dxNot(f.dysplasia.any); }],
            ['no somatic mutation identified', function (f) { return dxNot(f.genetics.anySomatic); }],
            dxGate.lowBlasts
        ],
        /* THE SIBLINGS CARRIED THIS AND ICUS DID NOT, which showed up as an
           idiopathic cytopenia offered on a BCR::ABL1-positive marrow: the fusion
           is not a somatic variant in the NGS sense, so the "no somatic mutation"
           gate never saw it. A cytopenia is not idiopathic when a lesion defining a
           myeloid neoplasm is in hand — the same criterion CHIP and CCUS state, and
           there is no reason this branch of the same decision tree should be the
           one that omits it. */
        excludes: [dxExcludeDefinedNeoplasm],
        /* THE LABEL AND THE PREDICATE DID NOT MATCH, and the repair introduced a
           second defect that the extended audit then caught.

           It was `['cytopenia without dysplasia or a clonal marker', 2, …]` testing
           the dysplasia alone — so it scored identically on a case nobody had
           sequenced and on one sequenced and negative, which is the entire
           difference between this entity and CCUS. Rewriting it as "clonality
           assessed and no somatic mutation identified" at +3 fixed the predicate and
           broke the polarity: an absence paying a positive, in a `supports` clause,
           in the exact week the doctrine against that was written down.

           It is now dxLikelihood.anySomatic's `against` limb, which is where an
           absence belongs. NOT an `expects` clause: a false `expects` pushes the rule
           into the `contested` bucket, and a resulted-negative panel is the finding
           this category is MADE of rather than evidence against it. */
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push('The previously reported findings have been reviewed in conjunction ' +
                    'with the now-available studies.');
            } else {
                const morphology = dxMorphologySentence(f);
                if (morphology) parts.push(morphology);
            }

            parts.push('Dysplasia does not meet the diagnostic threshold in any assessed lineage ' +
                'and blasts are not increased, so the findings do not meet the criteria for a ' +
                'myelodysplastic neoplasm.');

            /* THE HONEST ANSWER DEPENDS ON WHETHER ANYONE SEQUENCED. ICUS and CCUS
               are separated by one thing only, and it is not a morphologic one: the
               diagnosis of a clonal cytopenia is predicated on the detection of a
               somatic mutation, and the chapter says in terms that flow cytometric
               and immunohistochemical surrogates are not recommended for it. So an
               unsequenced cytopenia is not ICUS — it is a cytopenia nobody has
               tested for clonality, and the comment must say which of the two it
               is looking at. */
            if (f.genetics.anySomatic === false) {
                parts.push('No somatic mutation has been identified, and the findings are those ' +
                    'of idiopathic cytopenia of undetermined significance (ICUS).');
            } else {
                parts.push('Clonality has not been assessed. The distinction from clonal ' +
                    'cytopenia of undetermined significance rests on sequencing — the diagnosis ' +
                    'of a clonal cytopenia is predicated on the detection of a somatic mutation, ' +
                    'and flow cytometric or immunohistochemical surrogates are not recommended ' +
                    'for this purpose — so the findings are provisionally those of idiopathic ' +
                    'cytopenia of undetermined significance (ICUS).');
            }
            parts.push('Other causes of the cytopenia should be excluded, and repeat evaluation ' +
                'is recommended if the blood counts change.');
            return parts.join(' ');
        }
    },
    {
        id: 'noNeoplasm',
        family: 'boundary',
        who: 'No morphologic evidence of a myeloid neoplasm',
        icc: null,
        /* THE COMMONEST THING A MARROW IS. A specimen sent to answer "is this a
           myeloid neoplasm?" more often is not one than is one, and this rule
           scored nothing for that while the myeloproliferative rules scored the top
           of the band on general-population incidences. */
        prior: 2,
        priorReason: 'most marrows evaluated for a suspected myeloid neoplasm are not one',
        /* *** THE CYTOPENIA GATE IS GONE, AND ITS REMOVAL IS THE POINT OF THIS RULE. ***

           It read `['no cytopenia', f => dxNot(f.cytopenia.any)]`, so recording
           anemia EXCLUDED "no morphologic evidence of a myeloid neoplasm" — the card
           said "Ruled out by no cytopenia" on a marrow whose only finding was that
           the patient was anemic. That is precisely backwards. A cytopenia is the
           REASON the marrow was taken; a bland marrow is the ANSWER; and an
           unexplained cytopenia with no morphologic, immunophenotypic or molecular
           abnormality is the single situation this statement exists for.

           The gate was there to keep the four boundary rules a partition (see the
           decision-tree note at the top of this push). They are not a partition and
           should never have been made one. The other three name a CLINICAL entity —
           each asserts something about the blood count and about clonality that a
           pathologist cannot fully establish from a slide. This one makes a
           MORPHOLOGIC statement and nothing more, so it is legitimately available
           underneath all three, and on a cytopenic bland marrow it is expected to
           rank beside ICUS rather than instead of it. Two candidates that say
           compatible things is not a defect; the earlier silence was.

           What still keeps it honest is what always did: the dysplasia and blast
           gates below. A dysplastic marrow cannot reach this rule, whatever the
           blood count says. */
        requires: [
            ['no dysplasia meeting threshold', function (f) { return dxNot(f.dysplasia.any); }],
            dxGate.lowBlasts
        ],
        /* *** BOTH POSITIVE CLAUSES ARE GONE, AND THEY WERE THE AUDIT'S OWN BLIND
           SPOT. *** They read `['all assessed lineages unremarkable', 3, …]` and
           `['no excess blasts', 2, …]` — two absences paying five points between
           them, in `supports`, while dxLikelihoodAudit() was checking `expects`
           only. The audit now reads both arrays, which is what surfaced them.

           They are zero rather than smaller, and the reason is the polycythemia-vera
           precedent rather than the general absence rule: EVERY rule that a
           dysplastic or blast-rich marrow could go to is already excluded by that
           marrow, and every rule this one competes with when the marrow is bland —
           CHIP, CCUS, ICUS — requires the same two absences itself. The gates have
           answered in the direction the weight would push, and there is no live
           candidate left for it to argue against. A gate does not silence a weight
           when the competitors are gated differently; here they are gated the same,
           which is the case where it does.

           What ranks this rule is therefore its prior, which is as it should be for
           the floor of a differential: it leads when nothing else fits and yields the
           moment anything does. */
        supports: [
            /* A CLONE DOES NOT UNMAKE THIS STATEMENT — the absence of morphologic
               features of a myeloid neoplasm is precisely what CHIP requires — but
               it does make it the wrong headline. Now dxLikelihood.anySomatic's
               `noNeoplasm` weight, stated beside CCUS's and ICUS's rather than three
               rules away from them.

               A weight rather than an exclusion, deliberately: gating this on the
               somatic mutation would make every unsequenced reactive marrow — which
               is most of them — read as awaiting a study nobody ordered. */
            /* A MYELOPROLIFERATIVE DRIVER IS NOT A MORPHOLOGIC FINDING AND STILL
               ENDS THIS STATEMENT. JAK2, CALR and MPL are not on the exclusion below
               because a driver mutation with intact counts and a bland marrow is a
               real clonal-hematopoiesis presentation — JAK2 is in Table 2.02 — so the
               case belongs to CHIP rather than nowhere.

               −2, NOT −4, BECAUSE IT STACKS AND I THOUGHT IT DID NOT. The clause was
               written at −4 on the reasoning that the clone weight "did not cover a
               driver recorded on the Ancillary tab rather than in the NGS paste".
               That is false: `f.drivers.anyDriver` is built by findingGene() over
               ngsVariants(), the same paste `anySomatic` reads, so the two always
               fire together and one finding was costing −6. Only BCR::ABL1 comes off
               the Ancillary tab, and it is in the `excludes` below. −2 on top of the
               clone's −2 is the intended −4 for a canonical driver, said once. */
            ['a myeloproliferative driver mutation is present', -2,
                function (f) { return f.drivers.anyDriver; }]
        ],
        /* *** THE HOLE THAT REMOVING THE CYTOPENIA GATE OPENED, AND IT IS WORTH
           KNOWING ABOUT BEFORE THE NEXT GATE COMES OFF ANYTHING. ***

           With the cytopenia gate gone and this rule's prior raised to the top of
           the band, a BCR::ABL1-POSITIVE MARROW RANKED "no morphologic evidence of a
           myeloid neoplasm" ABOVE CHRONIC MYELOID LEUKEMIA, 7 to 4 — because the
           only genetic finding this rule ever penalised was `anySomatic`, and a
           fusion is not a somatic variant in the NGS paste. The old gate had been
           hiding it: CML is usually anemic, so the cytopenia excluded the rule
           before the arithmetic could go wrong. A gate removed for a good reason can
           still be load-bearing for a bad one.

           These lesions ARE a myeloid neoplasm, with no morphology required, so the
           precedence is categorical and belongs in a gate rather than in points.
           The rule's name stays true — the marrow really does show no morphologic
           evidence — but it is not the headline, and CHIP is the rule that exists
           for saying "a clone, and a marrow that looks normal".

           IT COLLAPSES TO A BOOLEAN WITH `=== true`, WHICH IS THE WHOLE TRICK. As a
           three-valued clause an unanswered karyotype would return null, and an
           `excludes` null pushes the candidate to `incomplete` — so every unsequenced
           reactive marrow, which is most of them, would read as awaiting a study
           nobody ordered. That is the same objection that keeps the clone a support
           rather than a gate, and dxExcludeSubthresholdClone answers it the same
           way: only a demonstrated finding may act here, and silence is silence. */
        excludes: [
            ['a genetic abnormality defining a myeloid neoplasm has been demonstrated',
                function (f) {
                    return dxAnyOf([f.genetics.amlDefining.present, f.genetics.npm1,
                        f.genetics.del5q, f.genetics.tp53MultiHit, f.drivers.bcrAbl]) === true;
                }]
        ],
        /* THE COMMENT THIS RULE NEVER HAD. It fell through to the generic
           dxComment, which builds "The findings are best classified as no
           morphologic evidence of a myeloid neoplasm" — a sentence that classifies
           a case as an absence, and which said nothing whatever about the blood
           count. That was tolerable only while the rule was gated on there being no
           cytopenia to say anything about.

           The register is the boundary family's, for the reason CHIP's comment
           gives: this is not a classification and not a diagnosis, it is what the
           findings ARE. */
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push('The previously reported findings have been reviewed in conjunction ' +
                    'with the now-available studies.');
            } else {
                const morphology = dxMorphologySentence(f);
                if (morphology) parts.push(morphology);
            }

            parts.push(dxBlandMarrowText(f));
            parts.push('The marrow shows no morphologic evidence of a myeloid neoplasm.');

            /* THE CYTOPENIA IS THE QUESTION THE MARROW WAS ASKED, so a bland marrow
               has to answer it explicitly rather than by omission. "Not explained by
               the marrow findings" is the honest form: the morphology excludes a
               myeloid neoplasm as the cause and says nothing about any other. */
            const cytopenias = dxCytopeniasNamed(f);
            if (cytopenias.length) {
                parts.push(`The ${addCommas(cytopenias)} ` +
                    `${cytopenias.length > 1 ? 'are' : 'is'} not explained by the marrow findings. ` +
                    'Other causes should be excluded, and repeat evaluation is recommended if the ' +
                    'blood counts change.');
                /* AND THE LIMIT OF A MORPHOLOGIC STATEMENT, said out loud. A clonal
                   cytopenia is morphologically indistinguishable from this, so on an
                   unsequenced case the comment must not be read as having excluded
                   one. Only where nobody has looked — a negative panel is ICUS and
                   that rule's own comment covers it. */
                if (f.genetics.anySomatic === null) {
                    parts.push('Clonality has not been assessed; a clonal cytopenia of ' +
                        'undetermined significance is not excluded by the morphologic findings.');
                }
            }

            parts.push(dxChPendingText(f));
            parts.push('Correlation with the clinical findings is recommended.');
            return parts.filter(Boolean).join(' ');
        },
        /* WHERE A SUB-THRESHOLD CLONE LANDS, and the reason this rule needs a
           caution at all. dxExcludeSubthresholdClone takes a VAF below 2% out of
           CHIP, so the case arrives here — at which point the report says nothing
           about a variant the laboratory did report, and a reader would reasonably
           wonder whether it had been seen. The chapter's own position is that such
           clones are common by middle age and have not been shown to have
           consequences, which is a statement worth printing rather than a silence. */
        caution: function (f) {
            const notes = [];
            if (f.genetics.chClone === false) {
                notes.push('A somatic mutation is present at a variant allele fraction below the ' +
                    '2% threshold required for clonal hematopoiesis of indeterminate potential ' +
                    '(4% for an X-linked gene in a male patient). Clones of this size are common ' +
                    'by middle age and have not been demonstrated to have pathological ' +
                    'consequences.');
            }
            /* THE OTHER WAY A CLONE LANDS HERE: a mutation in a gene the driver
               table does not list. CHIP is defined on that list, so the case is
               not CHIP — but a variant was reported, and a comment that never
               mentions it looks like one that never saw it. */
            if (f.genetics.chDrivers.present === false && f.genetics.chDrivers.unlisted.length) {
                notes.push(`A somatic ${addCommas(f.genetics.chDrivers.unlisted)} mutation is ` +
                    'present. It is not among the clonal hematopoiesis driver genes, so the ' +
                    'findings do not meet the criteria for clonal hematopoiesis of ' +
                    'indeterminate potential; correlation with the clinical findings is ' +
                    'recommended.');
            }
            return notes.join(' ');
        }
    }
);
