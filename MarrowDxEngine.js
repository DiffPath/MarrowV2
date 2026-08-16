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

    (rule.requires || []).forEach(function (clause) {
        const value = clause[1](f);
        if (value === true) met.push(clause[0]);
        else if (value === false) failed.push(clause[0]);
        else unknown.push(clause[0]);
    });

    (rule.excludes || []).forEach(function (clause) {
        const value = clause[1](f);
        if (value === true) failed.push(clause[0]);
        else if (value === null) unknown.push(clause[0]);
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
           second caution can be appended after ranking (see dxUnresolvedPair). */
        caution: rule.caution ? rule.caution(f) : ''
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

    const note = 'The distinction between essential thrombocythemia and prefibrotic primary ' +
        'myelofibrosis is not resolved by the present findings. The two are separated ' +
        'principally on megakaryocyte morphology, which is the least reproducible ' +
        'assessment in this classification, and the distinction carries a substantial ' +
        'difference in prognosis; correlation with the clinical findings, the lactate ' +
        'dehydrogenase and spleen size, and molecular studies is recommended.';
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
function dxResidualCategory(results) {
    const residual = results.filter(function (r) { return r.rule.id === 'mpnU'; })[0];
    if (!residual || residual.bucket === 'excluded' || residual.bucket === 'unassessed') return;

    /* ANY better-scoring live candidate counts, not just another MPN subtype. The
       first cut restricted this to family 'mpn' and let MDS/MPN-SF3B1-T — which
       scored 7 to the residual's 2 — sit below it, because the overlap entity is
       in a different family. But "cannot be assigned to a specific subtype" is not
       a claim about the MPN column: if anything at all fits the case better, the
       subtype question is not settled, and that is as true of an overlap or a
       myelodysplastic candidate as of essential thrombocythemia. */
    const contender = results.some(function (r) {
        return r.rule.id !== 'mpnU' &&
            r.bucket !== 'excluded' && r.bucket !== 'unassessed' && r.score > residual.score;
    });
    if (!contender) return;

    residual.unknown = residual.unknown.concat(['another candidate fits the case better; ' +
        'a specific subtype has not been excluded']);
    if (residual.bucket === 'supported') residual.bucket = 'incomplete';
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

function dxMorphologySentence(f) {
    const parts = [];
    if (f.dysplasia.count !== null && f.dysplasia.count > 0) {
        const named = [];
        if (f.dysplasia.erythroid.atLeast10) named.push('erythroid');
        if (f.dysplasia.myeloid.atLeast10) named.push('granulocytic');
        if (f.dysplasia.megakaryocytic.atLeast10) named.push('megakaryocytic');
        if (named.length) parts.push(`Dysplasia is present in the ${addCommas(named)} ${named.length > 1 ? 'lineages' : 'lineage'}.`);
    }
    if (f.blasts.marrow !== null) {
        parts.push(`Blasts account for approximately ${f.blasts.marrow.toFixed(1)}% of marrow cells.`);
    }
    return parts.join(' ');
}

/* Names the myelodysplasia-related mutations when present, for the comment. Uses
   the broader ICC list so a RUNX1-only case is still named; the classification
   line it accompanies is what draws the WHO/ICC distinction. */
function dxGeneticsSentence(f) {
    if (f.genetics.mrICC.present !== true) return '';
    const genes = f.genetics.mrICC.genes;
    return `A myelodysplasia-related gene mutation is present (${addCommas(genes)}).`;
}

/* "IN THE ABSENCE OF DISEASE-DEFINING GENETIC ALTERATIONS" IS FALSE THE MOMENT
   THE ENGINE USED ONE, and a comment must never contradict the sentence beside
   it. This answers only half the question, and the narrower half: it asks whether
   THE CASE turned up anything defining, which is what decides between "in the
   absence of…" and saying nothing. Whether the ENTITY BEING NAMED is itself
   genetically defined is a different question with a different answer, and it is
   `definedBy` / dxDefiningConfirmed() in the kernel that carries it.

   The clause now says "a demonstrated disease-defining genetic alteration" where
   it used to say "disease-defining genetic alterations". Unknown is not absent:
   with the karyotype outstanding nothing has been demonstrated, which is true and
   is all that can be claimed, where the bare "in the absence of" asserted a
   negative result that nobody had produced.

   Deliberately the DEFINING findings and not `abnormalities.length`: an isolated
   del(20q) defines nothing, and a case carrying only that one really is being
   classified with no defining alteration demonstrated. */
function dxDefiningGeneticsFound(f) {
    return dxAnyOf([f.genetics.amlDefining.present, f.genetics.npm1, f.genetics.del5q,
        f.genetics.sf3b1, f.genetics.tp53MultiHit, f.genetics.mrICC.present,
        f.genetics.mrWHO.present, f.genetics.mrCytoWHO.present,
        f.genetics.mrCytoICC.present]) === true;
}

/* The comment, in whichever of the two registers is selected.

   FINAL, with studies outstanding, is the case the pathologist actually meets
   most often: the morphology is what it is, and the classification will turn on
   results that are not back. It says so, in the classifications' own terms,
   without pretending to more certainty than exists — and without the word
   "temporary", which reads as though the diagnosis were provisional in a way
   that undermines it rather than simply being sequenced. */
/* A CAUTION OUTLIVES THE COMMENT THAT CARRIES IT, and this used to be a silent
   hole: a rule with its own `comment` returned it directly, so the caution and
   the divergence note appended at the bottom of this function were dropped on
   exactly the rules most likely to need them. Every AML rule has a custom
   comment, so every AML caution would have been written and never printed —
   nothing would have errored and no test that only read the rule table would
   have seen it. Both paths now end at the same append. */
function dxComment(result, f, mode) {
    if (result.rule.comment) {
        /* `rule` is in the context so a custom comment can reach its own
           `definedBy` and build the conditional sentence through the shared
           dxClassificationSentence rather than asserting the entity flat. */
        return dxAppendNotes([result.rule.comment(f, { mode: mode, rule: result.rule })], result);
    }

    /* dxNameLine, not dxDiagnosisLine: this one goes INSIDE a sentence, where an
       entity written out in words loses its capital ("…classified as No morphologic
       evidence of a myeloid neoplasm" was the case that showed it). dxLower leaves
       an abbreviation alone, so "MDS with low blasts…" is untouched. The card
       heading still uses dxDiagnosisLine, where the capital belongs. */
    const line = dxNameLine(result.who, result.icc);
    const morphology = dxMorphologySentence(f);
    const genetics = dxGeneticsSentence(f);
    const waiting = dxPendingStudies(f);
    const parts = [];

    if (mode === 'addendum') {
        parts.push('The previously reported morphologic findings have been reviewed in conjunction ' +
            'with the now-available studies.');
        if (morphology) parts.push(morphology);
        if (genetics) parts.push(genetics);
        /* An addendum is written because the studies ARE back — but "back" is not
           the same as "positive", and a genetically defined entity whose
           alteration still is not demonstrated stays conditional here too. */
        parts.push(dxDefiningConfirmed(result.rule, f)
            ? `Taken together, the findings are best classified as ${line}.`
            : dxClassificationSentence(result.rule, f, line));
    } else if (waiting.length && result.bucket === 'pending') {
        if (morphology) parts.push(morphology);
        if (genetics) parts.push(genetics);
        /* THE TWO CASES ARE NOT THE SAME SENTENCE WITH A CLAUSE REMOVED.

           When the entity is genetically defined and its alteration is not in
           hand, the whole claim moves into the conditional and the absence clause
           must not appear at all — "in the absence of a defining alteration, this
           is MDS with 5q deletion" is self-refuting whichever way it is worded.

           When the entity is NOT genetically defined, the absence clause is the
           honest framing: MDS-LB is precisely the category a case falls into when
           nothing defining has been demonstrated. */
        if (!dxDefiningConfirmed(result.rule, f)) {
            parts.push(dxClassificationSentence(result.rule, f, line));
        } else {
            parts.push(dxDefiningGeneticsFound(f)
                ? `The findings are best classified as ${line}.`
                : `In the absence of a demonstrated disease-defining genetic alteration, the ` +
                  `findings are best classified as ${line}.`);
        }
        parts.push(`Final classification will depend on the results of ${addCommas(waiting)} studies, ` +
            `which are outstanding; an addendum will follow.`);
    } else {
        if (morphology) parts.push(morphology);
        if (genetics) parts.push(genetics);
        /* The `incomplete` bucket reaches here too, and it can carry an unconfirmed
           defining alteration: a karyotype with some other abnormality named leaves
           del(5q) unknown while the studies no longer count as outstanding. */
        parts.push(dxClassificationSentence(result.rule, f, line));
    }

    return dxAppendNotes(parts, result);
}

/* The tail every comment ends with, whoever built the body. Divergence first,
   caution last, because the caution is the sentence to leave the reader with —
   a warning about THIS case outranks a note about the two classifications'
   wording. A custom comment's body arrives as a single element, so a caution
   lands as a new sentence after it rather than inside its last paragraph. */
function dxAppendNotes(parts, result) {
    if (result.divergence) parts.push(result.divergence);
    if (result.caution) parts.push(result.caution);
    return parts.join(' ');
}


