/* ============================================================================
   PBRbc.js — the red cell block of the Findings page (#findingsPanel) and the
   red cell half of the final diagnosis.

   THE MODEL FOR THE WHITE CELL AND PLATELET BLOCKS, the way MarrowSpec.js is for
   the marrow's six tabs. All three append to ONE panel in load order — the
   original keeps every input on a single page and so does this.

   Ported from pbnorthwest.html: the RBC1-RBC8 rows of #descriptionPanel
   (lines 487-560) and the red cell branch of fillFinal() (lines 1775-1915).
   Every report string is that file's, verbatim.

   ---------------------------------------------------------------------------
   THE OUTPUT IS A DIAGNOSIS, NOT A DESCRIPTION, and that is the whole difference
   from the marrow's Blood tab. One sentence per finding, the first of them a
   noun phrase rather than a clause: "Microcytic hypochromic anemia (8.2 g/dL).
   Red blood cells show polychromasia and anisopoikilocytosis including
   occasional schistocytes. Rare nucleated red blood cells identified."

   ---------------------------------------------------------------------------
   DELIBERATE DEVIATIONS — everything else is the original's text verbatim.

     - THE ANEMIA ROW IS A TOGGLE GROUP, so "***Incompatible RBC
       Characteristics***" cannot happen. The original made microcytic,
       macrocytic and normocytic three unguarded checkboxes, detected the
       impossible state afterwards and printed that string into the report
       instead of the diagnosis. Exclusivity by construction is the marrow's
       answer to exactly this (see the toggle-group note in MarrowForm.js), and
       it also makes the finding clearable, which three checkboxes were and a
       radio group would not be.

     - HYPOCHROMIC IS ONE CHIP, not two. The original carried `hypochromicNormo`
       and `hypochromicMicro` separately, one per anemia type, which meant the
       qualifier was attached to the row rather than to the answer: setting it on
       normocytic and then switching to microcytic silently dropped it. Here it
       qualifies whichever of the two is chosen, which is the app's standing rule
       that a qualifier belongs to its finding. It prints nothing on macrocytic
       or adequate, exactly as before — there was no hypochromic checkbox on
       either.

     - THE ANISO LIST IS THE SHARED DESCRIPTOR MACHINERY (MarrowDescriptors.js),
       not a bespoke `createAniso()` over eighteen `<select>`s. Same words, same
       "including" phrasing, same qualifier pooling — "occasional schistocytes
       and target cells" rather than the qualifier written twice — and the two
       words the marrow's own list lacked (macrocytes, microcytes) were added to
       the shared vocabulary rather than kept here.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Data

   `text` is the diagnosis line. `hypo` says the row accepts the Hypochromic
   qualifier — the original offered it on the two anemias that can be
   hypochromic and on neither of the others.
-------------------------------------------------------------------------- */

const pbRbcQuantity = [
    { value: 'adequate',    label: 'Adequate',    text: 'Hemoglobin is adequate' },
    { value: 'normocytic',  label: 'Normocytic',  text: 'Normocytic anemia',  hypo: true, anemia: true },
    { value: 'microcytic',  label: 'Microcytic',  text: 'Microcytic anemia',  hypo: true, anemia: true },
    { value: 'macrocytic',  label: 'Macrocytic',  text: 'Macrocytic anemia',              anemia: true }
];

/* The morphology row. `unremarkable` is a STOP chip in this app's sense — it
   means the absence of the others — where the original made it a lone <input
   type="radio"> with no name, which is a radio that can never be unpicked and
   never excluded anything. */
const pbRbcMorphology = [
    { id: 'pbRbcUnremarkable', label: 'Unremarkable morphology', stop: true },
    { id: 'pbRbcPoly',         label: 'Polychromasia' },
    { id: 'pbRbcAniso',        label: 'Anisopoikilocytosis' },
    { id: 'pbRbcMildAniso',    label: 'Mild anisopoikilocytosis' }
];

/* The eighteen poikilocytes the original's aniso dropdowns offered, in its own
   order (pbnorthwest.html:1403). Keys into descriptorVocabulary — a group is a
   choice of keys, never a copy of the words. */
const PB_ANISO_DESCRIPTORS = ['acanthocytes', 'basophilicStippling', 'biteCells', 'blisterCells',
    'burrCells', 'echinocytes', 'elliptocytes', 'howellJolly', 'macrocytes', 'macroovalocytes',
    'microcytes', 'ovalocytes', 'schistocytes', 'sickleCells', 'spherocytes', 'targetCells',
    'teardropCells', 'teardropForms'];

const pbNrbcQuantity = [
    { value: 'frequent',   label: 'Frequent' },
    { value: 'occasional', label: 'Occasional' },
    { value: 'rare',       label: 'Rare' }
];

/* Whether the haemoglobin value rides in the diagnosis line, and when. The
   original's setting1/setting2 (pbnorthwest.html), whose labels are kept: they
   are not exclusive there and are not here — "always" wins, and "when abnormal"
   adds the value to the three anemias only. */
const PB_HGB_ALWAYS = 'pbHgbAlways';
const PB_HGB_ABNORMAL = 'pbHgbAbnormal';


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

function pbFindingRow(label, controls, key) {
    const keyAttr = key ? ` data-key="${key}"` : '';
    return `<div class="findingLabel">${label}</div><div class="findingChips"${keyAttr}>${controls}</div>`;
}

function renderPBRbcPanel() {
    const panel = document.getElementById('findingsPanel');
    if (!panel) return;

    const quantity = pbRbcQuantity.map(function (option) {
        return `<input type="checkbox" class="chipInput form" id="pbRbcQ_${option.value}"` +
            ` value="${option.value}" data-toggle="pbRbcQuantity">` +
            `<label class="chip" for="pbRbcQ_${option.value}">${option.label}</label>`;
    }).join('');

    /* Hypochromic sits in its own .chipSub beside the group, which is how this
       app renders a qualifier on an answer rather than an answer of its own. */
    const hypochromic = `<span class="chipSub">` +
        `<input type="checkbox" class="chipInput chipQualInput form" id="pbRbcHypochromic">` +
        `<label class="chip" for="pbRbcHypochromic">Hypochromic</label></span>`;

    const morphology = pbRbcMorphology.map(function (option) {
        const stop = option.stop ? ' data-stop' : '';
        return `<input type="checkbox" class="chipInput form" id="${option.id}"` +
            ` data-stopgroup="pbRbcMorph"${stop}>` +
            `<label class="chip" for="${option.id}">${option.label}</label>`;
    }).join('');

    const nrbc = pbNrbcQuantity.map(function (option) {
        return `<input type="checkbox" class="chipInput form" id="pbNrbcQ_${option.value}"` +
            ` value="${option.value}" data-toggle="pbNrbcQuantity">` +
            `<label class="chip" for="pbNrbcQ_${option.value}">${option.label}</label>`;
    }).join('');

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">Red cells</div>
            <div class="findingGrid">
            ${pbFindingRow('Hemoglobin', `<span class="chipGroup">${quantity}</span>${hypochromic}`, 'pbRbcQuantity')}
            ${pbFindingRow('Morphology', morphology + descriptorListHTML('pbAnisoDesc'), 'pbRbcMorph')}
            ${pbFindingRow('NRBCs', `<span class="chipWrap">` +
                `<input type="checkbox" class="chipInput form" id="pbNrbc">` +
                `<label class="chip" for="pbNrbc">Identified</label>` +
                `<span class="chipQuals"><span class="chipGroup">${nrbc}</span></span></span>`, 'pbNrbc')}
            ${pbFindingRow('Agglutination',
                `<input type="checkbox" class="chipInput form" id="pbAgglutination">` +
                `<label class="chip" for="pbAgglutination">Present</label>`)}
            </div>
        </div>

        ${/* The original's "Other:" free-text line, kept on every lineage: a
              sentence typed here is appended to that lineage's block verbatim.
              It is the escape hatch that stops a missing chip from being a
              missing report. */''}
        <div class="fieldBlock">
            <div class="fieldLabel">Additional</div>
            <textarea class="textBox form" id="pbRbcOther" rows="2" spellcheck="true"
                      placeholder="Appended to the red cell lines verbatim"></textarea>
        </div>`);

    registerDescriptorGroup('pbAnisoDesc', PB_ANISO_DESCRIPTORS);
    renderDescriptorList('pbAnisoDesc');
}

function renderPBRbcSettings() {
    const panel = document.getElementById('pbReportSettingsPanel');
    if (!panel) return;

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">Hemoglobin</div>
            <div class="toggleFieldRow">
                ${toggleFieldHTML(PB_HGB_ALWAYS, 'Always include the hemoglobin value')}
            </div>
            <div class="toggleFieldRow">
                ${toggleFieldHTML(PB_HGB_ABNORMAL, 'Include the hemoglobin value when abnormal')}
            </div>
        </div>`);

    /* `setting`, not `form`: these outlive a case. toggleFieldHTML() writes
       `form` because its usual caller is a tab, so the class is swapped here
       rather than adding a flag to a helper for one caller. */
    [PB_HGB_ALWAYS, PB_HGB_ABNORMAL].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('form');
        el.classList.add('setting');
    });

    settingsPanelSave(panel);
}


/* ----------------------------------------------------------------------------
   Report text
-------------------------------------------------------------------------- */

/* " (8.2 g/dL)" or ''. The value comes from the pasted CBC and nowhere else —
   the original read the same HGB it had parsed. `abnormal` is what the two
   settings differ on: one prints the value on every case, the other only where
   the line being written is an anemia. */
function pbHgbValue(isAnemia) {
    const always = getSetting(PB_HGB_ALWAYS, false);
    const abnormal = getSetting(PB_HGB_ABNORMAL, false);
    if (!always && !(abnormal && isAnemia)) return '';

    const result = typeof cbcResult === 'function' ? cbcResult('HGB') : null;
    return result ? ` (${result.value} g/dL)` : '';
}

/* The anemia / adequate line. '' when the row is unanswered, which is what makes
   a blank tab print nothing at all. */
function pbRbcQuantityText() {
    const chosen = toggleGroupValue('pbRbcQuantity');
    if (!chosen) return '';

    const option = pbRbcQuantity.filter(function (o) { return o.value === chosen; })[0];
    if (!option) return '';

    /* "Microcytic hypochromic anemia" — the qualifier splits the adjective from
       its noun, which is why this is a replace rather than a suffix. */
    let text = option.text;
    if (option.hypo && document.getElementById('pbRbcHypochromic')?.checked) {
        text = text.replace(' anemia', ' hypochromic anemia');
    }

    return text + pbHgbValue(!!option.anemia) + '.';
}

/* "Red blood cells show …". The four morphology chips combine as the original
   combined them, which is not the obvious way: polychromasia and an
   anisopoikilocytosis share ONE sentence joined by "and", and the aniso half
   either names its poikilocytes ("anisopoikilocytosis including occasional
   schistocytes") or says it has none to name ("non-specific
   anisopoikilocytosis"). */
function pbRbcMorphologyText() {
    if (document.getElementById('pbRbcUnremarkable')?.checked) {
        return 'Red blood cells show unremarkable morphology.';
    }

    const poly = document.getElementById('pbRbcPoly')?.checked;
    const aniso = document.getElementById('pbRbcAniso')?.checked;
    const mild = document.getElementById('pbRbcMildAniso')?.checked;

    if (!poly && !aniso && !mild) return '';
    if (poly && !aniso && !mild) return 'Red blood cells show polychromasia.';

    /* `mild` only reaches here when `aniso` is unset, since the two are one
       question — see the listener at the bottom. */
    const named = descriptorPhrase('pbAnisoDesc');
    const lead = mild ? 'mild ' : '';
    const anisoText = named
        ? `${lead}anisopoikilocytosis including ${named}`
        : `${lead}non-specific anisopoikilocytosis`;

    return `Red blood cells show ${poly ? 'polychromasia and ' : ''}${anisoText}.`;
}

function pbNrbcText() {
    if (!document.getElementById('pbNrbc')?.checked) return '';

    const quantity = toggleGroupValue('pbNrbcQuantity');
    const option = pbNrbcQuantity.filter(function (o) { return o.value === quantity; })[0];

    // Unquantified is a real answer and prints the bare sentence, as it did.
    return option
        ? `${option.label} nucleated red blood cells identified.`
        : 'Nucleated red blood cells identified.';
}

/* Every red cell sentence, in the original's order, as one paragraph. Returns ''
   when nothing is said, which is what lets fillPBFinal join only the blocks that
   have something in them. */
function pbRbcLines() {
    const parts = [
        pbRbcQuantityText(),
        pbRbcMorphologyText(),
        pbNrbcText(),
        document.getElementById('pbAgglutination')?.checked
            ? 'Red blood cells show agglutination. See comment.' : '',
        document.getElementById('pbRbcOther')?.value.trim() || ''
    ];

    return parts.filter(Boolean).join(' ');
}


/* ----------------------------------------------------------------------------
   Bootstrap

   ORDER IS LOAD-BEARING, the same sequence every settings-reading tab uses (see
   the applySettings trap in CLAUDE.md): the .setting controls must exist before
   applySettings() can restore into them, and only then may anything read them
   back through getSetting().
-------------------------------------------------------------------------- */

renderPBRbcSettings();
applySettings();
renderPBRbcPanel();

/* THE FINAL DIAGNOSIS IS ONE SECTION, filled by every lineage. Registered here
   because the red cells are the first of them and the section has to exist
   before the white cell and platelet tabs can add to it; each contributes a
   `lines()` function to pbFinalBlocks and the section joins whichever have
   something to say. The white cell and platelet tabs push their own; nothing
   else about this needs to change when they land. */
const pbFinalBlocks = [pbRbcLines];

/* One blank line between lineages, which is the original's `<br><br>` — its
   blocks were paragraphs and its report spaced them that way. Each block is a
   paragraph of its own here, so the spacing is REPORT_PARAGRAPH's margin and
   survives the clipboard, which a pair of <br>s in Epic does not. */
function fillPBFinal() {
    return pbFinalBlocks
        .reduce(function (out, block) { return out.concat(block()); }, [])
        .filter(Boolean)
        .map(function (text) { return `<p style="${REPORT_PARAGRAPH}">${text}</p>`; })
        .join('');
}

registerReportSection({ id: 'pbFinal', fill: fillPBFinal });

/* ANISOPOIKILOCYTOSIS AND ITS MILD FORM ARE ONE QUESTION asked with two chips,
   so picking either clears the other. They are not a toggle group, because the
   group they sit in also holds Polychromasia — which coexists with both — and
   Unremarkable, which excludes all three. The stop-chip contract in
   MarrowForm.js covers Unremarkable; this covers the pair.

   Bound on #rbcPanel rather than #inputPanel, and for the reason MarrowStains.js
   gives: an event bubbles outward, so a listener on the inner element runs
   before MarrowReport's on the outer one and the report is built from the final
   state rather than one click behind it. */
document.getElementById('findingsPanel')?.addEventListener('change', function (e) {
    if (!e.target.checked) return;
    if (e.target.id === 'pbRbcAniso') document.getElementById('pbRbcMildAniso').checked = false;
    else if (e.target.id === 'pbRbcMildAniso') document.getElementById('pbRbcAniso').checked = false;
});

/* Typed input per keystroke, not on blur — the Additional box is report text. */
document.getElementById('findingsPanel')?.addEventListener('input', function (e) {
    if (e.target.id === 'pbRbcOther') fillReport();
});


/* ----------------------------------------------------------------------------
   Readers for the comment gates (PBComment.js)

   Exported deliberately rather than letting that file reach for ids: which chip
   means "there are schistocytes" is this file's business, and a gate written
   against `#pbAnisoDesc_schistocytes` would break the day the list is rebuilt.
-------------------------------------------------------------------------- */

function pbAnemiaType() { return toggleGroupValue('pbRbcQuantity'); }

function pbIsAnemia() {
    const option = pbRbcQuantity.filter(function (o) { return o.value === pbAnemiaType(); })[0];
    return !!(option && option.anemia);
}

/* Is this poikilocyte named, and with which qualifier? Two readers rather than
   one, because the comments ask both questions: RBCC8 wants any schistocyte at
   all, RBCC7 wants specifically RARE ones — the original tested the printed
   string for "rare schistocytes", which is the same question asked of prose. */
function pbAnisoNamed(key) { return descriptorSelected('pbAnisoDesc').indexOf(key) !== -1; }

function pbAnisoQualifier(key) {
    return toggleGroupValue(descriptorQualGroup('pbAnisoDesc', key));
}

function pbAgglutination() { return !!document.getElementById('pbAgglutination')?.checked; }
