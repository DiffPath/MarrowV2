/* ============================================================================
   PBWbc.js — the white cell block of the Findings page, and the white cell part
   of the final diagnosis.

   Ported from pbnorthwest.html: the WBC1-WBC12 rows of #descriptionPanel and the
   neutrophil / blast / lymphocyte / monocyte / eosinophil / basophil branches of
   fillFinal() (lines 1916-2200). Every report string is that file's, verbatim.

   FOUR BLOCKS IN ONE, in the original's order: blasts, then neutrophils, then
   lymphocytes, then the three automatic lines (monocytosis, eosinophilia,
   basophilia). They print as separate paragraphs, which is what the original's
   <br><br> between them meant.

   ---------------------------------------------------------------------------
   DELIBERATE DEVIATIONS.

     - THE THREE QUANTITY ROWS ARE TOGGLE GROUPS, so the original's three
       "***Incompatible … Characteristics***" strings cannot reach a report. See
       the same note in PBRbc.js.

     - MONOCYTOSIS / EOSINOPHILIA / BASOPHILIA ARE AUTOFILLED FROM THE CBC'S OWN
       FLAG, not from its reference range. The original read `cbcArray[i][3]`,
       the high end of the range Epic printed, and compared the value to it. This
       app's parser keeps Epic's High/Low FLAG instead, which is the same
       judgement made by the same lab and survives a range the parser did not
       manage to read. `cbcFlagged()` is the marrow Blood tab's reader for
       exactly this.

     - THE BLAST LINE LOSES A SPACE. The original built "Blasts are present " +
       "(5%) " + ". See comment." — a space before the full stop, on every case
       that entered a percentage. Whitespace is the one sanctioned deviation
       (CLAUDE.md); the words and the percentage are untouched.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Data
-------------------------------------------------------------------------- */

const pbNeutQuantity = [
    { value: 'adequate',     label: 'Adequate',     text: 'Neutrophils are adequate', adequate: true },
    { value: 'neutrophilia', label: 'Neutrophilia', text: 'Absolute neutrophilia' },
    { value: 'neutropenia',  label: 'Neutropenia',  text: 'Absolute neutropenia' }
];

/* The morphology row. "Unremarkable morphology" is a stop chip — it means the
   absence of the others — and prints its own sentence rather than joining the
   list, which is how the original had it. */
const pbNeutMorphology = [
    { id: 'pbNeutUnremarkable', label: 'Unremarkable morphology', stop: true },
    { id: 'pbNeutToxic',        label: 'Toxic changes',      text: 'toxic changes' },
    { id: 'pbNeutShift',        label: 'Shift to immaturity', text: 'a shift to immaturity' },
    { id: 'pbNeutHypolobated',  label: 'Hypolobated nuclei', text: 'hypolobated nuclei' },
    { id: 'pbNeutHypogranular', label: 'Hypogranular forms', text: 'hypogranular forms' }
];

/* The lymphocyte row. Each lymphocytosis carries its own whole sentence — they
   are four different claims about the population, not one claim with a
   qualifier, which is why they are not a severity. */
const pbLymphQuantity = [
    { value: 'lymphopenia',  label: 'Lymphopenia',  text: 'Absolute lymphopenia', bare: true },
    { value: 'unspecified',  label: 'Lymphocytosis', text: 'Absolute lymphocytosis', plain: true },
    { value: 'smallLarge',   label: 'Small mature + LGL',
      text: 'consisting of small mature lymphocytes and large granular lymphocytes.' },
    { value: 'reactive',     label: 'Reactive',
      text: 'consisting of a heterogenous population of lymphocytes including small mature lymphocytes, large granular lymphocytes, and activated lymphocytes.' },
    { value: 'neoplastic',   label: 'Neoplastic',
      text: 'consisting of a population of predominantly small to medium-sized lymphocytes with clumped chromatin. See comment.' }
];

/* The three lines the CBC fills in by itself. `flagOf` is the component whose
   High flag turns the chip on. */
const pbAutoLines = [
    { id: 'pbMonocytosis',  label: 'Monocytosis',  component: 'Absolute Monocytes',
      setting: 'pbMonoValue', text: 'Absolute monocytosis', tail: ' with mature-appearing morphology.' },
    { id: 'pbEosinophilia', label: 'Eosinophilia', component: 'Absolute Eosinophils',
      setting: 'pbEosValue',  text: 'Absolute eosinophilia', tail: '.' },
    { id: 'pbBasophilia',   label: 'Basophilia',   component: 'Absolute Basophils',
      setting: 'pbBasoValue', text: 'Absolute basophilia',   tail: '.' }
];

// The original's setting3 / setting4, same labels, same non-exclusive meaning.
const PB_NEUT_ALWAYS = 'pbNeutAlways';
const PB_NEUT_ABNORMAL = 'pbNeutAbnormal';
const PB_LYMPH_VALUE = 'pbLymphValue';


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

function pbChipsFor(group, options) {
    return options.map(function (option) {
        return `<input type="checkbox" class="chipInput form" id="${group}_${option.value}"` +
            ` value="${option.value}" data-toggle="${group}">` +
            `<label class="chip" for="${group}_${option.value}">${option.label}</label>`;
    }).join('');
}

function renderPBWbcPanel() {
    const panel = document.getElementById('findingsPanel');
    if (!panel) return;

    const morphology = pbNeutMorphology.map(function (option) {
        const stop = option.stop ? ' data-stop' : '';
        return `<input type="checkbox" class="chipInput form" id="${option.id}"` +
            ` data-stopgroup="pbNeutMorph"${stop}>` +
            `<label class="chip" for="${option.id}">${option.label}</label>`;
    }).join('');

    const auto = pbAutoLines.map(function (line) {
        return `<input type="checkbox" class="chipInput form" id="${line.id}">` +
            `<label class="chip" for="${line.id}">${line.label}</label>`;
    }).join('');

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">White cells</div>
            <div class="findingGrid">
                ${pbFindingRow('Blasts', `<span class="chipWrap">` +
                    `<input type="checkbox" class="chipInput form" id="pbBlast">` +
                    `<label class="chip" for="pbBlast">Present</label></span>` +
                    `<span class="cellField"><input type="text" inputmode="decimal" maxlength="4"` +
                    ` class="cellNum form" id="pbBlastCount"><span class="stainPctLabel">%</span></span>`)}
                ${pbFindingRow('Neutrophils', `<span class="chipGroup">${pbChipsFor('pbNeutQuantity', pbNeutQuantity)}</span>`)}
                ${pbFindingRow('Morphology', morphology)}
                ${pbFindingRow('Lymphocytes', `<span class="chipGroup">${pbChipsFor('pbLymphQuantity', pbLymphQuantity)}</span>`)}
                ${pbFindingRow('Other lineages', auto)}
            </div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Additional (white cells)</div>
            <textarea class="textBox form" id="pbWbcOther" rows="2" spellcheck="true"
                      placeholder="Appended to the white cell lines verbatim"></textarea>
        </div>`);
}

function renderPBWbcSettings() {
    const panel = document.getElementById('pbReportSettingsPanel');
    if (!panel) return;

    const rows = [
        [PB_NEUT_ALWAYS, 'Always include the neutrophil count'],
        [PB_NEUT_ABNORMAL, 'Include the neutrophil count when abnormal'],
        [PB_LYMPH_VALUE, 'Include the lymphocyte count'],
        ['pbMonoValue', 'Include the monocyte count'],
        ['pbEosValue', 'Include the eosinophil count'],
        ['pbBasoValue', 'Include the basophil count']
    ].map(function (row) {
        return `<div class="toggleFieldRow">${toggleFieldHTML(row[0], row[1])}</div>`;
    }).join('');

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock"><div class="fieldLabel">White cells</div>${rows}</div>`);

    // `setting`, not `form` — see the same swap in PBRbc.js.
    ['pbMonoValue', 'pbEosValue', 'pbBasoValue', PB_NEUT_ALWAYS, PB_NEUT_ABNORMAL, PB_LYMPH_VALUE]
        .forEach(function (id) {
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

/* " (2.1 K/uL)" or ''. One helper for every white cell line, since they all
   append the same parenthetical off the same parsed CBC. */
function pbCountValue(component, show) {
    if (!show) return '';
    const value = typeof cbcValue === 'function' ? cbcValue(component) : NaN;
    return isNaN(value) ? '' : ` (${value.toFixed(1)} K/uL)`;
}

function pbBlastLine() {
    if (!document.getElementById('pbBlast')?.checked) return '';
    const percent = document.getElementById('pbBlastCount')?.value.trim() || '';
    // The lost space is here: the original put one before the full stop.
    return `Blasts are present${percent ? ` (${percent}%)` : ''}. See comment.`;
}

function pbNeutLine() {
    const chosen = toggleGroupValue('pbNeutQuantity');
    const option = pbNeutQuantity.filter(function (o) { return o.value === chosen; })[0];
    const unremarkable = document.getElementById('pbNeutUnremarkable')?.checked;

    const parts = [];

    if (option) {
        /* Adequate takes the count only on "always"; the two abnormal lines take
           it on either setting. That asymmetry is the original's and is the whole
           difference between the two switches. */
        const show = option.adequate
            ? getSetting(PB_NEUT_ALWAYS, false)
            : (getSetting(PB_NEUT_ALWAYS, false) || getSetting(PB_NEUT_ABNORMAL, false));

        let line = option.text + pbCountValue('Absolute Neutrophils', show);

        /* "Neutrophils are adequate and show unremarkable morphology." — the one
           place the two rows share a sentence, because "adequate" is already
           about the neutrophils and a second sentence would name them twice. */
        if (option.adequate && unremarkable) line += ' and show unremarkable morphology';
        parts.push(line + '.');
    }

    if (unremarkable && !(option && option.adequate)) {
        parts.push('Neutrophils show unremarkable morphology.');
    } else if (!unremarkable) {
        const named = pbNeutMorphology
            .filter(function (o) { return o.text && document.getElementById(o.id)?.checked; })
            .map(function (o) { return o.text; });
        if (named.length) parts.push(`Neutrophils show ${addCommas(named)}.`);
    }

    return parts.join(' ');
}

function pbLymphLine() {
    const chosen = toggleGroupValue('pbLymphQuantity');
    const option = pbLymphQuantity.filter(function (o) { return o.value === chosen; })[0];
    if (!option) return '';

    const value = pbCountValue('Absolute Lymphocytes', getSetting(PB_LYMPH_VALUE, false));

    // Lymphopenia and a bare lymphocytosis are whole sentences; the three
    // populations are a stem plus their own "consisting of …".
    if (option.bare || option.plain) return option.text + value + '.';
    return `Absolute lymphocytosis${value} ${option.text}`;
}

/* The three automatic lines, each its own paragraph exactly as the original's
   <br><br> made them. */
function pbAutoLineTexts() {
    return pbAutoLines
        .filter(function (line) { return document.getElementById(line.id)?.checked; })
        .map(function (line) {
            return line.text + pbCountValue(line.component, getSetting(line.setting, false)) + line.tail;
        });
}

/* Every white cell paragraph, in the original's order. Returned as an ARRAY
   rather than joined, because these are separate paragraphs where the red cell
   sentences were one — the original separated them with <br><br> and ran the red
   cell ones together with spaces. */
function pbWbcBlocks() {
    const other = document.getElementById('pbWbcOther')?.value.trim() || '';
    return [pbBlastLine(), pbNeutLine(), pbLymphLine()]
        .concat(pbAutoLineTexts())
        .concat(other)
        .filter(Boolean);
}


/* ----------------------------------------------------------------------------
   Readers for the comment gates
-------------------------------------------------------------------------- */

function pbNeutType() { return toggleGroupValue('pbNeutQuantity'); }
function pbLymphType() { return toggleGroupValue('pbLymphQuantity'); }
function pbBlastsPresent() { return !!document.getElementById('pbBlast')?.checked; }
function pbNeutMorphOn(id) { return !!document.getElementById(id)?.checked; }


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */

renderPBWbcSettings();
applySettings();
renderPBWbcPanel();

/* Appended to the final diagnosis the red cell block registered. Each lineage
   contributes its own paragraphs and knows nothing about the others. */
pbFinalBlocks.push(pbWbcBlocks);

/* A pasted CBC answers the three automatic lines, exactly as the original did —
   on the lab's own High flag rather than on a threshold this app invented. It
   only ever TICKS: clearing one is the pathologist's call, and a re-paste must
   not undo it. */
document.addEventListener('cbcParsed', function () {
    pbAutoLines.forEach(function (line) {
        if (typeof cbcFlagged === 'function' && cbcFlagged(line.component, 'high')) {
            const chip = document.getElementById(line.id);
            if (chip) chip.checked = true;
        }
    });
});

document.getElementById('findingsPanel')?.addEventListener('input', function (e) {
    if (e.target.id === 'pbWbcOther' || e.target.id === 'pbBlastCount') fillReport();
});
