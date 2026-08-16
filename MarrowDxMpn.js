/* ============================================================================
   MarrowDxMpn.js — the myeloproliferative neoplasms

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. dxMpn is also read by the CMML rule, so this file must load before MarrowDxMdsMpn.js.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   The myeloproliferative gates

   THE ONE RULE THAT SHAPES THIS WHOLE SECTION: fibrosis grade may gate,
   megakaryocyte morphology may only score. Fibrosis grading reproduces at kappa
   >=0.8 across observers (Kvasnicka, Histopathology 2016; Mod Pathol 2014), while
   the ET-versus-prefibrotic-PMF morphologic call reproduces at kappa 0.41 with six
   observers reaching full consensus on 13% of cases (European Bone Marrow Working
   Group, Haematologica 2012;97:360). Weighting the two alike would assert a
   confidence the reference standard does not have. See dxUnresolvedPair() for what
   the engine does instead when those two candidates end up level.
------------------------------------------------------------------------------ */

const dxMpn = {
    /* Categorical in every classification: BCR::ABL1 makes the case CML, and its
       ABSENCE is a requirement of PV, ET and PMF. Note this is the negative that
       OPENS those three — which is why ancBcrAbl() reports "negative" as a real
       false and "pending" as null. */
    noBcrAbl: ['BCR::ABL1 not detected', function (f) { return dxNot(f.drivers.bcrAbl); }],
    driver: ['JAK2, CALR or MPL mutation', function (f) { return f.drivers.anyDriver; }],
    notFibrotic: ['reticulin fibrosis below MF-2', function (f) {
        return dxNot(dxBandAtLeast(f.fibrosis.grade, 2));
    }],
    fibrotic: ['reticulin fibrosis MF-2 or MF-3', function (f) {
        return dxBandAtLeast(f.fibrosis.grade, 2);
    }]
};

/* MAJOR CRITERION 3, AND IT IS A THREE-WAY DISJUNCTION WHOSE THIRD LIMB IS A
   NEGATIVE. Verbatim, and identical in both boxes:

     "JAK2, CALR, or MPL mutation or presence of another clonal marker or
      ABSENCE OF REACTIVE BONE MARROW FIBROSIS"

   The rule had this as `dxMpn.driver` — a bare requirement for a driver mutation
   — and that is the fourth MPN chapter in a row to correct the SHAPE of the
   accepted paths rather than a threshold. The cost was not subtle. A driver is
   absent in 5-10% of PMF by this chapter's own molecular figures (JAK2 ~60%,
   CALR 25-35%, MPL 5-10%), so `anyDriver === false` FAILED the gate and put
   triple-negative primary myelofibrosis in the `excluded` bucket — removed from
   the differential outright, on a marrow with MF-3 and classic atypical
   megakaryocytes. The `pmf` rule already carried a support clause and a caution
   written FOR that case; neither could ever fire, which is the contradiction
   that should have given it away.

   THE THIRD LIMB CANNOT BE ANSWERED HERE AND MUST THEREFORE BE NULL, never
   false. "Absence of reactive bone marrow fibrosis" is a clinical exclusion —
   footnote d lists infection, autoimmune and other chronic inflammatory
   conditions, hairy cell leukaemia and other lymphoid neoplasms, metastatic
   malignancy, and toxic myelopathy — and this app records none of them. Since
   dxAnyOf is true as soon as anything is true and false only when EVERYTHING is
   false, a permanently null limb makes this criterion unfailable: met when a
   driver or another clonal marker is present, unknown otherwise. That is the
   honest reading. The criterion is genuinely open on a triple-negative case
   until someone excludes the reactive causes, and the caution on `pmf` is what
   asks them to.

   ANOTHER CLONAL MARKER is any somatic mutation or any clonal cytogenetic
   abnormality. Footnote c names the intended search — "ASXL1, EZH2, TET2, IDH1,
   IDH2, SRSF2, and SF3B1 mutations ... may be of help in determining the clonal
   nature of the disease" — with "e.g.", so it is an illustration and not a list
   to match against. Any reported somatic variant is a clonal marker. */
function dxPmfClonality(f) {
    const cytogeneticClone = f.genetics.abnormalities.length ? true
        : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
    return dxAnyOf([
        f.drivers.anyDriver,
        f.genetics.anySomatic,
        cytogeneticClone,
        null                        // absence of reactive fibrosis — not recordable here
    ]);
}

/* MPN-NOS's clonality criterion, and THE FIFTH SHAPE CORRECTION FROM A PASTED
   CHAPTER: the rule gated on `dxMpn.driver` — a bare JAK2/CALR/MPL requirement
   — where Box 2.14 (docs/who/mpn-nos.md) reads "presence of driver mutations
   such as JAK2, CALR, or MPL mutations, OR ANOTHER CLONAL MARKER", and ICC
   Table 9 writes the same two limbs. So a triple-negative marrow whose
   clonality was a TET2 mutation or a clonal karyotype was `excluded` from the
   residual category outright — the same first-limb-only error PMF's criterion
   had, caught the same way.

   Footnote c names the intended search (ASXL1, EZH2, TET2, IDH1, IDH2, SRSF2,
   SF3B1, and ABL1 translocations) with "e.g.", so any somatic variant or clonal
   cytogenetic abnormality counts. UNLIKE PMF's criterion there is no third
   limb: with drivers, panel and karyotype all resulted negative, this is a real
   false, and the residual category genuinely closes. */
function dxMpnUClonality(f) {
    const cytogeneticClone = f.genetics.abnormalities.length ? true
        : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
    return dxAnyOf([f.drivers.anyDriver, f.genetics.anySomatic, cytogeneticClone]);
}

/* PMF's minor criteria. THE TWO BOXES DO NOT CARRY THE SAME LIST, and the code
   had the difference backwards: it passed `includeLeuko` true for BOTH stages on
   the belief that "WHO-HAEM5 additionally lists it for the prefibrotic stage".
   The chapter refutes that. Its prefibrotic box has FOUR minors — anaemia,
   leukocytosis, splenomegaly, LDH — and its fibrotic box has those four plus
   LEUKOERYTHROBLASTOSIS. Leukoerythroblastosis is a minor criterion of overt
   disease only, in WHO-HAEM5 as well as in ICC 2022.

   It is the right way round clinically too, which is why it read as plausible:
   the fibrotic chapter opens "the peripheral blood smear shows anisopoikilocytosis
   of red blood cells, dacrocytes (teardrop forms), and leukoerythroblastosis",
   while the prefibrotic one says only "thrombocytosis and/or leukocytosis". */
function dxPmfMinors(f) {
    return [
        ['anemia not attributable to a comorbid condition', f.cytopenia.anemia],
        ['leucocytosis >=11 x10^9/L', f.counts.leukocytosis],
        ['palpable splenomegaly', f.clinical.splenomegaly],
        ['LDH above the reference range', f.clinical.ldhElevated]
    ];
}

function dxPmfMinorAny(f, includeLeuko) {
    const values = dxPmfMinors(f).map(function (m) { return m[1]; });
    if (includeLeuko) values.push(f.leukoerythroblastosis);
    return dxAnyOf(values);
}

function dxPmfMinorsMet(f, includeLeuko) {
    const met = dxPmfMinors(f).filter(function (m) { return m[1] === true; })
        .map(function (m) { return m[0]; });
    if (includeLeuko && f.leukoerythroblastosis === true) met.push('leukoerythroblastosis');
    return met;
}

/* CML phase. WHO-HAEM5 ABOLISHED accelerated phase — it has chronic and blast
   only, and treats 10-19% blasts and >=20% basophils as high-risk features of
   chronic phase. ICC 2022 retained all three and uses those same numbers to define
   accelerated phase. So the findings are identical and only the name moves, which
   is exactly the case dxDiagnosisLine exists to print both halves of. */
function dxCmlBlastPhase(f) {
    return dxAnyOf([dxAtLeast(f.blasts.marrow, DX_BLAST_AML), dxAtLeast(f.blasts.blood, DX_BLAST_AML)]);
}

function dxCmlAccelerated(f) {
    return dxAnyOf([
        dxBetween(f.blasts.marrow, 10, 19),
        dxBetween(f.blasts.blood, 10, 19),
        dxAtLeast(f.counts.basophilPct, 20)
    ]);
}

/* ---------------------------------------------------------------------------
   PV's FOOTNOTE b — the route that skips the bone marrow biopsy

   "Major criterion 2 (bone marrow biopsy) may not be required in patients with
   sustained absolute erythrocytosis (haemoglobin concentrations of > 18.5 g/dL in
   men or > 16.5 g/dL in women, or haematocrit values of > 55.5% in men or > 49.5%
   in women) if major criterion 3 and the minor criterion are present."

   A SECOND, HIGHER SET OF THRESHOLDS than major criterion 1's, and the two are
   easy to conflate: 16.5 is the male DIAGNOSTIC hemoglobin and also the female
   WAIVER hemoglobin. Named separately so neither can be read as the other.

   Same sex-straddle rule as findingErythrocytosis: with no sex recorded the answer
   is given only where the two thresholds agree, because picking one would invent
   the patient's sex. */
const DX_PV_WAIVER_HGB_MALE = 18.5;
const DX_PV_WAIVER_HGB_FEMALE = 16.5;
const DX_PV_WAIVER_HCT_MALE = 55.5;
const DX_PV_WAIVER_HCT_FEMALE = 49.5;

function dxPvSustainedErythrocytosis(f) {
    const hgb = f.counts.hgb, hct = f.counts.hct;
    if (hgb === null && hct === null) return null;
    const meets = function (hgbLimit, hctLimit) {
        return (hgb !== null && hgb > hgbLimit) || (hct !== null && hct > hctLimit);
    };
    const asMale = meets(DX_PV_WAIVER_HGB_MALE, DX_PV_WAIVER_HCT_MALE);
    const asFemale = meets(DX_PV_WAIVER_HGB_FEMALE, DX_PV_WAIVER_HCT_FEMALE);
    if (f.clinical.sex === 'male') return asMale;
    if (f.clinical.sex === 'female') return asFemale;
    return asMale === asFemale ? asMale : null;
}

/* Major criterion 2, with footnote b applied. Returns NULL rather than TRUE when
   the waiver fires — the marrow criterion genuinely has not been met, and claiming
   otherwise would be a worse lie than the one it replaces. Exactly the shape
   dxWaive uses for the MDS mild-anemia sentence. */
function dxPvMarrowCriterion(f) {
    const panmyelosis = f.cellularity.hyperForAge;
    if (panmyelosis !== false) return panmyelosis;
    const waived = dxAllOf([dxPvSustainedErythrocytosis(f), f.drivers.jak2, f.clinical.epoSubnormal]);
    return waived === true ? null : panmyelosis;
}

/* CNL's white count threshold, and the cleanest numeric divergence in the MPN
   family: WHO-HAEM5 requires >=25 x10^9/L of every case, ICC 2022 lowers it to
   >=13 when CSF3R T618I or another activating CSF3R mutation is present. Gated on
   the more permissive reading so an ICC-eligible case is not silently dropped; the
   divergence is then named in the comment. */
const DX_CNL_WBC_WHO = 25;
const DX_CNL_WBC_ICC_CSF3R = 13;

function dxCnlIccOnly(f) {
    return dxAllOf([
        f.drivers.csf3r,
        dxAtLeast(f.counts.wbc, DX_CNL_WBC_ICC_CSF3R),
        dxNot(dxAtLeast(f.counts.wbc, DX_CNL_WBC_WHO))
    ]);
}


/* ---- Myeloproliferative neoplasms ---- */
dxRules.push(
    /* ---- Myeloproliferative neoplasms ------------------------------------ */
    {
        id: 'cml',
        family: 'mpn',
        who: 'Chronic myeloid leukemia, BCR::ABL1-positive',
        icc: null,
        /* THE FIRST PRIOR IN THE TABLE THAT IS A FUNCTION, and CML is the entity
           that earns the seam. "Worldwide, CML has an annual incidence of 1-2
           cases per 100 000 population… The annual incidence increases with age,
           from < 0.1 cases per 100 000 children to >= 2.5 cases per 100 000
           elderly individuals."

           That is a THIRTY-FOLD spread across the age range, inside one entity.
           A single number would be wrong at both ends: it would offer CML too
           readily in a child and too grudgingly in the eighth decade.

           THIS SAT AT +2 — THE TOP OF THE BAND — AND IT WAS THE WORKED EXAMPLE OF
           THE WRONG DENOMINATOR. The reasoning was "at 1-2 per 100 000 this is the
           commonest entity anywhere in this table", reached by comparing a general-
           population incidence against the MDS rules' shares OF MDS and against the
           boundary rules' nothing-at-all. 1-2 per 100 000 is not common: MDS as a
           family is commoner, and among marrows actually sent for this question the
           clonal and idiopathic cytopenias are commoner still. Read on the one
           denominator DX_PRIOR_BAND now names, CML is an ordinary member of a
           family that sits at 0 — below MDS-LB, MDS-IB and MDS-SF3B1, level with
           polycythemia vera and essential thrombocythemia, whose incidences it
           matches almost exactly.

           The age tier survives the correction because it is a statement WITHIN the
           entity and so is denominator-free: CML really is thirty times rarer in a
           child, and no rescaling of the table changes that.

           f.age comes from a DOB line in the pasted CBC, so it is null on most
           cases; the untiered value is the overall figure, which is the right thing
           to assume when nobody has said. */
        prior: function (f) {
            if (f.age === null) return 0;
            if (f.age < 20) return -2;        // < 0.1 per 100 000 in children
            return 0;
        },
        priorReason: 'CML is an ordinary member of the MPN family, which sits below MDS in ' +
            'marrow practice; rare under 20',
        /* THE ONLY MPN IN THE TABLE THAT IS GENETICALLY DEFINED, and its own name
           says so. Basophilia and splenomegaly point at it and never make it; the
           fusion does. The other six rules deliberately declare nothing here —
           PV's JAK2 criterion has a published waiver (a panmyelotic marrow with
           subnormal erythropoietin), and the driver mutation is one criterion
           among several for the rest, so none of their names asserts a result. */
        definedBy: {
            finding: function (f) { return f.drivers.bcrAbl; },
            phrase: 'the BCR::ABL1 fusion',
            study: 'cytogenetic and molecular'
        },
        requires: [
            ['BCR::ABL1 detected', function (f) { return f.drivers.bcrAbl; }]
        ],
        /* THE BOX HAS TWO ESSENTIAL CRITERIA AND THIS RULE HAD ONE. "Essential:
           peripheral blood neutrophilic leukocytosis; detection of the Ph
           chromosome and/or BCR::ABL1." The leukocytosis was missing outright —
           the same rate of correction the MDS criteria boxes produced, now holding
           for the first MPN chapter read against source.

           IT GOES TO `expects`, NOT TO `requires`, AND THE CHAPTER IS WHY: it
           contradicts its own essential criterion four paragraphs earlier.
           "Atypical presentations include marked thrombocytosis without
           leukocytosis that mimics essential thrombocythaemia or other types of
           myeloproliferative neoplasms." A BCR::ABL1-positive marrow with a normal
           white count is a real presentation the chapter names, and it is exactly
           the case where a reader most needs CML on the list — so a hard gate here
           would delete the diagnosis on the presentation most likely to be missed
           without it. Heavy against, because it genuinely is atypical.

           Granulocytic dysplasia is the mirror image: "Granulocytic dysplasia
           should be absent" and "Dysplastic changes should be absent", said twice,
           once for blood and once for marrow. Still not a gate — the fusion
           defines the entity and a dysplastic BCR::ABL1-positive marrow is still
           CML — but it argues, and it is what separates CML from the atypical
           myeloid neoplasms it can resemble.

           ITS `for` IS ZERO, AND THAT IS THE GENERAL RULE FOR AN ABSENCE. It was 1,
           which paid a point towards chronic myeloid leukemia to every marrow that
           was not dysplastic — which is most marrows, including every reactive one.
           An absence cannot be evidence FOR anything here: the field CML competes
           in is overwhelmingly non-dysplastic, so "no granulocytic dysplasia" has a
           likelihood ratio of about one and its whole weight belongs on the
           `against` side, where dysplasia present really does argue for an atypical
           myeloid neoplasm instead. See the point-ladder note in MarrowDxKernel.js;
           dxLikelihoodAudit() warns if this creeps back.

           The leukocytosis clause keeps its `for`, and the contrast is the point:
           a neutrophilic leukocytosis is a POSITIVE finding, uncommon in the field
           and near-universal in CML, so it discriminates in both directions. */
        expects: [
            /* +4, NOT +1, AND THE OLD +1 WAS THE SAME NUMBER THIS RULE PAID FOR
               ANEMIA. Two things went wrong at once and they compounded: the
               "always pay a small `for`" advice in MarrowDxKernel.js (now
               corrected — it answered the wrong question), and a reading of this
               chapter that took its one NEGATIVE sentence and left the positives.
               A neutrophilic leukocytosis is an essential criterion of CML and is
               rare in the field of myelodysplastic, boundary and acute candidates
               this rule is ranked against. Both halves of the weight are therefore
               large. */
            ['peripheral blood neutrophilic leukocytosis', 4, -3, function (f) {
                return dxAllOf([f.counts.leukocytosis, f.counts.neutrophilia]);
            }],
            ['granulocytic dysplasia absent', 0, -3, function (f) {
                return dxNot(f.dysplasia.myeloid.atLeast10);
            }]
        ],
        /* *** THE HISTOPATHOLOGY PARAGRAPH, READ AGAIN AND IN FULL. ***

           "The peripheral blood shows leukocytosis … due primarily to neutrophils
           in various stages of maturation, with peaks in the proportions of
           myelocytes and segmented neutrophils. … Granulocytic dysplasia should be
           absent. Absolute basophilia and eosinophilia are common."

           The first pass through this paragraph extracted the fourth sentence and
           nothing else — the one clause that is a negative, and the only one that
           does not raise CML above its rivals. The maturation spectrum had no
           clause at all, the basophilia clause existed only at the >= 20%
           high-risk threshold and not at the "common" one the sentence is about,
           and eosinophilia was a single point. What is scored below is the whole
           paragraph plus the marrow one that follows it. */
        supports: [
            /* PATHOGNOMONIC — the top of the ladder. "A myeloproliferative neoplasm
               DEFINED BY the BCR::ABL1 fusion gene"; nothing else in this table is
               compatible with a demonstrated fusion, and every other MPN rule
               excludes it outright. At +4 it was worth three soft morphologic
               findings on a competitor, which is not what "defined by" means. */
            ['BCR::ABL1 is the defining abnormality', 8, function (f) { return f.drivers.bcrAbl; }],
            /* "Absolute basophilia and eosinophilia are COMMON" — a sentence about
               ordinary chronic-phase CML, which had no clause at all. The only
               basophil clause was the >= 20% one below, a HIGH-RISK feature: a
               different threshold answering a different question, and using it as
               the entity's basophil signal meant an unremarkable CML with 6%
               basophils scored nothing for the finding its chapter calls common.
               DX_BASOPHILIA_PCT is the kernel's conventional upper limit of normal,
               already justified there. Basophilia is rare in the field, so it is
               worth more than its frequency in CML alone would suggest. */
            ['absolute basophilia', 2,
                function (f) { return dxAtLeast(f.counts.basophilPct, DX_BASOPHILIA_PCT); }],
            /* A HIGH-RISK FEATURE, not a diagnostic one, and the distinction is the
               chapter's: ">= 20% basophils in the peripheral blood" is listed among
               the features that make this "chronic phase with high-risk features".
               It stacks with the clause above on purpose — marked basophilia is
               both commoner in CML than in anything else here AND a phase marker —
               and it drives the name through whoFor below. */
            ['basophilia >=20% of leucocytes', 2, function (f) { return dxAtLeast(f.counts.basophilPct, 20); }],
            /* Same sentence, other limb. Raised from 1: the threshold the app
               records is the CEL one (>= 1.5 x10^9/L), which is a high bar, so
               meeting it is a stronger statement than "eosinophilia" usually is —
               and its absence correspondingly says nothing, which is why this is a
               support and not an `expects`. */
            ['eosinophilia', 2, function (f) { return f.counts.eosinophilia; }],
            /* "NEUTROPHILS IN VARIOUS STAGES OF MATURATION, WITH PEAKS IN THE
               PROPORTIONS OF MYELOCYTES AND SEGMENTED NEUTROPHILS." The single most
               characteristic thing about a CML film after the raw count, and it had
               no clause whatever. Circulating promyelocytes, myelocytes and
               metamyelocytes are what the app records of it; the MYELOCYTE PEAK
               specifically — the bulge that distinguishes CML's left shift from a
               reactive one — is not a finding this app has, and inventing it from
               the counter's percentages would be a threshold no source publishes.
               So this scores the maturation spectrum and the chapter's own emphasis
               on its shape is noted rather than guessed at. */
            ['circulating immature granulocytes (maturation across all stages)', 3,
                function (f) { return f.circulatingImmature; }],
            ['palpable splenomegaly', 1, function (f) { return f.clinical.splenomegaly; }],
            /* "Megakaryocytes are increased in number in more than half of the
               cases, typically with altered morphology that includes small size and
               hyposegmented nuclei (referred to as dwarf megakaryocytes)." More
               than half is a frequency, so it scores. */
            ['megakaryocytes increased in number', 1, function (f) { return f.megakaryocytes.increased; }],
            /* THE MORPHOLOGIC HALF OF THAT SENTENCE, which was also missing. The
               dwarf megakaryocyte is `smallHypolobated` in the descriptor
               vocabulary, and `megakaryocytes.hypolobated` is the two-key pattern
               that contains it. IT IS SHARED WITH MDS-5q and that is acceptable
               here: the finding genuinely points at both, and BCR::ABL1 is what
               separates them — a shared descriptor that discriminates CML from its
               MPN neighbours is doing its job even when it cannot discriminate CML
               from an entity a gate already handles. */
            ['small hypolobated (dwarf) megakaryocytes', 2,
                function (f) { return f.megakaryocytes.hypolobated; }],
            /* "The bone marrow is hypercellular, with marked granulocytic
               proliferation at all stages" — near-universal in CML but common
               across the field too, so it stays at a point. */
            ['hypercellular for age', 1, function (f) { return f.cellularity.hyperForAge; }],
            /* "Marked granulocytic proliferation at all stages of differentiation"
               and "Erythroid precursors are typically decreased" — the two halves
               of one picture, and together they are a good deal rarer in the field
               than a hypercellular marrow is. Raised from 1. */
            ['myeloid predominance', 2, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'myeloid';
            }],
            /* "Absolute monocytosis may be present, but the proportion of monocytes
               is usually < 3%, except in rare cases with the p190 BCR::ABL1
               isoform, which often mimic chronic myelomonocytic leukaemia."

               The one clause here aimed at a specific rival rather than at the
               field. CMML's own essential criterion is monocytes >= 10% of
               leukocytes, so a film at or above that bar is describing the entity
               this chapter names as the mimic — which argues, and does not
               disqualify, because the chapter says in the same breath that the p190
               cases really do look like that. */
            ['monocytes >=10% of leucocytes (the chronic myelomonocytic mimic)', -2,
                function (f) { return dxAtLeast(f.counts.monocytePct, 10); }]
        ],
        whoFor: function (f) {
            if (dxCmlBlastPhase(f) === true) return 'Chronic myeloid leukemia, blast phase';
            if (dxCmlAccelerated(f) === true) {
                return 'Chronic myeloid leukemia, chronic phase with high-risk features';
            }
            return 'Chronic myeloid leukemia, BCR::ABL1-positive';
        },
        iccFor: function (f) {
            if (dxCmlBlastPhase(f) === true) return 'Chronic myeloid leukemia, blast phase';
            if (dxCmlAccelerated(f) === true) return 'Chronic myeloid leukemia, accelerated phase';
            return null;
        },
        diverges: function (f) { return dxCmlAccelerated(f) === true; },
        divergence: 'WHO-HAEM5 has abolished accelerated phase, retaining 10–19% blasts and ' +
            '≥20% basophils as high-risk features of chronic phase; ICC 2022 defines accelerated ' +
            'phase by those same findings. The findings are identical; only the designation differs.'
    },
    {
        id: 'pv',
        family: 'mpn',
        who: 'Polycythemia vera',
        icc: null,
        /* "According to data from the Surveillance, Epidemiology, and End Results
           (SEER) Program, the overall incidence rate is 1.57 cases (95% CI:
           1.55-1.60) per 100 000 person-years." Squarely inside CML's 1-2, so the
           three classical myeloproliferative neoplasms sit at one baseline — which
           is right, and which the erythrocytosis and BCR::ABL1 gates keep from ever
           mattering between PV and CML, since no marrow can be both.

           THE TIER IS 0, NOT +2, and the figure did not change — the denominator
           did. 1.57 per 100 000 places the MPN family at the middle of the band
           under DX_PRIOR_BAND, below the myelodysplastic neoplasms and well below
           the boundary outcomes; the number quoted here is the derivation of that
           placement and not a tier in its own right. */
        prior: 0,
        priorReason: 'PV incidence is 1.57 per 100 000 person-years (SEER) — the MPN family baseline',
        /* THE PATH STRUCTURE WAS WRONG, and reading the box is what showed it.

           "The diagnosis requires either all three major criteria or the first two
           major criteria plus the minor criterion." Both paths contain major 2 —
           the marrow. So the criteria are:

               major 1  erythrocytosis                       (both paths)
               major 2  panmyelosis                          (both paths)
               major 3 OR minor   JAK2, or subnormal EPO      (whichever path)

           The clause here used to read "JAK2, or a panmyelotic marrow with
           subnormal erythropoietin", which let a JAK2-positive erythrocytosis
           satisfy the rule with NO marrow criterion at all. That is only permitted
           under footnote b, and footnote b demands considerably more: the higher
           sustained-erythrocytosis thresholds AND JAK2 AND subnormal EPO together.

           ERYTHROCYTOSIS STAYS A HARD GATE, and the chapter is unusually direct
           about why. It acknowledges the problem — "at times erythrocytosis may be
           masked by an underlying iron deficiency", and thrombotic presentations
           "can have normal blood counts" — and then answers it: a JAK2-mutated
           case without sufficient erythrocytosis is not to be called masked PV but
           "MPN-NOS", reviewed closely. So the threshold really is definitional,
           and the alternative diagnosis is one this table already carries. */
        requires: [
            ['hemoglobin or hematocrit above the sex-specific threshold', function (f) {
                return f.counts.erythrocytosis;
            }],
            ['JAK2 mutation (major criterion 3) or subnormal erythropoietin (the minor criterion)',
                function (f) {
                    return dxAnyOf([f.drivers.jak2, f.clinical.epoSubnormal]);
                }]
        ],
        /* MAJOR CRITERION 2 IS SOFT, AND THE CHAPTER ARGUES FOR IT TWICE. Exon 12
           cases — "reported in almost all cases lacking JAK2 p.V617F" — have "a
           more isolated erythrocytosis", so the trilineage panmyelosis this
           criterion describes is exactly what they do NOT show. A hard gate would
           delete the JAK2-negative-for-V617F cases the rule already carries a
           support clause to protect. Footnote b then waives the criterion outright
           on a sufficiently erythrocytotic, JAK2-positive, EPO-low case.

           Low `for`: nearly every PV has it, so meeting it separates little. */
        /* THE LABEL PROMISED PANMYELOSIS AND THE PREDICATE DELIVERED CELLULARITY.
           Major criterion 2 is "age-adjusted hypercellularity with trilineage growth
           (panmyelosis), including prominent erythroid, granulocytic, and
           megakaryocytic proliferation with pleomorphic, mature megakaryocytes";
           dxPvMarrowCriterion tests f.cellularity.hyperForAge and nothing else.

           Relabelled rather than rebuilt, and that is the deliberate half of the
           choice. A genuine trilineage conjunction would use dxAllOf, which is
           false-dominant — so a polycythemia vera whose megakaryocytes were charted
           "adequate" would take the whole -3 for a criterion it may well meet. The
           other two limbs are better expressed as their own weights, where each can
           be null independently, and they are now below. `for` stays 1 because what
           it tests IS near-universal in the field as well as in the entity: CML,
           prefibrotic PMF, CMML and AML marrows are all hypercellular too. */
        expects: [
            ['age-adjusted hypercellularity (part of major criterion 2)', 1, -3,
                dxPvMarrowCriterion],
            /* THE EPO PAIR, MERGED. It was two support clauses — `['subnormal serum
               erythropoietin', 3]` and `['erythropoietin not subnormal', -1]` — one
               finding written twice, which is the shape doctrine 7 forbids and which
               kept the pair out of the audit's reach. Both MarrowDxLikelihood.js and
               MarrowDxEngine.js already describe it in their headers as ONE soft
               criterion at "+3 present, -1 absent"; it now is one. The asymmetry is
               the sourced part: specificity for PV against secondary erythrocytosis
               is ~90-96% at a sensitivity of only ~64-80%, so a low value is strong
               evidence and a normal one is weak evidence against. */
            ['subnormal serum erythropoietin', 3, -1,
                function (f) { return f.clinical.epoSubnormal; }],
            /* "Granulocytic cells show a normal pattern of maturation, and blasts are
               not increased." An absence, so `for` is 0 — the field polycythemia vera
               competes in is largely non-dysplastic — and the whole weight is on the
               contradiction. Essential thrombocythemia already carries this exact
               pair; polycythemia vera carried neither half. */
            ['no dysplasia in any lineage', 0, -3, function (f) { return dxNot(f.dysplasia.any); }]
        ],
        excludes: [
            ['BCR::ABL1 detected', function (f) { return f.drivers.bcrAbl; }]
        ],
        supports: [
            /* The "~98%" is NOT in the pasted chapter and has been dropped from the
               label. What the chapter says is "Other mutations in exon 12 of JAK2 …
               have been reported in almost all cases lacking JAK2 p.V617F" — which
               supports the exon-12 clause below, not a headline sensitivity figure.
               +4 and not the pathognomonic +8: three MPN rules read JAK2. */
            ['JAK2 mutation (V617F or exon 12)', 4,
                function (f) { return f.drivers.jak2; }],
            /* Erythropoietin has moved to `expects` above, merged with its own
               negative half. The panmyelosis clause likewise. */
            /* "Bone marrow smears show a prominent erythroid proliferation with
               either a normal or a reduced myeloid-to-erythroid ratio", and
               "Histological sections usually show a hypercellular bone marrow with
               proliferation in all lineages (panmyelosis), often with erythroid
               predominance in untreated patients."

               THE ERYTHROID LIMB OF MAJOR CRITERION 2, WHICH THE RULE READ NOWHERE.
               Among the entities that survive an erythrocytosis this is close to
               unique — CML, prefibrotic PMF and CNL are myeloid or balanced, and
               essential thrombocythemia scores ANY recorded predominance at -2. */
            ['erythroid predominance', 2, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'erythroid';
            }],
            /* The mirror of the same sentence, and the reason it is worth stating
               separately: "either a normal or a reduced myeloid-to-erythroid ratio"
               names the two states the chapter permits, and a recorded myeloid
               predominance is neither. It is what the neighbours look like. */
            ['myeloid predominance (PV expects a normal or reduced M:E ratio)', -2, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'myeloid';
            }],
            /* "Megakaryocytes are increased in number and show atypical morphology,
               with enlarged and hypersegmented nuclei." The rule scored the
               MORPHOLOGY and never the NUMBER — the same half-a-sentence omission
               the CML rule had, found in the same audit. One point: megakaryocytes
               are increased across most of the MPN family. */
            ['megakaryocytes increased in number', 1,
                function (f) { return f.megakaryocytes.increased; }],
            /* "Physical manifestations of PV are not universal but can include
               plethora (especially pre-phlebotomy), OCCASIONALLY splenomegaly, and
               rarely hepatomegaly." Occasionally — so it stays at +1 and must not
               be read as characteristic the way it is in myelofibrosis. */
            ['palpable splenomegaly', 1, function (f) { return f.clinical.splenomegaly; }],
            /* "Megakaryocytes vary in size and morphology and usually include forms
               with hypersegmented (staghorn-like) hyperchromatic nuclei" — the same
               descriptor the app records for essential thrombocythemia, and the
               reason it may only ever SCORE here: staghorn nuclei do not separate
               PV from ET, the erythrocytosis does. */
            ['pleomorphic megakaryocytes with hypersegmented staghorn nuclei', 1,
                function (f) { return f.megakaryocytes.etLike; }],
            /* "Leukocytosis (usually neutrophilia) and/or thrombocytosis are
               variably present at baseline" — variably, so a point apiece and no
               more; their absence says nothing.

               SPLIT, BECAUSE ONE DISJUNCTION PAID THE SAME POINT FOR ONE FINDING AS
               FOR TWO, and it discarded the chapter's own qualifier. "Leukocytosis
               (USUALLY NEUTROPHILIA)" is a statement about which leukocytosis, and
               the app records the distinction. A neutrophilic leukocytosis together
               with a thrombocytosis is a materially different case from either
               alone, and the old clause could not say so. */
            ['neutrophilia', 1, function (f) { return f.counts.neutrophilia; }],
            ['thrombocytosis', 1, function (f) { return f.counts.thrombocytosis; }],
            /* "Neutrophilia with some LEFT SHIFT and rarely basophilia may be
               present." A fifth of what the same finding is worth to CML, because
               "some" is all the chapter claims — but it was worth nothing at all. */
            ['circulating immature granulocytes (left shift)', 1,
                function (f) { return f.circulatingImmature; }],
            /* A JAK2 change that is not V617F is, in an erythrocytosis, most often
               exon 12 — and that variant's marrow shows ISOLATED ERYTHROID
               HYPERPLASIA rather than panmyelosis, with normal platelets and white
               count. It is noted so a bland-megakaryocyte marrow is not read as
               evidence against PV in the one case where it is expected. */
            ['JAK2 mutation other than V617F (exon 12 phenotype: isolated erythroid hyperplasia)', 1,
                function (f) { return f.drivers.jak2NonV617F; }]
        ],
        diverges: function () { return true; },
        /* The trailing hedge ("verify against the source tables") is gone: ICC's
           Table 3 is now pasted at docs/who/icc-2022-arber-blood.md, and what the
           reordering does is verified — ICC's first two majors are the threshold
           and the JAK2 mutation, so its combination rule permits a MARROW-FREE
           diagnosis (threshold + mutation + subnormal EPO), where WHO's first two
           are the threshold and the biopsy, a mutation-free route. */
        divergence: 'ICC 2022 retains an increased red cell mass (>25% above the mean normal ' +
            'predicted value) as an alternative to the hemoglobin and hematocrit thresholds, ' +
            'which WHO-HAEM5 has removed. The two also number the major criteria differently: ' +
            'under ICC, "the first 2 major criteria plus the minor criterion" permits diagnosis ' +
            'on the threshold, the JAK2 mutation, and a subnormal erythropoietin without a ' +
            'marrow biopsy, whereas under WHO-HAEM5 that combination reaches the threshold and ' +
            'the biopsy without the mutation.'
    },
    {
        id: 'et',
        family: 'mpn',
        who: 'Essential thrombocythemia',
        icc: null,
        /* "According to SEER data, the overall incidence rate is 1.55 cases (95%
           CI: 1.52-1.57) per 100 000 person-years" — statistically indistinguishable
           from PV's 1.57, so the two sit at the same baseline, as they should.

           A HAZARD WORTH NAMING: prefibrotic PMF carries no prior at all, because
           its chapter has not been pasted. So this number does not currently mean
           "ET is commoner than prefibrotic PMF" — it means ET has been read and
           prefibrotic PMF has not. It is true that ET is the commoner of the two,
           but revisit this pair when the PMF chapter lands rather than treating the
           gap as evidence. dxUnresolvedPair() is unaffected either way: it compares
           the prior-free subtotal precisely so a prevalence figure can never settle
           the one comparison the engine refuses to settle. */
        prior: 0,
        priorReason: 'ET incidence is 1.55 per 100 000 person-years (SEER) — the MPN family baseline',
        requires: [
            ['platelets >=450 x10^9/L', function (f) { return f.counts.thrombocytosis; }],
            dxMpn.noBcrAbl,
            /* ET HAS NO MARROW WAIVER and PV does — the cleanest asymmetry in the
               classical triad. The bone marrow is ET's major criterion 2, so it
               falls inside "the first three" and appears in BOTH accepted paths;
               the alternative path waives the DRIVER MUTATION, not the biopsy.

               So this gate can be true or unknown and never false. It asks whether
               a marrow was described, NOT whether it looked like ET — excluding ET
               on a megakaryocyte gestalt is the thing the reproducibility data
               forbids (see the note above dxMpn). */
            ['bone marrow examined (ET has no marrow waiver)', function (f) {
                return f.megakaryocytes.assessed ? true : null;
            }]
        ],
        /* THE PATH STRUCTURE WAS WRONG HERE TOO, and in the direction that matters
           most: MAJOR CRITERION 4 WAS NOT REPRESENTED AT ALL.

           "The diagnosis requires either all the major criteria or the first three
           major criteria plus a minor criterion." Major 4 is the driver mutation,
           and it is the one the alternative path waives — in exchange for a minor
           criterion, which is "presence of a clonal marker" OR "exclusion of
           reactive thrombocytosis". Neither path lets a thrombocytosis through with
           no clonal evidence and no secondary cause excluded.

           The rule scored the driver +4 and required nothing. So a reactive
           thrombocytosis — infection, iron deficiency, post-splenectomy, the single
           commonest cause of a platelet count over 450 — met every gate and landed
           `supported`. That is a false positive on the commonest differential the
           entity has, which is worse than PV's missing marrow criterion was.

           SOFT, NOT A GATE, for the usual reason: a driver panel that has not
           resulted is unknown rather than negative, and 5-15% of real ET is triple
           negative ("in cases that lack mutant JAK2, CALR, and MPL, a diagnosis of
           ET might remain challenging"). Low `for` because ~90% of ET meets it, so
           meeting it separates little; heavy `against` because failing it means no
           driver AND no clonal marker at once.

           THE THIRD ARM IS UNANSWERABLE HERE. "Exclusion of reactive thrombocytosis"
           is a clinical judgement the template records nothing for — no iron
           studies, no inflammatory markers, no splenectomy history. So this clause
           reads only the clonal half, and a genuinely triple-negative ET diagnosed
           by excluding secondary causes will be marked against on a criterion it
           actually met. Same class of gap as CMML's three unanswerable criteria.

           MAJOR CRITERION 3 supplies the other two clauses. "WHO criteria for ...
           other myeloid neoplasms are not met", which the histopathology section
           states plainly as "dysplastic changes should not be present in any
           lineage, and blasts are not increased". Dysplasia is soft rather than
           excluding because minor dysplastic change in a myeloproliferative marrow
           is common and the alternative is deleting the candidate outright. */
        expects: [
            /* `for` IS 0 FOR TWO INDEPENDENT REASONS, and the second one is a defect
               rather than a doctrine.

               (1) THE SAME FINDING WAS SCORED TWICE IN ONE RULE. This clause's first
               limb is `f.drivers.anyDriver`, and `supports` pays that same finding
               +4 twenty lines below — so a driver-positive ET took +5 for one
               finding, above the ladder's ceiling for anything short of
               pathognomonic. dxMergeEvidence dedupes a local clause against the
               REGISTRY, not against another local clause, so nothing caught it.

               (2) THE PREDICATE IS NOT A DRIVER TEST. Its weaker limbs — any somatic
               mutation, any named karyotypic abnormality — are common right across
               the field: `anySomatic` is true of every CHIP and CCUS case by
               definition and of most myelodysplastic ones. Paying a `for` here would
               score a DNMT3A-mutant marrow with platelets of 460 exactly as it
               scores a JAK2-mutant essential thrombocythemia. The driver's weight
               belongs on the driver, where it already is.

               `against` is untouched at -4 and is what this clause is for: failing it
               means no driver AND no clonal marker AND no abnormal karyotype at once,
               which is the case that was reaching `supported` as confident ET before
               this clause existed. */
            ['JAK2, CALR or MPL mutation, or in its absence a clonal marker', 0, -4, function (f) {
                const cyto = f.genetics.abnormalities.length ? true
                    : (f.genetics.karyotypeStatus === 'resulted' ? false : null);
                return dxAnyOf([f.drivers.anyDriver, f.genetics.anySomatic, cyto]);
            }],
            /* `for` 0: an absence, and the field essential thrombocythemia is ranked
               against is mostly non-dysplastic, so meeting this separates nothing.
               The weight is all on the `against` side, where dysplasia genuinely
               redirects the case. Same correction as CML's granulocytic-dysplasia
               clause; see the point-ladder note in MarrowDxKernel.js. */
            ['no dysplasia in any lineage', 0, -3, function (f) { return dxNot(f.dysplasia.any); }]
        ],
        excludes: [
            ['reticulin fibrosis MF-2 or MF-3', function (f) { return dxBandAtLeast(f.fibrosis.grade, 2); }],
            ['erythrocytosis meeting the polycythemia vera threshold', function (f) {
                return f.counts.erythrocytosis;
            }],
            /* THE TRAP THIS ENTRY EXISTS FOR. A JAK2 V617F case with thrombocytosis
               reads as textbook ET — but SF3B1 co-occurs with JAK2 in 50-65% of
               MDS/MPN-SF3B1-T, where the JAK2 drives the platelets and the SF3B1
               drives the anemia and the ring sideroblasts. Categorical, not
               points: without the redirect the engine confidently calls ET on a
               case that is not ET. */
            ['SF3B1 mutation with thrombocytosis (MDS/MPN-SF3B1-T)', function (f) {
                return dxAllOf([f.genetics.sf3b1, f.counts.thrombocytosis]);
            }]
        ],
        supports: [
            ['a myeloproliferative driver mutation', 4, function (f) { return f.drivers.anyDriver; }],
            ['large, mature megakaryocytes with hyperlobulated staghorn nuclei', 3,
                function (f) { return f.megakaryocytes.etLike; }],
            /* THE CHAPTER CORRECTED THIS ONE. It used to read "marrow not
               hypercellular for age", which is TRUE of a hypocellular marrow — so a
               hypocellular marrow earned ET two points for a finding the chapter
               lists as a reason to doubt the diagnosis: "Bone marrow cellularity is
               typically normal for age. HYPOCELLULARITY OR hypercellularity without
               a clear cause should prompt careful consideration of other
               differential diagnostic possibilities." Normocellular means neither
               end, and the definition already says so — "in a normocellular bone
               marrow". */
            ['normocellular for age', 2, function (f) {
                return dxAllOf([dxNot(f.cellularity.hyperForAge), dxNot(f.cellularity.hypoForAge)]);
            }],
            /* MAJOR CRITERION 2's SECOND HALF: "no significant increase or left
               shift in neutrophil granulopoiesis or erythropoiesis", restated in the
               histopathology section as "the myeloid-to-erythroid ratio is usually
               in the normal range". A recorded predominance is therefore against ET
               whichever way it leans — myeloid points at prefibrotic PMF or CML,
               erythroid at PV — which is why one clause covers both.

               Only ever negative. `predominance` is null both when the M:E ratio
               was balanced and when no aspirate was counted, so there is no reading
               of it that means "normal ratio, confirmed"; claiming the points on a
               null would be claiming them on an uncounted aspirate. */
            ['myeloid or erythroid predominance (ET expects a normal M:E ratio)', -2, function (f) {
                return f.cellularity.predominance === null ? null : true;
            }],
            /* "these types are found with SIMILAR FREQUENCY in ET" — so type 2 is
               not enriched in ET in absolute terms, and the old label said it was.
               The claim that survives is comparative: type 1 dominates in PMF, so
               type 2 tilts the one comparison this rule is really making. Worth a
               point in that comparison and nothing on its own, which is what +1
               against prefibrotic PMF's mirrored +1 for type 1 already encodes. */
            ['CALR type 2, which favors ET over primary myelofibrosis', 1,
                function (f) { return f.drivers.calrType2; }],
            /* "Dysplastic changes should not be present in any lineage, and BLASTS
               ARE NOT INCREASED." Not an exclusion: ET has an accelerated phase at
               10-19% blasts and a blast phase at >=20%, so increased blasts in a
               known ET are a phase, not a contradiction. In a marrow being worked up
               for the FIRST time they argue elsewhere, and that is what this is. */
            ['blasts increased (chronic-phase ET has none)', -3, function (f) {
                return dxAnyOf([dxAtLeast(f.blasts.marrow, 10), dxAtLeast(f.blasts.blood, 10)]);
            }],
            /* THE FOUR THAT ARGUE FOR PREFIBROTIC PMF INSTEAD. Each is a published
               discriminator in that specific comparison and each is worth only -2,
               because none of them individually settles it — the best published
               composite (Lekovic, Cancers 2023) reaches 88% positive predictive
               value only at a score requiring several together, and even then at
               ~40-52% sensitivity. */
            ['megakaryocyte pattern favors prefibrotic PMF', -2,
                function (f) { return f.megakaryocytes.pmfLike; }],
            ['LDH above the reference range', -2, function (f) { return f.clinical.ldhElevated; }],
            ['palpable splenomegaly', -2, function (f) { return f.clinical.splenomegaly; }],
            ['JAK2 allele burden above 50%', -2, function (f) { return dxAtLeast(f.drivers.jak2Vaf, 50); }]
        ],
        /* "Any amount of erythrocytosis OR IRON DEFICIENCY (especially in the
           setting of the JAK2 p.V617F mutation) should raise the question of
           whether the diagnosis is more accurately polycythaemia vera."

           The erythrocytosis half is already a hard exclusion above, so only the
           iron-deficiency half needs saying — and it needs saying as a caution
           rather than as points, because the chapter's instruction is to go and
           check something, not to shift a score. This is the same masked-PV case
           the PV chapter refuses to name masked PV: there, a JAK2 case short of the
           threshold becomes MPN-NOS; here, the reason it fell short may simply be
           that the iron is gone. */
        caution: function (f) {
            if (dxAllOf([f.counts.microcytic, f.drivers.jak2V617F]) !== true) return '';
            return 'Microcytic red blood cells are present in the setting of a JAK2 p.V617F ' +
                'mutation. Iron deficiency may mask the erythrocytosis of polycythemia vera; ' +
                'correlation with iron studies, and reassessment of the hemoglobin and hematocrit ' +
                'after iron repletion, is recommended before essential thrombocythemia is ' +
                'diagnosed.';
        }
    },
    {
        id: 'prePmf',
        family: 'mpn',
        who: 'Primary myelofibrosis, prefibrotic/early stage',
        icc: null,
        requires: [
            ['megakaryocytic proliferation and atypia', function (f) { return f.megakaryocytes.pmfLike; }],
            dxMpn.notFibrotic,
            dxMpn.noBcrAbl,
            ['a driver mutation, another clonal marker, or no reactive cause of fibrosis',
                dxPmfClonality],
            /* FOUR MINORS AT THIS STAGE, not five — see dxPmfMinors. */
            ['at least one minor criterion', function (f) { return dxPmfMinorAny(f, false); }]
        ],
        supports: [
            ['a myeloproliferative driver mutation', 4, function (f) { return f.drivers.anyDriver; }],
            ['pleomorphic, hypolobulated, densely clustered megakaryocytes', 3,
                function (f) { return f.megakaryocytes.pmfLike; }],
            ['increased age-adjusted cellularity', 3, function (f) { return f.cellularity.hyperForAge; }],
            /* "The bone marrow in pre-PMF is hypercellular (UNLIKE MOST CASES OF
               ESSENTIAL THROMBOCYTHAEMIA) and most often shows a significant
               increase in myeloid-to-erythroid ratio (UNLIKE BOTH ET AND PV)."
               The chapter's own differential-diagnosis paragraph, and the second
               half had no clause at all — a discriminator named against two named
               competitors is exactly what a support is for, and this app already
               counts the M:E ratio. Worth as much as the cellularity beside it:
               the chapter says it separates pre-PMF from one MORE entity. */
            ['granulocytic proliferation with myeloid predominance', 3, function (f) {
                return f.cellularity.predominance === null ? null
                    : f.cellularity.predominance === 'myeloid';
            }],
            ['LDH above the reference range', 2, function (f) { return f.clinical.ldhElevated; }],
            ['palpable splenomegaly', 2, function (f) { return f.clinical.splenomegaly; }],
            ['JAK2 allele burden above 50%', 2, function (f) { return dxAtLeast(f.drivers.jak2Vaf, 50); }],
            ['CALR type 1, which is enriched in PMF', 1, function (f) { return f.drivers.calrType1; }],
            ['leucocytosis >=11 x10^9/L', 1, function (f) { return f.counts.leukocytosis; }],
            ['anemia', 1, function (f) { return f.cytopenia.anemia; }],
            ['age 60 or over', 1, function (f) { return dxAtLeast(f.age, 60); }],
            ['ET megakaryocyte pattern argues against', -2, function (f) { return f.megakaryocytes.etLike; }]
        ],
        /* THE DIVERGENCE NOTE THAT WAS HERE HAS BEEN DELETED, not reworded. It
           said leukoerythroblastosis is a minor criterion for prefibrotic PMF in
           WHO-HAEM5 but not in ICC 2022 — and WHO-HAEM5's prefibrotic box, now
           pasted at docs/who/mpn-pmf.md, lists four minors and not that one. The
           two classifications agree here, so there is no divergence to print.

           What survives is the clinical half of the old note, which is true and
           belongs to the finding rather than to either classification: a
           leukoerythroblastic picture reflects disrupted marrow architecture and
           is seen with metastatic carcinoma and other infiltrative processes. It
           argues for a marrow that is ALREADY fibrotic, so on a prefibrotic
           candidate it is evidence for the overt-stage rule next door — which is
           what the fibrosis gate already says, without a sentence. */
        caution: function (f) {
            if (f.leukoerythroblastosis !== true) return '';
            return 'Leukoerythroblastosis is present. It is not a minor criterion for the ' +
                'prefibrotic stage in either classification, and a leukoerythroblastic blood ' +
                'picture reflects disrupted marrow architecture — correlation with the reticulin ' +
                'grade, and with the possibility of an infiltrative process, is recommended.';
        }
    },
    {
        id: 'pmf',
        family: 'mpn',
        who: 'Primary myelofibrosis, overt fibrotic stage',
        icc: null,
        requires: [
            ['megakaryocytic proliferation and atypia', function (f) { return f.megakaryocytes.pmfLike; }],
            dxMpn.fibrotic,
            dxMpn.noBcrAbl,
            ['a driver mutation, another clonal marker, or no reactive cause of fibrosis',
                dxPmfClonality],
            /* FIVE MINORS AT THIS STAGE — leukoerythroblastosis is the fifth, and
               it belongs to overt disease in both classifications. */
            ['at least one minor criterion', function (f) { return dxPmfMinorAny(f, true); }]
        ],
        supports: [
            ['reticulin and/or collagen fibrosis of grade 2 or 3', 4,
                function (f) { return dxBandAtLeast(f.fibrosis.grade, 2); }],
            ['a myeloproliferative driver mutation', 4, function (f) { return f.drivers.anyDriver; }],
            ['megakaryocytic atypia with clustering', 3, function (f) { return f.megakaryocytes.pmfLike; }],
            ['leukoerythroblastosis', 2, function (f) { return f.leukoerythroblastosis; }],
            ['palpable splenomegaly', 2, function (f) { return f.clinical.splenomegaly; }],
            ['LDH above the reference range', 2, function (f) { return f.clinical.ldhElevated; }],
            ['anemia', 1, function (f) { return f.cytopenia.anemia; }],
            /* TRIPLE-NEGATIVE MEANS OPPOSITE THINGS IN THE TWO DISEASES and must
               not be scored as one fact: it is ~10-12% of ET and prognostically
               neutral-to-favorable there, but only ~5-15% of PMF and markedly
               adverse. In a fibrotic marrow with no driver, the reactive and
               infiltrative causes of fibrosis — metastatic carcinoma, hairy cell
               leukemia, autoimmune myelofibrosis — are collectively commoner than
               triple-negative PMF, so this argues against rather than for. */
            ['no driver mutation identified; consider secondary causes of fibrosis', -2,
                function (f) { return f.drivers.tripleNegative; }]
        ],
        caution: function (f) {
            if (f.drivers.tripleNegative !== true) return '';
            return 'No myeloproliferative driver mutation has been identified. Marrow fibrosis ' +
                'is not specific to primary myelofibrosis; in the absence of a driver mutation ' +
                'the secondary causes — metastatic carcinoma, lymphoproliferative disorders ' +
                'including hairy cell leukemia, autoimmune myelofibrosis, and infection — ' +
                'should be excluded before this diagnosis is made.';
        }
    },
    {
        id: 'cnl',
        family: 'mpn',
        who: 'Chronic neutrophilic leukemia',
        icc: null,
        requires: [
            ['leucocytosis at the classification threshold', function (f) {
                return dxAnyOf([
                    dxAtLeast(f.counts.wbc, DX_CNL_WBC_WHO),
                    dxAllOf([f.drivers.csf3r, dxAtLeast(f.counts.wbc, DX_CNL_WBC_ICC_CSF3R)])
                ]);
            }],
            ['segmented and band neutrophils >=80% of leucocytes', function (f) {
                return dxAtLeast(f.counts.neutrophilPct, 80);
            }],
            dxMpn.noBcrAbl
        ],
        excludes: [
            /* CSF3R T618I is close to pathognomonic for CNL, but it also occurs in
               proliferative CMML and in atypical CML — so the two findings that
               separate those from CNL stay categorical and outrank it. */
            ['monocytosis meeting CMML criteria', function (f) { return f.counts.monocytosis; }],
            ['dysgranulopoiesis', function (f) { return f.dysplasia.myeloid.atLeast10; }]
        ],
        supports: [
            ['activating CSF3R mutation (T618I in ~83% of CNL)', 4, function (f) { return f.drivers.csf3rT618I; }],
            ['CSF3R mutation', 2, function (f) { return f.drivers.csf3r; }],
            ['palpable splenomegaly', 1, function (f) { return f.clinical.splenomegaly; }]
        ],
        diverges: function (f) { return dxCnlIccOnly(f) === true; },
        divergence: 'This white cell count meets ICC 2022’s threshold but not WHO-HAEM5’s. ' +
            'ICC lowers the requirement from ≥25 to ≥13 × 10⁹/L when an activating CSF3R ' +
            'mutation is present; WHO-HAEM5 requires ≥25 × 10⁹/L of every case.'
    },
    {
        id: 'mpnU',
        family: 'mpn',
        /* THE NAMING IS THE REVERSE OF WHAT IT LOOKS LIKE, and it is easy to get
           backwards: WHO-HAEM5 renamed the category to "not otherwise specified",
           while ICC 2022 kept "unclassifiable". It was WHO that moved away from the
           older word, not ICC. */
        who: 'Myeloproliferative neoplasm, not otherwise specified (MPN-NOS)',
        icc: 'MPN, unclassifiable (MPN-U)',
        requires: [
            ['a JAK2, CALR or MPL mutation, or another clonal marker', dxMpnUClonality],
            dxMpn.noBcrAbl
        ],
        supports: [
            /* Deliberately low. This is the residual category and must rank below
               every specific entity it could be — it earns its place by being a
               real answer for a driver-positive marrow that does not fit, not by
               competing with the entities that do fit. */
            ['a myeloproliferative driver mutation without features of a specific subtype', 2,
                function (f) { return f.drivers.anyDriver; }]
        ],
        diverges: function () { return true; },
        divergence: 'The two classifications name this category differently: WHO-HAEM5 uses ' +
            '"not otherwise specified", ICC 2022 retains "unclassifiable".'
    }

);
