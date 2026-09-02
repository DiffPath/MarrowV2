/* ============================================================================
   PBClinical.js — the CBC paste box, at the top of the Findings page.

   A whole file for one textarea, and it earns it on load order: MarrowCBC.js
   binds its `input` listener to `#pbCBC` at its own script scope, so the box has
   to exist by the time that file runs. This is what creates it, and PB.html
   loads the two in that order for no other reason.

   The parser itself is shared with the marrow page unchanged — an Epic CBC is an
   Epic CBC — and it registers the `cbc` report section on its own.

   WHAT USED TO BE HERE: a free-text "Reason for review" that printed verbatim as
   the report's opening line, and a "Requested by" name that printed inside a
   fixed sentence ("Peripheral Blood Smear Pathologist Interpretation Requested
   by: …"). Both were ported from pbnorthwest.html:1735-1739 and both were
   removed at the author's instruction. The `pbHeader` report section went with
   them, so the report now opens on the CBC table.

   "Clinical" still names this file and the Copy Clinical button honestly: the
   CBC is the clinical data on this page, and that button copies the `cbc`
   section (see templateConfig.copyClaims).

   PHI: the paste box carries `noSave`, the marker MarrowSave.js's capture skips.
   Nothing here is persisted; see docs/save.md.
   ========================================================================= */


function renderPBClinicalPanel() {
    const panel = document.getElementById('findingsPanel');
    if (!panel) return;

    panel.insertAdjacentHTML('beforeend', `
        <div class="fieldBlock">
            <div class="fieldLabel">CBC</div>
            <div class="pbCBC">
                <textarea class="textBox noSave" id="pbCBC" rows="4" placeholder="Paste CBC here"
                          spellcheck="false"></textarea>
            </div>
        </div>`);
}


renderPBClinicalPanel();
