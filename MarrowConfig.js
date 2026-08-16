/* ============================================================================
   MarrowConfig.js — template config for the bone marrow page (Marrow.html).

   The shared shell (Template.css + Template.js) is a standardized
   report-builder layout; each template is one entry page plus one config:
   Marrow.html + MarrowConfig.js, Liver.html + LiverConfig.js, ...

   To spin up a new template (placenta, peripheral blood, ...):

     1. Duplicate an entry page (e.g. Liver.html -> Placenta.html) and change
        its config <script> line to the new config file.
     2. Write that config: page title, drawer links, input tabs, copy
        buttons, settings tabs. Nothing in Template.js or the shell markup
        needs to change.
     3. Add the report content: populate each generated panel by id from your
        own script(s), loaded after Template.js.

   Conventions:
     - Each tab entry's `id` generates a tab element `#<id>Tab` and a panel
       `#<id>Panel` (e.g. id "spec" -> #specTab and #specPanel). Attach
       content and handlers using those ids.
     - Icons are FontAwesome classes. Omit `icon` for a text-only tab.
     - The FIRST entry in each tab list starts out selected/visible.
     - The page-level tabs (Template / Help / About / Save / Settings) are
       fixed shell chrome, identical across templates, and live in the HTML.
   ========================================================================= */

const templateConfig = {
    pageTitle: 'Bone Marrow Template',

    /* Slide-out drawer links. `active: true` marks the current page. */
    navLinks: [
        { label: 'Bone Marrow',      icon: 'fas fa-bone',       href: 'Marrow.html', active: true },
        { label: 'Liver Biopsy',     icon: 'fas fa-disease',    href: 'Liver.html' },
        { label: 'Peripheral Blood', icon: 'fas fa-tint',       href: 'https://diffpath.github.io/pages/peripheralblood.html' },
        { label: 'Cell Counter',     icon: 'fas fa-calculator', href: 'https://diffpath.github.io/pages/counter.html' }
    ],

    /* Left input panel sub-tabs (tab group "templateTab"). */
    inputTabs: [
        { id: 'spec',      label: 'Specimen',  icon: 'fas fa-list' },
        { id: 'pb',        label: 'Blood',     icon: 'fas fa-tint' },
        { id: 'asp',       label: 'Aspirate',  icon: 'fas fa-syringe' },
        { id: 'core',      label: 'Core',      icon: 'fas fa-bone' },
        { id: 'stain',     label: 'Stains',    icon: 'fas fa-palette' },
        { id: 'ancillary', label: 'Ancillary', icon: 'fas fa-flask' },
        { id: 'diagnosis', label: 'Diagnosis', icon: 'fas fa-stethoscope' }
    ],

    /* Button bar above the report output. Ids are used verbatim; buttons are
       inert until handlers are attached by id. */
    copyButtons: [
        { id: 'newMarrowBtn', label: 'New Marrow',       icon: 'fas fa-file' },
        { id: 'spec',         label: 'Copy Final',       icon: 'fas fa-copy' },
        { id: 'copyComment',  label: 'Copy Comment',     icon: 'fas fa-copy' },
        { id: 'copyClinical', label: 'Copy Clinical',    icon: 'fas fa-copy' },
        { id: 'microscopic',  label: 'Copy Microscopic', icon: 'fas fa-copy' }
    ],

    /* Settings sub-tabs (tab group "settingTab"). */
    settingsTabs: [
        { id: 'differentialSettings', label: 'Counter Settings' },
        { id: 'bloodSettings',        label: 'Blood Settings' },
        { id: 'aspSettings',          label: 'Aspirate Settings' },
        { id: 'coreSettings',         label: 'Core Settings' },
        { id: 'miscSettings',         label: 'Miscellaneous' }
    ]
};
