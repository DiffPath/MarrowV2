/* ============================================================================
   MarrowAsp.js — the Aspirate tab (#aspPanel).

   The same two halves as MarrowBlood.js, and deliberately the same shape:

     1. The differential counter — a SECOND instance of MarrowCounter.js, with
        its own cells, its own keys, its own tape and its own settings block.
        Nothing is shared with the blood counter but the engine.
     2. The findings form — adequacy through touch preparation — built from the
        tables below and read back by fillAsp().

   Clinical data and every report string are the original app's, verbatim
   (../Marrow/MarrowData.js:33-47 aspCountTable, ../Marrow/MarrowText.js:1548
   fillAsp, ../Marrow/BoneMarrow.html:370-550, :849-911). The LAYOUT is not — see
   MarrowBlood.js for why, and this tab is built on the same four ideas.

   WHAT THE ASPIRATE ADDS over blood, and it is all in the counter:

     - an M:E RATIO, summed off the same percentages the table prints so the two
       cannot contradict each other. Every cell already carries a `lineage`,
       filled in truthfully on blood for exactly this moment; the engine sums it.
       Blood declares no meRatio and gets no ratio, no rail line, no table row.
     - POOLED ROWS. Neutrophils and their three precursor stages are four cells
       on the pad (you press 7 for a metamyelocyte) and ONE line in the report,
       "Neutrophils & Precursors". The original expressed this by giving four
       cells the same tableCellID, which is why its pad and its table could not be
       read apart.
     - NRBCs THAT MEAN SOMETHING ELSE. On a smear they are escapees, reported per
       100 WBC and outside the denominator. In marrow they ARE the erythroid
       compartment: in the denominator, taking a '%', with a real reference range.
       That is why `inDenom` and `suffix` are separate fields — see bloodCells.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   The counter — data

   Keys are the original's aspirate keys (../Marrow/MarrowData.js:34-46) and they
   are NOT the blood pad's: promyelocytes move to '.', which frees '9' for plasma
   cells. That is the right trade on marrow, where plasma cells are counted on
   every case and promyelocytes are the rarest of the maturing series.

   `range` is the marrow reference, and this is where the engine's insistence
   that [0,0] and null are different pays off: on blood, eight of these cells are
   "not found, reference 0". Here all but two have real published ranges — the
   same cell, the same field, a different specimen. Ranges verbatim from the
   original's table markup (../Marrow/BoneMarrow.html:849-911).

   `lineage` drives the M:E ratio and IS the old cellType 1/2/3/5 split:
     erythroid  -> the denominator            (cellType 3)
     myeloid    -> the numerator              (cellType 1 and 2, which differed
                                               only in which row they print on)
     blast      -> the numerator, if asked    (cellType 5)
     other      -> neither                    (cellType 0)
-------------------------------------------------------------------------- */
const aspCells = [
    { id: 'blast',    label: 'Blasts',   reportLabel: 'Blasts',              defaultKey: '0', inDenom: true, suffix: '%', hideWhenZero: false, range: [0, 3],   lineage: 'blast' },
    { id: 'nrbc',     label: 'NRBCs',    reportLabel: 'Erythroid Precursors', defaultKey: '1', inDenom: true, suffix: '%', hideWhenZero: false, range: [15, 27], lineage: 'erythroid' },
    { id: 'eos',      label: 'Eos',      reportLabel: 'Eosinophils & Precursors', defaultKey: '2', inDenom: true, suffix: '%', hideWhenZero: false, range: [1, 5], lineage: 'myeloid' },
    { id: 'baso',     label: 'Basos',    reportLabel: 'Basophils & Precursors',   defaultKey: '3', inDenom: true, suffix: '%', hideWhenZero: false, range: [0, 1], lineage: 'myeloid' },
    { id: 'lymph',    label: 'Lymphs',   reportLabel: 'Lymphocytes',         defaultKey: '5', inDenom: true, suffix: '%', hideWhenZero: false, range: [10, 15], lineage: 'other' },
    { id: 'mono',     label: 'Monos',    reportLabel: 'Monocytes',           defaultKey: '6', inDenom: true, suffix: '%', hideWhenZero: false, range: [0, 2],   lineage: 'myeloid' },
    { id: 'plasma',   label: 'Plasma',   reportLabel: 'Plasma Cells',        defaultKey: '9', inDenom: true, suffix: '%', hideWhenZero: false, range: [0, 1],   lineage: 'other' },

    /* The pool. Each is counted on its own key and none prints a row of its own
       — aspNeutPool below is their line. No reportLabel and no range for the
       same reason: the pool carries both, and a second copy here would be a
       second answer to one question. */
    { id: 'neut',     label: 'Neuts',    defaultKey: '4', inDenom: true, suffix: '%', hideWhenZero: false, lineage: 'myeloid' },
    { id: 'meta',     label: 'Metas',    defaultKey: '7', inDenom: true, suffix: '%', hideWhenZero: false, lineage: 'myeloid' },
    { id: 'myelo',    label: 'Myelo',    defaultKey: '8', inDenom: true, suffix: '%', hideWhenZero: false, lineage: 'myeloid' },
    { id: 'promyelo', label: 'Promyelo', defaultKey: '.', inDenom: true, suffix: '%', hideWhenZero: false, lineage: 'myeloid' },

    /* Off the numeric pad, as on blood. The original gave these character: -1,
       which made them literally uncountable; a letter key costs nothing and the
       engine draws them no tile unless someone assigns one. */
    { id: 'atypical', label: 'Atypical', reportLabel: 'Atypical Cells', defaultKey: 'A', inDenom: true, suffix: '%', hideWhenZero: true, range: [0, 0], lineage: 'other' },
    { id: 'other',    label: 'Other',    reportLabel: 'Other Cells',    defaultKey: 'O', inDenom: true, suffix: '%', hideWhenZero: true, range: [0, 0], lineage: 'other' },

    /* The blast equivalents. Both keys, both conventions and the reasoning are
       bloodCells' — one list would be wrong, since the two specimens disagree on
       everything else about these cells too.

       WHAT DIFFERS HERE IS THE REFERENCE COLUMN, and it is `null` on both rows
       rather than [0, 0]: a normal marrow differential does not enumerate
       promonocytes at all — they sit inside the monocyte line — so neither the
       separate row nor the combined one has a published range to print. That is
       exactly the distinction the engine keeps: blood can say "should be none",
       marrow can only say nobody has published one. Do not copy the blast row's
       [0, 3] onto the combined row; a range assembled from one cell's reference
       and a guess at another's is a number the reader would check and not find. */
    { id: 'promono',  label: 'Promonos',    reportLabel: 'Promonocytes',          defaultKey: 'M', inDenom: true, suffix: '%', hideWhenZero: true, lineage: 'myeloid' },
    { id: 'proBlast', label: 'Pros/blasts', reportLabel: 'Blasts & Promonocytes', defaultKey: 'B', inDenom: true, suffix: '%', hideWhenZero: true, lineage: 'blast', excludes: ['blast'] }
];

/* Four cells, one line. Never hidden: "Neutrophils & Precursors" is the row the
   whole differential is read against, and a marrow with none of them is a
   finding rather than an omission. */
const aspNeutPool = {
    id: 'neutPool',
    reportLabel: 'Neutrophils & Precursors',
    cells: ['neut', 'meta', 'myelo', 'promyelo'],
    range: [33, 63],
    hideWhenZero: false
};

const aspCounterConfig = {
    id: 'asp',                     // -> #aspTape, #aspKeypad, #aspTarget, #aspMe
    cells: aspCells,
    pools: [aspNeutPool],

    /* Report order, and deliberately not the pad's authoring order — the same
       split as blood. Verbatim from ../Marrow/BoneMarrow.html:857-911. */
    rowOrder: ['atypical', 'other', 'blast', 'proBlast', 'promono', 'neutPool', 'eos', 'baso',
               'mono', 'lymph', 'plasma', 'nrbc'],

    /* The caption names the specimen that was actually counted, and counting on
       touch preparations changes which one that was. It is report output, so the
       words are the original's (../Marrow/Marrow.js:1528-1552) — the engine adds
       the "(500 cells)". */
    tableCaption: function () {
        return aspChecked('aspTouchPrep') ? 'Touch Preparation' : 'Aspirate Smear';
    },

    settingsPanelId: 'differentialSettingsPanel',
    settingsLabel: 'Bone marrow aspirate differential',
    panelId: 'aspCounterMount',

    /* 'Numbers and period', where blood defaults to 'Numbers only'. Not a
       preference: promyelocytes are bound to '.', so under 'Numbers only' the
       key exists and counts but has no tile — a cell you can only reach if you
       already know it is there. The original had exactly this hole (it shipped
       'Numbers only' as the default with Promyelo on '.'), and it is the same
       class of bug as its character: -1. The aspirate has eleven pad cells to
       blood's ten; it needs the eleventh key. */
    defaultLayout: 'Numbers and period',
    defaultTarget: 500,            // the marrow's rule; blood counts 200
    targetOptions: [50, 100, 200, 250, 500, 1000],

    /* The ratio, and the range it is read against
       (../Marrow/BoneMarrow.html:910). `includeBlasts` is a callback because the
       control lives on this tab and MarrowCounter.js may not know a Marrow id —
       the same seam as panelId and settingsPanelId. */
    meRatio: {
        label: 'M:E ratio',
        range: [1.5, 3.3],
        includeBlasts: function () { return aspChecked('aspBlastInMe'); }
    }
};


/* ----------------------------------------------------------------------------
   Findings — data

   Every `value` is a report word, quoted from the original; every `label` is
   ours. See MarrowBlood.js for why they are separate fields.
-------------------------------------------------------------------------- */

/* Two chips, not three — "neither" is reached by clicking the chosen one off.
   The aspirate grades with adverbs where it grades at all ("markedly
   decreased"), except the predominance, which takes adjectives ("a marked
   myeloid predominance") and so keeps its own table. */
const aspSeverity = [{ label: 'Mild', value: 'mildly' }, { label: 'Marked', value: 'markedly' }];
const aspPredomSeverity = [{ label: 'Slight', value: 'slight' }, { label: 'Marked', value: 'marked' }];

const aspAdequacy = [
    { label: 'Adequate', value: 'adequate' },
    { label: 'Suboptimal', value: 'suboptimal' },
    { label: 'Inadequate', value: 'inadequate' }
];

const aspPredominance = [
    { label: 'Erythroid', value: 'erythroid' },
    { label: 'Myeloid', value: 'myeloid' }
];

/* Low | Normal | High, asked identically of every lineage that has a count —
   megakaryocytes, and now the erythroid, myeloid and lymphoid rows. One table
   because it is one question; the values are the report words the sentence
   interpolates ("markedly decreased"), never the labels. Normal is offered but
   prints nothing: the pathologist chose silence on it (predominance and the M:E
   ratio already speak to quantity), so 'adequate' only marks "I looked, it was
   normal" — it clears the highlight cue without adding a sentence. */
const aspLineageCount = [
    { label: 'Low', value: 'decreased' },
    { label: 'Normal', value: 'adequate' },
    { label: 'High', value: 'increased' }
];

/* "Not increased" / "Increased" — two answers, not three: nobody reports
   decreased blasts or decreased plasma cells, and the original offered no
   control for it. */
const aspIncreased = [
    { label: 'Not increased', value: 'adequate' },
    { label: 'Increased', value: 'increased' }
];

const aspTouch = [
    { id: 'aspTouchSimilar',       label: 'Similar to aspirate' },
    { id: 'aspTouchPaucicellular', label: 'Paucicellular' }
];

/* Which descriptors each group offers, in dropdown order — the old app's
   per-select lists (adequacyList, erythroidList, myeloidList, lymphocyteList,
   aspMegList, aspPlasmaList) minus the leading "", which the list machinery adds
   itself. The vocabulary is in MarrowDescriptors.js; the lymphocyte list is the
   blood tab's, entire. */
const aspDescriptorGroups = {
    aspAdequacyDesc: ['hemodilute', 'paucicellular', 'virtuallyAcellular', 'paucispicular', 'aspiculate'],
    aspErythDesc:    ['nuclearBudding', 'nuclearContourIrregularity', 'multinucleation', 'megaloblastoid', 'shiftToImmaturity'],
    aspMyeloidDesc:  ['hypogranularForms', 'monolobatedForms', 'hypolobatedForms', 'hypersegmentedForms', 'shiftToImmaturity'],
    aspLymphDesc:    ['lymphNoAtypical', 'smallMature', 'smallMatureAndLargeGranular', 'predominantlyLargeGranular',
                      'polymorphous', 'reactive', 'predominantlyCllLike', 'subsetCllLike', 'marginalZoneLike', 'hairyCellLike'],
    aspMegDesc:      ['widelySeparatedNuclearLobes', 'separationNuclearLobes', 'hypolobatedForms', 'smallHypolobated',
                      'micromegakaryocytes', 'hypersegmentedForms', 'largeHypersegmented'],
    aspPlasmaDesc:   ['largeAtypical', 'multinucleation'],
    /* The shared list, from MarrowDescriptors.js rather than spelled out here —
       the Blood tab offers the identical keys and the diagnosis engine reads Auer
       rods out of both groups, so the two must not be free to drift. New: the old
       app described blasts by number alone on both tabs. */
    aspBlastDesc:    BLAST_DESCRIPTORS
};

/* The M:E ratio at which a predominance is called. Ported from
   ../Marrow/BoneMarrow.html:1164,1170 — the only aspirate thresholds the old app
   shipped with values, and unlike the blood thresholds these are carried over
   because the old app committed to them.

   The OPERATORS come from the old app's labels, not its code, and that is a
   knowing deviation: the label promised "Greater than or equal to 4:1" while the
   code tested `> 4` (../Marrow/Marrow.js:1270-1279), so at exactly 4.0 the
   settings said myeloid predominance and the app said nothing. One of the two is
   wrong and the label is the clinical statement. Flagged rather than silently
   picked — see the note in CLAUDE.md. */
const aspPredomLimits = [
    { id: 'aspMyeloidPredomLimit',   label: 'Myeloid predominance M:E ≥',   value: '4' },
    { id: 'aspErythroidPredomLimit', label: 'Erythroid predominance M:E ≤', value: '1' }
];


/* ----------------------------------------------------------------------------
   Findings — render
-------------------------------------------------------------------------- */

function aspChecked(id) {
    return document.getElementById(id)?.checked === true;
}

/* A plain checkbox chip — no group, no exclusivity. */
function aspChip(id, label) {
    return `<input type="checkbox" class="chipInput form" id="${id}"><label class="chip" for="${id}">${label}</label>`;
}

/* Toggle-group chips. `qualifier` marks a chip that GRADES an answer rather than
   being one, exactly as on blood: the highlight cue does not count a qualifier as
   having answered its row, because "markedly" does not answer "how many
   megakaryocytes?" and it outlives the count it graded. */
function aspToggleRow(group, options, qualifier) {
    const chips = options.map(function (option) {
        const id = group + '_' + option.value;
        const cls = 'chipInput form' + (qualifier ? ' chipQualInput' : '');
        return `<input type="checkbox" class="${cls}" id="${id}" value="${option.value}" data-toggle="${group}"><label class="chip" for="${id}">${option.label}</label>`;
    }).join('');
    // One group, one segmented control — see .chipGroup in Template.css.
    return chips ? `<span class="chipGroup">${chips}</span>` : '';
}

function aspUnremarkableChip(group) {
    const id = group + 'Unremarkable';
    return `<input type="checkbox" class="chipInput form" id="${id}" data-stopgroup="${group}" data-stop><label class="chip" for="${id}">Unremarkable</label>`;
}

/* A morphology cell — the same shape as every other on the tab: stop chip above
   its growing dropdown list. bloodMorphCell() is MarrowBlood.js's and this file
   may not reach into it, but the markup contract is Template.css's .matrixMorph
   and is shared. */
function aspMorphCell(group, key, unremarkable, dysKey) {
    return `<div class="matrixMorph" data-key="${key}">${unremarkable === false ? '' : aspUnremarkableChip(group)}` +
        `${descriptorListHTML(group)}${dysKey ? aspDysplasiaHTML(dysKey) : ''}</div>`;
}

/* HOW MUCH of the lineage is dysplastic, for the three lineages MDS is graded on.

   WHO-HAEM5 and ICC both draw the line at 10% of a lineage, and a named
   descriptor cannot say whether one micromegakaryocyte or half of them were
   seen. OPTIONAL on purpose: left blank the diagnosis engine falls back to
   "a dysplastic feature was named", which is the weaker claim it actually has.
   Filled, the 10% threshold is applied properly.

   It emits NO report text — it is an engine input, and the aspirate's prose is
   oracle-verified against the original. Revealed only once a morphology has been
   named (see .aspDysCell in Template.css): a percentage of nothing is not a
   question worth asking, the same judgement the aniso list and the iron count
   block already make. */
function aspDysplasiaHTML(dysKey) {
    return `<label class="aspDysCell">Dysplastic` +
        `<input type="text" inputmode="numeric" maxlength="3" class="cellNum form" id="${dysKey}DysPct">%</label>`;
}

/* A statement and the switch that answers it. Two labels for one input — the
   text is a hit target as well as the switch — with the input kept ADJACENT to
   .toggleSwitch, which is the contract the switch styling keys on (see
   Template.css). `form`, never `setting`: this is case data, and `setting` would
   persist it to localStorage and carry it into the next case. */
function aspToggleField(id, text) {
    return `<span class="toggleField"><label class="toggleText" for="${id}">${text}</label>` +
        `<input type="checkbox" class="toggleInput form" id="${id}"><label class="toggleSwitch" for="${id}"></label></span>`;
}

/* `ref` is a reference topic id (MarrowRefData.js) — the book icon at the end of
   the row's controls, inside .findingChips. See the note on coreRow(): the grid
   has two columns, so a third child would wrap into the next row's label slot,
   and the label column itself is too narrow to carry an icon. */
function aspRow(label, controls, key, ref) {
    const keyAttr = key ? ` data-key="${key}"` : '';
    const link = ref ? refLinkHTML(ref) : '';
    return `<div class="findingLabel">${label}</div><div class="findingChips"${keyAttr}>${controls}${link}</div>`;
}

/* A row that asks a count AND a morphology takes two boxes, not one spanning
   both — see CLAUDE.md. The count half wears .chipSet; the morphology half is an
   .matrixMorph like every other and brings its own 10px step. */
function aspChipSet(key, controls) {
    return `<span class="chipSet" data-key="${key}">${controls}</span>`;
}

/* A lineage that is asked both Low|Normal|High and a morphology — the shape
   shared by megakaryocytes, erythroids, myeloids and lymphocytes. One helper
   because it is one kind of row: count chips and the severity that grades them
   in the first highlight box, the morphology in its own.

   The convention is `countKey` / `countKey + 'Sev'` / `countKey + 'Severity'` /
   `countKey + 'Morph'`; `descGroup` is passed separately only because the
   megakaryocyte's is spelled 'aspMegDesc' where its keys are 'aspMega*'. */
/* `dysplasia` marks the three lineages MDS is graded on — erythroid, myeloid and
   megakaryocytic. Lymphocytes take the same row shape but no percentage: there is
   no such thing as lymphoid dysplasia to quantify. */
function aspLineageRow(label, countKey, descGroup, dysplasia, ref) {
    return aspRow(label,
        aspChipSet(countKey, aspToggleRow(countKey, aspLineageCount) +
            `<span class="chipGap"></span><span class="chipSub" id="${countKey}Severity">${aspToggleRow(countKey + 'Sev', aspSeverity, true)}</span>`) +
        aspMorphCell(descGroup, countKey + 'Morph', true, dysplasia ? countKey : null),
        null, ref);
}

function renderAspPanel() {
    const panel = document.getElementById('aspPanel');
    if (!panel) return;

    panel.innerHTML = `
        <div class="findingGroup">
            ${/* Two switches that change what the tab MEANS rather than answering
                  anything: what was counted, and what goes in the ratio. They lead
                  because they are read before the rest is true, and they emit no
                  report text of their own.

                  SWITCHES, not chips, and no label column. They were a labelled row
                  of two pills, which read as two answers to one question — and they
                  are not even the same kind of thing as each other: one changes which
                  specimen the whole differential describes (every percentage, the
                  table caption, the adequacy prose), the other changes one number.
                  A pill under a shared label cannot say that. A switch is a claim
                  that stands by itself, so each carries its own full sentence and
                  neither borrows meaning from a label or from its neighbour.

                  The .findingGrid is gone with the label column: these two are not
                  rows of the form below and must not line up with it. */''}
            <div class="toggleFieldRow">
                ${aspToggleField('aspTouchPrep', 'Performed on touch preparation')}
                ${aspToggleField('aspBlastInMe', 'Include blasts in M:E ratio')}
            </div>
        </div>

        <div id="aspCounterMount"></div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${aspRow('Adequacy', aspChipSet('aspAdequacy', aspToggleRow('aspAdequacy', aspAdequacy)) +
                    aspMorphCell('aspAdequacyDesc', 'aspAdequacyDesc', false), null)}
                ${aspRow('Predominance', aspToggleRow('aspPredom', aspPredominance) +
                    `<span class="chipGap"></span><span class="chipSub" id="aspPredomSeverity">${aspToggleRow('aspPredomSev', aspPredomSeverity, true)}</span>`, 'aspPredom')}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${/* The three dysplasia lineages carry a reference link and
                      lymphocytes do not, which is the same distinction the
                      `dysplasia` flag beside them already makes: there is no such
                      thing as lymphoid dysplasia to look up. Erythroids and
                      myeloids point at the threshold and the per-lineage feature
                      list; megakaryocytes point at their own page, which reaches
                      dysplasia through See also. */''}
                ${aspLineageRow('Erythroids', 'aspEryth', 'aspErythDesc', true, 'dysplasia')}
                ${aspLineageRow('Myeloids', 'aspMyeloid', 'aspMyeloidDesc', true, 'dysplasia')}
                ${aspLineageRow('Lymphocytes', 'aspLymph', 'aspLymphDesc')}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${aspLineageRow('Megakaryocytes', 'aspMega', 'aspMegDesc', true, 'megakaryocytes')}
                ${/* Two questions, so two highlight boxes — and NO "Unremarkable"
                      stop chip on the morphology half, unlike every other on the
                      tab: "Blasts show unremarkable morphology" is not a sentence
                      anyone writes, so there is no normal for the chip to assert.
                      The Blood tab's blast row is left exactly the same way. */''}
                ${aspRow('Blasts',
                    aspChipSet('aspBlast', aspToggleRow('aspBlast', aspIncreased) +
                        `<span class="chipGap"></span><span class="chipSub" id="aspBlastSeverity">${aspToggleRow('aspBlastSev', aspSeverity, true)}</span>`) +
                    aspMorphCell('aspBlastDesc', 'aspBlastMorph', false), null, 'blasts')}
                ${aspRow('Plasma cells',
                    aspChipSet('aspPlasma', aspToggleRow('aspPlasma', aspIncreased) +
                        `<span class="chipGap"></span><span class="chipSub" id="aspPlasmaSeverity">${aspToggleRow('aspPlasmaSev', aspSeverity, true)}</span>`) +
                    aspMorphCell('aspPlasmaDesc', 'aspPlasmaMorph'))}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${aspRow('Touch prep', aspTouch.map(function (t) { return aspChip(t.id, t.label); }).join(''))}
            </div>
        </div>`;

    Object.keys(aspDescriptorGroups).forEach(function (group) {
        registerDescriptorGroup(group, aspDescriptorGroups[group]);
        renderDescriptorList(group);
    });
}

/* ----------------------------------------------------------------------------
   Aspirate settings — the M:E ratio at which a predominance is called
-------------------------------------------------------------------------- */
function renderAspSettings() {
    const panel = document.getElementById('aspSettingsPanel');
    if (!panel) return;

    const rows = aspPredomLimits.map(function (limit) {
        return `<div class="findingLabel">${limit.label}</div>
            <div class="thresholdRow">
                <input type="number" class="thresholdInput setting" id="${limit.id}" step="0.1" value="${limit.value}">
                <span class="thresholdUnit">:1</span>
            </div>`;
    }).join('');

    panel.innerHTML = `<div class="findingGroup"><div class="findingGrid">${rows}</div></div>`;
    settingsPanelSave(panel);
}


/* ----------------------------------------------------------------------------
   Display sync — shown/hidden, never cleared

   Severity is only a question once something is abnormal. Hidden rather than
   removed so no row moves under the cursor, and NOT enforced by clearing the
   chips: a severity you set, hid by picking Normal, and revealed again by
   picking High is still the one you set. fillAsp() reads severity only on the
   branches that use it, so a hidden one cannot leak into the report.
-------------------------------------------------------------------------- */
function syncAspSeverity() {
    const show = function (id, on) {
        const el = document.getElementById(id);
        if (el) el.style.visibility = on ? 'visible' : 'hidden';
    };

    show('aspPredomSeverity', !!toggleGroupValue('aspPredom'));

    // Every lineage graded Low or High reveals its severity pair — the same
    // decreased/increased test, so one loop over the four count groups. Normal
    // ('adequate') hides it: there is nothing to grade about normal.
    ['aspMega', 'aspEryth', 'aspMyeloid', 'aspLymph'].forEach(function (group) {
        const value = toggleGroupValue(group);
        show(group + 'Severity', value === 'decreased' || value === 'increased');
    });

    show('aspBlastSeverity', toggleGroupValue('aspBlast') === 'increased');
    show('aspPlasmaSeverity', toggleGroupValue('aspPlasma') === 'increased');
}

/* The predominance is DERIVED from the M:E ratio, and the ratio wins: it is the
   objective measure of the thing the radio claims, exactly as the CBC is on the
   blood tab. Ported from ../Marrow/Marrow.js:1255-1285.

   Fires when the COUNT changes, not on every keystroke anywhere on the tab. The
   original re-asserted this from countCells() on every input event, which had two
   consequences it plainly did not intend: with no cells counted at all it cleared
   `erythroidPredominance` (and, asymmetrically, not `myeloidPredominance`) on
   every change, so half the control was unusable on an uncounted aspirate — and
   you cannot always count one. Here, no count means no ratio means no opinion,
   and the chips are yours.

   In range and both limits set, it clears both: "the ratio is normal" is an
   answer, and leaving a stale predominance standing next to a 2.5:1 would be the
   form disagreeing with its own arithmetic. */
function syncAspPredominance() {
    const me = aspCounter.readStats().me.value;
    if (me === null) return;

    const myeloidLimit = parseFloat(getSetting('aspMyeloidPredomLimit', ''));
    const erythroidLimit = parseFloat(getSetting('aspErythroidPredomLimit', ''));

    // Erythroid first, as the original had it. An unset limit parses to NaN and
    // every comparison against NaN is false, so it simply never fires.
    if (me <= erythroidLimit) setToggleGroup('aspPredom', 'erythroid');
    else if (me >= myeloidLimit) setToggleGroup('aspPredom', 'myeloid');
    else if (!isNaN(erythroidLimit) && !isNaN(myeloidLimit)) clearToggleGroup('aspPredom');

    syncAspSeverity();
}


/* ----------------------------------------------------------------------------
   Findings — report text

   Every string is quoted from ../Marrow/MarrowText.js:1548-1784. One function per
   sentence, each returning '' when it has nothing to say, so the paragraph is the
   concatenation and the order here IS the order on the page.
-------------------------------------------------------------------------- */

/* " markedly" / "" — the space belongs to the qualifier, not to the sentence
   around it, which is what lets the sentence read the same either way. */
function aspGrade(group) {
    const value = toggleGroupValue(group);
    return value ? ' ' + value : '';
}

/* "Multinucleation are seen" is not a sentence. A descriptor whose text is a
   mass noun cannot be a plural subject, and the plasma branch is the only place
   one is ever promoted to one. Verbatim from ../Marrow/MarrowText.js:810. */
function aspPluralSubject(s) {
    return s ? s.replace(/\bmultinucleation\b/gi, 'multinucleated forms') : s;
}

function aspCapitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* What was counted. The touch-prep switch renames the specimen everywhere it is
   named — the table caption and this sentence — because the differential really
   was performed on something else. */
function aspAdequacyText() {
    const value = toggleGroupValue('aspAdequacy');
    const list = descriptorPhrase('aspAdequacyDesc');

    if (value === 'adequate') {
        return list
            ? `The bone marrow aspirate smears are ${list} but overall adequate for interpretation. `
            : 'The bone marrow aspirate smears are cellular and adequate for interpretation. ';
    }

    if (value === 'inadequate') {
        return list
            ? `The bone marrow aspirate smears are ${list} precluding a meaningful marrow differential. `
            : 'The bone marrow aspirate smears are inadequate for interpretation. ';
    }

    if (value !== 'suboptimal') return '';

    let text = list
        ? `The bone marrow aspirate smears are ${list} limiting the accuracy of a differential count. `
        : 'The bone marrow aspirate smears are suboptimal for evaluation, limiting the accuracy of a differential count. ';

    /* Suboptimal smears, but a count was still obtained — from the touch preps,
       or from the smears anyway. "limited" only when the target was lowered
       below the marrow's 500. readStats() rather than stats(): this runs from
       fillReport(), which does not refresh the counter first. */
    const stats = aspCounter.readStats();
    const limited = stats.target > 0 && stats.target < 500 ? 'limited ' : '';

    if (aspChecked('aspTouchPrep')) {
        text += `The bone marrow touch preparations are cellular, and therefore, a ${limited}differential count was performed on the touch preparations. `;
    } else if (stats.denominator > 0) {
        text += `Nevertheless, a ${limited}differential count was performed on the aspirate smears. `;
    }
    return text;
}

function aspPredominanceText() {
    const value = toggleGroupValue('aspPredom');
    if (!value) return '';

    const grade = toggleGroupValue('aspPredomSev');
    // "an erythroid predominance" but "a marked erythroid predominance" — the
    // article follows whatever word actually comes next.
    const words = (grade ? grade + ' ' : '') + value + ' predominance';
    const article = /^[aeiou]/i.test(words) ? 'an' : 'a';
    return `There is ${article} ${words}. `;
}

/* One precursor lineage: its count and its morphology, merged into one sentence
   the way the megakaryocyte row is (aspMegaText). The conjunction turns on
   whether the two agree — an abnormal count with unremarkable (normal)
   morphology is "but", with a named (abnormal) list it is "and".

   The count clause is a NEW sentence shape with no original to port: erythroid,
   myeloid and lymphoid counts were morphology-only in the old app. Wording and
   the silent-on-Normal behavior are the pathologist's calls, recorded in
   CLAUDE.md — "are [grade] increased/decreased", and Normal prints nothing. With
   no count, this is byte-for-byte the old behavior, which is what keeps the
   fillAsp oracle valid. */
function aspPrecursorLine(countGroup, unremarkable, list, cells) {
    const count = toggleGroupValue(countGroup);
    const abnormal = count === 'decreased' || count === 'increased';
    const morph = unremarkable ? 'progressive maturation with unremarkable morphology' : list;

    if (abnormal) {
        if (morph) return `${cells} are${aspGrade(countGroup + 'Sev')} ${count} ${unremarkable ? 'but' : 'and'} show ${morph}. `;
        return `${cells} are${aspGrade(countGroup + 'Sev')} ${count}. `;
    }
    return morph ? `${cells} show ${morph}. ` : '';
}

/* Erythroid and myeloid precursors share ONE sentence when both are unremarkable
   AND neither is counted abnormal — "Myeloid and erythroid precursors show
   progressive maturation with unremarkable morphology." (The order reverses in
   that sentence; the original's, left alone.) An abnormal count on either splits
   them, because a count belongs inside that lineage's own clause. */
function aspPrecursorText() {
    const erythUnremarkable = aspChecked('aspErythDescUnremarkable');
    const myeloidUnremarkable = aspChecked('aspMyeloidDescUnremarkable');
    const abnormal = function (g) { const v = toggleGroupValue(g); return v === 'decreased' || v === 'increased'; };

    if (erythUnremarkable && myeloidUnremarkable && !abnormal('aspEryth') && !abnormal('aspMyeloid')) {
        return 'Myeloid and erythroid precursors show progressive maturation with unremarkable morphology. ';
    }

    return aspPrecursorLine('aspEryth', erythUnremarkable, descriptorPhrase('aspErythDesc'), 'Erythroid precursors') +
           aspPrecursorLine('aspMyeloid', myeloidUnremarkable, descriptorPhrase('aspMyeloidDesc'), 'Myeloid precursors');
}

function aspLymphText() {
    const count = toggleGroupValue('aspLymph');
    const abnormal = count === 'decreased' || count === 'increased';
    const countClause = abnormal ? `Lymphocytes are${aspGrade('aspLymphSev')} ${count}` : '';

    // "No discrete atypical..." is a whole sentence and cannot merge, so a count
    // stands in front of it as its own sentence.
    if (descriptorChecked('aspLymphDesc', 'lymphNoAtypical')) {
        return (countClause ? countClause + '. ' : '') + 'No discrete atypical lymphocyte population is identified. ';
    }

    const unremarkable = aspChecked('aspLymphDescUnremarkable');
    const morph = unremarkable ? 'unremarkable morphology' : descriptorPhrase('aspLymphDesc');

    if (abnormal) {
        if (morph) return `${countClause} ${unremarkable ? 'but' : 'and'} show ${morph}. `;
        return `${countClause}. `;
    }
    return morph ? `Lymphocytes show ${morph}. ` : '';
}

/* Megakaryocytes carry their morphology in the same sentence as their count, and
   the conjunction turns on whether the two agree: adequate AND unremarkable is
   "and", adequate BUT abnormal is "but", and decreased BUT unremarkable is "but"
   again. The original's words exactly. */
function aspMegaText() {
    const value = toggleGroupValue('aspMega');
    const unremarkable = aspChecked('aspMegDescUnremarkable');
    const list = descriptorPhrase('aspMegDesc').toLowerCase();

    if (value === 'adequate') {
        const tail = unremarkable ? ' and show unremarkable morphology' : list ? ` but show ${list}` : '';
        return `Megakaryocytes appear adequate${tail}. `;
    }

    if (value === 'decreased' || value === 'increased') {
        const tail = unremarkable ? ' but show unremarkable morphology' : list ? ` and show ${list}` : '';
        return `Megakaryocytes appear${aspGrade('aspMegaSev')} ${value}${tail}. `;
    }

    if (unremarkable) return 'Megakaryocytes show unremarkable morphology. ';
    return list ? `Megakaryocytes show ${list}. ` : '';
}

/* Blasts and plasma cells share a sentence when both are simply "not increased"
   and NEITHER has anything else to say — "Blasts and plasma cells are not
   increased." Everything else splits them.

   A named blast morphology is one of those things, on the same reasoning that
   already splits the line for a named plasma morphology: the combined sentence
   puts one predicate over both nouns, and a morphology belongs to only one of
   them. "Blasts and plasma cells are not increased but show Auer rods" says the
   plasma cells have Auer rods.

   `combined` is computed once and read twice rather than re-derived in the plasma
   branch. The two tests have to be the exact complement of each other — the old
   `blast !== 'adequate'` guard was that complement only while the combined line's
   condition was the two chips alone, and it stops being one the moment a third
   thing can break the merge. Getting it wrong prints "Plasma cells are not
   increased" twice, or not at all. */
function aspBlastPlasmaText() {
    const blast = toggleGroupValue('aspBlast');
    const plasma = toggleGroupValue('aspPlasma');
    const blastList = descriptorPhrase('aspBlastDesc');
    const plasmaList = descriptorPhrase('aspPlasmaDesc').toLowerCase();
    const plasmaUnremarkable = aspChecked('aspPlasmaDescUnremarkable');

    const combined = blast === 'adequate' && plasma === 'adequate' && !blastList && !plasmaList;

    let text = '';

    if (combined) {
        text += 'Blasts and plasma cells are not increased. ';
    } else if (blast === 'adequate') {
        // "but", not "and": a normal count beside an abnormal morphology is a
        // contrast, which is the same conjunction rule aspMegaText follows.
        text += blastList ? `Blasts are not increased but show ${blastList}. `
            : 'Blasts are not increased. ';
    } else if (blast === 'increased') {
        text += `Blasts are${aspGrade('aspBlastSev')} increased${blastList ? ` and show ${blastList}` : ''}. `;
    } else if (blastList) {
        // No count given, but morphology named — the morphology is the finding.
        text += `Blasts show ${blastList}. `;
    }

    if (plasma === 'increased') {
        const tail = plasmaList ? ` and show ${plasmaList}`
            : plasmaUnremarkable ? ' but show unremarkable morphology' : '';
        text += `Plasma cells are${aspGrade('aspPlasmaSev')} increased${tail}. `;
    } else if (plasma === 'adequate') {
        if (plasmaList) {
            text += `Plasma cells are not increased, but ${aspPluralSubject(plasmaList)} are seen. `;
        } else if (!combined) {
            // Otherwise the combined line above already covers it.
            text += 'Plasma cells are not increased. ';
        }
    } else if (plasmaList) {
        text += `${aspCapitalize(aspPluralSubject(plasmaList))} are seen. `;
    }

    return text;
}

function fillAsp() {
    const text = aspAdequacyText() + aspPredominanceText() + aspPrecursorText() +
                 aspLymphText() + aspMegaText() + aspBlastPlasmaText();

    if (text === '') return '';
    return `
        <p style="${REPORT_PARAGRAPH}">
            ${text.trim()}
        </p>`;
}

/* The touch preparation is its own section: it is a different specimen, and the
   original built it with its own function for the same reason
   (../Marrow/MarrowText.js:1766). Only "Similar to aspirate" produces text —
   "Paucicellular" alone says nothing, matching the original. */
function fillTouch() {
    if (!aspChecked('aspTouchSimilar')) return '';

    const paucicellular = aspChecked('aspTouchPaucicellular');
    const adequate = toggleGroupValue('aspAdequacy') === 'adequate';

    const text = !paucicellular
        ? 'The bone marrow touch preparations are cellular and show findings similar to the aspirate smears.'
        : adequate
            ? 'The bone marrow touch preparations are paucicellular but show findings otherwise similar to the aspirate smears.'
            : 'The bone marrow touch preparations are paucicellular and show findings similar to the aspirate smears.';

    return `
        <p style="${REPORT_PARAGRAPH}">
            ${text}
        </p>`;
}

/* Aspirate smear and touch preparation under ONE heading, as the original had
   them (../Marrow/MarrowText.js:1033-1055): "Bone Marrow Aspirate" alone,
   "…/Touch Preparation" when both are present, or "Touch Preparation" when only
   the touch prep speaks. The heading is emitted inside the fill so an empty
   section takes it down with it. Two paragraphs, one blank line apart. */
function fillAspirateSection() {
    const asp = fillAsp();
    const touch = fillTouch();
    if (!asp && !touch) return '';

    const heading = asp && touch ? 'Bone Marrow Aspirate/Touch Preparation'
        : asp ? 'Bone Marrow Aspirate'
        : 'Touch Preparation';
    return `<p style="${REPORT_HEADING}"><b>${heading}</b></p>` + asp + touch;
}


/* ----------------------------------------------------------------------------
   Bootstrap

   ORDER IS LOAD-BEARING and it looks reorderable — see MarrowBlood.js and
   MarrowSettings.js:90 for the whole story. renderAspPanel() must run first
   because it creates #aspCounterMount; the .setting controls must exist before
   applySettings() can restore into them; and render() reads them back through
   counterKeymap()/counterLayout().
-------------------------------------------------------------------------- */
const aspCounter = createCounter(aspCounterConfig);

renderAspPanel();
renderAspSettings();
aspCounter.renderSettings();
applySettings();
aspCounter.render();
syncAspSeverity();

/* The aspirate differential sits directly under the peripheral-blood
   differential (`after: 'pbDiff'`), so the two count tables read as a pair
   ahead of the prose. Registration alone would put it after the blood PROSE,
   since MarrowBlood registers `pbDiff` then `pb` before this file loads — the
   same load-order-vs-report-order split `after` exists for (see
   orderReportSections in MarrowReport.js). The aspirate prose keeps registration
   order and lands after the blood prose. */
registerReportSection({ id: 'aspDiff', fill: aspCounter.fillTable, after: 'pbDiff' });
registerReportSection({ id: 'asp', fill: fillAspirateSection });

/* Display concerns, bound here rather than done inside fillAsp() — a fill() must
   stay a pure reader. Delegated from the static #inputPanel and bound once. */
document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    if (e.target.closest('#aspPanel')) syncAspSeverity();
});

/* The ratio decides the predominance, so it re-decides when the ratio can have
   changed — a keystroke on the tape, or an edited threshold. Not on every change
   anywhere on the tab: see syncAspPredominance().

   DELEGATED from #inputPanel, not bound to #aspTape. render() replaces the pad's
   markup wholesale, so the tape element the counter has now is not the one it
   will have after a settings change, and a listener bound to today's would die
   the first time someone rebinds a key — silently, and only for them.

   The target select is deliberately NOT here: the M:E ratio is computed from raw
   counts, so the denominator the percentages are scaled to cannot move it. A
   listener there would fire on every target change to recompute an identical
   number, and would imply the two are related. */
document.getElementById('inputPanel')?.addEventListener('input', function (e) {
    if (e.target.id === 'aspTape') syncAspPredominance();
});

/* The settings panel is the shell's and outlives its own innerHTML, so this one
   can bind directly. */
document.getElementById('aspSettingsPanel')?.addEventListener('change', syncAspPredominance);
