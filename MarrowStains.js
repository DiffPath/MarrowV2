/* ============================================================================
   MarrowStains.js — the Stains tab (#stainPanel)

   Five growing lists: special stains on the aspirate smear, the core biopsy and
   the particle clot; immunostains on the core biopsy and the particle clot.
   Ported from ../Marrow/BoneMarrow.html:643-688 (the five selects),
   ../Marrow/MarrowData.js:109-135 + 287-322 (every result string), and
   ../Marrow/MarrowText.js:2029-2227 (the two fills and the table).

   Registers TWO report sections, `specialStains` and `immunostains`, which is
   the order and the grouping the original printed them in
   (../Marrow/MarrowText.js:1082-1097).

   ---------------------------------------------------------------------------
   DELIBERATE DEVIATIONS — everything else is the original's text verbatim.

     - CD5's labels and results were CROSS-WIRED for two of its four options
       (../Marrow/MarrowData.js:124): picking "Negative in neoplastic B cells"
       reported "Negative in B cells." and picking "Negative in B cells"
       reported "Negative in neoplastic B cells." Those are different claims —
       one says the neoplasm is CD5-negative, the other says the background B
       cells are — so this is not cosmetic. Paired correctly here.

     - The `***` percentage placeholder LEAKED into the report when no count had
       been entered: CD34 with no percentage printed "Shows no increase in blasts
       (~***% of total cellularity)." The parenthetical is no longer part of the
       stored string — it is appended by stainPercentSuffix() when there is a
       number to put in it — so an unfilled percentage prints nothing at all.
       Output with a percentage is unchanged.

     - Two missing full stops, both plainly typos against their neighbours:
       reticulin's "(MF-1)" option and CD20's diffuse-infiltrate option were the
       only values in their lists not ending in one.

     - "~" is dropped before a RANGE. The original printed "(~20-30% of total
       cellularity)" through the `***` path and "(20-30% of total cellularity)"
       through the append path — for the same stain, depending only on which
       option was picked. A tilde on a range is redundant anyway; it now never
       appears on one.

     - CD61's two on-screen labels said "destributed". Labels are free (see
       CLAUDE.md); the report strings always said "distributed" and are untouched.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Stains — data

   ONE table keyed by stain, exactly as descriptorVocabulary is keyed by
   descriptor and for the same reason: the core biopsy and the particle clot
   offer the same stains, and a second table would be free to drift into a second
   set of words. A list is a CHOICE OF KEYS (see stainGroups), not a copy.

   NOT descriptorVocabulary itself, though, and this is the line: a descriptor is
   a morphology word that prints as a fragment inside somebody's sentence via
   descriptorPhrase(). A stain is a thing you performed, its result is a whole
   sentence, and it prints as a row of a table. Different vocabulary, different
   printing, so a different table.

   `kind` says what the result control is and how it prints:
     'select' — one result from `options`, each carrying its whole sentence.
     'dual'   — Positive/Negative, printing "Positive for <of>." The four stains
                that work this way share one shape rather than four copies of it.
     'iron'   — two questions (storage iron, ring sideroblasts) whose answers
                combine into one or two sentences. See ironText().
   `percent: true` adds a "(~N% of total cellularity)" figure. */
const stainVocabulary = {

    /* --- Special stains -------------------------------------------------- */

    /* `ref` is a reference topic id (MarrowRefData.js). It is a property of the
       STAIN, not of the row or the list, for the same reason the result strings
       are: iron is offered on three specimens and reticulin on two, and a link
       declared per list would be the same link written five times. A stain with
       no `ref` simply gets no book icon. */
    iron: { label: 'Iron', kind: 'iron', ref: 'ring-sideroblasts' },

    /* `grade` is the MF band as [low, high], and it is what makes fibrosis
       usable as a CRITERION rather than only as a sentence. The MF number lived
       nowhere but inside the parentheses of the prose, so asking "is this MF-2 or
       worse" meant regexing report text.

       A RANGE, not a number, because three of these options straddle two grades.
       That is what lets "MF >= 2" come out as genuinely UNKNOWN for "MF-1 to
       MF-2" — true when low >= 2, false when high < 2, unknown in between — which
       is the honest answer and exactly what the diagnosis engine's three-valued
       criteria are for. Collapsing a straddling option to one number would be
       inventing a grade the pathologist declined to commit to.

       "No increase" is [0, 0]: the option carries no MF token at all, and 0 is
       what no increase means. */
    reticulin: { label: 'Reticulin', kind: 'select', ref: 'fibrosis', options: [
        { label: 'No increase in fibrosis',                     grade: [0, 0], text: 'Shows no increase in marrow fibrosis.' },
        { label: 'Focal, mildly increased (MF-0 to MF-1)',      grade: [0, 1], text: 'Shows focal, mildly increased marrow fibrosis (MF-0 to MF-1).' },
        // FIXED: the only value in this list with no full stop.
        { label: 'Mildly increased (MF-1)',                     grade: [1, 1], text: 'Shows mildly increased marrow fibrosis (MF-1).' },
        { label: 'Mild to moderately increased (MF-1 to MF-2)', grade: [1, 2], text: 'Shows mild to moderately increased marrow fibrosis (MF-1 to MF-2).' },
        { label: 'Moderately increased (MF-2)',                 grade: [2, 2], text: 'Shows moderately increased marrow fibrosis (MF-2).' },
        { label: 'Moderate to severely increased (MF-2 to MF-3)', grade: [2, 3], text: 'Shows moderate to severely increased marrow fibrosis (MF-2 to MF-3).' },
        { label: 'Severely increased (MF-3)',                   grade: [3, 3], text: 'Shows severely increased marrow fibrosis (MF-3).' }
    ] },

    congoRed: { label: 'Congo red', kind: 'dual', of: 'amyloid' },
    gms:      { label: 'GMS',       kind: 'dual', of: 'fungal organisms' },
    afb:      { label: 'AFB',       kind: 'dual', of: 'acid-fast bacteria' },

    /* --- Immunohistochemical stains -------------------------------------- */

    cd3: { label: 'CD3', kind: 'select', options: [
        { label: 'Interstitially scattered',                    text: 'Highlights interstitially scattered small T cells.' },
        { label: 'Interstitially scattered and focal loose aggregates', text: 'Highlights interstitially scattered and focal loose aggregates of small T cells.' },
        { label: 'Interstitially scattered and focal aggregates',       text: 'Highlights interstitially scattered and focal aggregates of small T cells.' },
        { label: 'Interstitially scattered and focal clusters',         text: 'Highlights interstitially scattered and focal clusters of small T cells.' },
        { label: 'Interstitially scattered and clusters',               text: 'Highlights interstitially scattered and clusters of small T cells.' }
    ] },

    cd20: { label: 'CD20', kind: 'select', percent: true, options: [
        { label: 'Interstitially scattered',                    text: 'Highlights interstitially scattered small B cells.' },
        { label: 'Interstitially scattered and focal loose aggregates', text: 'Highlights interstitially scattered and focal loose aggregates of small B cells.' },
        { label: 'Interstitially scattered and focal aggregates',       text: 'Highlights interstitially scattered and focal aggregates of small B cells.' },
        { label: 'Interstitially scattered and focal clusters',         text: 'Highlights interstitially scattered and focal clusters of small B cells.' },
        { label: 'Interstitially scattered and clusters',               text: 'Highlights interstitially scattered and clusters of small B cells.' },
        // FIXED: no full stop in the original, and its "(~***%)" is now the
        // shared suffix like every other percent option's.
        { label: 'Diffuse infiltrate',                          text: 'A diffuse infiltrate of small B cells.' }
    ] },

    /* FIXED: options 2 and 3 had each other's report sentence. */
    cd5: { label: 'CD5', kind: 'select', options: [
        { label: 'T cells, no B-cell coexpression',             text: 'Highlights T cells with no apparent coexpression in B cells.' },
        { label: 'Negative in neoplastic B cells',              text: 'Negative in neoplastic B cells.' },
        { label: 'Negative in B cells',                         text: 'Negative in B cells.' },
        { label: 'Positive in neoplastic B cells',              text: 'Positive in neoplastic B cells.' }
    ] },

    cd34: { label: 'CD34', kind: 'select', percent: true, options: [
        { label: 'Not increased',                               text: 'Shows no increase in blasts.' },
        { label: 'Increased',                                   text: 'Highlights increased blasts.' }
    ] },

    cd61: { label: 'CD61', kind: 'select', options: [
        { label: 'Adequate, regularly distributed',             text: 'Highlights adequate, regularly distributed megakaryocytes.' },
        { label: 'Increased, regularly distributed',            text: 'Highlights increased but regularly distributed megakaryocytes with unremarkable morphology.' }
    ] },

    cd71: { label: 'CD71', kind: 'select', options: [
        { label: 'Adequate',                                    text: 'Highlights adequate erythroid precursors.' },
        { label: 'Proliferation',                               text: 'Shows a proliferation of erythroid precursors.' }
    ] },

    /* findingPlasma() reads every option here except "Not increased" as an
       increase - a new graded option needs no second edit there. */
    cd138: { label: 'CD138', kind: 'select', percent: true, options: [
        { label: 'Not increased',                               text: 'Shows no increase in plasma cells.' },
        { label: 'Increased',                                   text: 'Highlights increased plasma cells.' },
        { label: 'Mildly increased',                            text: 'Highlights mildly increased plasma cells.' },
        { label: 'Diffusely increased',                         text: 'Highlights diffusely increased plasma cells.' }
    ] },

    /* Predominance is the reading SHORT of restriction - a skewed ratio that
       suggests without establishing clonality - and the findings layer keeps
       the distinction: restriction answers the clonality question, a
       predominance leaves it open (see findingPlasma). */
    kappaLambdaISH: { label: 'Kappa/Lambda ISH', kind: 'select', options: [
        { label: 'Polytypic',                                   text: 'Highlights polytypic plasma cells.' },
        { label: 'Kappa restriction',                           text: 'Shows kappa restriction in plasma cells.' },
        { label: 'Lambda restriction',                          text: 'Shows lambda restriction in plasma cells.' },
        { label: 'Kappa predominance',                          text: 'Shows a kappa predominance in plasma cells.' },
        { label: 'Lambda predominance',                         text: 'Shows a lambda predominance in plasma cells.' }
    ] },

    mpo: { label: 'MPO', kind: 'select', options: [
        { label: 'Adequate',                                    text: 'Highlights adequate myeloid precursors.' },
        { label: 'Proliferation',                               text: 'Shows a proliferation of myeloid precursors.' }
    ] },

    cd117: { label: 'CD117', kind: 'select', options: [
        { label: 'Scattered mast cells',                        text: 'Highlights scattered, regularly distributed mast cells.' },
        { label: 'Aggregates of spindled mast cells',           text: 'Highlights multifocal aggregates of spindled mast cells.' },
        { label: 'Increased blasts',                            text: 'Highlights increased blasts/myeloid progenitors.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    cd123: { label: 'CD123', kind: 'select', options: [
        { label: 'Positive in plasmacytoid dendritic cells',    text: 'Highlights the population of interest, supporting plasmacytoid dendritic cell differentiation.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    /* CD4 and CD8 share one option set in the original (cd48Descriptors) and are
       two entries here because they are two stains — the shared WORDS live in
       one place only in the sense that they are typed once each; keying by stain
       is what lets one of them change later without the other. */
    cd4: { label: 'CD4', kind: 'select', options: [
        { label: 'Positive in neoplastic cells',                text: 'Positive in the neoplastic cells.' },
        { label: 'Highlights T cells',                          text: 'Highlights interspersed small T cells.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },
    cd8: { label: 'CD8', kind: 'select', options: [
        { label: 'Positive in neoplastic cells',                text: 'Positive in the neoplastic cells.' },
        { label: 'Highlights T cells',                          text: 'Highlights interspersed small T cells.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    cd56: { label: 'CD56', kind: 'select', options: [
        { label: 'Positive in neoplastic cells',                text: 'Positive in the neoplastic cells.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    cd30: { label: 'CD30', kind: 'select', options: [
        { label: 'Positive in large atypical cells',            text: 'Highlights scattered large atypical cells.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    tdt: { label: 'TdT', kind: 'select', options: [
        { label: 'Positive in lymphoblasts',                    text: 'Highlights lymphoblasts, supporting a precursor (lymphoblastic) process.' },
        { label: 'Negative',                                    text: 'Negative in the cells of interest.' }
    ] },

    cyclinD1: { label: 'Cyclin D1', kind: 'select', options: [
        { label: 'Positive in neoplastic B cells',              text: 'Positive in the neoplastic B cells, supporting mantle cell lymphoma.' },
        { label: 'Negative',                                    text: 'Negative in B cells.' }
    ] },

    ki67: { label: 'Ki-67', kind: 'select', options: [
        { label: 'Low proliferation index',                     text: 'Shows a low proliferation index.' },
        { label: 'Intermediate proliferation index',            text: 'Shows an intermediate proliferation index.' },
        { label: 'High proliferation index',                    text: 'Shows a high proliferation index approaching 100%, supporting a high-grade process.' }
    ] },

    ckAE1AE3: { label: 'Cytokeratin AE1/AE3', kind: 'dual', of: 'metastatic carcinoma' }
};

/* Iron's two questions. Storage iron is what the stain is for; ring sideroblasts
   are what you look for while you are in there, and the two combine into one
   sentence when BOTH are unassessable — see ironText(). */
const stainIronStorage = [
    { label: 'Increased', value: 'increased' },
    { label: 'Adequate', value: 'adequate' },
    { label: 'Decreased', value: 'decreased' },
    { label: 'Inadequate', value: 'inadequate' }
];
const stainIronRings = [
    { label: 'Present', value: 'present' },
    { label: 'Absent', value: 'absent' },
    { label: 'Inadequate', value: 'inadequateRings' }
];

const stainDual = [
    { label: 'Positive', value: 'positive' },
    { label: 'Negative', value: 'negative' }
];

/* The five lists, in panel order. `stains` is the choice of keys — the aspirate
   is offered Iron alone, exactly as the original's aspirateSpecialStainsList was
   Iron alone (../Marrow/MarrowData.js:287). `specimen` is the report's label for
   the block; `section` is which of the two report sections it lands in.

   The core biopsy and the particle clot are given the SAME arrays rather than
   two copies, so a stain added to one is added to the other — which is what they
   have always meant. Split them only if they should genuinely differ. */
const stainSpecialKeys = ['iron', 'reticulin', 'congoRed', 'gms', 'afb'];
const stainIhcKeys = ['cd3', 'cd20', 'cd5', 'cd34', 'cd61', 'cd71', 'cd138', 'kappaLambdaISH',
                      'mpo', 'cd117', 'cd123', 'cd4', 'cd8', 'cd56', 'cd30', 'tdt',
                      'cyclinD1', 'ki67', 'ckAE1AE3'];

const stainLists = [
    { group: 'aspStain',  label: 'Aspirate',     specimen: 'Bone Marrow Aspirate',      section: 'special', stains: ['iron'] },
    { group: 'coreStain', label: 'Core biopsy',  specimen: 'Bone Marrow Core Biopsy',   section: 'special', stains: stainSpecialKeys },
    { group: 'clotStain', label: 'Particle clot', specimen: 'Bone Marrow Particle Clot', section: 'special', stains: stainSpecialKeys },
    { group: 'coreIhc',   label: 'Core biopsy',  specimen: 'Bone Marrow Core Biopsy',   section: 'immuno',  stains: stainIhcKeys },
    { group: 'clotIhc',   label: 'Particle clot', specimen: 'Bone Marrow Particle Clot', section: 'immuno',  stains: stainIhcKeys }
];

function stainListConfig(group) {
    return stainLists.filter(function (l) { return l.group === group; })[0];
}

/* Stains a WORKUP orders by itself, keyed by template type as
   templateTypeHighlights is (see MarrowReport.js). Each entry is [list, stain].

   An MPN workup means a reticulin on the core, every time: grading the fibrosis
   is most of what separates the entities, and a marrow sent to rule one in or out
   is not going to be signed out without it. So choosing that template NAMES the
   stain instead of reminding you to. It arrives with no result chosen, which is
   already this tab's way of saying "performed, nothing said yet" (see
   stainResultText) and prints a Reticulin row with an empty right-hand cell —
   the same thing you would type to list a stain that is pending.

   This is a cue, not a finding: nothing is claimed about the marrow by naming a
   stain, which is what makes it safe to place itself. Compare the diagnosis tab,
   where nothing ever does. */
const stainAutoLists = {
    ruleOutMPN: [['coreStain', 'reticulin']],
    historyMPN: [['coreStain', 'reticulin']]
};

/* The counter keys, editable in Counter Settings (see renderStainSettings).
   Defaults are the original's (../Marrow/Marrow.js:973-981).

   `stainKeys()` resolves them from the CONTROLS, the same seam counterKeymap()
   reads through: an edit is live on every tape immediately and Save only decides
   whether it outlives the session. A page with no settings block — another
   template, or before the block is rendered — falls back to the defaults, so the
   tab still works standalone.

   Both must be a single character and they must DIFFER; anything else is not a
   key pair the tape can be read with, so the last good pair stays in force and
   the offending box is marked. */
const STAIN_DEFAULT_POSITIVE = '+';
const STAIN_DEFAULT_NEGATIVE = '-';
const STAIN_POSITIVE_SETTING = 'stainPositiveKey';
const STAIN_NEGATIVE_SETTING = 'stainNegativeKey';

/* The pair the tapes on screen are currently written in. Held because a rebind
   has to TRANSLITERATE them — the same rule rekeyTape() follows in the counter
   engine, and for the same reason: a tape stores key characters verbatim, so
   changing a key without rewriting the tape silently reinterprets a count that
   is already there. Seeded with the defaults, which is what the first render
   uses. */
let stainActiveKeys = { positive: STAIN_DEFAULT_POSITIVE, negative: STAIN_DEFAULT_NEGATIVE };

function stainKeyOf(id, fallback) {
    const value = String(getSetting(id, fallback) || '').trim();
    return value ? value.charAt(0) : fallback;
}

function stainKeys() {
    const positive = stainKeyOf(STAIN_POSITIVE_SETTING, STAIN_DEFAULT_POSITIVE);
    const negative = stainKeyOf(STAIN_NEGATIVE_SETTING, STAIN_DEFAULT_NEGATIVE);
    if (positive === negative) return null;      // not a readable pair
    return { positive: positive, negative: negative };
}


/* ----------------------------------------------------------------------------
   Reading the DOM

   Ids are group + stain, never stain alone: the SAME stain is offered on the
   core biopsy and on the particle clot, and the original's bug here was one
   location's count leaking into the other's report
   (../Marrow/Marrow.js:1032-1045 documents the fix). Keying everything by group
   makes that structurally impossible rather than remembered.
-------------------------------------------------------------------------- */

function stainId(group, key, part) {
    return `${group}_${key}_${part}`;
}

/* The stains this list currently names, in naming order — which is the rows'
   order, and the only order there is. The list IS the state. */
function stainNamed(group) {
    const host = document.getElementById(group + 'List');
    if (!host) return [];
    return Array.prototype.map.call(host.querySelectorAll('.stainSelect'), function (sel) {
        return sel.value;
    }).filter(Boolean);
}

function stainValue(group, key, part) {
    const el = document.getElementById(stainId(group, key, part));
    return el ? el.value : '';
}

/* A plain checkbox part, for the chips that are not one of a toggle group —
   iron's "Limited". */
function stainChecked(group, key, part) {
    return document.getElementById(stainId(group, key, part))?.checked === true;
}

/* A percentage, as the number to print and whether it is a range. Manual entry
   wins over the tape — the original's precedence (../Marrow/MarrowText.js:
   2164-2185), and the right one: a typed number is a decision, a tape is a
   measurement you may not have finished. */
function stainPercent(group, key) {
    const low = stainValue(group, key, 'pctLow').trim();
    const high = stainValue(group, key, 'pctHigh').trim();
    if (low && high) return { value: `${low}-${high}`, range: true };
    if (low) return { value: low, range: false };
    if (high) return { value: high, range: false };

    const tally = stainTally(group, key);
    if (!tally.total || !tally.positive) return null;
    return { value: String(Math.round(100 * tally.positive / tally.total)), range: false };
}

/* The tape, rescanned whole on every read — the counter engine's rule, and it
   buys the same thing: backspace, paste and select-and-delete are all undo,
   with nothing incremented anywhere. */
function stainTallyOf(text) {
    let positive = 0, negative = 0;
    for (let i = 0; i < (text || '').length; i++) {
        if (text.charAt(i) === stainActiveKeys.positive) positive++;
        else if (text.charAt(i) === stainActiveKeys.negative) negative++;
    }
    return { positive: positive, negative: negative, total: positive + negative };
}

function stainTally(group, key) {
    const el = document.getElementById(stainId(group, key, 'tape'));
    return stainTallyOf(el ? el.value : '');
}

/* The readout, as PLAIN TEXT — no entities, so the same string can be written
   with textContent on update and dropped into innerHTML on first render without
   one of the two coming out literal. The double space is held by
   `white-space: pre` on .stainTally; it separates what you counted from what it
   works out to.

   ALWAYS "5+ 7-", never the bound keys. It used to echo stainActiveKeys, and
   with positive rebound to '4' a count of five read as the number 54. The keys
   are how you TYPE a cell; +/- are what the counts MEAN, and the readout
   speaks meaning. The tape and its placeholder keep the real keys — they are
   about typing. */
function stainTallyText(tally) {
    const pct = tally.total && tally.positive
        ? Math.round(100 * tally.positive / tally.total) + '%' : '—';
    return `${tally.positive}+ ${tally.negative}-  ${pct}`;
}


/* ----------------------------------------------------------------------------
   Report text
-------------------------------------------------------------------------- */

/* "(~25% of total cellularity)" / "(20-30% of total cellularity)". The tilde
   means approximately and a range is already approximate, so it never rides one
   — the original did both, for the same stain, depending on which option was
   picked. */
function stainPercentSuffix(pct, of) {
    if (!pct) return '';
    return ` (${pct.range ? '' : '~'}${pct.value}% of ${of})`;
}

/* Iron, the one stain whose result is two questions.

   Storage iron and ring sideroblasts each print their own sentence, EXCEPT when
   both are unassessable, where the original printed one sentence covering both
   — so the rings branch is skipped in exactly that case. Every string here is
   ../Marrow/MarrowText.js:2054-2077 verbatim; only the joining is new, which is
   the sanctioned whitespace deviation (the original left a trailing space on the
   table cell whichever parts were present). */
function ironText(group) {
    const storage = toggleGroupValue(stainId(group, 'iron', 'storage'));
    const rings = toggleGroupValue(stainId(group, 'iron', 'rings'));
    const both = storage === 'inadequate' && rings === 'inadequateRings';
    const parts = [];

    /* "Limited" says the call was made on scant material. It qualifies a real
       answer, so INADEQUATE SILENCES IT (the author's rule): "too few spicules
       for assessment" and "on the limited particles present" are two different
       claims about the same slide, and a sentence making both contradicts
       itself. Not enforced by clearing the chip — a chip you set, overrode with
       Inadequate and came back from is still the one you set, the same rule the
       severities follow. */
    const limited = stainChecked(group, 'iron', 'limited') && storage !== 'inadequate'
        ? ' on the limited particles present for evaluation'
        : '';

    if (storage === 'adequate') parts.push(`There is adequate storage iron${limited}.`);
    else if (storage === 'decreased') parts.push(`There is decreased storage iron${limited}.`);
    else if (storage === 'increased') parts.push(`There is increased storage iron${limited}.`);
    else if (storage === 'inadequate') {
        parts.push(both
            ? 'There are too few spicules for assessment of storage iron and too few erythroid precursors for assessment of ring sideroblasts.'
            : 'There are too few spicules for assessment of storage iron.');
    }

    if (rings === 'present') {
        // The percentage is offered on the aspirate only — see stainResultHTML.
        parts.push('Ring sideroblasts are identified' +
            stainPercentSuffix(stainPercent(group, 'iron'), 'erythroid precursors') + '.');
    } else if (rings === 'absent') {
        parts.push('No ring sideroblasts are identified.');
    } else if (rings === 'inadequateRings' && !both) {
        parts.push('There are too few erythroid precursors for assessment of ring sideroblasts.');
    }

    return parts.join(' ');
}

/* One stain's result sentence, or '' when nothing has been said about it yet.

   '' is a real answer and prints a row with an empty right-hand cell: it means
   the stain was PERFORMED and has nothing said about it, which is how you list a
   stain that is ordered or pending. The original pushed the row unconditionally
   too (../Marrow/MarrowText.js:2113). */
function stainResultText(group, key) {
    const stain = stainVocabulary[key];
    if (!stain) return '';

    if (stain.kind === 'iron') return ironText(group);

    if (stain.kind === 'dual') {
        const value = toggleGroupValue(stainId(group, key, 'dual'));
        if (value === 'positive') return `Positive for ${stain.of}.`;
        if (value === 'negative') return `Negative for ${stain.of}.`;
        return '';
    }

    const chosen = stainValue(group, key, 'result');
    if (!chosen) return '';
    const option = stain.options.filter(function (o) { return o.label === chosen; })[0];
    if (!option) return '';
    if (!stain.percent) return option.text;

    /* The percentage rides INSIDE the sentence's full stop, so the stored text
       keeps its own and the suffix is spliced in front of it. That is what makes
       an absent percentage print a clean sentence rather than the original's
       leftover "(~***% of total cellularity)". */
    const suffix = stainPercentSuffix(stainPercent(group, key), 'total cellularity');
    if (!suffix) return option.text;
    return option.text.replace(/\.$/, '') + suffix + '.';
}


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

/* `mark` puts an extra class on one option's input, so CSS can ask whether that
   particular answer is the one checked — see .stainIron in Template.css. */
function stainToggleRow(group, key, part, options, current, mark) {
    const toggle = stainId(group, key, part);
    const chips = options.map(function (option) {
        const id = `${toggle}_${option.value}`;
        const extra = mark && mark[option.value] ? ' ' + mark[option.value] : '';
        return `<input type="checkbox" class="chipInput form${extra}" id="${id}" value="${option.value}"` +
            ` data-toggle="${toggle}"${option.value === current ? ' checked' : ''}>` +
            `<label class="chip" for="${id}">${option.label}</label>`;
    }).join('');
    return `<span class="chipGroup">${chips}</span>`;
}

/* Percentage entry: a value, or a value and a second one making it a range.
   Two boxes rather than the core tab's three (Absolute OR Range), because a
   stain percentage is one figure that is sometimes given as a span — there is no
   second, separate statement to keep apart from it. */
function stainPercentHTML(group, key, state) {
    const low = stainId(group, key, 'pctLow'), high = stainId(group, key, 'pctHigh');
    const box = function (id, value) {
        return `<input type="text" inputmode="numeric" maxlength="3" class="cellNum form" id="${id}"` +
            ` value="${value}">`;
    };
    /* No placeholder on the second box. It is 3 characters wide, so any word for
       "optional" is a truncated word — and the "to" in front of it already says
       what it is. */
    return `<span class="stainPct">` +
        `<span class="stainPctLabel">Percent</span>${box(low, state.pctLow || '')}` +
        `<span class="stainPctTo">to</span>${box(high, state.pctHigh || '')}` +
        `<span class="stainPctLabel">%</span></span>`;
}

/* The tape. One character per cell, exactly as the differential's is, and
   rescanned rather than incremented for the same reason. `form` because the
   percentage it produces is report text.

   A real textarea, wrapping, two lines at rest: the point of a tape is that you
   can see what you already counted, and a one-line box that scrolls its history
   off the left is a tally with extra steps. It gets the ROW'S FULL WIDTH — the
   readout rides on the percent line above it (see stainCountHTML), which is
   short and had the room going spare. */
function stainTapeHTML(group, key, state) {
    return `<textarea class="textBox stainTape form" id="${stainId(group, key, 'tape')}" rows="2"` +
        ` spellcheck="false" placeholder="Count here: ${stainActiveKeys.positive} positive,` +
        ` ${stainActiveKeys.negative} negative">${state.tape || ''}</textarea>`;
}

/* Everything that belongs to one named stain, right of its name. */
function stainResultHTML(group, key, state) {
    const stain = stainVocabulary[key];
    if (!stain) return '';

    if (stain.kind === 'dual') {
        return stainToggleRow(group, key, 'dual', stainDual, state.dual);
    }

    if (stain.kind === 'iron') {
        /* The ring-sideroblast count is offered on the ASPIRATE only, which is the
           original's restriction and a real one: ring sideroblasts are counted on
           the smear. Storage iron on a section is still worth saying, so the rest
           of the control is offered everywhere.

           It is RENDERED whenever the aspirate offers it and REVEALED by CSS when
           "Present" is the answer — not rendered conditionally. Two reasons, and
           the second is the one that bit: a count you typed survives a detour
           through another answer, and nothing here has to replace the DOM in
           response to a chip, which is what put this file at war with
           MarrowForm's toggle handler (see the listener at the bottom). */
        return `<div class="stainIron">` +
            `<div class="stainSub"><span class="stainSubLabel">Storage iron</span>` +
            stainToggleRow(group, key, 'storage', stainIronStorage, state.storage) +
            /* "Limited" qualifies the answer beside it rather than being one —
               a small chip, like every other qualifier, and a plain checkbox
               rather than a member of the storage group: it says HOW MUCH
               material the call was made on, which is a second fact about the
               same answer. .chipQualInput keeps the highlight cue from
               counting it as having answered the row. */
            `<span class="chipSub"><input type="checkbox" class="chipInput chipQualInput form" id="${stainId(group, key, 'limited')}"${state.limited ? ' checked' : ''}>` +
            `<label class="chip" for="${stainId(group, key, 'limited')}">Limited</label></span></div>` +
            `<div class="stainSub"><span class="stainSubLabel">Ring sideroblasts</span>` +
            stainToggleRow(group, key, 'rings', stainIronRings, state.rings,
                { present: 'stainRingsPresent' }) + `</div>` +
            (group === 'aspStain' ? stainCountHTML(group, key, state) : '') +
            `</div>`;
    }

    const optionHTML = '<option value="">—</option>' + stain.options.map(function (o) {
        return `<option value="${o.label}"${o.label === state.result ? ' selected' : ''}>${o.label}</option>`;
    }).join('');
    let html = `<select class="stainResult form" id="${stainId(group, key, 'result')}">${optionHTML}</select>`;
    if (stain.percent) html += stainCountHTML(group, key, state);
    return html;
}

/* The percentage and the tape that can feed it, as one block — so the CSS that
   reveals it for iron has a single thing to reveal.

   The readout sits on the PERCENT line rather than beside the tape. Two reasons:
   the tape then runs the full width of the row, which is what makes a wrapped
   count readable; and the tally's percentage and the typed percentage are two
   answers to one question, so showing them on one line is where the relationship
   is legible — including that typing in the boxes overrides the count. */
function stainCountHTML(group, key, state) {
    return `<div class="stainCountBlock">` +
        `<div class="stainPctRow">${stainPercentHTML(group, key, state)}` +
        `<span class="stainTally" id="${stainId(group, key, 'tally')}">` +
        `${stainTallyText(stainTallyOf(state.tape))}</span></div>` +
        `${stainTapeHTML(group, key, state)}</div>`;
}

/* One row: the stain, and whatever that stain has to be asked.

   The reference link sits OUTSIDE .stainFields, at the row's end. Inside it, it
   would be a flex item competing with the result control for the row's width —
   and on iron, which renders a two-question block, it would land under one of
   the sub-rows rather than beside the stain it belongs to. Only a NAMED stain
   with a `ref` gets one: the empty "add a stain" row has nothing to look up. */
function stainRowHTML(group, index, key, options, state) {
    const optionHTML = '<option value="">—</option>' + options.map(function (k) {
        return `<option value="${k}"${k === key ? ' selected' : ''}>${stainVocabulary[k].label}</option>`;
    }).join('');

    const ref = key && stainVocabulary[key].ref ? refLinkHTML(stainVocabulary[key].ref) : '';

    return `<div class="stainRow">` +
        `<select class="stainSelect form" id="${group}Sel${index}" data-group="${group}">${optionHTML}</select>` +
        `<div class="stainFields">${key ? stainResultHTML(group, key, state) : ''}</div>` +
        ref +
        `</div>`;
}

/* Read a named stain's answers off the CURRENT DOM, so a rebuild can put them
   back. Keyed by stain, never by row — a result follows its stain rather than
   staying in the slot it happened to sit in, exactly as a descriptor's qualifier
   does (see renderDescriptorList). */
function stainStateOf(group, key) {
    return {
        result: stainValue(group, key, 'result'),
        dual: toggleGroupValue(stainId(group, key, 'dual')),
        storage: toggleGroupValue(stainId(group, key, 'storage')),
        limited: stainChecked(group, key, 'limited'),
        rings: toggleGroupValue(stainId(group, key, 'rings')),
        pctLow: stainValue(group, key, 'pctLow'),
        pctHigh: stainValue(group, key, 'pctHigh'),
        tape: stainValue(group, key, 'tape')
    };
}

/* Rebuild a list from what it currently names. Whole, every time — which is what
   keeps the option lists free of duplicates with no bookkeeping, the same
   bargain renderDescriptorList() makes. A stain already named is offered by no
   other select, so it cannot be listed twice on one specimen. */
function renderStainList(group) {
    const host = document.getElementById(group + 'List');
    if (!host) return;

    const all = stainListConfig(group).stains;
    const named = stainNamed(group);

    const state = {};
    named.forEach(function (key) { state[key] = stainStateOf(group, key); });

    let html = '';
    named.forEach(function (key, i) {
        const options = all.filter(function (k) { return k === key || named.indexOf(k) === -1; });
        html += stainRowHTML(group, i, key, options, state[key]);
    });

    const remaining = all.filter(function (k) { return named.indexOf(k) === -1; });
    if (remaining.length) html += stainRowHTML(group, named.length, '', remaining, {});

    host.innerHTML = html;
}

function renderStainPanel() {
    const panel = document.getElementById('stainPanel');
    if (!panel) return;

    const block = function (title, section) {
        const rows = stainLists.filter(function (l) { return l.section === section; })
            .map(function (l) {
                return `<div class="findingLabel">${l.label}</div>` +
                    `<div class="findingChips" data-key="${l.group}">` +
                    `<div class="stainList" id="${l.group}List"></div></div>`;
            }).join('');
        /* .fieldLabel for the two STAIN CLASSES and .findingGrid rows for the
           specimens inside them. The class titles have to be said — a hairline
           cannot tell you that the block below it is immunostains — but the
           specimen is a row label like any other, which is what the label column
           is already there for. */
        return `<div class="fieldBlock"><div class="fieldLabel">${title}</div>` +
            `<div class="findingGrid">${rows}</div></div>`;
    };

    /* The digital-imaging attestation, last: a statement about the whole
       case's assessment, and its sentence is the report's closing line - the
       input sits where the output lands. A switch, not a chip: it is a claim
       that stands by itself, the same reasoning as the aspirate's preamble
       toggles.

       It borrows that tab's ROW, not its placement. .toggleFieldRow is left
       aligned like every other line in a panel; the aspirate centres its own
       copy over the pad from .counterZone (Template.css), which is where a fact
       about the aspirate belongs. */
    panel.innerHTML = block('Special Stains', 'special') + block('Immunohistochemical Stains', 'immuno') +
        `<div class="fieldBlock"><div class="toggleFieldRow">` +
        `${toggleFieldHTML('stainDigitalImaging', 'Digital imaging used in diagnostic assessment')}` +
        `</div></div>`;
    stainLists.forEach(function (l) { renderStainList(l.group); });
}


/* ----------------------------------------------------------------------------
   The workup's own stains (see stainAutoLists)

   Switching AWAY from a template takes its stains back, because a stain nobody
   ordered should not outlive the workup that ordered it — a reticulin left on
   the core of a lymphoma case is a stain the report says was performed and
   nobody performed.

   But only while it is still EMPTY. Once a result has been chosen the row is a
   finding, and no finding is removed by a click on another tab; that is the same
   line the rest of the app draws, and here it is the difference between clearing
   a suggestion and deleting an observation. stainResultText() is the test rather
   than the select's value, so the rule reads identically for a stain of any kind
   — an iron answered only in its Storage chips is just as answered as a
   reticulin answered in its dropdown.
-------------------------------------------------------------------------- */

/* Every [list, stain] any template auto-names: the set this sync may touch, and
   nothing else on the tab. Derived from the table so adding an entry there needs
   no second edit here. */
function stainAutoAll() {
    const seen = {}, all = [];
    Object.keys(stainAutoLists).forEach(function (type) {
        stainAutoLists[type].forEach(function (pair) {
            const id = pair.join('_');
            if (seen[id]) return;
            seen[id] = true;
            all.push(pair);
        });
    });
    return all;
}

/* Name a stain in a list, or take it back out. The list IS its selects, so both
   directions are a select's value plus a rebuild — and the rebuild is what
   carries every OTHER stain's answers across, since stainStateOf() reads them by
   key rather than by row. Returns whether anything actually changed. */
function stainSetNamed(group, key, named) {
    const host = document.getElementById(group + 'List');
    if (!host) return false;

    const selects = Array.prototype.slice.call(host.querySelectorAll('.stainSelect'));
    const current = selects.filter(function (s) { return s.value === key; })[0];
    if (named === !!current) return false;

    if (named) {
        // The trailing empty select is the one waiting to be given a stain. There
        // is none only when every stain in the list is already named, in which
        // case this one is too and we never got here.
        const empty = selects.filter(function (s) { return !s.value; })[0];
        if (!empty) return false;
        empty.value = key;
    } else {
        current.value = '';        // stainNamed() drops the blank on the rebuild
    }

    renderStainList(group);
    return true;
}

function syncTemplateStains() {
    const type = typeof currentTemplateType === 'function' ? currentTemplateType() : null;
    const wanted = (stainAutoLists[type] || []).map(function (pair) { return pair.join('_'); });

    stainAutoAll().forEach(function (pair) {
        const want = wanted.indexOf(pair.join('_')) !== -1;
        if (!want && stainResultText(pair[0], pair[1])) return;   // answered: it stays
        stainSetNamed(pair[0], pair[1], want);
    });
}


/* ----------------------------------------------------------------------------
   Report

   Two sections, in the original's order and grouping. Each covers several
   specimens, so each specimen gets a sub-label and its own table — the shape of
   ../Marrow/MarrowText.js:2220-2227, rebuilt against the report style constants
   so the bytes live in one place.
-------------------------------------------------------------------------- */

function stainTableHTML(rows, specimen, first) {
    const body = rows.map(function (row) {
        return `<tr><td style="${REPORT_TABLE_NAME}">${row[0]}</td>` +
            `<td style="${REPORT_TABLE_VALUE}">${row[1]}</td></tr>`;
    }).join('');
    // The first block sits tight under the section heading; every later one takes
    // the 8pt that separates it from the table above — REPORT_HEADING's spacing,
    // reused rather than restated.
    const label = first ? REPORT_SUBLABEL : REPORT_HEADING;
    return `<p style="${label}">${specimen}</p><table style="${REPORT_TABLE}">${body}</table>`;
}

function fillStainSection(section) {
    let html = '';
    stainLists.filter(function (l) { return l.section === section; }).forEach(function (l) {
        const rows = stainNamed(l.group).map(function (key) {
            return [stainVocabulary[key].label, stainResultText(l.group, key)];
        });
        if (!rows.length) return;
        html += stainTableHTML(rows, l.specimen, html === '');
    });
    return html;
}

function fillSpecialStains() { return fillStainSection('special'); }
function fillImmunostains() { return fillStainSection('immuno'); }


/* ----------------------------------------------------------------------------
   Settings — which keys the stain tapes count

   Lands in the COUNTER SETTINGS panel, beside the two differential pads, rather
   than in a tab of its own: the tab is called Counter Settings and this is a
   counter, and one pair of boxes does not earn a tab. It appends, so it sits
   after whichever counters registered first — the same arrangement
   `settingsPanelId` exists for, and settingsPanelSave() keeps exactly one Save
   button for the panel however many blocks land in it.
-------------------------------------------------------------------------- */

function renderStainSettings() {
    const panel = document.getElementById('differentialSettingsPanel');
    if (!panel) return;

    const row = function (id, label, value) {
        return `<div class="findingLabel">${label}</div>
            <div class="thresholdRow">
                <input type="text" class="stainKeyInput setting" id="${id}" maxlength="1"
                       spellcheck="false" value="${value}">
            </div>`;
    };

    panel.insertAdjacentHTML('beforeend', `
        <div class="counterSettings" id="stainKeySettings">
            <div class="counterSettingsTitle">Stain counters</div>
            <div class="findingGroup"><div class="findingGrid">
                ${row(STAIN_POSITIVE_SETTING, 'Positive key', STAIN_DEFAULT_POSITIVE)}
                ${row(STAIN_NEGATIVE_SETTING, 'Negative key', STAIN_DEFAULT_NEGATIVE)}
            </div></div>
        </div>`);

    settingsPanelSave(panel);
}

/* Rewrite every tape from the old pair to the new one, character by character.

   Character by character rather than two string replaces, because SWAPPING the
   two keys is a thing someone will do: replacing all "+" with "-" and then all
   "-" with "+" turns the whole tape into "+". Everything that is neither key is
   left exactly as typed — a tape may hold spaces or line breaks used as grouping
   and they are not ours to touch. */
function stainRekeyTapes(from, to) {
    document.querySelectorAll('#stainPanel .stainTape').forEach(function (tape) {
        let out = '';
        for (let i = 0; i < tape.value.length; i++) {
            const ch = tape.value.charAt(i);
            out += ch === from.positive ? to.positive
                : ch === from.negative ? to.negative
                : ch;
        }
        tape.value = out;
    });
}

/* A rebind is one operation: transliterate what is on screen, adopt the pair,
   then re-render so the placeholders and the readouts speak the new keys. The
   re-render carries the tapes across (stainStateOf reads them), so it has to
   happen after the transliteration, not before. */
function applyStainKeys() {
    const next = stainKeys();
    const bad = next === null;

    [STAIN_POSITIVE_SETTING, STAIN_NEGATIVE_SETTING].forEach(function (id) {
        document.getElementById(id)?.classList.toggle('stainKeyBad', bad);
    });
    // Two keys that are the same character cannot be told apart on a tape, so the
    // last good pair stays in force and the boxes go red until it is fixed.
    if (bad) return;
    if (next.positive === stainActiveKeys.positive && next.negative === stainActiveKeys.negative) return;

    stainRekeyTapes(stainActiveKeys, next);
    stainActiveKeys = next;
    stainLists.forEach(function (l) { renderStainList(l.group); });
    fillReport();
}


/* ----------------------------------------------------------------------------
   Bootstrap

   ORDER IS LOAD-BEARING, exactly as on the counter tabs (see the applySettings
   trap in CLAUDE.md): renderStainSettings() must create the .setting controls,
   applySettings() restores saved values into them, and only then can
   applyStainKeys() read them back through getSetting() and renderStainPanel()
   draw tapes that speak the right keys.
-------------------------------------------------------------------------- */

renderStainSettings();
applySettings();
/* Adopt saved keys BEFORE the first render — there are no tapes to transliterate
   yet, so this only sets the pair the panel is about to be drawn in. */
const stainSaved = stainKeys();
if (stainSaved) stainActiveKeys = stainSaved;

renderStainPanel();

registerReportSection({ id: 'specialStains', fill: fillSpecialStains, heading: 'Special Stains' });
registerReportSection({ id: 'immunostains', fill: fillImmunostains, heading: 'Immunohistochemical Stains' });

/* The digital-imaging attestation - the microscopic description's closing
   line, italic, exactly as the author specified it. Registered after the two
   stain sections, so it is the last section in the report (everything
   registered later uses `after` to land higher up); Copy Microscopic includes
   it, being unclaimed by any other copy button. */
registerReportSection({
    id: 'digitalImaging',
    /* The leading <br> is the blank line above the attestation, and it lives
       INSIDE the section on purpose: a break the copy path adds sits between
       two container divs, where Epic can drop it; one inside the block always
       survives. copyPayload() skips its own separator when a part already
       starts with a break, so this is one blank line, not two. */
    fill: function () {
        return document.getElementById('stainDigitalImaging')?.checked
            ? `<br><p style="${REPORT_PARAGRAPH}"><i>Digital imaging was used in the diagnostic assessment of this case.</i></p>`
            : '';
    }
});

/* Case state — the same story as the descriptor lists, for the same reason.
   Every answer is an ordinary control with an id (`<group>_<stain>_<part>`), so
   MarrowSave's by-id capture and restore already carry them; what a restore
   needs from this file is the ROWS, which only exist once the stain above them
   has been named. renderStainList() is whole-list and idempotent, so it is safe
   to call once per restore pass.

   THE TAPES RIDE ALONG AS TEXT, in whatever key pair they were typed in. That is
   the same bargain the counter's tape makes: the tape IS the tally, and storing
   the derived counts instead would throw away the undo history it exists for.
   The keys are a SETTING and are not part of a case, so a saved tape read back
   under rebound keys reads as the new keys say — which is exactly what happens
   to a tape already on screen when the keys are rebound, minus the
   transliteration that would have kept it honest. */
registerCaseState({
    id: 'stains',
    rebuild: function () {
        stainLists.forEach(function (l) { renderStainList(l.group); });
    }
});

/* Bound on #stainPanel, NOT on #inputPanel, and that is the whole point: a change
   event bubbles from the target outward, so a listener on the inner element runs
   before MarrowReport's on the outer one. The list must be rebuilt BEFORE
   fillReport() reads it. MarrowDescriptors gets the same guarantee by loading
   ahead of MarrowReport, which this file cannot do — it calls
   registerReportSection at script scope.

   ONLY a .stainSelect rebuilds, and A CHIP MUST NEVER. Rebuilding replaces the
   DOM, which detaches the very element the event is still travelling from — and
   MarrowForm's toggle handler, running later on #inputPanel, clears every chip in
   the group that is not `e.target`. The freshly rendered checked chip is not that
   detached node, so it was silently unchecked the instant it was drawn: every
   iron and Positive/Negative answer read back empty. A select is safe because no
   later listener acts on selects. The iron count block is revealed by CSS
   instead, which is why nothing here listens for a chip at all. */
document.getElementById('stainPanel')?.addEventListener('change', function (e) {
    const select = e.target.closest('.stainSelect');
    if (select) renderStainList(select.getAttribute('data-group'));
});

/* The template chips live on the SPECIMEN panel, so this binds there — and for
   the same reason as the listener above, on the inner element rather than on
   #inputPanel: an event bubbles outward, so this rewrites the stain list before
   MarrowReport's delegated handler reads it. Getting that backwards costs one
   render, which is invisible until the very click that adds the stain is also the
   one that should have printed it. */
document.getElementById('specPanel')?.addEventListener('change', function (e) {
    if (e.target.classList.contains('templateType')) syncTemplateStains();
});

/* The key boxes live in the SETTINGS panel, not #stainPanel, so they need their
   own listener. `input`, so a rebind lands as it is typed like everything else
   here; the counter engine's seam works the same way — the edit is live and Save
   only decides whether it outlives the session. */
document.getElementById('settingPanel')?.addEventListener('input', function (e) {
    if (e.target.closest('.stainKeyInput')) applyStainKeys();
});

/* Typed input — the tape and the two percentage boxes — is followed on every
   keystroke rather than on blur.

   `class="form"` alone would NOT do it here: MarrowReport listens for `change`,
   and a text field fires that when it loses focus. A chip or a select is done
   the instant you click it, so `change` is the right event for those; a number
   you are typing is not, and a report that only catches up when you click away
   reads as a report that missed what you typed. */
document.getElementById('stainPanel')?.addEventListener('input', function (e) {
    const tape = e.target.closest('.stainTape');
    if (tape) {
        // "<group>_<key>_tape" — the readout is the same pair with a different tail.
        const parts = tape.id.split('_');
        const readout = document.getElementById(`${parts[0]}_${parts[1]}_tally`);
        // textContent, and stainTallyText() returns plain text, so this and the
        // first render put the same characters on screen.
        if (readout) readout.textContent = stainTallyText(stainTallyOf(tape.value));
    }
    if (tape || e.target.closest('.cellNum')) fillReport();
});
