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

/* The findings sentence — what was seen, before what it is called. Kept to the
   two things that actually bear on an acute leukemia: how many blasts, and what
   the karyotype showed. */
function dxAmlFindings(f, abnKey) {
    const parts = [];
    if (f.blasts.marrow !== null) {
        parts.push(`Blasts account for approximately ${dxPct(f.blasts.marrow)}% of marrow cells` +
            (f.blasts.marrowBasis && f.blasts.marrowBasis.indexOf('cd34') === 0
                ? ', estimated by CD34 immunohistochemistry.' : '.'));
    } else if (f.blasts.blood !== null) {
        parts.push(`Blasts account for approximately ${dxPct(f.blasts.blood)}% of peripheral blood leucocytes.`);
    }
    /* THE ABNORMALITY IS REPORTED ONLY IF IT WAS ACTUALLY FOUND. This sentence
       used to be printed from `spec.abn` — the rule's own defining lesion — with
       no reference to the case at all, so a marrow whose karyotype had not
       resulted read "Cytogenetic studies show t(15;17)(q24.1;q21.2)/PML::RARA."
       That is a fabricated result, and the most dangerous form this bug takes:
       every other version of it states a conclusion the reader can weigh, while
       this one states a laboratory finding that does not exist. */
    if (abnKey && dxFindingReported(dxAbn(f, abnKey))) {
        parts.push(`Cytogenetic studies show ${ancAbnPhrase(abnKey)}.`);
    }
    return parts.join(' ');
}

/* The comment for a defining-lesion AML. Two paragraphs: what was found, then
   what it is called — the shape of a real sign-out, and the reason dxSetComment
   splits on a blank line. */
function dxAmlComment(spec, f, mode, rule) {
    const who = dxWhoName(spec.who, f);
    const icc = dxAmlIccFor(spec, f);
    const line = dxNameLine(who, icc);

    const head = mode === 'addendum'
        ? 'The previously reported findings have been reviewed in conjunction with the ' +
          'now-available studies.'
        : dxAmlFindings(f, spec.abn);

    /* EVERY RULE IN THIS SET IS DEFINED BY ITS LESION — that is what the factory
       above is for — so "diagnostic of" is only ever available once the lesion is
       in hand. Until then the same sentence is written in the conditional. */
    const parts = [dxClassificationSentence(rule, f, line, 'diagnostic')];

    /* THE DIVERGENCE THAT IS THE WHOLE POINT OF THIS SET. Below ICC's floor the
       two classifications genuinely disagree about whether this is acute
       leukemia, and the comment has to say so — silently printing the WHO name
       would hide a difference that changes treatment. */
    if (dxBlastAtLeast(f, DX_BLAST_ICC) === false) {
        parts.push('WHO-HAEM5 no longer requires a minimum blast count for a genetically defined ' +
            'acute myeloid leukemia, so this case is classified as above. ICC 2022 requires at ' +
            'least 10% blasts or blast equivalents for the same diagnosis and is not met; by that ' +
            'classification the case would be assessed as a myelodysplastic neoplasm.');
    }

    if (spec.urgent) {
        parts.push('Acute promyelocytic leukemia is a medical emergency: the clinical service should be ' +
            'notified urgently, confirmatory PML::RARA testing expedited, and the patient ' +
            'monitored for disseminated intravascular coagulation.');
    }

    const waiting = dxPendingStudies(f);
    if (waiting.length) {
        parts.push(`${addCommas(waiting).replace(/^./, function (c) { return c.toUpperCase(); })} ` +
            `studies are outstanding and an addendum will follow.`);
    }

    return (head ? head + '\n\n' : '') + parts.join(' ');
}

/* The comment for a mutation-defined type. Same two-paragraph shape as
   dxAmlComment; `finding` is the one sentence that names what was found and
   `extra` an optional clause the entity cares about. */
function dxAmlMutationComment(spec, f, mode, rule) {
    const who = dxWhoName(spec.who, f);
    const icc = dxBlastAtLeast(f, spec.iccMin) === false ? null : dxIccName(spec.icc, f);
    const line = dxNameLine(who, icc);

    /* `spec.finding` states the mutation as a fact ("An NPM1 mutation is
       present"), so it may only be printed once the mutation is one — the same
       rule dxAmlFindings applies to the karyotype sentence. */
    const finding = dxDefiningConfirmed(rule, f) ? spec.finding + '.' : '';

    const head = mode === 'addendum'
        ? 'The previously reported findings have been reviewed in conjunction with the ' +
          'now-available studies.'
        : [dxAmlFindings(f, null), finding].filter(Boolean).join(' ');

    const parts = [dxClassificationSentence(rule, f, line, 'diagnostic')];
    const extra = spec.extra ? spec.extra(f.genetics) : '';
    if (extra) parts.push(extra);

    if (dxBlastAtLeast(f, spec.iccMin) === false) {
        parts.push('WHO-HAEM5 no longer requires a minimum blast count for a genetically defined ' +
            'acute myeloid leukemia; ICC 2022 requires at least 10% blasts or blast equivalents, ' +
            'which is not met.');
    }

    const waiting = dxPendingStudies(f);
    if (waiting.length) {
        parts.push(`${addCommas(waiting).replace(/^./, function (c) { return c.toUpperCase(); })} ` +
            `studies are outstanding and an addendum will follow.`);
    }
    return (head ? head + '\n\n' : '') + parts.join(' ');
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
   two classifications can reach the category by different routes, name it
   differently, and split it differently. */
function dxAmlMrComment(f, mode) {
    const g = f.genetics;
    const found = [];
    if (g.mrICC.present === true) {
        found.push(`a myelodysplasia-related gene mutation (${addCommas(g.mrICC.genes)})`);
    }
    /* The report wording, not the on-screen label: "Complex (≥3)" is a chip and
       "a complex karyotype (≥3 abnormalities)" is a sentence. Named directly
       rather than wrapped in "a myelodysplasia-related cytogenetic abnormality
       (…)", which nested one parenthetical inside another. */
    const cyto = g.mrCytoWHO.keys.length ? g.mrCytoWHO.keys : g.mrCytoICC.keys;
    if (cyto.length) found.push(addCommas(cyto.map(ancAbnPhrase)));
    if (f.history.antecedentMyeloid === true) {
        found.push(f.history.antecedent === 'mdsMpn'
            ? 'a documented history of MDS/MPN' : 'a documented history of MDS');
    }

    const head = mode === 'addendum'
        ? 'The previously reported findings have been reviewed in conjunction with the ' +
          'now-available studies.'
        : [dxAmlFindings(f, null),
           found.length ? `The case shows ${addCommas(found)}.` : ''].filter(Boolean).join(' ');

    const whoName = dxWhoName('acute myeloid leukemia, myelodysplasia-related', f);
    const parts = [];

    /* THE ASYMMETRIES, said only when the case actually lands on one. A RUNX1-only
       genotype is ICC's category and not WHO's; an antecedent MDS carries WHO's
       category by itself and is only a qualifier for ICC. Printing either
       unconditionally would attribute to a classification a position it does not
       take on this case. */
    const whoApplies = dxAmlMrWho(f) === true;
    const iccGene = g.mrICC.present === true;
    const iccCyto = g.mrCytoICC.present === true;

    /* NONE OF THE THREE ROUTES ESTABLISHED IS ITS OWN CASE, and it used to fall
       through to the `else` below — which asserted "the findings are those of AML
       with myelodysplasia-related cytogenetic abnormalities (ICC 2022)" on a case
       where no cytogenetic abnormality, no mutation and no history had been
       established. The category has three ways in and this case has taken none of
       them yet; the honest sentence names what would settle it. */
    if (!whoApplies && !iccGene && !iccCyto) {
        parts.push('The blast count is that of an acute myeloid leukemia. Assignment to the ' +
            'myelodysplasia-related category requires a qualifying cytogenetic abnormality or ' +
            'gene mutation, neither of which is established; in correlation with cytogenetic ' +
            'and molecular studies demonstrating one, the findings would be those of ' +
            `${whoName} (WHO-HAEM5); AML with myelodysplasia-related gene mutations or ` +
            'cytogenetic abnormalities (ICC 2022).');
    } else if (whoApplies && (iccGene || iccCyto)) {
        parts.push(`The findings are those of ${whoName} (WHO-HAEM5); ` +
            (iccGene ? 'AML with myelodysplasia-related gene mutations'
                     : 'AML with myelodysplasia-related cytogenetic abnormalities') +
            ' (ICC 2022).');
    } else if (whoApplies) {
        parts.push(`The findings are those of ${whoName} (WHO-HAEM5).`);
        if (f.history.antecedentMyeloid === true && !iccGene && !iccCyto) {
            parts.push('A history of MDS is itself sufficient for the WHO-HAEM5 category; ICC 2022 ' +
                'records it as the qualifier “progressing from MDS” rather than as a defining ' +
                'criterion, and would classify the case on its other features.');
        } else {
            parts.push('The abnormality is not among ICC 2022’s myelodysplasia-related criteria, ' +
                'so that classification would assign the case on its other features.');
        }
    } else {
        parts.push('The findings are those of ' +
            (iccGene ? 'AML with myelodysplasia-related gene mutations'
                     : 'AML with myelodysplasia-related cytogenetic abnormalities') +
            ' (ICC 2022). The criterion met is not among WHO-HAEM5’s, which would classify the ' +
            'case on its other features.');
    }

    const waiting = dxPendingStudies(f);
    if (waiting.length) {
        parts.push(`${addCommas(waiting).replace(/^./, function (c) { return c.toUpperCase(); })} ` +
            `studies are outstanding and an addendum will follow.`);
    }
    return (head ? head + '\n\n' : '') + parts.join(' ');
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
            return 'The NPM1 mutation is present at a variant allele fraction below 10%, without ' +
                'an increase in blood or bone marrow blasts. Outcome data for such cases are ' +
                'lacking and definitive classification as acute myeloid leukemia may not be ' +
                'possible; the possibility of a subclonal variant should be considered and close ' +
                'follow-up is warranted.';
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
                finding: 'An NPM1 mutation is present',
                /* FLT3-ITD status belongs in an NPM1 comment whichever way it
                   reads: the pair is the commonest genotype in normal-karyotype
                   AML, and it decides ELN risk and whether an inhibitor is added.
                   Saying "not detected" is as useful as saying "detected", which
                   is why the absent case is printed too rather than omitted. */
                extra: function (g) {
                    if (g.flt3Itd === true) return 'A FLT3 internal tandem duplication is also present, ' +
                        'which places the case in the intermediate ELN 2022 risk group and is ' +
                        'relevant to therapy.';
                    if (g.flt3Itd === false) return 'FLT3 internal tandem duplication was not detected.';
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
            if (f.genetics.cebpaBiallelic !== true) return '';
            return 'The CEBPA mutation is reported as biallelic. Approximately 5-10% of biallelic ' +
                'CEBPA cases carry a germline N-terminal CEBPA variant; germline testing and ' +
                'referral for genetic counselling should be considered.';
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
            /* WHICH CONFIGURATION WAS REPORTED — and only if one was. The final
               branch used to be unconditional, so a case whose sequencing had not
               resulted read "A CEBPA mutation is reported." with nothing behind
               it. `dxDefiningConfirmed` is the same gate the classification
               sentence below uses, so the two cannot disagree. */
            let reported = '';
            if (g.cebpaBzip === true) reported = 'An in-frame bZIP CEBPA mutation is reported.';
            else if (g.cebpaBiallelic === true) reported = 'Biallelic CEBPA mutation is reported.';
            else if (dxDefiningConfirmed(ctx.rule, f)) reported = 'A CEBPA mutation is reported.';

            const head = ctx.mode === 'addendum'
                ? 'The previously reported findings have been reviewed in conjunction with the ' +
                  'now-available studies.'
                : [dxAmlFindings(f, null), reported].filter(Boolean).join(' ');

            /* NAME ICC'S ENTITY ONLY WHEN ITS CRITERION IS ACTUALLY ESTABLISHED.
               Printing it unconditionally produced a comment that asserted "AML
               with in-frame bZIP CEBPA mutations (ICC 2022)" and then said in the
               next sentence that the reading frame was unconfirmed — a
               contradiction in consecutive sentences, and the same class of error
               as a comment naming a study as outstanding while using its result. */
            const named = g.cebpaBzip === true
                ? 'acute myeloid leukemia with CEBPA mutation (WHO-HAEM5); AML with in-frame ' +
                  'bZIP CEBPA mutations (ICC 2022)'
                : 'acute myeloid leukemia with CEBPA mutation (WHO-HAEM5)';
            /* Built through the shared prefix rather than dxClassificationSentence
               because this entity's ICC half is conditional on the bZIP finding,
               so the name is assembled here and cannot come from result.icc. The
               mood still has to move when the mutation is not established. */
            const prefix = dxConfirmationPrefix(ctx.rule, f);
            const body = [prefix
                ? `${prefix}the findings would be those of ${named}.`
                : `The findings are those of ${named}.`];

            /* The limitation, stated rather than hidden. The criterion is
               positional and this tool reads the laboratory's words.

               THE DISCORDANCE IS THREE-WAY, NOT TWO, and this is the practical
               point: ELN 2022 assigns favorable risk to in-frame bZIP mutations
               ONLY, irrespective of allelic state. So a biallelic non-bZIP case is
               WHO-HAEM5's entity and carries none of the favorable prognosis the
               name implies — in one 741-case series only 64% of the cases meeting
               WHO-HAEM5 also met ICC (Leuk Res 2023, PMID 37690321). Naming the
               entity without naming the risk would be the misleading half. */
            if (g.cebpaBzip !== true) {
                body.push('WHO-HAEM5 requires either biallelic mutation or a single mutation in the ' +
                    'basic leucine zipper (bZIP) region; ICC 2022 requires an in-frame bZIP ' +
                    'mutation and does not accept the biallelic criterion. The mutation’s position ' +
                    'and reading frame should be confirmed against the molecular report, as the ' +
                    'entity is not established without them, and ELN 2022 assigns favorable risk ' +
                    'only to in-frame bZIP mutations.');
            }
            if (dxBlastAtLeast(f, DX_BLAST_AML) === false) {
                body.push('WHO-HAEM5 retains a ≥20% blast requirement for this type, which is not ' +
                    'met; ICC 2022 requires ≥10%.');
            }
            /* GERMLINE, ALWAYS. About 10% of CEBPA-mutated AML is germline, and
               the classic two-hit pattern — an N-terminal germline frameshift plus
               an acquired bZIP in-frame indel — is precisely the biallelic
               genotype that reads as reassuringly sporadic. The test is cheap to
               state and the consequence of missing it reaches the patient's
               family, so it is said on every case rather than on a guess about
               which ones look familial. */
            body.push('Approximately 10% of CEBPA-mutated acute myeloid leukemia arises on a ' +
                'germline CEBPA variant. Germline testing on cultured skin fibroblasts should be ' +
                'considered irrespective of family history, particularly if the mutation persists ' +
                'at complete remission at a variant allele fraction near 50%.');
            return head + '\n\n' + body.join(' ');
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
        divergence: 'WHO-HAEM5 does not recognise a TP53-defined acute myeloid leukemia; such ' +
            'cases fall to AML, myelodysplasia-related where the accompanying cytogenetic ' +
            'criteria are met. ICC 2022 defines the entity on any somatic TP53 mutation at a ' +
            'variant allele fraction above 10%, irrespective of allelic status.'
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
        divergence: 'The two classifications define this category differently. ICC 2022 counts ' +
            'RUNX1 among the myelodysplasia-related genes and WHO-HAEM5 does not; their ' +
            'cytogenetic lists differ in both directions, ICC including +8 and del(20q) and ' +
            'WHO-HAEM5 including del(11q) and −13/del(13q); and a history of MDS or MDS/MPN is ' +
            'itself sufficient for the WHO category, whereas ICC 2022 records it as a qualifier.',
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
            const head = ctx.mode === 'addendum'
                ? 'The previously reported findings have been reviewed in conjunction with the ' +
                  'now-available studies.'
                : dxAmlFindings(f, null);

            const parts = ['The findings are those of acute myeloid leukemia.'];

            /* WHAT THIS COMMENT MUST NOT DO is imply the classification is
               finished. The genetically defined types are diagnosed at any blast
               count in WHO-HAEM5 and at 10% in ICC, so a case that reaches this
               residual rule with the studies still out is not "AML, NOS" — it is
               an AML whose subtype is not yet known, and those are different
               claims. */
            const waiting = dxPendingStudies(f);
            if (waiting.length) {
                parts.push(`Subclassification requires the outstanding ${addCommas(waiting)} studies; ` +
                    `several genetically defined types are diagnosed below the ` +
                    `20% blast threshold. An addendum will follow.`);
            } else {
                parts.push('No defining genetic abnormality has been identified. WHO-HAEM5 assigns ' +
                    'a type by differentiation on the morphologic and immunophenotypic findings; ' +
                    'ICC 2022 classifies the case as AML, not otherwise specified.');
            }
            return (head ? head + '\n\n' : '') + parts.join(' ');
        },
        /* TWO SAFETY NOTES, and they sit on the RESIDUAL rather than on the
           defining types because both are about what a case with no named lesion
           might still turn out to be. A case that reached this rule has ≥20%
           blasts and nothing to explain them, which is the one situation in the
           AML set where the classification is not the last question. */
        caution: function (f) {
            const notes = [];

            /* BASOPHILIA WITH BCR::ABL1 UNKNOWN. This is the app's only caution
               that can change the DISEASE rather than the subtype: a basophilic
               acute leukemia may be CML in blast crisis, which the engine
               already models (`cml`) but cannot reach without the fusion result.
               Fires only while BCR::ABL1 is genuinely unknown — a negative result
               settles it and a positive one takes the case to `cml` — which is
               what keeps it from becoming a sentence that prints on every case. */
            if (f.drivers.bcrAbl === null &&
                dxAtLeast(f.counts.basophilPct, DX_BASOPHILIA_PCT) === true) {
                notes.push('Basophilia is present and BCR::ABL1 status is not established. ' +
                    'BCR::ABL1 testing by FISH or RT-PCR should be performed on any acute ' +
                    'leukemia with a basophilic component, as the findings may represent ' +
                    'chronic myeloid leukemia in blast phase rather than de novo acute ' +
                    'myeloid leukemia.');
            }

            /* A NORMAL KARYOTYPE DOES NOT EXCLUDE THE CRYPTIC LESIONS, and two of
               the eight defining types are largely cryptic: NUP98 rearrangements
               are undetected by karyotype in 88.2% of cases and the karyotype is
               frankly normal in about half, and the pericentric inversions of
               MECOM were missed in 16 of 17. Both are types this engine will
               offer the moment the abnormality is recorded — so the gap is in the
               assay, not in the rules, and the comment has to say which. */
            if (!f.genetics.karyotypeOutstanding && !f.genetics.abnormalities.length) {
                notes.push('Conventional cytogenetics are normal. A normal karyotype does not ' +
                    'exclude a defining genetic abnormality: NUP98 rearrangements are cryptic ' +
                    'in the majority of cases and the pericentric inversions involving MECOM ' +
                    'are frequently missed, so targeted FISH or a fusion transcript assay is ' +
                    'required before the case is classified by differentiation alone.');
            }

            return notes.join(' ');
        }
    }

);
