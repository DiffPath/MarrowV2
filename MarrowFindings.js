/* ============================================================================
   MarrowFindings.js — one normalised, three-valued view of the whole case

   `marrowFindings()` reads every tab through its own public seam and returns a
   single object. The diagnosis engine scores against THAT and never touches the
   DOM, which is the whole reason this file exists: a rule that reached into
   #aspPanel would tie a classification table to one tab's id scheme, and the
   rules are the part most likely to be rewritten.

   So this is deliberately the ONE file that knows other tabs' group names
   ('aspErythDesc', 'coreCellularity', 'aspStain'). Group names are the sanctioned
   public vocabulary — CLAUDE.md says read a toggle group by its group, never by
   guessing member ids — so the coupling is to the stable half.

   ---------------------------------------------------------------------------
   EVERY FIELD IS THREE-VALUED: true / false / null, where **null means nobody
   has said**. Not "no", not "zero". This is the single property the engine's
   correctness rests on — a criterion nobody answered must not quietly satisfy or
   quietly fail a gate — and it is the same distinction the counter already draws
   between `[0, 0]` ("normal is none") and `null` ("no reference known").

   Numbers follow the same rule: `null` for absent, never NaN and never 0. The
   tabs are not consistent about this at their own boundaries — `stainPercent()`
   returns null where `coreNum()` returns NaN — and normalising that is part of
   this file's job.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Small helpers
-------------------------------------------------------------------------- */

/* A toggle group as a three-valued answer: null when untouched, otherwise
   whether the value is in `yes`. `no` is listed explicitly rather than inferred
   as "anything else", so a value nobody thought about reads as unknown instead
   of as a negative. */
function findingFromToggle(group, yes, no) {
    const value = toggleGroupValue(group);
    if (!value) return null;
    if (yes.indexOf(value) !== -1) return true;
    if (no.indexOf(value) !== -1) return false;
    return null;
}

function findingNumber(value) {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
}

function findingChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked === true : false;
}

/* first non-null. For findings a later specimen can supply when an earlier one
   could not — the core rescuing a dry aspirate. */
function findingFirst() {
    for (let i = 0; i < arguments.length; i++) {
        if (arguments[i] !== null && arguments[i] !== undefined) return arguments[i];
    }
    return null;
}


/* ----------------------------------------------------------------------------
   Dysplasia

   WHICH DESCRIPTORS ARE DYSPLASIA is a clinical judgement and is written out
   here rather than inferred, because the descriptor vocabulary mixes dysplastic
   features with reactive and architectural ones. `shiftToImmaturity` is a left
   shift, not dysplasia; `toxicChanges` is explicitly reactive (see the note in
   MarrowDescriptors.js); `coreErythroidIslands` is architecture. Naming one of
   those must not make a lineage count toward a classification that requires
   dysplasia.
-------------------------------------------------------------------------- */

const dysplasticDescriptors = {
    erythroid: ['nuclearBudding', 'nuclearContourIrregularity', 'multinucleation', 'megaloblastoid'],
    myeloid: ['hypogranularForms', 'monolobatedForms', 'hypolobatedForms', 'hypersegmentedForms'],
    megakaryocytic: ['widelySeparatedNuclearLobes', 'separationNuclearLobes', 'hypolobatedForms',
                     'smallHypolobated', 'micromegakaryocytes', 'largeHypersegmented',
                     'hypersegmentedForms']
};

/* WHICH DESCRIPTORS MEAN AUER RODS — the same kind of clinical judgement as
   dysplasticDescriptors above, and written out here for the same reason: a
   bundle of Auer rods is Auer rods, so naming one names the other, and a rule
   that read only `blastAuerRods` would miss the case where the pathologist
   described the bundles instead.

   Both blast groups are read, blood and aspirate. A rod seen on either slide is a
   rod: WHO-HAEM5's MDS-IB2 criterion says only "with the presence of Auer rods"
   and names no specimen. */
const AUER_ROD_DESCRIPTORS = ['blastAuerRods', 'blastAuerBundles'];

/* MYELODYSPLASIA-RELATED (MR) GENE MUTATIONS — a DRAFT, verify against WHO-HAEM5
   (Khoury 2022) and ICC 2022 (Arber 2022) before trusting it, like everything
   else classification-shaped in this app.

   A mutation in one of these defines the "myelodysplasia-related" qualifier, and
   at >=10% blasts drives ICC's *MDS/AML with myelodysplasia-related gene
   mutations* (10-19%) and *AML with myelodysplasia-related gene mutations*
   (>=20%), and WHO's *AML, myelodysplasia-related* (>=20%).

   The two classifications DIVERGE by one gene, which is the whole reason the list
   is split: the eight-gene core is shared, and ICC additionally counts RUNX1
   where WHO-HAEM5 dropped RUNX1-mutated as a defining lesion. A RUNX1 mutation
   alone is therefore MR by ICC and not by WHO — kept apart so a comment names the
   right classification. All nine are on the assay panel. */
const MR_GENES_CORE = ['ASXL1', 'BCOR', 'EZH2', 'SF3B1', 'SRSF2', 'STAG2', 'U2AF1', 'ZRSR2'];
const MR_GENES_WHO = MR_GENES_CORE;
const MR_GENES_ICC = MR_GENES_CORE.concat(['RUNX1']);

/* THE CORE SPLICEOSOME, MINUS SF3B1 — and the omission is the point, not an
   oversight. "The presence of a mutation in a spliceosome component in a case
   with wildtype SF3B1 excludes MDS-SF3B1" (MDS with low blasts and SF3B1
   mutation), so what this list has to answer is "some OTHER splicing gene", and
   including SF3B1 would make the clause exclude the entity it defines.

   Three genes, because those are the ones the chapter's own reasoning is about
   and the ones a myeloid panel reports: cases with ring sideroblasts and
   wildtype SF3B1 "usually have mutations in other genes that control RNA
   splicing", whose optimal classification the chapter says is unclear. Note all
   three are ALSO myelodysplasia-related genes; that overlap is a fact about the
   genes and not a shared meaning, which is why this is its own list rather than
   a filter over MR_GENES_CORE. */
const SPLICEOSOME_GENES_NON_SF3B1 = ['SRSF2', 'U2AF1', 'ZRSR2'];

/* Co-mutations that worsen the outcome of an otherwise favorable MDS-SF3B1.
   PROGNOSTIC ONLY — none of these classifies anything, and none is scored; they
   exist so a comment can say the good prognosis this entity is known for may not
   apply to this case.

   Two generations of evidence, merged: the initial data implicating TP53, RUNX1,
   EZH2 and FLT3, and the IPSS-M analysis (Bernard, NEJM Evid 2022) adding BCOR,
   BCORL1, NRAS, SRSF2 and STAG2. RUNX1 appears in both. */
const SF3B1_ADVERSE_CO_GENES = ['TP53', 'RUNX1', 'EZH2', 'FLT3', 'BCOR', 'BCORL1',
    'NRAS', 'SRSF2', 'STAG2'];

/* THE CLONAL HEMATOPOIESIS DRIVER GENES — WHO-HAEM5 Table 2.02, transcribed
   whole. This is the criterion CHIP is predicated on, so a partial copy would be
   worse than none: a real driver left off would silently read as a passenger.
   Either all of it or nothing, and it is all of it.

   `tier` is the table's own split: 'common' for the twenty-one genes it heads
   "Common and/or clinically significant", 'other' for the rest. Recorded because
   it is free and it is the table's judgement, not the app's.

   THE OTHER FIELDS ARE THE "criteria for classification as a driver mutation"
   COLUMN, in the four shapes it actually takes:

       truncating  frameshift / nonsense / splice-site anywhere in the gene
       ranges      missense within these amino-acid ranges, inclusive
       positions   missense at these specific residues
       changes     these named protein changes and no others

   A gene may carry several — TP53 takes truncating changes anywhere AND missense
   at p.72, p.95-288 and p.337.

   `exon` IS A CRITERION THIS APP CANNOT CHECK and is recorded to say so rather
   than to enforce it. Where the table restricts truncating changes to named exons
   (ASXL1 11-12, PPM1D 5/6, CALR 9, NOTCH1 26-34), a variant string carries no exon
   number, so the class match is accepted and the limitation is stated at the point
   of use. It is the same honesty cebpaBzip already practises: guessing is the one
   thing that is not allowed. */
const CH_DRIVER_TABLE = {
    /* ---- Common and/or clinically significant ---------------------------- */
    DNMT3A:  { tier: 'common', truncating: true, ranges: [[292, 350], [482, 614], [634, 912]] },
    TET2:    { tier: 'common', truncating: true, ranges: [[1104, 1481], [1843, 2002]] },
    ASXL1:   { tier: 'common', truncating: true, exon: 'exons 11–12' },
    JAK2:    { tier: 'common', changes: ['V617F'], ranges: [[536, 547]] },
    TP53:    { tier: 'common', truncating: true, positions: [72, 337], ranges: [[95, 288]] },
    SF3B1:   { tier: 'common', ranges: [[529, 1201]] },
    PPM1D:   { tier: 'common', truncating: true, exon: 'exon 5/6' },
    SRSF2:   { tier: 'common', positions: [95] },
    IDH1:    { tier: 'common', positions: [132] },
    IDH2:    { tier: 'common', positions: [140, 172] },
    U2AF1:   { tier: 'common', positions: [34, 156, 157] },
    KRAS:    { tier: 'common', positions: [12, 13, 61, 146] },
    NRAS:    { tier: 'common', positions: [12, 13, 61] },
    CTCF:    { tier: 'common', truncating: true, changes: ['R377C', 'R377H', 'P378A', 'P378L'] },
    CBL:     { tier: 'common', ranges: [[345, 434]] },
    GNB1:    { tier: 'common', positions: [53, 57, 81] },
    BRCC3:   { tier: 'common', truncating: true },
    PTPN11:  { tier: 'common', ranges: [[58, 76], [491, 510]] },
    GNAS:    { tier: 'common', positions: [201] },
    BCOR:    { tier: 'common', truncating: true },
    BCORL1:  { tier: 'common', truncating: true },

    /* ---- Other ----------------------------------------------------------- */
    BRAF:    { tier: 'other', ranges: [[590, 615]], positions: [469] },
    CALR:    { tier: 'other', truncating: true, exon: 'exon 9' },
    CEBPA:   { tier: 'other', truncating: true },
    CREBBP:  { tier: 'other', truncating: true },
    CSF1R:   { tier: 'other', positions: [301, 969] },
    CSF3R:   { tier: 'other', truncating: true, changes: ['T615A', 'T618I'], exon: 'c.741-791' },
    CUX1:    { tier: 'other', truncating: true },
    ETV6:    { tier: 'other', truncating: true },
    EZH2:    { tier: 'other', truncating: true, ranges: [[617, 732]] },
    GATA2:   { tier: 'other', truncating: true,
               changes: ['R293Q', 'N317H', 'A318T', 'A318V', 'A318G', 'G320D', 'L321P', 'L321F',
                         'L321V', 'Q328P', 'R330Q', 'R361L', 'L359V', 'A372T', 'R384G', 'R384K'] },
    JAK3:    { tier: 'other',
               changes: ['M511T', 'M511I', 'A572V', 'A572T', 'A573V', 'R657Q', 'V715I', 'V715A'] },
    KDM6A:   { tier: 'other', truncating: true },
    /* KIT's row also lists insertions and deletions (ins503, del560, del579,
       del551-559) that a change string does not express as a substitution; they
       fall through to "could not be matched", which is the honest answer. */
    KIT:     { tier: 'other',
               changes: ['V559A', 'V559D', 'V559G', 'V559I', 'V560D', 'V560A', 'V560G', 'V560E',
                         'E561K', 'P627L', 'P627T', 'R634W', 'K642E', 'K642Q', 'V654A', 'V654E',
                         'H697Y', 'H697D', 'E761D', 'K807R', 'D816H', 'D816Y', 'D816F', 'D816I',
                         'D816V'] },
    KMT2A:   { tier: 'other', truncating: true },
    MPL:     { tier: 'other',
               changes: ['S505G', 'S505N', 'S505C', 'L510P', 'W515A', 'W515R', 'W515K', 'W515S',
                         'W515L', 'A519T', 'A519V', 'Y591D'] },
    MYD88:   { tier: 'other', changes: ['L265P'] },
    NOTCH1:  { tier: 'other', truncating: true, exon: 'exons 26–34' },
    PHF6:    { tier: 'other', truncating: true },
    PIGA:    { tier: 'other', truncating: true },
    PRPF40B: { tier: 'other', truncating: true },
    PTEN:    { tier: 'other', truncating: true },
    RAD21:   { tier: 'other', truncating: true },
    RUNX1:   { tier: 'other', truncating: true,
               changes: ['S73F', 'H78Q', 'H78L', 'R80C', 'R80P', 'R80H', 'L85Q', 'P86L', 'P86H',
                         'S114L', 'D133Y', 'L134P', 'R135G', 'R135K', 'R135S', 'R139Q', 'R142S',
                         'A165V', 'R174Q', 'R177L', 'R177Q', 'A224T', 'D171G', 'D171V', 'D171N',
                         'R205W', 'R223C'] },
    SETBP1:  { tier: 'other',
               changes: ['D868N', 'D868T', 'S869N', 'G870S', 'I871T', 'D880N', 'D880Q'] },
    SF1:     { tier: 'other', truncating: true },
    SF3A1:   { tier: 'other', truncating: true },
    SMC1A:   { tier: 'other', positions: [96, 586] },
    SMC3:    { tier: 'other', truncating: true },
    STAG2:   { tier: 'other', truncating: true },
    STAT3:   { tier: 'other', ranges: [[580, 670]] },
    U2AF2:   { tier: 'other', ranges: [[149, 231], [259, 337], [381, 462]] },
    WT1:     { tier: 'other', truncating: true },
    ZRSR2:   { tier: 'other', truncating: true }
};

/* THE GENES THE CHAPTERS NAME IN PROSE as carrying a greater risk of progression
   to a myeloid malignancy. They are prognostic, not diagnostic: they belong in
   the comment and must not score, because a high-risk gene does not make clonal
   hematopoiesis a likelier answer than any other clone would.

   TWO LISTS, BECAUSE THE TWO CHAPTERS PUBLISH TWO LISTS. This was one list — the
   CHIP chapter's — printed by dxChRiskText() on the CHIP comment AND the CCUS
   comment, so a CCUS case named the wrong genes. The CCUS chapter's own sentence
   adds PPM1D, JAK2 and RUNX1 and drops ASXL1:

     CHIP  "greater for CHIP driven by mutations in TP53, U2AF1, SRSF2, IDH2,
            IDH1, SF3B1, and ASXL1"
     CCUS  "the presence of specific gene mutations such as those in TP53, PPM1D,
            JAK2, RUNX1, SF3B1, SRSF2, U2AF1, IDH2, and IDH1"

   Different entities, different cohorts, different follow-up — so the overlap is
   a fact about the biology and not a reason to merge them. Each is printed by the
   comment of the entity whose chapter published it. */
const CH_HIGH_RISK_GENES = ['TP53', 'U2AF1', 'SRSF2', 'IDH2', 'IDH1', 'SF3B1', 'ASXL1'];
const CCUS_HIGH_RISK_GENES = ['TP53', 'PPM1D', 'JAK2', 'RUNX1', 'SF3B1', 'SRSF2', 'U2AF1', 'IDH2', 'IDH1'];

/* THE X-LINKED HALF OF THE CLONE-SIZE CRITERION, which is a correction and not a
   stricter bar. CHIP asks for a variant allele fraction >=2%, and >=4% for an
   X-linked gene in a male patient: a hemizygous X reads at twice the allele
   fraction an autosomal mutation in the same clone would, so 4% there and 2% here
   are the same number of cells.

   These are the X-linked genes a myeloid panel actually reports. Three of them
   (BCOR, STAG2, ZRSR2) are already myelodysplasia-related genes and UBA1 is the
   VEXAS gene, so this is not an exotic corner of the panel. */
const CH_X_LINKED_GENES = ['ATRX', 'BCOR', 'BCORL1', 'KDM6A', 'PHF6', 'STAG2', 'UBA1', 'ZRSR2'];

/* THE MYELODYSPLASIA-RELATED CYTOGENETIC ABNORMALITIES, and the same divergence
   arriving through the karyotype instead of the panel — VERIFIED against both
   primary papers (WHO-HAEM5: Khoury, Leukemia 2022, Table 8; ICC 2022: Arber,
   Blood 2022;140:1200), and since re-verified against WHO's own Box 2.25
   (docs/who/aml-mr.md), which matches MR_CYTO_WHO entry for entry and carries
   the ISCN counting rules for what "complex" means.

   THE TWO LISTS DIFFER IN BOTH DIRECTIONS, which is why neither can be a flag on
   the other:

       WHO only   del(11q), −13/del(13q)
       ICC only   +8, del(20q)
       shared     complex, del(5q), −7/del(7q), del(12p), del(17p), i(17q), idic(X)(q13)

   A case whose sole abnormality is del(11q) is therefore AML-MR by WHO-HAEM5 and
   not by ICC, and one with isolated +8 is the reverse. That is the same shape as
   the RUNX1 split above and is handled the same way: two lists, and the comment
   names whichever classification actually applies.

   WHO'S LIST IS SHORTER THAN WHO-HAEM4R'S AND AN OLD ONE MUST NOT BE CARRIED
   FORWARD. The balanced translocations that used to qualify — t(11;16), t(3;21),
   t(1;3), t(2;11), t(5;12), t(5;7), t(5;17), t(5;10), t(3;5) — and −Y are gone
   from both. del(9q) appears in neither primary paper and was a spurious entry in
   at least one secondary summary; it is deliberately absent here. */
const MR_CYTO_SHARED = ['complex', 'del5q', 'minus7', 'del12p', 'del17p', 'i17q', 'idicX'];
const MR_CYTO_WHO = MR_CYTO_SHARED.concat(['del11q', 'minus13']);
const MR_CYTO_ICC = MR_CYTO_SHARED.concat(['trisomy8', 'del20q']);

/* THE CMML MUTATION LANDSCAPE — WHO-HAEM5 Table 2.13, the chapter's recommended
   minimal gene set for mutation profiling in the workup for CMML, in the table's
   own four pathway groups and its own order.

   IT IS A LIKELIHOOD LIST AND NEVER A GATE. "Mutations impacting one or more of
   these cellular processes have been reported in as many as 91.8% of patients
   with CMML" is a frequency, not a criterion, and every gene here is also mutated
   in MDS — so a hit says "myeloid neoplasm of this family", not "CMML". The one
   place a gene list IS a criterion is the oligomonocytic band; that is the
   starred subset below, and it is deliberately a second list rather than a flag
   on this one.

   PTPN11 is the chapter's prose ("signal transduction: NRAS, KRAS, CBL, PTPN11")
   and is not in the table; it is kept, because a likelihood list is allowed to be
   the whole of what the chapter says. NPM1 is in the table and is kept for the
   same reason, even though an NPM1-mutated case is excluded from this rule
   outright (WHO-HAEM5 classifies it as AML with mutated NPM1) — the exclusion is
   the rule's job, and a landscape list that quietly dropped a gene the table
   prints would be the harder thing to check. */
const CMML_GENES = [
    'TET2', 'ASXL1', 'DNMT3A', 'EZH2', 'IDH1', 'IDH2', 'BCOR',      // epigenetic regulation
    'SRSF2', 'U2AF1', 'SF3B1', 'ZRSR2',                             // spliceosome
    'CBL', 'KRAS', 'NRAS', 'NF1', 'JAK2', 'PTPN11',                 // cellular signalling
    'RUNX1', 'SETBP1', 'NPM1', 'FLT3'                               // other
];

/* THE STARRED GENES OF TABLE 2.13, and the one place in this entity where a gene
   list is a criterion rather than a frequency. Footnote a: "Mutations involving
   one or more of these genes are required to meet desirable criterion 2 if
   absolute monocyte count is ≥ 0.5 × 10⁹/L but < 1 × 10⁹/L."

   So in the oligomonocytic band the clonality criterion HARDENS TWICE OVER: it is
   mandatory there (rather than one of three), and it stops accepting clonality of
   any kind. An abnormal karyotype alone does not meet it, and neither does a
   mutation in TET2 or DNMT3A — the two commonest genes in the disease, and the
   two most often found in age-related clonal hematopoiesis, which is exactly
   what the footnote is guarding the low band against. */
const CMML_DESIRABLE_GENES = ['ASXL1', 'EZH2', 'BCOR', 'SRSF2', 'U2AF1', 'SF3B1',
    'ZRSR2', 'CBL', 'KRAS', 'NRAS', 'RUNX1', 'SETBP1'];

/* The abnormalities that DEFINE an acute myeloid leukemia type, from WHO-HAEM5's
   Table 7. Naming one of these is the finding that takes a case out of the
   myelodysplastic categories outright — in WHO-HAEM5 at ANY blast count, which is
   the single most consequential thing about this list and the reason it exists as
   a set rather than as eight separate gate clauses. See dxGate.noAmlDefining. */
const AML_DEFINING_ABN = ['pmlRara', 'runx1Runx1t1', 'cbfbMyh11', 'dekNup214',
    'rbm15Mrtfa', 'kmt2a', 'mecom', 'nup98'];

/* One lineage, from one descriptor group.

   The three-way answer is already guaranteed by the form layer: the Unremarkable
   stop chip and a named descriptor clear each other (MarrowForm.js's stopgroup
   handler and MarrowDescriptors.js's select bridge), so "assessed and normal" and
   "assessed with findings" cannot both be true, and neither means untouched.

   `pct` is the optional per-lineage percentage. Given, it decides the >=10%
   question properly; blank, we fall back to "a dysplastic feature was named",
   which is the weaker claim actually in hand — and `atLeast10` records which of
   the two answered, so a comment can avoid implying a count nobody made.

   `specimen` is a SEPARATE field from `basis` and must stay one. Both look like
   "where did this answer come from" and they are different questions: basis says
   HOW it was answered (counted / named / assessed), specimen says WHICH SLIDE it
   was seen on. Megakaryocytes can be answered from the core, and folding that into
   `basis` overwrote the one thing basis exists to carry — on the exact path an MPN
   case takes, since the core is where megakaryocyte morphology is read. */
function findingLineage(group, stopId, pctId, lineage, specimen) {
    const named = descriptorSelected(group);
    const wanted = dysplasticDescriptors[lineage] || [];
    const features = named.filter(function (key) { return wanted.indexOf(key) !== -1; });

    let state = null;
    if (findingChecked(stopId)) state = 'none';
    else if (named.length) state = features.length ? 'present' : 'other';

    const pct = pctId ? findingNumber(document.getElementById(pctId)?.value) : null;

    let atLeast10 = null;
    let basis = null;
    if (pct !== null) { atLeast10 = pct >= 10; basis = 'counted'; }
    else if (state === 'present') { atLeast10 = true; basis = 'named'; }
    else if (state === 'none' || state === 'other') { atLeast10 = false; basis = 'assessed'; }

    return { state: state, features: features, pct: pct, atLeast10: atLeast10,
             basis: basis, specimen: specimen };
}

function findingDysplasia() {
    const eryth = findingLineage('aspErythDesc', 'aspErythDescUnremarkable', 'aspErythDysPct', 'erythroid', 'aspirate');
    const myeloid = findingLineage('aspMyeloidDesc', 'aspMyeloidDescUnremarkable', 'aspMyeloidDysPct', 'myeloid', 'aspirate');
    const mega = findingLineage('aspMegDesc', 'aspMegDescUnremarkable', 'aspMegaDysPct', 'megakaryocytic', 'aspirate');

    /* The core can answer for megakaryocytes when the aspirate could not — a dry
       or paucicellular aspirate is exactly when the section carries the
       morphology. Only consulted when the aspirate said nothing at all. */
    if (mega.atLeast10 === null) {
        const core = findingLineage('coreMegDesc', 'coreMegDescUnremarkable', null, 'megakaryocytic', 'core');
        if (core.atLeast10 !== null) return summariseDysplasia(eryth, myeloid, core);
    }
    return summariseDysplasia(eryth, myeloid, mega);
}

function summariseDysplasia(erythroid, myeloid, megakaryocytic) {
    const lineages = [erythroid, myeloid, megakaryocytic];
    const known = lineages.filter(function (l) { return l.atLeast10 !== null; });
    const positive = lineages.filter(function (l) { return l.atLeast10 === true; });

    return {
        erythroid: erythroid,
        myeloid: myeloid,
        megakaryocytic: megakaryocytic,
        /* How many lineages are dysplastic. `null` only when NOTHING was assessed
           — once any lineage has an answer the count is a real floor, and a floor
           is what the criteria actually need ("dysplasia in >=1 lineage"). */
        count: known.length ? positive.length : null,
        assessed: known.length,
        /* Is there dysplasia anywhere? true as soon as one lineage says so; false
           only when every lineage was assessed and none did; null while any
           lineage is still unassessed and none is positive. */
        any: positive.length ? true : (known.length === 3 ? false : null)
    };
}


/* ----------------------------------------------------------------------------
   Blasts

   The counted differential is the source of truth. CD34 is a fallback for the
   case the fallback exists for — a dry tap, where there is no aspirate to count
   and the section is all there is. It is recorded as a separate basis so a
   comment can say which one it is; an immunohistochemical estimate and a 500-cell
   count are not the same claim.

   WHAT IS COUNTED HERE IS BLASTS AND BLAST EQUIVALENTS, not blasts. Every myeloid
   criterion this file feeds — the 20% acute-leukemia boundary, MDS-IB1/IB2, the
   CMML-1/CMML-2 split — is written on "blasts and blast equivalents (myeloblasts,
   monoblasts, promonocytes)", so the promonocyte keys are added in, not left for
   a rule to remember. Whichever counting convention the differential used, the
   sum is the same number: the two conventions are mutually exclusive on the pad
   (see MarrowCounter.js), and a case that counted neither promonocyte key reads
   exactly as it did before they existed.
-------------------------------------------------------------------------- */

/* Blasts + promonocytes, from whichever keys the differential used. `null` only
   when there is no denominator at all — a counted specimen with no blasts in it
   is 0%, which is an answer. */
function findingBlastPct(s) {
    if (s.percents.blast === null) return null;
    return (s.percents.blast || 0) + (s.percents.promono || 0) + (s.percents.proBlast || 0);
}

/* PLASMA CELLS — the marrow's two questions: how many, and are they clonal.

   "How many" follows the blast pattern exactly: the counted aspirate percentage
   first, CD138 on sections as the substitute when there is no count (low end of
   a range, like CD34). "Increased" is a separate, semiquantitative fact — the
   core's chip and the CD138 select both state it outright — and is NOT derived
   from the percentage: the classifications put no number on "increased", and
   MGUS sits below 10% while still being an increase over the 0-1% of a normal
   marrow. Clonality is the kappa/lambda ISH result and nothing else; `clonal`
   is false only when the ISH was read as polytypic, never merely because no
   restriction was recorded. */
function findingPlasma() {
    const asp = aspCounter.readStats();
    let pct = asp.percents.plasma === undefined ? null : asp.percents.plasma;
    let basis = pct === null ? null : 'counted';

    if (pct === null) {
        const cd138 = findingFirst(stainPercent('coreIhc', 'cd138'), stainPercent('clotIhc', 'cd138'));
        if (cd138) {
            pct = findingNumber(String(cd138.value).split('-')[0]);
            basis = cd138.range ? 'cd138Range' : 'cd138';
        }
    }

    const core = findingFromToggle('corePlasma', ['increased'], ['adequate']);
    const cd138Call = (function () {
        const chosen = findingFirst(
            stainValue('coreIhc', 'cd138', 'result') || null,
            stainValue('clotIhc', 'cd138', 'result') || null);
        if (!chosen) return null;
        return chosen === 'Increased';
    })();
    const increased = core === true || cd138Call === true ? true
        : core === false || cd138Call === false ? false
        : null;

    const ish = findingFirst(
        stainValue('coreIhc', 'kappaLambdaISH', 'result') || null,
        stainValue('clotIhc', 'kappaLambdaISH', 'result') || null);
    const restriction = ish === 'Kappa restriction' ? 'kappa'
        : ish === 'Lambda restriction' ? 'lambda'
        : null;

    return {
        marrowPct: pct,
        pctBasis: basis,
        increased: increased,
        restriction: restriction,
        clonal: ish === null ? null : restriction !== null
    };
}

/* TRUE OR NULL, NEVER FALSE, and that asymmetry is the whole design.

   There is no "no Auer rods" control to leave un-ticked — one would have to be a
   stop chip, and a stop chip clears its group, which would make "no Auer rods"
   contradict "agranular cytoplasm". They are not alternatives, so the absence of
   a finding here is silence and not a negative.

   What that buys is that this field can only ever PROMOTE. WHO-HAEM5 makes a case
   MDS-IB2 on the presence of Auer rods at any blast count in the MDS-IB range, and
   nothing in either classification turns on their absence — so a rule may read
   `=== true` and nothing may read `=== false`. The MDS-IB caution states the
   limitation on every case that did not name them. */
function findingAuerRods() {
    const named = descriptorSelected('aspBlastDesc').concat(descriptorSelected('pbBlastDesc'));
    const found = AUER_ROD_DESCRIPTORS.some(function (key) { return named.indexOf(key) !== -1; });
    return found ? true : null;
}

function findingBlasts() {
    const asp = aspCounter.readStats();
    const pb = bloodCounter.readStats();

    /* Raw tallies, not the allocated percentages: this asks whether the
       promonocyte keys were USED, and four promonocytes in a 500-cell count are a
       convention chosen even where they round to 0.8%. counts() is read after
       readStats(), which is what re-scans the tape. */
    const aspTally = aspCounter.counts();
    const pbTally = bloodCounter.counts();
    const equivalentsCounted = (aspTally.promono || 0) + (aspTally.proBlast || 0) +
        (pbTally.promono || 0) + (pbTally.proBlast || 0) > 0;

    let marrow = findingBlastPct(asp);
    let basis = marrow === null ? null : 'counted';

    if (marrow === null) {
        const cd34 = findingFirst(stainPercent('coreIhc', 'cd34'), stainPercent('clotIhc', 'cd34'));
        // A range ("20-30") is not a number to gate on; take the low end and say so.
        if (cd34) {
            marrow = findingNumber(String(cd34.value).split('-')[0]);
            basis = cd34.range ? 'cd34Range' : 'cd34';
        }
    }

    return {
        marrow: marrow,
        marrowBasis: basis,
        blood: findingBlastPct(pb),
        /* Whether the percentages above are known to include the promonocytes.
           Not a criterion — a fact about the count, which is why it is reported
           rather than gated: a comment that quotes a blast percentage in a
           monocytic case has to be able to say which of the two it is quoting. */
        equivalentsCounted: equivalentsCounted,
        /* The one blast morphology with a classification consequence of its own.
           See findingAuerRods(): true or null, never false. */
        auerRods: findingAuerRods(),
        counted: asp.denominator > 0,
        countedCells: asp.denominator,
        target: asp.target,
        /* The aspirate's own chip, which is an opinion rather than a count and is
           kept separate from one. Its "not increased" value is spelled `adequate`
           (aspIncreased in MarrowAsp.js), not `notIncreased`. */
        claimedIncreased: findingFromToggle('aspBlast', ['increased'], ['adequate'])
    };
}


/* ----------------------------------------------------------------------------
   Cytopenias

   THE ORDER HERE IS NOT "CHIP FIRST", AND THE REASON IS bloodApplyCBC().

   The Blood tab autofills pbHgb / pbNeut / pbPlt from the analyser's own flag
   the moment a CBC is pasted, so on the common path the chip is not a
   pathologist's judgement at all — it is the flag wearing a chip's clothes.
   Taking it at face value would let the reporting laboratory's reference range
   decide a WHO criterion, which is the one thing MDS_CYTOPENIA exists to
   prevent: a laboratory flagging a man's hemoglobin of 12.6 as low would
   otherwise satisfy a criterion the classification does not.

   So the chip is compared against what the autofill would have written.
   Agreeing with the flag means nobody has weighed in and the NUMBER decides;
   DISAGREEING with it means a human moved that chip deliberately, and a
   deliberate override still wins — which is the half of "chip first" that was
   ever load-bearing. With no number at all the chip is the only answer there is,
   and the raw flag is the last resort for a value that would not parse.

   NOTE THE BLOOD REPORT IS A DIFFERENT QUESTION and still says what the
   laboratory said. "The blood shows anemia" describes a count against the range
   it was measured in; "at least one cytopenia" is a classification criterion
   with published numbers. The two may legitimately disagree at the boundary.
-------------------------------------------------------------------------- */

/* WHO-HAEM5's UNIFIED CYTOPENIA DEFINITIONS. This edition adopts one set of
   numbers across clonal cytopenia of undetermined significance, MDS and the
   myelodysplastic/myeloproliferative neoplasms "in view of their biological and
   clinical overlap" (Myelodysplastic neoplasms: Introduction) — which is why
   they live here, once, rather than inside any one rule:

       hemoglobin   < 13 g/dL (male) / < 12 g/dL (female)
       neutrophils   < 1.8 x10^9/L
       platelets     < 150 x10^9/L

   THESE ARE NOT THE ANALYSER'S REFERENCE RANGES, and that is the whole point of
   preferring them to the flag: a laboratory whose lower limit for a man is 13.5
   flags an anemia the classification does not recognise, and one whose limit is
   12.0 misses one it does. The same chapter says to stay cognizant of the local
   lower reference limit and of conditional variation by ethnicity and sex — the
   reason the pathologist's chip still outranks any number here. */
const MDS_CYTOPENIA = { hgbMale: 13, hgbFemale: 12, anc: 1.8, plt: 150 };

/* The hemoglobin criterion is the only one of the three that needs the sex, and
   so the only one that can straddle. With no sex recorded, below 12 is anemia
   whoever the patient is and 13 or above is not; the band between them is
   exactly where the two definitions disagree, and it stays null rather than
   picking a side — the convention findingErythrocytosis uses at the other end of
   the same measurement. */
function findingAnemiaValue(hgb, sex) {
    if (hgb === null) return null;
    if (sex === 'male') return hgb < MDS_CYTOPENIA.hgbMale;
    if (sex === 'female') return hgb < MDS_CYTOPENIA.hgbFemale;
    if (hgb < MDS_CYTOPENIA.hgbFemale) return true;
    return hgb >= MDS_CYTOPENIA.hgbMale ? false : null;
}

function findingCytopenia(group, yes, no, component, threshold) {
    const chip = findingFromToggle(group, yes, no);
    const value = findingCbcNumber(component);

    if (value !== null) {
        const flag = cbcFlagged(component, 'low');
        return (chip === null || chip === flag) ? threshold(value) : chip;
    }
    if (chip !== null) return chip;
    if (!cbcResult(component)) return null;          // not pasted / not in the paste
    return cbcFlagged(component, 'low');             // present but unparseable
}

/* The three groups do NOT share a value vocabulary, and the differences are
   invisible from the labels: the platelet row reads Low/Normal/High on screen but
   stores decreased/adequate/increased, while the lineage matrix stores
   low/normal/high. Spelled out per group rather than assumed, because a wrong
   guess here fails silently — it reads as "assessed, not cytopenic" and quietly
   removes a criterion from every case. (This is the mistake the vignette harness
   caught; keep the harness pointed at it.) */
function findingCytopenias(sex) {
    const anemia = findingCytopenia('pbHgb', ['anemia'], ['adequate', 'polycythemia'], 'HGB',
        function (hgb) { return findingAnemiaValue(hgb, sex); });
    const thrombocytopenia = findingCytopenia('pbPlt', ['decreased'], ['adequate', 'increased'], 'PLT',
        function (plt) { return plt < MDS_CYTOPENIA.plt; });
    const neutropenia = findingCytopenia('pbNeut', ['low'], ['normal', 'high'], 'Absolute Neutrophils',
        function (anc) { return anc < MDS_CYTOPENIA.anc; });

    const all = [anemia, thrombocytopenia, neutropenia];
    const known = all.filter(function (v) { return v !== null; });
    const positive = all.filter(function (v) { return v === true; });

    return {
        anemia: anemia,
        thrombocytopenia: thrombocytopenia,
        neutropenia: neutropenia,
        count: known.length ? positive.length : null,
        any: positive.length ? true : (known.length === 3 ? false : null)
    };
}


/* ----------------------------------------------------------------------------
   Fibrosis

   The MF grade as [low, high] off the reticulin option's own `grade` field. A
   straddling option ("MF-1 to MF-2") stays a range all the way to the criterion,
   where ">= 2" comes out UNKNOWN rather than being rounded into a yes or a no.
-------------------------------------------------------------------------- */

function findingFibrosisIn(group) {
    if (stainNamed(group).indexOf('reticulin') === -1) return null;
    const chosen = stainValue(group, 'reticulin', 'result');
    if (!chosen) return null;                        // performed, not yet read
    const option = stainVocabulary.reticulin.options.filter(function (o) { return o.label === chosen; })[0];
    return option && option.grade ? option.grade : null;
}

function findingFibrosis() {
    return { grade: findingFirst(findingFibrosisIn('coreStain'), findingFibrosisIn('clotStain')) };
}


/* ----------------------------------------------------------------------------
   Genetics

   `status` is the load-bearing field. "Resulted with nothing found" is a
   negative that can close a criterion; "pending" is an unknown that must not,
   AND is what makes a comment say the classification awaits those studies.
   `ngsVariants()` alone cannot tell them apart — an empty list looks identical.
-------------------------------------------------------------------------- */

function findingGeneVariants(gene) {
    return ngsVariants().filter(function (v) { return v.gene === gene; });
}

/* A GENE, AND THE ASYMMETRY THAT GOVERNS ALL OF THIS.

   A recorded finding is a finding, whatever the study status says: typing SF3B1
   into the variant list IS the assertion that it was found, and making that wait
   on a second toggle meant ticking an abnormality changed nothing and said
   nothing about why.

   What the status licenses is the ABSENCE. "No SF3B1 in the list" is a real
   negative only once the study has resulted; before that it is an empty list,
   which is not evidence. So:

       recorded            -> true   (regardless of status)
       absent + resulted   -> false  (a real negative)
       absent + otherwise  -> null   (nobody has said) */
function findingGene(gene, ngsStatus) {
    if (findingGeneVariants(gene).length > 0) return true;
    return ngsStatus === 'resulted' ? false : null;
}

/* A myelodysplasia-related mutation from one gene list, tri-valued by the same
   asymmetry as findingGene: a recorded MR gene IS present whatever the status
   says; its absence is a real negative only once NGS has resulted. `genes` names
   which ones for the comment. */
function findingMR(variants, list, ngsStatus) {
    const genes = variants
        .map(function (v) { return v.gene; })
        .filter(function (g) { return list.indexOf(g) !== -1; })
        .filter(function (g, i, a) { return a.indexOf(g) === i; });
    if (genes.length) return { present: true, genes: genes };
    return { present: ngsStatus === 'resulted' ? false : null, genes: [] };
}

/* A set of cytogenetic abnormalities, tri-valued by the SAME asymmetry as
   findingMR and findingGene: a named abnormality is present whatever the study
   status says, and its absence is a real negative only once the karyotype has
   resulted. `keys` names which ones, so a comment can print them. */
function findingAbnSet(named, list, karyotypeStatus) {
    const keys = named.filter(function (k) { return list.indexOf(k) !== -1; });
    if (keys.length) return { present: true, keys: keys };
    return { present: karyotypeStatus === 'resulted' ? false : null, keys: [] };
}

/* ----------------------------------------------------------------------------
   Reading a variant against Table 2.02

   THE CRITERION IS THE GENE; THE REGION IS A REFINEMENT THAT MAY BE WAIVED. This
   is the chapter's own position and it is what shapes everything below: "cases
   with mutations in CH driver genes OUTSIDE the regions specified in the table may
   qualify for a diagnosis of CHIP if the mutations are predicted to be deleterious
   and not rare, non-pathogenic variants."

   So a change that falls outside its gene's ranges is NOT a negative. It is a
   question for the person reading the molecular report, and the comment asks it
   out loud rather than resolving it. Only "no reported mutation is in a listed
   driver gene at all" closes the criterion.
-------------------------------------------------------------------------- */

const CH_AA3 = { Ala: 'A', Arg: 'R', Asn: 'N', Asp: 'D', Cys: 'C', Gln: 'Q', Glu: 'E',
                 Gly: 'G', His: 'H', Ile: 'I', Leu: 'L', Lys: 'K', Met: 'M', Phe: 'F',
                 Pro: 'P', Ser: 'S', Thr: 'T', Trp: 'W', Tyr: 'Y', Val: 'V', Ter: '*' };

/* A change string as the laboratory wrote it, in the two parts the table asks
   about: is it truncating, and what residue does it hit.

   EVERYTHING HERE IS BEST-EFFORT AND SAYS SO BY RETURNING null. Labs write
   `p.(Arg882His)`, `p.R882H`, `R882H`, `c.2645G>A (p.Arg882His)` and `NM_022552.5:
   c.2645G>A` for the same variant, and the last of those cannot be placed at all.
   A parser that guessed would be worse than one that shrugs — see cebpaBzip. */
function chParseChange(text) {
    const raw = String(text || '');
    if (!raw.trim()) return { truncating: false, pos: null, change: null };

    /* Truncating, in every notation seen in practice: an explicit word, a stop
       (`p.R213*`, `p.Arg213Ter`), a frameshift (`fs`, `fs*12`), or an intronic
       coding position, which is how a splice-site change is written. */
    const truncating = /frameshift|nonsense|splice|\bfs\b|fs\*?\d*|\*\d*\s*$|Ter\d*|c\.\s*\d+\s*[+-]\s*\d+/i
        .test(raw);

    /* The protein half only. `c.` coordinates are numbers too, and reading one as
       a residue is exactly the mistake that would put a variant in a range it has
       nothing to do with. */
    const protein = raw.indexOf('p.') !== -1 ? raw.slice(raw.indexOf('p.')) : raw;
    if (/c\.\s*\d/.test(protein)) return { truncating: truncating, pos: null, change: null };

    const m = protein.match(/p?\.?\(?\s*([A-Z][a-z]{2}|[A-Z])\s*(\d+)\s*([A-Z][a-z]{2}|[A-Z*])?/);
    if (!m) return { truncating: truncating, pos: null, change: null };

    const one = function (aa) { return aa && aa.length === 3 ? (CH_AA3[aa] || null) : aa || null; };
    const ref = one(m[1]);
    const alt = one(m[3]);
    /* `*` is a stop and `X` is whatever the reporting convention meant by it —
       neither names a substituted residue, so the change is left unread and only
       the position stands. */
    const readable = alt && alt !== '*' && alt !== 'X';
    return {
        truncating: truncating,
        pos: parseInt(m[2], 10),
        change: ref && readable ? ref + m[2] + alt : null
    };
}

/* One variant against its gene's row. Three answers, and the middle one is the
   whole point:

       true   the change meets the criteria the table specifies for that gene
       false  the change was read and falls outside them — NOT a disqualification,
              the "may still qualify if predicted deleterious" case
       null   the gene is listed but the change could not be read against the row

   A gene that is not in the table at all is not this function's question; callers
   test membership first. */
function chVariantQualifies(gene, text) {
    const entry = CH_DRIVER_TABLE[gene];
    if (!entry) return false;
    const parsed = chParseChange(text);

    if (parsed.truncating) return entry.truncating === true ? true : false;
    if (parsed.pos === null) return null;

    if (entry.changes && parsed.change && entry.changes.indexOf(parsed.change) !== -1) return true;
    if (entry.positions && entry.positions.indexOf(parsed.pos) !== -1) return true;
    if (entry.ranges && entry.ranges.some(function (r) {
        return parsed.pos >= r[0] && parsed.pos <= r[1];
    })) return true;

    /* THE RESIDUE READ AND THE SUBSTITUTION NOT — `p.W515X`, or a report that
       stops at the codon. A named-change row usually lists several alternatives at
       one residue (MPL W515A/R/K/S/L), so which of them this is decides the
       answer, and nobody has said. Unknown, not outside. */
    if (!parsed.change && entry.changes && entry.changes.some(function (c) {
        return parseInt(c.slice(1), 10) === parsed.pos;
    })) return null;

    /* Named-change rows are exhaustive lists, so a substitution that is not on one
       is outside the criteria. Ranges and positions say the same thing by
       arithmetic. Either way this is `false` — "outside", not "not a driver". */
    return false;
}

/* The whole variant list read against the table, in the four groups a comment
   needs to be able to speak about separately. */
function findingChDrivers(variants, ngsStatus) {
    const listed = variants.filter(function (v) { return !!CH_DRIVER_TABLE[v.gene]; });
    const unlisted = variants
        .filter(function (v) { return v.gene && !CH_DRIVER_TABLE[v.gene]; })
        .map(function (v) { return v.gene; })
        .filter(function (g, i, a) { return a.indexOf(g) === i; });

    const named = function (list) {
        return list.map(function (v) { return v.gene; })
            .filter(function (g, i, a) { return a.indexOf(g) === i; });
    };
    const verdicts = listed.map(function (v) {
        return { gene: v.gene, variant: v.variant, verdict: chVariantQualifies(v.gene, v.variant) };
    });

    return {
        /* THE GATE. Gene membership is the hard half of the criterion and it is
           always answerable — the gene symbol is typed, and nothing has to be
           parsed to know whether the table holds it. So this is three-valued only
           because of the study status, on the same asymmetry as findingGene: a
           listed gene IS a finding, and its absence is a negative only once the
           panel has resulted. */
        present: listed.length ? true : (ngsStatus === 'resulted' ? false : null),
        genes: named(listed),
        /* Which of them actually met the row's criteria, and which were read and
           fell outside it — the sentence the chapter's waiver clause needs. */
        qualifying: named(verdicts.filter(function (v) { return v.verdict === true; })),
        outside: named(verdicts.filter(function (v) { return v.verdict === false; })),
        /* Read against the row and could not be placed: a bare `c.` coordinate, a
           deletion the table names as an indel, "type 1". Named so the audit view
           can say the engine did not silently decide. */
        unreadable: named(verdicts.filter(function (v) { return v.verdict === null; })),
        /* Mutated genes the table does not list at all. On their own they do not
           support a diagnosis of CHIP. */
        unlisted: unlisted,
        /* Criteria this app cannot check even when everything parsed: the rows
           that restrict a class to named exons. Carried so the comment can say
           which gene it is being permissive about. */
        exonUnverified: named(listed.filter(function (v) {
            const entry = CH_DRIVER_TABLE[v.gene];
            return entry.exon && chParseChange(v.variant).truncating;
        })).map(function (g) { return g + ' (' + CH_DRIVER_TABLE[g].exon + ')'; })
    };
}

/* Does any recorded clone meet CHIP's size criterion? Kleene's OR over the
   variants, and the middle case is the one that matters: ONE qualifying clone
   answers yes whatever the others read, every reported fraction below the bar is a
   real no, and a blank VAF column is silence.

   Silence is the common case — the fraction is a number the report may carry and
   the row may not — which is why the diagnosis engine treats this as evidence and
   never as a gate that has to be satisfied before a comment can be written.

   AN X-LINKED GENE WITH NO SEX RECORDED STRADDLES, exactly as findingErythrocytosis
   does with a hemoglobin between the two thresholds: between 2% and 4% the answer
   genuinely depends on the question nobody answered, and picking either bar would
   invent the patient's sex. Outside that band the two readings agree and the answer
   is given. */
function findingChClone(variants, sex) {
    if (!variants.length) return null;
    const values = variants.map(function (v) {
        const vaf = findingNumber(v.vaf);
        if (vaf === null) return null;
        if (CH_X_LINKED_GENES.indexOf(v.gene) === -1 || sex === 'female') return vaf >= 2;
        if (sex === 'male') return vaf >= 4;
        return vaf >= 4 ? true : (vaf < 2 ? false : null);
    });
    if (values.some(function (v) { return v === true; })) return true;
    if (values.every(function (v) { return v === false; })) return false;
    return null;
}

/* The largest clone in the case, for the comment. Clone size is one of the two
   things the chapter says moves the risk of progression (the other being how many
   genes are mutated), so a comment that names the risk should be able to name the
   number it read. */
function findingMaxVaf(variants) {
    const values = variants
        .map(function (v) { return findingNumber(v.vaf); })
        .filter(function (n) { return n !== null; });
    return values.length ? Math.max.apply(null, values) : null;
}

/* `sex` is needed for ONE question only — the X-linked half of the clone-size
   threshold above — and is passed in rather than read here, so this file keeps its
   one reader per fact. Defaulted so a caller that has no sex still works. */
function findingGenetics(sex) {
    const karyotype = ancStudyStatus('ancKaryotypeStatus');
    const ngs = ancStudyStatus('ancNgsStatus');
    const variants = ngsVariants();
    const abnormalities = ancAbnNamed();

    /* Same asymmetry for the cytogenetic abnormalities. Takes a VOCABULARY KEY
       now that they are a growing list rather than four checkboxes — see
       ancCytoFinding() in MarrowAncillary.js. */
    const cyto = function (key) {
        if (ancCytoFinding(key)) return true;
        return karyotype === 'resulted' ? false : null;
    };

    const tp53Variants = findingGeneVariants('TP53');
    const del17p = cyto('del17p');

    /* Multi-hit / biallelic TP53: two or more mutations, or one plus 17p loss.
       One mutation with 17p unknown is exactly the case that must not be called
       either way, so it stays null rather than collapsing to false. */
    let tp53MultiHit;
    if (tp53Variants.length >= 2) tp53MultiHit = true;
    else if (tp53Variants.length === 1 && del17p === true) tp53MultiHit = true;
    else if (tp53Variants.length === 1) tp53MultiHit = del17p === false ? false : null;
    else tp53MultiHit = ngs === 'resulted' ? false : null;

    /* WHICH STUDIES ARE ACTUALLY OUTSTANDING — and entering a result counts as
       one arriving. Without this, ticking del(5q) on a case whose status nobody
       set produced a comment that used del(5q) AND said the cytogenetics were
       awaited, which contradicts itself in consecutive sentences. */
    const karyotypeOutstanding = karyotype === 'pending' ||
        (!karyotype && !ancAbnAny() && !ancKaryotypeText());
    const ngsOutstanding = ngs === 'pending' || (!ngs && !variants.length);

    return {
        karyotypeStatus: karyotype,
        ngsStatus: ngs,
        karyotypeText: ancKaryotypeText(),
        variants: variants,
        del5q: cyto('del5q'),
        minus7: cyto('minus7'),
        complex: cyto('complex'),
        del17p: del17p,
        sf3b1: findingGene('SF3B1', ngs),
        /* THE ONE PLACE A VARIANT ALLELE FRACTION IS A CRITERION RATHER THAN A
           COMMENT. "The presence of a SF3B1 variant at a VAF of < 5% does not
           qualify for MDS-SF3B1" (MDS with low blasts and SF3B1 mutation) — a
           floor, and a low one, aimed at the incidental subclone rather than at
           the disease. Read the same way as tp53Vaf: the highest reported
           fraction if the laboratory printed one, and null if it did not, which
           is NOT the same as a low one. */
        sf3b1Vaf: findingGeneVaf('SF3B1'),
        /* The OTHER core spliceosome components, deliberately without SF3B1 in
           the list. "The presence of a mutation in a spliceosome component in a
           case with wildtype SF3B1 excludes MDS-SF3B1" — so this only ever has
           anything to say once SF3B1 has resulted wildtype, and what it says
           then is which gene took the case out. Named because the chapter also
           says the optimal classification of those cases is unresolved, and a
           comment that cannot name the gene cannot say why. */
        otherSpliceosome: findingMR(variants, SPLICEOSOME_GENES_NON_SF3B1, ngs),
        /* Adverse co-mutations in an SF3B1-mutated marrow — prognostic, never
           classifying, and kept separate from the MR lists because the overlap
           is a coincidence of gene membership rather than a shared meaning. */
        sf3b1AdverseCo: findingMR(variants, SF3B1_ADVERSE_CO_GENES, ngs),
        tp53MultiHit: tp53MultiHit,
        /* HOW the multi-hit answer was reached, which the answer alone cannot say.
           Two mutations are multi-hit on the sequencing alone; ONE mutation plus a
           17p deletion reaches the same `true` through the karyotype, and WHO-HAEM5
           says a banding-level 17p13.1 deletion is "not usually sufficient" to
           establish TP53 copy-number loss. The MDS-biTP53 caution has to tell those
           two apart to know whether to ask for FISH, and `tp53MultiHit` is the same
           value either way. Count only, not the variants — nothing needs those. */
        tp53VariantCount: tp53Variants.length,

        /* ---- The acute leukemia mutations ------------------------------- */

        npm1: findingGene('NPM1', ngs),
        /* Read the same way as tp53Vaf and sf3b1Vaf. Its consumer is the NPM1
           chapter's own caution: a variant at VAF < 10% with no increase in
           blasts "may not be definitively classifiable as AML" — the one place
           the AML-defining-at-any-count rule asks for restraint. */
        npm1Vaf: findingGeneVaf('NPM1'),

        /* CEBPA, AND THE ONE PLACE THIS APP CANNOT ANSWER THE CRITERION AS
           WRITTEN. Both classifications ask a POSITIONAL question — WHO-HAEM5
           accepts biallelic mutation at any site OR a single mutation in the
           basic leucine zipper (bZIP) region; ICC 2022 accepts ONLY in-frame bZIP
           mutations, and drops the biallelic route. Neither can be answered from
           a gene symbol.

           So `cebpaBzip` matches the words the laboratory used, exactly as the
           CALR type-1/type-2 test does, and is honest about being a text match
           rather than a coordinate lookup: a report that says "bZIP" or names the
           region is read as bZIP, and one that does not is left UNKNOWN rather
           than assumed negative. `cebpaBiallelic` is the count of distinct
           reported CEBPA changes, which is the best available proxy and is not
           the same claim as demonstrated biallelism.

           This is the same limitation jak2NonV617F carries and is flagged for the
           same reason: the honest failure is to say "not established", never to
           guess. A case turning on it needs the report read by a human. */
        cebpa: findingGene('CEBPA', ngs),
        cebpaBzip: (function () {
            const hits = findingGeneVariants('CEBPA');
            if (!hits.some(function (v) { return /bzip|basic leucine/i.test(v.variant); })) {
                return hits.length ? null : (ngs === 'resulted' ? false : null);
            }
            return true;
        })(),
        cebpaBiallelic: (function () {
            const hits = findingGeneVariants('CEBPA');
            if (hits.length >= 2) return true;
            return hits.length === 1 ? null : (ngs === 'resulted' ? false : null);
        })(),

        /* FLT3-ITD is not a classifying lesion in either classification — it is a
           risk stratifier (ELN 2022) and it changes therapy, which is why a
           comment on an NPM1 case names its status either way. Read at variant
           level: the internal tandem duplication is what matters, and a report
           naming a FLT3 TKD mutation is a different fact. */
        flt3: findingGene('FLT3', ngs),
        flt3Itd: findingVariantMatch('FLT3', /ITD|internal tandem/i, ngs),

        runx1: findingGene('RUNX1', ngs),

        /* GATA2 is the flagship CEBPA co-mutation and discriminates WITHIN the
           gene: ~35% of biallelic and single-bZIP cases carry it against ~7% of
           TAD-only ones (Taube, Blood 2022;139:87, n=4708). So a GATA2 variant
           beside a CEBPA one is real evidence the CEBPA is the kind that defines
           the entity — which is worth having, since this app cannot read the
           mutation's position directly. */
        gata2: findingGene('GATA2', ngs),
        /* Germline predisposition is a qualifier in both classifications. DDX41 is
           the one most often met in an adult marrow and the one an NGS panel
           actually reports; a somatic DDX41 finding is a prompt to ask about the
           germline, never a germline diagnosis on its own. */
        ddx41: findingGene('DDX41', ngs),

        /* ICC's TP53 entity turns on the allele fraction and NOT on multi-hit
           status: "any somatic TP53 mutation at a VAF >10%", strictly greater, as
           ICC Table 21 prints it. WHO-HAEM5 has no TP53-defined AML at all. */
        tp53Vaf: findingGeneVaf('TP53'),
        tp53: findingGene('TP53', ngs),
        /* Myelodysplasia-related mutations, split by classification. `mrICC`
           is the broader (adds RUNX1); an ICC-only MR gene leaves `mrWHO` false
           with `mrICC` true, which is the divergence the naming keys on. */
        mrWHO: findingMR(variants, MR_GENES_WHO, ngs),
        mrICC: findingMR(variants, MR_GENES_ICC, ngs),
        /* The CMML landscape — scored, never gated. See CMML_GENES. */
        cmmlGenes: findingMR(variants, CMML_GENES, ngs),
        /* Table 2.13's starred subset, which IS gated — but only in the
           oligomonocytic band, and only by the CMML rule. Same shape as the line
           above and a different question: that one asks how the case looks, this
           one answers a criterion. */
        cmmlDesirableGenes: findingMR(variants, CMML_DESIRABLE_GENES, ngs),

        /* Every abnormality named, and the three questions asked of that list.
           Kept SEPARATE from the mrWHO/mrICC gene answers above rather than
           folded in with them, because the two are reported by different studies
           and a comment must be able to say which one spoke: "a
           myelodysplasia-related gene mutation is present" and "a
           myelodysplasia-related cytogenetic abnormality is present" are
           different sentences, and a case may have either without the other. */
        abnormalities: abnormalities,
        amlDefining: findingAbnSet(abnormalities, AML_DEFINING_ABN, karyotype),
        mrCytoWHO: findingAbnSet(abnormalities, MR_CYTO_WHO, karyotype),
        mrCytoICC: findingAbnSet(abnormalities, MR_CYTO_ICC, karyotype),
        anySomatic: variants.length ? true : (ngs === 'resulted' ? false : null),
        /* The largest clone in the case. Read by the clonal-hematopoiesis
           comment, where it is the clone size the risk of progression turns on,
           and by ICC's CMML clonality criterion, which asks for "at least one
           myeloid neoplasm associated mutation of at least 10% allele frequency"
           — one number, two questions, and null where no laboratory printed a
           fraction (which is NOT the same as a low one). */
        maxVaf: findingMaxVaf(variants),

        /* ---- Clonal hematopoiesis ---------------------------------------- */

        /* The genes mutated, deduplicated, in the order the list was typed — what a
           comment names when it says a clone is present. Distinct from
           `variants.length`, and the difference is the one the chapter scores on:
           two variants in one gene are one mutated gene, and "more than one mutated
           gene" is the risk factor. */
        somaticGenes: variants
            .map(function (v) { return v.gene; })
            .filter(function (g, i, a) { return g && a.indexOf(g) === i; }),
        chClone: findingChClone(variants, sex),
        /* The variant list read against WHO-HAEM5's Table 2.02 — the criterion
           CHIP is actually predicated on. See findingChDrivers(). */
        chDrivers: findingChDrivers(variants, ngs),
        /* Prognostic, never scored — see CH_HIGH_RISK_GENES. findingMR() is reused
           for the shape (present/genes), not because these are MR genes; three of
           them happen to be both.

           TWO READOUTS BECAUSE THE TWO CHAPTERS PUBLISH TWO LISTS. Read the one
           belonging to the entity whose comment is being written; dxChRiskText()
           takes the choice as an argument rather than guessing. */
        chHighRisk: findingMR(variants, CH_HIGH_RISK_GENES, ngs),
        ccusHighRisk: findingMR(variants, CCUS_HIGH_RISK_GENES, ngs),
        /* VEXAS. The only CH-related disorder with clinicopathological findings of
           its own, and the one place a single gene symbol changes what the comment
           has to say — so it is read out by name rather than left inside
           `somaticGenes`. */
        uba1: findingGene('UBA1', ngs),

        karyotypeOutstanding: karyotypeOutstanding,
        ngsOutstanding: ngsOutstanding,
        /* Outstanding, and therefore worth SAYING is outstanding. */
        pending: karyotypeOutstanding || ngsOutstanding,
        explicitlyPending: karyotype === 'pending' || ngs === 'pending'
    };
}


/* ----------------------------------------------------------------------------
   Driver mutations

   The myeloproliferative drivers, read out of the same variant list as everything
   else but AT VARIANT LEVEL, because for these the change matters as much as the
   gene: JAK2 V617F and JAK2 exon 12 are different diseases' worth of phenotype,
   and CALR type 1 versus type 2 is a prognostic split inside one gene.

   Matching is on the change string as the lab wrote it, which is why each test is
   a loose regex over the whole record rather than an equality. `p.(V617F)` parses
   to `V617F` here, but a lab that writes `V617F (exon 14)` or `NM_004972.4:p.V617F`
   must match too, and a lab that writes `Type 1` instead of `L367fs*46` is naming
   the same thing a different way.

   ALL OF IT INHERITS findingGene's ASYMMETRY: a recorded variant is present
   whatever the study status says, and its absence is a real negative only once NGS
   has resulted. That is what makes "triple negative" sayable at all — before the
   study returns, an empty list is not three negatives, it is silence.
-------------------------------------------------------------------------- */

/* Does any variant of this gene match? Tri-state, on the same rule as findingGene:
   a match is a finding; "no match" is a negative only once NGS has resulted; but
   note the middle case — if the GENE is mutated and the change does not match, the
   answer is a real `false` regardless of status, because the study did report on
   this gene and said something else. */
function findingVariantMatch(gene, pattern, ngsStatus) {
    const hits = findingGeneVariants(gene);
    if (hits.some(function (v) { return pattern.test(v.variant); })) return true;
    if (hits.length) return false;                 // gene reported, different change
    return ngsStatus === 'resulted' ? false : null;
}

/* The highest VAF among a gene's variants, as a number, or null.

   ONE NUMBER TO TREAT GENTLY. A JAK2 allele burden over ~50% is one of the few
   quantitative things that separates prefibrotic PMF from ET (ET median ~24% and
   not one case above 40% in Hussein/Kvasnicka, Exp Hematol 2009;37:1186, n=490;
   prefibrotic PMF median ~38% with a quarter above 50%). But VAF depends on the
   assay and on whether the specimen was blood, marrow or sorted granulocytes, so
   the effect is far more robust than any single cutoff. It is scored as a support
   point and never as a gate. */
function findingGeneVaf(gene) {
    const values = findingGeneVariants(gene)
        .map(function (v) { return findingNumber(v.vaf); })
        .filter(function (n) { return n !== null; });
    return values.length ? Math.max.apply(null, values) : null;
}

function findingDrivers() {
    const ngs = ancStudyStatus('ancNgsStatus');

    const jak2 = findingGene('JAK2', ngs);
    const calr = findingGene('CALR', ngs);
    const mpl = findingGene('MPL', ngs);

    /* Triple negative: all three genuinely negative. Any one present makes it
       false; any one unknown makes it unknown, because two negatives and a silence
       is not three negatives. It is worth computing because its meaning is
       OPPOSITE in the two diseases it bears on — triple-negative ET is indolent,
       triple-negative PMF is aggressive — so the engine must not treat it as one
       fact with one sign. */
    const drivers = [jak2, calr, mpl];
    const tripleNegative = drivers.some(function (d) { return d === true; })
        ? false
        : (drivers.every(function (d) { return d === false; }) ? true : null);

    return {
        jak2: jak2,
        /* V617F specifically, and "a JAK2 change that is not V617F" — NOT called
           exon 12, because this cannot tell exon 12 from a non-canonical JAK2
           variant (V625F, F556V) without the coordinates, and both exist. For every
           criterion that matters the distinction is moot: PV's major criterion is
           "JAK2 V617F or JAK2 exon 12 mutation", which `jak2` already answers. The
           split is here for the phenotype note — an exon-12 case is the one PV
           whose marrow shows isolated erythroid hyperplasia rather than
           panmyelosis, so a bland-megakaryocyte marrow must not score against it. */
        jak2V617F: findingVariantMatch('JAK2', /V617F/i, ngs),
        jak2NonV617F: (function () {
            const hits = findingGeneVariants('JAK2');
            if (!hits.length) return ngs === 'resulted' ? false : null;
            return hits.some(function (v) { return !/V617F/i.test(v.variant); });
        })(),
        jak2Vaf: findingGeneVaf('JAK2'),

        calr: calr,
        /* Type 1 is the 52-bp deletion (L367fs*46), type 2 the 5-bp insertion
           (K385fs*47); together >80% of CALR-mutant cases, the rest classed
           "type 1-like"/"type 2-like" by predicted C-terminal charge. Type 1 is
           enriched in PMF and favorable there (it is MIPSS70's "absence of CALR
           type 1-like" variable); type 2 is enriched in ET and carries higher
           platelet counts. Matched on either the fs notation or the words, since
           labs report it both ways. */
        calrType1: findingVariantMatch('CALR', /L367|type\s*1/i, ngs),
        calrType2: findingVariantMatch('CALR', /K385|type\s*2/i, ngs),

        mpl: mpl,
        mplW515: findingVariantMatch('MPL', /W515/i, ngs),

        /* CSF3R T618I is close to pathognomonic for chronic neutrophilic leukemia
           in the right morphologic context (Pardanani, Leukemia 2013 — exclusively
           in WHO-defined CNL, 83% of cases) AND is what lowers ICC's white count
           threshold from 25 to 13. It also occurs in proliferative CMML and in
           atypical CML, which is why the CNL rule keeps dysgranulopoiesis and
           monocytosis as exclusions rather than letting this carry the diagnosis. */
        csf3r: findingGene('CSF3R', ngs),
        csf3rT618I: findingVariantMatch('CSF3R', /T618I/i, ngs),

        /* Not from the panel — its own control. See ancBcrAbl(). */
        bcrAbl: ancBcrAbl(),
        bcrAblStatus: toggleGroupValue('ancBcrAbl'),

        tripleNegative: tripleNegative,
        /* Is there ANY myeloproliferative driver? The question PV/ET/PMF's fourth
           criterion asks, and the one MPN-NOS/MPN-U leans on. */
        anyDriver: drivers.some(function (d) { return d === true; })
            ? true
            : (drivers.every(function (d) { return d === false; }) ? false : null)
    };
}


/* ----------------------------------------------------------------------------
   Blood counts as criteria

   The CBC's own numbers, turned into the questions the classifications ask. These
   are the only place in this file that reads raw analyser values rather than the
   pathologist's chips, and the reason is that the criteria are numeric: "platelets
   >=450 x 10^9/L" is not a judgement the Blood tab's Low/Normal/High chip can
   stand in for.

   `cbcValue()` returns NaN for a component that was not in the paste; normalised to
   null here, per this file's rule.
-------------------------------------------------------------------------- */

function findingCbcNumber(name) {
    return findingNumber(cbcValue(name));
}

/* The analyser's own flag, tri-valued — null when the component was not in the
   paste at all, rather than the plain `false` cbcFlagged() returns for both
   "not flagged" and "not there". For anything the classifications put a number
   on, use the number; this is for the cases where they do not. */
function findingCbcFlag(name, flag) {
    return cbcResult(name) ? cbcFlagged(name, flag) : null;
}

/* Erythrocytosis at PV's thresholds, which are SEX-SPECIFIC and IDENTICAL in
   WHO-HAEM5 and ICC 2022: Hb >16.5 g/dL or Hct >49% in men, >16.0 or >48% in women.

   With no sex recorded, both thresholds are tested and the answer is given only
   when they AGREE — a hemoglobin of 18 is erythrocytosis whoever the patient is,
   and one of 16.2 genuinely depends on the answer nobody gave. Straddling stays
   null, which is exactly the move dxBandAtLeast() makes on an "MF-1 to MF-2"
   reticulin, for the same reason: rounding it either way invents a fact. */
function findingErythrocytosis(sex) {
    const hgb = findingCbcNumber('HGB');
    const hct = findingCbcNumber('HCT');
    if (hgb === null && hct === null) return null;

    const meets = function (hgbLimit, hctLimit) {
        return (hgb !== null && hgb > hgbLimit) || (hct !== null && hct > hctLimit);
    };
    const asMale = meets(16.5, 49);
    const asFemale = meets(16.0, 48);

    if (sex === 'male') return asMale;
    if (sex === 'female') return asFemale;
    return asMale === asFemale ? asMale : null;
}

function findingCounts(sex) {
    const wbc = findingCbcNumber('WBC');
    const plt = findingCbcNumber('PLT');
    const neutPct = findingCbcNumber('Neutrophils');
    const eosAbs = findingCbcNumber('Absolute Eosinophils');
    const eosPct = findingCbcNumber('Eosinophils');
    const monoAbs = findingCbcNumber('Absolute Monocytes');
    const monoPct = findingCbcNumber('Monocytes');

    /* CMML's monocyte rule, and BOTH CONDITIONS, because the absolute count alone
       over-calls it: "persistent absolute (>= 0.5 x 10^9/L) and relative (>= 10%)
       peripheral blood monocytosis" (Box 2.19, essential criterion 1). Both
       WHO-HAEM5 and ICC 2022 lowered the absolute threshold to 0.5 (this was NOT a
       WHO-only change) while keeping the >=10% relative figure — and in the 0.5 to
       <1.0 band, demonstrated clonality is mandatory, which is what formally
       brought "oligomonocytic CMML" in from MDS. `needsClonality` is that band,
       reported rather than resolved: whether the clonality is there is a question
       about the genetics, not about the count.

       THE TWO HALVES ARE AND-ED THREE-VALUED, not collapsed to false the moment
       one is missing — which is what this did before, and it was the file's own
       rule broken in the one place it decides a diagnosis. A differential
       reporting only the absolute count made "the percentage is >=10%" read as a
       no, and the CMML gate failed silently on a case nobody had answered. A
       KNOWN half that fails still decides it: a monocyte count of 0.2 is not
       CMML whatever the percentage turns out to be. */
    const monoTests = [
        monoAbs === null ? null : monoAbs >= 0.5,
        monoPct === null ? null : monoPct >= 10
    ];
    const monocytosis = monoTests.some(function (t) { return t === false; }) ? false
        : (monoTests.every(function (t) { return t === true; }) ? true : null);

    return {
        wbc: wbc,
        hgb: findingCbcNumber('HGB'),
        hct: findingCbcNumber('HCT'),
        plt: plt,
        erythrocytosis: findingErythrocytosis(sex),
        /* ET's major criterion #1 and MDS/MPN-SF3B1-T's platelet criterion, which
           are the same number. */
        thrombocytosis: plt === null ? null : plt >= 450,
        /* PMF's minor criterion. */
        leukocytosis: wbc === null ? null : wbc >= 11,
        neutrophilPct: neutPct,
        /* NEUTROPHILIA HAS NO THRESHOLD IN EITHER CLASSIFICATION. The MDS
           introduction names it among the proliferative features that redirect a
           cytopenic, dysplastic case to the myelodysplastic/myeloproliferative
           family, and gives no count; CNL's >=25 x10^9/L is a criterion for a
           different disease and would be the wrong bar entirely. So this defers
           to the reporting laboratory's own upper reference limit — the only
           authority that has published one for this patient — rather than to a
           number invented here. */
        neutrophilia: findingCbcFlag('Absolute Neutrophils', 'high'),
        /* The red cell size, which MDS-5q's anemia "is often" — a likelihood, so
           it is only ever scored. The chip is the whole answer here: the Blood tab
           autofills it from the MCV against the laboratory's range, and unlike the
           cytopenia thresholds no classification publishes a competing number. */
        macrocytic: findingFromToggle('pbMcv', ['macrocytic'], ['normocytic', 'microcytic']),
        /* NOT the negation of macrocytic — normocytic is false for both, and the
           two are asked by different rules for different reasons. MDS-SF3B1
           allows a macrocytic OR a normocytic anemia, so neither of those
           discriminates; what discriminates is microcytosis, which alongside
           ring sideroblasts points away from a neoplasm and towards congenital
           sideroblastic anemia or one of the acquired mimics. */
        microcytic: findingFromToggle('pbMcv', ['microcytic'], ['normocytic', 'macrocytic']),
        /* Basophilia >=20% is an ICC accelerated-phase criterion for CML, and one
           of the findings WHO-HAEM5 kept as a high-risk feature of chronic phase
           when it abolished the phase itself. */
        basophilPct: findingCbcNumber('Basophils'),
        monocytosis: monocytosis,
        monocytosisNeedsClonality: monoAbs === null ? null : (monoAbs >= 0.5 && monoAbs < 1.0),
        /* The two numbers themselves, because the CMML comment quotes them. The
           criterion is met or not by the pair above; a comment that says "an
           absolute monocytosis" without saying how large is a weaker sentence than
           the count it was read from. */
        monocyteAbs: monoAbs,
        monocytePct: monoPct,
        /* CEL / hypereosinophilia: >=1.5 x 10^9/L, and ICC additionally >=10%. */
        eosinophilia: eosAbs === null ? null : eosAbs >= 1.5,
        eosinophilPct: eosPct
    };
}

/* Leukoerythroblastosis — nucleated red cells AND immature granulocytes together
   in the blood.

   A MINOR CRITERION FOR OVERT PMF IN BOTH CLASSIFICATIONS, and the one substantive
   divergence in the classical MPN criteria: WHO-HAEM5 also lists it for
   PREFIBROTIC PMF, ICC 2022 does not. The ICC authors call the inclusion
   unwarranted (circulating blasts >=1% in 12% of prefibrotic vs ~26% of overt
   disease); the engine names both rather than choosing.

   IT IS NOT SPECIFIC AND MUST NOT BE SCORED AS THOUGH IT WERE. Dacrocytes form as
   red cells are deformed squeezing past a disrupted marrow architecture, so this
   is a marker of marrow architecture, not of PMF — metastatic carcinoma, marrow
   infiltration, granulomatous disease and late MDS all produce it. It should widen
   a differential, not narrow one.

   The counted differential first, the analyser second — the app's usual order, and
   here it also matters that a pathologist scanning the film is the one who decides
   an "immature granulocyte" flag was real. */
function findingLeukoerythroblastosis() {
    const pb = bloodCounter.readStats();
    if (pb.denominator > 0) {
        const immature = (pb.percents.promyelo || 0) + (pb.percents.myelo || 0) +
            (pb.percents.meta || 0);
        return (pb.percents.nrbc > 0) && immature > 0;
    }
    const nrbc = findingCbcNumber('NRBCs');
    const ig = findingCbcNumber('Immature Granulocytes');
    if (nrbc === null && ig === null) return null;
    if (nrbc === null || ig === null) return null;
    return nrbc > 0 && ig > 0;
}


/* THE MARROW MONOCYTES, which are a CMML finding and nobody else's.

   "Monocytes in the bone marrow are usually increased and show left-shifted
   maturation. Such an increase is helpful in cases where the absolute monocytosis
   count in the peripheral blood is >= 0.5 x 10^9/L but < 1.0 x 10^9/L" (Chronic
   myelomonocytic leukemia) — so this is read for the oligomonocytic band above
   all, where the blood count alone does not settle the diagnosis.

   The threshold comes from the aspirate counter's own published reference range
   rather than from a number typed here: the row already carries [0, 2], and a
   second copy would be a second answer to one question. LEFT-SHIFTED MATURATION IS
   NOT READ — the differential has no promonocyte key and the monocyte descriptor
   list has only "mature-appearing", so the app cannot see it. The CMML caution
   says so rather than letting its absence read as a negative. */
function findingMarrowMonocytes() {
    const pct = aspCounter.readStats().percents.mono;
    const row = aspCells.filter(function (c) { return c.id === 'mono'; })[0];
    const upper = row && row.range ? row.range[1] : null;
    return {
        pct: pct,
        upper: upper,
        increased: (pct === null || upper === null) ? null : pct > upper
    };
}

/* Circulating immature granulocytes — promyelocytes, myelocytes and
   metamyelocytes, which are "significantly increased in MP-CMML". The counted
   differential first and the analyser's flagged count second, the app's usual
   order; and NOT the same question as findingLeukoerythroblastosis(), which needs
   nucleated red cells alongside them and means a disrupted marrow architecture. */
function findingCirculatingImmature() {
    const pb = bloodCounter.readStats();
    if (pb.denominator > 0) {
        return ((pb.percents.promyelo || 0) + (pb.percents.myelo || 0) +
            (pb.percents.meta || 0)) > 0;
    }
    const ig = findingCbcNumber('Immature Granulocytes');
    return ig === null ? null : ig > 0;
}


/* ----------------------------------------------------------------------------
   Megakaryocyte morphology

   Which of the core's megakaryocyte descriptors were named, split into the two
   patterns the classifications actually contrast. Written out here for the same
   reason `dysplasticDescriptors` is: the vocabulary mixes them, and only a
   clinical judgement says which word belongs to which pattern.

   THE ENGINE MAY SCORE THESE AND MUST NEVER GATE ON THEM. Six hematopathologists
   re-reading 102 non-fibrotic trephines reached full consensus on 13% of them, at
   an average kappa of 0.41 (Haematologica 2012;97:360). The reference standard for
   this call agrees with itself about two-thirds of the time, so a rule that
   EXCLUDED essential thrombocythemia on a megakaryocyte gestalt would be
   asserting more than the literature supports. Fibrosis grade, by contrast,
   reproduces at kappa >=0.8 — which is why that one IS a gate.
-------------------------------------------------------------------------- */

/* The prefibrotic-PMF pattern: pleomorphic, hypolobulated, densely clustered,
   displaced to the trabeculae, with abnormal chromatin and bare nuclei. */
const MEG_PMF_PATTERN = ['megCloudLike', 'megDenseClusters', 'megPleomorphic',
    'megHyperchromatic', 'megBareNuclei', 'megParatrabecular'];

/* The ET pattern: large, mature, hyperlobulated staghorn nuclei, at most loosely
   clustered. */
const MEG_ET_PATTERN = ['megStaghorn', 'megLargeMature', 'megLooseClusters'];

/* THE MDS-5q PATTERN: megakaryocytes "normal to decreased in size, with
   conspicuously non-lobated and hypolobated nuclei". Two keys, and the
   restraint is the point — `micromegakaryocytes` and the widely-separated-lobe
   descriptors are the general MDS megakaryocyte vocabulary rather than this
   entity's, and folding them in would score every dysplastic marrow as
   5q-like. What discriminates here is the LOBATION, not the dysplasia. */
const MEG_5Q_PATTERN = ['hypolobatedForms', 'smallHypolobated'];

function findingMegakaryocytes() {
    const named = descriptorSelected('coreMegDesc');
    const assessed = named.length > 0 || findingChecked('coreMegDescUnremarkable');
    const has = function (list) {
        return named.filter(function (k) { return list.indexOf(k) !== -1; });
    };
    const pmf = has(MEG_PMF_PATTERN);
    const et = has(MEG_ET_PATTERN);

    /* The 5q pattern reads BOTH specimens, where the two MPN patterns read the
       core alone. Those are architectural — clustering and paratrabecular
       displacement exist only in a section — but lobation is a feature of a
       single cell, and a smear shows it at least as well as a section does. */
    const aspNamed = descriptorSelected('aspMegDesc');
    const fiveQ = named.concat(aspNamed).filter(function (k, i, a) {
        return MEG_5Q_PATTERN.indexOf(k) !== -1 && a.indexOf(k) === i;
    });
    const megAssessed = assessed || aspNamed.length > 0 ||
        findingChecked('aspMegDescUnremarkable');

    return {
        named: named,
        assessed: assessed,
        pmfPattern: pmf,
        etPattern: et,
        /* Tri-state per pattern: named features are a finding; nothing named on an
           ASSESSED core is a real negative; an unassessed core is silence. */
        pmfLike: pmf.length ? true : (assessed ? false : null),
        etLike: et.length ? true : (assessed ? false : null),
        hypolobatedPattern: fiveQ,
        hypolobated: fiveQ.length ? true : (megAssessed ? false : null),
        /* Megakaryocytes "usually increased in number" — the aspirate's own count
           chip, and the core's where the aspirate said nothing. */
        increased: findingFirst(findingFromToggle('aspMega', ['increased'], ['adequate', 'decreased']),
            findingFromToggle('coreMeg', ['increased'], ['adequate', 'decreased']))
    };
}


/* ----------------------------------------------------------------------------
   The snapshot
-------------------------------------------------------------------------- */

function marrowFindings() {
    const age = cbcPatientAge();
    const cellPct = findingNumber(document.getElementById('coreCellAbs')?.value);
    const band = age === null ? null : coreCellBand(age);

    /* ------------------------------------------------------------------------
       CELLULARITY, AND WHY THE CHIP HAD TO BECOME AN ANSWER

       `hyperForAge` and `hypoForAge` were derived from the typed percentage and
       the age alone, so clicking Hypercellular — the control a pathologist
       actually uses — moved nothing. It needed a percentage in ONE particular
       field plus a pasted CBC carrying a date of birth, and short of both it
       stayed null on a marrow the reader had already called hypercellular. That
       silenced a criterion in PV, prefibrotic PMF, CML, MDS-IB and ET at once.

       THE CHIP IS THE ANSWER, AND AN AGE IS NOT NEEDED TO INTERPRET IT.
       "Hypercellular" already MEANS hypercellular for age — that is what the word
       means at the scope, and nobody calls a 90% marrow in a two-year-old
       hypercellular. So a set chip answers the criterion outright, whether or not
       a percentage was typed and whether or not a CBC was ever pasted.

       IT WINS OVER THE ARITHMETIC, and that is the point rather than a
       concession. The pathologist looked down the microscope; the band is a
       published normal range being applied to one number. Where they disagree the
       reader is the one who is right, and this app never overrules a chip with a
       calculation anywhere else either. It also disposes of the circularity the
       old comment worried about: where the chip WAS written by coreCellDerive()
       it agrees with the numbers by construction, so reading it back changes
       nothing — and where the reader has overridden it, the override is exactly
       what should be read.

       THE NUMBERS ARE THE FALLBACK, for the case where a percentage was entered
       and the chip left alone. Absolute or range: the Core tab treats those two
       fields as one statement and makes them mutually exclusive, so this has to
       read both — a cellularity entered as 70-80 previously behaved exactly like
       an empty box. `cellularity.pct` below stays the ABSOLUTE field alone on
       purpose: dxHypoplasticCellularity() reads it for hypoplastic MDS's "below
       30% of normal cellularity", which is an absolute criterion, and the midpoint
       of a range is not what it means.
    --------------------------------------------------------------------------- */
    const cellChip = toggleGroupValue('coreCellularity') || null;
    const cellNumber = (function () {
        if (cellPct !== null) return cellPct;
        const lo = findingNumber(document.getElementById('coreCellRangeLow')?.value);
        const hi = findingNumber(document.getElementById('coreCellRangeHigh')?.value);
        return lo === null || hi === null ? null : (lo + hi) / 2;
    })();

    const cellForAge = function (end) {
        if (cellChip) return cellChip === (end === 'hyper' ? 'hypercellular' : 'hypocellular');
        if (cellNumber === null || band === null) return null;
        return end === 'hyper' ? cellNumber > band[1] : cellNumber < band[0];
    };

    /* THE HISTORY, and the one place where the same fact does two different jobs
       in the two classifications.

       An antecedent MDS or MDS/MPN is a CLASSIFIER in WHO-HAEM5 — a documented
       history by itself makes a ≥20% blast case "AML, myelodysplasia-related",
       with no genetic finding required — while ICC 2022 treats it as a diagnostic
       QUALIFIER ("progressed from MDS") appended to a diagnosis arrived at some
       other way. So `antecedentMyeloid` may move the WHO name and may only
       annotate the ICC one, and the rules must read it accordingly.

       An antecedent MPN is deliberately NOT part of that: WHO's criterion names
       MDS and MDS/MPN only, and a blast crisis of an established MPN is a
       different event with a different name. It is recorded because the row has
       to be answerable without lying, and read only as context.

       Prior cytotoxic therapy never changes which entity the case is in ICC
       (", therapy-related" is a bare qualifier), while WHO-HAEM5 keeps MN-pCT
       as an ENTITY (docs\who\mn-pct.md) whose essential criteria are simply
       "meets the criteria for any MDS, MDS/MPN or AML" plus the history — the
       underlying type is still worked up the same way, and the WHO name carries
       "post cytotoxic therapy" appended. Either way the history gates nothing,
       which is why it never appears in a `requires`. */
    const history = {
        priorTherapy: findingFromToggle('ancPriorTherapy', ['yes'], ['no']),
        antecedent: ancClinical('ancAntecedent') || null,
        antecedentMyeloid: findingFromToggle('ancAntecedent', ['mds', 'mdsMpn'], ['none', 'mpn']),
        antecedentMpn: findingFromToggle('ancAntecedent', ['mpn'], ['none', 'mds', 'mdsMpn'])
    };

    /* The clinical block, read once — `counts` needs the sex to resolve PV's
       thresholds, so it cannot be assembled independently of it. */
    const clinical = {
        sex: ancClinical('ancSex') || null,
        splenomegaly: findingFromToggle('ancSpleen', ['palpable'], ['absent']),
        ldhElevated: findingFromToggle('ancLdh', ['elevated'], ['normal']),
        epoSubnormal: findingFromToggle('ancEpo', ['subnormal'], ['normal', 'elevated'])
    };

    return {
        templateType: currentTemplateType(),
        age: age,
        clinical: clinical,
        history: history,

        specimen: {
            blood: findingChecked('specPB'),
            aspirate: findingChecked('specAsp'),
            touchPrep: findingChecked('specTP'),
            clot: findingChecked('specPC'),
            core: findingChecked('specCB')
        },

        blasts: findingBlasts(),
        cytopenia: findingCytopenias(clinical.sex),
        dysplasia: findingDysplasia(),
        fibrosis: findingFibrosis(),
        genetics: findingGenetics(clinical.sex),

        cellularity: {
            pct: cellPct,
            quality: toggleGroupValue('coreCellularity') || null,
            severity: toggleGroupValue('coreCellSev') || null,
            expectedBand: band,
            /* Hypocellular FOR AGE, which is the only version of the question the
               classifications ask. The numbers answer it where they exist; the
               chip answers it where they cannot, and cannot be the autofill's own
               echo in that case. See the note at the top of this function. */
            hypoForAge: cellForAge('hypo'),
            /* The other end of the same band, and it is a criterion in its own
               right: "increased age-adjusted cellularity" is part of prefibrotic
               PMF's major morphologic criterion, and a normocellular-for-age marrow
               is one of the things that keeps a thrombocytosis in ET. */
            hyperForAge: cellForAge('hyper'),

            /* WHICH LINEAGE PREDOMINATES, straight off the Aspirate chip — which
               is itself derived from the M:E ratio against the reporting
               thresholds, so this is the counted answer and not an impression.
               `null` means no opinion was recorded, which on an uncounted
               aspirate is the honest state and not "balanced".

               Read for MDS-SF3B1, whose marrow "is typically hypercellular and
               shows erythroid predominance" — a likelihood in the
               histopathology section rather than a criterion in the box, so it
               is only ever scored, and it sits beside hyperForAge because the
               two are the same sentence's two halves. */
            predominance: toggleGroupValue('aspPredom') || null
        },

        ringSideroblasts: {
            state: toggleGroupValue(stainId('aspStain', 'iron', 'rings')) || null,
            pct: (function () {
                const p = stainPercent('aspStain', 'iron');
                return p && !p.range ? findingNumber(p.value) : null;
            })()
        },

        counts: findingCounts(clinical.sex),
        drivers: findingDrivers(),
        megakaryocytes: findingMegakaryocytes(),
        marrowMonocytes: findingMarrowMonocytes(),
        circulatingImmature: findingCirculatingImmature(),
        leukoerythroblastosis: findingLeukoerythroblastosis(),
        plasma: findingPlasma()
    };
}
