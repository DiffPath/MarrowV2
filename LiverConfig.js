/* ============================================================================
   LiverConfig.js — template config for the liver biopsy page (Liver.html).

   Worked example of the standardized-shell pattern: Liver.html is identical
   to Marrow.html except its config <script> points here instead of at
   MarrowConfig.js. Template.css and Template.js are shared and untouched.
   Everything liver-specific lives in this one file.
   ========================================================================= */

const templateConfig = {
    pageTitle: 'Liver Biopsy Template',

    /* Slide-out drawer links. `active: true` marks the current page.
       Bone Marrow / Liver point at the local sibling pages so you can hop
       between the two templates while developing. */
    navLinks: [
        { label: 'Bone Marrow',      icon: 'fas fa-bone',       href: 'Marrow.html' },
        { label: 'Liver Biopsy',     icon: 'fas fa-disease',    href: 'Liver.html', active: true },
        { label: 'Peripheral Blood', icon: 'fas fa-tint',       href: 'https://diffpath.github.io/pages/peripheralblood.html' },
        { label: 'Cell Counter',     icon: 'fas fa-calculator', href: 'https://diffpath.github.io/pages/counter.html' }
    ],

    /* Left input panel sub-tabs (tab group "templateTab"). */
    inputTabs: [
        { id: 'spec',      label: 'Specimen',    icon: 'fas fa-list' },
        { id: 'clinical',  label: 'Clinical',    icon: 'fas fa-notes-medical' },
        { id: 'micro',     label: 'Microscopic', icon: 'fas fa-microscope' },
        { id: 'stain',     label: 'Stains',      icon: 'fas fa-palette' },
        { id: 'diagnosis', label: 'Diagnosis',   icon: 'fas fa-stethoscope' }
    ],

    /* Button bar above the report output. */
    copyButtons: [
        { id: 'newLiverBtn',     label: 'New Liver',        icon: 'fas fa-file' },
        { id: 'copyFinal',       label: 'Copy Final',       icon: 'fas fa-copy' },
        { id: 'copyComment',     label: 'Copy Comment',     icon: 'fas fa-copy' },
        { id: 'copyMicroscopic', label: 'Copy Microscopic', icon: 'fas fa-copy' }
    ],

    /* Settings sub-tabs (tab group "settingTab"). */
    settingsTabs: [
        { id: 'stainSettings', label: 'Stain Settings' },
        { id: 'miscSettings',  label: 'Miscellaneous' }
    ]
};
