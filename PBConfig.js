/* ============================================================================
   PBConfig.js — template config for the peripheral blood page (PB.html).

   Ported from https://diffpath.github.io/pages/pbnorthwest.html, the author's
   standing peripheral blood smear template. A SEPARATE PAGE, not a marrow tab:
   the two report different things. The marrow's Blood tab writes a paragraph of
   the microscopic description ("The peripheral blood smear shows mild anemia");
   this template writes a FINAL DIAGNOSIS — one line per finding, "Microcytic
   hypochromic anemia (8.2 g/dL)." — plus a comment assembled from a gated list
   of standing paragraphs. Same specimen, different document.

   WHAT IS SHARED WITH THE MARROW PAGE, and why it is loaded rather than copied:
   the shell (Template.js/css) is template-agnostic by design, and four of the
   marrow's content scripts were written as libraries that declare no marrow data
   — MarrowForm (chips, toggle groups, stop chips), MarrowDescriptors (the
   morphology vocabulary and the growing dropdown list), MarrowReport (the report
   section registry) and MarrowCBC (the Epic paste parser). The `Marrow` prefix on
   those four is now historical; see docs/pb.md.
   ========================================================================= */

const templateConfig = {
    pageTitle: 'Peripheral Blood Template',

    /* Its own storage drawer: its own settings, named saves and autosave drafts.
       Without this a peripheral blood case would land in the marrow's save list
       and the two pages would fight over one draft slot. */
    storeScope: 'PB',

    navLinks: [
        { label: 'Bone Marrow',      icon: 'fas fa-bone',       href: 'Marrow.html' },
        { label: 'Liver Biopsy',     icon: 'fas fa-disease',    href: 'Liver.html' },
        { label: 'Peripheral Blood', icon: 'fas fa-tint',       href: 'PB.html', active: true },
        { label: 'Cell Counter',     icon: 'fas fa-calculator', href: 'https://diffpath.github.io/pages/counter.html' }
    ],

    /* ONE PAGE OF INPUTS, as the original has: its RBC, WBC and platelet rows all
       live on one scrolling panel and are filled top to bottom, which is how the
       smear is read. Splitting them into a tab each was tried and reverted at the
       author's instruction — it hid two thirds of the form behind a click and
       made you tab back and forth to see whether the case hung together.

       Each lineage still gets its own FILE (PBRbc/PBWbc/PBPlt), appending its
       block to #findingsPanel in load order. The Comment page is the second tab
       because it is the original's second panel, and because it is a different
       act: what the smear shows, then what to say about it. */
    inputTabs: [
        { id: 'findings', label: 'Findings', icon: 'fas fa-list' },
        { id: 'comment',  label: 'Comment',  icon: 'fas fa-comment-dots' }
    ],

    copyButtons: [
        { id: 'newCaseBtn',   label: 'New Case',      icon: 'fas fa-file' },
        { id: 'copyFinal',    label: 'Copy Final',    icon: 'fas fa-copy' },
        { id: 'copyComment',  label: 'Copy Comment',  icon: 'fas fa-copy' },
        { id: 'copyClinical', label: 'Copy Clinical', icon: 'fas fa-copy' }
    ],

    /* Which button copies which report sections. Declared per template because
       the section ids are the template's — the marrow's Copy Final takes its
       specimen line, this one takes the final diagnosis. Anything unclaimed goes
       to the LAST button in this list by the same "microscopic is everything
       else" rule; here there is no such button, so every section is claimed. */
    copyClaims: {
        copyFinal:    ['pbFinal'],
        copyComment:  ['pbCommentSection'],
        copyClinical: ['cbc']
    },

    newButton: {
        id: 'newCaseBtn',
        confirm: 'Start a new case? This clears everything entered for the current case.'
    },

    settingsTabs: [
        { id: 'pbReportSettings', label: 'Report Settings' },
        { id: 'miscSettings',     label: 'Miscellaneous' }
    ]
};
