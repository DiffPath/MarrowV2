/* ============================================================================
   MarrowDxPanel.js — the Diagnosis panel: render, views, comment box

   Split out of the single MarrowDx.js; see MarrowDxKernel.js for the file
   header, the point ladder and the three-valued contract every rule here
   depends on. Must load after MarrowDxEngine.js.
   ========================================================================= */

/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

const dxModes = [
    { label: 'Final diagnosis', value: 'final' },
    { label: 'Addendum', value: 'addendum' }
];

/* Read by radio name, like currentTemplateType() and laterality — a radio group
   always has one checked, so the `|| 'final'` fallback is only for before the
   panel exists. */
function dxMode() {
    return document.querySelector('input[name="dxMode"]:checked')?.value || 'final';
}

/* The driver, named with the variant detail the rules actually use — a bare "JAK2"
   would hide the V617F/exon-12 split and the CALR type, both of which are scoring
   inputs. Triple negative is said explicitly, because "none" and "not tested" are
   the two things this row exists to keep apart. */
function dxDriverText(f) {
    const d = f.drivers;
    const named = [];
    if (d.jak2 === true) {
        named.push('JAK2' + (d.jak2V617F === true ? ' V617F' : (d.jak2NonV617F === true ? ' (non-V617F)' : '')) +
            (d.jak2Vaf !== null ? ` ${d.jak2Vaf}%` : ''));
    }
    if (d.calr === true) {
        named.push('CALR' + (d.calrType1 === true ? ' type 1' : (d.calrType2 === true ? ' type 2' : '')));
    }
    if (d.mpl === true) named.push('MPL' + (d.mplW515 === true ? ' W515' : ''));
    if (d.csf3r === true) named.push('CSF3R' + (d.csf3rT618I === true ? ' T618I' : ''));
    if (named.length) return named.join(', ');
    return d.tripleNegative === true ? 'triple negative' : '—';
}

function dxPairText(a, aUnit, b, bUnit) {
    const one = function (v, unit) { return v === null ? '—' : v + (unit ? ' ' + unit : ''); };
    if (a === null && b === null) return '—';
    return one(a, aUnit) + ' / ' + one(b, bUnit);
}

/* Which megakaryocyte pattern was described, if either. Both can be true — a
   marrow may show staghorn nuclei AND dense clustering — and saying so is the
   honest readout of the case dxUnresolvedPair() exists for. */
function dxMegText(f) {
    const m = f.megakaryocytes;
    if (!m.assessed) return 'not assessed';
    const patterns = [];
    if (m.pmfLike === true) patterns.push('PMF pattern');
    if (m.etLike === true) patterns.push('ET pattern');
    return patterns.length ? patterns.join(' + ') : 'no MPN pattern named';
}

function dxSummaryHTML(f) {
    const say = function (v, yes, no) { return v === null ? '—' : (v ? yes : no); };
    const rows = [
        ['Workup', f.templateType],
        /* The percentages are BLASTS AND BLAST EQUIVALENTS wherever the
           promonocyte keys were used, which is what every criterion reading them
           asks for — so the audit view has to say which of the two number it is
           showing, exactly as it says when the number came from CD34. */
        ['Blasts (marrow)', f.blasts.marrow === null ? 'not counted'
            : `${f.blasts.marrow.toFixed(1)}%${f.blasts.marrowBasis !== 'counted' ? ' (by CD34)' : ''}` +
              (f.blasts.equivalentsCounted ? ' (incl. promonocytes)' : '')],
        ['Blasts (blood)', f.blasts.blood === null ? 'not counted'
            : `${f.blasts.blood.toFixed(1)}%` +
              (f.blasts.equivalentsCounted ? ' (incl. promonocytes)' : '')],
        /* NAMED, not counted. The count alone cannot be audited: with the unified
           thresholds now deciding this from the pasted numbers, "1" leaves the
           reader unable to tell which lineage the engine thought was low — and a
           hemoglobin straddling the two sex-specific cutoffs with no sex recorded
           reads as unknown, which is a different thing from normal. */
        ['Cytopenias', (function () {
            if (f.cytopenia.count === null) return 'not assessed';
            const named = [];
            if (f.cytopenia.anemia) named.push('anemia');
            if (f.cytopenia.neutropenia) named.push('neutropenia');
            if (f.cytopenia.thrombocytopenia) named.push('thrombocytopenia');
            return named.length ? named.join(', ') : 'none';
        })()],
        ['Dysplastic lineages', f.dysplasia.count === null ? 'not assessed'
            : `${f.dysplasia.count} of ${f.dysplasia.assessed} assessed`],
        ['Cellularity', f.cellularity.pct === null ? '—' : `${f.cellularity.pct}%`],
        ['Fibrosis', f.fibrosis.grade ? `MF-${f.fibrosis.grade[0]}${f.fibrosis.grade[1] !== f.fibrosis.grade[0] ? '–' + f.fibrosis.grade[1] : ''}` : '—'],
        ['Ring sideroblasts', f.ringSideroblasts.state || '—'],
        ['Karyotype', f.genetics.karyotypeStatus || 'not recorded'],
        ['NGS', f.genetics.ngsStatus || 'not recorded'],
        ['Somatic variants', say(f.genetics.anySomatic, String(f.genetics.variants.length), 'none')],
        /* The clone as the boundary rules read it: which genes, how big, and
           whether it clears CHIP's threshold. `—` for the size is the common case
           and an honest one — the VAF column is optional, and the audit view has to
           show that the engine had no number rather than imply a small clone. */
        ['Clone', f.genetics.somaticGenes.length
            ? f.genetics.somaticGenes.join(', ') +
              (f.genetics.maxVaf === null ? '' : ` (VAF ${dxPct(f.genetics.maxVaf)}%)`) +
              (f.genetics.chClone === false ? ' — below threshold' : '')
            : '—'],
        /* WHAT TABLE 2.02 SAID, gene by gene — the audit row that matters most,
           because this is the one place the engine reads a free-text change string
           and reaches a verdict. `unreadable` is listed on purpose: a change the
           parser could not place must be visible as such, never folded in with the
           ones that failed the criteria. `exon` names the criterion the app waived
           because a variant string carries no exon number. */
        ['CH driver genes', (function () {
            const d = f.genetics.chDrivers;
            if (d.present === null) return '—';
            if (d.present === false) {
                return d.unlisted.length ? 'none listed (' + d.unlisted.join(', ') + ')' : 'none';
            }
            const bits = [];
            if (d.qualifying.length) bits.push('meets criteria: ' + d.qualifying.join(', '));
            if (d.outside.length) bits.push('outside regions: ' + d.outside.join(', '));
            if (d.unreadable.length) bits.push('change unread: ' + d.unreadable.join(', '));
            if (d.unlisted.length) bits.push('not listed: ' + d.unlisted.join(', '));
            if (d.exonUnverified.length) bits.push('exon unverified: ' + d.exonUnverified.join(', '));
            return bits.join(' | ');
        })()],
        ['MDS-related mutation', f.genetics.mrICC.present === true ? f.genetics.mrICC.genes.join(', ')
            : say(f.genetics.mrICC.present, 'yes', 'none')],

        /* The acute leukemia half. Shown unconditionally for the same reason the
           myeloproliferative rows are: a row that appeared and disappeared with
           the workup would make an absent finding indistinguishable from a hidden
           one, and this view exists to say what the engine read. */
        ['Abnormalities', f.genetics.abnormalities.length
            ? f.genetics.abnormalities.map(function (k) { return ancAbnVocabulary[k].label; }).join(', ')
            : (f.genetics.karyotypeStatus === 'resulted' ? 'none' : '—')],
        ['AML-defining', f.genetics.amlDefining.present === true
            ? f.genetics.amlDefining.keys.map(function (k) { return ancAbnVocabulary[k].label; }).join(', ')
            : say(f.genetics.amlDefining.present, 'yes', 'none')],
        ['MR cytogenetics', 'WHO ' + (f.genetics.mrCytoWHO.keys.join(', ') || '—') +
            ' / ICC ' + (f.genetics.mrCytoICC.keys.join(', ') || '—')],
        ['NPM1 / CEBPA', dxPairText(say(f.genetics.npm1, 'mutated', 'no'), '',
            say(f.genetics.cebpa, 'mutated', 'no'), '')],
        ['FLT3-ITD', say(f.genetics.flt3Itd, 'present', 'not detected')],
        ['TP53', f.genetics.tp53 === true
            ? 'mutated' + (f.genetics.tp53Vaf !== null ? ` (VAF ${f.genetics.tp53Vaf}%)` : '') +
              (f.genetics.tp53MultiHit === true ? ', multi-hit' : '')
            : say(f.genetics.tp53, 'mutated', 'no')],
        ['Prior therapy', say(f.history.priorTherapy, 'yes', 'no')],
        ['Antecedent', f.history.antecedent || '—'],

        /* The myeloproliferative half. Shown unconditionally rather than only on an
           MPN workup: the audit view's job is to say what the engine read, and a
           row that appears and disappears with the template type would make an
           absent finding indistinguishable from a hidden one. */
        ['MPN driver', dxDriverText(f)],
        ['BCR::ABL1', say(f.drivers.bcrAbl, 'detected', 'not detected')],
        ['Hb / Hct', dxPairText(f.counts.hgb, 'g/dL', f.counts.hct, '%')],
        ['WBC / Plt', dxPairText(f.counts.wbc, '', f.counts.plt, '')],
        ['Erythrocytosis', say(f.counts.erythrocytosis, 'yes', 'no')],
        /* THE MONOCYTES, both specimens, and the CMML criterion read off them.
           Both numbers are shown rather than the verdict alone: the criterion is a
           pair of thresholds, and a case failing on the percentage while passing on
           the absolute count is the one the reader most needs to see. */
        ['Monocytes (blood)', (function () {
            const c = f.counts;
            if (c.monocyteAbs === null && c.monocytePct === null) return '—';
            return dxPairText(c.monocyteAbs, '× 10⁹/L', c.monocytePct, '%') +
                (c.monocytosis === true
                    ? ' — meets CMML threshold' + (c.monocytosisNeedsClonality === true
                        ? ', clonality required' : '')
                    : (c.monocytosis === false ? ' — below CMML threshold' : ''));
        })()],
        ['Monocytes (marrow)', f.marrowMonocytes.pct === null ? 'not counted'
            : `${dxPct(f.marrowMonocytes.pct)}%` +
              (f.marrowMonocytes.increased === true ? ' — increased' : '')],
        ['Megakaryocytes', dxMegText(f)],
        ['Leukoerythroblastosis', say(f.leukoerythroblastosis, 'yes', 'no')],
        ['Splenomegaly', say(f.clinical.splenomegaly, 'palpable', 'absent')],
        ['LDH', say(f.clinical.ldhElevated, 'elevated', 'normal')],
        ['Serum EPO', say(f.clinical.epoSubnormal, 'subnormal', 'not subnormal')],
        ['Sex', f.clinical.sex || '—']
    ];
    return `<div class="dxSummary">${rows.map(function (r) {
        return `<span class="dxSummaryKey">${r[0]}</span><span class="dxSummaryValue">${r[1]}</span>`;
    }).join('')}</div>`;
}

/* A SIGNED POINT VALUE. U+2212 for the minus, matching the ≥ and × the rest of the
   app prints, and never a '+' concatenated in front of a number that carries its
   own sign — which is what produced "+-2". */
function dxSign(n) {
    return (n < 0 ? '−' : '+') + Math.abs(n);
}

/* THE COMMENTS VIEW — one candidate, the comment it would produce, and a button.
   This is the default and the working surface: you read the comment prose itself
   (not just the classification), page to the next candidate, and accept the one
   you want. The compact tally lives here; the full one is the Scoring view's job. */
/* EVIDENCE AGAINST GETS ITS OWN LINE, and this was a real defect rather than a
   nicety: the single "Because" line joined every evidence text with no sign, so a
   clause worth −2 read as though it supported the diagnosis. Worse than the
   "+-2" it sat beside, because it was grammatical — nothing on screen said the
   reader was looking at an argument the other way. Essential thrombocythemia
   carries four −2 clauses, so the line was already wrong on the ET versus
   prefibrotic PMF comparison, which is the most consequential one in the table. */
function dxCommentCardHTML(result, f, mode, index) {
    const prose = dxComment(result, f, mode);
    const texts = function (test) {
        return result.evidence.filter(function (e) { return test(e.points); })
            .map(function (e) { return e.text; }).join('; ');
    };
    const because = texts(function (p) { return p > 0; });
    const against = texts(function (p) { return p < 0; });
    const line = function (label, text, cls) {
        return text ? `<div class="dxWhy ${cls || ''}"><span class="dxWhyLabel">${label}</span> ${text}</div>` : '';
    };
    return `<div class="dxCard dxCard--${result.bucket}">
        <div class="dxCardHead">
            <span class="dxName">${dxDiagnosisLine(result)}</span>
            <span class="dxScore">${result.score}</span>
        </div>
        <div class="dxCommentPreview">${prose}</div>
        ${line('Because', because)}
        ${line('Against', against, 'dxWhy--failed')}
        <button type="button" class="dxUse" data-index="${index}">Use this comment</button>${refRuleLinkHTML(result.rule)}
    </div>`;
}

/* THE SCORING VIEW — every candidate and how its number was reached, for
   checking the criteria. Shows the gate result (met / unknown / against) and each
   support point that fired, so the total is auditable rather than asserted. Not
   paginated: this is a debugging surface you scan, not a working one you page. */
function dxScoreCardHTML(result) {
    const block = function (label, items, cls) {
        if (!items.length) return '';
        return `<div class="dxWhy ${cls || ''}"><span class="dxWhyLabel">${label}</span><ul>` +
            items.map(function (i) { return `<li>${i}</li>`; }).join('') + `</ul></div>`;
    };
    const points = result.evidence.map(function (e) {
        return `${e.text} <span class="dxPoints${e.points < 0 ? ' dxPoints--against' : ''}">` +
            `${dxSign(e.points)}</span>`;
    });
    /* A registry hit that lost — to a rule's own clause on the same key, or to a
       stronger member of its threshold ladder. Shown rather than dropped: a
       reader auditing a total needs to see that a finding WAS considered and why
       it is not in the sum, or the number looks short by two and nothing on the
       card accounts for it. */
    const suppressed = (result.suppressed || []).map(function (e) {
        return `${e.text} <span class="dxPoints">${dxSign(e.points)}</span> — superseded`;
    });

    /* THE SCORING VIEW GETS THE LINK TOO, and this is the view it matters most
       on: "Ruled out by" and "Contradicted" are exactly the lines a reader
       disputes, and disputing them means reading the criteria box the clause was
       written from. On the comments card it sits beside the Use button; here
       there is no button, so it goes at the foot on its own. */
    const ref = refRuleLinkHTML(result.rule);

    return `<div class="dxCard dxCard--${result.bucket}">
        <div class="dxCardHead">
            <span class="dxName">${dxDiagnosisLine(result)}</span>
            <span class="dxScore">${result.bucket} · ${result.score}</span>
        </div>
        ${block('Met', result.met)}
        ${block('Points', points)}
        ${block('Unknown', result.unknown, 'dxWhy--missing')}
        ${/* Soft criteria contradicted. Deliberately a different heading from
              "Ruled out by": these cost points and print as evidence against, but
              the candidate is still in the differential, and a reader must be able
              to tell "this argues against it" from "this eliminates it". */''}
        ${block('Contradicted', result.lacking || [], 'dxWhy--failed')}
        ${block('Ruled out by', result.failed, 'dxWhy--failed')}
        ${block('Not answered', result.quiet || [], 'dxWhy--missing')}
        ${block('Superseded', suppressed)}
        ${ref ? `<div class="dxCardFoot">${ref}</div>` : ''}
    </div>`;
}

function renderDxPanel() {
    const panel = document.getElementById('diagnosisPanel');
    if (!panel) return;

    /* RADIOS, not `data-toggle` checkboxes. A mode and a view must always have
       exactly one selected — clicking the active one off would leave both pills
       blank, reading as "nothing chosen" even though the code falls back to a
       default. Radios cannot be un-picked, which is the whole reason the app uses
       them for Laterality and the template types (read by `name`, same as here).
       The `.chipGroup` segment styling works on radios unchanged. */
    const group = function (name, options, def) {
        return options.map(function (o) {
            const id = name + '_' + o.value;
            return `<input type="radio" class="chipInput" id="${id}" name="${name}" value="${o.value}"` +
                `${o.value === def ? ' checked' : ''}>` +
                `<label class="chip" for="${id}">${o.label}</label>`;
        }).join('');
    };

    /* One toolbar row: the comment register on the left, the view switcher on the
       right. No labels — "Final diagnosis/Addendum" and "Comments/Scoring" say
       what they are, and a heading over a two-word toggle is a row spent twice. */
    panel.innerHTML = `
        <div class="fieldBlock">
            <div class="dxToolbar">
                <span class="chipGroup">${group('dxMode', dxModes, 'final')}</span>
                <span class="chipGroup">${group('dxView', dxViews, 'comments')}</span>
            </div>
            <div id="dxList"></div>
        </div>`;

    refreshDx();
}

const dxViews = [
    { label: 'Comments', value: 'comments' },
    { label: 'Scoring', value: 'scoring' }
];

function dxView() { return document.querySelector('input[name="dxView"]:checked')?.value || 'comments'; }

/* Recomputed and stored together so page navigation and the Use button read the
   SAME ranking they were drawn from — re-ranking between a click and the draw
   could otherwise change what "page 2" or "index 3" points at. */
let dxResults = [];
let dxFindings = null;
/* The first candidate on screen, and the one after the last — dxPage is an
   index into dxCommentResults(), not a page number, because how many fit is
   decided by measurement and changes with the case and the window.

   `dxPageStarts` is the trail of screens gone forward through. Going back
   POPS it rather than subtracting the current screen's size: screens are not
   equal — the card count is whatever fit — so "back by however many I am
   looking at now" lands somewhere no screen ever started, which is how paging
   forward twice and back once came out at "4–4". */
let dxPage = 0;
let dxPageEnd = 0;
let dxPageStarts = [];

/* The candidates that are actually comments: not ruled out, not un-assessed.

   THE SCORE IS NOT CONSULTED, and the `> 0` test that used to be here had to go.
   It was the only absolute comparison against a total anywhere in the engine, and
   a total no longer has a fixed zero: a prevalence baseline can be negative for a
   rare entity, and a contradicted soft criterion subtracts. So a candidate with
   real evidence for it could net zero or less and disappear from the working view
   — silently, which is the exact failure this whole rework exists to end. A rare
   entity is not a non-answer.

   "Has nothing for it" is a real question and still worth asking, but it is the
   engine's to answer, not the panel's: that is what the `unassessed` bucket is,
   and it now tests positive CASE evidence rather than the total. Asking it twice,
   in two different ways, was how the two could disagree — a candidate with met
   gates and a net of zero was neither `unassessed` nor a comment, and vanished
   between them. */
function dxCommentResults() {
    return dxResults.filter(function (r) {
        return r.bucket !== 'excluded' && r.bucket !== 'unassessed';
    });
}

/* WHAT IS NOT ON SCREEN, said out loud. Candidates leaving the differential with
   no trace is the complaint this rework started from; softening the gates makes
   it rarer without ever telling the reader when it still happened. One quiet line
   under the pager, and the Scoring view has the detail. */
function dxHiddenNote() {
    const n = function (bucket) {
        return dxResults.filter(function (r) { return r.bucket === bucket; }).length;
    };
    const parts = [];
    if (n('excluded')) parts.push(n('excluded') + ' ruled out');
    if (n('unassessed')) parts.push(n('unassessed') + ' not yet assessed');
    return parts.length ? `<div class="dxNote">${parts.join(', ')} — see Scoring</div>` : '';
}

function refreshDx() {
    if (!document.getElementById('dxList')) return;
    dxFindings = marrowFindings();
    dxResults = dxRank(dxFindings);
    /* A new ranking is a new list, so the trail through the old one means
       nothing — and a stale trail is how Prev would land on a screen that no
       longer starts anywhere. dxPage itself is clamped in dxRenderView. */
    dxPageStarts = [];
    dxRenderView();
}

/* Draws the current view from the STORED ranking — no re-rank, so paging and
   switching views are cheap and cannot reorder under you. refreshDx() is the only
   thing that re-ranks. */
function dxRenderView() {
    const list = document.getElementById('dxList');
    if (!list) return;

    if (dxView() === 'scoring') {
        /* The summary lives HERE, not above the views: "what the case says" is the
           raw material the scoring is derived from, so it reads as the head of the
           audit rather than as chrome the working Comments view has to carry. */
        list.innerHTML =
            '<div class="dxScoringSummary"><div class="fieldLabel">What the case says</div>' +
            dxSummaryHTML(dxFindings) + '</div>' +
            '<div class="dxNote">Every candidate and its tally, for checking the criteria against ' +
            'WHO-HAEM5 and ICC 2022.</div>' +
            dxResults.map(dxScoreCardHTML).join('');
        return;
    }

    const comments = dxCommentResults();
    if (!comments.length) {
        /* Reworded with the filter: nothing is being hidden for scoring too low
           any more, so the old "scores above zero" would name a rule that no
           longer exists. What is left is genuinely "nothing has anything for it". */
        list.innerHTML = '<div class="dxNote">No candidate has anything for it yet. Enter more of ' +
            'the case, or open Scoring to see what each one is missing.</div>' + dxHiddenNote();
        return;
    }

    // Clamp: the list can shrink under a page index held from a previous case.
    if (dxPage >= comments.length) dxPage = comments.length - 1;
    if (dxPage < 0) dxPage = 0;

    /* AS MANY CANDIDATES AS THE PAGE HOLDS, at the author's ask — this showed
       one card at a time, which spent a screen of empty space to hide the
       differential the tab exists to present. Ranking is the point of this
       view, and a ranking of one is a verdict.

       Drawn then TRIMMED rather than predicted: a comment is prose, so a card's
       height depends on the case, and nothing short of laying it out knows how
       many fit. Draw every remaining candidate, measure against the panel's own
       bottom edge, drop the first that crosses it and everything after. The
       first card always stays — a card taller than the panel is still the
       headline, and it may scroll on its own rather than vanish. */
    const shown = comments.slice(dxPage);
    list.innerHTML = shown.map(function (r) {
        return dxCommentCardHTML(r, dxFindings, dxMode(), dxResults.indexOf(r));
    }).join('');

    const fitted = dxTrimToFit(list, comments.length > 1);
    dxPageEnd = dxPage + fitted;

    /* The pager pages by WHAT FIT, so no candidate is ever skipped between
       screens and "Next" means the next screenful. It renders after the cards
       because the trim measures against a list that does not contain it yet;
       reserving its height above is what keeps it on screen. */
    const more = comments.length > fitted;
    const pager = more
        ? `<div class="dxPager">
               <button type="button" class="dxPage" data-page="prev" aria-label="Previous"${dxPage === 0 ? ' disabled' : ''}>&lsaquo;</button>
               <span class="dxPageCount">${dxPage + 1}–${dxPageEnd} of ${comments.length}</span>
               <button type="button" class="dxPage" data-page="next" aria-label="Next"${dxPageEnd >= comments.length ? ' disabled' : ''}>&rsaquo;</button>
           </div>`
        : '';
    list.insertAdjacentHTML('beforeend', pager + dxHiddenNote());
}

/* Keep the cards that fit the panel, drop the rest, and answer how many stayed.
   `reserve` is whether a pager will be added under them — its height has to
   come out of the budget before the cards are measured against it, or the
   thing that says "there are more" is itself the thing pushed off screen. */
const DX_PAGER_HEIGHT = 34;

function dxTrimToFit(list, reserve) {
    const panel = document.getElementById('diagnosisPanel');
    const cards = Array.prototype.slice.call(list.querySelectorAll(':scope > .dxCard'));
    if (!panel || cards.length <= 1) return cards.length;

    const limit = panel.getBoundingClientRect().bottom - (reserve ? DX_PAGER_HEIGHT : 0) - 4;
    let kept = 0;
    let full = false;
    cards.forEach(function (card) {
        // Once one card overflows, everything below it does too.
        if (!full && (kept === 0 || card.getBoundingClientRect().bottom <= limit)) kept++;
        else { full = true; card.remove(); }
    });
    return kept;
}


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */

renderDxPanel();

/* THE COMMENT LIVES IN THE REPORT AND IS EDITED THERE. It is the one thing this
   tab puts into the report, and it is what you wrote — never a suggestion that
   placed itself.

   `after: 'spec'` puts it directly under the specimen line and above the whole
   microscopic description, which is where a comment belongs — the opposite end
   from where this file's load position would otherwise land it.

   `live: true` is the crux. The section body (`#dxCommentSectionDiv`) is made
   `contenteditable` once and this file keeps its content; fillReport never
   rebuilds it, so typing a paragraph in the report survives every unrelated
   change elsewhere. `fill()` therefore returns only a show/hide signal — the
   trimmed text — and the container folds away the moment the comment is empty,
   taking its "Comment" heading with it. */
let dxCommentText = '';

registerReportSection({
    id: 'dxCommentSection',
    after: 'spec',
    heading: 'Comment',
    live: true,
    fill: function () { return dxCommentVisible() ? (dxCommentText.trim() || ' ') : ''; }
});

/* SHOWN when it has text, OR while it is being edited even if momentarily empty.
   The second half is load-bearing: without it, deleting the last character of a
   comment — or a fillReport fired by anything else mid-edit — would fold the
   section away with the caret still in it. It folds on blur instead, once you
   have actually left an empty comment behind. One predicate, used by both fill()
   and dxSyncComment(), so the two can never disagree about visibility. */
function dxCommentVisible() {
    if (dxCommentText.trim()) return true;
    const body = document.getElementById('dxCommentSectionDiv');
    return !!(body && document.activeElement === body);
}

/* The editable region is set up once the report containers exist. This file
   loads after MarrowReport, so its DOMContentLoaded listener runs after
   buildReportSections has created `#dxCommentSectionDiv`.

   The body carries REPORT_PARAGRAPH inline so a single paragraph copies into
   Word intact, like every other report block. Editing it updates dxCommentText
   and only toggles the container's visibility — it does NOT re-rank or rebuild,
   which is what keeps the caret still. */
document.addEventListener('DOMContentLoaded', function () {
    const body = document.getElementById('dxCommentSectionDiv');
    if (!body) return;
    body.setAttribute('contenteditable', 'true');
    body.setAttribute('spellcheck', 'true');
    body.classList.add('dxReportComment');
    body.style.cssText = REPORT_PARAGRAPH;
    body.addEventListener('input', function () {
        dxCommentText = body.innerText.replace(/ /g, ' ').trim();
        dxSyncComment();
    });
    // Fold an emptied comment away only once it is left, never mid-edit.
    body.addEventListener('blur', dxSyncComment);
});

/* Show or hide the section — the light half of fillReport, for the case where only
   the comment changed and re-reading every other tab would be wasted work. */
function dxSyncComment() {
    const container = document.getElementById('dxCommentSectionContainer');
    if (container) container.style.display = dxCommentVisible() ? 'block' : 'none';
}

/* Write a suggestion into the report comment. Blank lines become separate
   paragraphs — a comment of any length has them, and one styled <p> per block is
   what survives the clipboard. Setting innerHTML here is safe because it happens
   on a click, never mid-keystroke. */
function dxSetComment(text) {
    dxCommentText = text.trim();
    const body = document.getElementById('dxCommentSectionDiv');
    if (body) {
        body.innerHTML = dxCommentText.split(/\n\s*\n/)
            .map(function (block) { return block.trim(); })
            .filter(Boolean)
            .map(function (block) {
                return `<p style="${REPORT_PARAGRAPH}">${block.replace(/\n/g, '<br>')}</p>`;
            })
            .join('') || '';
    }
    dxSyncComment();
}

/* Case state — the comment, which is the one piece of case data that lives in
   the REPORT panel rather than the form, and so the one piece MarrowSave's
   #inputPanel-scoped capture cannot reach.

   Saved as TEXT, not as the body's innerHTML, and restored through
   dxSetComment() — the same door a chosen suggestion comes through. dxCommentText
   is already derived from innerText and dxSetComment rebuilds the paragraphs from
   it, so the round trip is exact for anything this app wrote or the user typed,
   and no markup out of storage is ever put back into the document.

   No `rebuild`: the comment is one element that always exists, so it has nothing
   to grow. It restores in one go before the control passes, and dxSetComment
   calls dxSyncComment() to fold the section in or out. */
registerCaseState({
    id: 'comment',
    capture: function () { return dxCommentText; },
    restore: function (saved) { dxSetComment(saved || ''); }
});

/* Re-rank on any change anywhere in the input panel: this tab reads all of them,
   so there is no narrower signal to key on. `input` as well as `change` so a
   typed blast percentage or dysplasia count lands as it is typed. The report
   comment is in the RIGHT panel and edits it there, so it never reaches this
   listener — which is exactly why editing does not trigger a re-rank. */
document.getElementById('inputPanel')?.addEventListener('change', refreshDx);
document.getElementById('inputPanel')?.addEventListener('input', refreshDx);
document.addEventListener('cbcParsed', refreshDx);

/* Accepting a suggestion writes it to the report comment and gets out of the way.
   The generated wording is a starting point, edited in place from there. Never
   auto-filled: a suggestion that wrote itself in would be a diagnosis nobody
   chose. */
document.getElementById('diagnosisPanel')?.addEventListener('click', function (e) {
    /* Paging draws from the stored ranking — no re-rank, so the arrows cannot
       reorder the list they are moving through. A page button in #diagnosisPanel
       is inside #inputPanel but is a click, not a change, so it never reaches the
       refreshDx listener; this is the only thing that advances the page. */
    const pageBtn = e.target.closest('.dxPage');
    if (pageBtn) {
        if (pageBtn.dataset.page === 'next') {
            dxPageStarts.push(dxPage);
            dxPage = dxPageEnd;
        } else {
            // The trail, or a best effort if it was lost to a re-rank.
            dxPage = dxPageStarts.length
                ? dxPageStarts.pop()
                : Math.max(0, dxPage - Math.max(1, dxPageEnd - dxPage));
        }
        dxRenderView();
        return;
    }

    const button = e.target.closest('.dxUse');
    if (!button) return;
    const result = dxResults[parseInt(button.dataset.index, 10)];
    if (!result) return;
    dxSetComment(dxComment(result, marrowFindings(), dxMode()));
    document.getElementById('dxCommentSectionDiv')?.focus();
});

/* HOW MANY CARDS FIT IS A MEASUREMENT, so it has to be retaken whenever the
   panel's height or visibility can have changed. A render while the tab is
   hidden measures a zero-height panel and keeps only the headline, so opening
   the tab must redraw; a resized window changes the budget the same way.
   Delegated from the static tab bar, and the redraw is view-only — no re-rank,
   so nothing reorders under the click. */
document.getElementById('inputTabBar')?.addEventListener('click', function (e) {
    if (e.target.closest('#diagnosisTab')) setTimeout(dxRenderView, 0);
});

window.addEventListener('resize', function () {
    if (document.getElementById('dxList')) dxRenderView();
});

/* THE INPUT COVERAGE AUDIT RUNS HERE, and not in the file that defines it, for
   one reason: it needs a findings SNAPSHOT, and marrowFindings() reads the DOM.
   MarrowDxLikelihood.js loads before the panel exists. This is the last Dx script
   in Marrow.html, so by now every tab has rendered and every leaf is reachable.

   Once, at load, on the blank form — the shape of the findings object does not
   depend on what has been filled in, so a second run would report the same list.
   See the note on dxInputCoverageAudit for what a warning here means. */
if (typeof dxInputCoverageAudit === 'function') dxInputCoverageAudit(marrowFindings());
