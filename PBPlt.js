/* ============================================================================
   PBPlt.js — the platelet block of the Findings page, and the platelet part of
   the final diagnosis.

   Ported from pbnorthwest.html: the PLT rows of #descriptionPanel and the
   plateletText branch of fillFinal() (lines 2203-2302). Report strings verbatim,
   including the two that differ by one word — an adequate count takes "with
   unremarkable morphology", an abnormal one takes "with unremarkable PLATELET
   morphology". That is the original's and is kept as found.

   ---------------------------------------------------------------------------
   MILD AND MARKED ARE DERIVED, NOT CLICKED, which is this block's one real idea
   and the original's: you say thrombocytopenia, the count says how bad.

       thrombocytopenia   > 0.9 x low -> Mild      < 0.2 x low -> Marked
       thrombocytosis     < 1.1 x high -> Mild     > 2 x high  -> Marked

   THE MULTIPLIERS ARE THE ORIGINAL'S; the range they multiply is not. The
   original took `pltLow`/`pltHigh` from the reference range Epic printed beside
   the result, and this app's CBC parser keeps the value and the High/Low flag
   but not the range. So the range is two settings instead, defaulting to the
   usual adult 150-450 K/uL — a number the app now owns and did not before, which
   is why it is editable and why it is said out loud here. Where no platelet
   count has been pasted at all, neither grade fires and the bare word prints,
   exactly as the original did with an undefined count.
   ========================================================================= */


const pbPltQuantity = [
    { value: 'adequate',         label: 'Adequate',         text: 'Platelets are adequate', adequate: true },
    { value: 'thrombocytopenia', label: 'Thrombocytopenia', text: 'thrombocytopenia', low: true },
    { value: 'thrombocytosis',   label: 'Thrombocytosis',   text: 'thrombocytosis', high: true }
];

const pbPltMorphology = [
    { value: 'unremarkable', label: 'Unremarkable morphology' },
    { value: 'largePlt',     label: 'Occasional large platelets' }
];

// The original's setting8 / setting9, same labels and same asymmetry as the
// haemoglobin and neutrophil pairs.
const PB_PLT_ALWAYS = 'pbPltAlways';
const PB_PLT_ABNORMAL = 'pbPltAbnormal';
const PB_PLT_LOW = 'pbPltRangeLow';
const PB_PLT_HIGH = 'pbPltRangeHigh';


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

function renderPBPltPanel() {
    const panel = document.getElementById('findingsPanel');
    if (!panel) return;

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">Platelets</div>
            <div class="findingGrid">
                ${pbFindingRow('Count', `<span class="chipGroup">${pbChipsFor('pbPltQuantity', pbPltQuantity)}</span>`)}
                ${pbFindingRow('Morphology', `<span class="chipGroup">${pbChipsFor('pbPltMorphology', pbPltMorphology)}</span>`)}
                ${pbFindingRow('Clumping',
                    `<input type="checkbox" class="chipInput form" id="pbPltClumping">` +
                    `<label class="chip" for="pbPltClumping">Present</label>`)}
            </div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Additional (platelets)</div>
            <textarea class="textBox form" id="pbPltOther" rows="2" spellcheck="true"
                      placeholder="Appended to the platelet line verbatim"></textarea>
        </div>`);
}

function renderPBPltSettings() {
    const panel = document.getElementById('pbReportSettingsPanel');
    if (!panel) return;

    const range = function (id, label, value) {
        return `<div class="findingLabel">${label}</div>
            <div class="thresholdRow">
                <input type="number" class="thresholdInput setting" id="${id}" step="1" value="${value}">
                <span class="thresholdUnit">K/uL</span>
            </div>`;
    };

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">Platelets</div>
            <div class="toggleFieldRow">${toggleFieldHTML(PB_PLT_ALWAYS, 'Always include the platelet count')}</div>
            <div class="toggleFieldRow">${toggleFieldHTML(PB_PLT_ABNORMAL, 'Include the platelet count when abnormal')}</div>
            ${/* The reference range the mild/marked multipliers are read against —
                  see the header. The original took this from the pasted CBC and
                  never had to ask. */''}
            <div class="findingGroup"><div class="findingGrid">
                ${range(PB_PLT_LOW, 'Reference low', '150')}
                ${range(PB_PLT_HIGH, 'Reference high', '450')}
            </div></div>
        </div>`);

    [PB_PLT_ALWAYS, PB_PLT_ABNORMAL].forEach(function (id) {
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

/* 'Mild ' / 'Marked ' / '' — the grade the count earns, or none where there is
   no count to earn it. Returns the word capitalised, because it leads the
   sentence; the bare finding is capitalised by pbPltLine instead. */
function pbPltGrade(option) {
    const value = typeof cbcValue === 'function' ? cbcValue('PLT') : NaN;
    if (isNaN(value)) return '';

    const low = parseFloat(getSetting(PB_PLT_LOW, '150'));
    const high = parseFloat(getSetting(PB_PLT_HIGH, '450'));

    if (option.low) {
        if (value > 0.9 * low) return 'Mild ';
        if (value < 0.2 * low) return 'Marked ';
    } else if (option.high) {
        if (value > 2 * high) return 'Marked ';
        if (value < 1.1 * high) return 'Mild ';
    }
    return '';
}

function pbPltLine() {
    const chosen = toggleGroupValue('pbPltQuantity');
    const option = pbPltQuantity.filter(function (o) { return o.value === chosen; })[0];
    const clumping = document.getElementById('pbPltClumping')?.checked
        ? ' Platelet clumping is present. See comment.' : '';
    const other = document.getElementById('pbPltOther')?.value.trim() || '';

    if (!option) return [clumping.trim(), other].filter(Boolean).join(' ');

    const show = option.adequate
        ? getSetting(PB_PLT_ALWAYS, false)
        : (getSetting(PB_PLT_ALWAYS, false) || getSetting(PB_PLT_ABNORMAL, false));

    const grade = option.adequate ? '' : pbPltGrade(option);
    // Capitalised by the grade when there is one, by the finding when there is not.
    let text = grade
        ? grade + option.text
        : option.text.charAt(0).toUpperCase() + option.text.slice(1);

    /* RAW, not to one decimal, and that is the original's — every white cell
       count goes through toFixed(1) there ("0.4 K/uL") and the platelet count
       does not ("42 K/uL"), because a platelet count is reported in whole
       thousands and "42.0" claims a precision the analyser did not report. */
    const plt = typeof cbcResult === 'function' ? cbcResult('PLT') : null;
    if (show && plt) text += ` (${plt.value} K/uL)`;

    const morphology = toggleGroupValue('pbPltMorphology');
    if (morphology === 'unremarkable') {
        /* One word apart, and the original's: an adequate count says
           "unremarkable morphology", an abnormal one "unremarkable platelet
           morphology". */
        text += option.adequate ? ' with unremarkable morphology.' : ' with unremarkable platelet morphology.';
    } else if (morphology === 'largePlt') {
        text += ' with occasional large platelets.';
    } else {
        text += '.';
    }

    return [text + clumping, other].filter(Boolean).join(' ');
}


/* ----------------------------------------------------------------------------
   Readers for the comment gates
-------------------------------------------------------------------------- */

function pbPltType() { return toggleGroupValue('pbPltQuantity'); }
function pbPltClumping() { return !!document.getElementById('pbPltClumping')?.checked; }


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */

renderPBPltSettings();
applySettings();
renderPBPltPanel();

pbFinalBlocks.push(pbPltLine);

document.getElementById('findingsPanel')?.addEventListener('input', function (e) {
    if (e.target.id === 'pbPltOther') fillReport();
});

/* The reference range lives in the settings panel, which this listener does not
   cover — a change there must still rebuild, since it can move a grade. */
document.getElementById('settingPanel')?.addEventListener('input', function (e) {
    if (e.target.id === PB_PLT_LOW || e.target.id === PB_PLT_HIGH) fillReport();
});
