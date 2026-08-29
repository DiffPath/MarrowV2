/* ============================================================================
   MarrowSave.js — case persistence: the autosave draft and the named saves.

   TWO STORES, and the difference between them is who decided to write:

     NAMED SAVES  (localStorage "marrowCasesBM")   — you pressed Save and gave
                  it a name. One record per name, overwritten on re-save.
     THE DRAFT    (localStorage "marrowDraftBM:<caseId>") — nobody pressed
                  anything. ONE record per case, rewritten in place.

   Settings are neither: they live in MarrowSettings.js under their own key and
   are user preferences that outlive a case. Nothing here reads or writes them.

   ---------------------------------------------------------------------------
   WHY THE DRAFT IS KEYED BY CASE AND NOT BY TIME

   An autosave that appends is a list of a thousand near-identical marrows by
   lunchtime, and finding the right one in it costs more than retyping the case.
   So there is exactly one draft per case and every write lands on the same key.

   "Per case" has to survive a reload and NOT be shared between two windows —
   two marrows open side by side are two cases, and either one clobbering the
   other's draft is the failure this is built to avoid. The identity is therefore
   a `caseId` in sessionStorage:

     - it survives F5 and a crash-and-reopen (sessionStorage is per TAB and
       outlives a reload), so the draft is found again where it was left;
     - it is not shared with a second window opened from the drawer or the file
       system, because that window gets its own sessionStorage and mints its own
       id.

   THE ONE CASE THAT NEEDS MORE THAN THAT is a DUPLICATED tab, which the browser
   hands a *copy* of sessionStorage — two live tabs holding one caseId, taking
   turns overwriting one draft. A reload and a duplicate are indistinguishable
   from the inside (both wake up holding the same caseId), so the question has to
   be asked out loud: IS ANYONE ELSE HOLDING THIS CASE RIGHT NOW?

   It is asked as a handshake over localStorage, whose `storage` event is
   delivered to every OTHER page on the origin and to no other page:

     1. On load, write "marrowPingBM:<caseId>" and note the time.
     2. Any live page holding that caseId hears it and answers at once, by
        writing its own token and the clock into "marrowBeatBM:<caseId>".
     3. 400ms later, look. An answer STAMPED AFTER THE PING means someone else is
        holding the case: restore the content anyway (it is what the user was
        looking at when they duplicated) but FORK — mint a new caseId, so the two
        pages own one draft each from here on. No answer means a reload, and the
        caseId is kept.

   Comparing against the ping's own timestamp rather than against a staleness
   window is what makes this survive a crash: a beat left behind by a page that
   died cannot be newer than a ping written afterwards, so it never answers.
   Every page also beats every ten seconds and clears its beat on pagehide, which
   is what the Save page reads to say "open in another window" — and a beat
   younger than one interval is trusted without an answer, for the backgrounded
   tab whose timers Chrome has throttled but whose data is still live.

   Forking is the SAFE direction and nothing is riding on getting it exactly
   right: a fork that was not needed costs one extra row in the drafts list,
   where a missed one costs two windows overwriting each other's marrow.

   ---------------------------------------------------------------------------
   PHI. Capture skips `class="noSave"` (the CBC paste box, the NGS report, the
   cytogenetics paste) exactly as CLAUDE.md requires, and it skips
   `class="setting"` so a case can never carry someone's preferences into another
   case. It never reads a module variable directly: everything outside the form's
   own controls arrives through registerCaseState(), so the file that owns a
   piece of state also owns the decision about whether it may be written down.
   MarrowCBC.js's handler is the worked example — it drops the collection
   timestamp, and says so where anyone changing it will read the reason.

   ---------------------------------------------------------------------------
   LOADS EARLY, ON PURPOSE — right after MarrowSettings.js and before every tab,
   so a tab file can call registerCaseState() at its own script scope, the same
   way it calls registerReportSection(). Nothing here runs at load beyond
   defining functions; the whole bootstrap is deferred to a setTimeout(0) off
   DOMContentLoaded, which is the only way to be sure it runs AFTER every other
   DOMContentLoaded listener (buildReportSections, the counters' final render).
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Keys and timings
-------------------------------------------------------------------------- */

const CASE_SAVES_KEY    = 'marrowCasesBM';      // localStorage: named saves
const CASE_DRAFT_PREFIX = 'marrowDraftBM:';     // localStorage: one per case
const CASE_BEAT_PREFIX  = 'marrowBeatBM:';      // localStorage: liveness
const CASE_PING_PREFIX  = 'marrowPingBM:';      // localStorage: "anyone holding this?"
const CASE_ID_KEY       = 'marrowCaseIdBM';     // sessionStorage: this tab's case

const CASE_SNAPSHOT_VERSION = 1;

/* Long enough that a burst of typing is one write, short enough that closing the
   laptop mid-sentence loses nothing worth having. The write itself is deferred
   again to idle time — a counter keystroke must never wait on JSON. */
const DRAFT_DEBOUNCE_MS = 1500;

/* The heartbeat, how long one is trusted WITHOUT an answer to a ping, and how
   long to wait for that answer.

   DRAFT_STALE_MS is deliberately barely over one beat: an unanswered beat is
   only trusted where the page that wrote it may have been throttled between
   hearing the ping and being able to act on it, which is a window of one
   interval and not of thirty seconds. Everything older is settled by the
   handshake instead, which is the check that survives a crash.

   400ms is a localStorage write, an event dispatch and a write back, all
   in-process — two orders of magnitude of headroom — and it delays nothing the
   user can see: the case has already been restored by the time it starts, and
   the first autosave is 1500ms away regardless. */
const DRAFT_BEAT_MS      = 10000;
const DRAFT_STALE_MS     = 12000;
const DRAFT_HANDSHAKE_MS = 400;

/* Drafts nobody has come back to. Two weeks rather than the old app's one, since
   the whole point of keying by case is that there are only ever a handful. */
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/* The restore loop's ceiling. Each pass writes the controls it can see and then
   lets the growing lists rebuild, which is what puts the NEXT row on screen — so
   a list of N entries needs N+1 passes. The longest list in the app is the
   nineteen immunostains, and this is that with room to spare rather than a
   number with a meaning. */
const CASE_RESTORE_MAX_PASSES = 60;


/* ----------------------------------------------------------------------------
   The case-state registry

   The form's own controls are captured generically, by id (below). This is for
   everything that ISN'T one of those, and it exists so that this file needs to
   know nothing about any tab:

     capture()   -> a JSON-able value, stored under `id`.
     restore(v)  -> put it back. Called with `undefined` for a snapshot written
                    before the handler existed, so every one must tolerate that.
     rebuild()   -> called after EVERY pass of the control restore, and therefore
                    many times. Must be idempotent. This is the hook for a
                    growing list that rebuilds itself from its own DOM: the pass
                    sets the select, the rebuild makes the next row exist, and
                    the next pass fills that one in.
     settle()    -> called ONCE, after the passes, for derived UI that no event
                    is going to fire for (a counter's percentages, the
                    "All specimens" indeterminate state).

   Any of the four may be omitted.
-------------------------------------------------------------------------- */

const caseStateHandlers = [];

function registerCaseState(handler) {
    caseStateHandlers.push(handler);
}

/* A handler throwing must not take the rest of the restore with it: a case that
   comes back missing its variants is recoverable, a blank page is not. */
function caseRunHandlers(phase, argFor) {
    caseStateHandlers.forEach(function (handler) {
        if (!handler[phase]) return;
        try {
            handler[phase](argFor ? argFor(handler) : undefined);
        } catch (err) {
            console.error('Case state "' + handler.id + '" failed to ' + phase + ':', err);
        }
    });
}


/* ----------------------------------------------------------------------------
   Capture

   Every control under #inputPanel that carries an id. Scoped to that panel
   rather than the document because the panel IS the case: the settings live in
   #settingPanel and the report in #templatePanel, and neither is a thing a save
   has any business carrying.

   `noSave` is the PHI marker (CLAUDE.md); `setting` is belt and braces, since a
   settings control rendered into an input tab would otherwise be captured as
   case data and restored over the user's preference.
-------------------------------------------------------------------------- */

function caseControlSaveable(el) {
    return !!el.id
        && !el.classList.contains('noSave')
        && !el.classList.contains('setting')
        && !!el.closest('#inputPanel');
}

function caseControls() {
    return Array.prototype.filter.call(
        document.querySelectorAll('#inputPanel input, #inputPanel select, #inputPanel textarea'),
        caseControlSaveable);
}

/* Checked boxes are stored as a bare 1 and unchecked ones not at all — nine
   chips in ten are unticked on any case, and storing them would triple the
   snapshot to say nothing. Everything else stores its value INCLUDING the empty
   string, which is not symmetry for its own sake: a select that is empty in the
   snapshot and full on screen has to be emptied on restore, and an absent key
   cannot ask for that. Unchecked boxes get the same service from the single
   clearControls() pass below, which is why they can afford to be absent. */
function captureControls() {
    const out = {};
    caseControls().forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
            if (el.checked) out[el.id] = 1;
        } else {
            out[el.id] = el.value;
        }
    });
    return out;
}

function marrowCaptureCase() {
    const state = {};
    caseStateHandlers.forEach(function (handler) {
        if (!handler.capture) return;
        try {
            state[handler.id] = handler.capture();
        } catch (err) {
            console.error('Case state "' + handler.id + '" failed to capture:', err);
        }
    });

    return { version: CASE_SNAPSHOT_VERSION, controls: captureControls(), state: state };
}


/* ----------------------------------------------------------------------------
   Restore

   THE SHAPE OF THE PROBLEM: half the controls in this app do not exist until
   another control names them. Choosing "Schistocytes" in a descriptor list is
   what creates the qualifier chips beside it and the empty select below it;
   naming a stain is what creates its result dropdown, its percentage boxes and
   its tape. So a single write-everything-by-id pass restores the first row of
   every list and silently drops the rest.

   THE FIX IS A FIXED POINT, not a dependency graph: write what exists, let every
   list rebuild, and go round again until a pass changes nothing. Each round
   makes the next row exist, so the loop converges in as many passes as the
   longest list is long, and the app's own rebuild functions do all the work of
   deciding what a row looks like. Nothing here knows what a descriptor or a
   stain is.

   NO EVENTS ARE DISPATCHED. Setting .checked from code deliberately does not
   fire `change`, and that is what makes this safe: a snapshot is already
   internally consistent, so re-running the toggle-group, stop-chip and
   single-parent handlers over it could only ever undo it (the exclusivity
   handler clears every chip in a group that is not the event's target, and a
   restored group has no target). What those handlers would have maintained is
   maintained instead by the settle() hooks.
-------------------------------------------------------------------------- */

/* True while a restore is in flight, so nothing it touches queues an autosave
   of a half-restored case. */
let caseRestoring = false;

function clearControls() {
    caseControls().forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
            el.indeterminate = false;
        }
    });
}

/* Returns whether it changed anything, which is the loop's termination test.
   A value the control refuses (a select option that no longer exists, because
   the vocabulary changed under an old snapshot) leaves the control empty and
   reports NO change — otherwise the loop would spin forever trying to write it. */
function applyControls(controls) {
    let changed = false;

    Object.keys(controls).forEach(function (id) {
        const el = document.getElementById(id);
        if (!el || !caseControlSaveable(el)) return;

        const saved = controls[id];

        if (el.type === 'checkbox' || el.type === 'radio') {
            const want = saved === 1;
            if (el.checked !== want) { el.checked = want; changed = true; }
            return;
        }

        if (el.value === saved) return;
        el.value = saved;
        if (el.value === saved) changed = true;
    });

    return changed;
}

function marrowRestoreCase(snapshot) {
    if (!snapshot || !snapshot.controls) return false;

    caseRestoring = true;
    try {
        clearControls();
        caseRunHandlers('restore', function (handler) {
            return snapshot.state ? snapshot.state[handler.id] : undefined;
        });

        for (let pass = 0; pass < CASE_RESTORE_MAX_PASSES; pass++) {
            const changed = applyControls(snapshot.controls);
            caseRunHandlers('rebuild');
            if (!changed) break;
        }

        caseRunHandlers('settle');

        if (typeof fillReport === 'function') fillReport();
        if (typeof applyTemplateHighlights === 'function') applyTemplateHighlights();
        if (typeof refreshDx === 'function') refreshDx();
    } finally {
        caseRestoring = false;
    }

    return true;
}


/* ----------------------------------------------------------------------------
   Storage helpers
-------------------------------------------------------------------------- */

function caseReadJSON(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;    // absent, unparseable, or storage disabled — all "nothing"
    }
}

function caseWriteJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        return false;   // quota, private mode, disabled storage
    }
}

function caseRemove(key) {
    try { localStorage.removeItem(key); } catch (err) { /* nothing to do */ }
}

function readNamedSaves() {
    const saves = caseReadJSON(CASE_SAVES_KEY);
    return saves && typeof saves === 'object' ? saves : {};
}

function draftKeyFor(id) { return CASE_DRAFT_PREFIX + id; }
function beatKeyFor(id)  { return CASE_BEAT_PREFIX + id; }
function pingKeyFor(id)  { return CASE_PING_PREFIX + id; }

/* Every draft in storage, newest first. The list the Save page shows, and the
   thing pruning walks. */
function readDrafts() {
    const drafts = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key.indexOf(CASE_DRAFT_PREFIX) !== 0) continue;

            const record = caseReadJSON(key);
            if (record && record.data) {
                drafts.push({ id: key.slice(CASE_DRAFT_PREFIX.length), record: record });
            }
        }
    } catch (err) { /* storage unavailable — no drafts, which is a valid answer */ }

    return drafts.sort(function (a, b) { return (b.record.savedAt || 0) - (a.record.savedAt || 0); });
}

/* Drafts nobody came back to, and any beat or ping left behind by one.
   Unparseable records go too: a draft that cannot be read is not a draft. A ping
   is a question that was asked and answered in under a second, so any of those
   still in storage belongs to a page that died mid-handshake. */
function pruneDrafts() {
    const now = Date.now();
    const dead = [];
    const strays = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.indexOf(CASE_PING_PREFIX) === 0) {
                const ping = caseReadJSON(key);
                if (!ping || (now - (ping.at || 0)) > 60000) strays.push(key);
                continue;
            }
            if (!key || key.indexOf(CASE_DRAFT_PREFIX) !== 0) continue;

            const record = caseReadJSON(key);
            if (!record || !record.savedAt || (now - record.savedAt) > DRAFT_MAX_AGE_MS) {
                dead.push(key.slice(CASE_DRAFT_PREFIX.length));
            }
        }
    } catch (err) { return; }

    strays.forEach(caseRemove);
    dead.forEach(function (id) {
        caseRemove(draftKeyFor(id));
        caseRemove(beatKeyFor(id));
    });
}


/* ----------------------------------------------------------------------------
   This tab's identity, and the heartbeat that keeps two tabs off one draft
-------------------------------------------------------------------------- */

/* Fresh on every page LOAD, held in memory only. That is the whole trick: a
   reload gets a new token and the same caseId, a duplicated tab gets a new token
   and an inherited caseId — and only one of the two finds the other still
   beating. */
const caseTabToken = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);

let caseId = null;
let caseName = '';            // the named save this tab is working under, if any
let caseDisabled = false;     // New Marrow, between the click and the reload
let caseClaiming = false;     // mid-handshake: the id may still change

function mintCaseId() {
    return 'case_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function readSessionCaseId() {
    try { return sessionStorage.getItem(CASE_ID_KEY); } catch (err) { return null; }
}

function writeSessionCaseId(id) {
    try { sessionStorage.setItem(CASE_ID_KEY, id); } catch (err) { /* private mode */ }
}

function writeBeat() {
    if (!caseId || caseDisabled) return;
    caseWriteJSON(beatKeyFor(caseId), { token: caseTabToken, at: Date.now() });
}

function clearBeat() {
    if (caseId) caseRemove(beatKeyFor(caseId));
}

/* Is some OTHER page beating on this case? Our own token never counts — a page
   must not decide it is a duplicate of itself. This is the WEAK test, used for
   the Save page's "open in another window" label and as the unanswered fallback
   in the handshake; claimCaseId() below is the one that decides anything. */
function beatIsLive(id) {
    const beat = caseReadJSON(beatKeyFor(id));
    return !!(beat && beat.token && beat.token !== caseTabToken
        && (Date.now() - (beat.at || 0)) < DRAFT_STALE_MS);
}

/* "Is anyone holding this case?" — the handshake described at the top of the
   file. Answers `true` to keep the id and `false` to fork.

   The test is a beat stamped AFTER the ping, which is why a beat left behind by
   a page that crashed can never pass it: that beat is older than the question.
   The one exception is a beat younger than a single interval, which is trusted
   unanswered — a backgrounded page whose timers Chrome throttled may not get to
   run its listener, and one interval is exactly how stale its last beat can be
   while it is still alive and unfrozen.

   Asynchronous because the answer arrives in another page's event loop. Nothing
   waits on it that the user can see: the case is restored before this is called,
   and the first autosave is a debounce away. */
function claimCaseId(id, decided) {
    const askedAt = Date.now();

    if (beatIsLive(id)) { decided(false); return; }
    caseWriteJSON(pingKeyFor(id), { from: caseTabToken, at: askedAt });

    setTimeout(function () {
        caseRemove(pingKeyFor(id));

        const beat = caseReadJSON(beatKeyFor(id));
        const answered = !!(beat && beat.token && beat.token !== caseTabToken
            && (beat.at || 0) >= askedAt);
        decided(!answered);
    }, DRAFT_HANDSHAKE_MS);
}

/* The other half of the handshake, from the side being asked. `storage` fires in
   every page on the origin EXCEPT the one that wrote, so a ping only ever
   reaches pages that might be holding the case — and only the one that actually
   holds it answers. */
window.addEventListener('storage', function (e) {
    if (!caseId || caseDisabled) return;
    if (e.key === pingKeyFor(caseId) && e.newValue) writeBeat();
});


/* ----------------------------------------------------------------------------
   The autosave itself
-------------------------------------------------------------------------- */

/* The empty worksheet, as JSON, measured once before anything is restored into
   it. A case that still equals it is a case nobody has entered, and it gets NO
   draft — otherwise every page ever opened and abandoned would leave a blank
   marrow in the list, and a list full of blanks is the same failure as a list
   full of duplicates. */
let casePristine = null;

let draftTimer = null;
let draftSavedAt = 0;
let draftFailed = false;

/* A write that came due before this page knew which case it was — an edit made
   during the identity handshake, or before the bootstrap ran at all. Held rather
   than dropped, and paid by adoptCaseId(). */
let draftPending = false;

/* Idle, never inline: the draft is JSON of the whole form and the hand that
   triggered it is usually mid-count. Falls back to a plain task where
   requestIdleCallback is unavailable. */
const caseScheduleIdle = (typeof window.requestIdleCallback === 'function')
    ? function (fn) { window.requestIdleCallback(fn, { timeout: 2000 }); }
    : function (fn) { setTimeout(fn, 0); };

function writeDraftNow() {
    if (caseDisabled || caseRestoring) return;
    if (caseClaiming || !caseId) { draftPending = true; return; }
    draftPending = false;

    const snapshot = marrowCaptureCase();

    // Back to blank — take the draft down rather than storing an empty one.
    if (casePristine !== null && JSON.stringify(snapshot) === casePristine) {
        caseRemove(draftKeyFor(caseId));
        draftSavedAt = 0;
        renderSavePage();
        return;
    }

    const record = { savedAt: Date.now(), caseId: caseId, name: caseName, data: snapshot };

    if (caseWriteJSON(draftKeyFor(caseId), record)) {
        draftSavedAt = record.savedAt;
        draftFailed = false;
    } else {
        // Never a toast: an autosave that interrupts is worse than one that
        // fails. The Save page says so instead, and manual Save reports properly.
        draftFailed = true;
    }

    renderSavePage();
}

/* Cheap enough to call on every keystroke — it only moves a timer. It does NOT
   check for a caseId: an edit made before this page knows which case it is still
   deserves to be written, and writeDraftNow() holds it as pending until the id
   is settled. */
function queueAutosave() {
    if (caseDisabled || caseRestoring) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
        draftTimer = null;
        caseScheduleIdle(writeDraftNow);
    }, DRAFT_DEBOUNCE_MS);
}

/* Write NOW, skipping both the debounce and the idle hop — the page is going
   away and there may be no later. */
function flushAutosave() {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
    writeDraftNow();
}

/* Exposed for anything that mutates case state without dispatching an event.
   Nothing needs it today (every list this app grows does so from a real DOM
   event), but the NGS import in the previous app did, and a programmatic change
   that no listener hears is exactly the gap this closes. */
window.queueMarrowAutosave = queueAutosave;


/* ----------------------------------------------------------------------------
   Named saves
-------------------------------------------------------------------------- */

function saveCaseAs(name) {
    name = (name || '').trim();
    if (!name) {
        showAlert('error', 'Name the marrow first');
        return false;
    }

    const saves = readNamedSaves();
    if (Object.prototype.hasOwnProperty.call(saves, name)
        && !window.confirm('A save named "' + name + '" already exists. Overwrite it?')) {
        return false;
    }

    saves[name] = { savedAt: Date.now(), data: marrowCaptureCase() };
    if (!caseWriteJSON(CASE_SAVES_KEY, saves)) {
        showAlert('error', 'Save failed — browser storage is full');
        return false;
    }

    /* The draft now knows what it is a draft OF, which is what lets the Save
       page say "unsaved changes to Smith" rather than showing two unrelated
       rows for one marrow. */
    caseName = name;
    flushAutosave();
    showAlert('success', 'Saved as "' + name + '"');
    renderSavePage();
    return true;
}

function loadCaseNamed(name) {
    const saves = readNamedSaves();
    const save = saves[name];
    if (!save || !save.data) { showAlert('error', 'That save could not be read'); return; }

    if (!window.confirm('Load "' + name + '"? This replaces everything in the current worksheet.')) return;

    if (marrowRestoreCase(save.data)) {
        /* The caseId does NOT change. This window keeps its own draft slot, so
           the same named save opened in two windows still autosaves to two
           places and neither overwrites the other. Loading only says what this
           window is now working on. */
        caseName = name;
        flushAutosave();
        showAlert('success', 'Loaded "' + name + '"');
        renderSavePage();
    } else {
        showAlert('error', 'That save could not be read');
    }
}

function deleteCaseNamed(name) {
    if (!window.confirm('Delete the save "' + name + '"? This cannot be undone.')) return;

    const saves = readNamedSaves();
    delete saves[name];
    caseWriteJSON(CASE_SAVES_KEY, saves);

    if (caseName === name) caseName = '';
    showAlert('success', 'Deleted "' + name + '"');
    renderSavePage();
}

function loadDraft(id) {
    const record = caseReadJSON(draftKeyFor(id));
    if (!record || !record.data) { showAlert('error', 'That draft could not be read'); return; }

    if (!window.confirm('Load this draft? This replaces everything in the current worksheet.')) return;

    if (marrowRestoreCase(record.data)) {
        caseName = record.name || '';
        flushAutosave();
        showAlert('success', 'Draft loaded');
        renderSavePage();
    } else {
        showAlert('error', 'That draft could not be read');
    }
}

function discardDraft(id) {
    if (!window.confirm('Discard this draft? This cannot be undone.')) return;
    caseRemove(draftKeyFor(id));
    caseRemove(beatKeyFor(id));
    showAlert('success', 'Draft discarded');
    renderSavePage();
}

/* New Marrow, from MarrowReport.js's button. A fresh page load is the canonical
   empty state, so the work here is only to make sure the reload does NOT find a
   draft to restore: stop writing, drop this case's draft and beat, and forget
   the caseId so the reloaded page mints a new one. Named saves are untouched. */
function marrowNewCase() {
    caseDisabled = true;
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }

    if (caseId) {
        caseRemove(draftKeyFor(caseId));
        caseRemove(beatKeyFor(caseId));
    }
    try { sessionStorage.removeItem(CASE_ID_KEY); } catch (err) { /* nothing to do */ }
}


/* ----------------------------------------------------------------------------
   The Save page (#savePanel)

   Built here rather than in the entry page for the same reason every other panel
   is: the markup is a function of what is in storage. The panel body is found by
   selector rather than by id, so the shell chrome stays byte-identical across
   template entry pages.
-------------------------------------------------------------------------- */

function caseEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Relative while relative is the useful answer, absolute once it is not. A
   pathologist reading "3 minutes ago" knows it is the case in front of them;
   reading "yesterday at 4pm" they want the date. */
function caseWhen(ms) {
    if (!ms) return '';

    const diff = Date.now() - ms;
    if (diff < 45000) return 'just now';
    if (diff < 90 * 60000) {
        const minutes = Math.max(1, Math.round(diff / 60000));
        return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    }
    if (diff < 24 * 3600000) {
        const hours = Math.round(diff / 3600000);
        return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    }
    return new Date(ms).toLocaleString();
}

function caseRowHTML(title, subtitle, actions, muted) {
    return `<div class="saveItem${muted ? ' saveItem--muted' : ''}">
        <div class="saveItemText">
            <div class="saveItemName">${title}</div>
            <div class="saveItemWhen">${subtitle}</div>
        </div>
        <div class="saveItemActions">${actions}</div>
    </div>`;
}

function caseButtonHTML(label, attr, value, danger) {
    return `<button type="button" class="saveAction${danger ? ' saveAction--danger' : ''}"` +
        ` ${attr}="${caseEscape(value)}">${label}</button>`;
}

function namedSavesHTML() {
    const saves = readNamedSaves();
    const names = Object.keys(saves).sort(function (a, b) {
        return (saves[b].savedAt || 0) - (saves[a].savedAt || 0);
    });

    if (!names.length) return '<div class="saveEmpty">No saved marrows yet.</div>';

    return names.map(function (name) {
        return caseRowHTML(
            caseEscape(name),
            'Saved ' + caseWhen(saves[name].savedAt),
            caseButtonHTML('Load', 'data-load', name) + caseButtonHTML('Delete', 'data-delete', name, true));
    }).join('');
}

function draftsHTML() {
    const drafts = readDrafts();
    if (!drafts.length) return '<div class="saveEmpty">No drafts.</div>';

    return drafts.map(function (draft) {
        const mine = draft.id === caseId;
        const name = draft.record.name
            ? caseEscape(draft.record.name)
            : '<span class="saveItemUnnamed">Unnamed marrow</span>';

        /* This window's own draft is shown but not offered: loading it would
           replace the worksheet with what the worksheet already is, and
           discarding it is what New Marrow is for. Naming it is the point —
           it tells you which row NOT to touch when a second window has one too. */
        const actions = mine
            ? '<span class="saveItemHere">This window</span>'
            : caseButtonHTML('Load', 'data-loaddraft', draft.id)
              + caseButtonHTML('Discard', 'data-discarddraft', draft.id, true);

        const live = !mine && beatIsLive(draft.id) ? ' &middot; open in another window' : '';

        return caseRowHTML(name, 'Autosaved ' + caseWhen(draft.record.savedAt) + live, actions, mine);
    }).join('');
}

/* The line under the name box. Three states, no commentary: the name is in the
   box directly above it, so naming it again here was the same word twice. */
function saveStatusText() {
    if (draftFailed) return 'Autosave failed — browser storage is full.';
    if (!draftSavedAt) return 'Not yet autosaved.';
    return 'Autosaved ' + caseWhen(draftSavedAt) + '.';
}

function savePageBody() {
    return document.querySelector('#savePanel .panelBody');
}

function renderSavePage() {
    const body = savePageBody();
    if (!body) return;

    /* This re-renders on every autosave, so a half-typed name must survive it —
       but ONLY while it is being typed. Keyed on focus rather than on which
       caller asked for the render: a box nobody is in should show the name this
       window is working under, and after a Save or a Load that name has just
       changed. Anything else leaves the box showing what you typed before you
       loaded something else. */
    const typed = document.getElementById('caseSaveName');
    const editing = !!typed && document.activeElement === typed;
    const pending = editing ? { value: typed.value, start: typed.selectionStart, end: typed.selectionEnd } : null;

    body.innerHTML = `
        <div class="fieldBlock">
            <div class="fieldLabel">Save this marrow</div>
            <div class="saveNameRow">
                <input type="text" class="textBox saveNameInput noSave" id="caseSaveName"
                       spellcheck="false" autocomplete="off" placeholder="Name this marrow"
                       value="${caseEscape(caseName)}">
                <button type="button" class="saveButton saveNameButton" id="caseSaveButton">Save</button>
            </div>
            <div class="saveStatus">${saveStatusText()}</div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Saved marrows</div>
            <div class="saveList">${namedSavesHTML()}</div>
        </div>

        ${/* No standing explanation of what a draft is. The rows say it: each
              carries its own timestamp, this window's is marked, and one open
              elsewhere says so. */''}
        <div class="fieldBlock">
            <div class="fieldLabel">Autosaved drafts</div>
            <div class="saveList">${draftsHTML()}</div>
        </div>`;

    // The caret too, not just the text: the rebuild happens mid-word, and a
    // caret snapped to the end is the same defect as a lost word.
    if (pending) {
        const box = document.getElementById('caseSaveName');
        box.value = pending.value;
        box.focus();
        box.setSelectionRange(pending.start, pending.end);
    }
}


/* ----------------------------------------------------------------------------
   Wiring
-------------------------------------------------------------------------- */

/* Delegated from the panel, which outlives every re-render of its body. */
document.getElementById('savePanel')?.addEventListener('click', function (e) {
    const button = e.target.closest('button');
    if (!button) return;

    if (button.id === 'caseSaveButton') {
        saveCaseAs(document.getElementById('caseSaveName')?.value);
    } else if (button.dataset.load !== undefined) {
        loadCaseNamed(button.dataset.load);
    } else if (button.dataset.delete !== undefined) {
        deleteCaseNamed(button.dataset.delete);
    } else if (button.dataset.loaddraft !== undefined) {
        loadDraft(button.dataset.loaddraft);
    } else if (button.dataset.discarddraft !== undefined) {
        discardDraft(button.dataset.discarddraft);
    }
});

document.getElementById('savePanel')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'caseSaveName') {
        e.preventDefault();
        saveCaseAs(e.target.value);
    }
});

/* Opening the page re-reads storage, so a draft another window wrote a moment
   ago is on the list rather than one render behind it. */
document.getElementById('saveTab')?.addEventListener('click', renderSavePage);

/* Ctrl+S / Cmd+S saves under the current name, or opens the Save page to ask for
   one. The browser's own "save page as" is not a thing anyone wants here, hence
   the preventDefault. */
document.addEventListener('keydown', function (e) {
    if (e.key !== 's' || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    e.preventDefault();

    if (caseName) { saveCaseAs(caseName); return; }
    document.getElementById('saveTab')?.click();
    document.getElementById('caseSaveName')?.focus();
});

/* Document-level, not #inputPanel: the report comment is edited in the RIGHT
   panel, and a counter rebind in the settings transliterates the tapes. Both are
   case changes that an #inputPanel listener would never hear.

   The Save page is the one place excluded, and only because typing a name there
   is not a change to the case: without this, every keystroke in the name box
   would write an identical draft and re-render the page under its own caret. */
function queueAutosaveFor(e) {
    if (e.target && e.target.closest && e.target.closest('#savePanel')) return;
    queueAutosave();
}

document.addEventListener('change', queueAutosaveFor);
document.addEventListener('input', queueAutosaveFor);

/* Flush and stand down on the way out. The beat is cleared LAST and deliberately
   — it is what tells the next page load that this one is gone, so a reload keeps
   its case and a duplicate forks off it. `pageshow` puts it back for a page
   restored from the back/forward cache, which never fired a load. */
function caseOnHide() {
    flushAutosave();
    clearBeat();
}

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushAutosave();
});
window.addEventListener('pagehide', caseOnHide);
window.addEventListener('beforeunload', caseOnHide);
window.addEventListener('pageshow', function (e) { if (e.persisted) writeBeat(); });


/* ----------------------------------------------------------------------------
   Bootstrap

   setTimeout(0) off DOMContentLoaded, which is the only ordering that is
   guaranteed to be last: listeners fire in the order they were added, and this
   file loads EARLY so that tabs can register with it. buildReportSections() and
   the counters' final render() are both DOMContentLoaded listeners added after
   ours would have been, and a restore has to happen after both.
-------------------------------------------------------------------------- */

function caseBootstrap() {
    pruneDrafts();

    // The empty worksheet, before anything is restored into it. Everything the
    // "is this case blank" test knows.
    casePristine = JSON.stringify(marrowCaptureCase());

    const inherited = readSessionCaseId();
    const draft = inherited ? caseReadJSON(draftKeyFor(inherited)) : null;

    /* RESTORE FIRST, DECIDE THE IDENTITY AFTER. What is on screen is the same
       either way — a duplicated tab shows what the tab it came from was showing —
       so there is no reason to make the user watch a handshake before they can
       see their case. `caseClaiming` holds the draft writes back until the
       question is settled, which is well inside the autosave debounce anyway. */
    if (draft && draft.data) {
        caseName = draft.name || '';
        if (marrowRestoreCase(draft.data)) {
            draftSavedAt = draft.savedAt || 0;
            showAlert('success', caseName
                ? 'Restored your in-progress "' + caseName + '"'
                : 'Restored your in-progress marrow');
        }
    }

    if (!inherited) {
        adoptCaseId(mintCaseId(), false);
        return;
    }

    caseClaiming = true;
    claimCaseId(inherited, function (keep) {
        caseClaiming = false;
        adoptCaseId(keep ? inherited : mintCaseId(), !keep);
    });
}

/* Take an id, start beating on it, and — for a fork — write the draft
   immediately, so the two windows show up as two rows rather than one. */
function adoptCaseId(id, forked) {
    caseId = id;
    writeSessionCaseId(caseId);

    if (forked) draftSavedAt = 0;
    if (forked || draftPending) flushAutosave();

    writeBeat();
    setInterval(writeBeat, DRAFT_BEAT_MS);
    renderSavePage();
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(caseBootstrap, 0);
});
