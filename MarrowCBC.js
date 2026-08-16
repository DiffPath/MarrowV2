/* ============================================================================
   MarrowCBC.js — parse a pasted Epic CBC and render its most recent result set
   as a table in the report panel.

   The Epic Hyperspace copy is a grid: one row per component, one column per
   prior draw (newest first). We take only the newest column. Two delimiters
   are in play — columns are tab-separated, but a cell's value and its flag are
   space-separated ("8.2 Low") — so we split on "tab OR 2+ spaces", which keeps
   "8.2 Low" and "Absolute Neutrophils" intact while separating columns.

   Only whitelisted component names are read, so surrounding noise (order
   numbers, the IG comment, the narrative, demographics) can never be mistaken
   for a result. No parsing beyond this: no reference ranges, no persistence.

   PHI: this only READS #pbCBC and renders to the DOM. Nothing here is saved.
   ========================================================================= */

/* Canonical order + units + display group. A line is a CBC result only if its
   name is here. `group` splits the table into two side-by-side blocks, which
   is both the clinical grouping and what keeps the block short. */
const cbcComponents = [
    { name: 'WBC',                            unit: 'K/uL',     group: 'cbc' },
    { name: 'RBC',                            unit: 'M/uL',     group: 'cbc' },
    { name: 'HGB',                            unit: 'g/dL',     group: 'cbc' },
    { name: 'HCT',                            unit: '%',        group: 'cbc' },
    { name: 'MCV',                            unit: 'fL',       group: 'cbc' },
    { name: 'MCH',                            unit: 'pg',       group: 'cbc' },
    { name: 'MCHC',                           unit: 'g/dL',     group: 'cbc' },
    { name: 'RDW',                            unit: '%',        group: 'cbc' },
    { name: 'PLT',                            unit: 'K/uL',     group: 'cbc' },
    { name: 'MPV',                            unit: 'fL',       group: 'cbc' },
    { name: 'NRBCs',                          unit: '/100 WBC', group: 'cbc' },
    { name: 'Absolute NRBCs',                 unit: 'K/uL',     group: 'cbc' },
    { name: 'Neutrophils',                    unit: '%',        group: 'diff' },
    { name: 'Lymphocytes',                    unit: '%',        group: 'diff' },
    { name: 'Monocytes',                      unit: '%',        group: 'diff' },
    { name: 'Eosinophils',                    unit: '%',        group: 'diff' },
    { name: 'Basophils',                      unit: '%',        group: 'diff' },
    { name: 'Immature Granulocytes',          unit: '%',        group: 'diff' },
    { name: 'Absolute Neutrophils',           unit: 'K/uL',     group: 'diff' },
    { name: 'Absolute Lymphocytes',           unit: 'K/uL',     group: 'diff' },
    { name: 'Absolute Monocytes',             unit: 'K/uL',     group: 'diff' },
    { name: 'Absolute Eosinophils',           unit: 'K/uL',     group: 'diff' },
    { name: 'Absolute Basophils',             unit: 'K/uL',     group: 'diff' },
    { name: 'Absolute Immature Granulocytes', unit: 'K/uL',     group: 'diff' }
];

/* Rendered left to right; a group with nothing parsed is omitted. */
const cbcGroups = [
    { key: 'cbc',  label: 'CBC' },
    { key: 'diff', label: 'Differential' }
];

const cbcUnits = {};
cbcComponents.forEach(function (c) { cbcUnits[c.name] = c.unit; });

/* The most recent parse, shared between the input handler and the report
   section's fill(). null until something is pasted. */
let cbcData = null;

/* Patient age, in whole years, or null. Derived from the paste's DOB the way the
   original was (../Marrow/Marrow.js:798-805), and used only by the core
   cellularity autofill, which needs "100 minus age".

   PHI DISCIPLINE: DOB is PHI and must never persist. It is held nowhere — read
   from the raw paste, reduced to an INTEGER age on the spot, and dropped. Age is
   kept OUT of cbcData (the parsed structure other code reads and a future
   case-save might serialize) precisely so a save can never carry it out through
   here; the paste box itself is already class="noSave". A save that later wants
   age must make that decision on its own, in the open. */
let cbcAge = null;

function parseAge(raw) {
    // "DOB: M/D/YYYY" in a demographics line; tolerant of 1- or 2-digit m/d and
    // 2- or 4-digit years, which is the shape Epic pastes.
    const m = raw.match(/DOB:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (!m) return null;
    const dob = new Date(m[1]);
    if (isNaN(dob.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    // Back off a year if this year's birthday has not happened yet — completed
    // years, which is what "age" means and what the cellularity math assumes.
    const beforeBirthday = now.getMonth() < dob.getMonth() ||
        (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (beforeBirthday) age -= 1;

    return age >= 0 && age < 130 ? age : null;
}

/* null when no DOB has been pasted — the cellularity autofill treats that as "no
   opinion" and leaves the choice manual, exactly as the original did for
   patientAge === -1. */
function cbcPatientAge() {
    return cbcAge;
}

/* Collapse state must live here, NOT in the DOM: fillReport() replaces
   #cbcDiv's innerHTML on every keystroke, so anything held in the markup is
   discarded. Kept across re-parses on purpose — a collapse is the user's
   choice and a new paste shouldn't silently undo it. One flag for the whole
   area: clicking either table collapses/expands both together, so one click
   frees the vertical space once the report starts filling in. */
let cbcCollapsed = false;


function parseCBC(raw) {
    const found = {};

    const collectedMatch = raw.match(/Collected:\s*([0-9/]+\s+[0-9:]+)/);
    const collected = collectedMatch ? collectedMatch[1] : null;

    raw.split(/\r?\n/).forEach(function (line) {
        const cells = line
            .split(/\t| {2,}/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length; });
        if (cells.length < 2) return;

        const name = cells[0];
        if (!(name in cbcUnits) || name in found) return;

        // Newest column is the first value cell: a number, then optional flag.
        const m = cells[1].match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
        if (!m) return;

        found[name] = { value: m[1], flag: (m[2] || '').trim() };
    });

    const rows = cbcComponents
        .filter(function (c) { return c.name in found; })
        .map(function (c) {
            return {
                name: c.name,
                unit: c.unit,
                group: c.group,
                value: found[c.name].value,
                flag: found[c.name].flag
            };
        });

    return { collected: collected, rows: rows };
}


function cbcRowHTML(r) {
    const high = /high/i.test(r.flag);
    const low = /low/i.test(r.flag);
    const rowClass = high ? ' class="cbcRowHigh"' : low ? ' class="cbcRowLow"' : '';
    const valueClass = high ? ' cbcHigh' : low ? ' cbcLow' : '';
    const badge = high ? '<span class="cbcFlag">H</span>'
                : low ? '<span class="cbcFlag">L</span>' : '';

    return `<tr${rowClass}>
        <td class="dataName">${r.name}</td>
        <td class="dataValue${valueClass}">${r.value}${badge}</td>
        <td class="dataUnit">${r.unit}</td>
    </tr>`;
}

/* Each group renders as a table whose header row doubles as the toggle for
   the whole CBC area: the collected date sits beside the group name (so a
   CBC-only draw paired with an older differential is visible at a glance).
   The tbody is hidden rather than dropped so aria-controls always points at a
   real element and the header row keeps its fixed column widths. */
function cbcGroupHTML(group) {
    const rows = cbcData.rows.filter(function (r) { return r.group === group.key; });
    if (rows.length === 0) return '';

    const collapsed = cbcCollapsed;
    const date = cbcData.collected
        ? `<span class="cbcDate">${cbcData.collected}</span>`
        : '';
    const bodyId = `cbcBody_${group.key}`;

    return `<div class="cbcGroup">
        <table class="dataTable">
            <thead>
                <tr>
                    <th class="dataGroupHead"><button type="button" class="dataToggle" aria-expanded="${!collapsed}" aria-controls="${bodyId}">
                        <i class="fas fa-chevron-down dataChevron"></i><span class="dataCaption">${group.label}</span>${date}
                    </button></th>
                    <th class="dataValueHead">Result</th>
                    <th class="dataUnitHead">Units</th>
                </tr>
            </thead>
            <tbody id="${bodyId}"${collapsed ? ' hidden' : ''}>${rows.map(cbcRowHTML).join('')}</tbody>
        </table>
    </div>`;
}

function cbcTableHTML() {
    if (!cbcData || cbcData.rows.length === 0) return '';
    return `<div class="cbcGrid">${cbcGroups.map(cbcGroupHTML).join('')}</div>`;
}


/* One parsed result, or null. The canonical reader for anything downstream of
   the paste — callers ask by component name and never reach into cbcData. */
function cbcResult(name) {
    if (!cbcData) return null;
    return cbcData.rows.find(function (r) { return r.name === name; }) || null;
}

/* A result's number, or NaN when it is missing — which is what every threshold
   comparison downstream wants, since NaN fails them all and a missing value
   should decide nothing. */
function cbcValue(name) {
    const result = cbcResult(name);
    return result ? parseFloat(result.value) : NaN;
}

function cbcFlagged(name, flag) {
    const result = cbcResult(name);
    return result ? new RegExp(flag, 'i').test(result.flag) : false;
}


registerReportSection({ id: 'cbc', fill: cbcTableHTML });

/* Live: reparse and re-render on every edit/paste of the CBC box.

   The event between the two is how a CBC reaches the Blood tab's findings
   without this file knowing there is one: it announces that it parsed, and
   whoever cares fills their own controls in. Dispatched BEFORE fillReport() on
   purpose — a listener that answers a question on the form has to have answered
   it before the report is built from the form, or the report trails the paste
   by one keystroke. */
document.getElementById('pbCBC')?.addEventListener('input', function () {
    cbcData = parseCBC(this.value);
    cbcAge = parseAge(this.value);   // before cbcParsed, so the core sees fresh age
    document.dispatchEvent(new CustomEvent('cbcParsed'));
    fillReport();
});

/* Delegated from #rightPanelFinal, which is static markup: the tables are
   destroyed and rebuilt by every fillReport(), so a listener bound directly
   to them would not survive. A click anywhere on either table toggles the
   whole area; the header buttons inside bubble into the same handler,
   existing only to make the toggle keyboard- and screen-reader-operable. */
document.getElementById('rightPanelFinal')?.addEventListener('click', function (e) {
    if (!e.target.closest('.cbcGroup')) return;
    cbcCollapsed = !cbcCollapsed;
    fillReport();
});
