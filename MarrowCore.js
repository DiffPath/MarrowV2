/* ============================================================================
   MarrowCore.js — the Core biopsy tab (#corePanel).

   No differential counter — a core biopsy is a section, not a smear, so this tab
   is findings only: adequacy, cellularity, the two big precursor compartments,
   megakaryocytes, lymphocyte distribution, and the particle clot. Two report
   sections: `core` (the biopsy) and `clot` (the particle clot, its own specimen).

   Clinical data and every report string are the original app's, verbatim
   (../Marrow/MarrowData.js:212-285, ../Marrow/MarrowText.js:1786-1910,
   ../Marrow/BoneMarrow.html:551-641). The LAYOUT is not — see MarrowBlood.js.

   TWO KNOWING DEVIATIONS from the original, both flagged in CLAUDE.md:

     - The age-based CELLULARITY AUTO-DERIVATION is not ported. The original set
       hypo/normo/hypercellular from the entered percentage, the patient's age,
       and a per-age threshold table. The rebuilt CBC parser reads only lab rows
       and never the DOB (age is PHI), so there is no age to derive from. The
       report reads the hypo/normo/hyper choice directly, exactly as the original
       did — the auto-derivation only ever *clicked those chips for you*. Made
       manual here; the hook is a future age source, not this file.

     - The adequacy artifacts printed "a shows crush artifact" in the original —
       the article landing in front of the verb (../Marrow/MarrowText.js:40-60).
       Fixed first to "shows a crush artifact"; the author then cut the article
       entirely — artifact is a mass noun, so it is "shows crush artifact".
       Every other original core string is reproduced exactly.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Findings — data
-------------------------------------------------------------------------- */

/* The value IS the report word ("…is overall suboptimal for interpretation"), so
   these three are ordered as they grade. `suboptimal` is the aspirate's middle
   option brought over — a core can be readable but not good, and the original
   offered only the two ends. NEW TEXT, no original to port: the sentence is the
   adequate/inadequate one with the word swapped, NOT the aspirate's "suboptimal
   for evaluation, limiting the accuracy of a differential count" — a core carries
   no differential for the limitation to be about. */
const coreAdequacy = [
    { label: 'Adequate', value: 'adequate' },
    { label: 'Suboptimal', value: 'suboptimal' },
    { label: 'Inadequate', value: 'inadequate' }
];

/* Hypo/normo/hyper, graded with adverbs ("mildly hypocellular"). Normocellular
   takes no grade — see coreCellularityText(). */
const coreCellularityOptions = [
    { label: 'Hypocellular', value: 'hypocellular' },
    { label: 'Normocellular', value: 'normocellular' },
    { label: 'Hypercellular', value: 'hypercellular' }
];
const coreSeverity = [{ label: 'Mild', value: 'mildly' }, { label: 'Marked', value: 'markedly' }];

/* Low | Normal | High for the megakaryocyte count — the aspirate's question
   (aspLineageCount) asked of the section. Values are the report words the
   sentence interpolates; unlike the aspirate's lineage rows, Normal PRINTS
   ("Megakaryocytes are adequate"), because that is what the aspirate's own
   megakaryocyte row does — meg number is a primary finding, not one the M:E
   ratio already tells.

   The toggle group is named `coreMeg` because MarrowFindings.js already reads
   it by that name (findingMegakaryocytes' `increased`, consulted where the
   aspirate said nothing) — the reader predates the control. */
const coreMegCount = [
    { label: 'Low', value: 'decreased' },
    { label: 'Normal', value: 'adequate' },
    { label: 'High', value: 'increased' }
];

/* "Not increased" / "Increased" for plasma cells — the aspirate's aspIncreased
   asked of the section: nobody reports decreased plasma cells, so two answers,
   not three. */
const coreIncreased = [
    { label: 'Not increased', value: 'adequate' },
    { label: 'Increased', value: 'increased' }
];

/* Particle clot quantity. "only rare" carries its own adverb, as the original's
   value did. `none` is a distinct branch (no particles at all), not a quantity. */
const coreClot = [
    { label: 'None', value: 'none' },
    { label: 'Rare', value: 'only rare' },
    { label: 'Few', value: 'few' }
];

/* Which descriptors each group offers, in dropdown order — the old app's
   per-select lists (coreAdequacyList, coreMEList, coreMegList, coreLymphList)
   minus the leading "". The megakaryocyte list reuses the aspirate keys. */
const coreDescriptorGroups = {
    coreAdequacyDesc: ['crushArtifact', 'aspirationArtifact', 'proceduralArtifact',
                       'fragmented', 'subcortical', 'predominantlySubcortical', 'small'],
    coreMEDesc:       ['coreLeftShiftMyeloid', 'coreLeftShiftErythroid', 'coreErythroidIslands',
                       'coreMegaloblastoid', 'coreIncreasedBlasts'],
    /* The original's six dysplastic descriptors KEEP THEIR ORDER and the
       myeloproliferative ones follow, rather than being interleaved by what part
       of the cell they describe. Interleaving would read better in the dropdown
       and would scatter the six that came from ../Marrow/MarrowData.js, which is
       the order a pathologist coming from that app looks for. One row either way
       — a megakaryocyte's morphology is one question, and an MPN marrow that also
       has micromegakaryocytes must be able to say so. */
    coreMegDesc:      ['widelySeparatedNuclearLobes', 'separationNuclearLobes', 'multinucleation', 'hypolobatedForms',
                       'smallHypolobated', 'micromegakaryocytes', 'largeHypersegmented',
                       'megDenseClusters', 'megLooseClusters', 'megParatrabecular',
                       'megStaghorn', 'megCloudLike', 'megHyperchromatic', 'megPleomorphic',
                       'megBareNuclei', 'megLargeMature'],
    coreLymphDesc:    ['coreLymphScattered', 'coreLymphLooseAgg', 'coreLymphNonparatrabecular',
                       'coreLymphParatrabecular', 'coreLymphMultifocal', 'coreLymphDiffuse'],

    /* The aspirate's plasma keys (aspPlasmaDesc), asked of the section — the
       same question of the same cells, so the SAME KEYS in a second group,
       exactly as the clot lymphocytes reuse the core's. */
    corePlasmaDesc:   ['largeAtypical', 'multinucleation'],

    /* The particle clot asks the same question of the same cells, so it is the
       SAME KEYS in a second group — not a second set of descriptors that would be
       free to drift into different words. This is what "a group is a choice of
       keys, not a copy of the words" is for; both print through coreLymphText(),
       which is why it takes its group as an argument. Trim this list if the clot
       should not be offered all six. */
    coreClotLymphDesc: ['coreLymphScattered', 'coreLymphLooseAgg', 'coreLymphNonparatrabecular',
                        'coreLymphParatrabecular', 'coreLymphMultifocal', 'coreLymphDiffuse']
};


/* ----------------------------------------------------------------------------
   Findings — render
-------------------------------------------------------------------------- */

function coreChecked(id) {
    return document.getElementById(id)?.checked === true;
}

function coreChip(id, label) {
    return `<input type="checkbox" class="chipInput form" id="${id}"><label class="chip" for="${id}">${label}</label>`;
}

function coreToggleRow(group, options, qualifier) {
    const chips = options.map(function (option) {
        const id = group + '_' + option.value.replace(/\s+/g, '_');
        const cls = 'chipInput form' + (qualifier ? ' chipQualInput' : '');
        return `<input type="checkbox" class="${cls}" id="${id}" value="${option.value}" data-toggle="${group}"><label class="chip" for="${id}">${option.label}</label>`;
    }).join('');
    // One group, one segmented control — see .chipGroup in Template.css.
    return chips ? `<span class="chipGroup">${chips}</span>` : '';
}

function coreUnremarkableChip(group) {
    const id = group + 'Unremarkable';
    return `<input type="checkbox" class="chipInput form" id="${id}" data-stopgroup="${group}" data-stop><label class="chip" for="${id}">Unremarkable</label>`;
}

/* A descriptor cell — the stop chip (where a lineage has an "unremarkable"
   sentence) above its growing dropdown list. Adequacy and lymphocytes pass no
   unremarkable: neither has such a sentence. */
function coreMorphCell(group, key, unremarkable) {
    const keyAttr = key ? ` data-key="${key}"` : '';
    return `<div class="matrixMorph"${keyAttr}>${unremarkable ? coreUnremarkableChip(group) : ''}${descriptorListHTML(group)}</div>`;
}

function coreChipSet(key, controls) {
    return `<span class="chipSet" data-key="${key}">${controls}</span>`;
}

/* `ref` is a reference topic id (MarrowRefData.js) — the book icon at the end of
   the row's controls. It goes INSIDE .findingChips rather than beside it: the
   grid has exactly two columns and a third child would start a new row, landing
   the icon in the label column of the row below.

   Never on the .findingLabel. That column is a fixed 108px on this tab, which is
   already the widest in the app because "Myeloid/Erythroid" needs it — an icon
   there would push the longest label onto a second line. */
function coreRow(label, controls, ref) {
    const link = ref ? refLinkHTML(ref) : '';
    return `<div class="findingLabel">${label}</div><div class="findingChips">${controls}${link}</div>`;
}

/* A small percent field: "Absolute [__]%". Text input rather than number so the
   original's exact strings ("~50", "60-80") round-trip; class="form" opts it into
   the live re-render like any chip. */
function coreCellField(label, ids) {
    const box = function (id) { return `<input type="text" inputmode="numeric" maxlength="3" class="cellNum form" id="${id}">`; };
    const body = ids.length === 2 ? `${box(ids[0])}&ndash;${box(ids[1])}` : box(ids[0]);
    return `<label class="cellField">${label} ${body}%</label>`;
}

function renderCorePanel() {
    const panel = document.getElementById('corePanel');
    if (!panel) return;

    panel.innerHTML = `
        <div class="findingGroup">
            <div class="findingGrid">
                ${coreRow('Adequacy',
                    coreChipSet('coreAdequacy', coreToggleRow('coreAdequacy', coreAdequacy)) +
                    coreMorphCell('coreAdequacyDesc', null, false))}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${/* Absolute OR Range — one overall cellularity, two ways to state
                      it, so the "or" is real: editing one clears the other
                      (coreCellExclusive). Variable is a separate statement and
                      sits apart. */
                  coreRow('Cellularity',
                    `<span class="cellPctGroup">${coreCellField('Absolute', ['coreCellAbs'])}` +
                    `<span class="cellOr">or</span>` +
                    `${coreCellField('Range', ['coreCellRangeLow', 'coreCellRangeHigh'])}` +
                    `<span class="cellDivider"></span>` +
                    `${coreCellField('Variable', ['coreCellVarLow', 'coreCellVarHigh'])}</span>`,
                    'cellularity')}
                ${coreRow('Overall',
                    coreChipSet('coreCellularity', coreToggleRow('coreCellularity', coreCellularityOptions) +
                        `<span class="chipGap"></span><span class="chipSub" id="coreCellSeverity">${coreToggleRow('coreCellSev', coreSeverity, true)}</span>`))}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${/* Singular, not the original "Myeloids/Erythroids": that needed
                      113px and ran under its own chips. This is 100.4px and is the
                      longest label in the app — it is why #corePanel overrides
                      --findingLabel to 108px, which is a cost this tab carries
                      alone. Shorten the label before widening that again. */''}
                ${coreRow('Myeloid/Erythroid', coreMorphCell('coreMEDesc', 'coreME', true))}
                ${/* Count and morphology are two questions, so two highlight
                      boxes — the aspirate's megakaryocyte row on the section.
                      Keys follow its split: `coreMeg` is the count, `coreMegMorph`
                      the morphology (as aspMega/aspMegaMorph). */''}
                ${coreRow('Megakaryocytes',
                    coreChipSet('coreMeg', coreToggleRow('coreMeg', coreMegCount) +
                        `<span class="chipGap"></span><span class="chipSub" id="coreMegSeverity">${coreToggleRow('coreMegSev', coreSeverity, true)}</span>`) +
                    coreMorphCell('coreMegDesc', 'coreMegMorph', true), 'megakaryocytes')}
                ${coreRow('Lymphocytes', coreMorphCell('coreLymphDesc', 'coreLymph', false))}
                ${coreRow('Plasma cells',
                    coreChipSet('corePlasma', coreToggleRow('corePlasma', coreIncreased) +
                        `<span class="chipGap"></span><span class="chipSub" id="corePlasmaSeverity">${coreToggleRow('corePlasmaSev', coreSeverity, true)}</span>`) +
                    coreMorphCell('corePlasmaDesc', 'corePlasmaMorph', true))}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${/* One box over both controls — "similar to the core" and how
                      many particles are one description of one specimen, and
                      either answers it. The aspirate's touch-prep row is cued
                      the same way. */''}
                ${coreRow('Particle clot',
                    coreChipSet('coreClot',
                        coreChip('coreClotSimilar', 'Similar to core biopsy') +
                        '<span class="chipGap"></span>' + coreToggleRow('coreClot', coreClot)))}
                ${/* Its OWN row, not another control on the row above: how many
                      particles and what the lymphocytes do are two questions, and
                      a row label answers for everything in its row (the lesson
                      from the aspirate's shared "Counted on"). Labelled "Clot
                      lymphocytes" rather than "Lymphocytes" because the core
                      biopsy's Lymphocytes row is one group up — near enough that
                      two rows of the same name would be read as the same
                      question, and the hairline between them is not a heading. */''}
                ${coreRow('Clot lymphocytes',
                    coreMorphCell('coreClotLymphDesc', 'coreClotLymph', false))}
            </div>
        </div>`;

    Object.keys(coreDescriptorGroups).forEach(function (group) {
        registerDescriptorGroup(group, coreDescriptorGroups[group]);
        renderDescriptorList(group);
    });
}


/* SEVERITIES ARE ALWAYS ON SCREEN NOW — the author's call, replacing
   syncCoreSeverity(), which revealed each grade only once its finding was
   abnormal. The fills read a severity only on the branches that use it, so a
   grade with no count or cellularity picked appears in no report. */


/* ----------------------------------------------------------------------------
   Core settings — the cellularity calculation

   The method and thresholds the autofill grades against. Rendered from this
   table so a threshold and its use cannot disagree. Ported verbatim from
   ../Marrow/BoneMarrow.html:1174-1205 (defaults included).
-------------------------------------------------------------------------- */
const coreCellMethods = ["100 minus patient's age", 'Strict evidence based', 'Hybrid'];

/* Each threshold is "% away from expected" for the 100-minus-age method; strict
   evidence uses fixed per-age cutoffs and reads none of these. */
const coreCellThresholds = [
    { id: 'coreCellMarkedHypo',  label: 'Markedly hypocellular ≥',  value: '30', unit: '% below expected' },
    { id: 'coreCellMildHypoMin', label: 'Mildly hypocellular ≥',    value: '10', unit: '% below expected' },
    { id: 'coreCellMildHypoMax', label: '… but < ',                 value: '15', unit: '% below expected' },
    { id: 'coreCellMildHyperMin',label: 'Mildly hypercellular ≥',   value: '10', unit: '% above expected' },
    { id: 'coreCellMildHyperMax',label: '… but < ',                 value: '15', unit: '% above expected' },
    { id: 'coreCellMarkedHyper', label: 'Markedly hypercellular ≥', value: '30', unit: '% above expected' }
];

function renderCoreSettings() {
    const panel = document.getElementById('coreSettingsPanel');
    if (!panel) return;

    const options = coreCellMethods.map(function (m) {
        return `<option value="${m}">${m}</option>`;
    }).join('');

    const rows = coreCellThresholds.map(function (t) {
        return `<div class="findingLabel">${t.label}</div>
            <div class="thresholdRow">
                <input type="number" class="thresholdInput setting" id="${t.id}" step="1" value="${t.value}">
                <span class="thresholdUnit">${t.unit}</span>
            </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="findingGroup">
            <div class="fieldBlock">
                <div class="fieldLabel">Normal cellularity method</div>
                <select class="select setting form" id="coreCellCalc">${options}</select>
            </div>
        </div>
        <div class="findingGroup">
            <div class="findingGrid">${rows}</div>
        </div>`;

    settingsPanelSave(panel);
}


/* ----------------------------------------------------------------------------
   The cellularity autofill

   Derives hypo/normo/hypercellular (and mild/marked) from the entered
   percentage, the patient's age, and the method + thresholds. Ported from
   ../Marrow/MarrowText.js:1912-2027 (fillCellularity).

   It reads cbcPatientAge() — the age parsed from the CBC's DOB, runtime-only.
   With no age it does nothing and the choice stays manual, exactly as the
   original did for patientAge === -1. The autofill sets the SAME chips the
   pathologist can set by hand; a re-entered percentage overrides a manual pick,
   the objective measure winning, as on the aspirate predominance.

   `a` is the absolute %, `b` the range HIGH, `c` the range LOW — the original's
   letters, kept so the ported comparisons read the same. The variable range is
   deliberately not consulted here; it feeds only the report sentence.
-------------------------------------------------------------------------- */
function coreCellSetting(id, fallback) {
    return parseFloat(getSetting(id, fallback));
}

/* The evidence-based normal cellularity range for an age, from the age-dependent
   normocellularity literature: Wong J, Jackson R, Chen L, et al. Determination of
   age-dependent bone marrow normocellularity. Am J Clin Pathol. 2024;161(2):170-6
   (570 posterior iliac crest biopsies), over the classic Hartsock RJ, Smith EB,
   Petty CS. Am J Clin Pathol. 1965;43:326-31 anterior iliac crest series.

   THE BAND MIDPOINTS ARE THE REPORTED MEANS FOR THE THREE ADULT BANDS AND NOT
   FOR THE YOUNGEST. Reported means are 72.8 / 56.5 / 50.7-54.4 / 43.2-44.7%, so
   the midpoints (65 / 55 / 50 / 45) match the adult bands closely and overstate
   the decline under 20 by nearly eight points. This comment previously claimed
   the identity held for all four, and attributed the paper to the wrong first
   author; the ranges themselves are the paper's and are unchanged. The hybrid
   method below averages against the MIDPOINT, so a young patient's expected
   cellularity is a little low — see the reference section's Marrow cellularity
   topic, which prints the paper's own means.

   Lower bound INCLUSIVE — a patient exactly 40.0 years old sits in the 40-60
   band, not 20-40, and 60.0 in the >60 band. This is a deliberate change from the
   original, which used `<=` and put the boundary age in the younger band; the
   boundary age belongs to the older band (see CLAUDE.md). Age is whole years, so
   39y364d parses to 39 and lands in 20-40, while 40y0d parses to 40 and lands in
   40-60, which is exactly the intended split. */
function coreCellBand(age) {
    return age < 20 ? [45, 85] : age < 40 ? [40, 70] : age < 60 ? [35, 65] : [30, 60];
}

/* Which chips a result implies, as {value, grade}. */
function coreCellDerive(a, b, c, age) {
    const method = getSetting('coreCellCalc', coreCellMethods[0]);

    /* Two POINT methods share one grading ladder, differing only in the expected
       normal cellularity the entered percentage is graded against:

         100 minus age -> expected = 100 - age (the traditional rule)
         Hybrid        -> expected = the average of that rule and the evidence-
                          based MEAN for the age (the band's midpoint)

       The hybrid moderates the rule's known overestimate of decline in the
       elderly (AJCP 2024: real cellularity falls ~3%/decade, not 10%). At age 70
       the rule says 30% and the evidence mean is 45%, so the hybrid expects
       ~37.5% — between the two, which is the whole point of "an average". */
    if (method === "100 minus patient's age" || method === 'Hybrid') {
        let expected = 100 - age;
        if (method === 'Hybrid') {
            const band = coreCellBand(age);
            expected = (expected + (band[0] + band[1]) / 2) / 2;
        }

        const x = expected - a, y = expected - b, z = expected - c;
        const mHypo = coreCellSetting('coreCellMarkedHypo', '30');
        const mildHypoMin = coreCellSetting('coreCellMildHypoMin', '10');
        const mildHypoMax = coreCellSetting('coreCellMildHypoMax', '15');
        const mildHyperMin = coreCellSetting('coreCellMildHyperMin', '10');
        const mildHyperMax = coreCellSetting('coreCellMildHyperMax', '15');
        const mHyper = coreCellSetting('coreCellMarkedHyper', '30');

        // Order is load-bearing — an if/else ladder from most-hypo to most-hyper.
        // `a` OR the range endpoint (b for the hypo side, c for the hyper side)
        // can trip a band, so a range that straddles a cutoff is graded by its
        // worse edge. The ladder is the original's; only `expected` is new.
        if (x >= mHypo || y >= mHypo) return { value: 'hypocellular', grade: 'markedly' };
        if (x >= mildHypoMax || y >= mildHypoMax) return { value: 'hypocellular', grade: '' };
        if (x >= mildHypoMin || y >= mildHypoMin) return { value: 'hypocellular', grade: 'mildly' };
        if (x >= mildHyperMin * -1 || z >= mildHyperMin * -1) return { value: 'normocellular', grade: '' };
        if (x >= mildHyperMax * -1 || z >= mildHyperMax * -1) return { value: 'hypercellular', grade: 'mildly' };
        if (x >= mHyper * -1 || z >= mHyper * -1) return { value: 'hypercellular', grade: '' };
        if (x <= mHyper * -1 || z <= mHyper * -1) return { value: 'hypercellular', grade: 'markedly' };
        return { value: '', grade: '' };
    }

    if (method === 'Strict evidence based') {
        // The hard age-band cutoffs; no mild/marked grade.
        const band = coreCellBand(age);
        if (a < band[0] || b < band[0]) return { value: 'hypocellular', grade: '' };
        if (a > band[1] || c > band[1]) return { value: 'hypercellular', grade: '' };
        return { value: 'normocellular', grade: '' };
    }

    return null;   // unknown method: leave the chips alone
}

/* Absolute and range are two ways to say the SAME thing — the overall
   cellularity — so only one may be filled. (The variable range is a different
   statement, how much the cellularity *varies*, and is left alone.) Editing one
   clears the other, so the two can never both hold a value: last edited wins,
   which is what "choose one" means without a mode toggle or a disabled field.

   Called before syncCoreCellularity reads the fields, so the cleared side reads
   as empty and its red state (if any) is dropped with it. */
function coreCellExclusive(edited) {
    const clearFields = function (ids) {
        ids.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('cellNumBad'); }
        });
    };
    if (edited.id === 'coreCellAbs' && edited.value !== '') {
        clearFields(['coreCellRangeLow', 'coreCellRangeHigh']);
    } else if ((edited.id === 'coreCellRangeLow' || edited.id === 'coreCellRangeHigh') && edited.value !== '') {
        clearFields(['coreCellAbs']);
    }
}

function syncCoreCellularity() {
    const a = coreNum('coreCellAbs');
    const b = coreNum('coreCellRangeHigh');
    const c = coreNum('coreCellRangeLow');

    // Validation: any percentage outside 0-100, or a range whose low exceeds its
    // high, is invalid — the field goes red and nothing is derived. Matches the
    // original's toggle (../Marrow/MarrowText.js:1922-1936).
    let invalid = false;
    document.querySelectorAll('#corePanel .cellNum').forEach(function (el) {
        const v = parseFloat(el.value);
        const bad = el.value !== '' && (isNaN(v) || v < 0 || v > 100);
        el.classList.toggle('cellNumBad', bad);
        if (bad) invalid = true;
    });
    if (coreIsNum(b) && coreIsNum(c) && c > b) {
        document.getElementById('coreCellRangeLow')?.classList.add('cellNumBad');
        document.getElementById('coreCellRangeHigh')?.classList.add('cellNumBad');
        invalid = true;
    }

    const noNumbers = !coreIsNum(a) && !coreIsNum(b) && !coreIsNum(c);
    const age = cbcPatientAge();

    if (noNumbers || invalid) {
        // No percentage, or a bad one — clear the derived choice.
        clearToggleGroup('coreCellularity');
        clearToggleGroup('coreCellSev');
    } else if (age !== null && age !== undefined) {
        const result = coreCellDerive(a, b, c, age);
        if (result) {   // null (Hybrid) leaves the chips untouched
            if (result.value) setToggleGroup('coreCellularity', result.value);
            else clearToggleGroup('coreCellularity');
            if (result.grade) setToggleGroup('coreCellSev', result.grade);
            else clearToggleGroup('coreCellSev');
        }
    }
    // numbers present but no age: leave the manual choice alone (original did too).

    fillReport();
}


/* ----------------------------------------------------------------------------
   Findings — report text

   Every string is quoted from ../Marrow/MarrowText.js:1786-1910. One function per
   sentence, '' when it has nothing to say.
-------------------------------------------------------------------------- */

/* " markedly" / "" — the space belongs to the qualifier, not to the sentence
   around it, which is what lets the sentence read the same either way. The
   aspirate's aspGrade, and this file may not reach into that one. */
function coreGrade(group) {
    const value = toggleGroupValue(group);
    return value ? ' ' + value : '';
}

/* "Multinucleation are seen" is not a sentence: a mass noun cannot be a plural
   subject, and the plasma branch is the only place one is promoted to one. The
   aspirate's aspPluralSubject/aspCapitalize, per-file like coreGrade. */
function corePluralSubject(s) {
    return s ? s.replace(/\bmultinucleation\b/gi, 'multinucleated forms') : s;
}

function coreCapitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* The adequacy phrase, grouped by verb: "is fragmented and small", "shows
   crush artifact", "shows crush artifact and is fragmented". Two verbs exist
   (shows, is), so at most two groups, joined with "and".

   NO ARTICLE on the artifacts, at the author's instruction - artifact is a
   mass noun here ("shows crush artifact"). The original printed "a shows
   crush artifact" (../Marrow/MarrowText.js:40-60), the first rebuild moved
   the article behind the verb, and the author then cut it entirely; the
   `article` flag and coreArticle() left with it. */
function coreAdequacyPhrase() {
    const keys = descriptorSelected('coreAdequacyDesc');
    if (!keys.length) return '';

    const byVerb = {};       // verb -> [printed noun phrases], in first-seen order
    const order = [];
    keys.forEach(function (key) {
        const entry = descriptorVocabulary[key];
        const verb = entry.coreVerb;
        if (!byVerb[verb]) { byVerb[verb] = []; order.push(verb); }
        byVerb[verb].push(entry.text);
    });

    return order.map(function (verb) { return verb + ' ' + addCommas(byVerb[verb]); }).join(' and ');
}

function coreAdequacyText() {
    const value = toggleGroupValue('coreAdequacy');
    if (!value) return '';
    const phrase = coreAdequacyPhrase();

    /* The conjunction is the whole difference between the branches, and it is a
       real one: an artifact is a concession against "adequate" ("shows a crush
       artifact BUT is overall adequate") and a reason for the other two ("shows a
       crush artifact AND is overall suboptimal"). Both original strings come out
       byte-for-byte as before — the value is already the report word, so the third
       option needed no third branch. */
    const join = value === 'adequate' ? 'but' : 'and';
    return phrase
        ? `The bone marrow core biopsy ${phrase} ${join} is overall ${value} for interpretation. `
        : `The bone marrow core biopsy is ${value} for interpretation. `;
}

/* A numeric field's value, or NaN. Reads the DOM string as the original did. */
function coreNum(id) {
    const el = document.getElementById(id);
    const v = el ? parseFloat(el.value) : NaN;
    return v;
}
function coreIsNum(v) { return !isNaN(v); }

/* The cellularity sentence. Three shapes, from the original:
     - variable range, alone or with an overall quality
     - a plain overall quality
     - nothing
   The percentage lands in a trailing "(~X% cellular)" (absolute) or
   "(L-H% cellular)" (range). Normocellular carries no grade. */
function coreCellularityText() {
    const varLow = coreNum('coreCellVarLow'), varHigh = coreNum('coreCellVarHigh');
    const abs = coreNum('coreCellAbs');
    const rangeLow = coreNum('coreCellRangeLow'), rangeHigh = coreNum('coreCellRangeHigh');

    const value = toggleGroupValue('coreCellularity');
    const grade = toggleGroupValue('coreCellSev');
    const qual = value === 'normocellular' ? 'normocellular'
        : (value === 'hypocellular' || value === 'hypercellular') ? (grade ? grade + ' ' : '') + value
        : '';

    const paren = coreIsNum(abs) ? `(~${abs}% cellular)`
        : (coreIsNum(rangeLow) && coreIsNum(rangeHigh) && rangeHigh > rangeLow) ? `(${rangeLow}-${rangeHigh}% cellular)`
        : '';
    const tail = qual ? ` for age${paren ? ' ' + paren : ''}. ` : '';

    if (coreIsNum(varLow) && coreIsNum(varHigh) && varHigh > varLow) {
        let text = `The marrow is variably cellular (ranging from ${varLow}-${varHigh}% cellular)`;
        // FIXED: the original left this branch without a period when no overall
        // quality was given, running it into the next sentence. Assembled from
        // parts here, so it closes cleanly either way.
        text += qual ? ` and overall ${qual}${tail}` : '. ';
        return text;
    }
    return qual ? `The marrow is ${qual}${tail}` : '';
}

/* Myeloid/erythroid findings, printed existentially rather than under the
   original's "Myeloid and erythroid precursors show …" stem — which named both
   lineages and then let every descriptor name one again ("…precursors show
   left-shifted myeloid maturation"). The lineage belongs to the finding, so it is
   said once. See `coreMEFrame` in MarrowDescriptors.js for the two shapes.

   The unremarkable sentence keeps the stem: it names no lineage, so nothing
   repeats, and it is the line the aspirate prints too. */
function coreMEText() {
    if (coreChecked('coreMEDescUnremarkable')) {
        return 'Myeloid and erythroid precursors show progressive maturation. ';
    }

    const keys = descriptorSelected('coreMEDesc');
    if (!keys.length) return '';

    const LINEAGES = {};     // placeholder, holding the pooled finding's place
    const findings = [];
    const lineages = [];
    keys.forEach(function (key) {
        if (descriptorVocabulary[key].coreMEFrame === 'lineage') {
            if (!lineages.length) findings.push(LINEAGES);
            lineages.push(descriptorVocabulary[key].text);
        } else {
            findings.push(key);
        }
    });

    const phrases = findings.map(function (item) {
        return item === LINEAGES
            ? `left-shifted ${addCommas(lineages)} maturation`
            : descriptorNounPhrase('coreMEDesc', item);
    });

    // Only the first finding's number decides the verb — "There is left-shifted
    // myeloid maturation and scattered erythroid islands" is how the existential
    // agrees when the list is mixed. The lineage pool is always singular however
    // many lineages it names: "maturation" is a mass noun, so naming a second
    // lineage lengthens the subject without pluralizing it.
    const first = findings[0];
    const plural = first !== LINEAGES && descriptorVocabulary[first].plural === true;
    // A pooled lineage phrase already spends an "and", so a second finding joins
    // it with "with" rather than a third one.
    return `There ${plural ? 'are' : 'is'} ${descriptorJoin(phrases, lineages.length >= 2)}. `;
}

/* Megakaryocytes, grouped by verb the way coreAdequacyPhrase() groups adequacy:
   a population *includes* micromegakaryocytes (a kind of cell — `isForm`) but
   *shows* widely separated nuclear lobes (a feature of one). The original used
   "show" for both, which said megakaryocytes show micromegakaryocytes — a
   category error, and the thing that made the line read like a form. Two verbs
   exist, so at most two clauses, joined with "and".

   The COUNT merges into the same sentence with the aspirate's conjunction rule
   (aspMegaText): the conjunction turns on whether count and morphology agree —
   abnormal AND a named list, abnormal BUT unremarkable, adequate BUT a named
   list. Adequate-and-unremarkable keeps the stock sentence untouched: it
   already says "adequate", so the chip adds agreement, not words. */
function coreMegText() {
    const count = toggleGroupValue('coreMeg');
    const abnormal = count === 'decreased' || count === 'increased';
    const countClause = abnormal ? `are${coreGrade('coreMegSev')} ${count}` : '';

    if (coreChecked('coreMegDescUnremarkable')) {
        if (abnormal) return `Megakaryocytes ${countClause} but show unremarkable morphology. `;
        return 'Megakaryocytes are adequate, regularly distributed, and show unremarkable morphology. ';
    }

    const isForm = function (key) { return descriptorVocabulary[key].isForm === true; };
    const named = descriptorSelected('coreMegDesc');
    if (!named.length) {
        if (abnormal) return `Megakaryocytes ${countClause}. `;
        // "appear adequate" is the aspirate's verb; the core says "are", as its
        // own unremarkable sentence already does.
        return count === 'adequate' ? 'Megakaryocytes are adequate. ' : '';
    }

    // First-seen order, so the clauses follow the order they were named in.
    const verbs = [];
    named.forEach(function (key) {
        const verb = isForm(key) ? 'include' : 'show';
        if (verbs.indexOf(verb) === -1) verbs.push(verb);
    });

    let pooled = false;
    const clauses = verbs.map(function (verb) {
        const wanted = verb === 'include' ? isForm : function (key) { return !isForm(key); };
        if (named.filter(wanted).length >= 2) pooled = true;
        return `${verb} ${descriptorPhrase('coreMegDesc', wanted)}`;
    });
    // Once a clause is itself a list, a bare "and" between the two clauses is the
    // third "and" in a row and reads as one long list. The comma is what marks
    // the join as the one between verbs: "shows A and B, and includes C and D".
    // An abnormal count spends an "and" of its own, so it forces the same comma
    // on a two-verb tail: "are increased and show A, and include B".
    const rest = clauses.join(pooled || (abnormal && clauses.length >= 2) ? ', and ' : ' and ');

    if (abnormal) return `Megakaryocytes ${countClause} and ${rest}. `;
    if (count === 'adequate') return `Megakaryocytes are adequate but ${rest}. `;
    return `Megakaryocytes ${rest}. `;
}

/* Plasma cells — the aspirate's branches (aspBlastPlasmaText's plasma half),
   without the blast merge: the core has no blast row for the combined sentence
   to exist against. Unremarkable is read only on the increased branch, exactly
   as on the aspirate — "not increased" already says nothing else was seen. */
function corePlasmaText() {
    const count = toggleGroupValue('corePlasma');
    const list = descriptorPhrase('corePlasmaDesc').toLowerCase();
    const unremarkable = coreChecked('corePlasmaDescUnremarkable');

    if (count === 'increased') {
        const tail = list ? ` and show ${list}`
            : unremarkable ? ' but show unremarkable morphology' : '';
        return `Plasma cells are${coreGrade('corePlasmaSev')} increased${tail}. `;
    }
    if (count === 'adequate') {
        return list
            ? `Plasma cells are not increased, but ${corePluralSubject(list)} are seen. `
            : 'Plasma cells are not increased. ';
    }
    return list ? `${coreCapitalize(corePluralSubject(list))} are seen. ` : '';
}

/* Lymphocyte distribution — the one row whose sentence has no fixed subject, so
   it does not go through descriptorPhrase(). Grouped the way coreAdequacyPhrase()
   groups by verb: the 'aggregate' descriptors are adjectives pooled into one
   "Focal paratrabecular and multifocal lymphoid aggregates are seen.", and the
   'sentence' ones each print whole. Order is naming order throughout — the pooled
   sentence holds the place of the first aggregate named. */
function coreLymphText(group) {
    const keys = descriptorSelected(group);
    if (!keys.length) return '';

    const AGG = {};              // a placeholder object, so its slot is unmistakable
    const parts = [];
    const adjectives = [];
    keys.forEach(function (key) {
        const entry = descriptorVocabulary[key];
        if (entry.coreLymphFrame === 'aggregate') {
            if (!adjectives.length) parts.push(AGG);
            adjectives.push(entry.text);
        } else {
            parts.push(entry.text);
        }
    });

    const aggregates = `${addCommas(adjectives)} lymphoid aggregates are seen`;
    return parts.map(function (part) {
        const text = part === AGG ? aggregates : part;
        return text.charAt(0).toUpperCase() + text.slice(1) + '. ';
    }).join('');
}

function fillCore() {
    const text = coreAdequacyText() + coreCellularityText() + coreMEText() + coreMegText()
        + coreLymphText('coreLymphDesc') + corePlasmaText();
    if (text === '') return '';
    return `
        <p style="${REPORT_PARAGRAPH}">
            ${text.trim()}
        </p>`;
}

/* The particle clot — its own specimen, its own section. "Similar to core
   biopsy" and a quantity combine; "no particles" overrides both, as it did in
   the original (../Marrow/MarrowText.js:1887). */
function fillClot() {
    const value = toggleGroupValue('coreClot');
    const similar = coreChecked('coreClotSimilar');
    const quant = value === 'only rare' || value === 'few' ? value : '';

    let particles = '';
    if (value === 'none') {
        particles = 'The bone marrow particle clot shows no marrow particles for evaluation.';
    } else if (similar) {
        particles = quant
            ? `The bone marrow particle clot shows ${quant} marrow particles with findings similar to the core biopsy.`
            : 'The bone marrow particle clot shows multiple marrow particles with findings similar to the core biopsy.';
    } else if (quant) {
        particles = `The bone marrow particle clot shows ${quant} marrow particles for evaluation.`;
    }

    /* "No particles" overrides the lymphocytes as it already overrides the
       quantity and "similar to core biopsy": there is nothing to have seen
       aggregates in, and a clot that reports both would contradict itself in two
       consecutive sentences.

       Otherwise the lymphocyte sentence stands on its own — naming an aggregate
       is itself a statement that there was a clot to see it in, so the paragraph
       prints on that alone with no quantity chosen. Joined rather than
       concatenated, so the spacing holds whichever part is present and the
       particle sentences stay byte-identical when it is absent. */
    const lymph = value === 'none' ? '' : coreLymphText('coreClotLymphDesc').trim();
    const text = [particles, lymph].filter(Boolean).join(' ');

    if (text === '') return '';
    return `
        <p style="${REPORT_PARAGRAPH}">
            ${text}
        </p>`;
}

/* Core biopsy and particle clot under ONE heading, as the original had them
   (../Marrow/MarrowText.js:1057-1078): "Bone Marrow Core Biopsy" alone,
   "…/Particle Clot" when both are present, or "Bone Marrow Particle Clot" when
   only the clot has anything to say. The heading is emitted INSIDE the fill so
   an empty section takes it down too — the same guarantee registerReportSection's
   own heading gives, kept while the heading has to be dynamic. Two paragraphs,
   the 8pt paragraph margins spacing them exactly one line apart. */
function fillCoreSection() {
    const core = fillCore();
    const clot = fillClot();
    if (!core && !clot) return '';

    const heading = core && clot ? 'Bone Marrow Core Biopsy/Particle Clot'
        : core ? 'Bone Marrow Core Biopsy'
        : 'Bone Marrow Particle Clot';
    return `<p style="${REPORT_HEADING}"><b>${heading}</b></p>` + core + clot;
}


/* ----------------------------------------------------------------------------
   Bootstrap

   ORDER IS LOAD-BEARING for the settings, exactly as on the counter tabs (see
   MarrowBlood.js and the applySettings trap in CLAUDE.md): renderCoreSettings()
   must create the .setting controls, applySettings() restores saved values into
   them, and only then does syncCoreCellularity() read them back through
   getSetting(). renderCorePanel() runs first because it is what the report and
   the autofill both read the cellularity fields from.
-------------------------------------------------------------------------- */
renderCorePanel();
renderCoreSettings();
applySettings();

/* One combined section: core biopsy + particle clot, dynamic heading in the
   fill. No separate `clot` registration — that is the combine. */
registerReportSection({ id: 'core', fill: fillCoreSection });

/* The cellularity autofill re-derives whenever its inputs can have changed: a
   percentage keystroke, a new age from a pasted CBC, or an edited threshold.
   Delegated for the percentages so it survives regardless; direct on the shell's
   settings panel, which outlives its own innerHTML. */
document.getElementById('inputPanel')?.addEventListener('input', function (e) {
    /* Scoped to #corePanel, not just to the class. `.cellNum` is a shared look
       for a small percent box, and the aspirate now uses one too — unscoped, a
       keystroke there ran coreCellExclusive() against a foreign element and
       re-derived the core's cellularity from fields the user was not touching. */
    if (!e.target.classList.contains('cellNum') || !e.target.closest('#corePanel')) return;
    coreCellExclusive(e.target);   // absolute XOR range, before the autofill reads them
    syncCoreCellularity();
});
document.addEventListener('cbcParsed', syncCoreCellularity);
document.getElementById('coreSettingsPanel')?.addEventListener('change', syncCoreCellularity);
