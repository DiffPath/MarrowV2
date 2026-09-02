/* ============================================================================
   PBComment.js — the Comment page (#commentPanel) and the report's comment.

   All thirty-six of the original's standing comments (pbnorthwest.html:719-909),
   verbatim, in its four groups and its order. Ticking them concatenates them into
   one paragraph, which is what its `commentText` did.

   ---------------------------------------------------------------------------
   THE HIDING IS THE POINT, and it is the original's behaviour kept exactly: a
   comment is only offered once the findings make it relevant. RBCC8 — "The
   presence of schistocytes raises the possibility of a microangiopathic
   hemolysis" — appears when a schistocyte is named and not before. Each group
   also has the original's SHOW ALL switch, which reveals its whole list
   regardless.

   DECLARED, NOT SEQUENCED. The original expressed this as ~130 show()/hide()
   calls threaded through fillFinal's branches, which made the answer depend on
   the order the branches happened to run in — and in one place they genuinely
   disagree: naming bite cells shows RBCC10, and then the normocytic branch hides
   it again, so bite cells plus a normocytic anemia offered no Heinz body comment
   at all. Here each comment carries ONE `when()` predicate, so the question is
   asked once and cannot be answered twice. The bite-cell case is the deviation
   that produces: it now shows on any anemia.

   A COMMENT ALREADY TICKED STAYS VISIBLE even if the finding that revealed it is
   taken back. Hiding it would silently drop a chosen sentence out of the report;
   the same rule keeps an answered stain on the marrow's Stains tab when the
   workup that ordered it changes.

   The rows are rendered ONCE and shown or hidden in place — never rebuilt — so a
   tick survives every re-render for free.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   The four groups, and their Show all switches
-------------------------------------------------------------------------- */

const pbCommentGroups = [
    { id: 'rbc',   label: 'Anemia and Hemolysis Comments' },
    { id: 'neut',  label: 'Neutrophil/blast Comments' },
    { id: 'lymph', label: 'Lymphocyte Comments' },
    { id: 'plt',   label: 'Platelet Comments' },
    /* HEMC1 sits in a group of its own with no Show all, because the original
       gave it neither a gate nor a switch — it is always on screen. */
    { id: 'hem',   label: 'Other', noShowAll: true }
];


/* ----------------------------------------------------------------------------
   The comments

   `when` is the gate. Omit it for a comment the original only ever revealed
   through Show all — WBCC7 is the one, and that is not an oversight in the
   source: it appears in showComments() and nowhere else.
-------------------------------------------------------------------------- */

const pbComments = [
    { id: 'RBCC1', group: 'rbc', when: pbIsAnemia,
      text: "The etiology of the patient's anemia is not clear on review of the peripheral blood smear." },
    { id: 'RBCC2', group: 'rbc', when: pbIsAnemia,
      text: 'There is no morphologic evidence of hemolysis. Clinical correlation is suggested.' },
    { id: 'RBCC3', group: 'rbc', when: function () { return pbAnemiaType() === 'microcytic' || pbAnemiaType() === 'normocytic'; },
      text: 'The red cell indices, morphology, and iron studies are consistent with iron deficiency anemia.' },
    { id: 'RBCC4', group: 'rbc', when: function () { return pbAnemiaType() === 'microcytic'; },
      text: 'The red cell indices and morphology are suggestive of iron deficiency anemia.' },
    { id: 'RBCC5', group: 'rbc', when: pbIsAnemia,
      text: 'The red cell indices, morphology, and iron studies are consistent with anemia of chronic disease.' },
    { id: 'RBCC6', group: 'rbc', when: function () { return pbAnemiaType() === 'microcytic' || pbAnemiaType() === 'normocytic'; },
      text: 'The red cell indices, morphology, and iron studies are suggestive of iron deficiency anemia and/or anemia of chronic disease. Clinical correlation is recommended.' },
    /* RBCC7 wants RARE schistocytes specifically, RBCC8 any at all. The original
       asked both questions of the printed prose (indexOf('rare schistocytes'));
       here the qualifier is a value, so they are asked of the data. */
    { id: 'RBCC7', group: 'rbc', when: function () { return pbAnisoQualifier('schistocytes') === 'rare'; },
      text: 'Although rare schistocytes are seen, the findings are not definite for acute microangiopathic hemolysis. Clinical correlation is suggested.' },
    { id: 'RBCC8', group: 'rbc', when: function () { return pbAnisoNamed('schistocytes'); },
      text: 'The presence of schistocytes raises the possibility of a microangiopathic hemolysis. Clinical correlation suggested.' },
    { id: 'RBCC9', group: 'rbc', when: function () { return pbAnisoNamed('spherocytes'); },
      text: 'The presence of spherocytes raises the possibility of immune hemolysis. Clinical correlation suggested.' },
    { id: 'RBCC10', group: 'rbc', when: function () { return pbAnisoNamed('biteCells') || pbAnisoNamed('blisterCells'); },
      text: 'The presence of bite/blister cells raises the possibility of a Heinz body hemolytic anemia. If clinically indicated, submitting a fresh blood sample for Heinz body test is suggested.' },
    { id: 'RBCC11', group: 'rbc', when: function () { return pbAnemiaType() === 'macrocytic'; },
      text: 'Correlation with vitamin B12 and folate levels recommended to evaluate the macrocytic anemia.' },
    { id: 'RBCC12', group: 'rbc', when: function () { return pbAnemiaType() === 'microcytic'; },
      text: 'The red cell indices and morphology are suggestive of a thalassemia. If clinically indicated, hemoglobin electrophoresis is recommended for further evaluation.' },
    { id: 'RBCC13', group: 'rbc', when: function () { return pbAnemiaType() === 'microcytic'; },
      text: "The red cell indices and morphology are consistent with the patient's history of thalassemia." },
    { id: 'RBCC14', group: 'rbc', when: pbAgglutination,
      text: 'Red blood cell agglutination resolves by preheating, consistent with a cold agglutinin.' },

    { id: 'WBCC1', group: 'neut', when: function () { return pbNeutType() === 'neutrophilia'; },
      text: 'The etiology of the neutrophilia is unclear. Suggest follow up to rule out persistence.' },
    { id: 'WBCC2', group: 'neut', when: function () { return pbNeutType() === 'neutrophilia'; },
      text: 'The etiology of the neutrophilia is unclear but is favored to be reactive in nature.' },
    { id: 'WBCC3', group: 'neut', when: function () { return pbNeutType() === 'neutropenia' || pbBlastsPresent(); },
      text: 'The etiology of the neutropenia is unclear.' },
    { id: 'WBCC4', group: 'neut', when: function () {
        return pbBlastsPresent() || pbNeutType() === 'neutrophilia' || pbNeutMorphOn('pbNeutShift'); },
      text: 'The findings are consistent with recent history of colony stimulating factor therapy.' },
    { id: 'WBCC5', group: 'neut', when: function () {
        return pbBlastsPresent() || pbNeutType() === 'neutrophilia' || pbNeutMorphOn('pbNeutShift')
            || pbNeutMorphOn('pbNeutHypolobated') || pbNeutMorphOn('pbNeutHypogranular'); },
      text: 'The findings are worrisome for a myeloid neoplasm.' },
    { id: 'WBCC6', group: 'neut', when: function () {
        return pbBlastsPresent() || pbNeutType() === 'neutrophilia' || pbNeutMorphOn('pbNeutShift'); },
      text: 'If clinically indicated, molecular analysis suggested, including evaluation for BCR-ABL1, JAK-2, CALR, and MPL.' },
    // No gate in the source either — Show all is the only way to it.
    { id: 'WBCC7', group: 'neut',
      text: 'The findings are consistent with acute leukemia. Correlation with flow cytometry is suggested.' },

    /* The lymphocyte six are gated on there being a lymphocytosis of some kind.
       The original also revealed them on a raw ALC above the lab's range with no
       chip picked; that path is kept through the CBC's own High flag, which is
       the same judgement by the same lab. */
    { id: 'WBCC8', group: 'lymph', when: pbLymphocytosis,
      text: 'The etiology of the lymphocytosis is unclear but is favored to be reactive in nature.' },
    { id: 'WBCC9', group: 'lymph', when: pbLymphocytosis,
      text: 'The etiology of the lymphocytosis is unclear. Suggest repeat CBC and differential to rule out persistence.' },
    { id: 'WBCC10', group: 'lymph', when: pbLymphocytosis,
      text: 'The findings raise the possibility of a lymphoproliferative disorder. If clinically indicated, flow cytometric analysis may be considered for further evaluation.' },
    /* WBCC11 and WBCC12 are the viral pair, and the original HID them for the
       small-mature/LGL population specifically — that picture is not an acute
       viral one. Kept. */
    { id: 'WBCC11', group: 'lymph', when: function () { return pbLymphocytosis() && pbLymphType() !== 'smallLarge'; },
      text: 'The findings raise the possibility of an acute viral infection. Correlation with clinical and serologic findings is recommended.' },
    { id: 'WBCC12', group: 'lymph', when: function () { return pbLymphocytosis() && pbLymphType() !== 'smallLarge'; },
      text: 'The morphologic findings, together with the positive heterophile antibody test, are consistent with infectious mononucleosis. Clinical correlation is suggested.' },
    { id: 'WBCC13', group: 'lymph', when: pbLymphocytosis,
      text: "The findings are consistent with the patient's history of chronic lymphocytic leukemia." },

    { id: 'PLTC1', group: 'plt', when: function () { return pbPltType() === 'thrombocytopenia'; },
      text: "The etiology of the patient's thrombocytopenia is not clear on review of the peripheral blood smear. There is no morphologic evidence of acute microangiopathic hemolysis. Clinical correlation is suggested." },
    { id: 'PLTC2', group: 'plt', when: function () { return pbPltType() === 'thrombocytopenia'; },
      text: "The etiology of the patient's anemia and thrombocytopenia is not clear on review of the peripheral blood smear. There is no morphologic evidence of acute microangiopathic hemolysis. Clinical correlation is suggested." },
    { id: 'PLTC3', group: 'plt', when: function () { return pbPltType() === 'thrombocytopenia'; },
      text: "The etiology of the patient's pancytopenia is not clear on review of the peripheral blood smear. There is no morphologic evidence of acute microangiopathic hemolysis. Clinical correlation is suggested." },
    { id: 'PLTC4', group: 'plt', when: function () { return pbPltType() === 'thrombocytosis'; },
      text: 'The etiology of the thrombocytosis is not clear. Suggest follow up with CBC to rule out persistence.' },
    { id: 'PLTC5', group: 'plt', when: function () { return pbPltType() === 'thrombocytosis'; },
      text: 'The etiology of the thrombocytosis is not clear.' },
    { id: 'PLTC6', group: 'plt', when: pbPltClumping,
      text: 'Platelet clumping is present; therefore, the automated platelet count may be an underestimate. If clinically indicated, redraw in a citrated (blue top) tube is suggested.' },
    { id: 'PLTC7', group: 'plt', when: pbPltClumping,
      text: 'Platelet clumping is present, preventing an accurate reporting of platelet count by automated instrument. If clinically indicated, redraw in a citrated (blue top) tube is suggested.' },
    { id: 'PLTC8', group: 'plt', when: function () { return pbPltType() === 'thrombocytosis'; },
      text: 'If clinically indicated, molecular analysis suggested, including evaluation for BCR-ABL1, JAK-2, CALR, and MPL.' },

    /* The one fill-in-the-blank, and the one that is ALWAYS on screen: the
       original gave it neither a gate nor a Show all switch, because a phone call
       about a case is not something the smear can predict. `when` says so
       explicitly rather than leaving it to fall out of having no gate — a comment
       with no gate at all is WBCC7, which is Show-all-only, and the two must not
       look alike here. */
    { id: 'HEMC1', group: 'hem', when: function () { return true; }, fields: [
        { id: 'pbHemDr1', width: 12, placeholder: 'Dr.' },
        { id: 'pbHemDr2', width: 12, placeholder: 'with' },
        { id: 'pbHemTime', width: 6, placeholder: 'time' },
        { id: 'pbHemDate', width: 6, placeholder: 'date' }
      ],
      text: function () {
        const v = function (id) { return document.getElementById(id)?.value.trim() || ''; };
        return `Dr. ${v('pbHemDr1')} discussed the case with ${v('pbHemDr2')} at ${v('pbHemTime')} on ${v('pbHemDate')}.`;
      } }
];

/* Is there a lymphocytosis to comment on? Either a chip that says so, or — the
   original's other route — a lymphocyte count the lab flagged high. */
function pbLymphocytosis() {
    const type = pbLymphType();
    if (type && type !== 'lymphopenia') return true;
    return typeof cbcFlagged === 'function' && cbcFlagged('Absolute Lymphocytes', 'high');
}


/* ----------------------------------------------------------------------------
   Render — once. Visibility is toggled in place afterwards.
-------------------------------------------------------------------------- */

function pbCommentRowHTML(comment) {
    /* HEMC1's sentence is built from boxes, so its label is the sentence with
       the boxes IN it rather than a static string. */
    if (comment.fields) {
        const box = function (field) {
            return `<input type="text" class="cellNum form pbHemField" id="${field.id}"` +
                ` size="${field.width}" placeholder="${field.placeholder}" spellcheck="false">`;
        };
        return `<div class="pbCommentRow" id="${comment.id}Row">
            <input type="checkbox" class="chipInput pbCommentInput form" id="${comment.id}">
            <label class="chip pbCommentTick" for="${comment.id}">${comment.id}</label>
            <span class="pbCommentText">Dr. ${box(comment.fields[0])} discussed the case with
                ${box(comment.fields[1])} at ${box(comment.fields[2])} on ${box(comment.fields[3])}.</span>
        </div>`;
    }

    return `<div class="pbCommentRow" id="${comment.id}Row">
        <input type="checkbox" class="chipInput pbCommentInput form" id="${comment.id}">
        <label class="chip pbCommentTick" for="${comment.id}">${comment.id}</label>
        <label class="pbCommentText" for="${comment.id}">${comment.text}</label>
    </div>`;
}

function renderPBCommentPanel() {
    const panel = document.getElementById('commentPanel');
    if (!panel) return;

    panel.innerHTML = pbCommentGroups.map(function (group) {
        const rows = pbComments
            .filter(function (c) { return c.group === group.id; })
            .map(pbCommentRowHTML).join('');

        /* The original's "Show all" — a switch per group that reveals its whole
           list whatever the findings say. `form`, not `setting`: it is a view of
           this case, and a template that remembered it would open every case
           with every comment on screen. */
        const showAll = group.noShowAll ? '' :
            `<div class="toggleFieldRow">${toggleFieldHTML('pbShowAll_' + group.id, 'Show all')}</div>`;

        return `<div class="fieldBlock">
            <div class="fieldLabel">${group.label}</div>
            ${showAll}
            ${rows}
        </div>`;
    }).join('');
}


/* ----------------------------------------------------------------------------
   Visibility
-------------------------------------------------------------------------- */

/* Shown when its findings call for it, when its group's Show all is on, or when
   it is already ticked — see the header on that last one. A comment with no
   `when` is reachable only through Show all, which is the original's WBCC7. */
function pbCommentVisible(comment) {
    if (document.getElementById(comment.id)?.checked) return true;
    if (document.getElementById('pbShowAll_' + comment.group)?.checked) return true;
    return !!(comment.when && comment.when());
}

function syncPBComments() {
    pbComments.forEach(function (comment) {
        const row = document.getElementById(comment.id + 'Row');
        if (row) row.hidden = !pbCommentVisible(comment);
    });
}


/* ----------------------------------------------------------------------------
   Report

   One paragraph, the ticked comments in list order joined by a space — the
   original built `commentText` exactly this way, prefixing each with a space and
   trimming nothing.
-------------------------------------------------------------------------- */

function pbCommentText() {
    return pbComments
        .filter(function (c) { return document.getElementById(c.id)?.checked; })
        .map(function (c) { return typeof c.text === 'function' ? c.text() : c.text; })
        .join(' ');
}

function fillPBComment() {
    const text = pbCommentText();
    return text ? `<p style="${REPORT_PARAGRAPH}">${text}</p>` : '';
}


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */

renderPBCommentPanel();

registerReportSection({ id: 'pbCommentSection', fill: fillPBComment, heading: 'Comment' });

/* Every change anywhere in the form can move a gate, so this listens on
   #inputPanel like the diagnosis engine does — there is no narrower signal, and
   syncing is a loop over 36 booleans. `input` as well, for the blast percentage
   and the free-text rows. */
document.getElementById('inputPanel')?.addEventListener('change', syncPBComments);
document.getElementById('inputPanel')?.addEventListener('input', syncPBComments);
document.addEventListener('cbcParsed', syncPBComments);

document.addEventListener('DOMContentLoaded', syncPBComments);
