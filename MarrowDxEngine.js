/* ============================================================================
   MarrowDxEngine.js — scoring, ranking and comment assembly

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. Must load after every family file: dxRank() reads the finished dxRules.
   ========================================================================= */


/* The workup requested — a prior on the family the question names, applied to
   every candidate of that family equally. It is NOT evidence about the case —
   it is a statement about why the case was sent — and it still moves no gate:
   letting it would make the tool agree with whoever filled in the Specimen tab.

   IT DOES TWO THINGS NOW, both at the author's instruction ("the template
   selections should increase the likelihood of a particular comment … even if
   that is the only thing selected, those options should go to the top"):

     1. Its points outweigh any prevalence prior (DX_PRIOR_BAND tops at 2), so
        the named family sorts above everything not otherwise evidenced. It was
        +1, "break a tie and nothing more"; the instruction supersedes that.
     2. It LIFTS its family out of `unassessed` (see the bucket test), so on an
        otherwise blank form the named family's candidates are the differential
        — they are the answer to the question that was asked, not the rule
        table reciting itself. Every other family still needs case evidence.

   The third element is the FAMILY it reaches. An MPN workup must not lift the
   MDS candidates and vice versa: the two are worked up against each other, so a
   bonus that reached both would cancel out to nothing, and one that reached the
   wrong one would put a thumb on the scale in the exact comparison the
   pathologist opened the tab to make. The acute leukemia workup likewise
   reaches `aml` only, never the myelodysplastic candidates — the MDS/AML
   boundary is the exact comparison that workup is opened to make.

   `lymphoma` names a family with no rules yet; the entry is here so the first
   lymphoma rule inherits the wiring instead of rediscovering it. */
const DX_WORKUP_POINTS = 3;

const dxWorkupBonus = {
    ruleOutPlasmaCell: ['plasma cell workup requested', DX_WORKUP_POINTS, 'pcn'],
    historyPlasmaCell: ['history of plasma cell neoplasm', DX_WORKUP_POINTS, 'pcn'],
    ruleOutMDS: ['MDS workup requested', DX_WORKUP_POINTS, 'mds'],
    historyMDS: ['history of MDS', DX_WORKUP_POINTS, 'mds'],
    ruleOutMPN: ['MPN workup requested', DX_WORKUP_POINTS, 'mpn'],
    historyMPN: ['history of MPN', DX_WORKUP_POINTS, 'mpn'],
    ruleOutAcuteLeuk: ['acute leukemia workup requested', DX_WORKUP_POINTS, 'aml'],
    historyAcuteLeuk: ['history of acute leukemia', DX_WORKUP_POINTS, 'aml'],
    ruleOutLymphoma: ['lymphoma workup requested', DX_WORKUP_POINTS, 'lymphoma'],
    historyLymphoma: ['history of lymphoma', DX_WORKUP_POINTS, 'lymphoma']
};


/* ----------------------------------------------------------------------------
   Scoring
-------------------------------------------------------------------------- */


/* EVERY CONTRIBUTION SAYS WHERE IT CAME FROM, and the three kinds are not
   interchangeable:

     'case'     a finding about THIS marrow. The only kind that is evidence.
     'context'  the workup bonus — why the case was sent, not what it is.
     'prior'    the entity's prevalence baseline, true of every case alike.

   The distinction is load-bearing rather than decorative. `unassessed` used to
   test `!score`, and the workup bonus lands in `score` — so on an MDS workup with
   nothing entered at all, every mds rule escaped `unassessed` by ACCIDENT, as a
   side effect of arithmetic. Case evidence lifts a candidate; so, now, does the
   requested workup for its OWN family only — deliberately this time, at the
   author's instruction (see dxWorkupBonus above), and stated in the bucket test
   rather than smuggled through the score. */
function dxPoint(text, points, kind, key) {
    return { text: text, points: points, kind: kind || 'case', key: key || text };
}

function dxEvaluate(rule, f) {
    const met = [], failed = [], unknown = [], evidence = [];
    /* `expects` outcomes, kept apart from the gate lists: `expected` is a soft
       criterion met, `lacking` one contradicted, `quiet` one nobody has answered. */
    const expected = [], lacking = [], quiet = [];

    /* THE SAME UNANSWERED CRITERIA, CARRYING WHICH KIND OF CLAUSE THEY CAME FROM.
       `unknown` and `quiet` are flat label lists and three consumers already read
       them that way (dxNeedsGenetics matches their text, the Scoring view prints
       them), so this is an ADDITIONAL array rather than a change to either.

       What it adds is the distinction the Differential view is built on and the
       flat lists cannot express: answering a `requires` can CONFIRM or EXCLUDE,
       answering an `excludes` can only exclude, and answering an `expects` can do
       neither — it moves the rank and nothing else. A view that told a reader to
       go and order a study has to be able to say which of those three the result
       would buy them. */
    const outstanding = [];

    (rule.requires || []).forEach(function (clause) {
        const value = clause[1](f);
        if (value === true) met.push(clause[0]);
        else if (value === false) failed.push(clause[0]);
        else {
            unknown.push(clause[0]);
            outstanding.push({ label: clause[0], kind: 'requires' });
        }
    });

    (rule.excludes || []).forEach(function (clause) {
        const value = clause[1](f);
        if (value === true) failed.push(clause[0]);
        else if (value === null) {
            unknown.push(clause[0]);
            outstanding.push({ label: clause[0], kind: 'excludes' });
        }
    });

    /* SOFT CRITERIA: [label, for, against, test]. Strong evidence that is not
       definitional — false costs points and is stated as evidence against, and
       NOTHING leaves the differential for lacking one. This is the half of the
       engine that lets a finding carry likelihood at all: while a criterion is a
       gate it is pass/fail, so anemia — which gates seven of the eight MDS rules
       — could never say "this raises MDS-SF3B1 a lot and MDS-IB2 a little."

       THE AGAINST WEIGHT IS DECLARED, NEVER DERIVED FROM THE FOR WEIGHT. Absence
       of a rare feature is weak evidence against; absence of an obligate one is
       strong, and the two are not the same number with a sign flipped. PV's
       subnormal erythropoietin is the worked example already in the table: +3
       present, −1 absent, because the test is ~90-96% specific but only ~64-80%
       sensitive, so a normal value barely argues against.

       A SOFT UNKNOWN GOES TO `quiet`, NOT TO `unknown`. Two reasons, both fatal:
       every rule would carry a permanently unanswered clause and `supported`
       would become unreachable; and dxNeedsGenetics() matches label TEXT to
       decide "awaiting studies" versus "not yet done", so soft labels would flip
       cases into pending wording over criteria no study answers. */
    (rule.expects || []).forEach(function (clause) {
        const value = clause[3](f);
        if (value === true) {
            expected.push(clause[0]);
            if (clause[1]) evidence.push(dxPoint(clause[0], clause[1]));
        } else if (value === false) {
            lacking.push(clause[0]);
            if (clause[2]) evidence.push(dxPoint(clause[0] + ' (not met)', clause[2]));
        } else {
            quiet.push(clause[0]);
            outstanding.push({ label: clause[0], kind: 'expects' });
        }
    });

    /* A support clause may carry a fourth element, its key, so the likelihood
       registry can tell that it has already scored the same finding. */
    (rule.supports || []).forEach(function (clause) {
        if (clause[2](f) === true) evidence.push(dxPoint(clause[0], clause[1], 'case', clause[3]));
    });

    /* The registry's per-entity weights, merged in. Local `supports` win on a key
       collision — they are the reviewed ones — and the loser is reported rather
       than silently dropped. Absent until MarrowDxLikelihood.js is loaded. */
    if (typeof dxRegistryEvidence === 'function') {
        const merged = dxMergeEvidence(evidence, dxRegistryEvidence(rule, f));
        evidence.length = 0;
        Array.prototype.push.apply(evidence, merged.evidence);
        var suppressed = merged.suppressed;
    }

    const prior = dxPriorFor(rule, f);
    if (prior) evidence.push(dxPoint(dxPriorText(rule), prior, 'prior', '__prior'));

    const workup = dxWorkupBonus[f.templateType];
    const workupMatched = !!(workup && rule.family === workup[2]);
    if (workupMatched) {
        evidence.push(dxPoint(workup[0], workup[1], 'context', '__workup'));
    }

    const score = evidence.reduce(function (n, e) { return n + e.points; }, 0);
    const forCase = evidence.some(function (e) { return e.kind === 'case' && e.points > 0; });

    /* THE BUCKET. `failed` beats `unknown` beats clean: a candidate ruled out by
       something we know stays ruled out however much else is missing.

       `unassessed` exists because without it an empty case suggested MDS-5q:
       every requirement unknown, nothing met, nothing scored. A candidate that has
       nothing FOR it is not a suggestion, it is the rule table reciting itself.
       It now tests POSITIVE CASE EVIDENCE rather than the total — a prevalence
       prior is nonzero on every case, so `!score` would have made the bucket
       unreachable and a blank form would have offered the whole table.

       `contested` is the fifth: gates all met, but a soft criterion contradicted.
       Without it such a card renders in the green of `supported` and reads as a
       confident answer while carrying evidence against it. */
    let bucket;
    if (failed.length) bucket = 'excluded';
    /* A matched workup lifts its own family out of `unassessed` — the one
       exception to "only case evidence can lift", made at the author's
       instruction: on a blank form, the family named by the workup IS the
       differential the pathologist asked for. Everything else still needs a
       finding for it. */
    else if (!met.length && !expected.length && !forCase && !workupMatched) bucket = 'unassessed';
    else if (unknown.length) bucket = f.genetics.pending && dxNeedsGenetics(unknown) ? 'pending' : 'incomplete';
    else if (lacking.length) bucket = 'contested';
    else bucket = 'supported';

    return {
        rule: rule,
        bucket: bucket,
        score: score,
        /* The prior-free subtotal. dxUnresolvedPair compares THIS, never `score`:
           essential thrombocythemia is commoner than prefibrotic PMF, so a
           prevalence prior would quietly tilt the one comparison the engine goes
           out of its way to refuse to decide. */
        support: score - prior,
        prior: prior,
        met: met,
        failed: failed,
        unknown: unknown,
        expected: expected,
        lacking: lacking,
        quiet: quiet,
        /* [{label, kind}] over the same criteria as `unknown` + `quiet`, in gate
           order. Read by the Differential view (MarrowDxSteps.js). */
        outstanding: outstanding,
        evidence: evidence,
        suppressed: suppressed || [],
        who: rule.whoFor ? rule.whoFor(f) : rule.who,
        icc: rule.iccFor ? rule.iccFor(f) : rule.icc,
        /* A string, or a function of the case returning one — the same seam
           `whoFor` and the counter's `tableCaption` use. Fixed where the two
           classifications differ in a fixed way, computed where which difference
           applies is itself a finding (CMML). */
        divergence: rule.diverges && rule.diverges(f) === true
            ? (typeof rule.divergence === 'function' ? rule.divergence(f) : rule.divergence)
            : null,
        /* A sentence the comment must carry when a candidate is right but reaching
           it needs something said out loud — fibrosis with no driver mutation being
           the case it was added for. Separate from `divergence`, which is about the
           two classifications disagreeing, because this one is about the case. A
           second caution can be appended after ranking (see dxUnresolvedPair).

           REPORT TEXT, so it is written the way a hematopathologist writes a
           comment: a short, case-specific recommendation or fact, never the
           rationale behind it. */
        caution: rule.caution ? rule.caution(f) : '',
        /* THE PATHOLOGIST'S HALF, which never reaches the report: reminders to
           look at something on the slide, limits of what this app records, and
           the reasoning a caution would otherwise have carried. Shown on the
           Diagnosis card as its own line (MarrowDxPanel.js). The divergence
           paragraph lands there too — the report already names both
           classifications in its diagnosis line. */
        check: rule.check ? rule.check(f) : ''
    };
}

/* Is what is missing something the genetic studies would answer? That is the
   difference between "awaiting studies" — which is a normal state with its own
   wording — and "you have not counted the blasts yet", which is a to-do. */
function dxNeedsGenetics(unknown) {
    return unknown.some(function (label) {
        return /del\(5q\)|SF3B1|TP53|karyotype|somatic|mutation|myelodysplasia-related|del\(7q\)|complex|JAK2|CALR|MPL|CSF3R|BCR::ABL1|clonal marker|NPM1|CEBPA|RUNX1|KMT2A|MECOM|NUP98|PML::RARA|CBFB|MYH11|DEK|RBM15|identified|abnormality|rearrangement|t\(\d/i.test(label);
    });
}

/* EVERY LIVE CANDIDATE RANKS ON EVIDENCE. The bucket no longer sorts.

   This began as "pending and incomplete rank together, by score", on the grounds
   that the difference between them is about WORDING and not about which is
   likelier. That reasoning was right and it was not finished: `supported` sat
   above both for the same bad reason. `supported` means "no definitional
   criterion is unanswered", which is a fact about HOW MUCH OF THE FORM WAS FILLED
   IN, not about how well the case fits — and the engine already carried two
   separate patches for the inversions that caused. dxResidualCategory exists
   because MPN-NOS reached `supported` on 2 points and outranked essential
   thrombocythemia on 8; dxGate.lowBlastsBoth combines its two limbs because
   hypoplastic MDS headlined over MDS-LB purely by having one fewer way to be
   unsure. Both are the same bug, patched twice at the edges.

   Soft gates make it worse: more candidates stay live, so the completeness axis
   gets noisier exactly as it gets more load. So completeness stops being the sort
   key and becomes a bounded bonus, which is all it was ever entitled to be.

   THE CONSEQUENCE, ACCEPTED DELIBERATELY: a better-evidenced unconfirmed
   candidate can now headline over a confirmed one. Under a likelihood model that
   is the correct answer, and the conditional register is what keeps it honest —
   dxClassificationSentence already writes "would be best classified as" for
   anything whose defining finding is not in hand, so the comment cannot assert
   what the ranking has not proven. */
const DX_TIER = {
    supported: 0, pending: 0, incomplete: 0, contested: 0,
    unassessed: 1,
    excluded: 2
};

/* One ladder step, and no more. A confirmed candidate should win a near tie
   against an unconfirmed one; it must never win against a better-evidenced one,
   which is the inversion above. Withheld when a soft criterion is contradicted —
   "supported" carrying evidence against it has not earned the bonus. */
const DX_CONFIRMED_BONUS = 1;

function dxRankScore(r) {
    return r.score + (r.bucket === 'supported' && !r.lacking.length ? DX_CONFIRMED_BONUS : 0);
}
/* ET VERSUS PREFIBROTIC PMF, WHEN THE CASE DOES NOT SETTLE IT.

   This is the only place the engine reasons about a PAIR of candidates rather than
   one, and it earns the exception. The distinction matters — 15-year overall
   survival 80% against 59%, leukemic transformation at 10 years 0.7% against 5.8%
   (Barbui, J Clin Oncol 2011;29:3179) — but it is also the least reproducible call
   in the classification, at kappa 0.41 with full six-observer consensus in 13% of
   cases (Haematologica 2012;97:360).

   An engine that silently ranked one a point above the other would be manufacturing
   a decision the reference standard does not support. So when both are live and the
   scores are within DX_UNRESOLVED_MARGIN, both say so. "Unresolved between these
   two" is a real answer here, not a failure to produce one. */
const DX_UNRESOLVED_MARGIN = 2;

function dxUnresolvedPair(results) {
    const live = function (id) {
        return results.filter(function (r) {
            return r.rule.id === id && r.bucket !== 'excluded' && r.bucket !== 'unassessed';
        })[0];
    };
    const et = live('et');
    const pre = live('prePmf');
    if (!et || !pre) return;
    /* `support`, the PRIOR-FREE subtotal, never `score`. Essential thrombocythemia
       is the commoner of the two, so comparing totals would let a prevalence
       baseline decide the one call the engine deliberately refuses to make — and
       it would do it silently, by moving the pair out of the margin. The margin is
       about what THIS case shows. */
    if (Math.abs(et.support - pre.support) > DX_UNRESOLVED_MARGIN) return;

    const note = 'Essential thrombocythemia and prefibrotic primary myelofibrosis cannot be ' +
        'reliably separated on the present findings; correlation with LDH, spleen size and ' +
        'the clinical course is recommended.';
    [et, pre].forEach(function (r) {
        r.unresolvedWith = r === et ? 'prePmf' : 'et';
        r.caution = r.caution ? r.caution + ' ' + note : note;
    });
}

/* THE RESIDUAL CATEGORY IS NOT CONFIRMABLE, and this is the one thing about it
   that has to be said in code rather than in criteria.

   MPN-NOS / MPN-U asks almost nothing — a driver mutation and no BCR::ABL1 — so
   it is the easiest rule in the table to satisfy completely, and it reached
   `supported` on a case where essential thrombocythemia scored 8 to its 2 and was
   only `incomplete` because a reticulin had not been done. The bucket sort then
   put the residual category first, which is the exact inversion the `unassessed`
   bucket was added to prevent, arriving from the other side: `unassessed` stops a
   candidate with NO evidence ranking high, and this stops one whose criteria are
   too weak to fail.

   It is not a scoring tweak. The category's actual definition is "features of a
   myeloproliferative neoplasm that PREVENT assignment to a specific subtype", so
   "no specific subtype is in contention" is a real, unmet requirement of it — the
   engine simply cannot see that from inside a single rule, because rules are
   evaluated independently by design. Reported as an explicit `unknown` so the
   Scoring view says why, rather than as a silent demotion. */
/* DECLARED ON THE RULE (`residual: true`) RATHER THAN NAMED HERE, which it was:
   this function used to test `r.rule.id === 'mpnU'`. That was fine while MPN-NOS
   was the only residual in the table and stopped being fine the moment a second
   family arrived with one — the lymphoid axis's "atypical lymphoid infiltrate of
   uncertain significance" is the same shape of category, easy to satisfy
   completely and wrong to confirm while something more specific fits. A
   hard-coded id is also the failure this repo keeps finding: it works, it never
   errors, and the next rule that needs the behaviour silently does not get it. */
function dxResidualCategory(results) {
    results.filter(function (r) {
        return r.rule.residual && r.bucket !== 'excluded' && r.bucket !== 'unassessed';
    }).forEach(function (residual) {
        /* ANY better-scoring live candidate counts, not just another subtype of
           the same family. The first cut restricted this to family 'mpn' and let
           MDS/MPN-SF3B1-T — which scored 7 to the residual's 2 — sit below it,
           because the overlap entity is in a different family. But "cannot be
           assigned to a specific subtype" is not a claim about the MPN column: if
           anything at all fits the case better, the subtype question is not
           settled, and that is as true of an overlap or a myelodysplastic
           candidate as of essential thrombocythemia.

           WITHIN THE SAME AXIS, THOUGH, and that limit arrived with the lymphoid
           rules. A myelodysplastic candidate scoring 9 says nothing whatever
           about whether an atypical lymphoid infiltrate has been characterised —
           the two answer different questions and a marrow may be both — so
           without the axis test the strongest myeloid candidate in the table
           would demote the lymphoid residual on every case that had one. */
        const axis = dxAxis(residual.rule);
        const contender = results.some(function (r) {
            return r.rule !== residual.rule && dxAxis(r.rule) === axis &&
                r.bucket !== 'excluded' && r.bucket !== 'unassessed' && r.score > residual.score;
        });
        if (!contender) return;

        /* BOTH LISTS, and the second one is easy to forget because nothing reads
           it until the Differential view does. `outstanding` is `unknown` +
           `quiet` with the clause kind attached, so a criterion added here and
           not there leaves the two disagreeing — the Scoring view would show an
           outstanding criterion the Differential's "Still needed" column did
           not. Tagged `requires` because that is what it behaves like: it is
           unmet, and it is categorical for this category. No study answers it,
           so the step vocabulary maps it to no action and it prints as a bare
           criterion, which is exactly right — what settles it is another
           candidate ceasing to fit, not a test. */
        const stillOpen = 'another candidate fits the case better; a specific subtype has not ' +
            'been excluded';
        residual.unknown = residual.unknown.concat([stillOpen]);
        residual.outstanding = (residual.outstanding || []).concat([
            { label: stillOpen, kind: 'requires' }
        ]);
        if (residual.bucket === 'supported') residual.bucket = 'incomplete';
    });
}

function dxRank(f) {
    const results = dxRules.map(function (rule) { return dxEvaluate(rule, f); });
    dxUnresolvedPair(results);
    dxResidualCategory(results);
    return results.sort(function (a, b) {
        if (DX_TIER[a.bucket] !== DX_TIER[b.bucket]) return DX_TIER[a.bucket] - DX_TIER[b.bucket];
        const d = dxRankScore(b) - dxRankScore(a);
        if (d) return d;
        /* Ties break on table order, stated explicitly rather than left to sort
           stability — Marrow.html already declares the script order load-bearing,
           so the tiebreak may as well say which order it means. */
        return dxRules.indexOf(a.rule) - dxRules.indexOf(b.rule);
    });
}


/* ----------------------------------------------------------------------------
   Comments

   Assembled from parts and joined, so spacing holds whichever parts are present
   — the whitespace rule that applies everywhere else in this app.
-------------------------------------------------------------------------- */

function dxDiagnosisLine(result) {
    const who = result.who;   // dynamic where whoFor is defined (the MR names)
    if (!result.icc || result.icc === who) return who;
    return `${who} (WHO-HAEM5); ${result.icc} (ICC 2022)`;
}

/* Which studies to NAME as outstanding. Reads the findings' own view rather than
   re-deriving it from the status toggles, so the comment cannot name a study as
   awaited while the engine is already using its result. */
function dxPendingStudies(f) {
    const waiting = [];
    if (f.genetics.karyotypeOutstanding) waiting.push('cytogenetic');
    if (f.genetics.ngsOutstanding) waiting.push('molecular');
    return waiting;
}

/* The blast percentage as the report states it, with what it rests on where
   that is not a differential. */
function dxBlastBasis(f) {
    const cd34 = f.blasts.marrowBasis && f.blasts.marrowBasis.indexOf('cd34') === 0;
    return cd34 ? ' by CD34 immunohistochemistry' : '';
}

/* "Blasts comprise 60% of marrow cells", or "…are not increased (2%)" below 5%. */
function dxBlastSentence(f) {
    if (f.blasts.marrow === null) return '';
    const pct = `${dxPct(f.blasts.marrow)}%`;
    return dxBelow(f.blasts.marrow, 5) === true
        ? `Blasts are not increased (${pct}${dxBlastBasis(f)}).`
        : `Blasts comprise ${pct} of marrow cells${dxBlastBasis(f)}.`;
}

/* One sentence: the dysplastic lineages and the blast count. The findings are
   already described in the microscopic; the comment names only the two things
   the classification turns on. */
function dxMorphologySentence(f) {
    const named = [];
    if (f.dysplasia.count !== null && f.dysplasia.count > 0) {
        if (f.dysplasia.erythroid.atLeast10) named.push('erythroid');
        if (f.dysplasia.myeloid.atLeast10) named.push('granulocytic');
        if (f.dysplasia.megakaryocytic.atLeast10) named.push('megakaryocytic');
    }
    const dysplasia = named.length === 3 ? 'Trilineage dysplasia'
        : (named.length ? dxCap(addCommas(named)) + ' dysplasia' : '');
    if (dysplasia && f.blasts.marrow !== null) {
        return `${dysplasia} is present, with ${dxPct(f.blasts.marrow)}% blasts${dxBlastBasis(f)}.`;
    }
    if (dysplasia) return `${dysplasia} is present.`;
    return dxBlastSentence(f);
}

/* Names the myelodysplasia-related mutations when present, for the comment. Uses
   the broader ICC list so a RUNX1-only case is still named; the classification
   line it accompanies is what draws the WHO/ICC distinction. */
function dxGeneticsSentence(f) {
    if (f.genetics.mrICC.present !== true) return '';
    return `Molecular studies show ${dxGenePhrase(f.genetics.mrICC.genes)}.`;
}

/* The comment, in whichever of the two registers is selected.

   WRITTEN THE WAY A HEMATOPATHOLOGIST WRITES ONE: the findings the classification
   turns on, the classification, and what is still to come. No rationale, no
   restatement of the criteria, nothing about how the two classifications reason.
   The WHO-HAEM5 and ICC 2022 names are both in the classification sentence; the
   explanation of why they differ is on the Diagnosis card, not in the report.

   An entity defined by a genetic alteration that is not in hand is written in the
   conditional (dxClassificationSentence), so the comment never asserts what the
   studies have not shown. "Pending" is said only on a candidate whose own bucket
   is waiting on them, so a case that never used the Ancillary tab is not told
   its studies are outstanding. */
/* A CAUTION OUTLIVES THE COMMENT THAT CARRIES IT, and this used to be a silent
   hole: a rule with its own `comment` returned it directly, so the caution was
   dropped on exactly the rules most likely to need it. Both paths now end at the
   same append. */
function dxComment(result, f, mode) {
    /* THE PENDING LINE IS ALWAYS LAST, after any recommendation, so it is added
       here for every rule rather than inside each comment. A rule with its own
       comment says it whenever a study is out (an AML or CMML subtype always
       turns on them); the generic comment only when its own bucket is waiting. */
    const pending = mode !== 'addendum' && (result.rule.comment || result.bucket === 'pending')
        ? dxPendingSentence(f) : '';

    if (result.rule.comment) {
        /* `rule` is in the context so a custom comment can reach its own
           `definedBy` and build the conditional sentence through the shared
           dxClassificationSentence rather than asserting the entity flat. */
        return dxAppendNotes([result.rule.comment(f, { mode: mode, rule: result.rule })], result, pending);
    }

    /* dxNameLine, not dxDiagnosisLine: this one goes INSIDE a sentence, where an
       entity written out in words loses its capital. The card heading still uses
       dxDiagnosisLine, where the capital belongs. */
    const line = dxNameLine(result.who, result.icc);
    const parts = [];
    if (mode === 'addendum') parts.push(DX_ADDENDUM_LEAD);
    parts.push(dxMorphologySentence(f), dxGeneticsSentence(f));
    parts.push(dxClassificationSentence(result.rule, f, line));
    return dxAppendNotes(parts, result, pending);
}

/* The tail every comment ends with, whoever built the body: the caution, which
   is report text, then the pending line. The divergence paragraph and the
   `check` notes are the pathologist's and stay on the card. */
function dxAppendNotes(parts, result, pending) {
    if (result.caution) parts.push(result.caution);
    if (pending) parts.push(pending);
    return parts.filter(Boolean).join(' ');
}


