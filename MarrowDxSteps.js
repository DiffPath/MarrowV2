/* ============================================================================
   MarrowDxSteps.js — the Differential view: the top candidates, and what would
   settle each one

   Loads after MarrowDxEngine.js (it reads dxRankScore and the evaluated result)
   and before MarrowDxPanel.js, which calls dxDifferentialHTML() for its third
   view.

   ---------------------------------------------------------------------------
   WHAT THIS VIEW IS FOR, AND WHY IT IS NOT THE OTHER TWO

   Comments answers "what would I write". Scoring answers "why did it rank
   there". Neither answers the question a pathologist actually has at the
   microscope, which is "what do I do next" — and that question has a different
   shape from both: it is about a SET of candidates rather than one, and about
   the criteria that are still OPEN rather than the ones already met.

   The Scoring view does list what is unanswered, per candidate, in the rules'
   own words. That is an audit trail and not a plan: "blasts <5% in marrow and
   <2% in blood" states a criterion, where what the reader needs is "count a
   500-cell aspirate differential". This view is the second of those, and the
   translation between them is the only content in this file that is not
   derived.

   ---------------------------------------------------------------------------
   THE STEPS ARE DERIVED FROM THE RULES, NEVER AUTHORED PER ENTITY

   The obvious implementation is a `nextSteps: [...]` array on each rule. It was
   not done and should not be: forty-one rules would each carry a hand-written
   list that starts out agreeing with its own gates and drifts from them on the
   first edit — and the drift would be invisible, because nothing compares the
   two. Worse, it would be wrong on the case in front of you rather than in
   general: a rule that lists "obtain a karyotype" lists it whether or not this
   marrow already has one.

   So a step exists only where the engine says a criterion is UNANSWERED for
   this case (`result.outstanding`, MarrowDxEngine.js). The rules stay the single
   source of truth about what a diagnosis needs, and this file only says what
   test answers a criterion — which is a fact about laboratory practice, not
   about the classification, and is the same for every entity that asks it.

   THE MAPPING IS BY LABEL TEXT, which is a heuristic and is the right one here.
   The predicate is a closure and cannot be inspected; the label is the rule
   author's own statement of what the criterion asks. dxNeedsGenetics() has
   matched labels the same way since the engine was written, and the failure mode
   is benign in a way its is not: a criterion this table cannot place is still
   printed, just without an action beside it.

   ---------------------------------------------------------------------------
   THE THRESHOLD IS RELATIVE TO THE LEADER, AND IT HAS TO BE

   "Top differentials that meet a threshold" cannot be an absolute score, and
   the panel already learned this the expensive way: `dxCommentResults()` used to
   filter on `score > 0` and that test had to be removed, because a total has no
   fixed zero. A prevalence prior is negative for a rare entity and a
   contradicted soft criterion subtracts, so a candidate with real evidence for
   it can net below zero — and aplastic anemia, prior −1, would be filtered off
   its own worked example.

   What IS meaningful is the distance to the leader, in the units the point
   ladder already defines. DX_DIFFERENTIAL_MARGIN is 4 because +4 is the
   ladder's "a defining criterion of this entity that another entity can also
   show": a candidate within one such criterion of the leader is one finding away
   from changing the answer, and that is exactly the set worth working up.
   ========================================================================= */

const DX_DIFFERENTIAL_MARGIN = 4;

/* A ceiling, so a flat case gives a differential rather than a catalogue. Five
   is what fits a screen without paging, which is the whole point of the view. */
const DX_DIFFERENTIAL_MAX = 5;


/* ----------------------------------------------------------------------------
   The criterion -> action vocabulary

   ORDER IS PRECEDENCE: the first pattern to match wins, so the specific ones
   come first. Two orderings are load-bearing rather than tidy:

     BCR::ABL1 before the general mutation pattern, since it is a fusion
     answered by a different test from the NGS panel every other gene goes to.

     The DYSPLASIA pattern before the lineage patterns. "Granulocytic or
     megakaryocytic dysplasia is present" contains two lineage words and is a
     question about dysplasia, not about how many cells of that lineage there
     are — matching it to the aspirate-representation step would send the reader
     to count the wrong thing.

   The actions are deliberately short imperatives with the SPECIMEN in them. A
   step that says "cytogenetics" and not "on the aspirate, in heparin-free
   medium" is still a step; one that says "assess dysplasia" without saying where
   is an instruction to do something the reader is already doing.
-------------------------------------------------------------------------- */

const DX_STEP_ACTIONS = [
    /* A CYTOLOGY QUESTION, ANSWERED AT THE SCOPE AND NOT BY A STUDY — so it is
       kept off the flow-cytometry entry below, which would send a reader to
       order a test for something they can settle by picking the slide back up.
       Narrow on purpose: `population` alone would also catch "at least one
       feature suggesting a neoplastic population", which is architecture and
       immunostains rather than cytology. */
    { pattern: /polymorphous|reactive-appearing/i,
      action: 'Review the aspirate and blood smear lymphocyte cytology' },

    /* THE LYMPHOID ENTRIES COME FIRST, and two of them have to. "A neoplastic
       B-cell population has been identified on immunostains" contains
       "identified" and would otherwise fall through to the clinical-history
       entry at the bottom; "an atypical lymphoid population is described on the
       smear" contains nothing any myeloid pattern matches and would reach no
       action at all. Both are answered by one study, and it is the study this
       whole family is waiting on. */
    { pattern: /lymphoid|lymphocyt|B-cell|B cells|T-cell|paratrabecular|aggregates|CD20|CD5|cyclin D1|TdT|CD30|immunophenotyp|flow cytometry|immunohistochem/i,
      action: 'Flow cytometry on a fresh aspirate, with immunohistochemistry on the core; ' +
        'immunoglobulin or T-cell receptor gene rearrangement studies where the phenotype is equivocal' },

    { pattern: /BCR::ABL1/i,
      action: 'BCR::ABL1 by RT-PCR or FISH' },

    { pattern: /driver mutation|JAK2|CALR|MPL\b|CSF3R/i,
      action: 'Driver mutation testing — JAK2 V617F first, then CALR and MPL' },

    /* The karyotype pattern is wide on purpose: every named abnormality in the
       vocabulary reaches the engine off one study. `::` is in it because the
       AML rules build their gate labels from ancAbnVocabulary at load time
       ("t(15;17) PML::RARA", "KMT2A rearrangement"), so the label this table
       sees is a laboratory's own wording rather than a criterion written here —
       and a fusion is a fusion whatever the coordinates in front of it. */
    { pattern: /karyotype|cytogenetic|abnormalit|del\(|t\(\d|inv\(|monosomy|trisomy|complex|[57]q|17p|rearrangement|fusion|::/i,
      action: 'Conventional karyotype, with FISH where it fails or is inadequate' },

    /* `the clone` and `VAF` are here rather than in the plasma cell entry below
       because both belong to the CHIP/CCUS threshold criteria, which a
       sequencing report answers. "Clonal plasma cell" is a different word and
       reaches its own entry. */
    { pattern: /mutation|somatic|clonal marker|the clone|\bVAF\b|variant|SF3B1|TP53|NPM1|CEBPA|FLT3|RUNX1|ASXL1|UBA1|PIGA|spliceosome|myelodysplasia-related|driver gene/i,
      action: 'Targeted myeloid NGS panel' },

    { pattern: /blast/i,
      action: 'Count a 500-cell aspirate and 200-cell blood differential; CD34 immunostain where the aspirate is inadequate' },

    { pattern: /reticulin|fibrosis|MF-\d/i,
      action: 'Reticulin stain on the core, graded on Table 2.03' },

    { pattern: /ring sideroblast/i,
      action: 'Iron stain on the aspirate, counting ring sideroblasts as a percentage of erythroid precursors' },

    /* `dysgranulopoiesis` is the one criterion in the table that says dysplasia
       without using the word, and it is an `excludes` on an AML rule — so
       without it here that clause printed with no action beside it. */
    { pattern: /dysplas|dysgranulopoiesis|dyserythropoiesis|dysmegakaryopoiesis/i,
      action: 'Assess at least 200 cells per lineage on the aspirate against the 10% threshold' },

    { pattern: /cellularity|hypocellular|hypercellular/i,
      action: 'Cellularity for age on an adequate trephine core' },

    /* ET's "bone marrow examined (ET has no marrow waiver)" — the one criterion
       that asks for the specimen itself rather than for a finding on it. */
    { pattern: /bone marrow examined|marrow biopsy|trephine/i,
      action: 'Trephine core biopsy — this entity has no marrow waiver' },

    { pattern: /megakaryocyt/i,
      action: 'Megakaryocyte number and morphology on the core' },

    { pattern: /erythroid|granulocytic|maturation|precursors|M:E/i,
      action: 'Lineage representation on the aspirate differential' },

    { pattern: /monocyt/i,
      action: 'Absolute and relative monocyte count on the blood differential' },

    { pattern: /plasma cell|light-chain|restriction|kappa|lambda/i,
      action: 'CD138 with kappa and lambda in situ hybridization; serum protein studies' },

    { pattern: /erythropoietin|\bEPO\b/i,
      action: 'Serum erythropoietin' },

    { pattern: /lactate dehydrogenase|\bLDH\b/i,
      action: 'Serum LDH' },

    { pattern: /splenomegaly|spleen/i,
      action: 'Spleen size on examination or imaging' },

    { pattern: /eosinophil/i,
      action: 'Blood eosinophil count' },

    /* Before the CBC entry, which would otherwise catch these on the word
       "anemia" and send the reader to repeat a count they already have. What is
       missing on a case like this is the red cell size, not the blood count. */
    { pattern: /normocytic|macrocytic|microcytic|\bMCV\b|red cell size/i,
      action: 'Red cell indices — the MCV against the reporting range' },

    /* Both spellings of leucocytosis: the criteria were transcribed from WHO and
       ICC, which spell it differently from each other, and CNL's threshold
       criterion was reaching no action because this pattern had only the one. */
    { pattern: /cytopenia|an[ae]mia|neutropenia|thrombocytopenia|thrombocytosis|erythrocytosis|h[ae]moglobin|platelet|white cell|leu[ck]ocytosis|leu[ck]ocytes|neutrophil/i,
      action: 'CBC with differential' },

    { pattern: /history|therapy|antecedent|prior|documented/i,
      action: 'Clinical history — prior cytotoxic therapy, an antecedent hematologic disorder, drugs and exposures' }
];

/* The action that would answer a criterion, or null where this table has no
   opinion. Null is a real answer and is rendered as such — a composite criterion
   ("at least one minor criterion") is not one test, and inventing a step for it
   would be worse than printing the criterion on its own. */
function dxStepAction(label) {
    for (let i = 0; i < DX_STEP_ACTIONS.length; i++) {
        if (DX_STEP_ACTIONS[i].pattern.test(label)) return DX_STEP_ACTIONS[i].action;
    }
    return null;
}

/* Outstanding criteria grouped by the ONE study that answers them, in the order
   the criteria appear on the rule. Grouping is the point of the view rather than
   a formatting choice: three genetic criteria on one candidate are one karyotype,
   and a to-do list that says "order a karyotype" three times is a list nobody
   reads to the end.

   `kinds` are kept per item so the caller can say what each answer buys, and
   `settles` is true for the group as a whole when any member is a gate — a study
   that can close a criterion outranks one that can only move the score. */
function dxStepGroups(items) {
    const groups = [];
    const byAction = {};
    items.forEach(function (item) {
        const action = dxStepAction(item.label);
        /* An unmapped criterion gets a group to itself, keyed on its own text
           under a prefix no action can collide with — an action IS the key for
           everything else, so a bare label could in principle equal one. */
        const key = action || ('criterion:' + item.label);
        if (!byAction[key]) {
            byAction[key] = { action: action, items: [], settles: false };
            groups.push(byAction[key]);
        }
        byAction[key].items.push(item);
        if (item.kind !== 'expects') byAction[key].settles = true;
    });
    return groups;
}


/* ----------------------------------------------------------------------------
   The candidate set
-------------------------------------------------------------------------- */

/* THE TOP DIFFERENTIALS OF ONE AXIS: live candidates within one defining
   criterion of THAT AXIS'S leader. `dxRankScore` and not `score`, so the set and
   the ORDER come from the same number — filtering on the raw total while sorting
   on the ranked one would let a confirmed candidate sort above a card that the
   filter had removed.

   THE THRESHOLD IS PER AXIS, and it has to be. The margin means "within one
   defining criterion of the best answer to this question", and the two axes are
   two questions (see dxAxis in MarrowDxKernel.js) — so a strong myeloid leader
   measured against a lymphoid candidate is not a comparison at all. Against one
   global leader a marrow with a confident myelodysplastic candidate at 12 would
   silently drop every lymphoid candidate it had, including "involvement by a
   lymphoid neoplasm" on a marrow that is involved. */
function dxAxisResults(results, axis) {
    const live = results.filter(function (r) {
        return dxAxis(r.rule) === axis && r.bucket !== 'excluded' && r.bucket !== 'unassessed';
    });
    if (!live.length) return [];
    const top = dxRankScore(live[0]);
    return live.filter(function (r) {
        return dxRankScore(r) >= top - DX_DIFFERENTIAL_MARGIN;
    }).slice(0, DX_DIFFERENTIAL_MAX);
}

/* Every axis that has a live candidate, in the order the rule table declares
   them — so the myeloid block leads on a myeloid case and the lymphoid block
   leads when the lymphoid rules are the only ones with anything for them. */
function dxLiveAxes(results) {
    const seen = [];
    results.forEach(function (r) {
        const axis = dxAxis(r.rule);
        if (r.bucket === 'excluded' || r.bucket === 'unassessed') return;
        if (seen.indexOf(axis) === -1) seen.push(axis);
    });
    return seen;
}

/* The whole differential, both axes flattened — what the panel's other readers
   want when they do not care which question a candidate answers. */
function dxDifferentialResults() {
    return dxLiveAxes(dxResults).reduce(function (all, axis) {
        return all.concat(dxAxisResults(dxResults, axis));
    }, []);
}


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

/* THE COMPACT TALLY BOTH CARD TYPES CARRY, and it lives here rather than in the
   panel only because this file loads first — the Comments card calls it too.

   THE PREVALENCE BASELINE WAS PRINTING AS AN ARGUMENT AGAINST THE DIAGNOSIS, and
   on a rare entity it is the most conspicuous line on the card: aplastic anemia
   read "Against: uncommon overall, and much the commonest of the marrow failure
   states" — a sentence half of which argues FOR it, under a heading saying the
   opposite. The workup bonus is the mirror of it, appearing under "Because" as
   though the request form were evidence about the marrow.

   Both lines read CASE evidence only, which is the distinction dxPoint has drawn
   since it was written ('case' | 'context' | 'prior', and only the first is
   evidence). The prior and the workup bonus are still in the total and still
   itemised in the Scoring view, where an itemised tally is what the reader came
   for. */
function dxCaseEvidence(result, test) {
    return result.evidence.filter(function (e) {
        return e.kind === 'case' && test(e.points);
    }).map(function (e) { return e.text; }).join('; ');
}

/* ONE COLUMN OF A ROW: a list, or an em dash. The dash matters — an empty cell in
   a table reads as a rendering fault, where "—" is the answer "none". Same
   convention the Scoring summary uses for a finding nobody recorded. */
function dxCellHTML(items) {
    if (!items.length) return '<span class="dxCellEmpty">—</span>';
    return '<ul>' + items.map(function (i) {
        return `<li${i.soft ? ' class="dxSoft"' : ''}>${i.text}</li>`;
    }).join('') + '</ul>';
}

/* WHAT THE CASE HAS ALREADY ANSWERED, in the classification's own words: the
   gates met, then the soft criteria met, then — muted — the soft criteria the
   case CONTRADICTS.

   The not-met line lives in this column rather than in "Still needed", and the
   distinction is the one the whole column set rests on: this column is about
   criteria that have an ANSWER, the next about criteria that do not. A
   contradicted criterion has been answered, in the wrong direction, and no
   further study will change it — putting it under "needed" would send a reader
   to order something that cannot help. */
function dxMetCellHTML(result) {
    const items = result.met.map(function (t) { return { text: t }; })
        .concat((result.expected || []).map(function (t) { return { text: t, soft: true }; }))
        .concat((result.lacking || []).map(function (t) {
            return { text: 'not met: ' + t, soft: true };
        }));
    return dxCellHTML(items);
}

/* WHAT IS STILL OPEN, IN THREE GROUPS, and the grouping is the whole difference
   between a column and a wall.

   THE EXCLUSIONS ARE UNDER ONE HEADING RATHER THAN SIX SUFFIXES. MDS-SF3B1 has
   two unanswered `requires` and six unanswered `excludes`, and with the
   qualifier repeated per item the cell read as eight bullets of which six ended
   "— rules it out if present" — the same six words down the column, drowning the
   two lines that say what the diagnosis actually needs. The heading says it once
   and the items stay short.

   The soft criteria come last and muted, because a rule can carry a dozen and
   none of them can change whether the candidate is eligible; capped at three, so
   the criteria that decide the answer are never buried under the ones that only
   nudge the rank. */
function dxNeededCellHTML(result) {
    const outstanding = result.outstanding || [];
    const pick = function (test) {
        return outstanding.filter(test).map(function (o) { return { text: o.label }; });
    };
    const needed = pick(function (o) { return o.kind === 'requires'; });
    const rulesOut = pick(function (o) { return o.kind === 'excludes'; });
    const soft = outstanding.filter(function (o) { return o.kind === 'expects'; })
        .slice(0, 3)
        .map(function (o) { return { text: o.label, soft: true }; });

    if (!needed.length && !rulesOut.length && !soft.length) return dxCellHTML([]);

    let html = needed.length ? dxCellHTML(needed) : '';
    if (rulesOut.length) {
        html += '<div class="dxCellSubLabel">Rules it out if present</div>' + dxCellHTML(rulesOut);
    }
    if (soft.length) html += dxCellHTML(soft);
    return html;
}

/* THE STUDIES, AND ONLY THE STUDIES. In the card layout each action had to carry
   the criteria it answered, because there was nowhere else for them; in a table
   the previous column IS that, so this one is a to-do list and nothing else —
   which is what makes it scannable down the column, the thing a table buys that
   a stack of cards does not.

   An action reached only through soft criteria is muted, so a study that can
   settle the question never reads the same as one that cannot. */
function dxWorkupCellHTML(result, f) {
    const outstanding = result.outstanding || [];
    const items = [];
    const seen = {};
    const push = function (action, soft) {
        if (!action || seen[action]) return;
        seen[action] = true;
        items.push({ text: action, soft: soft });
    };

    /* THE RULE'S OWN DECLARATION FIRST. `definedBy` names the finding that
       defines the entity and the study that finds it; usually that study is
       already reached through one of the gates (MDS-SF3B1 gates on the SF3B1
       mutation this table maps to the NGS panel), and `seen` collapses the two.
       It is pushed first anyway so that on the rules where it is NOT among the
       gates the study still appears. */
    const d = result.rule.definedBy;
    if (d && !dxDefiningConfirmed(result.rule, f)) push(dxStepAction(d.phrase), false);

    dxStepGroups(outstanding.filter(function (o) { return o.kind !== 'expects'; }))
        .forEach(function (g) { push(g.action, false); });
    dxStepGroups(outstanding.filter(function (o) { return o.kind === 'expects'; }))
        .forEach(function (g) { push(g.action, true); });

    /* NOTHING OUTSTANDING IS A RESULT and has to be said, not left as a dash: on
       a `supported` candidate the absence of a next step IS the finding. */
    if (!items.length && !outstanding.length) {
        return '<span class="dxCellNone">Nothing outstanding — every criterion this rule ' +
            'states has been answered.</span>';
    }
    return dxCellHTML(items);
}

/* THE NAME CELL: what it is, how it ranked, and the two things you can do with
   it. The conditional note is `definedBy` read for what dxConfirmationPrefix
   reads it for — the comment's mood — and it belongs beside the NAME rather than
   in the workup column, because it is a statement about what may be asserted
   rather than a study to order. */
function dxNameCellHTML(result, f, index) {
    const d = result.rule.definedBy;
    const conditional = d && !dxDefiningConfirmed(result.rule, f)
        ? `<span class="dxRowNote">Conditional until ${d.study} studies demonstrate ${d.phrase}.</span>`
        : '';
    const icc = result.icc && result.icc !== result.who
        ? `<span class="dxRowIcc">ICC 2022: ${result.icc}</span>` : '';

    return `<span class="dxName">${result.who}</span>${icc}` +
        `<span class="dxRowMeta">${result.bucket} · ${result.score}</span>${conditional}` +
        `<span class="dxRowActions">` +
        `<button type="button" class="dxUse" data-index="${index}">Use this comment</button>` +
        `${refRuleLinkHTML(result.rule)}</span>`;
}

/* What each axis's block is called. Only ever shown when BOTH are live — on a
   single-axis case the heading would be labelling the only thing on screen. */
const DX_AXIS_LABELS = {
    myeloid: 'Myeloid',
    lymphoid: 'Lymphoid'
};

/* THE NEXT CANDIDATE DOWN, NAMED WITH ITS GAP, whenever the margin returned a
   single row for this axis. A differential with one entry is a verdict, and the
   reader is owed the distance to whatever is behind it — that number is the
   whole reason the one-row case is not a confident one.

   Per axis, like the threshold: the candidate behind the lymphoid leader is
   another lymphoid candidate, and comparing it against the best myeloid one
   would print a gap between two answers to different questions. */
function dxRunnerUpHTML(results, axis, top) {
    const live = results.filter(function (r) {
        return dxAxis(r.rule) === axis && r.bucket !== 'excluded' && r.bucket !== 'unassessed';
    });
    if (top.length !== 1 || live.length < 2) return '';
    const gap = dxRankScore(live[0]) - dxRankScore(live[1]);
    return `<div class="dxNote">Next: ${dxDiagnosisLine(live[1])}, ${gap} point` +
        `${gap === 1 ? '' : 's'} behind.</div>`;
}

function dxDifferentialRowHTML(result, f, index) {
    return `<tr class="dxRow dxRow--${result.bucket}">
        <td>${dxNameCellHTML(result, f, index)}</td>
        <td>${dxMetCellHTML(result)}</td>
        <td>${dxNeededCellHTML(result)}</td>
        <td>${dxWorkupCellHTML(result, f)}</td>
    </tr>`;
}

function dxDifferentialHTML(f) {
    const live = dxResults.filter(function (r) {
        return r.bucket !== 'excluded' && r.bucket !== 'unassessed';
    });
    if (!live.length) {
        return '<div class="dxNote">No candidate has anything for it yet. Enter more of the case, ' +
            'or open Scoring to see what each one is missing.</div>';
    }

    /* ONE TABLE PER AXIS, and the heading only where there is more than one.
       A marrow can be a myelodysplastic neoplasm AND carry a lymphoid
       infiltrate, so the two sets are not one ranked list — see dxAxis. On the
       ordinary case there is a single axis live and the view looks exactly as it
       did before the lymphoid rules existed: no heading, one table. */
    const axes = dxLiveAxes(dxResults);
    const table = axes.map(function (axis) {
        const top = dxAxisResults(dxResults, axis);
        if (!top.length) return '';
        const rows = top.map(function (r) {
            return dxDifferentialRowHTML(r, f, dxResults.indexOf(r));
        }).join('');
        /* FIXED COLUMN WIDTHS, because the content cannot set them. Three of the
           four cells are lists of clinical prose of wildly unequal length — one
           candidate has a single met criterion and another has six — so an
           auto-laid-out table would give every case a different set of column
           widths and the reader would lose the one thing a table is for, which
           is that the same thing is always in the same place. The name column is
           widest: it carries two names, the bucket, the conditional note and the
           buttons. */
        return (axes.length > 1
            ? `<div class="dxAxisLabel">${DX_AXIS_LABELS[axis] || axis}</div>` : '') +
            `<table class="dxTable">
                <colgroup><col style="width:29%"><col style="width:21%"><col style="width:25%"><col style="width:25%"></colgroup>
                <thead><tr><th>Differential</th><th>Criteria met</th><th>Still needed</th><th>Further workup</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>` + dxRunnerUpHTML(dxResults, axis, top);
    }).join('');

    /* *** THE THREE META LINES ARE GONE, AT THE AUTHOR'S ASK, AND THE ARGUMENT
       THAT PUT THEM THERE IS RECORDED RATHER THAN DELETED. ***

       They were: the threshold note above the table ("the candidates within 4
       points of the leader … 1 of 1 live candidate"), the grey legend under it,
       and dxHiddenNote()'s tally of what was filtered out ("2 ruled out, 38 not
       yet assessed"). Three lines of chrome around a table of five rows, two of
       which said something about the view rather than about the case.

       The case for keeping them was auditability — a cut-off that truncates what
       a reader is looking at and does not say so is the least auditable thing in
       a tool whose position is that a score whose reasoning cannot be read is not
       usable. That argument still holds, and what answers it is that NONE of the
       three was the only copy: the margin and the cap are stated in this file's
       header and in docs/diagnosis.md, the grey is explained in the same places,
       and the ruled-out and unassessed candidates are all listed, individually
       and with their reasons, one click away in Scoring — which is where a reader
       auditing the set is going anyway. The Comments view keeps dxHiddenNote()
       for the same reason it always had it: it pages, so what is off screen there
       is genuinely invisible.

       KEEP THE RUNNER-UP LINE. It is the one of the four that is about the CASE
       rather than about the view: a differential with a single entry is a verdict,
       and the distance to whatever is behind it is the number that says how
       confident a verdict it is. It is now dxRunnerUpHTML, and it is per axis for
       the reason the threshold is — the candidate behind the lymphoid leader is
       another lymphoid candidate, never the best myeloid one. */
    return table;
}
