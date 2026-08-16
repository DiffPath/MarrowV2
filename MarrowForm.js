/* ============================================================================
   MarrowForm.js — the shared form vocabulary.

   Template-agnostic in spirit but Marrow-loaded: the primitives every input tab
   builds its controls out of, plus the one prose helper they all need. Nothing
   here knows a tab, a cell, or a report string.

   It exists because the Blood tab became the second caller of chipHTML() and
   addCommas(), which is exactly the trigger MarrowSpec.js's own comments named.
   A tab reaching into another tab's file for a helper is the thing to avoid.

   THE TOGGLE GROUP is the one idea here worth reading about. See below.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Prose
-------------------------------------------------------------------------- */

/* Joins a list into prose: 1 -> "a"; 2 -> "a and b" (no comma); 3+ -> Oxford
   comma. Verbatim from ../Marrow/MarrowText.js:113-126. */
function addCommas(array) {
    if (!array || array.length === 0) return '';
    if (array.length === 1) return array[0];
    if (array.length === 2) return `${array[0]} and ${array[1]}`;

    let commaString = '';
    for (let i = 0; i < array.length; i++) {
        if (i < array.length - 1) {
            commaString += `${array[i]}, `;
        } else {
            commaString += `and ${array[i]}`;
        }
    }
    return commaString;
}


/* ----------------------------------------------------------------------------
   Chips
-------------------------------------------------------------------------- */

/* One toggle chip. `extraClass` carries the group hook (.specimen, .laterality).

   Layout detail the markup must keep: each .chipInput and its .chip label stay
   ADJACENT siblings, since the chip styling keys on the + combinator. */
function chipHTML(type, name, id, value, label, extraClass) {
    const nameAttr = name ? ` name="${name}"` : '';
    const valueAttr = value ? ` value="${value}"` : '';
    return `<input type="${type}" class="chipInput form ${extraClass}" id="${id}"${nameAttr}${valueAttr}><label class="chip" for="${id}">${label}</label>`;
}


/* ----------------------------------------------------------------------------
   Settings panels
-------------------------------------------------------------------------- */

/* One Save per settings panel, kept last however many blocks render into it.
   saveSettings() commits every .setting on the page, so a second button would
   only be a second name for one action. appendChild MOVES an existing node,
   which is what keeps it below the block that just rendered. */
function settingsPanelSave(panel) {
    let save = panel.querySelector('.saveButton');
    if (!save) {
        save = document.createElement('button');
        save.type = 'button';
        save.className = 'saveButton';
        save.textContent = 'Save';
        save.addEventListener('click', saveSettings);
    }
    panel.appendChild(save);
}


/* ----------------------------------------------------------------------------
   Toggle groups

   A set of chips of which AT MOST ONE is chosen — and, unlike a radio group,
   choosing nothing is reachable: clicking the chosen chip clears it.

   That last part is why these are checkboxes with a handler rather than radios.
   A radio cannot be un-picked, and almost every choice on the Blood tab is
   genuinely optional: "no comment on the monocytes" is a real, common answer
   and it is the DEFAULT one. With radios, a mis-click on "Low" would be
   permanent for the life of the case — the report would carry a sentence you
   never meant and could not delete without reloading. The old app hit this from
   both sides, using radios where it needed clearing (hemoglobin) and unguarded
   checkboxes where it needed exclusivity (severity, where ticking both Mild and
   Marked silently reported "marked").

   One handler, delegated from #inputPanel, serves every group on every tab.
   Membership is `data-toggle="<group>"`; the group name is also the id prefix by
   convention, but nothing here depends on that.
-------------------------------------------------------------------------- */

function toggleGroupMembers(group) {
    return document.querySelectorAll('[data-toggle="' + group + '"]');
}

/* The chosen chip's value, or '' when the group is clear. The canonical reader:
   callers should ask this rather than reach for individual ids. */
function toggleGroupValue(group) {
    const chosen = Array.from(toggleGroupMembers(group)).find(function (el) { return el.checked; });
    return chosen ? chosen.value : '';
}

function clearToggleGroup(group) {
    toggleGroupMembers(group).forEach(function (el) { el.checked = false; });
}

/* Choose a group's answer from code — the writer to toggleGroupValue's reader,
   and the one the CBC autofill goes through.

   Finds the member by VALUE, never by a guessed id. A group's chips are built
   by whoever needed them and their ids follow that caller's convention (the
   plain chips are `<group>_<value>`, a qualifier chip is `<chip>Q<value>`) —
   the only thing every member of a group shares is its data-toggle and its
   value, so those are the only two things to key on. */
function setToggleGroup(group, value) {
    clearToggleGroup(group);

    const chip = Array.from(toggleGroupMembers(group)).find(function (el) { return el.value === value; });
    if (chip) chip.checked = true;
}

/* Exclusivity is enforced on change rather than by markup, so it also holds for
   a group whose chips are rendered by different callers. The clicked chip is
   already in its new state by the time this runs — if it just became checked,
   everything else in its group goes off; if it just became UNchecked, that was
   the user clearing the group and nothing else needs doing. */
document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    const group = e.target.dataset?.toggle;
    if (!group || !e.target.checked) return;

    toggleGroupMembers(group).forEach(function (el) {
        if (el !== e.target) el.checked = false;
    });
});


/* ----------------------------------------------------------------------------
   Stop chips

   "Unremarkable morphology" and its kin: a chip that MEANS the absence of every
   other chip beside it, so holding both is not a state anyone can want. Ticking
   a stop chip clears its group's ordinary chips; ticking an ordinary one clears
   the group's stop chips. (The old app spelled this out per control as
   `onPairedOff` / `offPairedOff` / `data-paired` attributes.)

   Not a toggle group: the ordinary chips are multi-select among themselves, and
   only the stop chips are exclusive with them. Membership is
   `data-stopgroup="<group>"`, with `data-stop` marking the stop chips.
-------------------------------------------------------------------------- */

document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    const group = e.target.dataset?.stopgroup;
    if (!group || !e.target.checked) return;

    const isStop = e.target.dataset.stop !== undefined;

    document.querySelectorAll('[data-stopgroup="' + group + '"]').forEach(function (el) {
        if (el === e.target) return;
        // A stop chip silences everything; an ordinary chip silences only the
        // stop chips, since ordinary chips coexist happily.
        if (isStop || el.dataset.stop !== undefined) el.checked = false;
    });
});
