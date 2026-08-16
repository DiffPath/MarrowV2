/* ============================================================================
   MarrowSettings.js — settings panel content + persistence.

   Settings are user preferences that outlive a single case (stored in
   localStorage), as opposed to case data. They are committed by the Save
   button, not on every keystroke, and applying them must never mutate the
   case currently on screen.

   To add a setting: render a control carrying class "setting" with a unique
   id into the appropriate #<id>SettingsPanel, then read it via
   getSetting('<id>', <fallback>). Capture/restore is by id and needs no
   further wiring.
   ========================================================================= */

const MARROW_SETTINGS_KEY = 'marrowSettingsBM';


/* ----------------------------------------------------------------------------
   Storage
-------------------------------------------------------------------------- */
function readSettings() {
    try {
        return JSON.parse(localStorage.getItem(MARROW_SETTINGS_KEY)) || {};
    } catch (e) {
        // Corrupt or unreadable (e.g. storage disabled) — fall back to defaults
        // rather than breaking the page.
        return {};
    }
}

function collectSettings() {
    const settings = {};
    document.querySelectorAll('.setting').forEach(function (el) {
        settings[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
    });
    return settings;
}

/* Stored values -> controls. Anything absent from storage keeps the default
   already in the markup. */
function applySettings() {
    const settings = readSettings();
    document.querySelectorAll('.setting').forEach(function (el) {
        if (!(el.id in settings)) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = settings[el.id];
        } else {
            el.value = settings[el.id];
        }
    });
}

function saveSettings() {
    try {
        localStorage.setItem(MARROW_SETTINGS_KEY, JSON.stringify(collectSettings()));
        showAlert('success', 'Settings saved successfully');
    } catch (e) {
        showAlert('error', 'Settings could not be saved');
    }
}

/* The live value of one setting, for callers that need it mid-session. Reads
   the control (not storage) so an unsaved change is still honored by anything
   that asks after it. */
function getSetting(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
}


/* ----------------------------------------------------------------------------
   Panel content
-------------------------------------------------------------------------- */
function renderMiscSettings() {
    const panel = document.getElementById('miscSettingsPanel');
    if (!panel) return;

    panel.innerHTML = `
        <div>
            <input type="checkbox" class="toggleInput setting" id="specDefaultAll" checked><label class="toggleSwitch" for="specDefaultAll">Start new cases with all specimen parts checked</label>
        </div>
        <br>
        <button type="button" class="saveButton" id="miscSettingsSave">Save</button>`;

    document.getElementById('miscSettingsSave')?.addEventListener('click', saveSettings);
}


renderMiscSettings();
applySettings();
