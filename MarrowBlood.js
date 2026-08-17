/* ============================================================================
   MarrowBlood.js — the Blood tab (#pbPanel).

   Two halves, both data-driven:

     1. The differential counter, an instance of MarrowCounter.js. This file
        supplies its cells and config and nothing else; the aspirate will be the
        same shape with its own list.
     2. The findings form — hemoglobin through plasma cells — built from the
        tables below and read back by fillBlood().

   Clinical data and every report string are the original app's, verbatim
   (../Marrow/MarrowData.js:1-47, ../Marrow/MarrowText.js:1103-1546,
   ../Marrow/BoneMarrow.html:95-368). The LAYOUT is not: the original asked the
   same questions in some 40 rows, one 200px-labelled row at a time. These are
   eleven, and the four things that did it are worth knowing before editing:

     - a dropdown for anything list-shaped, so a morphology group costs the
       height of what you named rather than of what you might have;
     - one row per SUBJECT rather than per question — a lineage's count, its
       severity and its morphology are one line, where the original had three
       labelled blocks;
     - no headings, section or column: a hairline separates the groups, and a
       chip labelled "Low" needs no heading above it saying "Low";
     - a matrix for the questions that repeat, so the columns line up and
       "which lineages did I comment on" is a glance.

   The one deliberate difference in OUTPUT: the original emitted a double space
   wherever an optional word was skipped ("shows  anemia", "There is  absolute
   eosinophilia"), because it concatenated fragments that each assumed a
   neighbour. Sentences here are assembled from parts and joined, so the spacing
   is right whichever parts are present. Wording, punctuation and thresholds are
   untouched.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Data

   `defaultKey` SEEDS the keymap; it is not the binding — the live binding lives
   in counterKeymap() and becomes user-editable in the settings step. `id` is
   the stable identity and never changes.

   Two fields exist to keep apart what the original's `cellType` enum ran
   together (../Marrow/MarrowData.js:5-13):

     inDenom   — does this cell count toward the denominator? Circulating NRBCs
                 do NOT: they are reported per 100 WBC, not as a share of the
                 differential.
     suffix    — '%' for a share, '' for a ratio. Explicit rather than derived
                 from inDenom, because on the ASPIRATE, NRBCs mean erythroid
                 precursors: they count in the denominator AND take a '%'.
                 Deriving one from the other would rebuild the conflation.

   `range` is [low, high] and prints in the Reference column. [0, 0] is a claim,
   not a blank: normal blood contains no blasts, no NRBCs, nothing left of the
   band form, no plasma cells — so their reference IS zero and the report says
   so. (It renders as a bare "0"; see rangeText() in MarrowCounter.js.) The
   engine keeps `null` for "no reference known", which nothing here needs — every
   one of these cells has a published answer, and a cell absent from normal blood
   has the most definite answer of the lot. Do not reach for null as a shorthand
   for zero: on the aspirate most of these have real ranges (and the promonocyte
   rows have no reference at all), and the two must stay distinguishable.

   `lineage` is inert here (meRatio is false for blood) but filled in truthfully
   anyway — a field that is only correct on one specimen type is precisely how
   the original's cellType rotted.
-------------------------------------------------------------------------- */
const bloodCells = [
    { id: 'blast',    label: 'Blasts',   reportLabel: 'Blasts',         defaultKey: '0', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'blast' },
    { id: 'nrbc',     label: 'NRBCs',    reportLabel: 'NRBCs/100 WBC',  defaultKey: '1', inDenom: false, suffix: '',  hideWhenZero: true,  range: [0, 0],   lineage: 'erythroid' },
    { id: 'eos',      label: 'Eos',      reportLabel: 'Eosinophils',    defaultKey: '2', inDenom: true,  suffix: '%', hideWhenZero: false, range: [0, 8],   lineage: 'myeloid' },
    { id: 'baso',     label: 'Basos',    reportLabel: 'Basophils',      defaultKey: '3', inDenom: true,  suffix: '%', hideWhenZero: false, range: [0, 2],   lineage: 'myeloid' },
    { id: 'neut',     label: 'Neuts',    reportLabel: 'Neutrophils',    defaultKey: '4', inDenom: true,  suffix: '%', hideWhenZero: false, range: [34, 73], lineage: 'myeloid' },
    { id: 'lymph',    label: 'Lymphs',   reportLabel: 'Lymphocytes',    defaultKey: '5', inDenom: true,  suffix: '%', hideWhenZero: false, range: [15, 50], lineage: 'other' },
    { id: 'mono',     label: 'Monos',    reportLabel: 'Monocytes',      defaultKey: '6', inDenom: true,  suffix: '%', hideWhenZero: false, range: [1, 15],  lineage: 'myeloid' },
    { id: 'meta',     label: 'Metas',    reportLabel: 'Metamyelocytes', defaultKey: '7', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'myeloid' },
    { id: 'myelo',    label: 'Myelo',    reportLabel: 'Myelocytes',     defaultKey: '8', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'myeloid' },
    { id: 'promyelo', label: 'Promyelo', reportLabel: 'Promyelocytes',  defaultKey: '9', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'myeloid' },
    { id: 'plasma',   label: 'Plasma',   reportLabel: 'Plasma Cells',   defaultKey: 'P', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'other' },
    { id: 'atypical', label: 'Atypical', reportLabel: 'Atypical Cells', defaultKey: 'A', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'other' },
    { id: 'other',    label: 'Other',    reportLabel: 'Other Cells',    defaultKey: 'O', inDenom: true,  suffix: '%', hideWhenZero: true,  range: [0, 0],   lineage: 'other' },

    /* THE BLAST EQUIVALENTS, and the two conventions for counting them.
       Promonocytes ARE blast equivalents in every myeloid classification — the
       20% acute-leukemia boundary and CMML's own CMML-1/CMML-2 split are both
       read on "blasts and blast equivalents (myeloblasts, monoblasts,
       promonocytes)" — so a differential that offers only a Blasts key cannot
       state the percentage the classification asks for.

       Two keys rather than one, because both conventions are in use: count
       promonocytes apart from blasts, or count the two together in one bucket.
       `excludes` says the second is an alternative to the first and not an
       addition to it — see MarrowCounter.js. Nothing forces the choice; a case
       that never presses either key is unchanged, which is why these are off the
       numeric pad by default.

       Off-pad on a LETTER key, the same trade the original's uncountable
       character: -1 cells should have had: no tile until someone assigns one in
       the settings, and countable from the keyboard either way. Anyone working a
       monocytic case binds one over a key they are not using.

       lineage: promonocytes are monocytic and monocytes are already 'myeloid'
       here, so they follow the same side of the M:E ratio. The combined bucket is
       mostly blasts and takes 'blast', so it follows the aspirate's "include
       blasts in the M:E ratio" switch as the blasts it mostly is. */
    { id: 'promono',  label: 'Promonos',    reportLabel: 'Promonocytes',          defaultKey: 'M', inDenom: true, suffix: '%', hideWhenZero: true, range: [0, 0], lineage: 'myeloid' },
    { id: 'proBlast', label: 'Pros/blasts', reportLabel: 'Blasts & Promonocytes', defaultKey: 'B', inDenom: true, suffix: '%', hideWhenZero: true, range: [0, 0], lineage: 'blast', excludes: ['blast'] }
];

/* rowOrder is the REPORT order and is deliberately separate from bloodCells,
   which is in keypad-authoring order. Two different concerns: the aspirate
   reorders its rows without reordering its cells. Order is verbatim from
   ../Marrow/BoneMarrow.html:781-845. */
const bloodCounterConfig = {
    id: 'pb',                      // -> #pbPanel, #pbTape, #pbKeypad, #pbTarget
    cells: bloodCells,
    rowOrder: ['atypical', 'other', 'blast', 'proBlast', 'promono', 'promyelo', 'myelo', 'meta',
               'neut', 'lymph', 'mono', 'eos', 'baso', 'plasma', 'nrbc'],
    // Report output — the original's caption word for word
    // (../Marrow/BoneMarrow.html:777), which the engine follows with
    // " (200 cells)" exactly as the original's header did.
    tableCaption: 'Peripheral Blood',

    /* Where this instance's settings block mounts, and what titles it. The id
       is one of MarrowConfig.js's settingsTabs ('differentialSettings' ->
       #differentialSettingsPanel); naming it here rather than in the engine is
       what keeps MarrowCounter.js free of Marrow ids. The aspirate will name
       the same panel and its block will land beside this one. */
    settingsPanelId: 'differentialSettingsPanel',
    settingsLabel: 'Peripheral blood differential',

    /* The pad no longer owns the whole tab — the findings form sits beneath it —
       so it is told where to mount rather than assuming #pbPanel. Everything
       INSIDE it is still #pb-prefixed from `id` above. */
    panelId: 'pbCounterMount',

    defaultLayout: 'Numbers only', // seeds the Keypad chips; the chips are the binding
    defaultTarget: 200,            // the aspirate's 500-cell rule is its own config
    targetOptions: [50, 100, 200, 250, 500, 1000],
    meRatio: false,                // aspirate: true
    pools: []                      // aspirate: neuts + precursors pool into one row
};


/* ----------------------------------------------------------------------------
   Findings — data

   Every `value` below is a report word and is quoted from the original; every
   `label` is ours to choose. That split is why the chips can read "Anemia" while
   the sentence says "anemia", and why the NRBC qualifiers keep their capitals
   ("Rare") — they lead their sentence, and carrying the capital in the value is
   how the original got sentence case without a casing pass.
-------------------------------------------------------------------------- */

/* Severity, offered wherever a finding can be graded. Two chips, not three:
   "neither" is the third state and it is reached by clicking the chosen one off
   (see MarrowForm.js). */
const bloodSeverity = [{ label: 'Mild', value: 'mild' }, { label: 'Marked', value: 'marked' }];

/* Platelets grade with adverbs where everything else grades with adjectives —
   "Platelets are mildly decreased" vs "There is mild absolute neutropenia".
   Same two chips, different words, hence a second table rather than a rule. */
const bloodPltSeverity = [{ label: 'Mild', value: 'mildly' }, { label: 'Marked', value: 'markedly' }];

const bloodHgb = [
    { label: 'Anemia', value: 'anemia' },
    { label: 'Adequate', value: 'adequate' },
    { label: 'Polycythemia', value: 'polycythemia' }
];

const bloodMcv = [
    { label: 'Microcytic', value: 'microcytic' },
    { label: 'Normocytic', value: 'normocytic' },
    { label: 'Macrocytic', value: 'macrocytic' }
];

/* The red cell features. Each is a chip with its own qualifier set and its own
   bespoke sentence in fillBlood() — they are not descriptorVocabulary entries
   because they do not pool, they anchor their own clauses.

   THE ORDER IS THE ON-SCREEN ORDER OF THE MIDDLE TIER and nothing else reads it:
   fillBlood() assembles the sentence from named ids, so moving a row here moves a
   chip and never a word of the report. NRBCs sat second and now sit third, which
   is the order asked for at the bench.

   ANISOPOIKILOCYTOSIS IS NOT IN THIS LIST. It is the one feature that owns a
   growing descriptor list, so it gets the row's bottom tier to itself with that
   list under it — see renderBloodPanel(). Keeping it here would have put a chip
   that can grow three lines tall in the middle of three that never do. */
const bloodRbcFeatures = [
    { id: 'pbPoly',     label: 'Polychromasia', quals: [{ label: 'Slight', value: 'slight' }, { label: 'Marked', value: 'marked' }] },
    { id: 'pbRouleaux', label: 'Rouleaux',      quals: [{ label: 'Slight', value: 'Slight' }] },
    { id: 'pbNrbc',     label: 'NRBCs',         quals: [{ label: 'Rare', value: 'Rare' }, { label: 'Occasional', value: 'Occasional' }, { label: 'Frequent', value: 'Frequent' }] }
];

/* The bottom tier, alone. Same shape as an entry above; a one-item list rather
   than a bare object so both tiers render through the same map. */
const bloodRbcAniso = [
    { id: 'pbAniso', label: 'Anisopoikilocytosis', quals: [{ label: 'Mild', value: 'mild' }, { label: 'Marked', value: 'marked' }] }
];

/* The white cells, one lineage per row: how many, how abnormal, what they look
   like. The original asked these as five stacked blocks of radios, five
   severity blocks and three more labelled morphology blocks — thirteen rows,
   and a lot of re-reading to see which lineages you had actually commented on.

   `options` is per row because the rows genuinely differ: monocytes are never
   called adequate and eosinophils and basophils are only ever called high (the
   original had no control for the other cells, and none of those sentences
   exist). `descGroup` is absent where a lineage has no morphology to describe,
   and `unremarkable` where "unremarkable morphology" is not one of its
   sentences — monocytes say "mature-appearing" instead. A row leaves those
   cells empty rather than offering an answer the report cannot print. */
const bloodCountColumns = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' }
];

/* `key` and `morphKey` are the highlight cue's, and a row has TWO because it
   asks two questions: how many, and what they look like. They are highlighted
   and satisfied separately — the count arrives off the analyser before the slide
   is on the stage, the morphology only once you have looked down it, so a count
   must not answer the morphology's cue on its behalf.

   Spelled out rather than derived as key + 'Morph': these are what
   templateTypeHighlights lists, and a key you cannot grep from the map back to
   its row is the thing keying on data-key exists to avoid. A row with no
   descGroup has no morphKey, because it has no morphology cell to point at. */
const bloodLineages = [
    { id: 'pbNeut',  key: 'neut',  label: 'Neutrophils', options: ['low', 'normal', 'high'], descGroup: 'pbNeutDesc',  morphKey: 'neutMorph',  unremarkable: true },
    { id: 'pbLymph', key: 'lymph', label: 'Lymphocytes', options: ['low', 'normal', 'high'], descGroup: 'pbLymphDesc', morphKey: 'lymphMorph', unremarkable: true },
    { id: 'pbMono',  key: 'mono',  label: 'Monocytes',   options: ['low', 'high'],           descGroup: 'pbMonoDesc',  morphKey: 'monoMorph',  unremarkable: false },
    { id: 'pbEos',   key: 'eos',   label: 'Eosinophils', options: ['high'] },
    { id: 'pbBaso',  key: 'baso',  label: 'Basophils',   options: ['high'] }
];

/* Labelled like the lineages above — Low | Normal | High — so every count on
   the tab is asked the same way and the eye reads one column of answers down
   the panel instead of relearning the words at the platelet row.

   The VALUES stay the report's own: "Platelets are decreased", never "Platelets
   are low". bloodPltText() interpolates the value straight into the sentence,
   which is exactly what the label/value split is for — the question can be
   phrased for the person answering it and the answer still prints as a
   pathologist writes it. */
const bloodPlt = [
    { label: 'Low', value: 'decreased' },
    { label: 'Normal', value: 'adequate' },
    { label: 'High', value: 'increased' }
];

/* Blasts and plasma cells: the same five answers asked twice, so a matrix for
   the same reason the counts are one. Values are the original's and their case
   is load-bearing — they are printed directly ("Rare circulating blasts...")
   and lowercased on the fly when they land mid-sentence. */
const bloodPresenceColumns = [
    { value: 'No', label: 'None' },
    { value: 'Present', label: 'Present' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Occasional', label: 'Occasional' },
    { value: 'Frequent', label: 'Frequent' }
];

/* `descGroup` / `morphKey` exactly as on the lineage rows above, and for the same
   reason: how many is one question and what they look like is another, answered at
   different times and cued separately.

   NO "Unremarkable" STOP CHIP on this row, unlike every other morphology cell on
   the tab. "Blasts show unremarkable morphology" is not a sentence anyone writes —
   a circulating blast is abnormal by its presence, so there is no normal for the
   chip to assert. Plasma cells get no cell at all: the blood tab has no plasma
   descriptor list (the aspirate does), so the column is left empty rather than
   invented, the same as the eosinophil and basophil rows in the matrix above. */
const bloodPresence = [
    { id: 'pbBlast',  key: 'blast',  label: 'Blasts', descGroup: 'pbBlastDesc', morphKey: 'blastMorph' },
    { id: 'pbPlasma', key: 'plasma', label: 'Plasma cells' }
];

/* Which descriptors each morphology group offers, in dropdown order. The
   vocabulary itself lives in MarrowDescriptors.js; these are the old app's
   per-select lists (anisoList, neutrophilList, lymphocyteList, monocyteList,
   plateletList) minus the leading "", which the list machinery adds itself. */
const bloodDescriptorGroups = {
    pbAnisoDesc: ['acanthocytes', 'basophilicStippling', 'biteCells', 'blisterCells', 'burrCells',
                  'echinocytes', 'elliptocytes', 'howellJolly', 'macroovalocytes', 'microspherocytes',
                  'ovalocytes', 'schistocytes', 'sickleCells', 'spherocytes', 'targetCells',
                  'teardropCells', 'teardropForms'],
    // pseudoPelgerHuet and pseudoChediakHigashi are WHO-HAEM5 Table 2.10's
    // dysgranulopoiesis terms, offered on blood neutrophils exactly as on the
    // aspirate's myeloid list (they are the same cells one maturation later).
    pbNeutDesc:  ['hypogranularForms', 'hypolobatedForms', 'pseudoPelgerHuet', 'hypersegmentedForms',
                  'pseudoChediakHigashi', 'shiftToImmaturity', 'toxicChanges'],
    pbLymphDesc: ['lymphNoAtypical', 'smallMature', 'smallMatureAndLargeGranular', 'predominantlyLargeGranular',
                  'polymorphous', 'reactive', 'predominantlyCllLike', 'subsetCllLike', 'marginalZoneLike', 'hairyCellLike'],
    pbMonoDesc:  ['matureMorphology', 'shiftToImmaturity'],
    pbPltDesc:   ['hypogranularPlatelets', 'largePlatelets', 'giantPlatelets'],
    /* The shared list, from MarrowDescriptors.js rather than spelled out here —
       the aspirate offers the identical keys and the diagnosis engine reads Auer
       rods out of both groups, so the two must not be free to drift. */
    pbBlastDesc: BLAST_DESCRIPTORS
};


/* ----------------------------------------------------------------------------
   CBC autofill — data

   A pasted CBC already answers half this form. Epic flags every result High or
   Low against the lab's own reference range, so "is there anemia" has been
   decided by the analyser before the slide is on the stage; making the user
   re-answer it by hand is asking them to transcribe. Ported from
   ../Marrow/MarrowText.js:128-260 (fillInputs) and the map at
   ../Marrow/MarrowData.js:76-105 (cbcObject).

   ONE TABLE, TWO READERS. Each rule says which CBC component answers which
   toggle group; bloodApplyCBC() reads it to fill the form, and
   renderBloodSettings() reads it to render that rule's thresholds. A rule with
   no `severity` has no thresholds and gets no settings rows — which is why MCV
   is one line here and nothing at all there.

   `low`/`normal`/`high` are the toggle-group values to choose. Absent means the
   sentence does not exist: eosinophils are never called low or adequate, and
   monocytes are never called adequate — so a CBC saying so chooses nothing,
   exactly as the old map did by leaving the key out.

   Thresholds are `pbCbc<key><Low|High><Mild|Marked>` and are DELIBERATELY
   unset. The old app shipped all 22 blank too: what counts as marked anemia is
   a clinical judgement and the app has no business inventing one. Until they
   are set, a CBC picks the finding and leaves the grade alone — see
   bloodGradeFrom().
-------------------------------------------------------------------------- */
const bloodCbcRules = [
    { key: 'Hgb', component: 'HGB', group: 'pbHgb', severity: 'pbHgbSev', unit: 'g/dL',
      low: 'anemia', normal: 'adequate', high: 'polycythemia',
      lowName: 'Anemia', highName: 'Polycythemia' },

    // No severity: an MCV is microcytic or it is not — there is no mild about it.
    { key: 'Mcv', component: 'MCV', group: 'pbMcv',
      low: 'microcytic', normal: 'normocytic', high: 'macrocytic' },

    { key: 'Neut', component: 'Absolute Neutrophils', group: 'pbNeut', severity: 'pbNeutSev', unit: 'K/uL',
      low: 'low', normal: 'normal', high: 'high',
      lowName: 'Neutropenia', highName: 'Neutrophilia' },

    /* Epic flags absolute lymphocytes against a range so wide that the flag
       stops meaning much in the middle of it; the old app ignored the result
       entirely between 0.2 and 4.0 rather than report a lymphopenia nobody
       would call. ../Marrow/MarrowText.js:137-142. */
    { key: 'Lymph', component: 'Absolute Lymphocytes', group: 'pbLymph', severity: 'pbLymphSev', unit: 'K/uL',
      low: 'low', normal: 'normal', high: 'high',
      lowName: 'Lymphopenia', highName: 'Lymphocytosis',
      ignoreBetween: [0.2, 4.0] },

    // Monocytosis grades; monocytopenia does not — the old map gave it high
    // thresholds only, so a low monocyte count picks the finding and stops.
    { key: 'Mono', component: 'Absolute Monocytes', group: 'pbMono', severity: 'pbMonoSev', unit: 'K/uL',
      low: 'low', high: 'high', highName: 'Monocytosis' },

    { key: 'Eos', component: 'Absolute Eosinophils', group: 'pbEos', severity: 'pbEosSev', unit: 'K/uL',
      high: 'high', highName: 'Eosinophilia' },

    { key: 'Baso', component: 'Absolute Basophils', group: 'pbBaso', severity: 'pbBasoSev', unit: 'K/uL',
      high: 'high', highName: 'Basophilia' },

    { key: 'Plt', component: 'PLT', group: 'pbPlt', severity: 'pbPltSev', unit: 'K/uL',
      low: 'decreased', normal: 'adequate', high: 'increased',
      lowName: 'Thrombocytopenia', highName: 'Thrombocytosis' }
];

/* How many NRBCs is "occasional". The only thresholds the old app shipped with
   values, so they are the only ones carried over — verbatim, from
   ../Marrow/BoneMarrow.html:1126,1131. */
const bloodNrbcLimits = [
    { id: 'pbNrbcOccasionalLimit', label: 'Occasional NRBCs >', value: '0.3' },
    { id: 'pbNrbcFrequentLimit',   label: 'Frequent NRBCs >',   value: '1.0' }
];

/* A shift to immaturity is called from the CBC's own left shift. 1.0% is the
   old app's threshold, carried verbatim (../Marrow/MarrowText.js:1352). */
const BLOOD_SHIFT_PERCENT = 1.0;


/* ----------------------------------------------------------------------------
   Findings — render
-------------------------------------------------------------------------- */

/* A row of the compact label + controls grid. `.findingRow` spends 88px on its
   label against .lowerGrid's 200px, which is most of where the height savings
   turn into width for the chips. */
/* A row of the compact label + controls grid. The optional `key` goes on the
   CONTROLS, not the label: the highlight cue draws a box round the inputs it
   is pointing at, and a box round the word "Hemoglobin" points at nothing. */
function findingRow(label, controls, key) {
    const keyAttr = key ? ` data-key="${key}"` : '';
    return `<div class="findingLabel">${label}</div><div class="findingChips"${keyAttr}>${controls}</div>`;
}

/* One toggle-group chip: at most one per group, and clickable off.

   `qualifier` marks a chip that grades an answer rather than being one — the
   severity pairs. It is the same `chipQualInput` the descriptor qualifiers
   carry, and it means one thing: the highlight cue does not count it as having
   answered the question. "Mild" does not answer "is there anemia?", and a
   severity outlives the count it graded (hidden, not cleared — see
   syncBloodSeverity), so without this a cleared count would leave its row
   looking answered by a chip you cannot even see. */
function bloodToggleChip(group, option, qualifier) {
    const id = group + '_' + option.value;
    const cls = 'chipInput form' + (qualifier ? ' chipQualInput' : '');
    return `<input type="checkbox" class="${cls}" id="${id}" value="${option.value}" data-toggle="${group}"><label class="chip" for="${id}">${option.label}</label>`;
}

/* A whole toggle group, as one segmented control (.chipGroup, Template.css).
   The wrapper goes HERE rather than at the call sites so every group gets it and
   none can be missed — and so bloodToggleChip stays the way to emit a chip that
   is NOT part of a contiguous run: the matrix cells call it one at a time, and
   they must stay loose chips in their own grid columns. */
function bloodToggleRow(group, options, qualifier) {
    const chips = options.map(function (option) { return bloodToggleChip(group, option, qualifier); }).join('');
    return chips ? `<span class="chipGroup">${chips}</span>` : '';
}

/* One question's worth of chips inside a row that asks more than one, so each
   gets its own highlight box instead of sharing one that spans both. The
   lineage matrix splits the same way and for the same reason — see
   bloodLineageRow(). A row asking a single question needs none of this: its
   .findingChips is the box.

   For the COUNT half only. The morphology half of such a row is a
   bloodMorphCell() like any other, so it cannot drift out of step with the
   lineage rows' — they are the same question and must look it. */
function bloodChipSet(key, controls) {
    return `<span class="chipSet" data-key="${key}">${controls}</span>`;
}

/* "Unremarkable morphology" for a descriptor group. A stop chip: it means the
   absence of every descriptor beside it, so MarrowForm.js clears them against
   each other. */
function bloodUnremarkableChip(group) {
    const id = group + 'Unremarkable';
    return `<input type="checkbox" class="chipInput form" id="${id}" data-stopgroup="${group}" data-stop><label class="chip" for="${id}">Unremarkable</label>`;
}

/* A morphology cell: the "unremarkable" stop chip, then the growing dropdown
   list. `descGroup` omitted for a lineage that has no morphology to describe
   (eosinophils, basophils — the original had no control and there is no
   sentence), which leaves the cell empty rather than inventing one. */
function bloodMorphCell(descGroup, unremarkable, key) {
    if (!descGroup) return '<div></div>';
    return `<div class="matrixMorph" data-key="${key}">${unremarkable ? bloodUnremarkableChip(descGroup) : ''}${descriptorListHTML(descGroup)}</div>`;
}

/* Everything about one lineage on one line: how many, how abnormal, and what
   they look like. The count chips still line up in columns across the five
   rows — that is what makes "which lineages did I comment on" a glance rather
   than a read — but there are no column HEADERS, because a chip labelled "Low"
   under a heading saying "Low" says it twice.

   Severity is `visibility: hidden` rather than absent when the lineage is
   adequate or unanswered: the grid must not reflow every time a chip is
   clicked, and a row that moves as you fill it is a row you cannot aim at. */
function bloodLineageRow(lineage) {
    const cells = bloodCountColumns.map(function (column) {
        if (lineage.options.indexOf(column.value) === -1) return '<div></div>';
        return `<div class="matrixCell">${bloodToggleChip(lineage.id, column)}</div>`;
    }).join('');

    // The count chips are wrapped as ONE element so the highlight has something
    // to draw a box around — three loose grid cells have nothing. It costs no
    // alignment: .matrixControls is a subgrid, so its cells sit in the parent's
    // columns exactly as they did when they were the parent's own children.
    //
    // The severity rides INSIDE that wrapper because it grades the count and is
    // part of the same question. The morphology cell is its own box, outside it.
    return `<div class="chipMatrixLabel">${lineage.label}</div>
        <div class="matrixControls" data-key="${lineage.key}">
            ${cells}
            <div class="matrixSeverity" id="${lineage.id}Severity">${bloodToggleRow(lineage.id + 'Sev', bloodSeverity, true)}</div>
        </div>
        ${bloodMorphCell(lineage.descGroup, lineage.unremarkable, lineage.morphKey)}`;
}

/* The same two-box shape as bloodLineageRow: the five presence chips in one
   highlight box, the morphology in its own. bloodMorphCell() is the very function
   the lineage rows use, so the blast dropdowns cannot come out formatted
   differently from the neutrophil ones. */
function bloodPresenceRow(row) {
    const cells = bloodPresenceColumns.map(function (column) {
        return `<div class="matrixCell">${bloodToggleChip(row.id, column)}</div>`;
    }).join('');
    return `<div class="chipMatrixLabel">${row.label}</div>
        <div class="matrixControls" data-key="${row.key}">${cells}</div>
        ${bloodMorphCell(row.descGroup, false, row.morphKey)}`;
}

/* No section headings: a rule between the groups says the same thing without
   spending a row on saying it, and the row labels already name what they are. */
function renderBloodPanel() {
    const panel = document.getElementById('pbPanel');
    if (!panel) return;

    const rbcChips = function (features) {
        return features.map(function (feature) {
            return qualChipHTML(feature.id, feature.label, feature.quals, 'pbRbc');
        }).join('');
    };

    // The counter mounts into #pbCounterMount; everything below it is this
    // file's. Kept in one innerHTML so the tab has a single shape to read.
    panel.innerHTML = `
        <div id="pbCounterMount"></div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${findingRow('Hemoglobin', bloodToggleRow('pbHgb', bloodHgb) +
                    `<span class="chipGap"></span><span class="chipSub" id="pbHgbSeverity">${bloodToggleRow('pbHgbSev', bloodSeverity, true)}</span>`, 'hgb')}
                ${findingRow('MCV / MCHC', bloodToggleRow('pbMcv', bloodMcv) +
                    `<span class="chipGap"></span>` +
                    `<input type="checkbox" class="chipInput form" id="pbHypochromic"><label class="chip" for="pbHypochromic">Hypochromic</label>`, 'mcv')}
                ${/* A TIER PER FINDING, STACKED.

                      Top is the stop chip alone: "Unremarkable" negates
                      everything under it (see the .stopgroup handler in
                      MarrowForm.js), so it is not one option among four and
                      should not sit in a line with them.

                      Then polychromasia, rouleaux and NRBCs EACH take a line
                      of their own (the author's call — they shared one, and a
                      picked qualifier crowded its neighbours sideways; on
                      separate tiers a qualifier opens into its own line's
                      space).

                      Bottom is anisopoikilocytosis and the descriptor list it
                      owns, which grows a line every time you name a poikilocyte.
                      On one flex line that growth pushed the chips after it
                      around; on its own tier it grows downward into empty space.
                      The list still carries no label of its own — it belongs to
                      the chip directly above it. */''}
                ${findingRow('Morphology',
                    `<span class="chipStack">` +
                        `<span class="chipSet">${bloodUnremarkableChip('pbRbc')}</span>` +
                        bloodRbcFeatures.map(function (feature) {
                            return `<span class="chipSet">${rbcChips([feature])}</span>`;
                        }).join('') +
                        // The atlas link rides the aniso tier, which is the row
                        // that reveals the poikilocyte dropdowns — so it is
                        // beside the question it answers ("what does a burr cell
                        // look like?") and only in view when that question is
                        // being asked.
                        `<span class="chipSet">${rbcChips(bloodRbcAniso)}${refLinkHTML('rbc-morphology')}</span>` +
                        `<span class="descBlock" id="pbAnisoDescRow" style="display: none">${descriptorListHTML('pbAnisoDesc')}</span>` +
                    `</span>`, 'rbcMorph')}
            </div>
        </div>

        <div class="findingGroup">
            <div class="chipMatrix countMatrix">
                ${bloodLineages.map(bloodLineageRow).join('')}
            </div>
        </div>

        <div class="findingGroup">
            <div class="findingGrid">
                ${/* The same shape as a lineage row — count, the severity that
                      grades it, then morphology — just drawn in a .findingGrid
                      rather than the matrix, since platelets are asked once and
                      have no column of neighbours to line up with.

                      Two questions on one line, so two boxes; no key on the row
                      itself, because one box spanning both is what this splits.
                      The morphology cell is bloodMorphCell(), the very function
                      the lineage rows use: same markup, same class, so the
                      platelet dropdowns cannot come out formatted differently
                      from the neutrophil ones. It brings its own 10px step, so
                      there is no .chipGap before it. */
                  findingRow('Platelets',
                    bloodChipSet('plt', bloodToggleRow('pbPlt', bloodPlt) +
                        `<span class="chipGap"></span><span class="chipSub" id="pbPltSeverity">${bloodToggleRow('pbPltSev', bloodPltSeverity, true)}</span>`) +
                    bloodMorphCell('pbPltDesc', true, 'pltMorph'))}
            </div>
        </div>

        <div class="findingGroup">
            <div class="chipMatrix presenceMatrix">
                ${bloodPresence.map(bloodPresenceRow).join('')}
            </div>
        </div>`;

    Object.keys(bloodDescriptorGroups).forEach(function (group) {
        registerDescriptorGroup(group, bloodDescriptorGroups[group]);
        renderDescriptorList(group);
    });
}

/* ----------------------------------------------------------------------------
   Blood settings — the thresholds the CBC autofill grades against

   Rendered from bloodCbcRules, so a rule and its settings cannot disagree about
   which thresholds exist: add `severity` to a rule and its rows appear here.

   The bounds are stated in the labels ("Mild ≥", "Marked <") because they are
   not guessable and getting one backwards is silent — the grade just never
   fires. They read outward from the reference range in both directions: a mild
   anemia is one that has not fallen far (≥ the mild bound), a marked one has
   gone past the marked bound.
-------------------------------------------------------------------------- */

function bloodThresholdPair(rule, direction) {
    const name = direction === 'Low' ? rule.lowName : rule.highName;
    if (!name) return '';

    // Low: mild is the near bound (≥), marked the far one (<). High mirrors it.
    const mildOp = direction === 'Low' ? '≥' : '≤';
    const markedOp = direction === 'Low' ? '<' : '>';

    const box = function (grade, op) {
        const id = bloodThresholdId(rule, direction, grade);
        return `<label class="thresholdOp" for="${id}">${grade} ${op}</label>` +
               `<input type="number" class="thresholdInput setting" id="${id}" step="0.1">`;
    };

    return `<div class="findingLabel">${name}</div>
        <div class="thresholdRow">${box('Mild', mildOp)}${box('Marked', markedOp)}
            <span class="thresholdUnit">${rule.unit}</span></div>`;
}

function renderBloodSettings() {
    const panel = document.getElementById('bloodSettingsPanel');
    if (!panel) return;

    const rows = bloodCbcRules.map(function (rule) {
        if (!rule.severity) return '';
        return bloodThresholdPair(rule, 'Low') + bloodThresholdPair(rule, 'High');
    }).join('');

    const nrbc = bloodNrbcLimits.map(function (limit) {
        return `<div class="findingLabel">${limit.label}</div>
            <div class="thresholdRow">
                <input type="number" class="thresholdInput setting" id="${limit.id}" step="0.1" value="${limit.value}">
                <span class="thresholdUnit">K/uL</span>
            </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="findingGroup">
            <div class="findingGrid">${rows}</div>
        </div>
        <div class="findingGroup">
            <div class="findingGrid">${nrbc}</div>
        </div>`;

    settingsPanelSave(panel);
}


/* Severity is only a question once a finding is abnormal: "mild" qualifies
   neutropenia, not adequacy. Hidden rather than removed, so no row moves.

   Kept as a display concern and NOT enforced by clearing the chips: a severity
   you set, hid by picking Normal, and revealed again by picking High is still
   the one you set. fillBlood() reads severity only on the branches that use it,
   so a hidden one cannot leak into the report. */
function syncBloodSeverity() {
    const show = function (id, on) {
        const el = document.getElementById(id);
        if (el) el.style.visibility = on ? 'visible' : 'hidden';
    };

    const hgb = toggleGroupValue('pbHgb');
    show('pbHgbSeverity', hgb === 'anemia' || hgb === 'polycythemia');

    bloodLineages.forEach(function (lineage) {
        const value = toggleGroupValue(lineage.id);
        show(lineage.id + 'Severity', value === 'low' || value === 'high');
    });

    const plt = toggleGroupValue('pbPlt');
    show('pbPltSeverity', plt === 'decreased' || plt === 'increased');

    // The aniso descriptor list is 17 chips and three rows of them: worth its
    // height only once anisopoikilocytosis is actually claimed. This one IS
    // removed rather than hidden — it is a whole row, and reserving three rows
    // of space for a list you are not using defeats the point.
    const anisoRow = document.getElementById('pbAnisoDescRow');
    if (anisoRow) anisoRow.style.display = document.getElementById('pbAniso')?.checked ? '' : 'none';
}


/* ----------------------------------------------------------------------------
   CBC autofill — behavior
-------------------------------------------------------------------------- */

function bloodThresholdId(rule, direction, grade) {
    return 'pbCbc' + rule.key + direction + grade;
}

/* Which grade a value earns, as an index into the severity pair, or -1 for
   none. The bounds read backwards between the directions and that is not a
   slip: for a HIGH result, "mild" is the one that has not gone far — below the
   mild bound — while "marked" is past the marked bound. Low mirrors it. Between
   the two, the finding is graded by neither word, which is a real answer and
   the old app's (../Marrow/MarrowText.js:150-180).

   An unset threshold is NaN, and every comparison against NaN is false, so it
   falls through to -1: no thresholds configured means findings get picked and
   grades get left alone. That is the out-of-the-box behavior by design. */
function bloodGradeFrom(rule, direction, value) {
    const mild = parseFloat(getSetting(bloodThresholdId(rule, direction, 'Mild'), ''));
    const marked = parseFloat(getSetting(bloodThresholdId(rule, direction, 'Marked'), ''));

    if (direction === 'High') {
        if (value < mild) return 0;
        if (value > marked) return 1;
    } else {
        if (value > mild) return 0;
        if (value < marked) return 1;
    }
    return -1;
}

/* The severity chips of a group, in order: [mild, marked]. Read off the DOM
   rather than restated, because platelets grade with adverbs ("mildly") and
   everything else with adjectives ("mild") — the words differ, the pair does
   not, and the autofill only ever wants the first or the second. */
function bloodApplyGrade(rule, direction, value, panic) {
    if (!rule.severity) return;
    clearToggleGroup(rule.severity);

    const chips = Array.from(toggleGroupMembers(rule.severity));
    if (chips.length < 2) return;

    // A panic value is marked by definition; no threshold gets a say.
    const grade = panic ? 1 : bloodGradeFrom(rule, direction, value);
    if (grade >= 0) chips[grade].checked = true;
}

function bloodApplyRule(rule) {
    const result = cbcResult(rule.component);
    if (!result) return;

    const value = parseFloat(result.value);
    if (rule.ignoreBetween && value >= rule.ignoreBetween[0] && value <= rule.ignoreBetween[1]) return;

    const high = /high/i.test(result.flag);
    const low = /low/i.test(result.flag);
    const direction = high ? 'high' : low ? 'low' : 'normal';

    // Absent means the sentence does not exist for this lineage — an
    // eosinophil count inside the reference range says nothing worth saying.
    if (!rule[direction]) return;
    setToggleGroup(rule.group, rule[direction]);

    if (direction === 'normal') {
        if (rule.severity) clearToggleGroup(rule.severity);
        return;
    }
    bloodApplyGrade(rule, high ? 'High' : 'Low', value, /panic/i.test(result.flag));
}

/* NRBCs are not flagged: any at all is abnormal, so their presence is the count
   itself being above zero. Graded off the ABSOLUTE count against the two limits
   that do ship with values.

   The old app required both the percentage and the absolute count to be present
   before it would do any of this, and had a dead `else if` clearly meaning to
   handle the one-of-two case (../Marrow/MarrowText.js:191-223). Either alone is
   enough here; the grade needs the absolute count and is skipped without it. */
function bloodApplyNrbc() {
    const percent = cbcValue('NRBCs');
    const absolute = cbcValue('Absolute NRBCs');
    if (!(percent > 0 || absolute > 0)) return;

    const chip = document.getElementById('pbNrbc');
    if (chip) chip.checked = true;

    if (!(absolute >= 0)) return;
    const frequent = parseFloat(getSetting('pbNrbcFrequentLimit', '1.0'));
    const occasional = parseFloat(getSetting('pbNrbcOccasionalLimit', '0.3'));

    setToggleGroup('pbNrbcQual', absolute > frequent ? 'Frequent' : absolute > occasional ? 'Occasional' : 'Rare');
}

/* A left shift on the CBC names one on the smear. Adds the descriptor rather
   than replacing the list, and only if it is not already named — this runs on
   every keystroke in the paste box, and it must not fight the user for the
   neutrophil list. */
function bloodApplyShift() {
    if (!(cbcValue('Immature Granulocytes') > BLOOD_SHIFT_PERCENT)) return;
    if (descriptorChecked('pbNeutDesc', 'shiftToImmaturity')) return;

    const free = Array.from(document.querySelectorAll('#pbNeutDescList .descSelect'))
        .find(function (select) { return !select.value; });
    if (!free) return;

    free.value = 'shiftToImmaturity';
    renderDescriptorList('pbNeutDesc');
}

/* Everything a CBC can answer. Runs on the cbcParsed event — before
   fillReport(), so the report is built from the filled-in form rather than
   trailing it by a keystroke.

   It overwrites: a re-paste re-answers, the same as the old app. The CBC is the
   objective half of these findings and the analyser is a better judge of "is
   this count low" than a recollection of what was clicked ten minutes ago. */
function bloodApplyCBC() {
    bloodCbcRules.forEach(bloodApplyRule);

    // MCHC low is the only thing that makes red cells hypochromic, and it is a
    // plain checkbox rather than a choice among answers, so it is not a rule.
    const hypochromic = document.getElementById('pbHypochromic');
    if (hypochromic && cbcFlagged('MCHC', 'low')) hypochromic.checked = true;

    bloodApplyNrbc();
    bloodApplyShift();
    syncBloodSeverity();
}


/* ----------------------------------------------------------------------------
   Findings — report text

   Every string is quoted from ../Marrow/MarrowText.js:1103-1546. Each function
   below owns one sentence of the paragraph and returns '' when it has nothing
   to say, so the paragraph is the concatenation and the order here IS the order
   on the page.

   Sentences are assembled from parts rather than concatenated fragment by
   fragment, which is the one place this diverges from the original: there,
   every optional word carried its own leading or trailing space and skipping
   one left a double space in the report ("shows  anemia"). Same words, same
   punctuation, spacing that holds whichever words are present.
-------------------------------------------------------------------------- */

function bloodChecked(id) {
    return document.getElementById(id)?.checked === true;
}

/* " mild" / "" — the space belongs to the qualifier, not to the sentence around
   it, which is what lets the sentence read the same with or without one. */
function bloodGrade(group) {
    const value = toggleGroupValue(group);
    return value ? ' ' + value : '';
}

/* Hemoglobin, with MCV and hypochromasia folded in: they are adjectives on the
   same noun, not findings of their own. "The peripheral blood smear shows mild
   microcytic, hypochromic anemia."

   Adequate hemoglobin says only that — the original ignores MCV entirely on
   that branch, and so does this: "normocytic adequate" is not a thing anyone
   writes. The comma before "hypochromic" appears only after an MCV word, since
   it is separating two adjectives and there is nothing to separate otherwise. */
function bloodHgbText() {
    const hgb = toggleGroupValue('pbHgb');
    if (hgb === 'adequate') return 'The peripheral blood smear shows adequate hemoglobin. ';
    if (!hgb) return '';

    const mcv = toggleGroupValue('pbMcv');
    const words = [];

    const severity = toggleGroupValue('pbHgbSev');
    if (severity) words.push(severity);
    if (mcv) words.push(mcv);

    let lead = words.join(' ');
    if (bloodChecked('pbHypochromic')) {
        if (mcv) lead += ', hypochromic';
        else lead = lead ? lead + ' hypochromic' : 'hypochromic';
    }

    return `The peripheral blood smear shows ${lead ? lead + ' ' : ''}${hgb}. `;
}

/* Anisopoikilocytosis, which is a clause rather than a sentence: it lands after
   "Red blood cells show " or after "polychromasia and ". Naming the descriptors
   makes it specific; naming none makes it "nonspecific". */
function bloodAnisoClause() {
    const grade = toggleGroupValue('pbAnisoQual');
    const lead = grade ? grade + ' ' : '';
    const list = descriptorPhrase('pbAnisoDesc');

    return list ? `${lead}anisopoikilocytosis including ${list}. ` : `${lead}nonspecific anisopoikilocytosis. `;
}

function bloodRbcText() {
    let text = '';

    if (bloodChecked('pbRbcUnremarkable')) text += 'Red blood cells show unremarkable morphology. ';

    // Polychromasia and anisopoikilocytosis share one sentence when both are
    // present ("...show slight polychromasia and mild anisopoikilocytosis...").
    const poly = bloodChecked('pbPoly');
    const aniso = bloodChecked('pbAniso');

    if (poly) {
        const grade = toggleGroupValue('pbPolyQual');
        text += 'Red blood cells show ' + (grade ? grade + ' ' : '') + 'polychromasia';
        text += aniso ? ' and ' + bloodAnisoClause() : '. ';
    } else if (aniso) {
        text += 'Red blood cells show ' + bloodAnisoClause();
    }

    // NRBCs and rouleaux likewise share a sentence ("Rare nucleated red blood
    // cells and slight rouleaux formation are identified."), which is why the
    // qualifier values here carry their own capital: the qualifier leads the
    // sentence when there is one, and the noun leads when there is not.
    const nrbc = bloodChecked('pbNrbc');
    const rouleaux = bloodChecked('pbRouleaux');
    const rouleauxGrade = toggleGroupValue('pbRouleauxQual');

    if (nrbc) {
        const grade = toggleGroupValue('pbNrbcQual');
        text += grade ? `${grade} nucleated red blood cells ` : 'Nucleated red blood cells ';

        if (rouleaux) {
            text += 'and ' + (rouleauxGrade ? rouleauxGrade.toLowerCase() + ' ' : '') + 'rouleaux formation are identified. ';
        } else {
            text += 'are identified. ';
        }
    } else if (rouleaux) {
        text += rouleauxGrade ? `${rouleauxGrade} rouleaux formation is present. ` : 'Rouleaux formation is present. ';
    }

    return text;
}

/* Neutrophils and lymphocytes are one sentence shape: a count, then what the
   cells look like. Shared rather than written twice because the strings differ
   only in the nouns — and the one real exception is spelled out below.

     abnormal   "There is mild absolute neutropenia. <morphology>"
     adequate   "Neutrophils are adequate. <morphology>"
     unanswered "<morphology>"

   The exception: adequate + unremarkable is ONE clause ("Neutrophils are
   adequate and show unremarkable morphology.") rather than two sentences. It is
   the only branch that merges, and it does not apply to a stop descriptor —
   "Lymphocytes are adequate and show No discrete atypical..." is not a
   sentence. */
function bloodCellText(spec) {
    const value = toggleGroupValue(spec.group);
    const unremarkable = bloodChecked(spec.descGroup + 'Unremarkable');
    const stop = spec.stopText && descriptorChecked(spec.descGroup, spec.stopKey);
    const list = spec.list();

    const morphology = stop ? spec.stopText
        : unremarkable ? `${spec.cells} show unremarkable morphology. `
        : list ? `${spec.cells} show ${list}. `
        : '';

    if (value === 'low' || value === 'high') {
        return `There is${bloodGrade(spec.group + 'Sev')} absolute ${value === 'low' ? spec.low : spec.high}. ${morphology}`;
    }
    if (value === 'normal') {
        if (unremarkable && !stop) return `${spec.cells} are adequate and show unremarkable morphology. `;
        return `${spec.cells} are adequate. ${morphology}`;
    }
    return morphology;
}

/* Whether a named shift to immaturity has taken the blast finding into its own
   sentence. Asked in two places that must agree — bloodNeutList() writes the
   phrase and bloodPresenceText() has to stay silent about what it said — so the
   test is written once rather than twice. */
function bloodBlastSwallowed() {
    const blast = toggleGroupValue('pbBlast');
    return descriptorChecked('pbNeutDesc', 'shiftToImmaturity') && !!blast && blast !== 'No';
}

/* A named shift to immaturity swallows the blast finding: "a mild shift to
   immaturity including rare blasts" says it once, in the sentence where it
   belongs, instead of twice in two. bloodPresenceText() drops its half to
   match — the two must agree, which is why both read bloodBlastSwallowed().

   THE MORPHOLOGY RIDES ACROSS WITH THE COUNT, rather than being left behind for a
   sentence that will not now be written: "a mild shift to immaturity including
   rare blasts with Auer rods". Saying it once is the whole point of the swallow,
   and a morphology stranded in a suppressed sentence would simply vanish. */
function bloodNeutList() {
    const list = descriptorPhrase('pbNeutDesc');
    if (!bloodBlastSwallowed()) return list;

    const blast = toggleGroupValue('pbBlast');
    const modifier = blast === 'Present' ? '' : blast.toLowerCase() + ' ';
    const morph = descriptorPhrase('pbBlastDesc');
    return list.replace(/shift to immaturity/i,
        `shift to immaturity including ${modifier}blasts${morph ? ` with ${morph}` : ''}`);
}

function bloodNeutText() {
    return bloodCellText({
        group: 'pbNeut', descGroup: 'pbNeutDesc', cells: 'Neutrophils',
        low: 'neutropenia', high: 'neutrophilia', list: bloodNeutList
    });
}

function bloodLymphText() {
    return bloodCellText({
        group: 'pbLymph', descGroup: 'pbLymphDesc', cells: 'Lymphocytes',
        low: 'lymphopenia', high: 'lymphocytosis',
        stopKey: 'lymphNoAtypical', stopText: 'No discrete atypical lymphocyte population is identified. ',
        list: function () { return descriptorPhrase('pbLymphDesc'); }
    });
}

/* Monocytes take the same shape minus two things, which is why they are not
   bloodCellText(): they are never called adequate, and an abnormal count always
   carries a morphology sentence — silence defaults to "mature-appearing
   morphology" rather than to nothing. */
function bloodMonoText() {
    const value = toggleGroupValue('pbMono');
    const list = descriptorPhrase('pbMonoDesc');

    if (value === 'low' || value === 'high') {
        const term = value === 'low' ? 'monocytopenia' : 'monocytosis';
        return `There is${bloodGrade('pbMonoSev')} absolute ${term}. Monocytes show ${list || 'mature-appearing morphology'}. `;
    }
    return list ? `Monocytes show ${list}. ` : '';
}

/* Eosinophils and basophils share a sentence when both are raised, because they
   are read off the same differential in the same breath. Each keeps its own
   grade inside it. */
function bloodEosBasoText() {
    const eos = toggleGroupValue('pbEos') === 'high';
    const baso = toggleGroupValue('pbBaso') === 'high';

    if (eos && baso) {
        return `There is${bloodGrade('pbEosSev')} absolute eosinophilia and${bloodGrade('pbBasoSev')} absolute basophilia. `;
    }
    if (eos) return `There is${bloodGrade('pbEosSev')} absolute eosinophilia. `;
    if (baso) return `There is${bloodGrade('pbBasoSev')} absolute basophilia. `;
    return '';
}

/* Platelets grade as adverbs and carry their morphology with "with" rather than
   in a second sentence — a different shape from every lineage above, which is
   why it is written out rather than folded into bloodCellText(). */
function bloodPltText() {
    const value = toggleGroupValue('pbPlt');
    const unremarkable = bloodChecked('pbPltDescUnremarkable');
    const list = descriptorPhrase('pbPltDesc');

    const tail = unremarkable ? ' with unremarkable morphology' : list ? ` with ${list}` : '';

    if (value === 'decreased' || value === 'increased') {
        return `Platelets are${bloodGrade('pbPltSev')} ${value}${tail}. `;
    }
    if (value === 'adequate') return `Platelets are adequate${tail}. `;

    // No count given, but morphology named: the morphology becomes the subject.
    if (list) return `${list.charAt(0).toUpperCase()}${list.slice(1)} are seen. `;
    if (unremarkable) return 'Platelets show unremarkable morphology. ';
    return '';
}

/* The blast half of the sentence, with whatever morphology was named riding
   inside it — "Rare circulating blasts with Auer rods". Always sentence-leading:
   blasts come first in every shape below, including the one they share with the
   plasma cells, so the stored capital is always the right one. */
function bloodBlastClause(blast, list) {
    const noun = blast && blast !== 'Present'
        ? `${blast} circulating blasts`
        : 'Circulating blasts';
    return list ? `${noun} with ${list}` : noun;
}

/* Blasts and plasma cells: one sentence when they agree, two when they do not.
   The values are printed as stored, which is why their case matters — "Rare"
   leads a sentence, "rare" lands mid-one.

   A NAMED BLAST MORPHOLOGY BREAKS EVERY MERGE, and has to. All three combined
   shapes below put one adjective in front of both nouns ("Rare circulating blasts
   and plasma cells"), which cannot survive a qualifier that belongs to only one
   of them: "rare circulating blasts with Auer rods and plasma cells" reads as
   plasma cells with Auer rods. So the blasts take their own sentence, exactly as
   a named plasma morphology already splits the aspirate's combined line.

   NAMING A MORPHOLOGY IS ITSELF THE ASSERTION that the blasts are there, so the
   list can carry the sentence with no presence chip set at all — but it must
   never contradict a chip that says none, which is why 'No' suppresses it. */
function bloodPresenceText() {
    const chip = toggleGroupValue('pbBlast');
    const plasma = toggleGroupValue('pbPlasma');

    // Already said in the neutrophil sentence — see bloodNeutList(), which
    // carries the morphology across with it.
    const swallowed = bloodBlastSwallowed();
    const blast = swallowed ? '' : chip;
    const list = swallowed || chip === 'No' ? '' : descriptorPhrase('pbBlastDesc');

    if (!list) {
        if (blast === plasma && blast !== '') {
            if (blast === 'No') return 'No circulating blasts or plasma cells are identified. ';
            if (blast === 'Present') return 'Circulating blasts and plasma cells are identified. ';
            return `${blast} circulating blasts and plasma cells are identified. `;
        }

        const bothPositive = (blast && blast !== 'No') && (plasma && plasma !== 'No');
        if (bothPositive) {
            const plasmaText = plasma === 'Present' ? 'circulating plasma cells' : `${plasma.toLowerCase()} circulating plasma cells`;
            return `${bloodBlastClause(blast, '')} and ${plasmaText} are identified. `;
        }
    }

    let text = '';
    if (blast || list) text += `${bloodBlastClause(blast, list)} are identified. `;
    if (plasma) text += `${plasma === 'Present' ? 'Circulating plasma cells' : `${plasma} circulating plasma cells`} are identified. `;
    return text;
}

/* The whole paragraph. A pure DOM-reader, per registerReportSection's contract
   — the severity chips are shown and hidden by their own listener below, not
   from here. */
function fillBlood() {
    const text = bloodHgbText() + bloodRbcText() + bloodNeutText() + bloodLymphText() +
                 bloodMonoText() + bloodEosBasoText() + bloodPltText() + bloodPresenceText();

    if (text === '') return '';

    // Not bold, and directly beneath its heading — the heading is rendered by
    // the registry (see registerReportSection below), not by this.
    return `
        <p style="${REPORT_PARAGRAPH}">
            ${text.trim()}
        </p>`;
}


/* ----------------------------------------------------------------------------
   Bootstrap

   ORDER IS LOAD-BEARING, and it looks reorderable — see MarrowSettings.js:90.
   applySettings() there runs at ITS OWN script scope, which is long finished by
   the time this file loads. So any .setting control rendered from here is never
   restored from localStorage unless we re-run applySettings() ourselves, and
   getSetting() reads the CONTROL, not storage (MarrowSettings.js:65), so it
   would silently hand back the markup default instead of the saved value.
   applySettings() is idempotent, so re-running it is free.

   MarrowSpec.js only gets away without this because its one setting
   (specDefaultAll) lives in the misc panel, rendered before that call.

   Hence these lines, which are one sequence and not a list of statements:
   the counter's .setting controls have to EXIST before storage can be restored
   into them, and both have to have happened before render(), which reads them
   back through counterKeymap()/counterLayout(). Render first and the pad is
   drawn with the markup defaults and never corrected.

   renderBloodPanel() joins the front of that sequence for a plainer reason: it
   is what creates #pbCounterMount, and the pad cannot mount into a hole that is
   not there yet.
-------------------------------------------------------------------------- */
const bloodCounter = createCounter(bloodCounterConfig);

renderBloodPanel();
renderBloodSettings();
bloodCounter.renderSettings();
applySettings();
bloodCounter.render();
syncBloodSeverity();

/* Registration order IS report order. The manual differential goes directly
   under the CBC's automated one — they are the same measurement counted twice,
   and the whole reason to look at either is to compare them, which you cannot do
   with a paragraph of prose sitting in between. The findings paragraph reads
   after both: the numbers, then what they mean. */
registerReportSection({ id: 'pbDiff', fill: bloodCounter.fillTable });
registerReportSection({ id: 'pb', fill: fillBlood, heading: 'Peripheral Blood Smear' });

/* Showing and hiding the severity chips is a display concern, so it is bound
   here rather than done inside fillBlood() — registerReportSection's fill()
   must stay a pure reader. Delegated from the static #inputPanel, and bound
   once: renderBloodPanel() runs a single time. */
document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    if (e.target.closest('#pbPanel')) syncBloodSeverity();
});

/* A pasted CBC answers half this form. MarrowCBC announces the parse and knows
   nothing about who listens; this is the half that cares. */
document.addEventListener('cbcParsed', bloodApplyCBC);
