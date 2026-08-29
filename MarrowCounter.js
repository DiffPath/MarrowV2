/* ============================================================================
   MarrowCounter.js — the differential counter engine.

   A shared library: it declares no cell data, mounts nothing on its own, knows
   no blood-specific id, and registers no report section. One instance per
   specimen — createCounter(bloodCounterConfig) today, an aspirate instance
   later with its own cell list, pooled rows and M:E ratio.

   THE MODEL: the textarea IS the tally. Each keystroke appends one character;
   counts are recomputed by scanning that string. Nothing is incremented, so
   backspace, paste, select-and-delete and Ctrl+Z are all undo for free.

   Two orthogonal ideas that the previous app conflated (../Marrow/MarrowData.js
   `character` / `cellType`):

     keymap  — key char -> cell id.  WHICH cell a keystroke means.
     layout  — 2D array of key chars. WHERE a key sits on the pad.

   A cell whose key is absent from `layout` is "off-pad": it has no tile, but it
   still counts when typed, and its tone marks it as off-pad. That is a cell on
   `.` under 'Numbers only' — a key the alphabet has and this layout does not
   show.

   `defaultKey` IS OPTIONAL, and a cell without one is unbound: no tile, and no
   keystroke either, until it is put on a key in the settings. Both counters
   declare fifteen cells against an alphabet of thirteen keys, so "every cell has
   a key" was never something this engine could promise. What it promises is that
   THE PAD IS THE TRUTH — everything countable is on it or one layout away, and
   nothing counts invisibly. The old app's `character: -1` broke that from the
   other side, leaving Plasma/Atypical/Other on screen and uncountable with no way
   to fix it; here every cell is offered on every tile in the settings.

   The pad is a READOUT, not a control. Counting is keyboard-only: tiles are not
   clickable, because a mis-aimed click is a silent miscount and the hand is on
   the keyboard with the eye at the scope regardless.

   counterKeymap() and counterLayout() are the seam the settings read through,
   and render() is the one entry point that re-reads them. Everything else here
   is written against the two of them and is indifferent to where they get
   their answer.
   ========================================================================= */


/* The default pads. 5 rows x 3 columns, null = a gap. Shaped like a real
   numeric keypad, which is the whole point: the hand already knows where the
   keys are. Ported from ../Marrow/Marrow.js:3931. */
const counterLayoutPresets = {
    'Numbers only':       [[null, null, null], ['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], [null, '0', null]],
    'Numbers and period': [[null, null, null], ['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], [null, '0', '.']],
    'Expanded':           [[null, '/', '*'],   ['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], [null, '0', '.']]
};

/* Tile geometry. Lives here rather than in CSS because the pad's grid tracks
   and gap are set inline from it, and the column count is user-configurable
   later — one source of truth beats two that can drift.

   KEY_HEIGHT is what makes the side rail line up: the rail is a second grid
   built from the SAME row template as the pad, so "Current count" and its
   number sit on the pad's rows rather than near them. Rows are explicit (not
   content-sized) precisely so a second grid can reproduce them. */
/* Compact. KEY_WIDTH is measured to hold the widest label whole against the
   tile's cap/gap/percent budget — re-measure before trimming further, since past
   this the name ellipsises. See .key in Template.css for the matching internal
   padding/cap/percent widths: border 2 + padding 14 + cap 18 + two 6px gaps + a
   42px percent = 88px of fixed furniture, leaving 61px for the name.

   The widest label is "Pros/blasts" (59.4px), measured in the page rather than
   estimated; it took the pad from 140 to 149 when the blast-equivalent cells were
   added, and "Promyelo" (50.7px) is no longer the one that sets it. */
const KEY_WIDTH = 149;
const KEY_HEIGHT = 32;
const KEY_GAP = 5;

/* Keys the tape must keep working as a text field. Everything not here and not
   in the keymap is refused at keydown. */
const COUNTER_EDIT_KEYS = new Set([
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'Tab', 'PageUp', 'PageDown'
]);


/* ----------------------------------------------------------------------------
   Sound

   All of it exists for one posture: eye at the scope, hand on the keyboard,
   screen out of view. Everything the counter has to say while you are down the
   barrel, it says here.

   THE NUMBER OF NOTES IS THE MESSAGE — one per keystroke, and you never need
   pitch discrimination to read it:

     1 note   a cell was counted. Its PITCH is the tile's row (bottom lowest,
              top highest), so it also says where your finger landed.
     2 notes  that cell crossed a hundred.
     3 notes  that cell finished the count.

   Pitch carries the same split. Cells sound in the click ladder's octave (C4
   up to ~Eb5 at five rows); the two progress figures sit ABOVE it, from G5, so
   they can never be mistaken for a row. Below the pad, on the pad, above the
   pad — off-pad keys, cells, and progress, in that order.

   The milestone is the completion left unfinished: a rising fifth (G5-D6) that
   the completion resolves to the octave (G5-D6-G6). Hence 2 notes vs 3 rather
   than two unrelated jingles — "keep going" is literally "done" without the
   last note.

   The progress figures ADD to the click rather than replace it, delayed just
   past its 35ms so they read as "tick, ding-ding" and not as a chord. Every
   counted keystroke keeps its row confirmation; a milestone is extra news, not
   a hole where the confirmation was.
-------------------------------------------------------------------------- */

const COUNTER_TONE_BASE = 262;   // C4 — the off-pad tone; rows climb from here
const COUNTER_TONE_STEP = 3;     // semitones per row. A minor third: far enough
                                 // apart to tell two rows apart in a 35ms blip.
const COUNTER_TONE_MS = 35;
const COUNTER_TONE_GAIN = 0.15;

const COUNTER_MILESTONE_EVERY = 100;

const COUNTER_CHIME_BASE = 784;         // G5 — clear above the ladder's ceiling
const COUNTER_CHIME_MILESTONE = [0, 7]; // a fifth, left open: keep going
const COUNTER_CHIME_COMPLETE = [0, 7, 12];  // resolved to the octave: done
const COUNTER_CHIME_MS = 70;            // longer than a click: news, not a tick
const COUNTER_CHIME_ONSET_MS = 85;      // note spacing — a hair of silence between
const COUNTER_CHIME_GAIN = 0.10;        // under the click's: these notes are high,
                                        // and high reads louder at equal amplitude
const COUNTER_CHIME_DELAY_MS = 40;      // just past the click, which is 35ms

/* COUNT SPEED — the cells/min readout in the rail. The rate is counted over
   keystroke INTERVALS, so scanning between fields is inside it and the first
   cell of a session is not; a pause longer than the cap is a break (a
   conversation, a new slide), not slow counting, and charges only the cap. */
const COUNTER_SPEED_GAP_MS = 15000;     // longest inter-cell gap still "counting"
const COUNTER_SPEED_MIN_CELLS = 5;      // intervals before a rate is worth stating

/* THE CLASSIC SCHEME — the previous app's six recorded clicks, offered beside
   the synthesized figures above rather than replacing them. One page-wide
   choice, not per instance: the two counters are one sound system, and the
   comment on counterAudio() already says so.

   The samples live base64-embedded in MarrowCounterSounds.js (fetch() of a
   local mp3 is refused on file://, and hotlinking them like the old app did is
   an outbound request from a screen with patient data). That file is OPTIONAL:
   a template that does not load it never offers the scheme, and every playback
   path falls back to the synthesized sound — a chosen scheme whose decode has
   not landed yet must still confirm the keystroke somehow. */
const COUNTER_SOUND_SCHEMES = ['Classic clicks', 'Chimes'];
const COUNTER_SOUND_DEFAULT = 'Classic clicks';

/* Keyed by the KEY PRESSED, exactly as the old app had it (countNoise,
   ../Marrow/Marrow.js:1093): the top numpad rows are high, the middle med, the
   bottom low, and 0/. — the blast keys in the default bindings — carry the
   blast click. The fallback to 'low' for a key not named here is kept even
   though the alphabet is now exactly these thirteen: every counted keystroke
   gets a confirmation, and that must not depend on two lists agreeing. */
const COUNTER_SAMPLE_FOR_KEY = {
    '7': 'high', '8': 'high', '9': 'high', '/': 'high', '*': 'high',
    '4': 'med', '5': 'med', '6': 'med',
    '1': 'low', '2': 'low', '3': 'low',
    '0': 'blast', '.': 'blast'
};

function counterHasSamples() {
    return typeof COUNTER_SAMPLES_B64 !== 'undefined';
}

/* The chosen scheme, read off the chips like counterLayoutName() and for the
   same reason (a radio's getSetting is a bool that cannot name a scheme).
   Where the control does not exist the DEFAULT scheme answers — which the
   samples guard above still bounds: a template that never loaded the samples
   file synthesizes regardless of what the default says. */
function counterClassicSound() {
    if (!counterHasSamples()) return false;
    const chip = document.querySelector('input[name="counterSound"]:checked');
    return (chip ? chip.value : COUNTER_SOUND_DEFAULT) === 'Classic clicks';
}

/* name -> AudioBuffer, decoded once per page. Decode is requested lazily (on
   the first classic playback, and primed at DOMContentLoaded for a saved
   preference) rather than at load: most sessions never choose the scheme, and
   decodeAudioData works fine on a still-suspended context when they do. */
const counterSampleBuffers = {};
let counterSamplesRequested = false;

function counterLoadSamples() {
    if (counterSamplesRequested || !counterHasSamples()) return;
    counterSamplesRequested = true;

    try {
        const ctx = counterAudio();
        if (!ctx) return;

        Object.keys(COUNTER_SAMPLES_B64).forEach(function (name) {
            const raw = atob(COUNTER_SAMPLES_B64[name]);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

            ctx.decodeAudioData(bytes.buffer)
                .then(function (buffer) { counterSampleBuffers[name] = buffer; })
                .catch(function () { /* one bad sample loses one sound, not the pad */ });
        });
    } catch (e) {
        // As everywhere in this section: silence, never a thrown keystroke.
    }
}

/* Play one sample. Returns whether it did, so every caller can fall back to
   its synthesized sound while the decode is still in flight. */
function counterSample(name) {
    try {
        counterLoadSamples();

        const ctx = counterAudio();
        const buffer = ctx && counterSampleBuffers[name];
        if (!buffer) return false;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        return true;
    } catch (e) {
        return false;
    }
}

/* A saved preference must not spend its first keystroke on the synth fallback,
   so the decode is primed once the restored controls can answer for the
   scheme. Module scope, not the factory: the samples are page-wide, and two
   instances priming twice is only harmless because of the guard. */
document.addEventListener('DOMContentLoaded', function () {
    if (counterClassicSound()) counterLoadSamples();
});

/* THE FIRST-CLICK DELAY, and where it actually comes from. A context built
   before a user gesture (the prime above builds one at load) starts SUSPENDED,
   and resume() is asynchronous: called from the first counted keystroke, that
   keystroke's sound is scheduled against a clock that has not started moving
   yet and lands audibly late — once. Every later keystroke finds the context
   running.

   So the context is resumed on the FIRST gesture anywhere on the page — at
   the latest, the click that puts the caret in the tape — and the resume is
   long done by the time a cell can be counted.

   THE KEEPALIVE, and why a one-shot warm-up was not enough. Resuming early
   fixed only the context's own clock; the delay survived it, because the
   layer below sleeps too — the OS audio endpoint (HDMI and Bluetooth paths
   especially) powers down after silence and wakes with latency on the next
   sound, so the first click after any quiet stretch pays it again. The cure
   is the previous app's, imported deliberately: an oscillator at gain
   0.00001 (about -100 dB, inaudible) started once and NEVER stopped, so the
   output stream never goes silent and the hardware never sleeps. Do not
   "optimize" it into digital silence (gain 0) — exact zeros are what let the
   endpoint sleep; the epsilon is the fix.

   NOT `{ once: true }`, though it reads like the tool for the job: a listener
   consumed by an event carrying no user activation — a synthetic event from
   an extension or a script — would burn the one shot without unblocking
   anything, and the real first gesture would then find nobody listening. So
   the listeners stay until a resume() actually LANDS (its promise is left
   pending by the browser until a qualifying gesture arrives, and resolves on
   it), and only then start the keepalive and unhook. counterAudio() keeps its
   own resume() as the backstop for anything that suspends the context later. */
let counterWarmed = false;

function counterWarmAudio() {
    if (counterWarmed) return;
    try {
        const ctx = counterAudio();
        if (!ctx) return;

        ctx.resume().then(function () {
            if (counterWarmed) return;
            counterWarmed = true;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain).connect(ctx.destination);
            osc.start();

            document.removeEventListener('pointerdown', counterWarmAudio, true);
            document.removeEventListener('keydown', counterWarmAudio, true);
        }).catch(function () { /* stay hooked; a later gesture may do better */ });
    } catch (e) {
        // Warm-up is a nicety twice over.
    }
}
document.addEventListener('pointerdown', counterWarmAudio, true);
document.addEventListener('keydown', counterWarmAudio, true);

/* One AudioContext for the page, built on the first counted keystroke. Lazy
   because a context constructed before a user gesture starts suspended; shared
   across instances because the browser's per-page context budget is small and
   the aspirate counter is a second instance, not a second sound system.

   Returns null rather than throwing when the browser has no AudioContext at
   all — see the note on counterTone(). */
let counterAudioCtx = null;

function counterAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;

    if (!counterAudioCtx) counterAudioCtx = new Ctor();
    if (counterAudioCtx.state === 'suspended') counterAudioCtx.resume();
    return counterAudioCtx;
}

/* One note: ~2ms attack, fast exponential decay. The single thing all three
   sounds are built from, so they cannot drift into different envelopes.

   `wave` is the third axis the figures differ on, after note count and register:
   cells are a triangle, progress is a sine. A triangle at 1.5kHz (the
   completion's top note) would put harmonics somewhere shrill; a sine has none
   to put. */
function counterNote(ctx, wave, freq, at, ms, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = wave;
    osc.frequency.value = freq;

    // exponentialRamp cannot reach or leave zero, hence the near-silent
    // endpoints rather than 0 — a literal 0 here throws.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + ms / 1000 + 0.005);
}

/* A blip, not a beep: done before the next keystroke can plausibly arrive.

   Guarded and wrapped because sound is a nicety and counting is not: a browser
   without AudioContext, or one that refuses to resume it, must lose the tone
   and nothing else. An exception here would take the keystroke down with it.
   The same is true of every function below. */
function counterTone(step, key) {
    try {
        // The classic scheme sounds by KEY, the synth by ROW — each keeps its
        // own logic whole rather than translating one into the other.
        if (counterClassicSound()
            && counterSample(COUNTER_SAMPLE_FOR_KEY[key] || 'low')) return;

        const ctx = counterAudio();
        if (!ctx) return;

        counterNote(ctx, 'triangle', COUNTER_TONE_BASE * Math.pow(2, step * COUNTER_TONE_STEP / 12),
                    ctx.currentTime, COUNTER_TONE_MS, COUNTER_TONE_GAIN);
    } catch (e) {
        // Silence is a fine outcome; a thrown keystroke is not.
    }
}

/* A figure of `steps` semitones above the chime base, played in sequence. */
function counterChime(steps) {
    try {
        const ctx = counterAudio();
        if (!ctx) return;

        const start = ctx.currentTime + COUNTER_CHIME_DELAY_MS / 1000;
        steps.forEach(function (semitones, i) {
            counterNote(ctx, 'sine', COUNTER_CHIME_BASE * Math.pow(2, semitones / 12),
                        start + i * COUNTER_CHIME_ONSET_MS / 1000, COUNTER_CHIME_MS, COUNTER_CHIME_GAIN);
        });
    } catch (e) {
        // As above.
    }
}

/* What a change in the count has to say, if anything. Sounded on the
   DENOMINATOR — the number in the rail, the one the target is measured against
   — so an NRBC, which is reported per 100 WBC and counts toward no total,
   correctly moves nothing along.

   Reading the rules off the count rather than off the keystroke is what makes
   every path agree: paste and select-and-retype land here too, and a paste that
   clears two hundreds at once is still one crossing, not two.

   Completion outranks the milestone at a target that is itself a multiple of
   100 (200, 500, 1000 — most of them), and milestones stop once the target is
   behind you: past the desired count there is nothing left to be partway to. */
function counterProgress(before, after, target) {
    if (after <= before) return;        // backspace and undo announce nothing

    // The classic scheme swaps only the SOUNDS ('complete', 'hundred' — the old
    // app's names for the same two events); which event fired, and when, is
    // this function's crossing logic either way.
    if (before < target && after >= target) {
        if (counterClassicSound() && counterSample('complete')) return;
        counterChime(COUNTER_CHIME_COMPLETE);
    } else if (after < target
               && Math.floor(after / COUNTER_MILESTONE_EVERY) > Math.floor(before / COUNTER_MILESTONE_EVERY)) {
        if (counterClassicSound() && counterSample('hundred')) return;
        counterChime(COUNTER_CHIME_MILESTONE);
    }
}


/* ----------------------------------------------------------------------------
   Settings seam — everything that reads a user preference.

   The two settings stay as orthogonal as the ideas they configure: WHICH cell a
   key means is one setting per cell, WHERE the keys sit is one setting per
   counter. Neither reads the other, so a rebind cannot move a tile and a layout
   change cannot rebind anything.

   These read the CONTROLS (through getSetting), never localStorage, which is
   getSetting's stated contract (MarrowSettings.js:65). So an edit is live on
   the pad the moment it is made, and Save decides only whether it outlives the
   session. It also means a page with no settings panel — another template, a
   counter whose block never rendered — falls back to the config's defaults and
   works unchanged.
-------------------------------------------------------------------------- */

/* THE ALPHABET, and it is the whole of it: every key any layout preset can show,
   and nothing else. A key outside this list cannot be bound, cannot be typed
   into a count, and has no control in the settings.

   It used to be this list PLUS any letter a cell claimed by default (P/A/O/M/B),
   which made those cells countable from the keyboard while showing nothing on
   the pad — a key you had to already know about. Taken out at the author's
   instruction: a differential is counted on the numpad, and a keystroke that
   silently lands in a row you cannot see is worse than one that does nothing.

   WHAT REPLACED IT is `defaultKey` being OPTIONAL (see counterKeymap). A cell
   without one starts unbound and stays unbound until someone puts it on a key in
   the settings, where every cell is offered on every tile. So the blast
   equivalents and the atypical/other rows are opt-in rather than hidden — the
   pad always shows exactly what can be counted. */
const COUNTER_PAD_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '/', '*'];

/* '.', '/' and '*' cannot go in an element id raw: the id is what the setting is
   stored under and what getElementById asks for, and they are CSS selector
   syntax the moment anything reaches for #pbCell_* instead. Digits and letters
   are their own slug. */
const COUNTER_KEY_SLUGS = { '.': 'dot', '/': 'slash', '*': 'star' };

function counterCellSettingId(config, key) {
    return config.id + 'Cell_' + (COUNTER_KEY_SLUGS[key] || key);
}

function counterLayoutSettingId(config, name) {
    return config.id + 'Layout_' + name.replace(/\s+/g, '');
}

/* cell id -> the key holding it: a keymap read backwards. Linear, but over 13
   entries and only on a settings change or a re-render. */
function counterKeyFor(map, cellId) {
    return Object.keys(map).find(function (key) { return map[key] === cellId; });
}

/* The cell a key means by DEFAULT — each cell's defaultKey, read backwards.
   '' for a key no cell claims: the presets lay out a real numpad, so 'Expanded'
   offers '/', '*' and '.' that nothing binds until you say so, and the cells
   with no defaultKey at all leave more of them free than they used to. */
function counterDefaultCell(config, key) {
    const cell = config.cells.find(function (c) { return c.defaultKey === key; });
    return cell ? cell.id : '';
}

/* key char -> cell id. One setting per KEY, which is the keymap's own shape —
   the settings pad is a picture of this object, so storing it the other way up
   (a key per cell) would mean translating in both directions and would leave the
   numpad with nothing to hang each select on.

   An INJECTION, not a bijection, and the difference is the whole of the
   `defaultKey`-is-optional rule. No two cells share a key and no cell holds two —
   but a cell may hold NONE. The settings UI swaps rather than overwrites so it
   cannot hand us a collision, though a blob saved against an older cell list can,
   and reading that literally would put one cell on two keys; the second claim is
   dropped.

   A CELL WITH A `defaultKey` IS STILL GUARANTEED ONE: it falls back to its
   default and then to the first free key in the alphabet, never to nothing. That
   is the old app's `character: -1` failure staying fixed for every cell that is
   meant to be on the pad.

   A CELL WITHOUT ONE IS DELIBERATELY UNBOUND and is left that way — it is not
   handed a spare key, because being on the pad is exactly what it is opting out
   of. Both counters declare more cells than the alphabet has keys (fifteen
   against thirteen), so "every cell gets a key" was never something the engine
   could promise anyway; what it promises now is that every cell you can COUNT is
   a cell you can SEE, and the rest are one click away in the settings. */
function counterKeymap(config) {
    const known = {};
    config.cells.forEach(function (cell) { known[cell.id] = true; });

    const map = {};
    const held = {};                              // cell id -> its key

    COUNTER_PAD_KEYS.forEach(function (key) {
        const cellId = getSetting(counterCellSettingId(config, key), counterDefaultCell(config, key));
        // Empty (a free key), unknown (a cell since renamed), or already placed
        // (a stale blob naming one cell twice): the KEY goes free rather than
        // the cell going double.
        if (!cellId || !known[cellId] || held[cellId]) return;
        map[key] = cellId;
        held[cellId] = key;
    });

    config.cells.forEach(function (cell) {
        // No default, or one outside the alphabet: opt-in only. The alphabet is
        // authoritative, so a config cannot reintroduce a letter key by declaring
        // one — it would simply never be typeable.
        if (held[cell.id] || COUNTER_PAD_KEYS.indexOf(cell.defaultKey) === -1) return;

        const key = map[cell.defaultKey] === undefined
            ? cell.defaultKey
            : COUNTER_PAD_KEYS.find(function (k) { return map[k] === undefined; });

        if (key === undefined) return;   // alphabet exhausted: more cells than keys
        map[key] = cell.id;
        held[cell.id] = key;
    });

    return map;
}

/* The chosen preset's name. Read off the chips rather than through getSetting,
   which returns a radio's `checked` — a bool that cannot name a preset. Same
   shape as currentTemplateType() in MarrowSpec.js, for the same reason. */
function counterLayoutName(config) {
    const chip = document.querySelector('input[name="' + config.id + 'Layout"]:checked');
    return chip ? chip.value : config.defaultLayout;
}

/* 2D array of key chars (null = gap). Falls back rather than returning
   undefined: a preset renamed out from under a saved setting must cost the user
   their layout, not their counter. */
function counterLayout(config) {
    return counterLayoutPresets[counterLayoutName(config)]
        || counterLayoutPresets[config.defaultLayout]
        || counterLayoutPresets['Numbers only'];
}



/* ----------------------------------------------------------------------------
   Percent math
-------------------------------------------------------------------------- */

/* Round each cell's share to the grid implied by `target` (500 cells -> 0.2%
   steps) and force the denominator cells to sum to exactly 100.0%.

   Largest-remainder (Hare), NOT the original's force-sum loop
   (../Marrow/Marrow.js:1151-1189), which divided by each cell's count (so any
   zero-count cell produced Infinity), seeded minIndex at -1 (so table[-1]
   threw if nothing qualified), and looped on an accumulating float compare (so
   it could spin forever). This is one pass, cannot divide by zero, and is
   guaranteed to hit the target exactly.

   Cells outside the denominator (circulating NRBCs) are quantized on the same
   grid but sit outside the sum constraint — their value is a per-100-WBC ratio,
   not a share of anything. */
function counterAllocate(cells, tally, denominator, target) {
    const alloc = {};
    if (denominator <= 0) return alloc;

    const remainders = [];
    let assigned = 0;

    cells.forEach(function (cell) {
        const ideal = (tally[cell.id] || 0) * target / denominator;

        if (!cell.inDenom) {
            alloc[cell.id] = Math.round(ideal);
            return;
        }

        alloc[cell.id] = Math.floor(ideal);
        assigned += alloc[cell.id];
        remainders.push({ id: cell.id, fraction: ideal - Math.floor(ideal) });
    });

    // Hand the leftover units to the largest fractional parts, one each.
    remainders.sort(function (a, b) { return b.fraction - a.fraction; });
    for (let i = 0; i < target - assigned && i < remainders.length; i++) {
        alloc[remainders[i].id] += 1;
    }

    return alloc;
}


/* ----------------------------------------------------------------------------
   The report-side table's styles — THE OLD APP'S, byte for byte
   (../Marrow/BoneMarrow.html:773-846): a 440px fixed-layout table over
   220/75/145 columns, 10pt, black hairline borders, everything left-aligned
   off a 5px pad. INLINE for the same reason as MarrowReport.js's Word styles —
   a stylesheet does not survive the clipboard, and this table must land in
   Epic/Word looking exactly as it does on screen.
-------------------------------------------------------------------------- */
const COUNTER_TABLE_STYLE = 'width:440px; font-size:10pt; border-collapse: collapse; table-layout: fixed;';
const COUNTER_TABLE_COLS = '<colgroup><col style="width:220px;"><col style="width:75px;"><col style="width:145px;"></colgroup>';
const COUNTER_TH_STYLE = 'border: 1px solid black; text-align: left; padding-left: 5px;';
const COUNTER_TD_STYLE = 'border: 1px solid black; padding-left: 5px;';


/* ----------------------------------------------------------------------------
   The factory
-------------------------------------------------------------------------- */
function createCounter(config) {

    /* All instance state lives in this closure — never a module global, never
       the DOM. The keypad is safe to hold refs to (it lives in #inputPanel,
       which fillReport() never touches); anything in #<id>DiffDiv is not,
       since its innerHTML is replaced on every keystroke. See the same rule
       in MarrowCBC.js:61. */
    let keymap = counterKeymap(config);
    let layout = counterLayout(config);
    let tally = {};             // cell id -> count, derived from the tape
    let keyEls = {};            // cell id -> { pctEls } patch targets
    let toneSteps = {};         // key char -> tone step; rebuilt with the layout
    let tape = null;

    // The denominator as of the last refresh(), which is the only thing here
    // that is remembered rather than derived — a crossing is a comparison, and
    // the tape can only say where the count IS, never where it just was.
    // Maintained by refresh() rather than by the keystroke path, so that
    // everything which changes the count without being a keystroke (reset(), a
    // rebind, a rebuilt pad) resyncs it silently instead of sounding.
    let counted = 0;

    // `counted`'s sibling for EVERY counted cell rather than the denominator —
    // an NRBC keystroke is real counting work even where it moves no target.
    // Same contract: maintained by refresh(), snapshotted by the input handler.
    let countedTotal = 0;

    // The speed clock. Advanced only from the input path, for the same reason
    // the chime is sounded only from there: reset(), a rebind and a rebuilt
    // pad all move the count without anyone having counted a cell, and none
    // of them may move the clock. speedCells counts completed keystroke
    // INTERVALS (the first cell of a session opens one and closes none), so
    // cells and elapsed time always pair off exactly.
    let speedCells = 0;         // completed intervals
    let speedActiveMs = 0;      // time inside them, gaps capped
    let speedLastMs = null;     // when the last counted keystroke landed

    const byId = {};
    config.cells.forEach(function (cell) { byId[cell.id] = cell; });

    /* MUTUALLY EXCLUSIVE CELLS — two ways of counting one thing, of which a
       differential uses one. Blasts counted apart from promonocytes, or the two
       counted together as one Pros/blasts bucket: a table carrying both rows says
       the same cells twice and reads as a contradiction.

       Declared on ONE of the pair (`excludes: ['blast']`) and read both ways, so
       neither cell has to name the other back. It is a REPORT-ROW rule and
       nothing more — no keystroke is refused, no key is unbound and no count is
       ever hidden from the tape, because the engine's one promise is that what
       you counted is what it holds. Suppression is conditional on the row being
       EMPTY (see supersededRow), so a case that somehow counted both prints both
       rather than silently printing neither. */
    const exclusions = {};
    config.cells.forEach(function (cell) {
        (cell.excludes || []).forEach(function (other) {
            (exclusions[cell.id] = exclusions[cell.id] || []).push(other);
            (exclusions[other] = exclusions[other] || []).push(cell.id);
        });
    });

    /* Pools are report rows, not cells, so they get their own lookup and never
       enter byId — a pool has no key, no tile and no tone, and the day one shows
       up in the keymap is the day the pad tries to count "Neutrophils &
       Precursors" as a thirteenth cell. `pools` is optional; blood has none. */
    const byPool = {};
    (config.pools || []).forEach(function (pool) { byPool[pool.id] = pool; });

    const el = function (suffix) { return document.getElementById(config.id + suffix); };

    /* Where the pad mounts. Named by the config rather than derived from the id,
       because the pad no longer owns its whole tab: the Blood tab puts a form
       beneath it, and draw() replaces its mount's innerHTML wholesale. The ids
       INSIDE the pad still come from config.id — only the hole it fills is the
       host's to choose, the same split as settingsPanelId. */
    const mount = function () { return document.getElementById(config.panelId); };


    /* ------------------------------------------------------------------------
       Read
    --------------------------------------------------------------------- */

    /* The whole string, every time. No incremental bookkeeping: at a 1000-cell
       target this is a 1000-character scan, and it is what makes backspace,
       paste and Ctrl+Z all work with no extra code. Do not "optimize" this. */
    function readTape() {
        const counts = {};
        config.cells.forEach(function (cell) { counts[cell.id] = 0; });

        const text = tape ? tape.value : '';
        for (let i = 0; i < text.length; i++) {
            const id = keymap[text[i]];
            if (id !== undefined) counts[id] += 1;   // unmapped chars ignored
        }
        return counts;
    }

    function currentTarget() {
        const select = el('Target');
        return parseInt(select ? select.value : config.defaultTarget, 10) || config.defaultTarget;
    }

    /* The M:E ratio, from the ALLOCATED PERCENTAGES — the same numbers the table
       prints, and the original's basis too (../Marrow/Marrow.js:1204-1218).

       Only computed when config.meRatio says this specimen has one — blood does
       not: a peripheral smear's nucleated red cells are an escapee count, not a
       compartment to take a ratio against.

       It reads each cell's `lineage`, which already classifies every cell
       correctly and was filled in truthfully on blood precisely so this could
       exist (see bloodCells). That field IS the old app's cellType 1/2/3/5 split
       — 1 and 2 are both `myeloid` here, because the only thing that
       distinguished them was which report row they land on, which is now `pools`.

       Blasts count toward myeloid only if the caller says so; `includeBlasts` is
       a callback because the control that decides it is the aspirate tab's, and
       this file may not know a Marrow id.

       PERCENTS, NOT RAW COUNTS, and the distinction is the whole point of the
       row. The ratio prints in the same table as the percentages it is a ratio
       OF, three lines under them, so a reader checks one against the other:
       "Neutrophils & Precursors 66.0%, Erythroid Precursors 34.0% — so about
       1.9." From raw counts that same case prints 2.0:1, which is arithmetically
       the better number and contradicts the table it sits in. A report has to
       agree with itself; a decimal of precision nobody can verify is worth
       nothing beside that.

       The two answers differ only where the allocation rounds, and rarely at one
       decimal place — so this costs almost no accuracy and buys consistency
       every time. */
    function meSums(percents) {
        let myeloid = 0, erythroid = 0;
        const withBlasts = !!(config.meRatio.includeBlasts && config.meRatio.includeBlasts());

        config.cells.forEach(function (cell) {
            const pct = percents[cell.id];
            if (pct === null) return;      // no denominator yet
            if (cell.lineage === 'erythroid') erythroid += pct;
            else if (cell.lineage === 'myeloid' || (cell.lineage === 'blast' && withBlasts)) myeloid += pct;
        });

        // No erythroid precursors is not a ratio of zero, it is no ratio at all.
        const value = erythroid > 0 ? Math.round(myeloid / erythroid * 10) / 10 : null;
        return { myeloid: myeloid, erythroid: erythroid, value: value };
    }

    /* Everything the keypad and the table need, computed once per change. */
    function stats() {
        let denominator = 0;
        let total = 0;

        config.cells.forEach(function (cell) {
            const n = tally[cell.id] || 0;
            total += n;
            if (cell.inDenom) denominator += n;
        });

        const target = currentTarget();
        const alloc = counterAllocate(config.cells, tally, denominator, target);

        const percents = {};
        config.cells.forEach(function (cell) {
            percents[cell.id] = denominator > 0
                ? (alloc[cell.id] || 0) * 100 / target
                : null;
        });

        // meSums() reads the percents, so they have to exist first — the ratio is
        // derived from the allocation rather than computed alongside it.
        return {
            total: total,
            denominator: denominator,
            percents: percents,
            target: target,
            complete: denominator >= target,
            me: config.meRatio ? meSums(percents) : null
        };
    }

    /* A pool is a report ROW, never a cell: the four myeloid maturation stages
       are counted separately on the pad (you press 7 for a metamyelocyte) and
       reported as one line, "Neutrophils & Precursors". The original expressed
       this by giving four cells the same tableCellID, which is why its table and
       its keypad could not be read apart.

       Summing the ALLOCATED percents rather than re-deriving from counts is what
       keeps the Total row at exactly 100.0%: the largest-remainder allocation is
       the thing that sums, so a pool has to be a sum of its output, not a
       parallel computation of its own. */
    function poolPercent(pool, s) {
        return pool.cells.reduce(function (sum, id) {
            const pct = s.percents[id];
            return pct === null ? sum : sum + pct;
        }, 0);
    }

    function poolCount(pool) {
        return pool.cells.reduce(function (sum, id) { return sum + (tally[id] || 0); }, 0);
    }


    /* ------------------------------------------------------------------------
       Draw — the pad's markup. Called by render() and by nothing else: it draws
       whatever `keymap` and `layout` currently say, and render() is what makes
       those say the truth. refresh() patches text in place in between.
    --------------------------------------------------------------------- */

    /* A <div>, not a <button>: the tile is a readout and nothing about it may
       promise a click. Its opening percent is a real "0.0%" rather than a dash
       — an uncounted cell IS zero percent, and a dash makes you decide whether
       the pad has started working. Muted, not absent. */
    function keyTileHTML(key) {
        if (!hasTile(key)) return '<div class="keyBlank"></div>';

        const cell = byId[keymap[key]];

        return `<div class="key">
            <span class="keyCap">${key}</span>
            <span class="keyName">${cell.label}</span>
            <span class="keyPct isZero" data-pct="${cell.id}">${formatValue(cell, 0)}</span>
        </div>`;
    }

    /* Does this layout slot render a tile? A slot is blank when it is a declared
       gap (null) OR when its key binds to no cell — the presets lay out a real
       numpad, so 'Expanded' offers '/' '*' '.' that no blood cell claims. Both
       cases draw a .keyBlank, and everything that reasons about the pad's shape
       must agree on that, hence one predicate rather than three near-copies. */
    function hasTile(key) {
        return key !== null && byId[keymap[key]] !== undefined;
    }

    /* Does this layout slot exist at all? The settings pad's predicate, and the
       weaker half of hasTile(): a slot with no cell on it still gets an EDITOR,
       or there would be no way to put a cell there — which is the whole point of
       choosing 'Expanded'. So the two pads legitimately differ on exactly one
       thing: an unbound slot is an empty tile in the settings and no tile on the
       counter. Nothing to count is not the same as nothing to assign. */
    function hasSlot(key) {
        return key !== null;
    }

    /* The row template every grid here is built from — the counter pad, the rail
       beside it, and the settings pad. A row with no present slots collapses to
       0 ('Numbers only' opens with one, standing in for the numpad's / and *
       row); every other row is exactly one tile tall.

       Takes the predicate rather than assuming one, because the three grids do
       not agree on what makes a row real: the pad and its rail collapse a row
       with nothing to count (hasTile), the settings pad keeps a row you can
       still assign into (hasSlot). Passing it in is what stops that difference
       from becoming two copies of this function that drift. */
    function rowTemplate(present) {
        return layout.map(function (row) {
            return row.some(present) ? KEY_HEIGHT + 'px' : '0px';
        }).join(' ');
    }

    /* key char -> tone step. Only rows that render tiles get one: a collapsed
       row must not consume a pitch, or 'Numbers only' would spend its highest
       tone on a row that is not on screen and the ladder would stop matching
       what the eye sees. Bottom row is 1, climbing to the top; 0 is left for
       off-pad keys, which counterTone() renders as the lowest tone of all. */
    function buildToneSteps() {
        const rows = layout.filter(function (row) { return row.some(hasTile); });
        const steps = {};

        rows.forEach(function (row, i) {
            row.forEach(function (key) {
                if (hasTile(key)) steps[key] = rows.length - i;
            });
        });
        return steps;
    }

    function draw() {
        const panel = mount();
        if (!panel) return;

        // Case data the rebuild must not eat. This is not a once-per-load
        // affair — every settings change comes back through here — and a
        // rebound key may cost neither the count nor the chosen target. The
        // tape is transliterated by render() BEFORE this runs, off the outgoing
        // keymap; all this does is carry the result across the innerHTML below,
        // which would otherwise re-create both controls empty.
        const text = tape ? tape.value : '';
        const target = el('Target') ? el('Target').value : String(config.defaultTarget);

        const columns = Math.max.apply(null, layout.map(function (row) { return row.length; }));
        const padHTML = layout.map(function (row) {
            return row.map(keyTileHTML).join('');
        }).join('');

        const targetHTML = config.targetOptions.map(function (n) {
            return `<option value="${n}"${n === config.defaultTarget ? ' selected' : ''}>${n}</option>`;
        }).join('');

        // The rail is two lines — label then value, each on one of the pad's
        // rows — and they start at the first row that RENDERS. Not row 1:
        // 'Numbers only' opens with an all-null row that collapses to 0px, and
        // a line in a 0px row is a line you cannot read. Derived rather than
        // hard-coded to 2, so binding a cell to '/' under 'Expanded' brings the
        // top row to life and the rail rises to stay level with it.
        const rows = rowTemplate(hasTile);
        const firstRailRow = Math.max(1, layout.findIndex(function (row) { return row.some(hasTile); }) + 1);
        const railCell = function (line, column) {
            return `grid-row: ${firstRailRow + line}; grid-column: ${column}`;
        };

        toneSteps = buildToneSteps();

        // The pad and its side rail sit as one centered row; the tape spans the
        // full panel width below them. Both grids' tracks are inline from the
        // layout data rather than CSS, since the column count is
        // user-configurable later.
        panel.innerHTML = `
            <div class="counterWrap">
                <div class="counterMain">
                    <div class="keypad" id="${config.id}Keypad"
                         style="grid-template-columns: repeat(${columns}, ${KEY_WIDTH}px); grid-template-rows: ${rows}; gap: ${KEY_GAP}px">
                        ${padHTML}
                    </div>
                    <div class="counterSide" style="grid-template-rows: ${rows}; row-gap: ${KEY_GAP}px">
                        <span class="counterStatLabel" style="${railCell(0, 1)}">Current count</span>
                        <span class="counterCount" id="${config.id}Count" style="${railCell(0, 2)}">0</span>
                        <label class="counterStatLabel" for="${config.id}Target" style="${railCell(1, 1)}">Desired count</label>
                        <select class="counterTarget" id="${config.id}Target" style="${railCell(1, 2)}">${targetHTML}</select>
                        ${/* A third line, only where there IS a ratio. It wears
                              .counterCount because it IS one — a readout in the
                              rail's number column, which must start at the same x
                              as the two above it, and that class is where the
                              shared box model lives. Never an input, unlike the
                              original's <input id="meRatio">, which looked like
                              one and was not. Every preset has five rows and the
                              rail starts at the first that renders, so line 2
                              always has a row to sit on. */
                          config.meRatio ? `
                        <span class="counterStatLabel" style="${railCell(2, 1)}">M:E ratio</span>
                        <span class="counterCount" id="${config.id}Me" style="${railCell(2, 2)}">N/A</span>` : ''}
                        ${(function () {
                            /* The speed line sits under whatever the rail
                               already shows — the M:E ratio where there is
                               one, the desired count where there is not.
                               Seeded from speedText() rather than "N/A"
                               because a render mid-count (a rebind, the
                               DOMContentLoaded re-render) carries the tape
                               and target across, and must carry the reading
                               with them. */
                            const line = config.meRatio ? 3 : 2;
                            return `
                        <span class="counterStatLabel" style="${railCell(line, 1)}">Count speed</span>
                        <span class="counterCount" id="${config.id}Speed" style="${railCell(line, 2)}">${speedText()}</span>`;
                        })()}
                    </div>
                </div>

                <textarea class="textBox" id="${config.id}Tape" rows="2" placeholder="Count here"
                          spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
            </div>`;

        tape = el('Tape');
        tape.value = text;

        const targetSelect = el('Target');
        if (targetSelect) targetSelect.value = target;

        cacheKeyEls();
        bindPanelContents();
        refresh();
    }

    function cacheKeyEls() {
        keyEls = {};
        const panel = mount();
        if (!panel) return;

        config.cells.forEach(function (cell) {
            keyEls[cell.id] = {
                pctEls: panel.querySelectorAll('[data-pct="' + cell.id + '"]')
            };
        });
    }


    /* ------------------------------------------------------------------------
       Settings block

       Rendered into whatever panel the config names, so the engine still knows
       no Marrow id. One block per instance, APPENDED: the aspirate's block
       lands beside this one in the same panel with no coordination between the
       two beyond sharing a Save button.

       THE EDITOR IS THE PAD. Same geometry, same row template, same tile — the
       percent swapped for a <select> of which cell that key means. So it is
       laid out by KEY, exactly like the thing it edits and exactly like the
       keymap it writes: position is the key (fixed by the layout), and the one
       editable thing is the cell sitting on it. The alternative — a list of
       cells each picking a key — puts the tile you are editing somewhere other
       than where it lives, and makes it hop across the screen as you edit it.

       The frame is built once; renderPadEditor() rebuilds the two pads from
       render(), so a layout change lands on the settings and the counter in the
       same breath. Listeners are delegated from the frame, which survives that.
    --------------------------------------------------------------------- */

    /* One editable tile: the counter's tile with its label turned into a picker.

       "—" is a READOUT of a free key, never a command: disabled, so it can be
       shown (and set programmatically, which is how a vacated key renders) but
       never chosen. Unbinding a cell would make it uncountable, and there is no
       way to express that here because there is no such state to express. */
    function keyEditHTML(key) {
        if (!hasSlot(key)) return '<div class="keyBlank"></div>';

        const current = keymap[key] || '';
        const options = config.cells.map(function (cell) {
            return `<option value="${cell.id}"${cell.id === current ? ' selected' : ''}>${cell.label}</option>`;
        }).join('');

        return `<div class="keyEdit${current ? '' : ' isEmpty'}">
            <span class="keyCap">${key}</span>
            <select class="keyCell setting" id="${counterCellSettingId(config, key)}" data-key="${key}">
                <option value="" disabled${current ? '' : ' selected'}>—</option>${options}
            </select>
        </div>`;
    }

    /* Chips, not a <select>: three options one click deep. Its own markup
       rather than MarrowSpec.js's chipHTML() — the engine is a shared library
       and does not reach into a tab file for a helper (and .form, which that
       one adds, would be a lie here: these are settings, not report inputs). */
    function layoutChipHTML(name) {
        const id = counterLayoutSettingId(config, name);
        return `<input type="radio" class="chipInput layoutChip setting" id="${id}" name="${config.id}Layout" value="${name}"${name === config.defaultLayout ? ' checked' : ''}><label class="chip" for="${id}">${name}</label>`;
    }

    /* The PAD ALPHABET's keys that this layout does not show — `.`, `/` and `*`
       under 'Numbers only', nothing at all under 'Expanded'. Derived from the
       LAYOUT alone, never from what is bound, so which keys are editable does
       not shift as cells are moved around.

       This row used to carry the LETTER keys as well (P/A/O/M/B), which was a
       row of controls for a pad you are not looking at. It now means one thing:
       "the keys the OTHER layouts would give you". */
    function offPadKeys() {
        const onPad = new Set();
        layout.forEach(function (row) { row.forEach(function (key) { if (key !== null) onPad.add(key); }); });

        return COUNTER_PAD_KEYS.filter(function (key) { return !onPad.has(key); });
    }

    /* Rebuilt on every render(), so the layout chips move keys between the pad
       and the off-pad row in front of you, and a swap shows up on both tiles.

       Seeded from `keymap` rather than from the controls it is replacing, which
       is what makes it self-healing: whatever counterKeymap() resolved is what
       you see, so a stale saved blob is corrected on screen rather than left to
       disagree with the counter. */
    function renderPadEditor() {
        const pad = el('PadEditor');
        const off = el('OffPad');
        if (!pad || !off) return;

        // A native select does not survive its own element being replaced, and
        // the one you just used is the one you are most likely to use again.
        const active = document.activeElement;
        const focusKey = active && active.classList.contains('keyCell') ? active.dataset.key : null;

        const columns = Math.max.apply(null, layout.map(function (row) { return row.length; }));

        pad.style.gridTemplateColumns = `repeat(${columns}, ${KEY_WIDTH}px)`;
        pad.style.gridTemplateRows = rowTemplate(hasSlot);
        pad.style.gap = KEY_GAP + 'px';
        pad.innerHTML = layout.map(function (row) { return row.map(keyEditHTML).join(''); }).join('');

        /* 'Expanded' puts every assignable key on the pad, so there is now a
           layout under which nothing is off it — a state that could not arise
           while the letters were in this row. An empty grid under a heading
           reads as a block that failed to load, so the whole block goes. */
        const spare = offPadKeys();
        const offBlock = el('OffPadBlock');
        if (offBlock) offBlock.style.display = spare.length ? '' : 'none';

        off.style.gridTemplateColumns = `repeat(auto-fill, ${KEY_WIDTH}px)`;
        off.style.gridAutoRows = KEY_HEIGHT + 'px';
        off.style.gap = KEY_GAP + 'px';
        off.innerHTML = spare.map(keyEditHTML).join('');

        if (focusKey) document.getElementById(counterCellSettingId(config, focusKey))?.focus();
    }

    /* Note the pads are built HERE and not left to render(): the .setting
       controls have to exist before applySettings() can restore anything into
       them, and render() runs after that (MarrowBlood.js's bootstrap). The
       initial layout is whatever the config defaults to, which is why the pad
       and the off-pad row must together cover the ASSIGNABLE alphabet
       (COUNTER_PAD_KEYS) whichever layout is showing — a key with no control is
       a key applySettings() cannot restore, and a cell saved onto it would be
       silently lost on the way back in.

       The LETTER keys are outside that alphabet by design and get no control
       anywhere (see offPadKeys). That is not the trap above: nothing can be
       saved onto a key with no control, so there is nothing to lose on the way
       back in, and counterKeymap() resolves them to their default cell every
       time. Fixed, not forgotten. */
    /* The sound scheme's chips. Rendered ONCE, guarded like the Save button and
       for the same reason: the choice is page-wide (one sound system), so the
       first instance to render settings puts the block at the top of the shared
       panel and the second finds it there. Only offered where the samples file
       loaded — a scheme that can never play is not a choice.

       Change is bound here (the block is created once and never rebuilt, so no
       stacking) only to prime the decode: nothing re-renders on a scheme
       change, because the scheme is read per sound, not per draw. */
    function renderSoundSettings(panel) {
        if (!counterHasSamples() || document.getElementById('counterSoundSettings')) return;

        const chips = COUNTER_SOUND_SCHEMES.map(function (name) {
            const id = 'counterSound_' + name.replace(/\s+/g, '');
            return `<input type="radio" class="chipInput setting" id="${id}" name="counterSound" value="${name}"${name === COUNTER_SOUND_DEFAULT ? ' checked' : ''}><label class="chip" for="${id}">${name}</label>`;
        }).join('');

        panel.insertAdjacentHTML('beforeend', `
            <div class="counterSettings" id="counterSoundSettings">
                <div class="counterSettingsTitle">Counter sound</div>
                <div class="fieldBlock">
                    <div class="chipRow"><span class="chipGroup">${chips}</span></div>
                </div>
            </div>`);

        document.getElementById('counterSoundSettings').addEventListener('change', function () {
            if (counterClassicSound()) counterLoadSamples();
        });
    }

    function renderSettings() {
        const panel = document.getElementById(config.settingsPanelId);
        if (!panel) return;

        renderSoundSettings(panel);

        const chips = Object.keys(counterLayoutPresets).map(layoutChipHTML).join('');

        panel.insertAdjacentHTML('beforeend', `
            <div class="counterSettings" id="${config.id}Settings">
                <div class="counterSettingsTitle">${config.settingsLabel}</div>

                <div class="fieldBlock">
                    <div class="fieldLabel">Keypad</div>
                    ${/* One segmented control, not three loose pills: the three
                          layouts are alternatives and a .chipGroup is how this
                          template says so. Settings are chips like anything else
                          — the rule keys on the group being exclusive, not on
                          which panel it sits in. */''}
                    <div class="chipRow"><span class="chipGroup">${chips}</span></div>
                </div>

                <div class="fieldBlock">
                    <div class="fieldLabel">Key bindings</div>
                    <div class="keypad" id="${config.id}PadEditor"></div>
                </div>

                <div class="fieldBlock" id="${config.id}OffPadBlock">
                    <div class="fieldLabel">Off pad</div>
                    <div class="counterOffPad" id="${config.id}OffPad"></div>
                </div>

                <button type="button" class="counterReset" id="${config.id}SettingsReset">Restore defaults</button>
            </div>`);

        renderPadEditor();
        settingsPanelSave(panel);
        bindSettingContents();
    }

    /* Delegated from the frame, which renderPadEditor() never replaces — so
       these bind once and survive every rebuild of the tiles beneath them. The
       same rule as the collapse handler below, for the same reason. */
    function bindSettingContents() {
        const block = el('Settings');
        if (!block) return;

        block.addEventListener('change', function (e) {
            if (e.target.classList.contains('keyCell')) {
                displace(e.target.dataset.key, e.target.value);
                render();
            } else if (e.target.classList.contains('layoutChip')) {
                render();
            }
        });

        block.addEventListener('click', function (e) {
            if (e.target.closest('.counterReset')) restoreDefaults();
        });
    }

    /* Putting a cell on a key SWAPS: the cell that held that key inherits the
       one the newcomer just gave up (or goes free, if the newcomer came from a
       key nothing else wants). The alternatives are worse in both directions —
       refuse the change and the pad argues with you; let it through and a cell
       falls off the keymap, which is the one thing this engine will not do.

       Only ever moves the OTHER select: the one the user just set is already
       what they asked for. `keymap` is still the OUTGOING binding at this point
       (render() is what replaces it), which is exactly why it can say where the
       newcomer is arriving from and who it is displacing. */
    function displace(key, cellId) {
        const previous = counterKeyFor(keymap, cellId);
        if (previous === undefined || previous === key) return;

        const select = document.getElementById(counterCellSettingId(config, previous));
        if (select) select.value = keymap[key] || '';
    }

    /* The way back from a scrambled pad. Reverts the CONTROLS only — Save still
       decides whether that reversion is permanent, same as every other edit
       here. */
    function restoreDefaults() {
        COUNTER_PAD_KEYS.forEach(function (key) {
            const select = document.getElementById(counterCellSettingId(config, key));
            if (select) select.value = counterDefaultCell(config, key);
        });

        const chip = document.getElementById(counterLayoutSettingId(config, config.defaultLayout));
        if (chip) chip.checked = true;

        render();
    }


    /* ------------------------------------------------------------------------
       Patch — runs on every keystroke, so it touches text nodes only. Never
       re-render the keypad here: that would drop :active mid-press and thrash
       the DOM a few hundred times per count.
    --------------------------------------------------------------------- */

    function setText(nodes, text, isZero) {
        nodes.forEach(function (node) {
            if (node.textContent !== text) node.textContent = text;
            node.classList.toggle('isZero', isZero);
        });
    }

    /* Takes the stats rather than calling stats() itself, for the same reason
       rowHTML() does: each one is an allocation plus a sort, and refresh()
       already needs the denominator out of it. */
    function patchKeypad(s) {
        config.cells.forEach(function (cell) {
            const refs = keyEls[cell.id];
            if (!refs) return;

            const n = tally[cell.id] || 0;
            const pct = s.percents[cell.id];

            // A null pct means an empty denominator, which is 0.0% on the pad
            // just the same — the tile always shows a number. `isZero` still
            // mutes it, so the eye lands on the cells that have counts.
            setText(refs.pctEls, formatValue(cell, pct === null ? 0 : pct), n === 0);
        });

        // Target reached is signaled on the count number itself — there is no
        // progress bar, by choice: nothing between keystroke and screen.
        const count = el('Count');
        if (count) {
            count.textContent = String(s.denominator);
            count.classList.toggle('done', s.complete);
        }

        // Patched here rather than redrawn, for the same reason as the count:
        // draw() is for when the pad's SHAPE changes, and a keystroke does not
        // change it. Absent on blood, hence the guard rather than an assumption.
        const me = el('Me');
        if (me) me.textContent = meText(s);

        // Speed likewise; speedRecord() repaints again AFTER advancing the
        // clock, since this runs inside refresh() and therefore before it.
        const sp = el('Speed');
        if (sp) sp.textContent = speedText();
    }

    /* NRBCs render bare ("25.0", a per-100-WBC ratio); everything else takes a
       "%". `suffix` is explicit per cell rather than derived from inDenom: on
       the aspirate, NRBCs count in the denominator AND take a %, so deriving it
       would rebuild the old cellType conflation. */
    function formatValue(cell, pct) {
        return pct.toFixed(1) + cell.suffix;
    }


    /* ------------------------------------------------------------------------
       Report table
    --------------------------------------------------------------------- */

    /* The Reference column.

       A range of zero prints as a bare "0", not "0 - 0%": the cell is simply not
       present in normal blood, and a zero-width range read as an interval is
       just noise. Bare because zero is zero in every unit — which is also what
       keeps a "%" off the NRBC row, whose value is a per-100-WBC ratio and not a
       share of anything.

       `null` is NOT a synonym for that, and must not become one. It means no
       reference is known, and prints nothing. The distinction is the aspirate's:
       most of the cells that are absent from blood have real ranges in marrow
       (blasts, the maturing myeloid series, erythroid precursors), so a config
       has to be able to say "should be none" and "we have not said" as two
       different things — the same reason `suffix` is explicit rather than
       derived from `inDenom`. */
    function rangeText(cell) {
        if (!cell.range) return '';
        if (cell.range[0] === 0 && cell.range[1] === 0) return '0';
        return `${cell.range[0]} - ${cell.range[1]}%`;
    }

    /* One row, from anything that has a label, a value and a range. Takes the
       precomputed stats rather than calling stats() itself: it runs once per row,
       and each stats() is an allocation plus a sort. */
    function dataRow(label, value, range) {
        return `<tr>
            <td style="${COUNTER_TD_STYLE}">${label}</td>
            <td style="${COUNTER_TD_STYLE}">${value}</td>
            <td style="${COUNTER_TD_STYLE}">${range}</td>
        </tr>`;
    }

    /* An empty row whose exclusive partner was counted instead. The emptiness is
       half the test on purpose: a row with counts of its own is always printed,
       whatever else was counted, because the alternative is a differential that
       drops cells to keep itself tidy. */
    function supersededRow(cell) {
        if ((tally[cell.id] || 0) > 0) return false;
        return (exclusions[cell.id] || []).some(function (id) { return (tally[id] || 0) > 0; });
    }

    function rowHTML(cell, s) {
        const n = tally[cell.id] || 0;
        if (cell.hideWhenZero && n === 0) return '';
        if (supersededRow(cell)) return '';

        const pct = s.percents[cell.id];
        return dataRow(cell.reportLabel, pct === null ? '—' : formatValue(cell, pct), rangeText(cell));
    }

    /* A pooled row takes its members' suffix from the first of them: they are
       one line because they are the same kind of thing, so they cannot disagree
       about it. */
    function poolRowHTML(pool, s) {
        const n = poolCount(pool);
        if (pool.hideWhenZero && n === 0) return '';

        const value = s.denominator > 0
            ? formatValue(byId[pool.cells[0]], poolPercent(pool, s))
            : '—';
        return dataRow(pool.reportLabel, value, rangeText(pool));
    }

    /* The M:E row prints "3.2:1" and a bare "1.5 - 3.3": the ratio is a ratio in
       both columns, so a "%" on its reference would be a unit it does not have.
       Hence its own formatting rather than rangeText()'s. */
    function meRowHTML(s) {
        const cfg = config.meRatio;
        const range = cfg.range ? `${cfg.range[0]} - ${cfg.range[1]}` : '';
        return dataRow(cfg.label || 'M:E ratio', meText(s), range);
    }

    /* "N/A", not "0:1" or a blank: with no erythroid precursors counted there is
       no ratio to state, and saying so is an answer. The original's word. */
    function meText(s) {
        return s.me && s.me.value !== null ? s.me.value.toFixed(1) + ':1' : 'N/A';
    }

    /* The speed clock's one advance. Gated on the delta being exactly +1 —
       the signature of a counted keystroke (one character per cell) — so a
       paste, a retyped selection and a backspace all leave the clock alone;
       the time a correction takes is still charged, folded into the next
       cell's interval under the same cap as any other gap. */
    function speedRecord(beforeTotal, afterTotal) {
        if (afterTotal - beforeTotal === 1) {
            const now = Date.now();
            if (speedLastMs !== null) {
                speedActiveMs += Math.min(now - speedLastMs, COUNTER_SPEED_GAP_MS);
                speedCells += 1;
            }
            speedLastMs = now;
        }
        const sp = el('Speed');
        if (sp) sp.textContent = speedText();
    }

    /* "N/A" until the rate has enough intervals behind it to mean something —
       a number read off two clicks is noise wearing units. */
    function speedText() {
        if (speedCells < COUNTER_SPEED_MIN_CELLS || !speedActiveMs) return 'N/A';
        return Math.round(speedCells / (speedActiveMs / 60000)) + '/min';
    }

    /* A string, or a function returning one. The aspirate's caption is not fixed
       — counting on touch preparations renames the specimen, and the caption is
       report output, so it has to say which one was actually counted. Same seam
       as meRatio.includeBlasts: the engine asks, the tab answers, and no Marrow
       id crosses the line. */
    function tableCaption() {
        return typeof config.tableCaption === 'function' ? config.tableCaption() : config.tableCaption;
    }

    /* THE OLD APP'S TABLE, on screen and on the clipboard alike: caption cell
       carrying the target ("Peripheral Blood (200 cells)"), Result, Reference
       Range, then the rows, with the M:E ratio last where there is one — all
       inline-styled (see the COUNTER_TABLE_* constants above). The trailing
       <br> is the original's too, and is the blank line between the table and
       whatever follows it in a copied report. No Total row and no collapse
       control, matching the original: a screen-only control inside report
       markup would be one more thing a copy has to strip. */
    function fillTable() {
        tally = readTape();
        const s = stats();
        if (s.total === 0) return '';

        // rowOrder names cells and pools alike — they are both just report rows,
        // and which one an id is is this file's business rather than the config's.
        const rows = config.rowOrder.map(function (id) {
            if (byPool[id]) return poolRowHTML(byPool[id], s);
            return byId[id] ? rowHTML(byId[id], s) : '';
        }).join('');

        return `<table style="${COUNTER_TABLE_STYLE}">
            ${COUNTER_TABLE_COLS}
            <tr>
                <th style="${COUNTER_TH_STYLE}">${tableCaption()} (${s.target} cells)</th>
                <th style="${COUNTER_TH_STYLE}">Result</th>
                <th style="${COUNTER_TH_STYLE}">Reference Range</th>
            </tr>
            ${rows}
            ${config.meRatio ? meRowHTML(s) : ''}
        </table><br>`;
    }


    /* ------------------------------------------------------------------------
       Events
    --------------------------------------------------------------------- */

    /* Returns the stats it had to compute anyway, so the one caller that needs
       the new count (the input handler, to sound a crossing) does not pay for a
       second pass. Also the single place `counted` is maintained. */
    function refresh() {
        tally = readTape();

        const s = stats();
        counted = s.denominator;
        countedTotal = s.total;

        patchKeypad(s);
        fillReport();
        return s;
    }

    /* Strip anything unbound. Only on paste: the normal typing path is already
       filtered at keydown, and rewriting .value there would fight the caret. */
    function sanitizeTape() {
        const clean = tape.value.split('').filter(function (ch) {
            return keymap[ch] !== undefined;
        }).join('');

        if (clean !== tape.value) {
            tape.value = clean;
            tape.setSelectionRange(clean.length, clean.length);
        }
    }

    /* Listeners on elements INSIDE the panel. Safe to re-bind on every render:
       innerHTML replacement destroys the old elements and their listeners with
       them. Anything bound to a container that SURVIVES a render (the panel
       itself, #rightPanelFinal, #inputTabBar) must be bound once, in the
       factory body below — re-binding those would stack duplicate handlers and
       make one click count twice. */
    function bindPanelContents() {
        tape.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;      // Ctrl+Z / A / C / V
            if (COUNTER_EDIT_KEYS.has(e.key)) return;
            // A held key must not spam counts. Replaces the old app's
            // window.keypressed[e.which] bookkeeping map with one line.
            if (e.repeat) { e.preventDefault(); return; }

            if (e.key.length === 1 && keymap[e.key] !== undefined) {
                // Sounded from keydown, not `input`: this is the earliest the
                // keystroke is known to be a cell, and the tone has to land
                // with the key rather than behind the re-read of the tape.
                // Off-pad keys fall through to step 0 — the tone below the pad.
                counterTone(toneSteps[e.key] || 0, e.key);
                return;
            }

            // Everything else, including Enter and Space: they count as nothing
            // but would corrupt the tape's one-character-per-cell meaning.
            e.preventDefault();
        });

        /* The only path where the count moves because the user moved it, which
           is why the crossings are sounded from here and not from refresh():
           reset(), a rebind and a rebuilt pad all run through refresh() too,
           and none of them is a hundred cells earned.

           Sounded from `input` rather than from keydown like the click, because
           unlike the click this cannot be predicted from the keystroke: a
           selection being retyped removes cells as it adds one, and a paste
           lands hundreds at once. The tape after the fact is the only honest
           answer, and 3ms of lateness is nothing to a chime that follows the
           click by design anyway. */
        tape.addEventListener('input', function (e) {
            if (e.inputType && e.inputType.indexOf('insertFromPaste') === 0) sanitizeTape();

            const before = counted;
            const beforeTotal = countedTotal;
            const s = refresh();
            counterProgress(before, s.denominator, s.target);
            speedRecord(beforeTotal, s.total);
        });

        // Own listener rather than class="form": a target change must patch the
        // keypad too, not just refill the report. One code path.
        el('Target')?.addEventListener('change', refresh);
    }

    /* ------------------------------------------------------------------------
       Listeners on containers that OUTLIVE a render — bound once, here, never
       from draw(). #<id>Panel survives its own innerHTML being replaced, so
       binding these from draw() would stack a second handler on every
       rebuild and fire each of them twice per event.
    --------------------------------------------------------------------- */

    /* Focus the tape when its tab is opened. Delegated from the static
       #inputTabBar; Template.js binds the tab switcher itself from a
       script-scope querySelectorAll snapshot, which this does not disturb. */
    document.getElementById('inputTabBar')?.addEventListener('click', function (e) {
        if (e.target.closest('#' + config.id + 'Tab')) el('Tape')?.focus();
    });


    /* ------------------------------------------------------------------------
       Public API
    --------------------------------------------------------------------- */

    /* Rewrite the tape so a remap can never silently reinterpret an existing
       count: the tape stores key characters verbatim (type 7, see 7), so 200
       cells counted under the old bindings would otherwise re-read as whatever
       the new ones say. Two-phase through a private-use sentinel, because the
       common case IS a swap (4 <-> 7) and a naive pass would turn every 4 into
       a 7 and then every 7 back into a 4.

       Transliteration only. It does not touch keymap/layout and does not
       re-render — render() owns the order those have to happen in. */
    function rekeyTape(oldToNew) {
        if (!tape || !tape.value) return;

        const keys = Object.keys(oldToNew);
        let text = tape.value;

        keys.forEach(function (oldKey, i) {
            text = text.split(oldKey).join(String.fromCharCode(0xE000 + i));
        });
        keys.forEach(function (oldKey, i) {
            text = text.split(String.fromCharCode(0xE000 + i)).join(oldToNew[oldKey]);
        });

        tape.value = text;
    }

    /* Re-read the settings and rebuild the pad. THE way the pad is ever drawn —
       the initial mount and a settings change are the same operation, and that
       is deliberate: the seam is read HERE and nowhere else, so the pad cannot
       be drawn against bindings the settings do not agree with.

       That is not hypothetical. The closure's `keymap`/`layout` are seeded at
       createCounter() time, which is necessarily before the settings block has
       rendered and before applySettings() has restored anything into it — so a
       draw() that trusted them would show the DEFAULT pad to a user who had
       saved their own bindings, and go on doing it every session.

       The order below is the whole of the operation: diff the bindings while
       `keymap` still holds the outgoing ones, rewrite the tape against that
       diff, and only then adopt the new keymap and layout and draw. Adopt first
       and the diff has nothing left to compare against; draw first and the pad
       disagrees with the tape it is counting.

       Both pads are drawn from that one adopted pair, which is why changing the
       layout moves the counter's tiles and the settings' tiles together: they
       are not two views kept in sync, they are one render. */
    function render() {
        const next = counterKeymap(config);
        const oldToNew = {};

        Object.keys(keymap).forEach(function (oldKey) {
            const newKey = counterKeyFor(next, keymap[oldKey]);
            if (newKey && newKey !== oldKey) oldToNew[oldKey] = newKey;
        });

        rekeyTape(oldToNew);
        keymap = next;
        layout = counterLayout(config);
        draw();
        renderPadEditor();
    }

    function reset() {
        if (tape) tape.value = '';
        // A cleared count is a new counting session; the clock starts over
        // with it. refresh() then repaints the rail's "N/A".
        speedCells = 0;
        speedActiveMs = 0;
        speedLastMs = null;
        refresh();
    }

    /* THE LAST WORD ON THE PAD, after every tab has had its say.

       applySettings() writes storage into EVERY .setting control on the page,
       blindly, and each tab calls it at its own script scope (it has to — see
       the load-order trap in CLAUDE.md). So the SECOND counter's call re-writes
       the FIRST counter's stored bindings back over the healed ones its render()
       had just resolved into its editor. The pad stays right, because it was
       drawn from the healed map; the editor silently goes back to showing two
       keys on one cell and a third on nothing. That is exactly the "left
       disagreeing" state the heal exists to prevent, and it appeared the moment a
       second instance existed — nothing about it is the aspirate's.

       Re-rendering once here is the fix, and it belongs in the engine rather than
       in either tab: by DOMContentLoaded every tab's applySettings() has run, so
       this is the last write, and each instance re-reads the seam and re-heals.
       Correct for a third counter too, without that counter knowing this exists.
       A render is a redraw that carries the tape and target across, so the only
       cost is drawing the pad twice at load. */
    document.addEventListener('DOMContentLoaded', render);

    /* draw() and rekeyTape() are deliberately NOT exported. Each is half of
       render(), and each half alone is a way to desynchronize the pad from its
       settings or the tape from its keymap — the two failures render() exists
       to make impossible. There is one door. */
    return {
        render: render,
        renderSettings: renderSettings,
        refresh: refresh,
        fillTable: fillTable,
        counts: function () { return Object.assign({}, tally); },
        stats: stats,
        reset: reset,

        /* stats(), but having re-read the tape first — the accessor for anyone
           OUTSIDE this file.

           stats() deliberately does not re-read: its every in-file caller has
           just refreshed the tally and a second scan per keystroke is waste. An
           outside caller has no way to know that, and today only gets away with
           it because fillTable() happens to run before fillAsp() in the section
           registry. That is registration order holding a correctness property up,
           which is exactly the kind of thing that breaks silently when someone
           reorders two lines for unrelated reasons.

           `me.value` is rounded, because the DISPLAYED ratio is what decides a
           predominance — a 4.04 that reads "4.0" must not quietly count as above
           4:1 when the settings say 4. Same principle as computing it from the
           printed percentages in the first place: what the report shows is what
           the report means. */
        readStats: function () {
            tally = readTape();
            return stats();
        }
    };
}
