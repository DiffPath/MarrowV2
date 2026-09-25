/* ============================================================================
   MarrowDxLymphoid.js — the lymphoid axis: is there an infiltrate, and is it
   neoplastic?

   Loads after the myeloid families and after MarrowDxCh.js (it reads no shared
   const from the boundary file, but the axis grouping reads better with the
   whole myeloid table already pushed). See MarrowDxKernel.js for the point
   ladder, the three-valued contract, and `dxAxis` — which this file is the first
   to use, and the note there is the one to read before this one.

   ---------------------------------------------------------------------------
   *** THIS FAMILY CLASSIFIES NOTHING, AND THAT IS THE DESIGN RATHER THAN A
   STAGE IT HAS NOT REACHED YET. ***

   A bone marrow does not classify most lymphoid neoplasms. It answers a
   different and narrower set of questions — is there a lymphoid infiltrate,
   what architecture does it have, does it look reactive or neoplastic, and if a
   lymphoma is already known, is this marrow involved — and those are what the
   four rules below rank. Naming an entity needs an immunophenotype, and this
   app has none: THERE IS NO FLOW CYTOMETRY INPUT ANYWHERE IN IT. The
   immunohistochemistry it does record is a dozen stains with fixed option
   lists, which between them cover CD3, CD20, CD5, cyclin D1, TdT, CD30 and
   Ki-67 — enough to support a suspicion, nowhere near enough to separate CLL
   from mantle cell from marginal zone.

   So every comment here ends by handing the classification off, and no rule
   below carries the name of an entity. The two precedents are already in the
   table and were built the same way for the same reason: MarrowDxPcn.js names
   the plasma cell umbrella and lets the serum studies subclassify, and
   MarrowDxBmf.js gates only on what a marrow can show and states the rest in
   its cautions.

   WHAT WOULD CHANGE THAT is inputs, not rules: a flow cytometry block, the
   missing antibodies (CD10, BCL2, BCL6, CD23, CD200, SOX11, CD25, CD103,
   annexin A1), lymphoid cytogenetics — the abnormality vocabulary is entirely
   myeloid, with no t(14;18), t(11;14) or trisomy 12 — MYD88 / BRAF / STAT3, and
   a lymphoma option on the antecedent-history row, which does not exist even
   though "History of lymphoma" is a template type. Entity rules written before
   those exist would score nothing, which is the defect the last three families
   each turned up in their first run.

   ---------------------------------------------------------------------------
   NO CLASSIFICATION CHAPTER IS PASTED FOR ANY OF THIS. docs/who/ holds fifteen
   myeloid chapters and the ICC paper; it holds no lymphoid text at all, and the
   repo's record is ten pasted sources correcting ten rules written from memory,
   nine of them in the SHAPE of the rule. That record is the reason this family
   asserts a pattern rather than a diagnosis: a pattern is what the reader can
   check against the slide in front of them, where a classification would be
   this app's least verifiable claim.

   ---------------------------------------------------------------------------
   THE FOUR RULES, and they are one decision tree over the same finding:

       no infiltrate          the lymphocyte row says scattered and nothing else
       benign aggregates      an infiltrate whose architecture and cytology are
                              those of a reactive aggregate
       indeterminate          an infiltrate that is neither — the residual
       involvement            an infiltrate with at least one neoplastic feature

   `family: 'lymphoma'` on all four, which is not this file's name and is
   deliberate: dxWorkupBonus (MarrowDxEngine.js) has mapped `ruleOutLymphoma`
   and `historyLymphoma` to that family since before any rule declared it, so
   choosing either on the Specimen tab has been wiring itself to nothing. The
   family string is that wiring's key; `axis: 'lymphoid'` is the separate
   statement about which question these rules answer.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Shared helpers
-------------------------------------------------------------------------- */

/* THE FEATURES THAT TAKE AN INFILTRATE OUT OF THE REACTIVE COLUMN, as one
   Kleene OR so that an unanswered one can never take an answered one away.

   Read the list for what it is: none of these NAMES a neoplasm, and any of them
   makes one likely enough that the marrow should be phenotyped. Paratrabecular
   localisation is the classical one and the only architectural member —
   reactive aggregates sit away from the trabeculae, and the vocabulary records
   the distinction explicitly. `neoplasticAsserted` is the pathologist's own
   verdict read back out of a stain select (see findingLymphoid). */
function dxLymphoidNeoplasticFeature(f) {
    const l = f.lymphoid;
    return dxAnyOf([l.paratrabecular, l.diffuse, l.cd20Diffuse, l.cd5Coexpression,
        l.cyclinD1, l.tdt, l.cytology.atypical, l.neoplasticAsserted]);
}

/* The architecture, as a reader would write it. Built from the descriptor keys
   themselves so the comment and the criteria cannot describe different marrows. */
const DX_LYMPHOID_PATTERN_WORDS = {
    coreLymphFocal: 'focal',
    coreLymphLooseAgg: 'focal loose',
    coreLymphNonparatrabecular: 'focal non-paratrabecular',
    coreLymphParatrabecular: 'focal paratrabecular',
    coreLymphMultifocal: 'multifocal',
    coreLymphDiffuse: 'diffuse'
};

function dxLymphoidPatternText(f) {
    const words = f.lymphoid.pattern.map(function (k) { return DX_LYMPHOID_PATTERN_WORDS[k]; })
        .filter(Boolean);
    if (!words.length) return '';
    /* "diffuse" describes an infiltrate and the rest describe aggregates, so the
       noun has to follow the word rather than being fixed in the sentence. */
    if (f.lymphoid.pattern.length === 1 && f.lymphoid.pattern[0] === 'coreLymphDiffuse') {
        return 'a diffuse lymphoid infiltrate';
    }
    return `${addCommas(words)} lymphoid aggregates`;
}

/* What the smear suggested, named, with the qualifier that keeps it a
   suggestion. Fires only where the pathologist chose one of the entity-shaped
   cytology descriptors. */
function dxLymphoidSuggestsText(f) {
    const phrases = f.lymphoid.cytology.phrases;
    if (!phrases.length) return '';
    return `The cytology raises the possibility of ${addCommas(phrases)}.`;
}

/* THE SENTENCE EVERY RULE IN THIS FAMILY ENDS ON, and the reason the family
   exists in the shape it does. Named studies rather than "further workup":
   flow is the one that subclassifies, immunohistochemistry is what a fixed core
   can still answer when the aspirate is dry or the infiltrate is focal, and
   clonality is the question morphology cannot reach at all. */
const DX_LYMPHOID_PHENOTYPE = 'Subclassification requires immunophenotyping (flow cytometry ' +
    'and/or immunohistochemistry) and, where needed, clonality studies.';

/* Sampling, which is the limitation on every negative this family states. Marrow
   involvement by lymphoma is characteristically focal and can be missed on a
   single core; the statement belongs on the rules that report an absence. */
const DX_LYMPHOID_SAMPLING = 'Lymphoma may involve the marrow focally, so a negative biopsy ' +
    'does not exclude it.';

/* *** A CRITERION THIS APP CAN NEVER ANSWER, DECLARED SO THAT THE VIEW CAN SAY
   SO. ***

   The first run of this family put "Nothing outstanding — every criterion this
   rule states has been answered" in the Further workup column of *involvement by
   a lymphoid neoplasm* — on a marrow whose whole point is that it has not been
   phenotyped. True of the rule as written, and the worst thing this family could
   print: the comment says immunophenotyping is required and the table beside it
   said there was nothing left to do.

   The cause is that the requirement lived only in the comment prose, where the
   Differential view cannot see it. This puts it where the view reads from —
   `result.outstanding` — as a soft criterion that returns null forever, because
   nothing in the app will ever answer it.

   ZERO ON BOTH WEIGHTS, and that is not a placeholder. dxEvaluate only pushes
   evidence for a nonzero weight, so this cannot move a score in either
   direction; it exists to be listed, not to be counted. And it is an `expects`
   rather than a `requires` for the reason the engine's own note gives: a
   permanently unanswered GATE would make `supported` unreachable for these two
   rules forever, where a permanently quiet soft criterion leaves the bucket
   alone. */
const dxLymphoidPhenotypeStep = ['immunophenotypic characterisation of the population by flow ' +
    'cytometry or immunohistochemistry', 0, 0, function () { return null; }];


dxRules.push(
    /* ---- No lymphoid infiltrate ------------------------------------------ */
    {
        id: 'noLymphoidInfiltrate',
        family: 'lymphoma',
        axis: 'lymphoid',
        who: 'No morphologic evidence of a lymphoid neoplasm',
        icc: null,
        /* The top of the band, on the same argument `noNeoplasm` and `noPcn`
           carry: of the marrows that reach this question, most are not
           involved. It leads when nothing else fits and yields the moment
           anything does. */
        prior: 2,
        priorReason: 'most marrows examined for a lymphoid infiltrate do not show one',
        requires: [
            /* BOTH LIMBS, and both must be affirmatively answered. There is no
               Unremarkable chip on the core's lymphocyte row, so this can only
               come out true when the reader has actually recorded the
               interstitial-only reading — which is what that descriptor exists
               to say. An unmentioned row leaves this unknown, and the candidate
               `incomplete`, which is the honest state of a marrow nobody
               examined for the question. */
            ['no lymphoid aggregates', function (f) { return dxNot(f.lymphoid.aggregates); }],
            ['no diffuse lymphoid infiltrate', function (f) { return dxNot(f.lymphoid.diffuse); }]
        ],
        excludes: [
            /* A population the smear called atypical is a finding, wherever the
               sections landed — and it survives a core with no aggregates in it,
               which is exactly the case this exclusion is for. */
            ['an atypical lymphoid population is described on the smear',
                function (f) { return f.lymphoid.cytology.atypical; }],
            /* "immunostains show" AND NOT "…has been identified", which is what
               this said. dxNeedsGenetics (MarrowDxEngine.js) decides `pending`
               versus `incomplete` by matching the outstanding criterion's TEXT,
               and its pattern includes `identified` — so this clause, which is
               answered by an immunostain, was tagging the candidate as awaiting
               the cytogenetics. A coincidental match on one word, and invisible:
               the bucket is right about being unconfirmed and wrong only about
               which study it is waiting for. */
            ['immunostains show a neoplastic B-cell population',
                function (f) { return f.lymphoid.neoplasticAsserted; }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            parts.push('Lymphocytes are scattered singly in the interstitium, without aggregates.');
            if (f.lymphoid.cytology.atypical === false) {
                parts.push('No atypical lymphoid population is identified.');
            }
            parts.push('There is no morphologic evidence of a lymphoid neoplasm.');
            parts.push(DX_LYMPHOID_SAMPLING);
            return parts.filter(Boolean).join(' ');
        }
    },

    /* ---- Benign lymphoid aggregates -------------------------------------- */
    {
        id: 'lymphoidAggregates',
        family: 'lymphoma',
        axis: 'lymphoid',
        who: 'Benign lymphoid aggregates',
        icc: null,
        /* Common, and commoner with age — a frequent incidental finding in
           marrows taken for something else entirely. A tier below
           `noLymphoidInfiltrate` because it needs a positive finding. */
        prior: 1,
        priorReason: 'benign lymphoid aggregates are a common incidental finding, increasingly so with age',
        requires: [
            ['lymphoid aggregates present', function (f) { return f.lymphoid.aggregates; }]
        ],
        excludes: [
            /* A DIFFUSE INFILTRATE IS NOT AN AGGREGATE. The word "benign" in this
               rule's name is doing the work: whatever a diffuse lymphoid
               infiltrate turns out to be, it is not the incidental nodule this
               category describes, and offering the benign reading for it would
               be the one error in this family with a real cost. */
            ['a diffuse lymphoid infiltrate is present',
                function (f) { return f.lymphoid.diffuse; }],
            /* "immunostains show" AND NOT "…has been identified", which is what
               this said. dxNeedsGenetics (MarrowDxEngine.js) decides `pending`
               versus `incomplete` by matching the outstanding criterion's TEXT,
               and its pattern includes `identified` — so this clause, which is
               answered by an immunostain, was tagging the candidate as awaiting
               the cytogenetics. A coincidental match on one word, and invisible:
               the bucket is right about being unconfirmed and wrong only about
               which study it is waiting for. */
            ['immunostains show a neoplastic B-cell population',
                function (f) { return f.lymphoid.neoplasticAsserted; }]
        ],
        expects: [
            /* PARATRABECULAR LOCALISATION IS AN `expects` AND NOT AN EXCLUSION,
               though the teaching is near-categorical — reactive aggregates lie
               away from the trabeculae. The kernel's own test decides it: a
               clause may gate only if it is a PARTITION or is ALWAYS ANSWERED,
               and this is neither, because the vocabulary's unqualified "focal
               aggregates" leaves it unknown on most cases. As a gate it would
               drop this candidate off the list silently whenever somebody DID
               record paratrabecular; as a soft criterion the card stays on
               screen with "non-paratrabecular localisation (not met) −4"
               printed, which is the reader seeing the argument rather than its
               conclusion. */
            ['non-paratrabecular localisation', 3, -4, function (f) {
                return dxNot(f.lymphoid.paratrabecular);
            }],
            ['a polymorphous or reactive-appearing population', 2, -2, function (f) {
                return f.lymphoid.cytology.reactive;
            }],
            /* `for: 0` because it is an absence: nearly every marrow in this
               differential has no atypical population described, so the finding
               separates this candidate from none of them. The whole weight is on
               the `against`, where one that DOES have one is a real argument.
               dxLikelihoodAudit warns on any other combination. */
            ['no atypical lymphoid population described', 0, -3, function (f) {
                return dxNot(f.lymphoid.cytology.atypical);
            }]
        ],
        supports: [
            /* The B-cell fraction, where somebody counted it. A CD20 percentage
               is not a criterion anywhere and is legitimately soft evidence: a
               reactive aggregate is a mixed population, and a small B-cell
               fraction is what mixed looks like. The 20% is this file's, chosen
               low on purpose and doing nothing but scoring. */
            ['a small B-cell fraction on CD20', 1, function (f) {
                return dxBelow(f.lymphoid.cd20Pct, 20);
            }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            const pattern = dxLymphoidPatternText(f);
            parts.push(pattern
                ? `Sections show ${pattern}.`
                : 'Sections show lymphoid aggregates.');
            /* NO SEPARATE "the aggregates are non-paratrabecular" SENTENCE. It
               was here, and it printed directly after a pattern line that had
               just said the same word: "Sections show focal non-paratrabecular
               lymphoid aggregates. The aggregates are non-paratrabecular." The
               finding can only ever be false because the reader chose the
               non-paratrabecular descriptor, and that descriptor is already in
               the pattern text — so the sentence had no case where it added
               anything. */
            if (f.lymphoid.cytology.reactive === true) {
                parts.push('The lymphocytes are polymorphous, without cytologic atypia.');
            }
            parts.push('The findings are consistent with benign lymphoid aggregates.');
            return parts.filter(Boolean).join(' ');
        },
        /* THE TWO THINGS A BENIGN CALL HAS TO SAY OUT LOUD, and the second is
           the one that matters: this is a morphologic reading, and a low-grade
           lymphoma can look exactly like it. */
        caution: function (f) {
            return f.templateType === 'historyLymphoma'
                ? 'Given the history of lymphoma, immunohistochemistry is recommended to exclude ' +
                  'partial involvement.'
                : 'A low-grade lymphoma can appear reactive; immunohistochemistry is recommended if ' +
                  'lymphoma is known or suspected.';
        },
        check: function () {
            return 'Numerous, large or paratrabecular aggregates favor immunophenotyping even ' +
                'without a known lymphoma.';
        }
    },

    /* ---- Involvement by a lymphoid neoplasm ------------------------------- */
    {
        id: 'lymphoidInvolvement',
        family: 'lymphoma',
        axis: 'lymphoid',
        who: 'Involvement by a lymphoid neoplasm',
        icc: null,
        prior: 0,
        priorReason: 'a definite lymphoid infiltrate is an uncommon finding outside a lymphoma workup',
        requires: [
            ['a lymphoid infiltrate is present', function (f) { return f.lymphoid.infiltrate; }],
            /* THE GATE THAT KEEPS EVERY REACTIVE AGGREGATE OUT. Without it the
               rule's only criterion would be "there is an infiltrate", which is
               true of the commonest benign finding in this table — and a card
               offering involvement by a neoplasm on a nodule of reactive
               lymphocytes is the one output this family must not produce. */
            ['at least one feature suggesting a neoplastic population',
                dxLymphoidNeoplasticFeature]
        ],
        expects: [
            /* THE CLASSICAL ARCHITECTURAL FINDING. A large `for` because it is
               rare in the field this rule competes with — a reactive aggregate
               is essentially never paratrabecular — and a SMALL `against`
               because plenty of marrow involvement is not paratrabecular either:
               it is the pattern of follicular lymphoma above all, and its
               absence argues very little. The two weights answer the two
               different questions the kernel's note sets out. */
            ['paratrabecular localisation', 4, -1, function (f) {
                return f.lymphoid.paratrabecular;
            }],
            dxLymphoidPhenotypeStep
        ],
        supports: [
            ['a diffuse or interstitial lymphoid infiltrate', 3, function (f) {
                return dxAnyOf([f.lymphoid.diffuse, f.lymphoid.cd20Diffuse]);
            }],
            ['multifocal aggregates', 1, function (f) { return f.lymphoid.multifocal; }],
            /* THE IMMUNOSTAINS, and each is scored for what it establishes
               rather than for the entity it points at. CD5 coexpression and
               cyclin D1 positivity are both read off options whose own wording
               is "in neoplastic B cells" — the pathologist has already made the
               call, and the score should say so. TdT is the same statement for a
               precursor process. */
            ['CD5 coexpression on B cells', 4, function (f) { return f.lymphoid.cd5Coexpression; }],
            ['cyclin D1 positivity in B cells', 4, function (f) { return f.lymphoid.cyclinD1; }],
            ['TdT positivity, indicating a precursor process', 4, function (f) {
                return f.lymphoid.tdt;
            }],
            ['CD30-positive large atypical cells', 2, function (f) { return f.lymphoid.cd30; }],
            ['a high proliferation index', 2, function (f) { return f.lymphoid.ki67High; }],
            ['an atypical population on the smear', 2, function (f) {
                return f.lymphoid.cytology.atypical;
            }],
            ['an absolute lymphocytosis', 1, function (f) { return f.counts.lymphocytosis; }]
        ],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            const pattern = dxLymphoidPatternText(f);
            if (pattern) parts.push(`Sections show ${pattern}.`);
            if (f.lymphoid.cd20Pct !== null) {
                parts.push(`CD20 highlights the infiltrate (about ${dxPct(f.lymphoid.cd20Pct)}% ` +
                    `of cellularity).`);
            }
            /* THE BLOOD COUNT, QUOTED RATHER THAN CHARACTERISED. An absolute
               lymphocytosis beside a marrow infiltrate is the context a reader
               wants, and the NUMBER is what they want — this app publishes no
               threshold for it (see counts.lymphocytosis), so a sentence saying
               "there is a lymphocytosis" would be the laboratory's flag wearing
               this report's voice. The count says it and the reader judges it. */
            if (f.counts.lymphocytosis === true && f.counts.lymphocyteAbs !== null) {
                parts.push(`The blood shows an absolute lymphocytosis ` +
                    `(${f.counts.lymphocyteAbs} ×10⁹/L).`);
            }
            if (f.lymphoid.cd5Coexpression === true) {
                parts.push('The B cells coexpress CD5.');
            }
            if (f.lymphoid.cyclinD1 === true) {
                parts.push('The B cells are positive for cyclin D1.');
            }
            if (f.lymphoid.tdt === true) {
                parts.push('The population is TdT-positive.');
            }

            /* THE CLASSIFICATION SENTENCE, IN THE ONLY MOOD THE INPUTS SUPPORT.
               "Involvement by a lymphoid neoplasm" is as far as this goes, and
               the next sentence says why. */
            parts.push(f.templateType === 'historyLymphoma'
                ? 'The findings are consistent with involvement by the patient\'s known lymphoma; ' +
                  'comparison with the prior material is recommended.'
                : 'The findings are consistent with marrow involvement by a lymphoid neoplasm.');
            parts.push(dxLymphoidSuggestsText(f));
            parts.push(DX_LYMPHOID_PHENOTYPE);
            return parts.filter(Boolean).join(' ');
        },
        caution: function (f) {
            if (f.lymphoid.tdt !== true) return '';
            return 'Flow cytometry is needed to distinguish a lymphoblastic neoplasm from ' +
                'hematogones.';
        },
        check: function (f) {
            const notes = [];
            /* PARATRABECULAR IS NOT A DIAGNOSIS, and it is the finding most
               likely to be over-read as one. */
            if (f.lymphoid.paratrabecular === true) {
                notes.push('Paratrabecular aggregates favor but are not specific for follicular ' +
                    'lymphoma.');
            }
            /* Extent is a reporting requirement for staging marrows. */
            notes.push('Estimate the extent of involvement on the core; it is not derived here.');
            return notes.join(' ');
        }
    },

    /* ---- The residual ----------------------------------------------------- */
    {
        id: 'lymphoidIndeterminate',
        family: 'lymphoma',
        axis: 'lymphoid',
        who: 'Atypical lymphoid infiltrate of uncertain significance',
        icc: null,
        /* THE RESIDUAL OF THIS AXIS, declared so dxResidualCategory demotes it
           whenever a better-fitting lymphoid candidate exists — the flag that
           replaced that function's hard-coded `mpnU`. It has the same property
           MPN-NOS has and for the same reason: it asks almost nothing, so it is
           the easiest rule in the family to satisfy completely, and "completely
           satisfied" must not read as "confirmed" for a category whose whole
           content is that the question is open. */
        residual: true,
        prior: 0,
        priorReason: 'the honest answer whenever an infiltrate is neither clearly reactive nor clearly neoplastic',
        requires: [
            ['a lymphoid infiltrate is present', function (f) { return f.lymphoid.infiltrate; }]
        ],
        expects: [dxLymphoidPhenotypeStep],
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') {
                parts.push(DX_ADDENDUM_LEAD);
            }
            const pattern = dxLymphoidPatternText(f);
            if (pattern) parts.push(`Sections show ${pattern}.`);
            parts.push('The infiltrate cannot be classified as reactive or neoplastic on ' +
                'morphology.');
            parts.push(dxLymphoidSuggestsText(f));
            parts.push(DX_LYMPHOID_PHENOTYPE);
            return parts.filter(Boolean).join(' ');
        }
    }
);
