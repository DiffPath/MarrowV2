/* ============================================================================
   MarrowRef.js — the reference section: render, navigate, and the quick links.

   Content lives in MarrowRefData.js, which must load first. This file owns the
   #helpPanel — the page the book icon in the header opens — and the one API the
   input tabs use to point at it.

   ---------------------------------------------------------------------------
   THE LEFT PANEL STAYS PUT, AND THAT IS THE WHOLE DESIGN.

   #inputPanel is deliberately absent from Template.js's headerObject, so it is
   not owned by the pageTab group and never hides. Switching to the reference
   section therefore swaps the REPORT panel for the reference and leaves the form
   you were filling in exactly where it was. That is what makes a quick link
   worth having: clicking the book beside Reticulin puts the fibrosis grading
   next to the dropdown you are answering, not instead of it.

   ---------------------------------------------------------------------------
   TWO SCREENS, ONE PANEL.

   The index (every topic, grouped by section, filterable) and one topic. A
   nested sidebar was the obvious alternative and is wrong here: this panel is
   already one half of a two-panel layout, so a topic list down its left edge
   would spend a third of the remaining width on navigation that is only needed
   between reads. The bar at the top carries the back button, the title and the
   filter, and the body is all content.

   The filter box is live on both screens. Typing while reading a topic returns
   to the index, filtered — searching is how you leave a topic you are done with.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   State

   `refCurrent` is the topic id on screen, or null for the index. `refQuery` is
   the filter text, kept across the two screens so going back to the index does
   not silently widen the list you left.
-------------------------------------------------------------------------- */
let refCurrent = null;
let refQuery = '';


function refTopic(id) {
    return referenceTopics.find(function (t) { return t.id === id; });
}


/* ----------------------------------------------------------------------------
   Filtering

   Substring, case-insensitive, over the title and the keyword list — NOT over
   the body. Searching the body would be one line shorter and much worse: every
   criteria box names its neighbouring entities in its exclusion clause, so
   "polycythaemia" would match essential thrombocythaemia, both PMF stages and
   CML, and the filter would stop narrowing anything. `keywords` is where a topic
   declares what it should be findable BY, including the spellings its title does
   not use (MDS-RS, RARS-T, polycythemia with an e, teardrop for dacrocyte).
-------------------------------------------------------------------------- */
function refMatches(topic, query) {
    if (!query) return true;
    const hay = (topic.title + ' ' + (topic.keywords || []).join(' ')).toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every(function (word) {
        return hay.indexOf(word) !== -1;
    });
}


/* ----------------------------------------------------------------------------
   The index — a table of contents, not a gallery.

   It was a grid of cards carrying a one-line description each, and at
   twenty-six topics that is four screens of scrolling to find a page whose
   title you already know. Every entity here is a criteria page; the description
   said so twenty-six times in different words.

   So: section label, then single-line rows in as many columns as fit. The
   filter is what handles "I don't know its name", which is the only case a
   description was answering.
-------------------------------------------------------------------------- */

/* A topic whose clinical content has not been checked against a pasted source
   says so on the index as well as at its head. The index is where a reader
   decides what to trust before opening something, and a flag that only appears
   after you have read the criteria arrives too late. */
function refFlagChip(topic) {
    return topic.unverified ? `<span class="refFlagChip" title="Not verified against source">unverified</span>` : '';
}

function refIndexHTML() {
    const blocks = referenceSections.map(function (section) {
        const topics = referenceTopics.filter(function (t) {
            return t.section === section.id && refMatches(t, refQuery);
        });
        if (!topics.length) return '';
        const rows = topics.map(function (t) {
            return `<button type="button" class="refItem" data-ref="${t.id}">` +
                `${t.title}${refFlagChip(t)}</button>`;
        }).join('');
        return `<div class="refGroup">
            <div class="refGroupTitle">${section.label}</div>
            <div class="refItems">${rows}</div>
        </div>`;
    }).filter(Boolean).join('');

    if (!blocks) {
        return `<div class="refEmpty">Nothing matches &ldquo;${refQuery}&rdquo;.</div>`;
    }
    return blocks;
}


/* ----------------------------------------------------------------------------
   One topic
-------------------------------------------------------------------------- */

/* THE ONLY THING ABOVE THE CRITERIA, and only where it applies.

   There used to be a provenance line here as well — "docs/who/mds-lb.md —
   essential and desirable criteria verbatim" — on every page. It was true and it
   was never read: the reader wants the box, and where the box came from is a
   maintainer's question. It now lives as a `//` comment above each topic in
   MarrowRefData.js, which is where a maintainer is already looking.

   The unverified line stays because it is not provenance, it is a warning, and
   it governs everything under it. One line, no heading. */
function refUnverifiedHTML(topic) {
    if (!topic.unverified) return '';
    return `<div class="refUnverified">
        <i class="fas fa-exclamation-triangle"></i>
        <div>${topic.unverified}</div>
    </div>`;
}

function refRelatedHTML(topic) {
    const links = (topic.related || []).map(refTopic).filter(Boolean);
    if (!links.length) return '';
    return `<div class="refRelated">
        <div class="refRelatedLabel">See also</div>
        <div class="refRelatedLinks">${links.map(function (t) {
            return `<button type="button" class="refRelatedLink" data-ref="${t.id}">${t.title}</button>`;
        }).join('')}</div>
    </div>`;
}

/* Title, then the criteria. The section kicker is gone with the blurb — the bar
   above already says Reference, and "MYELOPROLIFERATIVE NEOPLASMS" over
   "Polycythaemia vera" told a reader who opened polycythaemia vera nothing. */
function refTopicHTML(topic) {
    return `<article class="refDoc">
        <h2 class="refDocTitle">${topic.title}</h2>
        ${refUnverifiedHTML(topic)}
        <div class="refDocBody">${topic.body()}</div>
        ${refRelatedHTML(topic)}
    </article>`;
}


/* ----------------------------------------------------------------------------
   Render

   THE FILTER INPUT IS BUILT ONCE AND NEVER REBUILT, and that is the only subtle
   thing in this file. Its left neighbour changes with the screen — "Reference"
   on the index, an "All topics" button inside a topic — so the obvious shape is
   to redraw the whole bar. Doing that replaces the input the keystroke came
   from, which detaches the element mid-keystroke: focus goes, and refocusing the
   replacement puts the caret at position 0, so typing "jak2" while a topic was
   open produced "ak2j".

   Rebuilding only when the screen changed does not fix it either — leaving a
   topic IS a screen change, and it is triggered by the first keystroke. So the
   bar is split: #refBarLead is redrawn freely, and the filter is a permanent
   sibling that nothing here ever touches.
-------------------------------------------------------------------------- */
function refBarLeadHTML() {
    return refCurrent
        ? `<button type="button" class="refBack" id="refBackBtn" title="All topics">
               <i class="fas fa-chevron-left"></i><span>All topics</span>
           </button>`
        : `<span class="refBarTitle">Reference</span>`;
}

/* Once, at load. Everything after this addresses #refBarLead. */
function refBuildBar() {
    const bar = document.getElementById('refBar');
    if (!bar || bar.dataset.built) return;
    bar.innerHTML = `<div id="refBarLead"></div>
        <label class="refFilter">
            <i class="fas fa-search"></i>
            <input type="search" id="refFilterInput" class="refFilterInput" placeholder="Filter topics"
                   spellcheck="false" autocomplete="off">
        </label>`;
    bar.dataset.built = '1';
}

function refRender() {
    const lead = document.getElementById('refBarLead');
    const body = document.getElementById('refBody');
    if (!lead || !body) return;

    lead.innerHTML = refBarLeadHTML();

    const topic = refCurrent ? refTopic(refCurrent) : null;
    body.innerHTML = topic ? refTopicHTML(topic) : refIndexHTML();
    body.scrollTop = 0;
}


/* ----------------------------------------------------------------------------
   Navigation — the public API.

   openReference(id) is what every quick link, every `See also` and every inline
   cross-reference goes through. It switches the page tab by CLICKING it rather
   than by setting styles: the shell's switcher already knows how to hide a
   group's panels and move the `clicked` class, and a second implementation of
   that here would be a second thing to keep in step with Template.js.
-------------------------------------------------------------------------- */
function openReference(id) {
    const tab = document.getElementById('helpTab');
    if (tab && !tab.classList.contains('clicked')) tab.click();

    if (id && refTopic(id)) {
        refCurrent = id;
    } else {
        refCurrent = null;
    }
    refRender();
}

function refShowIndex() {
    refCurrent = null;
    refRender();
}


/* ----------------------------------------------------------------------------
   Events

   Delegated from `document`, not from #helpPanel: the quick links live in the
   INPUT panel, the `See also` links live in the help panel, and the inline
   cross-references live inside topic bodies. One contract — `[data-ref]` on a
   .refLink, .refJump, .refItem or .refRelatedLink — covers all three places, so
   a tab adding a quick link needs no wiring of its own.
-------------------------------------------------------------------------- */
document.addEventListener('click', function (e) {
    const link = e.target.closest?.('[data-ref]');
    if (link) {
        e.preventDefault();
        openReference(link.dataset.ref);
        return;
    }
    if (e.target.closest?.('#refBackBtn')) refShowIndex();
});

/* .refJump is an <a> in running text, so it has to answer the keyboard the way a
   link does. The cards and the quick links are real <button>s and get this from
   the browser. */
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const jump = e.target.closest?.('.refJump');
    if (!jump) return;
    e.preventDefault();
    openReference(jump.dataset.ref);
});

document.addEventListener('input', function (e) {
    if (e.target.id !== 'refFilterInput') return;
    refQuery = e.target.value.trim();
    /* Typing is how you leave a topic. Filtering while one is open would
       otherwise do nothing visible, since the topic body is not what the filter
       searches. No refocus needed — the input is never rebuilt (see refRender). */
    refCurrent = null;
    refRender();
});


/* ----------------------------------------------------------------------------
   Quick links — the markup the input tabs embed.

   Icon-only, and it sits at the END of a row's controls rather than on the row
   LABEL. The label column is a fixed 100px (108 on the Core tab, which is
   already the widest label in the app), so an icon added there would push the
   longest label into a second line — and a book beside "Megakaryocytes" would
   also read as though it were labelling the row rather than offering something.

   `title` carries the topic's own title, so hovering says where the link goes
   without spending a word of the row on it.
-------------------------------------------------------------------------- */
function refLinkHTML(topicId, label) {
    const topic = refTopic(topicId);
    if (!topic) return '';       // a link to a topic nobody wrote is nothing, not a broken button
    return `<button type="button" class="refLink" data-ref="${topicId}"` +
        ` title="Reference: ${topic.title}" aria-label="Reference: ${topic.title}">` +
        `<i class="fas fa-book"></i>${label ? `<span>${label}</span>` : ''}</button>`;
}

/* The Diagnosis tab's version: a worded link on a candidate card, where there is
   room for a word and an icon alone would be a third glyph on a busy card.

   Takes the RULE, not its id, so it can fall back to the family map — the eight
   AML rules for recurrent genetic abnormalities are generated from a spec table
   and have no hand-written entry (see referenceForFamily). Returns '' where
   neither map answers, which is the correct output for an entity nothing has
   been written about yet rather than a link to nothing. */
function refRuleLinkHTML(rule) {
    if (!rule) return '';
    const topicId = referenceForRule[rule.id] || referenceForFamily[rule.family];
    const topic = topicId && refTopic(topicId);
    if (!topic) return '';
    return `<button type="button" class="refRuleLink" data-ref="${topic.id}"` +
        ` title="Reference: ${topic.title}">Criteria</button>`;
}


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */
refBuildBar();
refRender();
