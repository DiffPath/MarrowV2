/* ============================================================================
   MarrowSpec.js — the Specimen tab.

   Template for every other input tab: a data table at the top, a render
   function that builds the form from it, a fill function that reads the DOM
   back into report prose, and a registration line at the bottom.

   Clinical strings are quoted verbatim from the original app
   (../Marrow/MarrowText.js:333-356). Wording, singular/plural, and
   punctuation are all meaningful — do not tidy them.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Data

   specParts order IS the report order (core biopsy always last). Each part's
   checkbox label and its report phrase differ on purpose.
-------------------------------------------------------------------------- */
const specParts = [
    { id: 'specPB',  label: 'Peripheral blood',   phrase: 'peripheral blood smear' },
    { id: 'specAsp', label: 'Aspirate smears',    phrase: 'bone marrow aspirate' },
    { id: 'specTP',  label: 'Touch preparations', phrase: 'touch preparations' },
    { id: 'specPC',  label: 'Particle clot',      phrase: 'particle clot' },
    { id: 'specCB',  label: 'Core biopsy',        phrase: null }   // laterality-dependent
];

/* Laterality qualifies the core biopsy phrase only; the other parts never
   carry a side. The site is always the posterior iliac crest. */
const lateralityOptions = [
    { id: 'latLeft',         label: 'Left',          corePhrase: 'left posterior iliac crest bone marrow core biopsy' },
    { id: 'latRight',        label: 'Right',         corePhrase: 'right posterior iliac crest bone marrow core biopsy' },
    { id: 'latBilateral',    label: 'Bilateral',     corePhrase: 'bilateral posterior iliac crest bone marrow core biopsies' },
    { id: 'latNotSpecified', label: 'Not specified', corePhrase: 'posterior iliac crest bone marrow core biopsy' }
];

/* No laterality picked reads the same as "Not specified". */
const DEFAULT_CORE_PHRASE = 'posterior iliac crest bone marrow core biopsy';

/* The 11 template types are a matrix, not a flat list: 5 entities x 2 contexts,
   plus a default. Declaring them that way keeps the UI one click deep and means
   a new entity is one more column, not two more list items.

   A type's value is context.prefix + entity.key ('ruleOut' + 'MDS'), which is
   the key templateTypeHighlights in MarrowReport.js is written against.

   ORDER IS CLINICAL, not alphabetical: MPN sits beside MDS because they are the
   two chronic myeloid workups and are picked between, and the pair sits between
   the plasma cell and acute leukemia columns. */
const templateDefault = { value: 'general', label: 'General marrow' };

const templateEntities = [
    { key: 'PlasmaCell', label: 'Plasma cell neoplasm' },
    { key: 'MDS',        label: 'MDS' },
    { key: 'MPN',        label: 'MPN' },
    { key: 'AcuteLeuk',  label: 'Acute leukemia' },
    { key: 'Lymphoma',   label: 'Lymphoma' }
];

const templateContexts = [
    { prefix: 'ruleOut', label: 'Rule out' },
    { prefix: 'history', label: 'History of' }
];


/* ----------------------------------------------------------------------------
   Render

   Every string interpolated below is our own static data. User-entered text is
   never passed through innerHTML — the CBC box is read via .value and never
   re-rendered.

   chipHTML() and addCommas() moved to MarrowForm.js when the Blood tab became
   their second caller — the move their comments here always called for.
-------------------------------------------------------------------------- */

function renderSpecPanel() {
    const panel = document.getElementById('specPanel');
    if (!panel) return;

    // Template matrix: a row per context, a column per entity. Each cell wraps
    // its own input+label so the grid items are cells, not raw inputs, and
    // carries .matrixCell so its chip fills the cell (see Template.css — the
    // class is what keeps that rule off chips that merely sit inside a matrix).
    const matrixRows = templateContexts.map(function (context) {
        const cells = templateEntities.map(function (entity) {
            const value = context.prefix + entity.key;
            return `<div class="matrixCell">${chipHTML('radio', 'templateType', 'tt' + value, value, entity.label, 'templateType')}</div>`;
        }).join('');
        return `<div class="chipMatrixLabel">${context.label}</div>${cells}`;
    }).join('');

    const partChips = specParts.map(function (part) {
        return chipHTML('checkbox', '', part.id, '', part.label, 'specimen');
    }).join('');

    /* One radio group, so ONE segmented control — the same .chipGroup the
       toggle-row helpers wrap theirs in, applied here by hand because these chips
       come from chipHTML() rather than from one of those helpers.

       The Specimens row is deliberately NOT wrapped: those are multi-select
       checkboxes, and connecting them would draw a promise of exclusivity they do
       not have. Exclusive is the whole test — see .chipGroup in Template.css. */
    /* data-key hangs the template-type highlight cue on the group — the same
       contract as every boxed control (see templateTypeHighlights in
       MarrowReport.js); 'laterality' is in HL_BASE, so it cues on every workup
       and clears when a side is picked. On the GROUP, not the row: the cue
       boxes the controls, never the label. */
    const lateralityChips = `<span class="chipGroup" data-key="laterality">${lateralityOptions.map(function (option) {
        return chipHTML('radio', 'laterality', option.id, '', option.label, 'laterality');
    }).join('')}</span>`;

    panel.innerHTML = `
        <div class="fieldBlock">
            <div class="fieldLabel">Template</div>
            <div class="chipRow" style="margin-bottom: 8px">
                ${chipHTML('radio', 'templateType', 'tt' + templateDefault.value, templateDefault.value, templateDefault.label, 'templateType')}
            </div>
            <div class="chipMatrix" style="grid-template-columns: repeat(${templateEntities.length + 1}, auto)">
                ${matrixRows}
            </div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Specimens</div>
            <div class="chipRow">
                ${chipHTML('checkbox', '', 'specAll', '', 'All', 'toggle')}
                <span class="chipDivider"></span>
                ${partChips}
            </div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Laterality</div>
            <div class="chipRow">
                ${lateralityChips}
            </div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">CBC</div>
            <div class="pbCBC">
                <textarea class="textBox noSave" id="pbCBC" rows="4" placeholder="Paste CBC here"
                          spellcheck="false"></textarea>
            </div>
        </div>`;

    document.getElementById('tt' + templateDefault.value).checked = true;

    // "All specimens" drives the five parts; the parts drive it back. Both
    // listeners live here rather than in the delegated .form handler because
    // they mutate other controls before the report is rebuilt.
    document.getElementById('specAll')?.addEventListener('change', function () {
        const checked = this.checked;
        specParts.forEach(function (part) {
            const el = document.getElementById(part.id);
            if (el) el.checked = checked;
        });
    });

    document.querySelectorAll('.specimen').forEach(function (el) {
        el.addEventListener('change', syncSpecAll);
    });
}

/* The selected template type, e.g. 'ruleOutMDS'. The canonical reader — other
   files should call this rather than reach for the radios. */
function currentTemplateType() {
    return document.querySelector('input[name="templateType"]:checked')?.value || templateDefault.value;
}

/* "All specimens" is derived, never independently meaningful: checked when all
   five are, indeterminate when only some are. */
function syncSpecAll() {
    const specAll = document.getElementById('specAll');
    if (!specAll) return;

    const checkedCount = specParts.filter(function (part) {
        return document.getElementById(part.id)?.checked;
    }).length;

    specAll.checked = checkedCount === specParts.length;
    specAll.indeterminate = checkedCount > 0 && checkedCount < specParts.length;
}

/* Applies the "start with all parts checked" preference. Called once at load;
   a future New Marrow button is the other caller. */
function resetSpecimenDefaults() {
    const checked = getSetting('specDefaultAll', true);
    specParts.forEach(function (part) {
        const el = document.getElementById(part.id);
        if (el) el.checked = checked;
    });
    syncSpecAll();
}


/* ----------------------------------------------------------------------------
   Report text
-------------------------------------------------------------------------- */

function coreBiopsyPhrase() {
    const selected = lateralityOptions.find(function (option) {
        return document.getElementById(option.id)?.checked;
    });
    return selected ? selected.corePhrase : DEFAULT_CORE_PHRASE;
}

/* The report's header line. The "A, B: " part prefix is fixed, matching the
   original app — it does not vary with which parts are checked. */
function fillSpecimen() {
    const specArray = [];

    specParts.forEach(function (part) {
        if (!document.getElementById(part.id)?.checked) return;
        specArray.push(part.id === 'specCB' ? coreBiopsyPhrase() : part.phrase);
    });

    const specText = addCommas(specArray);
    if (specText === '') return '';

    // REPORT_PARAGRAPH (MarrowReport.js) is the inline Word styling that makes
    // a copied report paste correctly into Epic/Word — one copy of the bytes,
    // rather than one per tab to keep byte-exact by hand.
    return `
        <p style="${REPORT_PARAGRAPH}">
            <b>A, B: ${specText.charAt(0).toUpperCase()}${specText.slice(1)}:</b>
        </p>`;
}


registerReportSection({ id: 'spec', fill: fillSpecimen });
renderSpecPanel();
resetSpecimenDefaults();
