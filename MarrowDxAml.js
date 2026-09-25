/* ============================================================================
   MarrowDxAml.js — acute myeloid leukemia

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. dxLower, dxPct and dxNameLine were written here but live in the kernel.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   THE ACUTE MYELOID LEUKEMIA SET

   VERIFIED against both primary papers rather than assembled from reviews —
   WHO-HAEM5 (Khoury, Leukemia 2022;36:1703, Tables 7 and 8) and ICC 2022 (Arber,
   Blood 2022;140:1200, Tables 1, 20, 21 and 25), the latter read from raw markup
   because two summarising reads of Table 25 disagreed on a row label and a
   comparison review returned the myelodysplasia-related GENE lists with the two
   classifications' columns swapped. A silent swap there puts RUNX1 in the wrong
   classification and changes the answer on every RUNX1-only case.

   THE ONE THING THAT SHAPES THIS WHOLE SECTION: the two classifications disagree
   about what a blast count is FOR.

     WHO-HAEM5 removed the blast threshold OUTRIGHT for the genetically defined
     types — not lowered it to 10%, removed it. A PML::RARA case is acute
     promyelocytic leukemia at any blast count. Only AML with BCR::ABL1, AML with
     CEBPA mutation and AML-MR still require >=20%.

     ICC 2022 sets a floor of >=10% for those same types, counting "blast
     equivalents" (promonocytes and neoplastic promyelocytes), and routes 10-19%
     blasts WITHOUT a defining lesion into its hybrid category MDS/AML.

   So the same marrow can be AML by one classification and MDS by the other, and
   that is a real divergence to print rather than a discrepancy to resolve. It is
   also why the myelodysplastic rules now carry `noAmlDefining`: without it an
   NPM1-mutated marrow at 12% blasts is offered as MDS-IB2 AND as AML at once.

   ONLY FOUR ICC ENTITIES HAVE AN "MDS/AML" FORM, and this is the detail most
   easily got wrong. ICC Table 20 excludes NPM1, bZIP CEBPA and any AML-defining
   karyotype from MDS/AML by definition, so a 12%-blast NPM1 case is
   `AML with mutated NPM1` — the string "MDS/AML with mutated NPM1" does not exist.
   The four are TP53, the two myelodysplasia-related categories, and NOS.
------------------------------------------------------------------------------ */

/* The qualifiers, which attach to a diagnosis rather than competing with one.
   Prior cytotoxic therapy is asymmetric between the classifications (the MN-pCT
   chapter, docs\who\mn-pct.md): ICC demoted it from an entity to a bare
   qualifier, but WHO-HAEM5 KEPT the entity — myeloid neoplasm post cytotoxic
   therapy, ICD-O 9920/3, renamed from "therapy-related" — and what it demoted
   is only the naming, the specific type's name carrying "post cytotoxic
   therapy" appended. So at the level this function works, both classifications
   append; which category the case sits in underneath differs. Prior MDS is
   asymmetric the other way — a CLASSIFIER in WHO-HAEM5 (history alone can make
   a case AML-MR) and only a QUALIFIER in ICC. The formats differ too: WHO
   appends unpunctuated ("AML with KMT2A rearrangement post cytotoxic
   therapy"), ICC comma-separates it ("…, therapy-related"). */
function dxAmlQualifiers(f) {
    const who = [], icc = [];
    if (f.history.priorTherapy === true) {
        who.push('post cytotoxic therapy');
        icc.push('therapy-related');
    }
    if (f.history.antecedentMyeloid === true) {
        icc.push(f.history.antecedent === 'mdsMpn'
            ? 'progressing from MDS/MPN' : 'progressing from MDS');
    }
    return { who: who, icc: icc };
}


function dxWhoName(name, f) {
    const q = dxAmlQualifiers(f).who;
    return q.length ? name + ' ' + q.join(' ') : name;
}

function dxIccName(name, f) {
    if (!name) return null;
    const q = dxAmlQualifiers(f).icc;
    return q.length ? name + ', ' + q.join(', ') : name;
}

/* THE DEFINING-LESION AML TYPES, as a data table — the same bargain every tab in
   this app makes. Eight of these rules are structurally identical (one karyotype
   finding gates them, the blast count only scores), so they are one factory over
   one table rather than eight near-copies free to drift apart.

   `who` and `icc` are the two classifications' literal strings, and the
   difference in house style is theirs, not a transcription slip: WHO writes
   British "leukemia", names the fusion alone and suffixes the word "fusion";
   ICC writes US "leukemia" and names the cytogenetics then the fusion,
   slash-separated. Both are quoted as published.

   `icc: null` means ICC PUBLISHES NO SUCH ENTITY. NUP98 appears zero times in the
   ICC main text and RBM15::MRTFA is not in its Table 25; an ICC author's review
   places both under the rare-recurring-translocation supplement, which could not
   be retrieved — so the defensible ICC string is the catch-all, and that is what
   `iccFallback` supplies rather than inventing a name ICC does not print. */
const DX_ICC_RARE = 'AML with other rare recurring translocations';

const dxAmlDefining = [
    { id: 'amlApl', abn: 'pmlRara', urgent: true,
      who: 'Acute promyelocytic leukemia with PML::RARA fusion',
      icc: 'Acute promyelocytic leukemia (APL) with t(15;17)(q24.1;q21.2)/PML::RARA' },

    { id: 'amlRunx1t1', abn: 'runx1Runx1t1',
      who: 'Acute myeloid leukemia with RUNX1::RUNX1T1 fusion',
      icc: 'AML with t(8;21)(q22;q22.1)/RUNX1::RUNX1T1' },

    { id: 'amlCbfb', abn: 'cbfbMyh11',
      who: 'Acute myeloid leukemia with CBFB::MYH11 fusion',
      icc: 'AML with inv(16)(p13.1q22) or t(16;16)(p13.1;q22)/CBFB::MYH11' },

    /* MULTILINEAGE DYSPLASIA IS THE SUPPORTED CORRELATE HERE; BASOPHILIA IS NOT.
       Dysplasia in two or more lineages is reported in 56-100% of DEK::NUP214
       series, most above 75%. Marrow/blood basophilia is the classic teaching and
       is deliberately absent: it traces to a narrative review, two of six cohorts
       found NONE, and the largest series (n=107) calls it "not a common feature".
       Don't add it back from memory — see the do-not-encode list in CLAUDE.md.
       BOTH CALLS ARE NOW CHAPTER-CONFIRMED (docs/who/aml-dek-nup214.md):
       "multilineage dysplasia is common", and basophils "may be increased in a
       minority of cases". */
    { id: 'amlDek', abn: 'dekNup214',
      who: 'Acute myeloid leukemia with DEK::NUP214 fusion',
      icc: 'AML with t(6;9)(p22.3;q34.1)/DEK::NUP214',
      supports: [
          ['multilineage dysplasia, reported in most DEK::NUP214 series', 2,
              function (f) { return dxAtLeast(f.dysplasia.count, 2); }]
      ] },

    { id: 'amlRbm15', abn: 'rbm15Mrtfa', iccFallback: true,
      who: 'Acute myeloid leukemia with RBM15::MRTFA fusion',
      icc: null },

    { id: 'amlKmt2a', abn: 'kmt2a',
      who: 'Acute myeloid leukemia with KMT2A rearrangement',
      icc: 'AML with KMT2A rearrangement' },

    /* Dysmegakaryopoiesis — small hypolobated forms — is reported in 90.5% of
       MECOM-rearranged AML and is its morphologic hallmark. It SCORES and never
       gates: the rearrangement is the diagnosis, and bland megakaryocytes do not
       unmake it. THROMBOCYTOSIS IS NOT SCORED — the widely quoted 7-22% does not
       survive checking (5-8%, with 68% of cases thrombocytopenic), so the honest
       statement is "platelets preserved", which is not a finding this app records. */
    { id: 'amlMecom', abn: 'mecom',
      who: 'Acute myeloid leukemia with MECOM rearrangement',
      icc: 'AML with inv(3)(q21.3q26.2) or t(3;3)(q21.3;q26.2)/GATA2; MECOM(EVI1)',
      supports: [
          ['megakaryocytic dysplasia, reported in ~90% of MECOM-rearranged AML', 2,
              function (f) { return f.dysplasia.megakaryocytic.atLeast10; }]
      ],
      /* THE ONE FUSION BOX WITH AN MPN-HISTORY EXCLUSION (docs/who/aml-mecom.md):
         MECOM acquired in CML defines blast phase regardless of the blast count,
         and the chapter reads even a CONCURRENT BCR::ABL1 at presentation as
         blast-phase CML. Both are categorical in the chapter's own words. */
      excludes: [
          ['a documented history of a myeloproliferative neoplasm', function (f) {
              return f.history.antecedentMpn;
          }],
          ['concurrent BCR::ABL1, best regarded as blast phase CML', function (f) {
              return f.drivers.bcrAbl;
          }]
      ] },

    { id: 'amlNup98', abn: 'nup98', iccFallback: true,
      who: 'Acute myeloid leukemia with NUP98 rearrangement',
      icc: null }
];

/* ICC's name for a case, or null when ICC would not call it acute leukemia at
   all. Below 10% blasts ICC has no AML to name — WHO does, having no threshold —
   and returning null is what makes dxDiagnosisLine print the WHO name alone
   rather than asserting an ICC classification the case does not meet. */
function dxAmlIccFor(spec, f) {
    if (dxBlastAtLeast(f, DX_BLAST_ICC) === false) return null;
    return dxIccName(spec.icc || (spec.iccFallback ? DX_ICC_RARE : null), f);
}

/* The findings sentence — what was seen, before what it is called: the blast
   count, and the karyotype finding if there is one. */
function dxAmlFindings(f, abnKey) {
    const parts = [];
    if (f.blasts.marrow !== null) {
        parts.push(dxBlastSentence(f));
    } else if (f.blasts.blood !== null) {
        parts.push(`Blasts comprise ${dxPct(f.blasts.blood)}% of blood leukocytes.`);
    }
    /* THE ABNORMALITY IS REPORTED ONLY IF IT WAS ACTUALLY FOUND. Printed from
       the rule's own lesion, this once read "Cytogenetic studies show
       t(15;17)(q24.1;q21.2)/PML::RARA" on a karyotype that had not resulted — a
       fabricated laboratory finding, the most dangerous form this bug takes. */
    if (abnKey && dxFindingReported(dxAbn(f, abnKey))) {
        parts.push(`Cytogenetic studies show ${ancAbnPhrase(abnKey)}.`);
    }
    return parts.join(' ');
}

/* BELOW ICC'S 10% FLOOR the two classifications disagree about whether this is
   acute leukemia at all, and the name line cannot show it (ICC has no AML name to
   print), so the comment says it — in one sentence, as a classification. */
const DX_AML_ICC_BELOW_FLOOR = 'By ICC 2022, which requires at least 10% blasts, the case ' +
    'would be classified as a myelodysplastic neoplasm.';

/* The comment for a defining-lesion AML: what was found, what it is called. */
function dxAmlComment(spec, f, mode, rule) {
    const who = dxWhoName(spec.who, f);
    const icc = dxAmlIccFor(spec, f);
    const parts = [];
    if (mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
    parts.push(dxAmlFindings(f, spec.abn));

    /* EVERY RULE IN THIS SET IS DEFINED BY ITS LESION, so "diagnostic of" is only
       available once the lesion is in hand; until then the sentence is written
       in the conditional. */
    parts.push(dxClassificationSentence(rule, f, dxNameLine(who, icc), 'diagnostic'));

    if (dxBlastAtLeast(f, DX_BLAST_ICC) === false) parts.push(DX_AML_ICC_BELOW_FLOOR);

    if (spec.urgent) {
        parts.push(dxDefiningConfirmed(rule, f)
            ? 'This is a medical emergency; urgent notification of the clinical team and ' +
              'monitoring for disseminated intravascular coagulation are recommended.'
            : 'Given the possibility of acute promyelocytic leukemia, expedited PML::RARA testing, ' +
              'urgent notification of the clinical team and monitoring for disseminated ' +
              'intravascular coagulation are recommended.');
    }
    return parts.filter(Boolean).join(' ');
}

/* The comment for a mutation-defined type. `finding` names what was found and
   `extra` is an optional sentence the entity cares about. */
function dxAmlMutationComment(spec, f, mode, rule) {
    const who = dxWhoName(spec.who, f);
    const icc = dxBlastAtLeast(f, spec.iccMin) === false ? null : dxIccName(spec.icc, f);
    const parts = [];
    if (mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
    parts.push(dxAmlFindings(f, null));
    /* Stated as a fact, so printed only once the mutation is one. */
    if (dxDefiningConfirmed(rule, f)) parts.push(spec.finding);
    parts.push(dxClassificationSentence(rule, f, dxNameLine(who, icc), 'diagnostic'));
    if (spec.extra) parts.push(spec.extra(f.genetics));
    if (dxBlastAtLeast(f, spec.iccMin) === false) {
        parts.push('ICC 2022 requires at least 10% blasts for this diagnosis, which is not met.');
    }
    return parts.filter(Boolean).join(' ');
}

/* Does WHO-HAEM5's myelodysplasia-related category apply? Its three routes in,
   as Kleene's OR so an unanswered one cannot close it. Written once because both
   the TP53 rule (which needs to know where WHO lands instead) and the AML-MR rule
   itself ask it. */
function dxAmlMrWho(f) {
    return dxAnyOf([f.genetics.mrCytoWHO.present, f.genetics.mrWHO.present,
        f.history.antecedentMyeloid]);
}

/* AML-MR's comment, which has more to reconcile than any other in this set: the
   two classifications reach the category by different routes and name it
   differently. Each asymmetry is said only when the case lands on it, and as a
   classification rather than as the reason for one. */
function dxAmlMrComment(f, mode) {
    const g = f.genetics;
    const parts = [];
    if (mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
    parts.push(dxAmlFindings(f, null));

    const cyto = g.mrCytoWHO.keys.length ? g.mrCytoWHO.keys : g.mrCytoICC.keys;
    if (cyto.length) parts.push(`Cytogenetic studies show ${addCommas(cyto.map(ancAbnPhrase))}.`);
    if (g.mrICC.present === true) parts.push(`Molecular studies show ${dxGenePhrase(g.mrICC.genes)}.`);
    if (f.history.antecedentMyeloid === true) {
        parts.push(`There is a history of ${f.history.antecedent === 'mdsMpn' ? 'MDS/MPN' : 'MDS'}.`);
    }

    const whoName = dxWhoName('acute myeloid leukemia, myelodysplasia-related', f);
    const iccGene = g.mrICC.present === true;
    const iccCyto = g.mrCytoICC.present === true;
    const iccName = iccGene ? 'AML with myelodysplasia-related gene mutations'
        : (iccCyto ? 'AML with myelodysplasia-related cytogenetic abnormalities' : null);
    const whoApplies = dxAmlMrWho(f) === true;

    /* NONE OF THE THREE ROUTES ESTABLISHED: the category has three ways in and
       this case has taken none of them yet, so the sentence is conditional. */
    if (!whoApplies && !iccName) {
        parts.push('If a myelodysplasia-related cytogenetic abnormality or gene mutation is ' +
            `demonstrated, the findings would be consistent with ${dxTag(whoName, 'WHO-HAEM5')} ` +
            'and AML with myelodysplasia-related gene mutations or cytogenetic abnormalities ' +
            '(ICC 2022).');
    } else if (whoApplies && iccName) {
        parts.push(`The findings are consistent with ${dxNameLine(whoName, iccName)}.`);
    } else if (whoApplies) {
        parts.push(`The findings are consistent with ${dxTag(whoName, 'WHO-HAEM5')}.`);
        parts.push(f.history.antecedentMyeloid === true
            ? 'By ICC 2022 the history of MDS is a qualifier, and the case would be classified on ' +
              'its other features.'
            : 'By ICC 2022 this abnormality is not myelodysplasia-related, and the case would be ' +
              'classified on its other features.');
    } else {
        parts.push(`The findings are consistent with ${dxTag(iccName, 'ICC 2022')}. By WHO-HAEM5 ` +
            'this finding is not myelodysplasia-related, and the case would be classified on its ' +
            'other features.');
    }
    return parts.filter(Boolean).join(' ');
}

/* One rule per defining lesion, from the table above.

   THE KARYOTYPE FINDING IS THE ONLY GATE, and the blast count deliberately is
   not one. That is WHO-HAEM5's position and encoding it any other way would
   quietly reinstate the threshold WHO removed. The blast count still SCORES, so a
   frank leukemia outranks a marrow with the lesion and few blasts, and the
   comment says out loud when ICC would disagree. */
function dxAmlRule(spec) {
    return {
        id: spec.id,
        family: 'aml',
        who: spec.who,
        icc: spec.icc,
        /* The lesion IS the entity here — it gates the rule alone and gives the
           rule its name — so the same finding is both the one requirement and the
           `definedBy` declaration. `ancAbnPhrase` is the report wording for the
           key, the same string the findings sentence uses. */
        definedBy: {
            finding: function (f) { return dxAbn(f, spec.abn); },
            phrase: ancAbnPhrase(spec.abn),
            study: 'cytogenetic'
        },
        requires: [
            [`${ancAbnVocabulary[spec.abn].label} identified`, function (f) {
                return dxAbn(f, spec.abn);
            }]
        ],
        /* Most of the eight have no exclusions of their own — the shared AML
           hierarchy does that work — but a spec may carry chapter-sourced ones
           (MECOM's MPN-history rule is the case that added the seam). */
        excludes: spec.excludes || [],
        supports: [
            /* PATHOGNOMONIC, at the top of the ladder rather than at +4. Each of
               these eight lesions names its own entity and appears nowhere else in
               this table — a demonstrated PML::RARA is acute promyelocytic
               leukemia and is not a candidate for anything, at any blast count. At
               +4 it was worth the same as three ordinary morphologic observations,
               so a fusion in hand could be outscored by a pile of soft findings on
               a myelodysplastic candidate. See the point ladder in
               MarrowDxKernel.js and its test for this tier. */
            ['a defining genetic abnormality is present', 8, function (f) {
                return dxAbn(f, spec.abn);
            }],
            ['blasts ≥20%', 2, function (f) { return dxBlastAtLeast(f, DX_BLAST_AML); }],
            ['blasts ≥10%, meeting ICC 2022’s threshold', 1, function (f) {
                return dxBlastAtLeast(f, DX_BLAST_ICC);
            }]
        /* PRIOR CYTOTOXIC THERAPY IS NO LONGER SCORED. It sat at +1 across all
           eight generated rules, and six of the eight pasted chapters put a
           therapy clause in their ESSENTIAL criteria (a flat no-history for
           APL, "not fulfilling criteria for myeloid neoplasm post cytotoxic
           therapy" for the rest; RBM15 and NUP98 state none) — a finding the
           boxes exclude cannot be evidence for the entities. Not an `excludes`
           either: ICC keeps such cases with a therapy-related qualifier, which
           dxWhoName/dxIccName already print. */
        /* A type's own morphologic correlates, from the table. THEY MAY ONLY EVER
           SCORE — every one of these is a frequency, not a criterion, and the
           lesion has already gated the rule. The bar for appearing here is a
           figure from a primary series over a finding this app records; the
           several correlates that failed one half or the other of that test are
           named at the point they would have gone in, so the next reader knows
           they were considered and rejected rather than forgotten. */
        ].concat(spec.supports || []),
        whoFor: function (f) { return dxWhoName(spec.who, f); },
        iccFor: function (f) { return dxAmlIccFor(spec, f); },
        comment: function (f, ctx) { return dxAmlComment(spec, f, ctx.mode, ctx.rule); }
    };
}


/* ---- Acute myeloid leukemia ---- */
dxRules.push(
    /* ---- Acute myeloid leukemia ----------------------------------------- */

    /* The eight defining-lesion types, one rule each from dxAmlDefining. */
    ...dxAmlDefining.map(dxAmlRule),

    {
        id: 'amlNpm1',
        family: 'aml',
        who: 'Acute myeloid leukemia with NPM1 mutation',
        icc: 'AML with mutated NPM1',
        definedBy: {
            finding: function (f) { return f.genetics.npm1; },
            phrase: 'an NPM1 mutation',
            study: 'molecular'
        },
        requires: [
            ['NPM1 mutation', function (f) { return f.genetics.npm1; }]
        ],
        supports: [
            ['NPM1 is a defining mutation', 4, function (f) { return f.genetics.npm1; }],
            ['blasts ≥20%', 2, function (f) { return dxBlastAtLeast(f, DX_BLAST_AML); }],
            ['blasts ≥10%, meeting ICC 2022’s threshold', 1, function (f) {
                return dxBlastAtLeast(f, DX_BLAST_ICC);
            }]
            /* PRIOR CYTOTOXIC THERAPY IS NO LONGER SCORED — the pasted chapter's
               essential criteria read "no history of exposure to cytotoxic
               therapy", so history cannot be evidence FOR this entity. Same
               deletion, same reasoning as amlMr's; not moved to excludes because
               ICC keeps such cases with a therapy-related qualifier. */
        ],
        /* THE CHAPTER'S OWN RESTRAINT on its any-count rule, encoded from its
           words: cases with an NPM1 variant at VAF < 10% and no increase in
           blood or marrow blasts lack outcome data, "should be interpreted with
           caution, because definitive classification as AML may not be
           possible" — and MDS-with-NPM1 relapsing WITHOUT the mutation shows
           the subclonal case is real. Fires only when the fraction was actually
           reported and the blasts are known low. */
        caution: function (f) {
            const vaf = f.genetics.npm1Vaf;
            if (f.genetics.npm1 !== true || vaf === null || vaf >= 10) return '';
            const marrowLow = f.blasts.marrow !== null && f.blasts.marrow < 5;
            const bloodLow = f.blasts.blood === null || f.blasts.blood < 2;
            if (!marrowLow || !bloodLow) return '';
            return 'With an NPM1 variant allele fraction below 10% and no increase in blasts, ' +
                'classification as AML may not be definitive; close follow-up is recommended.';
        },
        whoFor: function (f) { return dxWhoName('Acute myeloid leukemia with NPM1 mutation', f); },
        iccFor: function (f) {
            return dxBlastAtLeast(f, DX_BLAST_ICC) === false
                ? null : dxIccName('AML with mutated NPM1', f);
        },
        comment: function (f, ctx) {
            return dxAmlMutationComment({
                who: 'Acute myeloid leukemia with NPM1 mutation',
                icc: 'AML with mutated NPM1',
                iccMin: DX_BLAST_ICC,
                finding: 'Molecular studies show an NPM1 mutation.',
                /* FLT3-ITD status belongs in an NPM1 comment whichever way it
                   reads: the pair is the commonest genotype in normal-karyotype
                   AML, and it decides ELN risk and whether an inhibitor is added.
                   Saying "not detected" is as useful as saying "detected", which
                   is why the absent case is printed too rather than omitted. */
                extra: function (g) {
                    if (g.flt3Itd === true) return 'A FLT3 internal tandem duplication is also ' +
                        'present (ELN 2022 intermediate risk).';
                    if (g.flt3Itd === false) return 'FLT3 internal tandem duplication is not detected.';
                    return '';
                }
            }, f, ctx.mode, ctx.rule);
        }
    },
    {
        id: 'amlCebpa',
        family: 'aml',
        who: 'Acute myeloid leukemia with CEBPA mutation',
        icc: 'AML with in-frame bZIP CEBPA mutations',
        /* THE ONE ENTITY WHERE THE TWO CLASSIFICATIONS DISAGREE ABOUT WHICH
           MUTATIONS COUNT, not merely about the threshold. WHO-HAEM5 accepts
           biallelic mutation at any site OR a single bZIP mutation, at >=20%
           blasts — one of only three types for which WHO kept the 20% rule. ICC
           2022 accepts ONLY in-frame bZIP mutations, having found the favorable
           prognosis to track those specifically, and sets its floor at 10%.

           So a biallelic non-bZIP case is WHO's entity and not ICC's, and the
           gate is deliberately the LOOSER of the two — a CEBPA mutation — with
           the configuration reported in the comment. Gating on bZIP would drop
           every case whose laboratory did not use the word. */
        definedBy: {
            finding: function (f) { return f.genetics.cebpa; },
            phrase: 'a CEBPA mutation',
            study: 'molecular'
        },
        requires: [
            ['CEBPA mutation', function (f) { return f.genetics.cebpa; }]
        ],
        supports: [
            ['CEBPA is a defining mutation', 4, function (f) { return f.genetics.cebpa; }],
            ['blasts ≥20%, meeting WHO-HAEM5’s threshold', 2, function (f) {
                return dxBlastAtLeast(f, DX_BLAST_AML);
            }],
            ['in-frame bZIP mutation reported', 2, function (f) { return f.genetics.cebpaBzip; }],
            ['biallelic CEBPA mutation', 1, function (f) { return f.genetics.cebpaBiallelic; }],
            /* Co-mutated GATA2 is enriched ~5-fold in the bZIP/biallelic cases
               against TAD-only ones, so it is indirect evidence about the
               position this tool cannot read. Scored, never gated. */
            ['co-mutated GATA2, which is enriched in bZIP and biallelic CEBPA', 2,
                function (f) { return f.genetics.gata2; }],
            /* Normal karyotype in >90% of these cases against ~43% of AML
               generally (Mannelli, Haematologica 2016); a complex karyotype argues
               the case is myelodysplasia-related instead. */
            ['complex karyotype argues against', -2, function (f) { return f.genetics.complex; }]
        ],
        /* THE CHAPTER'S OWN REFERRAL RULE (docs/who/aml-cebpa.md): "detection of
           biCEBPA should raise suspicion of a germline CEBPA variant and
           referral for genetic counselling" — 5-10% of biallelic cases carry a
           germline N-terminal mutation, and the familial form has very high
           penetrance at a median of 24.5 years. Fires only when the laboratory
           actually reported the mutation as biallelic. */
        caution: function (f) {
            if (f.genetics.cebpa !== true) return '';
            return f.genetics.cebpaBiallelic === true
                ? 'A biallelic CEBPA mutation raises the possibility of a germline variant; ' +
                  'germline testing and genetic counseling should be considered.'
                : 'About 10% of CEBPA-mutated AML arises on a germline variant; germline testing ' +
                  'should be considered.';
        },
        check: function (f) {
            if (f.genetics.cebpa !== true) return '';
            return 'Germline testing is done on cultured skin fibroblasts; a mutation persisting ' +
                'in remission at a VAF near 50% is suspicious.';
        },
        whoFor: function (f) {
            /* WHO keeps 20% here. Below it there is no WHO CEBPA entity to name. */
            return dxBlastAtLeast(f, DX_BLAST_AML) === false
                ? 'Acute myeloid leukemia with CEBPA mutation (blast threshold not met)'
                : dxWhoName('Acute myeloid leukemia with CEBPA mutation', f);
        },
        iccFor: function (f) {
            return dxBlastAtLeast(f, DX_BLAST_ICC) === false
                ? null : dxIccName('AML with in-frame bZIP CEBPA mutations', f);
        },
        comment: function (f, ctx) {
            const g = f.genetics;
            const parts = [];
            if (ctx.mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
            parts.push(dxAmlFindings(f, null));

            /* WHICH CONFIGURATION WAS REPORTED — and only if one was. */
            if (g.cebpaBzip === true) parts.push('Molecular studies show an in-frame bZIP CEBPA mutation.');
            else if (g.cebpaBiallelic === true) parts.push('Molecular studies show biallelic CEBPA mutations.');
            else if (dxDefiningConfirmed(ctx.rule, f)) parts.push('Molecular studies show a CEBPA mutation.');

            /* ICC'S ENTITY ONLY WHEN ITS CRITERION IS ESTABLISHED (in-frame bZIP),
               and WHO'S ONLY AT 20% — below it WHO has no CEBPA AML to name. */
            const whoMet = dxBlastAtLeast(f, DX_BLAST_AML) !== false;
            const whoName = dxWhoName('acute myeloid leukemia with CEBPA mutation', f);
            const iccName = g.cebpaBzip === true && dxBlastAtLeast(f, DX_BLAST_ICC) !== false
                ? dxIccName('AML with in-frame bZIP CEBPA mutations', f) : null;
            const line = whoMet && iccName ? dxNameLine(whoName, iccName)
                : (whoMet ? dxTag(whoName, 'WHO-HAEM5') : (iccName ? dxTag(iccName, 'ICC 2022') : null));

            if (line) {
                const prefix = dxConfirmationPrefix(ctx.rule, f);
                parts.push(prefix
                    ? `${prefix}the findings would be diagnostic of ${line}.`
                    : `The findings are diagnostic of ${line}.`);
            }
            if (!whoMet) {
                parts.push('WHO-HAEM5 requires at least 20% blasts for this type, which is not met.');
            }
            /* ELN 2022 assigns favorable risk to in-frame bZIP mutations only, so a
               biallelic non-bZIP case carries none of the prognosis the name implies. */
            if (g.cebpaBzip !== true && g.cebpa === true) {
                parts.push('The location and reading frame of the mutation should be confirmed; ' +
                    'ICC 2022 and ELN 2022 favorable risk require an in-frame bZIP mutation.');
            }
            return parts.filter(Boolean).join(' ');
        }
    },
    {
        id: 'amlTp53',
        family: 'aml',
        /* AN ICC ENTITY WITH NO WHO COUNTERPART. WHO-HAEM5 publishes no
           TP53-defined acute myeloid leukemia at all — such a case falls to
           AML-MR through the complex karyotype or 17p loss that usually
           accompanies it, or else to a differentiation-defined type. `who` names
           where WHO actually lands rather than leaving the line half-empty, and
           the comment says plainly that the entity is ICC's alone.

           ICC's criterion is ANY somatic TP53 mutation at a VAF strictly greater
           than 10%. Multi-hit is NOT required here — that is the MDS rule at <10%
           blasts, and conflating the two is the easy error. */
        who: 'Acute myeloid leukemia, myelodysplasia-related',
        icc: 'AML with mutated TP53',
        /* The fraction is part of the criterion, so an unquantified mutation does
           not establish the entity — the requires clause returns null for it and
           this declaration mirrors that exactly rather than approximating it. */
        definedBy: {
            finding: function (f) {
                if (f.genetics.tp53 !== true) return f.genetics.tp53;
                return f.genetics.tp53Vaf === null ? null : f.genetics.tp53Vaf > 10;
            },
            phrase: 'a TP53 mutation at a variant allele fraction above 10%',
            study: 'molecular'
        },
        requires: [
            ['TP53 mutation at a VAF >10%', function (f) {
                if (f.genetics.tp53 !== true) return f.genetics.tp53;
                return f.genetics.tp53Vaf === null ? null : f.genetics.tp53Vaf > 10;
            }],
            ['blasts ≥10%', function (f) { return dxBlastAtLeast(f, DX_BLAST_ICC); }]
        ],
        supports: [
            ['TP53 mutation is defining in ICC 2022', 4, function (f) { return f.genetics.tp53; }],
            ['complex karyotype', 2, function (f) { return f.genetics.complex; }],
            ['17p loss', 2, function (f) { return f.genetics.del17p; }],
            /* SURVIVES the sweep that deleted this clause elsewhere: this is an
               ICC-framed entity, and the ICC paper keeps therapy-related cases
               INSIDE the category by name — "whether they present de novo, as
               progression of MDS, or as therapy-related disease". */
            ['prior cytotoxic therapy', 1, function (f) { return f.history.priorTherapy; }]
        ],
        whoFor: function (f) {
            const mr = dxAmlMrWho(f) === true;
            return dxWhoName(mr ? 'Acute myeloid leukemia, myelodysplasia-related'
                : 'Acute myeloid leukemia', f);
        },
        iccFor: function (f) {
            return dxBlastAtLeast(f, DX_BLAST_AML) === true
                ? dxIccName('AML with mutated TP53', f)
                : dxIccName('MDS/AML with mutated TP53', f);
        },
        diverges: function () { return true; },
        divergence: 'WHO-HAEM5 has no TP53-defined AML; such cases are usually AML-MR. ICC ' +
            'defines it on any TP53 mutation above 10% VAF, whatever the allelic status.'
    },
    {
        id: 'amlMr',
        family: 'aml',
        who: 'Acute myeloid leukemia, myelodysplasia-related',
        icc: 'AML with myelodysplasia-related gene mutations',
        /* THREE ROUTES IN, AND WHO ACCEPTS ALL THREE WHILE ICC ACCEPTS TWO. A
           qualifying cytogenetic abnormality, a qualifying gene mutation, or — in
           WHO-HAEM5 only — a documented history of MDS or MDS/MPN, which by
           itself suffices. ICC demotes that history to a qualifier.

           CONFIRMED BY THE PASTED CHAPTER (docs/who/aml-mr.md): its essential
           criteria accept "at least one of" the history and a Box 2.25
           abnormality, closing the ambiguity the AML introduction's compressed
           sentence left open. Box 2.25 itself matches MR_CYTO_WHO and the
           eight-gene list entry for entry.

           MORPHOLOGIC MULTILINEAGE DYSPLASIA IS NO LONGER A ROUTE IN EITHER. Both
           classifications removed it deliberately, and this is the single most
           likely thing to be got wrong from memory of WHO-HAEM4R: dysplasia now
           only SCORES here, and may never gate. */
        requires: [
            ['blasts ≥20%', function (f) { return dxBlastAtLeast(f, DX_BLAST_AML); }],
            ['a myelodysplasia-related cytogenetic abnormality, gene mutation, or antecedent MDS',
                function (f) {
                    return dxAnyOf([f.genetics.mrCytoICC.present, f.genetics.mrCytoWHO.present,
                        f.genetics.mrICC.present, f.history.antecedentMyeloid]);
                }]
        ],
        excludes: [
            /* ICC states the hierarchy outright and WHO's ordering implies it: a
               single defining gene mutation or fusion takes precedence over both
               myelodysplasia-related categories. Categorical, so a case with a
               fusion is never offered as AML-MR alongside it. */
            ['a defining genetic abnormality takes precedence', function (f) {
                return f.genetics.amlDefining.present;
            }],
            ['NPM1 takes precedence', function (f) { return f.genetics.npm1; }],
            ['in-frame bZIP CEBPA takes precedence', function (f) { return f.genetics.cebpaBzip; }],
            /* The chapter's "absence of" list, in the half this app can answer: a
               history of MPN — blast transformation of an established MPN is that
               disease's blast phase, not AML-MR, and the exclusion is CMML's
               footnote-b logic again. Cytotoxic-therapy history (WHO routes to
               myeloid neoplasm post cytotoxic therapy, ICC keeps the diagnosis
               with a qualifier) and germline predisposition are on the same list
               and are NOT gated: the first diverges between the classifications
               and the second is unrecordable, so neither can be categorical. */
            ['a documented history of a myeloproliferative neoplasm',
                function (f) { return f.history.antecedentMpn; }]
        ],
        supports: [
            ['myelodysplasia-related gene mutation', 4, function (f) { return f.genetics.mrICC.present; }],
            ['myelodysplasia-related cytogenetic abnormality', 4, function (f) {
                return dxAnyOf([f.genetics.mrCytoWHO.present, f.genetics.mrCytoICC.present]);
            }],
            ['antecedent MDS or MDS/MPN', 3, function (f) { return f.history.antecedentMyeloid; }],
            ['multilineage dysplasia', 2, function (f) { return dxAtLeast(f.dysplasia.count, 2); }]
            /* PRIOR CYTOTOXIC THERAPY IS NO LONGER SCORED HERE. It sat at +1, and
               the pasted chapter's essential criteria put it on the "absence of"
               list — a finding the box excludes cannot be evidence FOR the
               entity. Not moved to excludes either, for the reason given there. */
        ],
        whoFor: function (f) {
            return dxWhoName('Acute myeloid leukemia, myelodysplasia-related', f);
        },
        /* ICC SPLITS WHO'S ONE ENTITY INTO TWO, and the gene category outranks the
           cytogenetic one — ICC says so explicitly ("in the absence of a
           myelodysplasia-related gene mutation … a case may be diagnosed as AML
           with myelodysplasia-related cytogenetic abnormalities"). */
        iccFor: function (f) {
            const acute = dxBlastAtLeast(f, DX_BLAST_AML) === true;
            const stem = acute ? 'AML' : 'MDS/AML';
            if (f.genetics.mrICC.present === true) {
                return dxIccName(stem + ' with myelodysplasia-related gene mutations', f);
            }
            if (f.genetics.mrCytoICC.present === true) {
                return dxIccName(stem + ' with myelodysplasia-related cytogenetic abnormalities', f);
            }
            return null;
        },
        diverges: function (f) {
            /* Only when the case actually lands on a difference: an ICC-only or
               WHO-only cytogenetic abnormality, a RUNX1-only genotype, or a
               history carrying the diagnosis on its own. */
            return f.genetics.mrCytoWHO.present !== f.genetics.mrCytoICC.present ||
                f.genetics.mrWHO.present !== f.genetics.mrICC.present ||
                (f.history.antecedentMyeloid === true &&
                 f.genetics.mrCytoWHO.present !== true && f.genetics.mrICC.present !== true);
        },
        divergence: 'ICC adds RUNX1 to the gene list. The cytogenetic lists differ both ways (ICC ' +
            'adds +8 and del(20q); WHO-HAEM5 adds del(11q) and −13/del(13q)). A history of MDS or ' +
            'MDS/MPN defines the WHO-HAEM5 category but is only a qualifier in ICC.',
        comment: function (f, ctx) { return dxAmlMrComment(f, ctx.mode); }
    },
    {
        id: 'aml',
        family: 'aml',
        /* THE RESIDUAL, and WHO-HAEM5 retired the name it used to have: "AML, NOS
           is no longer applicable". What replaces it is a family of eight types
           defined by DIFFERENTIATION, assigned on morphology and immunophenotype
           — inputs this app does not collect, by an explicit scoping decision. So
           the WHO line names the family and the comment says the subtype is
           assigned from the flow cytometry, rather than inventing one.

           Acute erythroid leukaemia is the family's exception to the blasts-≥20%
           gate below: its essential criteria are erythroid predominance (≥ 80%)
           with ≥ 30% proerythroblasts and carry NO blast floor. Those inputs are
           not collected either, so AEL is out of scope rather than mis-gated —
           and ICC classifies it within AML with mutated TP53 anyway (Table 21:
           "≥ 20% blasts or meets criteria for pure erythroid leukemia").

           The megakaryoblastic box (docs\who\aml-megakaryoblastic.md) is the
           ONE subtype whose essentials exclude "history of myeloproliferative
           neoplasm" (such cases are MPN in blast phase). Not lifted into this
           rule's excludes: the other pasted boxes affirmatively lack that
           criterion, and the rule stands for the whole family.

           ICC kept a residual "AML, NOS" and publishes no subtype list at all. */
        who: 'Acute myeloid leukemia, defined by differentiation',
        icc: 'AML, not otherwise specified (NOS)',
        requires: [
            ['blasts ≥20%', function (f) { return dxBlastAtLeast(f, DX_BLAST_AML); }]
        ],
        excludes: [
            ['a defining genetic abnormality names a specific type', function (f) {
                return f.genetics.amlDefining.present;
            }],
            ['NPM1 names a specific type', function (f) { return f.genetics.npm1; }],
            ['CEBPA names a specific type', function (f) { return f.genetics.cebpa; }],
            /* ADDED WHEN THE FIRST FAMILY BOX WAS PASTED (minimal differentiation,
               docs/who/aml-minimal-differentiation.md): its criteria exclude "AML
               types with defined genetic alterations", a family that in WHO-HAEM5
               INCLUDES AML-MR — and the chapter's own molecular section says the
               mutations it lists "now qualify for myelodysplasia-related AML".
               So a residual case meeting any AML-MR route yields to that rule
               rather than being offered beside it. */
            ['myelodysplasia-related criteria take precedence', function (f) {
                return dxAnyOf([f.genetics.mrCytoICC.present, f.genetics.mrCytoWHO.present,
                    f.genetics.mrICC.present, f.history.antecedentMyeloid]);
            }]
        ],
        supports: [
            ['blasts ≥20%', 4, function (f) { return dxBlastAtLeast(f, DX_BLAST_AML); }]
            /* PRIOR CYTOTOXIC THERAPY IS NO LONGER SCORED. The clause survived
               the earlier sweep because no family chapter was pasted; the first
               one now is, and its essential criteria carry the same "not
               fulfilling criteria for myeloid neoplasm post cytotoxic therapy"
               exclusion as the fusion boxes. Same deletion, same reasoning; not
               an excludes, because ICC's AML-NOS keeps such cases with a
               therapy-related qualifier. */
        ],
        whoFor: function (f) {
            return dxWhoName('Acute myeloid leukemia, defined by differentiation', f);
        },
        iccFor: function (f) { return dxIccName('AML, not otherwise specified (NOS)', f); },
        comment: function (f, ctx) {
            const parts = [];
            if (ctx.mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
            parts.push(dxAmlFindings(f, null));

            /* WHAT THIS COMMENT MUST NOT DO is imply the classification is
               finished while the studies are out: an AML whose subtype is not yet
               known is not "AML, NOS". The pending line (dxComment) says the rest. */
            if (dxPendingStudies(f).length) {
                parts.push('The findings are diagnostic of acute myeloid leukemia.');
            } else {
                parts.push('No defining genetic abnormality is identified. The findings are ' +
                    'consistent with acute myeloid leukemia defined by differentiation (WHO-HAEM5) ' +
                    'and AML, NOS (ICC 2022); the WHO-HAEM5 type is assigned by immunophenotype.');
            }
            return parts.filter(Boolean).join(' ');
        },
        /* TWO SAFETY NOTES, on the RESIDUAL because both are about what a case
           with no named lesion might still turn out to be. */
        caution: function (f) {
            const notes = [];

            /* BASOPHILIA WITH BCR::ABL1 UNKNOWN: the one caution that can change the
               DISEASE rather than the subtype (CML in blast phase). Fires only while
               BCR::ABL1 is genuinely unknown. */
            if (f.drivers.bcrAbl === null &&
                dxAtLeast(f.counts.basophilPct, DX_BASOPHILIA_PCT) === true) {
                notes.push('Given the basophilia, BCR::ABL1 testing is recommended to exclude CML ' +
                    'in blast phase.');
            }

            /* A NORMAL KARYOTYPE DOES NOT EXCLUDE THE CRYPTIC LESIONS: NUP98
               rearrangements are undetected by karyotype in most cases, and the
               pericentric MECOM inversions are frequently missed. */
            if (!f.genetics.karyotypeOutstanding && !f.genetics.abnormalities.length) {
                notes.push('A normal karyotype does not exclude cryptic NUP98 or MECOM ' +
                    'rearrangements; FISH or a fusion transcript assay is recommended.');
            }

            return notes.join(' ');
        }
    }

);
