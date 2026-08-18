/* ============================================================================
   MarrowReport.js — cross-tab report orchestration.

   Owns three things no single tab can own:
     1. The section registry — each input tab registers one report section.
     2. fillReport() — the full re-render, run on every input change.
     3. The template-type highlight cue.

   To add a report section from a new tab file (loaded after this one):

       registerReportSection({ id: 'asp', fill: fillAspirate, heading: 'Bone Marrow Aspirate' });

   which creates #aspContainer > #aspDiv inside #rightPanelFinal, in
   registration order, and calls fill() on every change. fill() must be a pure
   DOM-reader that returns an HTML string ('' to hide its section).

   `heading` is optional and is the bold line above the section. Omit it for a
   section that already says what it is — the specimen line IS the report's
   title, and the CBC and differential tables carry their own captions.

   Optional `when: () => boolean` suppresses a section entirely — reserved for
   later gating decisions (e.g. no core biopsy received -> no core morphology).

   Optional `after: '<id>'` places a section immediately behind another instead
   of at the end. See orderReportSections().
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Section registry
-------------------------------------------------------------------------- */
const reportSections = [];

function registerReportSection(section) {
    reportSections.push(section);
}

/* REGISTRATION ORDER IS STILL REPORT ORDER; `after` is the one exception, and it
   exists because load order and report order genuinely disagree in one place.
   The comment belongs directly under the specimen line, at the top of the
   report — but the tab that produces it has to load LAST, since it reads every
   other tab's state. Those two facts cannot both be satisfied by pushing.

   Resolved HERE rather than in registerReportSection(), so it does not depend on
   whether the target has been registered yet: this runs on DOMContentLoaded,
   by which point every tab file has had its say. An `after` naming a section
   that does not exist falls back to the registration position, which is the
   same thing pushing would have done.

   Deliberately not a numeric `order`: numbers invite gaps, renumbering and
   arguments about what 50 means, where `after: 'spec'` says the actual intent. */
function orderReportSections() {
    const placed = reportSections.filter(function (s) { return !s.after; });

    reportSections.filter(function (s) { return s.after; }).forEach(function (section) {
        const at = placed.findIndex(function (s) { return s.id === section.after; });
        if (at === -1) placed.push(section);
        else placed.splice(at + 1, 0, section);
    });

    reportSections.length = 0;
    Array.prototype.push.apply(reportSections, placed);
}

/* ----------------------------------------------------------------------------
   Word styles

   Every report paragraph carries its styling INLINE. That is not a preference:
   a stylesheet does not survive the clipboard, so anything that must land in
   Epic or Word intact has to be on the element itself.

   Declared here, once. "Keep them byte-exact" (see CLAUDE.md) is a rule you can
   only really keep by having one copy of the bytes — they were already retyped
   in two tabs, and every tab still to come would have retyped them again.
-------------------------------------------------------------------------- */

/* Every block below is the same type spec over different vertical margins, so
   the type is written ONCE and the margins are the only argument. Retyping the
   whole declaration per block is how three of them drift into three fonts.
   Right and left are 0in in all of them — a report block is full width. */
const REPORT_TYPE = "line-height:115%; font-size:10.0pt; font-family:'Aptos',sans-serif;";

function reportBlockStyle(top, bottom) {
    return `margin-top:${top}; margin-right:0in; margin-bottom:${bottom}; margin-left:0in; ${REPORT_TYPE}`;
}

/* A body paragraph. Its margin-bottom is the space AFTER a section. */
const REPORT_PARAGRAPH = reportBlockStyle('0in', '8.0pt');

/* A section heading: space above, none below. The gap belongs BETWEEN sections,
   not between a heading and the text it heads — that text reads directly
   beneath it, which is the whole point of a heading. */
const REPORT_HEADING = reportBlockStyle('8.0pt', '0in');

/* A sub-label inside a section: a specimen name above its own table, where one
   section covers several specimens (the stain tables). NOT bold — the section
   heading above it is the bold line, and a second bold line reads as a second
   section. No margin at all: it sits tight under the heading, and tight above
   the table it labels, for the same reason a heading does.

   The 8pt that separates one specimen block from the NEXT is REPORT_HEADING's
   spacing, and the stain fills reuse it for every block after the first rather
   than declaring a fourth style that would be identical to it. */
const REPORT_SUBLABEL = reportBlockStyle('0in', '0in');

/* The stain tables, which are report output and so are styled inline like
   everything else here. Quoted from ../Marrow/MarrowText.js:2220-2227, with one
   addition: the original table set no font-family and inherited Word's default,
   so a stain table landed in a different face from the paragraph above it. It
   takes REPORT_TYPE now, like every other block. */
const REPORT_TABLE = `width:600px; border-collapse:collapse; ${REPORT_TYPE}`;
const REPORT_TABLE_NAME = "width:30%; border:1px solid black; padding-left:5px; vertical-align:top;";
const REPORT_TABLE_VALUE = "width:70%; border:1px solid black; padding-left:5px; vertical-align:top;";


/* Container shape (#<id>Container wrapping #<id>Div) matches the original app,
   whose copy buttons scrape whole containers. Built once, in registration
   order — that order is the report's section order.

   An optional `heading` renders a bold line above the section's body. It lives
   INSIDE the container, which is what makes it disappear along with a section
   that has nothing to say: fillReport() hides the container whole, so there is
   no way to end up with a heading over an empty space. */
function buildReportSections() {
    const host = document.getElementById('rightPanelFinal');
    if (!host) return;

    // Resolve `after` before anything is built, so the containers and
    // fillReport()'s iteration cannot disagree about the order.
    orderReportSections();

    reportSections.forEach(function (section) {
        const container = document.createElement('div');
        container.id = section.id + 'Container';
        container.style.display = 'none';

        if (section.heading) {
            container.innerHTML = `<p style="${REPORT_HEADING}"><b>${section.heading}</b></p>`;
        }

        const body = document.createElement('div');
        body.id = section.id + 'Div';
        body.className = 'panelFormat';

        container.appendChild(body);
        host.appendChild(container);
    });
}

function fillReport() {
    reportSections.forEach(function (section) {
        const container = document.getElementById(section.id + 'Container');
        const body = document.getElementById(section.id + 'Div');
        if (!container || !body) return;

        const html = section.when && !section.when() ? '' : section.fill();

        /* A `live` section OWNS its body — fillReport only shows or hides it, and
           never replaces its innerHTML. This is for content the user edits IN the
           report (the comment): rebuilding it on every unrelated change would drop
           the caret mid-word. The section keeps its own body current; here fill()
           returns only a truthiness signal for the container. */
        if (!section.live) body.innerHTML = html;
        container.style.display = html ? 'block' : 'none';
    });
}


/* ----------------------------------------------------------------------------
   Template-type highlight cue

   Maps template type -> the [data-key] inputs worth flagging for that workup.
   The cue is ADVISORY: it says where to look, it does not gate anything, and
   every other input on the tab still works exactly as it did. It clears as soon
   as anything inside it is answered, so what stays green is what this workup
   wants and you have not got to yet — the old app's "needsSelection" worked the
   same way and was right to.

   That clearing is pure CSS (see [data-key].keyInput:has(...) in Template.css),
   which is why nothing here re-checks it: the box goes when the answer arrives,
   whether it arrived by click or from a pasted CBC.

   THIS TABLE IS A CLINICAL JUDGEMENT, not a mechanism, and it is meant to be
   argued with. It is also the only thing to edit: a key appears here and on a
   `data-key` in a tab file, and nothing else knows about either. Keying on
   data-key rather than ids is what keeps this file ignorant of any tab's id
   scheme.

   ONE BASELINE, THREE EXCEPTIONS. Almost every workup wants the same things
   flagged — was the smear worth reading, are the cytopenias explained, do the
   lineages look right — so that shared list is `HL_BASE` and every type starts
   from it. Only three findings are entity-specific, and each attaches to exactly
   the workup it belongs to:

     - PLASMA CELLS   — plasma-cell neoplasm workups only.
     - LYMPHOCYTES    — lymphoma workups only.
     - BLASTS         — MDS and acute-leukemia workups only.

   Everything else is identical across the nine types, which is the point: a cue
   that means the same thing on every case is one you learn to trust, and the
   handful of differences are exactly the findings that define those entities.
   This replaced a set of bespoke per-type lists — each "what THAT workup turns
   on", several of them shorter than the baseline — which drifted and were hard
   to reason about.

   A COUNT AND A MORPHOLOGY ARE TWO KEYS, even where they share a row: `neut` is
   how many neutrophils, `neutMorph` is what they look like. They are worth
   flagging independently because they are answered independently — a pasted CBC
   answers every count on the tab before the slide is on the stage, and none of
   the morphologies. Sharing one key would let the CBC clear a cue asking for a
   dysplasia nobody has looked for yet.

   The baseline uses the aspirate lineages' MORPHOLOGY keys, not their counts:
   erythroid and myeloid quantity is already told by the predominance and the M:E
   ratio, so flagging the counts too would repeat what the ratio says.
   Megakaryocytes are the exception (their number is a primary finding no ratio
   captures), so `aspMega` is in — as is `aspBlast`, since a blast count is part
   of every differential. Only `blast`, the PERIPHERAL blood blast, is
   entity-specific; it rides with the blast exception.

   Rule-out and history-of are still spelled out separately rather than derived:
   they agree today (both `HL_BASE.concat(...)` the same set), and there is no
   reason they must.
-------------------------------------------------------------------------- */

/* The shared list: cytopenias and red-cell morphology, the neutrophil and
   platelet lines, aspirate adequacy and predominance, the erythroid/myeloid/mega
   morphology and the mega count, the ASPIRATE BLAST count, and the core's
   adequacy, cellularity, two precursor compartments and megakaryocyte count +
   morphology (`coreMeg` / `coreMegMorph` — the same two-key split as
   aspMega/aspMegaMorph). Everything a marrow answers whatever it was sent for.

   `aspBlast` and `coreAdequacy` are in the baseline by choice: a blast count is
   part of every differential, and core adequacy gates whether the section is
   even interpretable — both are asked on every case, not just their entity's.
   (`blast`, the PERIPHERAL blood blast, is not: circulating blasts are the
   MDS/leukemia question, so it rides with HL_BLAST.)

   Adequacy is the ANSWER chips (`aspAdequacy` / `coreAdequacy` —
   adequate/suboptimal/inadequate), not the descriptor dropdown (`aspAdequacyDesc`
   is the list of WHY: hemodilute, paucicellular). The cue asks "did you judge the
   specimen adequate", which is the chip; the descriptors are optional color on
   that judgement and would leave the cue green on most adequate cases. Both tabs
   now key on their chip, which is also why they read the same. */
const HL_BASE = [
    /* Laterality is in the baseline for the same reason adequacy is: it is part
       of the specimen line on every case, whatever the workup — and it is the
       one answer nobody can reconstruct later from the slide. */
    'laterality',
    'hgb', 'mcv', 'rbcMorph', 'neut', 'neutMorph', 'plt', 'pltMorph',
    /* aspPredom is deliberately NOT cued (author's call): the predominance is
       derived from the counted M:E ratio and autofills, so a green box on it
       mostly asked for something the count answers by itself. The data-key
       stays on the row as the hook.

       aspTouchPrep is cued STICKY (data-sticky on the field): a switch cannot
       answer "no", so its box never clears — a standing reminder to say which
       specimen the differential describes. */
    'aspTouchPrep',
    'aspAdequacy', 'aspErythMorph', 'aspMyeloidMorph', 'aspMega', 'aspMegaMorph', 'aspBlast',
    'coreAdequacy', 'coreCellularity', 'coreME', 'coreMeg', 'coreMegMorph'
];

/* The three entity-specific sets. Each is the finding that defines its workup:
   how many and what they look like on blood, aspirate and — for plasma cells —
   the section, plus, for lymphoma, the distribution on the section and the
   clot. */
const HL_PLASMA = ['plasma', 'aspPlasma', 'aspPlasmaMorph', 'corePlasma', 'corePlasmaMorph'];
const HL_LYMPH = ['lymph', 'lymphMorph', 'aspLymph', 'aspLymphMorph', 'coreLymph', 'coreClotLymph'];
/* The blast set is a count and TWO morphologies, on the same count/morphology
   split every other row makes: `aspBlast` (the aspirate count) is in HL_BASE
   because every differential answers it, but neither morphology is asked on a
   routine marrow — and Auer rods, which live in these two lists, are the finding
   that separates MDS-IB1 from MDS-IB2 and are worth cueing on exactly the workups
   that turn on the blast count. */
const HL_BLAST = ['blast', 'blastMorph', 'aspBlastMorph'];

const templateTypeHighlights = {
    general:           HL_BASE,

    ruleOutPlasmaCell: HL_BASE.concat(HL_PLASMA),
    historyPlasmaCell: HL_BASE.concat(HL_PLASMA),

    ruleOutMDS:        HL_BASE.concat(HL_BLAST),
    historyMDS:        HL_BASE.concat(HL_BLAST),

    /* MPN asks for the same set as MDS, deliberately and not by accident of
       being copied: the two are the chronic myeloid differential and are worked
       up against each other, so the findings that separate them — the cytopenias,
       the dysplasias, the megakaryocytes, the blast count — are the same
       findings. What an MPN workup adds is not a cue but a stain; see
       stainAutoLists in MarrowStains.js. */
    ruleOutMPN:        HL_BASE.concat(HL_BLAST),
    historyMPN:        HL_BASE.concat(HL_BLAST),

    ruleOutAcuteLeuk:  HL_BASE.concat(HL_BLAST),
    historyAcuteLeuk:  HL_BASE.concat(HL_BLAST),

    ruleOutLymphoma:   HL_BASE.concat(HL_LYMPH),
    historyLymphoma:   HL_BASE.concat(HL_LYMPH)
};

function applyTemplateHighlights() {
    document.querySelectorAll('.keyInput').forEach(function (el) {
        el.classList.remove('keyInput');
    });

    // currentTemplateType() is defined in MarrowSpec.js, which loads after this
    // file but is defined by the time anything calls this.
    const type = typeof currentTemplateType === 'function' ? currentTemplateType() : null;
    const keys = templateTypeHighlights[type];
    if (!keys) return;

    keys.forEach(function (key) {
        document.querySelectorAll('[data-key="' + key + '"]').forEach(function (el) {
            el.classList.add('keyInput');
        });
    });
}


/* ----------------------------------------------------------------------------
   Live re-render

   Delegated from the static #inputPanel so it covers generated markup and
   survives any re-render. class="form" on a control is the opt-in.
-------------------------------------------------------------------------- */
document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    if (e.target.classList.contains('form')) {
        fillReport();
        applyTemplateHighlights();
    }
});

/* Every tab file is a classic end-of-body script, so all registration has
   happened by DOMContentLoaded regardless of their order. */
document.addEventListener('DOMContentLoaded', function () {
    buildReportSections();
    fillReport();
    applyTemplateHighlights();
});


/* ----------------------------------------------------------------------------
   Copy buttons

   The shell builds the .copyButton bar from templateConfig as inert divs; the
   handlers live HERE because what each button copies is a fact about the
   report's sections, which this file owns.

   Each button copies whole section CONTAINERS — heading included — exactly as
   rendered: the report's inline styles ARE the formatting, so what lands in
   Epic/Word is what the panel shows. The old app's copy scraped containers the
   same way, which is why the container shape was kept (see buildReportSections).

   The old app's Copy Final additionally wrote a hand-built HTML+RTF payload so
   its final-diagnosis BULLET survived the Word -> Citrix -> Epic round-trip
   (../Marrow/Marrow.js, "Method 5"). No final-diagnosis line exists here yet,
   so there is no bullet to protect; when that line is rebuilt, that path is
   the one to port. */

/* Button id -> the section ids it copies. 'microscopic' is DERIVED rather than
   listed: it is everything the other buttons do not claim, so a newly
   registered section is microscopic by default instead of silently falling out
   of every copy. */
const COPY_CLAIMED = {
    spec:         ['spec'],
    copyComment:  ['dxCommentSection'],
    copyClinical: ['cbc']
};

function copySectionIds(buttonId) {
    if (COPY_CLAIMED[buttonId]) return COPY_CLAIMED[buttonId];
    const claimed = new Set([].concat.apply([], Object.values(COPY_CLAIMED)));
    return reportSections.map(function (s) { return s.id; })
        .filter(function (id) { return !claimed.has(id); });
}

/* Both clipboard flavors, from the LIVE containers, visible ones only — a
   hidden container is a section with nothing to say, exactly as on screen.
   The plain half reads innerText off the panel rather than a detached clone,
   because innerText only honors line breaks on a rendered element. */
function copyPayload(ids) {
    const parts = [];
    const texts = [];
    ids.forEach(function (id) {
        const container = document.getElementById(id + 'Container');
        if (!container || container.style.display === 'none') return;
        parts.push(container.innerHTML);
        const text = container.innerText.trim();
        if (text) texts.push(text);
    });
    if (!parts.length) return null;

    /* EPIC DROPS THE MARGINS. On screen and in Word the space between sections
       is the paragraphs' 8pt margin-bottom; Epic's editor strips margins on
       paste, so sections ran together there (the author's report). A literal
       <br> between sections is a blank line every editor keeps — the old app
       spaced its report exactly this way. Skipped where the section already
       ends with one (the differential tables carry the old app's trailing
       <br>), so a table is never followed by two blank lines. Word shows the
       margin AND the blank line, which reads as one section gap either way. */
    let html = '';
    /* "Ends with a <br>" has to see through the container's own closing tags:
       the table's trailing <br> sits INSIDE #pbDiffDiv, so the raw string ends
       with </div>. */
    const endsWithBreak = /<br\s*\/?>\s*(<\/(div|span)>\s*)*$/i;
    parts.forEach(function (part, i) {
        if (i > 0 && !endsWithBreak.test(parts[i - 1])) html += '<br>';
        html += part;
    });

    // The comment body is contenteditable in the panel; the copy is not an
    // editor, and pasting an editable region into another tool invites it to
    // behave like one. Strip the attribute from the payload only.
    const scratch = document.createElement('div');
    scratch.innerHTML = html;
    scratch.querySelectorAll('[contenteditable]').forEach(function (el) {
        el.removeAttribute('contenteditable');
    });
    return { html: scratch.innerHTML, text: texts.join('\n\n') };
}

/* The old app's synthesized-copy-event trick: select a hidden contenteditable,
   execCommand('copy'), and override clipboardData in a one-shot capture
   listener. Kept as the FALLBACK because it works from file:// — where this
   app must run — when the async clipboard API refuses. */
function copyViaExecCommand(payload) {
    const holder = document.createElement('div');
    holder.contentEditable = 'true';
    holder.style.cssText = 'position:fixed; left:-9999px; top:0; opacity:0;';
    holder.textContent = 'x';
    document.body.appendChild(holder);

    const range = document.createRange();
    range.selectNodeContents(holder);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const handler = function (e) {
        e.preventDefault();
        e.clipboardData.setData('text/html', payload.html);
        e.clipboardData.setData('text/plain', payload.text);
    };
    document.addEventListener('copy', handler, true);

    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }

    document.removeEventListener('copy', handler, true);
    sel.removeAllRanges();
    holder.remove();
    return ok;
}

async function copyToClipboard(payload) {
    try {
        await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([payload.html], { type: 'text/html' }),
            'text/plain': new Blob([payload.text], { type: 'text/plain' })
        })]);
        return true;
    } catch (err) {
        return copyViaExecCommand(payload);
    }
}

/* Wired on the same event the sections are built on; listeners run in add
   order, so the containers exist by the time this runs. */
document.addEventListener('DOMContentLoaded', function () {
    Object.keys(COPY_CLAIMED).concat('microscopic').forEach(function (buttonId) {
        document.getElementById(buttonId)?.addEventListener('click', async function () {
            const payload = copyPayload(copySectionIds(buttonId));
            if (!payload) { showAlert('error', 'No text to copy'); return; }

            const ok = await copyToClipboard(payload);
            if (ok) showAlert('success', 'Text copied');
            else showAlert('error', 'Failed to copy');
        });
    });

    /* New Marrow - the whole worksheet cleared. A fresh page load is the
       canonical empty state (the old app's doNewMarrow reasoned the same way):
       every control, counter tape, growing list and derived report resets in
       one act, with no list of "things that must be cleared" to keep complete
       as tabs grow. Nothing that was meant to be kept is lost - the app
       persists no case data by design, and settings live in localStorage,
       which a reload does not touch. The confirm is the button's whole
       safety: it is the one control in this bar that destroys rather than
       copies, and a misclick would cost a whole case. */
    document.getElementById('newMarrowBtn')?.addEventListener('click', function () {
        if (!window.confirm('Start a new marrow? This clears everything entered for the current case.')) return;
        window.location.reload();
    });
});
