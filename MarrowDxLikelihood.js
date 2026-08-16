/* ============================================================================
   MarrowDxLikelihood.js — the per-input likelihood registry

   Loads AFTER the five family files and BEFORE MarrowDxEngine.js. The order is
   not cosmetic: dxLikelihoodAudit() checks every entity key against the finished
   `dxRules`, so it needs the table complete, and the engine calls into this file
   from dxEvaluate, so it needs these functions defined.

   ---------------------------------------------------------------------------
   WHY THE TABLE IS KEYED BY INPUT AND NOT BY ENTITY

   The rest of the engine is organised by entity, because a criteria box is the
   unit of work. Likelihood is the one thing that is not: the question a reader
   actually has is "I ticked anemia — what did that do?", and answering it from a
   per-entity table means opening thirty-four rules and hoping none was missed.
   So an input is declared ONCE, with what it does to everything.

   The engine folds the result back into each candidate's own evidence list, so
   the Scoring view still reads entity by entity. Neither view is derived from the
   other's shape; both are first-class.

   ---------------------------------------------------------------------------
   WHAT A WEIGHT MEANS, AND IT IS NOT WHAT THE OLD `supports` NUMBERS MEANT

       A weight is how much this input moves THIS entity RELATIVE TO ITS
       COMPETITORS — not how important the criterion is to the definition.

   A clause that fires identically for every eligible candidate is worth zero
   however central it is. `amlNpm1` requiring an NPM1 mutation and then scoring +4
   for "NPM1 is a defining mutation" is the pattern to avoid: it cannot separate
   two candidates, because the gate already removed everything it would separate
   them from. The discriminating numbers come from frequencies — how often this
   entity shows this finding, against how often its rivals do.

   TWO CONSEQUENCES THAT ARE EASY TO GET BACKWARDS, both of which this file did:

   A FINDING RARER IN THE ENTITY THAN IN THE FIELD SCORES NEGATIVE, even where the
   entity's own chapter names it among its presenting features. `anemia` paid
   chronic myeloid leukemia +1, sourced to a true sentence — anemia is one of six
   findings the CML chapter lists at presentation, in roughly half of cases. But
   the marrows CML is ranked against are MDS, CCUS and ICUS, which are anemic by
   definition or close to it. Half is BELOW the field, so the sign was wrong, and
   the effect was that recording anemia helped CML more than it helped MDS. A
   weight read off one chapter without its rivals' numbers beside it has no sign it
   can trust; that is the whole reason this table is keyed by input.

   A GATE DOES NOT SILENCE A WEIGHT. This file used to zero an entry wherever the
   same criterion already gated the rule — "the gate restated" — and the casualty
   was cytopenia, the commonest discriminating finding anywhere in this
   differential. It gates the myelodysplastic rules and both clonal-cytopenia
   rules, so under that policy it was worth NOTHING to every entity defined by it
   and +1 to one that merely often has it. A gate decides ELIGIBILITY and a weight
   decides RANK AMONG THE ELIGIBLE; they answer different questions, and a finding
   that gates an entity is by construction one that entity always shows, which in
   likelihood terms is a HIGH `for`, not a zero. What must still never happen is
   the same finding scored twice, once in a rule's `supports` and once here — that
   is a different problem, and dxMergeEvidence is where it is solved.

   ---------------------------------------------------------------------------
   THE SHAPE

     dxLikelihood.<key> = {
         label   what the Scoring view prints
         kind    'case' (a finding). The only kind an entry may declare.
         source  the sentence the weights came from, quoted or cited. REQUIRED.
         ladder  optional group name; only the strongest firing member counts
         test    (f) => true | false | null
         family  { mds: {for, against}, ... }   the default for a whole family
         entity  { mds5q: {for, against}, ... } overrides, by rule id
     }

   `against` is what the input contributes when it reads FALSE, and it is always
   written out. It is NEVER derived by negating `for`: absence of a rare feature
   is weak evidence against, absence of an obligate one is strong, and the two are
   not one number with a sign flipped. Polycythemia vera's subnormal
   erythropoietin is the case that settles it — +3 present, -1 absent, because the
   test is ~90-96% specific but only ~64-80% sensitive, so a normal value barely
   argues against. Defaults to 0.

   `null` always contributes nothing. That is the three-valued contract the whole
   engine rests on: nobody has said is not a no.
   ========================================================================= */


const dxLikelihood = {};


/* ----------------------------------------------------------------------------
   MIGRATED FROM THE ENGINE — the myelodysplasia-related mutation bonus

   This lived in dxEvaluate as a hard-coded `+2 to every mds and aml rule`. It is
   the clearest possible case of an input with a per-family weight, so it is the
   first entry: it proves the shape against behaviour that already existed.

   Moving it also exposes a collision the engine could not see. `dxMdsIbHighRiskGenes`
   in MarrowDxMds.js carries a comment explaining that it deliberately drops
   ASXL1/RUNX1/EZH2 to avoid double-counting this bonus — a rule reaching around
   the engine to compensate for a constant it cannot reference. With both in one
   table the compensation can be stated instead of inferred.
-------------------------------------------------------------------------- */

dxLikelihood.mrMutation = {
    label: 'myelodysplasia-related mutation',
    kind: 'case',
    source: 'ICC 2022 (Arber, Blood 2022;140:1200) Table 25 — the myelodysplasia-related ' +
        'gene list. Evidence the process is a myeloid neoplasm, and at the blast ' +
        'thresholds it is what names the WHO/ICC MR subtypes (see mdsIB2.iccFor, aml.whoFor).',
    test: function (f) { return f.genetics.mrICC.present; },
    /* Names the genes, so the reason reads as evidence rather than as a category. */
    detail: function (f) { return f.genetics.mrICC.genes.join(', '); },
    family: {
        mds: { for: 2, against: 0 },
        aml: { for: 2, against: 0 }
    },
    entity: {
        /* SILENCED, BECAUSE ON THIS ENTITY THE BONUS IS CIRCULAR. SF3B1 is on
           ICC's myelodysplasia-related gene list AND is the entity's own defining
           lesion, so a single SF3B1 variant was paying MDS-SF3B1 twice: "SF3B1 is
           a defining mutation +4" and "myelodysplasia-related mutation (SF3B1) +2"
           sat one above the other on the card.

           The general bonus means "the process is a myeloid neoplasm of the
           myelodysplasia-related kind". On the rule that IS that mutation, this is
           already established by the +4 and adds no information — the definition
           of a clause that should be worth nothing. */
        mdsSf3b1: { for: 0, against: 0 },
        /* Same circularity, found the same way. AML-MR already scores the
           myelodysplasia-related mutation at +4 as its OWN defining criterion, so
           the general bonus paid it a second time — and on a marrow whose blasts
           had not been counted at all, that was enough to put AML-MR at the top of
           the differential on the strength of one SF3B1.

           A rule that is named for a finding must not also be paid the general
           bonus for having it. That is the test to apply to any new entry here. */
        amlMr: { for: 0, against: 0 }
    },
    /* Otherwise a between-family statement and nothing more: the mutation says
       "this is a myeloid neoplasm of the myelodysplasia-related kind", which is
       equally true of every mds and aml candidate. It does not order either family
       internally and is not supposed to, so the audit's usual complaint does not
       apply. Stated rather than left for the next reader to re-derive. */
    familyWide: true
};


/* ----------------------------------------------------------------------------
   ANEMIA — the worked example of what this table is for

   It is a gate on the boundary rules and it is `cytopenia.any` that gates the
   myelodysplastic ones, so anemia SPECIFICALLY is free to score across almost the
   whole MDS block. That is the opening the weights below use: a neutropenia-only
   marrow satisfies "at least one cytopenia" just as well, so which cytopenia it
   actually is has been carrying no information at all.

   The figures are each entity's own chapter, and they genuinely differ — this is
   not one number applied eight times:

     MDS-LB      "The majority (> 70%) of patients present with anaemia."
     MDS-SF3B1   "Initial symptoms are usually related to anaemia (57%) and less
                 commonly to thrombocytopenia (13%) and neutropenia (8%)."
     MDS-IB      "Most patients present with clinical features related to anaemia,
                 thrombocytopenia, and/or neutropenia."  — one of three, so weak
     MDS-biTP53  "related to cytopenias, usually including anaemia, neutropenia,
                 and thrombocytopenia."  — likewise one of three
     hMDS        distinguished by DEPTH of cytopenia and specifically by lower
                 white cell and neutrophil counts, not by anemia
     CMML        "Most patients present with anaemia."

   MDS-5q WAS SILENCED at { for: 0 } BECAUSE ANEMIA GATES IT, and that was the
   gate-silencing policy the header now rejects. Anemia being MDS-5q's own
   essential criterion means every MDS-5q is anemic — a likelihood ratio near its
   maximum, not zero. It scores like the rest of the family.

   POLYCYTHEMIA VERA still needs no negative weight, and the reason is worth
   stating because it looks like an omission — but it is NOT the silencing policy
   coming back. PV requires ERYTHROCYTOSIS, so an anemic marrow fails a hard gate
   and leaves the differential outright; a -4 would be arithmetic on a candidate
   that is already gone. The distinction is between a gate that has already ANSWERED
   in the same direction the weight would (stay quiet) and one that has answered in
   the opposite direction (score it).

   THE BOUNDARY RULES CARRY THE HEAVIEST WEIGHTS IN THIS ENTRY, which is what was
   most obviously missing: CCUS and ICUS have "cytopenia" in their names, are among
   the commonest answers a marrow gives, and scored nothing at all for one.
-------------------------------------------------------------------------- */

dxLikelihood.anemia = {
    label: 'anemia',
    kind: 'case',
    source: 'WHO-HAEM5 per-entity chapters, docs/who/: MDS-LB >70%; MDS-SF3B1 57%; ' +
        'MDS-IB and MDS-biTP53 name it as one of three cytopenias; CMML "most patients"; ' +
        'hMDS is marked by neutropenia rather than anemia; CH chapter — an unexplained ' +
        'cytopenia is the essential criterion of both CCUS and ICUS.',
    test: function (f) { return f.cytopenia.anemia; },
    family: {
        mds: { for: 1, against: 0 }
    },
    entity: {
        /* Its own essential criterion, so every case of it is anemic. Formerly 0,
           on the reasoning that the gate already said this — see the note above. */
        mds5q: { for: 2, against: 0 },
        /* THE CATEGORY WHOSE NAME IS THE FINDING. An unexplained cytopenia is the
           essential criterion of both, and neither scored anything for one while
           CML scored +1. Level with MDS-LB rather than above it: among marrows
           that are anemic and morphologically bland these are the likeliest
           answers, and among marrows that are anemic and dysplastic they are
           already gone on the dysplasia gate, so the two never really compete. */
        ccus: { for: 2, against: 0 },
        icus: { for: 2, against: 0 },
        /* NOT scored, and for PV's reason rather than by omission: CHIP requires
           the absence of unexplained cytopenia, so an anemic case has already
           failed a gate and a weight here would be arithmetic on a dead candidate. */
        chip: { for: 0, against: 0 },
        /* NEUTRAL, DELIBERATELY. Anemia is below the field's rate here — the
           entities this competes with on an anemic marrow are anemic by
           definition — which argues for a negative. It is held at zero instead
           because this rule is the floor of the differential and has to stay
           reachable on exactly the case it exists for: an unexplained cytopenia
           with no morphologic, immunophenotypic or molecular abnormality. Its
           prior does the work of ranking it. */
        noNeoplasm: { for: 0, against: 0 },
        /* >70%, the highest in the family, and the only one where ABSENCE is worth
           anything: at that rate a non-anemic marrow is mildly surprising. Still
           only -1 — nearly a third of these patients are not anemic at
           presentation, so this may argue, never disqualify. */
        mdsLB: { for: 2, against: -1 },
        /* 57%, materially below MDS-LB's >70%, and that gap is the whole point:
           anemia is evidence for both, and MORE evidence for the residual type
           than for the genetically defined one. */
        mdsSf3b1: { for: 1, against: 0 },
        /* Cytopenias here are deeper but specifically leukopenic; anemia carries
           no more weight than it does for MDS generally. */
        mdsH: { for: 1, against: 0 },
        /* "Most patients present with anaemia" — the overlap family has no default,
           so this is stated per entity. */
        cmml: { for: 1, against: 0 },
        /* THE ENTRY THAT SHOWED THE SIGN CONVENTION WAS WRONG. "Common findings at
           presentation include splenomegaly, fatigue, malaise, weight loss, night
           sweats, and anaemia" — one of six named presenting findings, in roughly
           half of cases, and it was read as +1 because the sentence is true.

           A weight is relative to the field, and the field an anemic marrow puts
           CML in is MDS, CCUS and ICUS: anemic by definition or close to it. Half
           is below that, so the likelihood ratio is less than one and the sign is
           negative. The practical effect of the old +1 was that ticking anemia
           moved chronic myeloid leukemia UP the list faster than it moved the
           myelodysplastic candidates, which is the opposite of what an anemic
           marrow means.

           Only -1. Anemia is genuinely common in CML and a BCR::ABL1-positive
           anemic marrow is still CML — this may argue, never disqualify, and the
           fusion outranks it several times over. Note this is the MPN family,
           which has no default: the weight is stated per entity so it cannot leak
           to polycythemia vera, where erythrocytosis is a gate. */
        cml: { for: -1, against: 0 },
        /* The ET chapter states this from two directions. Descriptively: "Most
           often, the red and white cells do
           not show any changes" — anemia is not part of the picture. Prognostically:
           anemia is listed among the "risk factors associated with the development
           of post-ET MF and blast phase transformation", so where it does appear it
           marks progression away from chronic-phase ET rather than ET itself.

           Only -1. The same chapter allows that "concurrent anaemia may result in
           expansion of precursors", so an anemic ET is possible, merely unexpected —
           and the finding's real work is done by the neighbours it favours instead,
           where anemia is a named minor criterion of both PMF stages. */
        et: { for: -1, against: 0 }
    }
};


/* ----------------------------------------------------------------------------
   THE OTHER TWO CYTOPENIAS, which had no entry at all

   Anemia was declared and neutropenia and thrombocytopenia were not, so a
   pancytopenic marrow and an anemic one scored identically everywhere. That is a
   real loss of information in the direction that matters most: the number of
   cytopenic lineages is one of the few things this app knows for certain from a
   blood count, it is what the classifications themselves grade severity by, and
   it separates the boundary categories from the myelodysplastic ones about as
   well as anything non-genetic can.

   THEY ARE THREE ENTRIES AND NOT ONE `cytopenia.any`, AND NOT A LADDER. A ladder
   keeps only its strongest firing member, so putting the three on one would score
   a pancytopenia exactly like an isolated anemia — the information the entries
   were added to capture. Three independent entries let a bicytopenia sum to more
   than a monocytopenia, which is the behaviour the source text describes.

   The weights are smaller than anemia's on purpose. Anemia is the commonest
   cytopenia in nearly every entity here, so a case that has one of the other two
   usually has anemia as well and the two entries stack; paying each of them at
   anemia's rate would let a blood count out-score a defining genetic lesion.
-------------------------------------------------------------------------- */

dxLikelihood.neutropenia = {
    label: 'neutropenia',
    kind: 'case',
    source: 'WHO-HAEM5 per-entity chapters, docs/who/: hMDS is distinguished by the DEPTH of ' +
        'cytopenia and specifically by lower white cell and neutrophil counts; MDS-SF3B1 names ' +
        'neutropenia in 8% at presentation, the lowest rate in the family; MDS-IB and ' +
        'MDS-biTP53 name it as one of three; CH chapter — any unexplained cytopenia satisfies ' +
        'the essential criterion of CCUS and ICUS.',
    test: function (f) { return f.cytopenia.neutropenia; },
    family: {
        mds: { for: 1, against: 0 }
    },
    entity: {
        /* THE ONE ENTITY THE CHAPTER SEPARATES ON THIS FINDING RATHER THAN ON
           ANEMIA. hMDS is marked by lower white cell and neutrophil counts, and
           `anemia` already says so from the other side by holding hMDS at the
           family default. This is where that sentence earns its point. */
        mdsH: { for: 2, against: 0 },
        /* 8% at presentation — far below the field, in which the myelodysplastic
           and boundary rivals are neutropenic several times as often. Not merely
           unremarkable: it argues, mildly, for something other than SF3B1. */
        mdsSf3b1: { for: -1, against: 0 },
        ccus: { for: 2, against: 0 },
        icus: { for: 2, against: 0 },
        /* Gated out, as with anemia: CHIP requires no unexplained cytopenia. */
        chip: { for: 0, against: 0 },
        noNeoplasm: { for: 0, against: 0 },
        /* SILENCED, BECAUSE THE SOURCE LINE DOES NOT SAY THIS. The +1 was justified
           by "Most patients present with anaemia" — which is the ANEMIA entry's
           sentence, quoted under neutropenia. The word "neutropenia" does not appear
           anywhere in the CMML chapter, so there is nothing here to weight. An
           unsourced number is worse than a missing one: it cannot be checked and it
           moves the ranking anyway. */
        cmml: { for: 0, against: 0 }
    }
};

dxLikelihood.thrombocytopenia = {
    label: 'thrombocytopenia',
    kind: 'case',
    source: 'WHO-HAEM5 per-entity chapters, docs/who/: MDS-5q — thrombocytopenia is uncommon ' +
        'and marks advanced disease, thrombocytosis being characteristic; MDS-SF3B1 names ' +
        'thrombocytopenia in 13% at presentation; MDS-IB and MDS-biTP53 name it as one of ' +
        'three; CH chapter — any unexplained cytopenia satisfies the essential criterion of ' +
        'CCUS and ICUS.',
    test: function (f) { return f.cytopenia.thrombocytopenia; },
    family: {
        mds: { for: 1, against: 0 }
    },
    entity: {
        /* THE ONE PLACE A CYTOPENIA ARGUES AGAINST A MYELODYSPLASTIC NEOPLASM.
           MDS-5q's essential criterion is anemia "with or without other cytopenias
           AND/OR THROMBOCYTOSIS", and the chapter says separately that
           thrombocytopenia here is uncommon and marks advanced disease. So a
           thrombocytopenic marrow is a reason to look at the rest of the family
           first, which is exactly the discrimination a per-input table is for —
           and it is invisible from inside the MDS-5q rule, where anemia and
           thrombocytopenia both merely satisfy "at least one cytopenia". */
        mds5q: { for: -1, against: 0 },
        /* 13% at presentation, "less commonly" in the chapter's own words. Below
           the field for the same reason neutropenia is. */
        mdsSf3b1: { for: 0, against: 0 },
        ccus: { for: 2, against: 0 },
        icus: { for: 2, against: 0 },
        chip: { for: 0, against: 0 },
        noNeoplasm: { for: 0, against: 0 },
        cmml: { for: 1, against: 0 }
    }
};


/* ----------------------------------------------------------------------------
   THE WHITE CELL COUNT'S MAGNITUDE — the first ladder in this table, and the
   reason the ladder mechanism was built

   "The peripheral blood shows leukocytosis (white blood cell count: 12–1000 ×
   10^9/L, median: ~80 × 10^9/L) due primarily to neutrophils" — WHO-HAEM5,
   chronic myeloid leukaemia.

   A COUNT OF 12 AND A COUNT OF 300 ARE NOT THE SAME FINDING, and until now the
   engine could not tell them apart: `f.counts.leukocytosis` is a boolean at >= 11,
   so a barely-raised count and a count that is essentially diagnostic scored
   identically. The median CML presents at 80. Nothing else in this differential
   does that — a myelodysplastic, boundary or acute candidate with a white count of
   80 is not what any of those entities look like — so magnitude is one of the
   strongest discriminators available, and it was invisible.

   THE RUNGS OVERLAP AND THAT IS THE POINT. A count of 120 satisfies all three
   predicates; dxCollapseLadders keeps the strongest and reports the rest as
   suppressed, so the reader sees "white cell count >= 100" scored and the two
   lower rungs stated and not double-counted. Writing them as disjoint bands would
   work too and would silently re-score every case above the top band the moment a
   fourth rung was added — which is the failure this mechanism exists to prevent.

   CHRONIC NEUTROPHILIC LEUKAEMIA DELIBERATELY CARRIES NO WEIGHT HERE, and its
   absence is a statement rather than an oversight: CNL is the one other entity in
   this table whose defining feature is the height of the white count, its rule
   already gates on >= 25 (WHO) or >= 13 with CSF3R (ICC), and its chapter has NOT
   been pasted. Weighting it from recollection beside a CML figure read from source
   is exactly the uneven-migration bias documented in docs/diagnosis.md. When the
   CNL chapter lands, these three entries are where it goes.
-------------------------------------------------------------------------- */

const DX_WBC_SOURCE = 'WHO-HAEM5 Chronic myeloid leukaemia — "leukocytosis (white blood cell ' +
    'count: 12–1000 × 10^9/L, median: ~80 × 10^9/L) due primarily to neutrophils in various ' +
    'stages of maturation".';

/* THE LADDER'S LOWEST RUNG BELONGS TO A DIFFERENT ENTITY, which is the argument
   for a shared ladder rather than three private ones. CMML's chapter publishes its
   own white-count number and the app used it for the NAME and never for the score:
   "The clinical and molecular distinction between MD-CMML and MP-CMML based on a
   white blood cell count cut-off point of 13 × 10^9/L { 7986717 }, has been
   substantiated in multiple studies", with "the proportion of MP-CMML ranged from
   39% to 63% of all CMML cases".

   No `against`: the other 37-61% is MD-CMML and is still CMML. And no `cml` weight
   at this rung — 13 is far below that entity's range, so its lowest meaningful rung
   stays 25. */
dxLikelihood.wbcOver13 = {
    label: 'white cell count >=13 x10^9/L (myeloproliferative CMML)',
    kind: 'case',
    source: 'WHO-HAEM5 MDS/MPN and CMML — "a white blood cell count cut-off point of 13 × 10^9/L ' +
        '{ 7986717 }, has been substantiated in multiple studies"; MP-CMML is 39-63% of CMML.',
    ladder: 'wbcMagnitude',
    test: function (f) { return dxAtLeast(f.counts.wbc, 13); },
    entity: { cmml: { for: 2, against: 0 } }
};

dxLikelihood.wbcOver25 = {
    label: 'white cell count >=25 x10^9/L',
    kind: 'case',
    source: DX_WBC_SOURCE,
    ladder: 'wbcMagnitude',
    test: function (f) { return dxAtLeast(f.counts.wbc, 25); },
    /* Well below the median, so this is the rung that says "raised in a way the
       rest of the table does not do" and no more. */
    entity: { cml: { for: 2, against: 0 } }
};

dxLikelihood.wbcOver50 = {
    label: 'white cell count >=50 x10^9/L',
    kind: 'case',
    source: DX_WBC_SOURCE,
    ladder: 'wbcMagnitude',
    test: function (f) { return dxAtLeast(f.counts.wbc, 50); },
    entity: { cml: { for: 3, against: 0 } }
};

dxLikelihood.wbcOver100 = {
    label: 'white cell count >=100 x10^9/L',
    kind: 'case',
    source: DX_WBC_SOURCE,
    ladder: 'wbcMagnitude',
    test: function (f) { return dxAtLeast(f.counts.wbc, 100); },
    /* Above the median for adult CML and outside anything else in this table
       entirely. Not the pathognomonic tier — a reactive leukemoid reaction and CNL
       both reach it, and neither is a rule this weight is competing against — but
       the top of the ordinary range. */
    entity: { cml: { for: 4, against: 0 } }
};


/* ----------------------------------------------------------------------------
   THE OTHER THREE GATES THAT SCORED NOTHING

   Chronic myeloid leukemia's neutrophilic leukocytosis was not the only essential
   criterion worth no points. A full audit of every rule against its own chapter
   found the same shape three more times, and in each case for the same reason: the
   finding gates the rule, so the old policy read it as "the gate restated" and
   silenced it — while the candidates it is actually ranked against are not gated on
   it at all, and mostly never show it.

     POLYCYTHEMIA VERA    erythrocytosis. A gate, scored nowhere. A hematocrit of
                          62% and one of 49.5% ranked PV identically.
     ESSENTIAL           thrombocytosis. A gate, scored nowhere, on the entity whose
     THROMBOCYTHEMIA     definition opens "characterized by sustained thrombocytosis".
     CLONAL CYTOPENIA    a somatic mutation. Scored locally on three of the four
     / CHIP / ICUS       boundary rules, in three different shapes, one of which paid
                          for an absence — now one entry, below.
-------------------------------------------------------------------------- */

/* PV's two published tiers, as a ladder. Major criterion 1 is the diagnostic bar;
   footnote b's higher bar is the one at which the chapter will let a diagnosis be
   made WITHOUT a bone marrow biopsy at all, which is its own statement that the
   magnitude carries more than the threshold does.

   The top rung is 4 and not 8: "PV must be distinguished from reactive or secondary
   polycythaemias", and this table carries no rule for those, so a very high
   hematocrit is not pathognomonic of anything the engine can offer. */
dxLikelihood.erythrocytosis = {
    label: 'erythrocytosis above the sex-specific threshold',
    kind: 'case',
    source: 'WHO-HAEM5 Polycythaemia vera, major criterion 1 — "Elevated haemoglobin ' +
        'concentration (> 16.5 g/dL in men, > 16.0 g/dL in women) or elevated haematocrit ' +
        '(> 49% in men, > 48% in women)".',
    ladder: 'erythrocytosisMagnitude',
    test: function (f) { return f.counts.erythrocytosis; },
    entity: { pv: { for: 3, against: 0 } }
};

dxLikelihood.erythrocytosisSustained = {
    label: 'sustained absolute erythrocytosis (the marrow-waiver thresholds)',
    kind: 'case',
    source: 'WHO-HAEM5 Polycythaemia vera, footnote b — "sustained absolute erythrocytosis ' +
        '(haemoglobin concentrations of > 18.5 g/dL in men or > 16.5 g/dL in women, or ' +
        'haematocrit values of > 55.5% in men or > 49.5% in women)", at which the marrow ' +
        'criterion "may not be required".',
    ladder: 'erythrocytosisMagnitude',
    test: function (f) { return dxPvSustainedErythrocytosis(f); },
    entity: { pv: { for: 4, against: 0 } }
};

/* ESSENTIAL THROMBOCYTHEMIA'S DEFINING COUNT — AND THE ONE WEIGHT IN THIS FILE
   THAT IS DELIBERATELY MIRRORED RATHER THAN DISCRIMINATING.

   "Essential thrombocythaemia (ET) is a myeloproliferative neoplasm (MPN)
   characterized by sustained thrombocytosis and increased numbers of large, mature
   megakaryocytes in a normocellular bone marrow." A platelet count over 450 is
   near-absent from the field this competes in — the MDS introduction treats
   thrombocytosis as a proliferative finding that redirects a case OUT of the MDS
   family, and CHIP, CCUS, ICUS and the AML rules essentially never show it.

   PREFIBROTIC PMF CARRIES THE IDENTICAL WEIGHT, and that is the whole point of
   entering it here rather than on the ET rule. dxUnresolvedPair() declares the pair
   unresolved within a margin of 2 on the PRIOR-FREE subtotal, and thrombocytosis is
   a criterion of both — so a weight given to ET alone would move that comparison by
   4 and dissolve the "unresolved" answer on precisely the cases it exists for.
   Prefibrotic PMF's chapter has not been pasted; entering a shared finding on the
   read entity only is the uneven-migration bias docs/diagnosis.md warns about, and
   here it would do visible harm. Equal weights leave the margin exactly where it
   was and still lift both above the myelodysplastic and boundary candidates, which
   is the discrimination that was actually missing. */
dxLikelihood.thrombocytosis = {
    label: 'thrombocytosis (platelets >=450 x10^9/L)',
    kind: 'case',
    source: 'WHO-HAEM5 Essential thrombocythaemia — "characterized by sustained thrombocytosis ' +
        'and increased numbers of large, mature megakaryocytes in a normocellular bone marrow"; ' +
        'major criterion 1 "Platelet count >= 450 × 10^9/L". Weighted equally on prefibrotic PMF, ' +
        'whose chapter is unpasted and for which it is also a criterion — see the note above.',
    test: function (f) { return f.counts.thrombocytosis; },
    entity: {
        et: { for: 4, against: 0 },
        prePmf: { for: 4, against: 0 },
        /* Already scored locally by both rules on their own criteria — mds5q's
           "with or without other cytopenias and/or thrombocytosis" and
           mdsMpnSf3b1T's defining combination — so silenced here rather than paid
           twice. `pv` likewise scores it in its own "leukocytosis or thrombocytosis"
           clause. */
        mds5q: { for: 0, against: 0 },
        mdsMpnSf3b1T: { for: 0, against: 0 },
        pv: { for: 0, against: 0 }
    }
};

/* ONE ENTRY REPLACING THREE LOCAL CLAUSES, one of which paid for an absence.

   The boundary rules all turn on whether a clone was demonstrated, and each had
   written it differently: CCUS scored `anySomatic` +3 under the label "clonal marker
   without morphologic dysplasia" (two gated absences recited in the label of a
   clause whose predicate tests neither); ICUS scored `dxNot(anySomatic)` +3, an
   absence paying a positive; noNeoplasm scored `anySomatic` −2. Three shapes, one
   finding, and the label laundering is why none of them tripped the audit.

   Stated once, with the sign each entity actually needs. ICUS's weight lands on
   `against`, which is where an absence belongs — and note it may NOT become an
   `expects` clause instead: a false `expects` pushes the rule into the `contested`
   bucket, and a resulted-negative panel is the finding ICUS is MADE of, not
   evidence against it. */
dxLikelihood.anySomatic = {
    label: 'a somatic mutation',
    kind: 'case',
    source: 'WHO-HAEM5 Clonal haematopoiesis — CHIP requires "detection of one or more somatic ' +
        'mutations"; the chapter states that a clonal cytopenia is predicated on detecting one, ' +
        'and that "flow cytometric and immunohistochemical surrogates are not recommended".',
    test: function (f) { return f.genetics.anySomatic; },
    entity: {
        ccus: { for: 2, against: 0 },
        /* The absence IS the entity: idiopathic means the sequencing was done and
           found nothing, which is exactly what separates this from CCUS.

           ONLY +1, THOUGH, AND THE OLD LOCAL CLAUSE'S +3 WAS THE DOCTRINE APPLIED
           TO THE WRONG COMPARISON. A negative panel is near-universal in ICUS — but
           it is equally near-universal in "no morphologic evidence of a myeloid
           neoplasm", which is the only other candidate still standing on a bland,
           sequenced-negative, cytopenic marrow. CCUS is gone by then, excluded on
           the same finding. So the likelihood ratio against the live field is close
           to one, and +3 was buying a four-point lead over a candidate the finding
           does not distinguish it from at all. What is left is the small, real tilt:
           ICUS is the NAMED answer for this case and noNeoplasm is the generic one. */
        icus: { for: 0, against: 1 },
        /* CHIP scores the driver-gene membership on its own clause, which is the
           narrower and better-sourced finding (Table 2.02). Silenced here so the
           two do not stack. */
        chip: { for: 0, against: 0 },
        /* A clone does not make "no morphologic evidence of a myeloid neoplasm"
           false — that absence is precisely what CHIP requires — but it makes it the
           wrong headline. */
        noNeoplasm: { for: -2, against: 0 }
    },
    /* ICUS's +3 sits on `against` by design; see the note above. */
    absenceArgues: true
};


/* ----------------------------------------------------------------------------
   RETICULIN FIBROSIS — the same finding meaning opposite things in one family

   This entry exists because the MPN rules already treat MF-2/MF-3 as a hard
   EXCLUSION for essential thrombocythemia and prefibrotic PMF, on reproducibility
   grounds (fibrosis grades at kappa >= 0.8, so a false there is a real false). The
   CML chapter then says: "Reticulin fibrosis of the bone marrow may be seen in as
   many as 30% of cases at diagnosis, often in proportion to the number of
   megakaryocytes."

   So on the entity where fibrosis is nearly a third of cases at presentation, it
   had no weight at all, while on its neighbours it was disqualifying. A reader
   looking at a fibrotic BCR::ABL1-positive marrow was getting no help from the one
   finding that most needed interpreting.

   NOT a support clause on the CML rule, deliberately: the whole point is that this
   finding's meaning differs BETWEEN entities, and that comparison is only legible
   in a table keyed by input. It is the clearest case yet for this file existing.
-------------------------------------------------------------------------- */

dxLikelihood.fibrosisMf2 = {
    label: 'reticulin fibrosis MF-2 or MF-3',
    kind: 'case',
    source: 'WHO-HAEM5 Chronic myeloid leukaemia — "Reticulin fibrosis of the bone marrow may ' +
        'be seen in as many as 30% of cases at diagnosis, often in proportion to the number of ' +
        'megakaryocytes. This finding does not correlate with response to imatinib."',
    test: function (f) { return dxBandAtLeast(f.fibrosis.grade, 2); },
    entity: {
        /* Neither for nor against: at ~30% of cases it is common enough that its
           presence is unremarkable and its absence equally so. Stated at zero
           rather than omitted, because the omission is what read as an oversight
           beside ET's and prefibrotic PMF's exclusions. */
        cml: { for: 0, against: 0 },
        /* A THIRD MEANING, from the PV chapter: "Reticulin and Masson trichrome
           stains usually show absent (MF-0) or mild (MF-1) myelofibrosis." So MF-2
           or worse is not what PV looks like — but it is precisely what post-PV
           myelofibrosis looks like, which "about 20% of PV patients develop over
           time" and where "myelofibrosis graded as MF-2 or MF-3 is present, by
           definition".

           So this argues against PV while pointing at a real successor diagnosis,
           and it must NOT exclude: the fibrotic marrow of a known polycythemic is
           the case where naming PV's own progression is the whole job. This engine
           carries no post-PV MF rule yet — see the caution on the rule.

           `against` IS 0, AND IT WAS 1. The +1 was sourced to a true sentence and
           was the registry's own copy of the granulocytic-dysplasia bug: paying
           polycythemia vera a point for every marrow that was NOT fibrotic paid it
           on nearly every case in the table, including every CCUS, ICUS, MDS-LB and
           ET. A non-fibrotic marrow is the field's default state and carries no
           information. dxLikelihoodAudit() now warns on any positive `against`. */
        pv: { for: -3, against: 0 },
        /* MDS WITH FIBROSIS, WHICH SCORED NOTHING FOR THE FINDING IT IS NAMED FOR.
           Fibrosis is the entire difference between MDS-F and MDS-IB1/IB2 — the two
           IB rules exclude on it outright — and mdsF's prior sits a tier below
           theirs, so it began every case two points down with nothing to make it up
           with. The cytopenia case from this file's header, unfixed on one more
           rule: a gate decides eligibility, a weight decides rank, and the rule that
           SURVIVES an exclusion its rivals fail is exactly where the weight belongs. */
        mdsF: { for: 4, against: 0 }
    }
};

/* MF-1 IS A SEPARATE QUESTION FROM MF-2, not a weaker version of it, which is why
   this is its own entry rather than a rung on a ladder: the predicate below is
   grade 1 AND NOT grade 2 or worse, so the two entries can never both fire and
   there is nothing for a ladder to collapse.

   It exists because ET's two sentences about fibrosis do not say the same thing.
   The histopathology section is permissive — "Myelofibrosis is usually absent
   (MF-0) or mild (MF-1)" — while the criteria box, which is the governing text,
   allows major criterion 2 only "very rarely a minor (grade 1) increase in
   reticulin fibres". Rarely, in the criterion itself. So MF-1 is compatible with ET
   and mildly surprising in it, and the entity it is not surprising in is the one
   standing right next to it. */
dxLikelihood.fibrosisMf1 = {
    label: 'reticulin fibrosis MF-1',
    kind: 'case',
    source: 'WHO-HAEM5 Essential thrombocythaemia, major criterion 2 — "very rarely a minor ' +
        '(grade 1) increase in reticulin fibres"; prefibrotic PMF is by definition the ' +
        'pre-fibrotic stage, in which grade 0-1 reticulin is the expected finding.',
    test: function (f) {
        return dxAllOf([
            dxBandAtLeast(f.fibrosis.grade, 1),
            dxNot(dxBandAtLeast(f.fibrosis.grade, 2))
        ]);
    },
    entity: {
        /* Small, and deliberately smaller than the four published ET-versus-
           prefibrotic-PMF discriminators already on the rule at -2 apiece. "Very
           rarely" in the criterion is a real statement, but reticulin grading at the
           0/1 boundary is the least reproducible end of a scale whose reliability is
           the reason fibrosis may gate at all. */
        et: { for: -1, against: 0 },
        /* The mirror, and the reason the pair is worth stating: prefibrotic PMF is
           defined as the stage BEFORE overt fibrosis, so grade 0-1 is not merely
           tolerated there — it is where the entity lives. Stated at zero rather than
           positive for exactly that reason: it is true of every prefibrotic PMF and
           so discriminates nothing on its own. The tilt comes from ET's -1. */
        prePmf: { for: 0, against: 0 }
    }
};


/* ----------------------------------------------------------------------------
   Resolution and merge
-------------------------------------------------------------------------- */

/* entity beats family beats does-not-apply. hasOwnProperty rather than
   truthiness, so an explicit { for: 0, against: 0 } SILENCES an entry for one
   entity instead of inheriting the family default — which is what a migration
   needs when a rule already scores the same finding locally. */
function dxWeightFor(entry, rule) {
    if (entry.entity && Object.prototype.hasOwnProperty.call(entry.entity, rule.id)) {
        return entry.entity[rule.id];
    }
    if (entry.family && Object.prototype.hasOwnProperty.call(entry.family, rule.family)) {
        return entry.family[rule.family];
    }
    return null;
}

/* THRESHOLD LADDERS. Registering `blasts10`, `blasts15` and `blasts20` and letting
   all three fire at 22% is continuous scoring coming back in through the side
   door — and worse, adding a fourth threshold later would silently re-score every
   case above it. Members of a ladder compete: the strongest firing one counts and
   the rest are reported as suppressed. This is how "15% blasts nearly clinches it"
   gets said while every predicate stays a plain three-valued boolean. */
function dxCollapseLadders(hits) {
    const best = {}, kept = [], suppressed = [];
    hits.forEach(function (h) {
        if (!h.ladder) { kept.push(h); return; }
        const cur = best[h.ladder];
        if (!cur || Math.abs(h.points) > Math.abs(cur.points)) {
            if (cur) suppressed.push(cur);
            best[h.ladder] = h;
        } else {
            suppressed.push(h);
        }
    });
    Object.keys(best).forEach(function (k) { kept.push(best[k]); });
    return { kept: kept, suppressed: suppressed };
}

/* What the registry says about one candidate. */
function dxRegistryEvidence(rule, f) {
    const hits = [];
    Object.keys(dxLikelihood).forEach(function (key) {
        const entry = dxLikelihood[key];
        const w = dxWeightFor(entry, rule);
        if (!w) return;

        const value = entry.test(f);
        const points = value === true ? (w.for || 0)
            : value === false ? (w.against || 0)
                : 0;
        if (!points) return;

        const detail = entry.detail ? entry.detail(f) : '';
        hits.push({
            key: key,
            ladder: entry.ladder || null,
            kind: 'case',
            points: points,
            text: entry.label + (detail ? ' (' + detail + ')' : '') +
                (value === false ? ' (absent)' : '')
        });
    });
    return dxCollapseLadders(hits);
}

/* LOCAL WINS ON A KEY COLLISION, and the loser is reported rather than dropped.

   During the migration a finding can be scored twice — once by a rule's own
   `supports` clause and once by the registry — and the result would be a number
   nobody could account for from the card. Deduping is the safety net; the audit
   below is the alarm; deleting the local clause in the same edit as adding the
   registry entry is the actual practice. A suppressed hit is kept on the result
   so the Scoring view can show it rather than leaving a silent subtraction. */
function dxMergeEvidence(local, registry) {
    const seen = {};
    local.forEach(function (e) { seen[e.key] = true; });
    const kept = [], suppressed = registry.suppressed.slice();
    registry.kept.forEach(function (h) {
        if (seen[h.key]) suppressed.push(h);
        else kept.push(h);
    });
    return { evidence: local.concat(kept), suppressed: suppressed };
}


/* ----------------------------------------------------------------------------
   The audit

   Runs once at load and warns to the console. Everything it checks is a mistake
   that is otherwise SILENT FOREVER — a typo'd rule id simply never fires, and no
   case will ever look wrong enough to prompt anyone to go looking for it.
-------------------------------------------------------------------------- */

function dxLikelihoodAudit() {
    const problems = [], coverage = {};
    if (typeof dxRules === 'undefined') return { problems: ['dxRules not loaded'], coverage: coverage };

    const ids = {}, families = {};
    dxRules.forEach(function (r) { ids[r.id] = r; families[r.family] = true; coverage[r.id] = 0; });

    Object.keys(dxLikelihood).forEach(function (key) {
        const entry = dxLikelihood[key];

        if (!entry.source) problems.push(key + ': no source. A weight that cannot be traced is not auditable.');
        if (typeof entry.test !== 'function') problems.push(key + ': no test function.');

        Object.keys(entry.entity || {}).forEach(function (id) {
            if (!ids[id]) problems.push(key + ': entity "' + id + '" names no rule.');
        });
        Object.keys(entry.family || {}).forEach(function (fam) {
            if (!families[fam]) problems.push(key + ': family "' + fam + '" names no rule.');
        });

        /* A weight identical across every member of a family cannot order that
           family — and within-family is where the hard calls are. Family weights
           are for BETWEEN-family statements; the entity map is where the
           discrimination lives. An entry with no overrides is not yet doing the
           job it was added for. */
        if (Object.keys(entry.family || {}).length && !Object.keys(entry.entity || {}).length &&
                !entry.familyWide) {
            problems.push(key + ': family weights but no entity overrides — cannot discriminate within a family.');
        }

        dxRules.forEach(function (r) { if (dxWeightFor(entry, r)) coverage[r.id]++; });
    });

    /* Priors, and the residual-category bound. Residual categories are common BY
       CONSTRUCTION — MDS-LB is 45-50% of MDS — so an honest prevalence number
       raises exactly the rules that must rank last. */
    dxRules.forEach(function (r) {
        if (r.prior === undefined) return;
        const p = typeof r.prior === 'function' ? null : r.prior;
        if (p !== null && (p < DX_PRIOR_BAND[0] || p > DX_PRIOR_BAND[1])) {
            problems.push(r.id + ': prior ' + p + ' outside the band ' + DX_PRIOR_BAND.join(' .. '));
        }
    });

    /* AN ABSENCE MAY NOT SCORE POSITIVE, checked here because it is the one
       weighting mistake that looks completely reasonable on the line it is
       written on. `['granulocytic dysplasia absent', 1, -3, …]` states a true fact
       about chronic myeloid leukemia and reads as a modest, well-behaved soft
       criterion; what it actually did was pay a point towards CML to every
       non-dysplastic marrow in the world, which is nearly all of them. The whole
       weight of an absence belongs on the `against` side. See the point-ladder
       note in MarrowDxKernel.js.

       BY LABEL, WHICH IS A HEURISTIC AND IS THE RIGHT ONE HERE. The predicate is a
       closure and cannot be inspected for a negation; the label is the author's own
       statement of what the clause means, and an author who writes "absent" or "no
       dysplasia" has told us the polarity. A clause that dodges the pattern while
       still testing an absence is a real gap — but the same author would have had
       to phrase it positively to do it, which is the change we want anyway.

       IT CHECKS `supports` AS WELL AS `expects`, AND THE FIRST VERSION DID NOT.
       That gap was not academic: it read `r.expects` only, and a full audit of every
       rule against its source chapter then found the same defect sitting untouched
       in FOUR `supports` clauses — 'all assessed lineages unremarkable' +3 and 'no
       excess blasts' +2 on noNeoplasm, and the label-laundered 'a clonal marker with
       intact counts and no morphologic evidence of a neoplasm' +4 on chip. An audit
       that checks one of the two places a weight can live reports zero problems and
       means nothing. */
    /* THE NEGATION MUST GOVERN THE WHOLE LABEL, which is why this is anchored at
       both ends rather than being a bare word search. A loose /\b(no|non|without)\b/
       flagged three clauses that are positive findings with a negative-looking word
       inside them: MDS-5q's "non-lobated / hypolobated megakaryocytes" (a
       morphologic finding, and the entity's hallmark), and MPN-NOS's "a
       myeloproliferative driver mutation without features of a specific subtype"
       (the driver is the finding; the "without" qualifies which rule claims it).

       A leading "no/not/absent/without" or a trailing "absent/unremarkable" is the
       author saying the clause IS an absence. Anything mid-label is a qualifier, and
       treating it as polarity produces warnings that get ignored — which is worse
       than no warning, because the next real one gets ignored with them. */
    const absencePattern = /^(no|not|absent|absence of|without|lack of)\b|\b(absent|unremarkable|not present)$/i;
    dxRules.forEach(function (r) {
        (r.expects || []).forEach(function (clause) {
            if (absencePattern.test(clause[0]) && clause[1] > 0) {
                problems.push(r.id + ': soft criterion "' + clause[0] + '" is phrased as an ' +
                    'absence but scores +' + clause[1] + ' for being met. An absence discriminates ' +
                    'nothing against a field that mostly lacks the finding too; set `for` to 0 ' +
                    'and put the weight on `against`.');
            }
        });
        (r.supports || []).forEach(function (clause) {
            if (absencePattern.test(clause[0]) && clause[1] > 0) {
                problems.push(r.id + ': support "' + clause[0] + '" is phrased as an absence but ' +
                    'scores +' + clause[1] + '. Either the weight belongs on the presence of the ' +
                    'contrary finding, or the gates have already answered and it should be 0.');
            }
        });
    });

    /* A POSITIVE `against` IS THE SAME MISTAKE WEARING THE REGISTRY'S CLOTHES, and
       it is worth its own check because it does not look like an absence at all —
       the label reads as a positive finding and only the sign of the second number
       says otherwise.

       `dxLikelihood.fibrosisMf2` carried `pv: { for: -3, against: 1 }`, sourced to a
       true sentence: "Reticulin and Masson trichrome stains usually show absent
       (MF-0) or mild (MF-1) myelofibrosis." So every marrow in the table that was
       not fibrotic — which is nearly all of them, including every CCUS, ICUS, CHIP,
       MDS-LB and ET — was paying polycythemia vera a point. Identical in effect to
       'granulocytic dysplasia absent, +1', and it sat in the one file the first
       version of this audit did not inspect.

       Not forbidden outright: an absence CAN be evidence for an entity, if the
       finding is common in the field and this entity is where it is missing. That is
       rare enough to be worth stating at the entry, so the audit asks for the note
       rather than the silence. */
    Object.keys(dxLikelihood).forEach(function (key) {
        const entry = dxLikelihood[key];
        if (entry.absenceArgues) return;
        Object.keys(entry.entity || {}).forEach(function (id) {
            if ((entry.entity[id].against || 0) > 0) {
                problems.push(key + '/' + id + ': positive `against` (' + entry.entity[id].against +
                    '), so every case LACKING this finding is paid for lacking it. Legitimate only ' +
                    'where the finding is common in the field and this entity is where it is ' +
                    'missing; set `absenceArgues: true` with the reason if so.');
            }
        });
        Object.keys(entry.family || {}).forEach(function (fam) {
            if ((entry.family[fam].against || 0) > 0) {
                problems.push(key + '/' + fam + ': positive `against` on a whole family. See above.');
            }
        });
    });

    if (problems.length) {
        console.warn('dxLikelihoodAudit: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
    }
    return { problems: problems, coverage: coverage };
}

/* Run once at load. This file sits after the family files precisely so that
   `dxRules` is complete here — an entity key naming no rule is otherwise a typo
   that never fires and never complains. */
dxLikelihoodAudit();


/* ============================================================================
   THE INPUT COVERAGE AUDIT — the other direction

   dxLikelihoodAudit() asks "does this weight name a real rule?". It cannot ask
   the question that actually goes wrong, because that question is not about the
   weights that exist: it is about the ones nobody wrote.

   THE FAILURE IT EXISTS TO CATCH. The rules were authored ENTITY-FIRST — open a
   criteria box, extract its clauses — which is the right unit of work and has one
   structural blind spot: an input that no one happened to name while reading a box
   is scored by nothing, and nothing anywhere complains. It is invisible from the
   entity side by construction, because each rule looks complete against its own
   chapter. `cellularity.quality` is the worked example: the pathologist clicks
   Hypercellular, five entities list age-adjusted hypercellularity among their
   criteria, and the ranking does not move. That is not a missing weight in a table
   somebody would think to open. It is a finding the engine cannot see.

   SO THE AUDIT IS INPUT-FIRST. Every leaf of marrowFindings() is something the
   app lets a pathologist record. Any leaf that no rule predicate and no registry
   test mentions is a control whose clicks change nothing — either a gap to fill or
   plumbing to declare. There is no third possibility, which is what makes this
   mechanical rather than a matter of judgement.

   BY RUNNING THE RULES, NOT BY READING THEM. The first cut matched path names
   against the stringified predicates and it had to be thrown away: a rule that
   consumes a whole sub-object — `f.dysplasia.myeloid`, passed to a helper — makes
   every leaf under it look unread, and the audit reported thirty-odd phantoms
   around the one real gap. An audit whose output has to be triaged by hand is not
   a check, it is a chore, and the real warnings drown in it.

   So the findings object is wrapped in a recording Proxy and every rule is
   evaluated against it. What a rule READS is then observed rather than inferred,
   which is exact — the same technique the repo already uses to verify comments by
   rendering them.

   THE SWEEP RUNS FOUR TIMES because predicates short-circuit. `a && b` never
   touches `b` when `a` is false, so a single pass under-reports: the leaf is read
   by real code that this case did not reach. Three of the passes therefore lie to
   the rules — forcing every primitive to true, to false, and to null — so both
   sides of every branch get walked. The fourth uses the real values. Coverage is
   the union, and predicates that throw on the substituted type are caught and
   ignored, since a throw still records the reads that preceded it.
-------------------------------------------------------------------------- */

/* NOT EVIDENCE, and each of these says why. A leaf on this list is not a gap: it
   is provenance the Scoring view prints, a raw value some other leaf has already
   reduced to the question the criteria ask, or plumbing the engine reads outside
   any rule. Adding a path here is a claim, so it carries its reason — the list is
   the place a future reader argues with, and an unexplained entry would just be a
   silenced warning. */
const DX_INPUT_NOT_EVIDENCE = {
    'specimen.aspirate': 'which parts were received; gates the report header, not a diagnosis',
    'specimen.touchPrep': 'as above',
    'specimen.clot': 'as above',
    'specimen.core': 'as above',
    'blasts.counted': 'how many cells the differential counted — confidence in blasts.pct, not a finding',
    'blasts.claimedIncreased': 'the chip; blasts.pct is the criterion and the chip cannot outrank a count',
    'dysplasia.erythroid.basis': 'which specimen the dysplasia was seen in; provenance for the Scoring view',
    'dysplasia.erythroid.specimen': 'as above',
    'dysplasia.myeloid.basis': 'as above',
    'dysplasia.myeloid.specimen': 'as above',
    'dysplasia.megakaryocytic.basis': 'as above',
    'dysplasia.megakaryocytic.specimen': 'as above',
    'genetics.karyotypeText': 'the free-text ISCN string, for the report; the abnormality keys are the finding',
    'plasma.pctBasis': 'where plasma.marrowPct came from (counted vs CD138); comment wording, not a finding',
    'genetics.explicitlyPending': 'study status, read by the engine for comment wording rather than by a rule',
    'cellularity.expectedBand': 'the age band hyperForAge/hypoForAge are computed against',
    /* THE CHIP ITSELF IS STILL NOT READ BY A RULE, AND THAT IS NOW CORRECT — but
       it was not before, and the difference is the whole point of this audit.
       Rules ask the age-adjusted question, and marrowFindings() answers it from
       the chip when no number and no age exist to answer it better. So the finding
       reaches the engine through hyperForAge/hypoForAge, and a rule reading
       `quality` directly would be reading the un-adjusted word. */
    'cellularity.quality': 'the raw chip; hyperForAge/hypoForAge are its age-adjusted reading, which is what the criteria ask',
    'cellularity.severity': 'the mild/marked qualifier; no criterion grades cellularity, it only asks which side of the band',
    'drivers.bcrAblStatus': 'the raw four-state chip; drivers.bcrAbl is the tri-state every rule asks for',
    'megakaryocytes.pmfPattern': 'the descriptor-key set behind megakaryocytes.pmf',
    'megakaryocytes.etPattern': 'as above, behind megakaryocytes.et',
    'megakaryocytes.hypolobatedPattern': 'as above, behind megakaryocytes.hypolobated'
};

function dxLeafValue(root, path) {
    return path.split('.').reduce(function (node, key) {
        return node === null || node === undefined ? undefined : node[key];
    }, root);
}

function dxInputPaths(findings) {
    const paths = [];
    (function walk(node, prefix) {
        Object.keys(node).forEach(function (key) {
            const value = node[key];
            const path = prefix ? prefix + '.' + key : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) walk(value, path);
            else paths.push(path);
        });
    })(findings, '');
    return paths;
}

/* The recording proxy. Every property read is logged by full path; objects and
   arrays are wrapped on the way out so the recording follows the rule down.

   `force` substitutes every primitive when it is not undefined, which is what
   drives both sides of a short-circuit. Reading a leaf is recorded BEFORE the
   substitution, so what is measured is the access and never the answer. */
function dxRecordSeen(value, seen, prefix, force) {
    if (!value || typeof value !== 'object') return value;
    return new Proxy(value, {
        get: function (target, key) {
            if (typeof key !== 'string') return target[key];
            const path = prefix ? prefix + '.' + key : key;
            const raw = target[key];
            if (raw && typeof raw === 'object') return dxRecordSeen(raw, seen, path, force);
            if (typeof raw === 'function') return raw.bind(target);
            seen[path] = true;
            return force === undefined ? raw : force;
        }
    });
}

function dxInputCoverageAudit(findings) {
    if (typeof dxRules === 'undefined' || !findings) return { unread: [] };

    /* TWO SWEEPS, because "unread" has two useful meanings and only their
       intersection is a defect. `dxEvaluate` is what SCORES a case; the comment
       builders are what SAY it. A gene-name array read only by a comment ("TET2
       and ASXL1 were identified") is doing its job — it is not a control whose
       clicks do nothing, which is what this audit is for. Sweeping only the
       predicates flagged thirty of those and buried the one real gap.

       A path missed by BOTH is recorded by the form, printed nowhere, and scored
       by nothing. */
    const seen = {};
    [undefined, true, false, null].forEach(function (force) {
        const probe = dxRecordSeen(findings, seen, '', force);
        dxRules.forEach(function (rule) {
            try {
                const result = dxEvaluate(rule, probe);
                ['who', 'icc'].forEach(function (mode) {
                    try { dxComment(result, probe, mode); } catch (e) { /* as below */ }
                });
            } catch (e) { /* a throw still recorded the reads that preceded it */ }
        });
    });

    const unread = dxInputPaths(findings).filter(function (path) {
        if (seen[path] || DX_INPUT_NOT_EVIDENCE[path]) return false;
        /* ARRAY LEAVES ARE NAME LISTS, not findings, and every one in this object
           is the same shape: `mrWHO.genes` beside `mrWHO.present`, `amlDefining
           .keys` beside `amlDefining.present`. The scored form is the sibling; the
           array exists so a comment can say WHICH. They cannot be covered by this
           sweep in any case — the probe substitutes primitives, so an empty array
           stays empty and every `if (genes.length)` branch is unreachable.

           If the assumption ever breaks — an array with no scored sibling — the
           SIBLING is what goes missing, and the sibling is what this audit
           reports. So excluding these loses no coverage of the thing it checks. */
        return !Array.isArray(dxLeafValue(findings, path));
    });

    if (unread.length) {
        console.warn('dxInputCoverageAudit: ' + unread.length + ' recorded finding(s) no rule reads. ' +
            'Each is a control whose clicks cannot move the ranking — fill the gap, or declare it in ' +
            'DX_INPUT_NOT_EVIDENCE with the reason.\n  ' + unread.join('\n  '));
    }
    return { unread: unread };
}
