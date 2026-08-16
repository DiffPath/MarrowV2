/* ============================================================================
   MarrowRefData.js - the reference library's CONTENT.

   The book icon in the page bar. Diagnostic criteria for the entities the
   Diagnosis tab ranks, plus the bench facts a marrow is measured with - how
   fibrosis is graded, what cellularity is expected for an age, how many
   megakaryocytes is normal, what counts as a blast.

   This file is content only. MarrowRef.js renders it, navigates it, and owns
   openReference(); nothing here touches the DOM.

   ---------------------------------------------------------------------------
   A TOPIC IS THE CRITERIA AND ALMOST NOTHING ELSE.

   This is the standing instruction for anything added here, and it was arrived
   at by writing the opposite first. The initial pass gave every entity a
   one-line subtitle, a provenance line, a histopathology paragraph, an
   epidemiology paragraph and a practice note - all true, all sourced, and all
   between the reader and the box they opened the page for. A reference you have
   to scroll past prose to use is a reference you stop opening.

   So: the criteria box, an ICC divergence where the two classifications differ,
   and a table where the classification itself is a table. Detail that qualifies
   a criterion goes in that criterion's own `notes`, inside the box, where it is
   read with the criterion rather than after it.

   NO `source` FIELD AND NO `blurb`. Provenance is a `//` comment above the
   topic - the maintainer needs it, the reader never did. The title says what the
   page is.

   ---------------------------------------------------------------------------
   THE READER IS A PATHOLOGIST. Never define a term of the trade ("hypocellular
   means below the range for age" was written here and cut on the author's
   feedback) - the audience finished medical school. A definition earns its
   place only when it is CRITERIAL: a stipulated threshold someone looks up
   (the ring-sideroblast five-granule rule, "persistent means 4 months") is
   content; a dictionary line is not.

   ---------------------------------------------------------------------------
   TYPOGRAPHY (author's rules, swept into the whole file 2026-08):

   - NO inline <b> in topic bodies. Emphasis is structural - box titles, group
     labels and refH carry the section's only bold, from CSS. WHO's own boxes
     do not bold thresholds either; the bullet isolates the criterion.
   - NO em- or en-dashes in content. A hyphen ("5-10%", "MF-2") or no dash at
     all. Minus signs in cytogenetics ("-7", U+2212 where pasted) are not
     dashes and stay.
   - Genes keep <i>. That is domain notation, not emphasis.

   ---------------------------------------------------------------------------
   `unverified` STAYS, and is the one thing here that is not content.

   CLAUDE.md records that every WHO chapter pasted into docs/who/ so far has
   corrected the rule written from memory before it - four for four on the MPN
   chapters, and three of those four errors were in the SHAPE of the accepted
   paths rather than in a threshold. A topic written from memory is therefore a
   different kind of object from a transcribed one, and the reader has to be able
   to tell. It renders as a chip beside the title and one amber line, and it is
   cleared only by pasting the source and reading the topic against it.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Markup vocabulary

   Topics are written with these rather than with raw tags, for the same reason
   the report has REPORT_PARAGRAPH: a criteria box built two ways is a criteria
   box that will eventually look two ways.
-------------------------------------------------------------------------- */

function refP(html) {
    return `<p class="refP">${html}</p>`;
}

function refH(text) {
    return `<h3 class="refH">${text}</h3>`;
}

function refUL(items) {
    return `<ul class="refList">${items.map(function (i) { return `<li>${i}</li>`; }).join('')}</ul>`;
}

function refOL(items) {
    return `<ol class="refList">${items.map(function (i) { return `<li>${i}</li>`; }).join('')}</ol>`;
}

/* A table. `headers` may be null where the columns are self-evident. */
function refTable(headers, rows, caption) {
    const head = headers
        ? `<thead><tr>${headers.map(function (h) { return `<th>${h}</th>`; }).join('')}</tr></thead>`
        : '';
    const body = `<tbody>${rows.map(function (r) {
        return `<tr>${r.map(function (c) { return `<td>${c}</td>`; }).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<div class="refTableWrap"><table class="refTable">${head}${body}</table>` +
        (caption ? `<div class="refTableCaption">${caption}</div>` : '') + `</div>`;
}

/* THE CRITERIA BOX - the unit of this section, and on most pages the whole page.

   `groups` is the box's own structure. WHO writes some entities as major/minor
   criteria and others as essential/desirable, and the difference is not
   cosmetic: a major/minor box has a combination rule ("all three major, or the
   first two plus the minor"), an essential/desirable box does not, and inventing
   one for it would be inventing a criterion. So `rule` is printed only where the
   source states one.

   `notes` are the box's footnotes AND the qualifications that would otherwise
   become paragraphs below it. They are load-bearing often enough to deserve the
   slot: polycythaemia vera's footnote b is an entire diagnostic route (the
   biopsy may be skipped at a high enough haematocrit), and primary
   myelofibrosis's major criterion 3 ends in a negative whose loss costs
   triple-negative PMF - 5-10% of cases - its place in the differential. */
function refBox(spec) {
    const groups = (spec.groups || []).map(function (g) {
        const items = g.ordered ? refOL(g.items) : refUL(g.items);
        return `<div class="refCritGroup"><div class="refCritLabel">${g.label}</div>${items}</div>`;
    }).join('');
    const rule = spec.rule ? `<div class="refCritRule">${spec.rule}</div>` : '';
    const notes = (spec.notes || []).length
        ? `<div class="refFoot">${spec.notes.map(function (n) { return `<div>${n}</div>`; }).join('')}</div>`
        : '';
    return `<div class="refBox">` +
        (spec.title ? `<div class="refBoxTitle">${spec.title}</div>` : '') +
        `<div class="refBoxBody">${groups}${rule}${notes}</div></div>`;
}

/* Where ICC 2022 differs from the box above. Its own block because CLAUDE.md
   requires both names wherever they diverge, and a divergence buried in a
   paragraph is one a reader skims past.

   Drawn as a refBox with an "ICC 2022" title bar, NOT as a bubble of its own:
   it used to be a blue tinted callout, which made three block styles on one
   page where the content has two kinds of thing (a box of criteria, and a box
   of how ICC's differ). One visual language; the title says which is which. */
function refDiverge(html) {
    return `<div class="refBox refDiverge"><div class="refBoxTitle">ICC 2022</div>` +
        `<div class="refBoxBody">${html}</div></div>`;
}

/* THE LITERATURE CITATION FOR A NUMBER, and not the same thing as the `source`
   field that was removed from every topic.

   That field was a pointer to a file in this repo - "docs/who/mds-lb.md,
   verbatim" - printed on pages whose content is a criteria box the
   classification defines by fiat. There is nothing to look up: the criteria ARE
   the source.

   These are different. A megakaryocyte count, an age-specific cellularity range
   and the ring-sideroblast definition are measurements somebody made, they vary
   between series, and a reader deciding whether to grade a marrow against one
   has to be able to see whose number it is. Every quantitative claim in this
   file that is NOT part of a criteria box carries one.

   Rendered small and last, under the table it belongs to. */
function refCite(html) {
    return `<div class="refCite">${html}</div>`;
}

/* An inline cross-reference inside a sentence. Same `[data-ref]` contract as the
   quick links the input tabs carry, so one delegated handler serves both. */
function refJump(topicId, text) {
    return `<a class="refJump" data-ref="${topicId}" role="button" tabindex="0">${text}</a>`;
}


/* ============================================================================
   RED CELL FIGURES - inline SVG, drawn from geometry rather than typed.

   THEY ARE SCHEMATICS AND NOT PHOTOMICROGRAPHS, and that is a deliberate choice
   rather than a limitation worked around. This app is a single folder of static
   files that has to work from file:// with no network; a photographic atlas
   would mean either megabytes of embedded base64 or an external host, and every
   image worth using is somebody's copyright. A drawing also does something a
   photograph cannot: it shows ONE cell with the defining feature at full
   expression and nothing else in the field, which is what a shape is learned
   from. The topic says all this on the page - a reader must never think these
   are real cells.

   GEOMETRY IS COMPUTED, NOT TYPED. Hand-written path coordinates for eighteen
   figures would be eighteen chances to fat-finger a number into a shape nobody
   notices is wrong. The helpers below take angles and radii; the shapes read as
   what they are because of the maths, and a wrong figure is a wrong parameter
   rather than a wrong glyph.

   NOTHING HERE IS RANDOM. An acanthocyte's spicules are irregular, and the
   temptation is Math.random(); a figure that redraws differently on every render
   is unsettling and impossible to check against. The irregularity is a fixed
   table of angles instead - irregular, and the same every time.
   ========================================================================= */

/* Wright-stain colours, flat. A gradient would look more like a photograph and
   this is not trying to be one. */
const RBC_FILL   = '#E9AE9E';   // haemoglobin
const RBC_EDGE   = '#C4796A';   // membrane
const RBC_PALE   = '#F9E7E1';   // central pallor
const RBC_DENSE  = '#D68872';   // a cell with no pallor stains deeper
const RBC_INCL   = '#4A2E6B';   // Howell-Jolly body
const RBC_STIPPLE= '#6E5A9E';   // basophilic stippling
const RBC_RING   = '#C7D0DA';   // the dashed normal-size reference

/* Polar around the 100x100 box's centre, 0 degrees at twelve o'clock. */
function rbcPt(angle, r) {
    const a = (angle - 90) * Math.PI / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
}

/* A spiculated outline. `spikes` is [angle, radius] pairs - even spacing and one
   radius gives an echinocyte, an irregular table gives an acanthocyte - and the
   valley between two spikes sits at their angular midpoint.

   `stroke-linejoin: round` on the polygon is what makes a spicule BLUNT, and it
   is the whole reason these are polygons rather than curves: the same point list
   drawn with a thick round join is a club and with a thin miter join is a thorn,
   which is exactly the distinction between the two cells. */
function rbcSpikes(spikes, innerR) {
    const pts = [];
    spikes.forEach(function (s, i) {
        pts.push(rbcPt(s[0], s[1]));
        const next = spikes[(i + 1) % spikes.length];
        const a2 = next[0] < s[0] ? next[0] + 360 : next[0];
        pts.push(rbcPt((s[0] + a2) / 2, innerR));
    });
    return pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
}

/* The dashed circle of a normal red cell, drawn with a cell whose definition IS
   its size. Without it "macroovalocyte" and "microspherocyte" are just an oval
   and a circle - the figure cannot say "large" or "small" on its own, because it
   has nothing to be large or small against.

   DRAWN LAST, ON TOP. Behind the cell it is invisible wherever the cell is
   bigger, which is the whole case it exists for: the macroovalocyte covered all
   but a hairline of it and the figure said nothing. On top it reads as what it
   is - a measurement laid over the cell - and it is stroke-only, so it hides
   nothing. */
function rbcScaleRing() {
    return `<circle cx="50" cy="50" r="31" fill="none" stroke="${RBC_RING}" ` +
        `stroke-width="1.5" stroke-dasharray="3 3"/>`;
}

function rbcFig(inner) {
    return `<svg class="rbcFig" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* A plain disc with central pallor - the baseline every other figure is a
   departure from, and the body of the two inclusion figures. */
function rbcDisc(r, pallor) {
    return `<circle cx="50" cy="50" r="${r}" fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2"/>` +
        (pallor ? `<circle cx="50" cy="50" r="${pallor}" fill="${RBC_PALE}"/>` : '');
}

/* The eighteen figures. Keyed by the descriptor key wherever one exists, so a
   dropdown entry and its picture cannot drift apart; `normal` is the reference
   card and belongs to no descriptor. */
const rbcFigures = {
    normal: function () { return rbcFig(rbcDisc(31, 13)); },

    /* Regular, shallow, many, evenly spaced - and MITRE joins, so the spicules
       come to points. Sixteen of them, generated rather than listed. */
    echinocytes: function () {
        const even = [];
        for (let i = 0; i < 16; i++) even.push([i * 22.5, 34]);
        return rbcFig(
            `<polygon points="${rbcSpikes(even, 27)}" fill="${RBC_FILL}" stroke="${RBC_EDGE}" ` +
            `stroke-width="1.5" stroke-linejoin="miter"/>` +
            `<circle cx="50" cy="50" r="11" fill="${RBC_PALE}"/>`);
    },

    /* Few, long, irregular in both length and spacing, and BLUNT - the thick
       round join is doing that. No central pallor: an acanthocyte is dense. */
    acanthocytes: function () {
        const spikes = [[8, 41], [55, 34], [96, 42], [140, 33], [192, 40], [246, 36], [300, 43]];
        return rbcFig(
            `<polygon points="${rbcSpikes(spikes, 23)}" fill="${RBC_DENSE}" stroke="${RBC_DENSE}" ` +
            `stroke-width="7" stroke-linejoin="round"/>`);
    },

    /* A helmet: the major arc of a disc closed by the straight edge where the
       rest of the cell was sheared away. */
    schistocytes: function () {
        return rbcFig(
            `<path d="M 22,64 A 31,31 0 1 1 78,64 Z" fill="${RBC_DENSE}" stroke="${RBC_EDGE}" ` +
            `stroke-width="2" stroke-linejoin="round"/>`);
    },

    spherocytes: function () {
        return rbcFig(`<circle cx="50" cy="50" r="24" fill="${RBC_DENSE}" stroke="${RBC_EDGE}" stroke-width="2"/>` + rbcScaleRing());
    },

    microspherocytes: function () {
        return rbcFig(`<circle cx="50" cy="50" r="16" fill="${RBC_DENSE}" stroke="${RBC_EDGE}" stroke-width="2"/>` + rbcScaleRing());
    },

    elliptocytes: function () {
        return rbcFig(
            `<ellipse cx="50" cy="50" rx="40" ry="15" fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2"/>` +
            `<ellipse cx="50" cy="50" rx="16" ry="5" fill="${RBC_PALE}"/>`);
    },

    ovalocytes: function () {
        return rbcFig(
            `<ellipse cx="50" cy="50" rx="34" ry="23" fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2"/>` +
            `<ellipse cx="50" cy="50" rx="13" ry="8" fill="${RBC_PALE}"/>`);
    },

    /* Larger than the reference ring in both axes, and no pallor - which is the
       pair of features that separates it from an ovalocyte. */
    macroovalocytes: function () {
        return rbcFig(`<ellipse cx="50" cy="50" rx="43" ry="27" fill="${RBC_DENSE}" stroke="${RBC_EDGE}" stroke-width="2"/>` + rbcScaleRing());
    },

    /* Two curves meeting at points: the outer bulge and the shallower inner one. */
    sickleCells: function () {
        return rbcFig(
            `<path d="M 30,16 Q 92,50 30,84 Q 56,50 30,16 Z" fill="${RBC_DENSE}" stroke="${RBC_EDGE}" ` +
            `stroke-width="2" stroke-linejoin="round"/>`);
    },

    teardropCells: function () {
        return rbcFig(
            `<path d="M 50,12 C 62,40 78,48 78,60 A 28,28 0 1 1 22,60 C 22,48 38,40 50,12 Z" ` +
            `fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2" stroke-linejoin="round"/>` +
            `<circle cx="50" cy="60" r="11" fill="${RBC_PALE}"/>`);
    },

    /* Three rings: rim, pallor, and the central button of haemoglobin that gives
       the cell its name. */
    targetCells: function () {
        return rbcFig(
            `<circle cx="50" cy="50" r="31" fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2"/>` +
            `<circle cx="50" cy="50" r="21" fill="${RBC_PALE}"/>` +
            `<circle cx="50" cy="50" r="10" fill="${RBC_FILL}"/>`);
    },

    /* The cell's major arc, closed by a concave arc - the semicircular defect
       where a macrophage removed a Heinz body.

       THE ENDPOINTS ARE THE TWO CIRCLES' INTERSECTIONS AND THEY ARE COMPUTED,
       NOT GUESSED. Cell centre (50,50) r=31, bite centre (81,50) r=16, so
       d = 31, a = (d² + r₁² − r₂²) / 2d = 26.87, h = √(r₁² − a²) = 15.46, and the
       intersections are (76.9, 50 ∓ 15.46). Eyeballed endpoints with guessed
       large-arc/sweep flags is what the first attempt did, and it drew a wedge
       nothing like a cell - four flag combinations pick four different arcs and
       three of them are wrong. */
    biteCells: function () {
        return rbcFig(
            `<path d="M 76.9,34.5 A 31,31 0 1 0 76.9,65.5 A 16,16 0 0 1 76.9,34.5 Z" ` +
            `fill="${RBC_FILL}" stroke="${RBC_EDGE}" stroke-width="2" stroke-linejoin="round"/>` +
            `<circle cx="42" cy="50" r="11" fill="${RBC_PALE}"/>`);
    },

    /* Membrane intact, haemoglobin retracted away from one edge - so the OUTLINE
       is a whole cell and the FILL is not, which is the entire finding.

       A clip path rather than another two-arc path: the haemoglobin is just a
       disc pushed to one side and trimmed at the membrane, and saying that
       directly is both correct by construction and impossible to get subtly
       wrong. The clear crescent needs no stroke of its own - the membrane circle
       drawn under it already supplies the edge. */
    blisterCells: function () {
        return rbcFig(
            `<defs><clipPath id="rbcBlisterClip"><circle cx="50" cy="50" r="30"/></clipPath></defs>` +
            `<circle cx="50" cy="50" r="31" fill="${RBC_PALE}" stroke="${RBC_EDGE}" stroke-width="2"/>` +
            `<circle cx="41" cy="50" r="28" fill="${RBC_FILL}" clip-path="url(#rbcBlisterClip)"/>`);
    },

    howellJolly: function () {
        return rbcFig(rbcDisc(31, 13) +
            `<circle cx="66" cy="36" r="6.5" fill="${RBC_INCL}"/>`);
    },

    basophilicStippling: function () {
        const dots = [[38, 34], [50, 30], [62, 36], [33, 46], [45, 44], [57, 47], [67, 45],
                      [36, 58], [48, 56], [59, 60], [68, 55], [42, 67], [54, 66], [63, 68]];
        return rbcFig(rbcDisc(31, 0) +
            dots.map(function (d) {
                return `<circle cx="${d[0]}" cy="${d[1]}" r="2" fill="${RBC_STIPPLE}"/>`;
            }).join(''));
    }
};

/* The two synonym pairs draw the same cell, because they ARE the same cell. The
   dropdown offers both wordings, so both need a card to look up - and each card
   says which other entry it duplicates rather than leaving a reader to wonder
   why two pictures are identical. */
rbcFigures.burrCells = rbcFigures.echinocytes;
rbcFigures.teardropForms = rbcFigures.teardropCells;

/* The photograph half of a card, where there is one.

   DRAWING AND PHOTOGRAPH SIDE BY SIDE, never one instead of the other. They
   answer different questions: the schematic shows the defining feature at full
   expression with nothing else in the field, and the photograph shows what that
   actually looks like among overlapping cells at real stain variation. A reader
   learning a shape wants the first; a reader checking a slide wants the second.

   THE UNCONFIRMED BADGE IS NOT DECORATION. Commons is contributor-curated -
   its schistocyte category holds dog, rabbit and rat smears, and a search for
   Howell-Jolly bodies returned a quokka - so a filename is a claim and not a
   diagnosis. Until somebody who can tell has set `verified: true` in
   MarrowRefImages.js, the badge says so on the image itself, where it cannot be
   scrolled past. */
function rbcPhoto(key) {
    if (typeof rbcPhotos === 'undefined') return '';
    const p = rbcPhotos[key];
    if (!p) return '';

    const credit = p.source === 'own'
        ? ''
        : `<div class="rbcCredit">${p.author ? p.author + ' · ' : ''}` +
          `<a href="${p.licenceUrl || p.source}" target="_blank" rel="noopener">${p.licence}</a></div>`;

    return `<figure class="rbcPhoto${p.verified ? '' : ' rbcPhoto--unconfirmed'}">
        <img src="${p.file}" alt="${p.caption}" loading="lazy">
        ${p.verified ? '' : '<span class="rbcUnconfirmed">unconfirmed</span>'}
        <figcaption>${p.caption}</figcaption>
        ${credit}
    </figure>`;
}

/* One card. `also` is the synonym note; `seen` is what the finding suggests. */
function rbcCard(spec) {
    const fig = rbcFigures[spec.key];
    return `<div class="rbcCard">
        <div class="rbcArt">${fig ? fig() : ''}${rbcPhoto(spec.key)}</div>
        <div class="rbcName">${spec.name}</div>
        <div class="rbcDesc">${spec.desc}</div>
        ${spec.also ? `<div class="rbcAlso">${spec.also}</div>` : ''}
        ${spec.seen ? `<div class="rbcSeen">${spec.seen}</div>` : ''}
    </div>`;
}

function rbcGrid(cards) {
    return `<div class="rbcGrid">${cards.map(rbcCard).join('')}</div>`;
}

/* A quiet aside that is NOT a criterion and does not belong to any one criterion
   - so it cannot go in a box's `notes`, which is where a qualification normally
   lives. Reserved for the few remarks that are about the page rather than about
   the case: that WHO and ICC spell a name differently, that two chapters publish
   two versions of a list. If it qualifies a criterion, it belongs in the box. */
function refNote(html) {
    return `<div class="refNote">${html}</div>`;
}


/* ----------------------------------------------------------------------------
   Sections - the index's grouping. Labels only; a section blurb is one more line
   between the reader and the list.
-------------------------------------------------------------------------- */
const referenceSections = [
    { id: 'bench',   label: 'At the scope' },
    { id: 'mds',     label: 'Myelodysplastic neoplasms' },
    { id: 'mpn',     label: 'Myeloproliferative neoplasms' },
    { id: 'overlap', label: 'MDS/MPN and the boundaries' },
    { id: 'aml',     label: 'Acute myeloid leukaemia' }
];


const referenceTopics = [];


/* ============================================================================
   AT THE SCOPE
   ========================================================================= */

// The age-specific ranges and means are Wong et al. AJCP 2024, read from the
// paper. The hypoplastic-MDS thresholds are docs/who/mds-h-and-mds-ib.md. The
// three calculation methods are this app's own - see MarrowCore.js.
//
// NOTE FOR THE BANDS: the app's coreCellBand() uses these four ranges, and a
// comment there claimed the band midpoints ARE the reported means. That holds
// for the three adult bands and NOT for the youngest, whose reported mean is
// 72.8% against a midpoint of 65. The means below are the paper's own.
referenceTopics.push({
    id: 'cellularity',
    section: 'bench',
    title: 'Marrow cellularity',
    keywords: ['cellularity', 'hypocellular', 'hypercellular', 'age', '100 minus age', 'aplastic', 'fat'],
    related: ['mds-h', 'megakaryocytes'],
    body: function () {
        return refP('Assessed on the trephine core biopsy; subcortical marrow is normally hypocellular.') +

            refTable(['Age', 'Normal range', 'Reported mean'], [
                ['Under 20', '45-85%', '72.8%'],
                ['20 to under 40', '40-70%', '56.5%'],
                ['40 to under 60', '35-65%', '51-54%'],
                ['60 and over', '30-60%', '43-45%']
            ]) +
            refCite('Wong J, Jackson R, Chen L, et al. Determination of age-dependent bone marrow normocellularity. ' +
                '<i>Am J Clin Pathol</i>. 2024;161(2):170-176. doi:10.1093/ajcp/aqad129<br>' +
                'Hartsock RJ, Smith EB, Petty CS. Normal variations with aging of the amount of hematopoietic tissue ' +
                'in bone marrow from the anterior iliac crest. <i>Am J Clin Pathol</i>. 1965;43:326-331.') +

            refH('Expected cellularity, three ways') +
            refUL([
                '100 minus age - the traditional rule. Overstates the decline in the elderly: measured ' +
                    'cellularity falls about 3% per decade, not 10%.',
                'Strict evidence based - the bands above as hard cut-offs, no mild/marked grade.',
                'Hybrid - the average of the two.'
            ]) +

            refH('Significantly decreased') +
            refP('Hypoplastic MDS puts a number on it: below 30% of normal cellularity under 70 years, below ' +
                '20% at 70 and over. Hypocellularity is usually diffuse but may be patchy.');
    }
});

// docs/who/mpn-table-2.03-fibrosis-grading.md - all three columns and all three
// footnotes, verbatim. The uses of the grade are from docs/who/mpn-pmf.md,
// docs/who/mpn-et.md, docs/who/mpn-pv.md and docs/who/mds-h-and-mds-ib.md.
//
// THE PASTED TABLE CORRECTED THE VERSION WRITTEN FROM MEMORY BEFORE IT, and the
// error was in a rule about how to APPLY the grade rather than in a grade
// description: this said the grade was the marrow's "overall" grade and "not its
// worst field", where footnote a says a heterogeneous marrow takes the highest
// grade present in >= 30% of the marrow area. The collagen and osteosclerosis
// columns were missing outright. Four for four is now five for five.
referenceTopics.push({
    id: 'fibrosis',
    section: 'bench',
    title: 'Grading marrow fibrosis',
    keywords: ['fibrosis', 'reticulin', 'collagen', 'MF-0', 'MF-1', 'MF-2', 'MF-3', 'myelofibrosis', 'trichrome', 'osteosclerosis'],
    related: ['pmf', 'pre-pmf'],
    body: function () {
        /* TWO TABLES, NOT THE SOURCE'S ONE. Table 2.03 is four columns of prose,
           which in a half-width panel sets each cell four words wide. The
           reticulin definition is what a grade is assigned on and is split out;
           collagen and osteosclerosis are the confirmatory columns and follow
           under their own heading. No cell is abridged. */
        return refTable(['Grade', 'Grade definition (reticulin)'], [
                ['MF-0', 'Scattered linear reticulin with no intersections (crossovers), corresponding to ' +
                    'normal bone marrow'],
                ['MF-1', 'Loose network of reticulin with many intersections, especially in perivascular areas'],
                ['MF-2', 'Diffuse and dense increase in reticulin with extensive intersections, occasionally ' +
                    'with focal bundles of thick fibres mostly consistent with collagen and/or focal osteosclerosis'],
                ['MF-3', 'Diffuse and dense increase in reticulin with extensive intersections and coarse ' +
                    'bundles of thick fibres consistent with collagen, usually associated with osteosclerosis']
            ]) +

            refBox({
                title: 'Applying the grade',
                groups: [{
                    label: 'The three footnotes',
                    items: [
                        'Reticulin and collagen fibre density should be assessed only in haematopoietic areas. ' +
                            'If the pattern of reticulin fibrosis, collagen deposition and/or osteosclerosis is ' +
                            'heterogeneous, the final grade is the highest grade present in &ge; 30% of the marrow ' +
                            'area.',
                        'Collagen is assessed by trichrome staining (Masson trichrome or Martius Scarlet ' +
                            'Blue); the stain is recommended for grades MF-2 and MF-3.',
                        'Osteosclerosis is best assessed on a core biopsy of sufficient length, taken at a right ' +
                            'angle from the cortical bone, without significant fragmentation.'
                    ]
                }]
            }) +

            refH('Collagen and osteosclerosis') +
            refTable(['Grade', 'Collagen pattern', 'Osteosclerosis'], [
                ['MF-0',
                    'Perivascular collagen only (normal)',
                    'Regular bone trabeculae (distinct paratrabecular borders)'],
                ['MF-1',
                    'Focal paratrabecular or central collagen deposition with no connecting meshwork',
                    'Focal budding, hooks, spikes, or paratrabecular apposition of new bone'],
                ['MF-2',
                    'Paratrabecular or central deposition of collagen with focally connecting meshwork or generalized ' +
                        'paratrabecular apposition of collagen',
                    'Diffuse paratrabecular formation of new bone with thickening of trabeculae, occasionally with ' +
                        'focal interconnections'],
                ['MF-3',
                    'Diffuse (complete) connecting meshwork of collagen in &gt; 30% of marrow spaces',
                    'Extensive interconnecting meshwork of new bone with overall effacement of marrow spaces']
            ]) +

            refH('What reads the grade') +
            refTable(['Criterion', 'Grade'], [
                ['Prefibrotic PMF, major 1', 'Not above grade 1'],
                ['Overt fibrotic PMF, major 1', 'Grade 2 or 3'],
                ['Essential thrombocythaemia, major 2', 'At most a minor (grade 1) increase'],
                ['Post-PV MF, post-ET MF', 'Grade 2-3'],
                ['MDS with increased blasts and fibrosis', 'MF-2 or MF-3']
            ]) +

            refCite('Kvasnicka HM, Beham-Schmid C, Bob R, et al. Problems and pitfalls in grading of bone marrow ' +
                'fibrosis, collagen deposition and osteosclerosis - a consensus-based study. <i>Histopathology</i>. ' +
                '2016;68(6):905-915.');
    }
});

// Dysplastic morphology from docs/who/mds-introduction.md; the ET and PMF
// patterns from docs/who/mpn-et.md and docs/who/mpn-pmf.md; PV's from
// docs/who/mpn-pv.md. The count is Singal & Belliveau 1988, read from its own
// abstract.
//
// THE COUNT HERE WAS WRONG BY ABOUT FIVEFOLD before it was checked. The
// from-memory version said "roughly 7-15 per 400x field, of the order of 10-20
// per mm²"; the primary series reports a mean of 1.5 per 450x field. Neither
// figure was sourced when it was written, which is what the unverified flag on
// this topic was for - and it is the first time that flag has caught a number
// rather than a shape.
referenceTopics.push({
    id: 'megakaryocytes',
    section: 'bench',
    title: 'Megakaryocytes',
    keywords: ['megakaryocyte', 'megakaryocytes', 'clustering', 'staghorn', 'micromegakaryocyte', 'paratrabecular', 'number'],
    related: ['dysplasia', 'et', 'pre-pmf'],
    body: function () {
        return refP('Number is judged semiquantitatively - decreased, normal, or increased. No WHO criterion ' +
                'asks for a count, and the published quantitative figures are not comparable between laboratories: a ' +
                'count per field depends on the field diameter, the section thickness and the marrow\'s cellularity.') +
            refP('The one direct series gives a mean of 1.5 megakaryocytes per 450× field (range 0.4-2.7) in ' +
                'normal marrows of mean cellularity 72%. A figure quoted per <i>low-power</i> field is a different ' +
                'measurement again, and the two are routinely confused.') +
            refCite('Singal R, Belliveau RR. Quantitation of megakaryocytes in normal bone marrow. <i>Anal Quant ' +
                'Cytol Histol</i>. 1988;10(1):33-36.<br>' +
                'Zini G, Viscovo M. Cytomorphology of normal, reactive, dysmorphic, and dysplastic megakaryocytes in ' +
                'bone marrow aspirates. <i>Int J Lab Hematol</i>. 2021;43:23-28.') +

            refH('Distribution') +
            refP('Normally intertrabecular, single or in loose pairs. Tight clustering is an MPN pattern; ' +
                'paratrabecular relocation is an MDS one.') +

            refTable(['Pattern', 'Morphology', 'Where it counts'], [
                ['Dysplastic',
                    'Micromegakaryocytes; non-lobated nuclei at all sizes; multiple widely separated nuclei.',
                    'MDS - the megakaryocyte limb of the 10% threshold.'],
                ['ET-like',
                    'Enlarged, mature, hyperlobulated (staghorn) nuclei; no granulocytic or erythroid left shift.',
                    'Essential thrombocythaemia, major 2.'],
                ['PMF-like',
                    'Proliferation with atypia - dense clustering, hypolobated bulbous nuclei, abnormal N:C ratio.',
                    'Prefibrotic and overt PMF, major 1.'],
                ['PV-like',
                    'Increased, aberrantly distributed, pleomorphic - varying in size, often staghorn hyperchromatic ' +
                        'forms, in loose clusters near the endosteum.',
                    'Polycythaemia vera, major 2 (<i>mature</i> and pleomorphic, which is what separates it from PMF).']
            ]);
    }
});

// docs/who/mds-introduction.md for the differential and both denominators;
// blast equivalents from docs/who/mdsmpn-introduction-and-cmml.md.
referenceTopics.push({
    id: 'blasts',
    section: 'bench',
    title: 'Counting blasts',
    keywords: ['blast', 'blasts', 'differential', '500 cell', '200 cell', 'promonocyte', 'CD34', 'Auer rod', 'denominator'],
    related: ['dysplasia', 'mds-ib', 'aml-overview'],
    body: function () {
        return refBox({
            title: 'The count',
            groups: [{
                label: 'WHO-HAEM5',
                items: [
                    'Bone marrow: a 500-cell differential of all nucleated cells, on a smear or trephine imprint.',
                    'Peripheral blood: a 200-leukocyte differential.'
                ]
            }],
            notes: [
                'The denominators differ. Marrow blasts are a percentage of all nucleated cells, always ' +
                    'including nucleated erythroid cells. Blood blasts are a percentage of leukocytes, ' +
                    'excluding nucleated erythroid cells.',
                'Blast equivalents. In CMML both the 20% ceiling and the CMML-1/CMML-2 split are read on ' +
                    'blasts <i>and blast equivalents</i> - myeloblasts, monoblasts and promonocytes together. In ' +
                    'APL the abnormal promyelocytes are likewise counted as blasts.',
                'Where the smear will not give a count (fibrosis, a dry tap), CD34 immunohistochemistry on the ' +
                    'core is the accepted substitute. It estimates blast proportion of cellularity rather than giving ' +
                    'a 500-cell differential, and CD34-negative blasts exist.'
            ]
        }) +

        refTable(['Blasts', 'Category'], [
            ['&lt; 5% marrow and &lt; 2% blood', 'Low blasts - MDS-LB, MDS-5q, MDS-SF3B1, MDS-h'],
            ['5-9% marrow and/or 2-4% blood', 'MDS-IB1'],
            ['10-19% marrow and/or 5-19% blood', 'MDS-IB2 (WHO); MDS/AML (ICC)'],
            ['Auer rods in that range', 'MDS-IB2, at any count within it'],
            ['&ge; 20%', 'AML by blast count, in both classifications']
        ]) +

        refDiverge('WHO-HAEM5 retains 20% to delineate MDS from AML, and removes the blast requirement entirely for ' +
            'most genetically defined AMLs. Lowering the line to 10% was considered and declined - it "would merely ' +
            'replace one cut-off point with another" and "carries a risk of overtreatment" - but MDS-IB2 may be ' +
            'regarded as AML-equivalent for therapy and trial eligibility.');
    }
});

// docs/who/mds-introduction.md - threshold and per-lineage features verbatim.
referenceTopics.push({
    id: 'dysplasia',
    section: 'bench',
    title: 'Dysplasia',
    keywords: ['dysplasia', 'dyserythropoiesis', 'dysgranulopoiesis', 'dysmegakaryopoiesis', '10%', 'pelger', 'micromegakaryocyte'],
    related: ['blasts', 'mds-overview', 'ccus'],
    body: function () {
        return refBox({
            title: 'The threshold',
            groups: [{
                label: 'WHO-HAEM5',
                items: [
                    '10% - for all lineages, across all MDS types, and for MDS/MPN.',
                    'Both the biopsy (or clot) and the aspirate should be evaluated.'
                ]
            }],
            notes: [
                'The lineages affected by the cytopenias are not necessarily those that show dysplasia.',
                'Megaloblastic changes alone are insufficient to establish dyserythropoiesis.',
                'Single- versus multilineage dysplasia is now optional - the count is usually dynamic and ' +
                    'reflects clonal evolution within one type rather than marking a separate one.'
            ]
        }) +

        refTable(['Lineage', 'Features'], [
            ['Erythroid',
                'Nuclear budding, internuclear bridging, karyorrhexis, multinuclearity. Cytoplasmic: ring ' +
                    'sideroblasts, vacuolization, aberrant PAS positivity.'],
            ['Granulocytic',
                'Nuclear hyposegmentation (pseudo-Pelger-Huët) or hypersegmentation; cytoplasmic hypogranularity; ' +
                    'pseudo-Chédiak-Higashi granules; small size.'],
            ['Megakaryocytic',
                'Micromegakaryocytes; non-lobated nuclei at all sizes; multiple widely separated nuclei.']
        ]) +

        refH('Excluded first') +
        refP('No patient should be diagnosed with MDS if the clinical and drug history is unknown, and no case ' +
            'reclassified while on growth factor therapy including erythropoietin. Drugs, infections, metabolic ' +
            'deficiency and immune disorders cause both cytopenias and dysplasia.');
    }
});

// docs/who/mds-introduction.md - verbatim.
referenceTopics.push({
    id: 'cytopenias',
    section: 'bench',
    title: 'Cytopenia thresholds',
    keywords: ['cytopenia', 'anemia', 'anaemia', 'neutropenia', 'thrombocytopenia', 'hemoglobin', 'threshold'],
    related: ['dysplasia', 'ccus', 'icus'],
    body: function () {
        return refBox({
            title: 'Unified across CCUS, MDS and MDS/MPN',
            groups: [{
                label: 'A lineage is cytopenic at',
                items: [
                    'Haemoglobin &lt; 13 g/dL in men, &lt; 12 g/dL in women',
                    'Absolute neutrophil count &lt; 1.8 &times; 10<sup>9</sup>/L',
                    'Platelets &lt; 150 &times; 10<sup>9</sup>/L'
                ]
            }],
            rule: 'Cytopenia in at least one lineage is required for a diagnosis of MDS.',
            notes: [
                'MDS may still be diagnosed with milder anaemia if definitive morphological and cytogenetic findings ' +
                    'are present.',
                'Persistent neutrophilia, monocytosis, erythrocytosis or thrombocytosis alongside cytopenia and ' +
                    'dysplasia generally means MDS/MPN or MPN instead. The exception is MDS-5q, where ' +
                    'thrombocytosis (&ge; 450 &times; 10<sup>9</sup>/L) is allowed.'
            ]
        }) +

        refDiverge('ICC requires a cytopenia for CMML at these same thresholds; WHO does not ask for one at all.');
    }
});

// The seventeen entries of the Blood tab's anisopoikilocytosis dropdown
// (bloodDescriptorGroups.pbAnisoDesc), plus a normal disc to compare them
// against. Figures are drawn from geometry - see the RED CELL FIGURES block near
// the top of this file.
//
// GROUPED BY WHAT YOU ARE LOOKING AT, NOT ALPHABETICALLY. The dropdown is
// alphabetical because a dropdown you are searching by name should be; a page
// you are searching by SHAPE should not. Grouping this way also puts the four
// confusable pairs side by side, which is the most useful thing the page does:
// two of them are the same cell under two names, and the other two differ only
// by degree.
//
// SEVEN CARDS HAVE NO PHOTOGRAPH (echinocytes, burr cells, macroovalocytes,
// ovalocytes, microspherocytes, blister cells): either Commons had no properly
// licensed image, or the candidate had a heavy green cast that would have
// taught the wrong colour. Schematic-only until a real image exists.
referenceTopics.push({
    id: 'rbc-morphology',
    section: 'bench',
    title: 'Red cell morphology',
    keywords: ['RBC', 'red cell', 'poikilocytosis', 'anisopoikilocytosis', 'morphology', 'atlas',
        'acanthocyte', 'echinocyte', 'burr', 'schistocyte', 'keratocyte', 'helmet',
        'spherocyte', 'microspherocyte', 'elliptocyte', 'ovalocyte', 'macroovalocyte',
        'sickle', 'drepanocyte', 'teardrop', 'dacrocyte', 'target', 'codocyte',
        'bite', 'blister', 'Heinz', 'Howell-Jolly', 'basophilic stippling'],
    unverified: 'The drawings are schematics, not photomicrographs. The photographs are from Wikimedia Commons and ' +
        'are marked unconfirmed - nobody has yet checked that each shows the cell its filename claims, and ' +
        'Commons is contributor-curated rather than pathologist-reviewed. The descriptions and associations are ' +
        'general haematology rather than a pasted source.',
    related: ['dysplasia', 'blasts'],
    body: function () {
        return refP('Every entry in the Blood tab\'s anisopoikilocytosis list, with the normal disc for ' +
                'comparison. Grouped by what you are looking at rather than alphabetically.') +
            refNote('Each card carries a schematic and, where one is available, a photomicrograph. ' +
                'Photographs marked unconfirmed have not been checked against the cell they claim to show.') +

            refH('Normal, and the two that are only a matter of degree') +
            rbcGrid([
                { key: 'normal', name: 'Normal disc',
                  desc: 'Round, with central pallor about a third of the diameter.' },
                { key: 'macroovalocytes', name: 'Macroovalocytes',
                  desc: 'Large and oval, with little or no central pallor. Compare against the dashed normal outline.',
                  seen: 'Megaloblastic anaemia - B12 and folate deficiency.' },
                { key: 'microspherocytes', name: 'Microspherocytes',
                  desc: 'Very small, round, dense. The extreme of the spherocyte end.',
                  also: 'A small spherocyte, not a separate cell.',
                  seen: 'Fragmentation, burns, severe haemolysis.' }
            ]) +

            refH('Spiculated - the distinction is regularity') +
            refP('This is the pair most often called wrongly, and the difference is in the spacing and ' +
                'uniformity, not the number.') +
            rbcGrid([
                { key: 'echinocytes', name: 'Echinocytes',
                  desc: '10-30 short spicules, evenly spaced and all much the same length. Central pallor kept.',
                  seen: 'Uraemia, pyruvate kinase deficiency - and very commonly an artefact of storage or slide preparation.' },
                { key: 'burrCells', name: 'Burr cells',
                  desc: 'The same cell. Regular, blunt, evenly spaced spicules.',
                  also: 'A synonym for echinocyte; the dropdown offers both wordings.' },
                { key: 'acanthocytes', name: 'Acanthocytes',
                  desc: '2-10 spicules, irregular in length and irregularly spaced, blunt-tipped. Dense, no central pallor.',
                  seen: 'Liver disease (spur cell anaemia), abetalipoproteinaemia, post-splenectomy.' }
            ]) +

            refH('Fragmented') +
            rbcGrid([
                { key: 'schistocytes', name: 'Schistocytes',
                  desc: 'Fragments with straight, sharply cut edges - helmets, triangles, keratocytes. Smaller than a whole cell.',
                  seen: 'Microangiopathic haemolysis (TTP, HUS, DIC), mechanical valve, severe burns.' }
            ]) +

            refH('Round and dense') +
            rbcGrid([
                { key: 'spherocytes', name: 'Spherocytes',
                  desc: 'Small, round, uniformly dense - no central pallor, which is the whole finding.',
                  seen: 'Hereditary spherocytosis; autoimmune haemolytic anaemia.' }
            ]) +

            refH('Elongated') +
            rbcGrid([
                { key: 'elliptocytes', name: 'Elliptocytes',
                  desc: 'Cigar- or rod-shaped; the long axis is more than twice the short.',
                  seen: 'Hereditary elliptocytosis; iron deficiency; MDS.' },
                { key: 'ovalocytes', name: 'Ovalocytes',
                  desc: 'Egg-shaped - the same departure, less of it.',
                  also: 'A spectrum with elliptocytes rather than a separate cell.',
                  seen: 'Megaloblastic anaemia, MDS, thalassaemia.' },
                { key: 'sickleCells', name: 'Sickle cells',
                  desc: 'Crescent or boat-shaped with pointed ends, dense, no pallor.',
                  seen: 'Sickle cell disease. A single one is meaningful.' }
            ]) +

            refH('Teardrop') +
            rbcGrid([
                { key: 'teardropCells', name: 'Teardrop cells',
                  desc: 'Pear-shaped, drawn out to a single blunt tail.',
                  seen: 'Marrow fibrosis and other marrow infiltration; thalassaemia; megaloblastic anaemia.' },
                { key: 'teardropForms', name: 'Teardrop forms',
                  desc: 'The same cell.',
                  also: 'A wording variant offered by the dropdown; both print the same finding.' }
            ]) +
            refNote('A teardrop is a dacrocyte, and in a marrow being read for myelofibrosis it is one of ' +
                'the blood findings that argue for it. See ' + refJump('pmf', 'overt fibrotic PMF') + ' and ' +
                refJump('fibrosis', 'fibrosis grading') + '.') +

            refH('Oxidative injury') +
            refP('Two stages of the same insult: haemoglobin denatures into a Heinz body, which the spleen then ' +
                'removes.') +
            rbcGrid([
                { key: 'blisterCells', name: 'Blister cells',
                  desc: 'Membrane intact, haemoglobin retracted away from one edge, leaving a clear space beneath it.',
                  seen: 'G6PD deficiency, oxidant drugs - before the bite is taken.' },
                { key: 'biteCells', name: 'Bite cells',
                  desc: 'A smooth semicircular defect at the edge, as if bitten out.',
                  seen: 'The same causes, after splenic removal of the Heinz body.' }
            ]) +

            refH('Target') +
            rbcGrid([
                { key: 'targetCells', name: 'Target cells',
                  desc: 'A central button of haemoglobin inside the ring of pallor - a bullseye. Excess membrane for the cell\'s haemoglobin.',
                  seen: 'Liver disease, thalassaemia, haemoglobin C, post-splenectomy, iron deficiency.' }
            ]) +

            refH('Inclusions') +
            rbcGrid([
                { key: 'howellJolly', name: 'Howell-Jolly bodies',
                  desc: 'A single round, dense, dark nuclear remnant, usually eccentric.',
                  seen: 'Absent or non-functioning spleen; megaloblastic anaemia; MDS.' },
                { key: 'basophilicStippling', name: 'Basophilic stippling',
                  desc: 'Many fine blue-purple dots spread evenly through the cell - ribosomal, not nuclear.',
                  seen: 'Lead poisoning, thalassaemia, MDS, pyrimidine 5′-nucleotidase deficiency.' }
            ]) +

            refCite('Photographs from Wikimedia Commons under CC0, CC BY and CC BY-SA licences; each is credited ' +
                'beneath the image.');
    }
});

// Thresholds from docs/who/mds-sf3b1.md and docs/who/mds-h-and-mds-ib.md. The
// morphological definition is the IWGM-MDS consensus (Mufti 2008), which is the
// definition WHO adopted in 2008 and has carried since.
referenceTopics.push({
    id: 'ring-sideroblasts',
    section: 'bench',
    title: 'Ring sideroblasts',
    keywords: ['ring sideroblast', 'sideroblast', 'iron', 'Prussian blue', 'SF3B1', 'mitochondrial', 'IWGM'],
    related: ['mds-sf3b1', 'dysplasia'],
    body: function () {
        return refP('An erythroid precursor with at least five siderotic granules in a perinuclear position, ' +
                'covering at least one third of the nuclear circumference. Counted as a percentage of erythroid ' +
                'precursors, on the aspirate smear - an iron stain on a section gives storage iron, not a ring ' +
                'sideroblast percentage.') +
            refCite('Mufti GJ, Bennett JM, Goasguen J, et al. Diagnosis and classification of myelodysplastic ' +
                'syndrome: International Working Group on Morphology of myelodysplastic syndrome (IWGM-MDS) consensus ' +
                'proposals for the definition and enumeration of myeloblasts and ring sideroblasts. ' +
                '<i>Haematologica</i>. 2008;93(11):1712-1717.') +

            refTable(['Threshold', 'Meaning'], [
                ['&ge; 5%', 'Reportable. Over 90% of MDS cases at this level fall inside MDS-SF3B1.'],
                ['&ge; 15%', 'Substitutes for <i>SF3B1</i> analysis where unavailable, and is the level at ' +
                    'which "MDS with low blasts and ring sideroblasts" is retained as an alternative name for ' +
                    'wildtype-<i>SF3B1</i> cases.']
            ]);
    }
});


/* ============================================================================
   MYELODYSPLASTIC NEOPLASMS
   ========================================================================= */

// docs/who/mds-introduction.md.
referenceTopics.push({
    id: 'mds-overview',
    section: 'mds',
    title: 'The MDS family',
    keywords: ['MDS', 'myelodysplastic', 'overview', 'classification', 'neoplasm'],
    related: ['dysplasia', 'cytopenias', 'blasts', 'ccus'],
    body: function () {
        return refBox({
            title: 'The seven types, in two groups',
            groups: [
                {
                    label: 'Defining genetic abnormality',
                    items: ['MDS-5q', 'MDS-SF3B1', 'MDS-biTP53 - which supersedes both of the above']
                },
                {
                    label: 'Morphologically defined',
                    items: ['MDS-LB', 'MDS-h', 'MDS-IB1', 'MDS-IB2', 'MDS-F']
                }
            ],
            notes: [
                'An <i>SF3B1</i> mutation, or a <i>TP53</i> mutation that is not multi-hit, does not per se override a ' +
                    'diagnosis of MDS-5q. Biallelic <i>TP53</i> inactivation does.',
                '"MDS, unclassifiable" has been removed. The new scheme plus CCUS makes NOS and unclassifiable ' +
                    'unnecessary.'
            ]
        }) +

        refH('Common to every type') +
        refUL([
            'Cytopenia in at least one lineage, and dysplasia at the 10% threshold, unless a defining genetic ' +
                'abnormality carries the case.',
            'Blasts always &lt; 20%.',
            'Evaluation must include marrow and blood smears plus at least one of: karyotype/FISH, mutation ' +
                'analysis, or flow cytometry. Karyotyping remains paramount.'
        ]) +

        refDiverge(refP('ICC\'s seven categories do not map one-to-one:') + refTable(null, [
            ['MDS with mutated <i>SF3B1</i>', '<i>SF3B1</i> at &ge; 10% VAF'],
            ['MDS with del(5q)', 'as WHO'],
            ['MDS, NOS without dysplasia', 'no WHO equivalent - carried by &minus;7/del(7q) or a complex karyotype'],
            ['MDS, NOS with single lineage dysplasia', 'WHO folds both into MDS-LB'],
            ['MDS, NOS with multilineage dysplasia', ''],
            ['MDS with excess blasts', '5-9% marrow, 2-9% blood'],
            ['MDS/AML', '10-19% marrow or blood'],
            ['MDS with mutated <i>TP53</i>', 'multi-hit; the exclusion every other category states']
        ]) + refP('There is no ICC equivalent of MDS-h (hypocellularity is a qualifier on MDS, NOS) or of ' +
            'MDS-F. ICC also has no low-blast requirement written into MDS/AML - the blast count <i>is</i> ' +
            'the category.'));
    }
});

// docs/who/mds-lb.md - essential and desirable criteria verbatim.
referenceTopics.push({
    id: 'mds-lb',
    section: 'mds',
    title: 'MDS with low blasts (MDS-LB)',
    keywords: ['MDS-LB', 'low blasts', 'MDS', 'SLD', 'MLD'],
    related: ['mds-overview', 'dysplasia', 'ccus'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'Cytopenia involving one or more lineages',
                        'Dysplasia involving one or more lineages',
                        '&lt; 5% bone marrow blasts and &lt; 2% peripheral blood blasts',
                        'Exclusion of relevant nutritional deficiencies (e.g. folic acid, vitamin B12)',
                        'Not fulfilling criteria for MDS with defining genetic alterations or hypoplastic MDS'
                    ]
                },
                {
                    label: 'Desirable',
                    items: [
                        'Hypercellular bone marrow for age',
                        'Detection of a clonal cytogenetic and/or molecular abnormality'
                    ]
                }
            ],
            notes: [
                'A clonal marker is desirable, not essential. Where the dysplasia does not meet the 10% ' +
                    'threshold the case is ' + refJump('ccus', 'CCUS') + ' or ' + refJump('icus', 'ICUS') + ' instead.'
            ]
        }) +

        refDiverge(refUL([
            'ICC retains the dysplasia count as named categories: MDS, NOS with single lineage dysplasia and ' +
                'MDS, NOS with multilineage dysplasia, where WHO makes the distinction optional.',
            'ICC also has a category with no dysplasia at all - <i>MDS, NOS without dysplasia</i>: a cytopenia ' +
                'and &lt; 5% marrow blasts with &minus;7/del(7q) or a complex karyotype, carried by the ' +
                'cytogenetics alone. WHO has no equivalent, so a non-dysplastic marrow with monosomy 7 is MDS by ICC ' +
                'and ' + refJump('ccus', 'CCUS') + ' by WHO.'
        ]));
    }
});

// docs/who/mds-h-and-mds-ib.md - essential and desirable criteria verbatim.
referenceTopics.push({
    id: 'mds-h',
    section: 'mds',
    title: 'MDS, hypoplastic (MDS-h)',
    keywords: ['MDS-h', 'hypoplastic', 'hypocellular', 'aplastic anemia', 'PNH', 'immunosuppressive'],
    related: ['cellularity', 'mds-lb'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'Cytopenia involving one or more lineages',
                        'Hypocellular bone marrow (assessed on a trephine core biopsy, adjusted for patient age) not ' +
                            'explained by non-neoplastic bone marrow failure conditions',
                        'Dysplasia involving the granulocytic and/or megakaryocytic lineage',
                        '&lt; 5% blasts in bone marrow and &lt; 2% blasts in peripheral blood',
                        'Not fulfilling criteria for MDS with defining genetic abnormalities or MDS with increased blasts'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of a clonal cytogenetic and/or molecular abnormality']
                }
            ],
            notes: [
                'Hypocellular here means below 30% of normal cellularity under 70 years, below 20% at 70 and ' +
                    'over. Usually diffuse, may be patchy.',
                'Dyserythropoiesis alone does not satisfy the dysplasia criterion, unlike in MDS-LB.',
                'The differential is aplastic anaemia and PNH; at very low cellularity the distinction from aplastic ' +
                    'anaemia may not be possible on cytomorphology.'
            ]
        }) +

        refDiverge('ICC does not recognise hypoplastic MDS as an entity - hypocellularity is a qualifier on ' +
            'MDS, NOS.');
    }
});

// docs/who/mds-h-and-mds-ib.md - essential and desirable criteria verbatim.
referenceTopics.push({
    id: 'mds-ib',
    section: 'mds',
    title: 'MDS with increased blasts (MDS-IB1, IB2, MDS-F)',
    keywords: ['MDS-IB', 'MDS-IB1', 'MDS-IB2', 'MDS-F', 'increased blasts', 'excess blasts', 'MDS/AML', 'ALIP', 'Auer'],
    related: ['blasts', 'fibrosis', 'aml-overview'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'Cytopenia involving one or more lineages',
                        'Dysplasia involving one or more lineages',
                        '&ge; 5% and &lt; 20% blasts in the bone marrow and/or &ge; 2% and &lt; 20% blasts in ' +
                            'the peripheral blood',
                        'Not fulfilling criteria for MDS-biTP53 or AML'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of a clonal cytogenetic and/or molecular abnormality']
                }
            ],
            notes: [
                'The and/or promotes on either limb. A marrow at 7% with 6% blood blasts is MDS-IB2, not ' +
                    'MDS-IB1.'
            ]
        }) +

        refTable(['Subtype', 'Defined by'], [
            ['MDS-IB1', '5-9% marrow and/or 2-4% blood'],
            ['MDS-IB2', '10-19% marrow and/or 5-19% blood, or Auer rods at any count in this range'],
            ['MDS-F', 'The blast criteria with MF-2 or MF-3 fibrosis - about 15% of MDS-IB cases']
        ]) +

        refDiverge(refUL([
            'The blood limb is drawn differently. ICC\'s <i>MDS with excess blasts</i> is 5-9% marrow, ' +
                '2-9% blood, where WHO\'s MDS-IB1 stops at 4% blood. A marrow at 6% with 6% blood blasts is ' +
                'MDS-IB2 by WHO and MDS-EB by ICC - a two-category disagreement produced by the blood count alone.',
            'ICC calls the 10-19% band MDS/AML: 10-19% in the marrow or the blood. Subtyped as ' +
                'mutated <i>TP53</i>, myelodysplasia-related gene mutations, myelodysplasia-related cytogenetic ' +
                'abnormalities, or NOS.',
            'At 10-19% blasts, <i>NPM1</i>, in-frame bZIP <i>CEBPA</i> and <i>TP53</i> leave the MDS/AML ' +
                'category altogether - the first two become AML outright, and <i>TP53</i> becomes the named ' +
                '<i>MDS/AML with mutated TP53</i>.',
            'WHO keeps MDS-IB2 and notes it may be regarded as AML-equivalent for therapy.'
        ]));
    }
});

// docs/who/mds-5q.md - essential criteria verbatim.
referenceTopics.push({
    id: 'mds-5q',
    section: 'mds',
    title: 'MDS with low blasts and 5q deletion (MDS-5q)',
    keywords: ['MDS-5q', 'del(5q)', '5q minus', 'lenalidomide', 'thrombocytosis'],
    related: ['mds-overview', 'mds-bitp53'],
    body: function () {
        return refBox({
            groups: [{
                label: 'Essential',
                items: [
                    'Anaemia, with or without other cytopenias and/or thrombocytosis',
                    'Dysplasia involving megakaryocytes, with or without other lineages',
                    'Blasts &lt; 5% in the bone marrow and &lt; 2% in the peripheral blood',
                    'A 5q deletion, isolated or with one additional cytogenetic aberration other than monosomy 7 ' +
                        'or 7q deletion',
                    'Not fulfilling criteria for MDS-biTP53, MDS with increased blasts, or MDS/MPN'
                ]
            }],
            notes: [
                'The only MDS in which thrombocytosis (&ge; 450 &times; 10<sup>9</sup>/L) is allowed.'
            ]
        }) +

        refDiverge('ICC names it MDS with del(5q) and draws the cytogenetics identically - del(5q) with up to ' +
            'one additional abnormality other than &minus;7/del(7q). Its only stated mutational exclusion is ' +
            'multi-hit <i>TP53</i>.');
    }
});

// docs/who/mds-sf3b1.md - essential criteria verbatim.
referenceTopics.push({
    id: 'mds-sf3b1',
    section: 'mds',
    title: 'MDS with low blasts and SF3B1 mutation (MDS-SF3B1)',
    keywords: ['MDS-SF3B1', 'SF3B1', 'ring sideroblast', 'MDS-RS', 'RARS', 'splicing'],
    related: ['ring-sideroblasts', 'mds-mpn-sf3b1t'],
    body: function () {
        return refBox({
            groups: [{
                label: 'Essential',
                items: [
                    'Cytopenia involving one or more lineages, without thrombocytosis',
                    'Erythroid lineage dysplasia',
                    'Blasts &lt; 5% in the bone marrow and &lt; 2% in the peripheral blood',
                    'An <i>SF3B1</i> mutation - or, if analysis is unavailable, ring sideroblasts &ge; 15% of ' +
                        'erythroid precursors',
                    'Absence of 5q deletion, monosomy 7 / 7q deletion, or complex karyotype',
                    'Not fulfilling criteria for AML, MDS-5q, MDS-biTP53, MDS with increased blasts, or any MDS/MPN'
                ]
            }],
            notes: [
                '"MDS with low blasts and ring sideroblasts" is retained as an acceptable alternative name for cases ' +
                    'with wildtype <i>SF3B1</i> and/or &ge; 15% ring sideroblasts.',
                'A low-blast <i>SF3B1</i>-mutated marrow with thrombocytosis is ' +
                    refJump('mds-mpn-sf3b1t', 'MDS/MPN-SF3B1-T') + ', a different family.'
            ]
        }) +

        refDiverge(refUL([
            'ICC puts a VAF threshold on the mutation: <i>SF3B1</i> at &ge; 10% VAF. WHO states none, ' +
                'so a small <i>SF3B1</i> clone can define the entity by WHO and not by ICC.',
            'ICC excludes a co-occurring <i>RUNX1</i> mutation as well as multi-hit <i>TP53</i>.',
            'ICC states the cytogenetic exclusions positively: any karyotype except isolated del(5q), ' +
                '&minus;7/del(7q), abn3q26.2, or complex.',
            'ICC does not offer the &ge; 15% ring-sideroblast substitute - the mutation is required.'
        ]));
    }
});

// docs/who/mds-bitp53.md - essential and desirable criteria verbatim.
referenceTopics.push({
    id: 'mds-bitp53',
    section: 'mds',
    title: 'MDS with biallelic TP53 inactivation (MDS-biTP53)',
    keywords: ['TP53', 'biTP53', 'multi-hit', 'complex karyotype', 'LOH', 'VAF'],
    related: ['mds-5q', 'mds-sf3b1', 'aml-overview'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'Cytopenia involving one or more lineages',
                        'Dysplasia involving one or more lineages',
                        'Blasts &lt; 20% of cells in the peripheral blood and bone marrow',
                        'Detection of one or more <i>TP53</i> mutations',
                        'In the presence of a single <i>TP53</i> mutation: direct or indirect evidence of ' +
                            '<i>TP53</i> copy loss or copy-neutral loss of heterozygosity'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Complex karyotype (at least three abnormalities)']
                }
            ],
            notes: [
                'No low-blast restriction - anything under 20% qualifies, which is what lets this supersede ' +
                    'MDS-5q, MDS-SF3B1 and the MDS-IB subtypes rather than compete with them.',
                'Monoallelic <i>TP53</i> alteration behaves like wildtype and is not this entity.',
                'Where multi-hit analysis is unavailable: a <i>TP53</i> VAF &ge; 40% and/or complex cytogenetics may ' +
                    'carry a similar prognosis. That is a surrogate, not a criterion.'
            ]
        }) +

        refDiverge('ICC names it MDS with mutated <i>TP53</i> (multi-hit), and splits the blast range three ' +
            'ways where WHO has one category up to 20%: &lt; 10% is MDS with mutated <i>TP53</i>, ' +
            '10-19% is MDS/AML with mutated <i>TP53</i>, and &ge; 20% is AML with mutated ' +
            '<i>TP53</i>. Multi-hit <i>TP53</i> is also the one exclusion every other ICC MDS category states.');
    }
});


/* ============================================================================
   MYELOPROLIFERATIVE NEOPLASMS
   ========================================================================= */

// docs/who/mpn-cml.md; the ICC block is Table 2 of docs/who/icc-2022-arber-blood.md.
referenceTopics.push({
    id: 'cml',
    section: 'mpn',
    title: 'Chronic myeloid leukaemia, BCR::ABL1-positive',
    keywords: ['CML', 'BCR::ABL1', 'Philadelphia', 'basophilia', 'myelocyte peak', 'blast phase'],
    related: ['pv', 'et', 'pmf', 'aml-bcrabl'],
    body: function () {
        return refBox({
            groups: [{
                label: 'Essential',
                items: [
                    'Peripheral blood neutrophilic leukocytosis',
                    'Detection of the Philadelphia chromosome and/or <i>BCR::ABL1</i>'
                ]
            }],
            notes: [
                'The chapter qualifies its own first criterion: "atypical presentations include marked thrombocytosis ' +
                    'without leukocytosis that mimics essential thrombocythaemia". The fusion defines the ' +
                    'disease.',
                'Granulocytic dysplasia should be absent, in blood and marrow. Dysplasia points to an atypical ' +
                    'myeloid neoplasm instead.'
            ]
        }) +

        refH('Supporting morphology') +
        refUL([
            'Neutrophils in various stages of maturation, with peaks in the proportions of myelocytes and ' +
                'segmented neutrophils.',
            'Absolute basophilia and eosinophilia are common.',
            'Megakaryocytes increased in over half of cases, typically small with hypolobated nuclei.',
            '&ge; 20% basophils is a feature of chronic phase with high-risk features - a phase marker, not a ' +
                'diagnostic threshold.'
        ]) +

        refDiverge(refP('ICC retains accelerated phase, which WHO-HAEM5 reads as chronic phase with ' +
            'high-risk features - same findings, different designation:') + refTable(['Accelerated phase', 'Blast phase'], [
            ['Blood or marrow blasts 10-19%', 'Blood or marrow blasts &ge; 20%'],
            ['Peripheral blood basophils &ge; 20%', 'Myeloid sarcoma (extramedullary blast proliferation)'],
            ['An additional clonal cytogenetic abnormality in Ph+ cells - major route: second Ph, +8, i(17q), +19, ' +
                'complex karyotype, or abnormalities of 3q26.2',
             'Morphologically apparent lymphoblasts &gt; 5% warrant consideration of lymphoblastic crisis ' +
                '(immunophenotyping required)']
        ]));
    }
});

// docs/who/mpn-pv.md - the criteria box including both footnotes, verbatim. The
// ICC block is Table 3 of docs/who/icc-2022-arber-blood.md.
referenceTopics.push({
    id: 'pv',
    section: 'mpn',
    title: 'Polycythaemia vera',
    keywords: ['PV', 'polycythemia', 'polycythaemia', 'JAK2', 'exon 12', 'erythropoietin', 'panmyelosis', 'hematocrit'],
    related: ['et', 'pre-pmf', 'post-mpn-mf'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Major criteria',
                    ordered: true,
                    items: [
                        'Elevated haemoglobin (&gt; 16.5 g/dL in men, &gt; 16.0 g/dL in women) or elevated haematocrit ' +
                            '(&gt; 49%<sup>a</sup> in men, &gt; 48% in women)',
                        'Bone marrow biopsy showing age-adjusted hypercellularity with trilineage growth ' +
                            '(panmyelosis), including prominent erythroid, granulocytic and megakaryocytic ' +
                            'proliferation with pleomorphic, mature megakaryocytes (differences in size)<sup>b</sup>',
                        'Presence of <i>JAK2</i> p.V617F or <i>JAK2</i> exon 12 mutation'
                    ]
                },
                {
                    label: 'Minor criterion',
                    items: ['Subnormal serum erythropoietin level']
                }
            ],
            rule: 'Requires either all three major criteria, or the first two major criteria plus the minor ' +
                'criterion.',
            notes: [
                '<sup>a</sup> Haematocrit for diagnosis in the presence of a <i>JAK2</i> mutation. Without one, a ' +
                    'higher target (e.g. 52%) could be considered in men before further investigation is required.',
                '<sup>b</sup> Major criterion 2 may not be required with sustained absolute erythrocytosis - ' +
                    'haemoglobin &gt; 18.5 g/dL in men or &gt; 16.5 g/dL in women, or haematocrit &gt; 55.5% in men ' +
                    'or &gt; 49.5% in women - if major criterion 3 and the minor criterion are present. This is a ' +
                    'second route, not a caveat.',
                'Erythrocytosis may be masked by iron deficiency. WHO declines the term "masked PV" and ' +
                    'assigns such cases MPN-NOS with close follow-up.'
            ]
        }) +

        refDiverge(refUL([
            'ICC\'s criterion 1 retains increased red blood cell mass (&gt; 25% above mean normal predicted ' +
                'value) as a third route beside the haemoglobin and haematocrit thresholds, which are numerically ' +
                'identical to WHO\'s.',
            'The majors are numbered differently, and the shared combination rule therefore reaches a different ' +
                'pair. ICC puts the <i>JAK2</i> mutation second and the biopsy third, so "the first 2 major ' +
                'criteria plus the minor criterion" is a marrow-free route - threshold + mutation + subnormal ' +
                'EPO. WHO\'s first two are threshold + biopsy, a mutation-free route; skipping the biopsy under WHO ' +
                'needs footnote b\'s higher thresholds (which ICC also carries, as its own footnote).',
            'ICC\'s biopsy criterion asks for pleomorphic, mature megakaryocytes "without atypia" where WHO ' +
                'writes "(differences in size)".',
            'In <i>JAK2</i>-negative cases ICC recommends searching for noncanonical or atypical <i>JAK2</i> ' +
                'mutations in exons 12 to 15.'
        ]));
    }
});

// docs/who/mpn-et.md - the criteria box verbatim. The ICC block is Table 4 of
// docs/who/icc-2022-arber-blood.md.
referenceTopics.push({
    id: 'et',
    section: 'mpn',
    title: 'Essential thrombocythaemia',
    keywords: ['ET', 'essential thrombocythemia', 'thrombocythaemia', 'platelet', 'CALR', 'MPL', 'JAK2', 'staghorn'],
    related: ['pre-pmf', 'pv', 'post-mpn-mf'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Major criteria',
                    ordered: true,
                    items: [
                        'Platelet count &ge; 450 &times; 10<sup>9</sup>/L',
                        'Bone marrow biopsy showing proliferation mainly of the megakaryocytic lineage, with ' +
                            'increased numbers of enlarged, mature megakaryocytes with hyperlobulated nuclei; no ' +
                            'significant increase or left shift in neutrophil granulopoiesis or erythropoiesis; very ' +
                            'rarely a minor (grade 1) increase in reticulin fibres',
                        'WHO criteria for <i>BCR::ABL1</i>-positive CML, polycythaemia vera, primary myelofibrosis and ' +
                            'other myeloid neoplasms are not met',
                        '<i>JAK2</i>, <i>CALR</i> or <i>MPL</i> mutation'
                    ]
                },
                {
                    label: 'Minor criterion (either)',
                    items: ['Presence of a clonal marker', 'Exclusion of reactive thrombocytosis']
                }
            ],
            rule: 'Requires either all four major criteria, or the first three plus a minor criterion.',
            notes: [
                'The minor criterion is what allows a triple-negative ET.',
                'Against prefibrotic PMF the distinction is major criterion 2, not the platelet count. ET is ' +
                    'megakaryocytic proliferation alone with mature hyperlobulated forms; pre-PMF adds increased ' +
                    'age-adjusted cellularity, granulocytic proliferation and megakaryocytic <i>atypia</i>.'
            ]
        }) +

        refDiverge('The criteria match; what ICC adds is a footnote putting a number on the clusters: dense ' +
            'clustering is 3 or more megakaryocytes lying adjacent with no other marrow cells between, small ' +
            'clusters of &le; 6 may infrequently be seen in ET, and an increase in huge clusters ' +
            '(&gt; 6 cells) accompanied by granulocytic proliferation is a morphological hallmark of pre-PMF. ' +
            'ICC also specifies assay sensitivity for the drivers: <i>JAK2</i> V617F below 1% VAF, <i>CALR</i> and ' +
            '<i>MPL</i> at 1-3%.');
    }
});

// docs/who/mpn-pmf.md - the criteria box including all three footnotes, verbatim.
// The ICC block is Table 5 of docs/who/icc-2022-arber-blood.md, which settles the
// question the earlier web fetch could not: ICC KEEPS the "absence of reactive
// bone marrow reticulin fibrosis" limb, so triple-negative pre-PMF stands in both
// classifications.
referenceTopics.push({
    id: 'pre-pmf',
    section: 'mpn',
    title: 'Primary myelofibrosis, prefibrotic/early stage',
    keywords: ['pre-PMF', 'prefibrotic', 'primary myelofibrosis', 'triple negative', 'CALR', 'MPL', 'JAK2'],
    related: ['pmf', 'et', 'fibrosis'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Major criteria',
                    ordered: true,
                    items: [
                        'Megakaryocytic proliferation and atypia, without reticulin fibrosis grade &gt; 1, ' +
                            'accompanied by increased age-adjusted bone marrow cellularity, granulocytic ' +
                            'proliferation, and (often) decreased erythropoiesis',
                        'Not meeting criteria for CML, polycythaemia vera, essential thrombocythaemia, myelodysplastic ' +
                            'neoplasms, or other defined myeloid neoplasms',
                        '<i>JAK2</i>, <i>CALR</i> or <i>MPL</i> mutation, or another clonal ' +
                            'marker<sup>b</sup>, or absence of reactive bone marrow fibrosis<sup>c</sup>'
                    ]
                },
                {
                    label: 'Minor criteria',
                    items: [
                        'Anaemia not attributed to a comorbid condition',
                        'Leukocytosis &ge; 11 &times; 10<sup>9</sup>/L',
                        'Splenomegaly detected clinically and/or by imaging',
                        'LDH above the upper limit of the institutional reference range'
                    ]
                }
            ],
            rule: 'Requires all three major criteria and at least one minor criterion, confirmed in two ' +
                'consecutive determinations.',
            notes: [
                'Major criterion 3 is a three-way disjunction ending in a negative, not a driver-mutation ' +
                    'requirement. A triple-negative marrow with no clonal marker still satisfies it if reactive ' +
                    'fibrosis has been excluded - triple-negative PMF is 5-10% of cases.',
                '<sup>b</sup> Absent the three major mutations, look for others associated with myeloid neoplasms ' +
                    '(<i>ASXL1</i>, <i>EZH2</i>, <i>TET2</i>, <i>IDH1</i>, <i>IDH2</i>, <i>SRSF2</i>, <i>SF3B1</i>).',
                '<sup>c</sup> Reactive grade 1 fibrosis: infection, autoimmune or other chronic inflammatory ' +
                    'disorder, hairy cell leukaemia or another lymphoid neoplasm, metastatic malignancy, or toxic ' +
                    '(chronic) myelopathy.'
            ]
        }) +

        refDiverge('ICC keeps the same three-way disjunction, verbatim - "<i>JAK2</i>, <i>CALR</i>, or ' +
            '<i>MPL</i> mutation or presence of another clonal marker or absence of reactive bone marrow reticulin ' +
            'fibrosis" - numbered major criterion 2 where WHO has it third (ICC puts the exclusions third). ' +
            'A triple-negative case with reactive fibrosis excluded therefore stands in both classifications. The ' +
            'fibrosis limit is written "grade &lt; 2" rather than "not above grade 1" - the same line. One minor ' +
            'criterion is narrower: ICC asks for palpable splenomegaly, where WHO accepts splenomegaly ' +
            'detected clinically and/or by imaging.');
    }
});

// docs/who/mpn-pmf.md - the criteria box including all four footnotes, verbatim.
// The ICC block is Table 5 of docs/who/icc-2022-arber-blood.md.
referenceTopics.push({
    id: 'pmf',
    section: 'mpn',
    title: 'Primary myelofibrosis, overt fibrotic stage',
    keywords: ['PMF', 'primary myelofibrosis', 'MF-2', 'MF-3', 'osteosclerosis', 'leukoerythroblastosis',
        'dacrocyte', 'teardrop', 'JAK2', 'CALR', 'MPL', 'triple negative'],
    related: ['pre-pmf', 'fibrosis', 'post-mpn-mf'],
    body: function () {
        return refBox({
            groups: [
                {
                    label: 'Major criteria',
                    ordered: true,
                    items: [
                        'Megakaryocytic proliferation and atypia, accompanied by reticulin and/or collagen fibrosis ' +
                            'grade 2 or 3',
                        'Not meeting criteria for CML, polycythaemia vera, essential thrombocythaemia, myelodysplastic ' +
                            'neoplasms, or other defined myeloid neoplasms<sup>b</sup>',
                        '<i>JAK2</i>, <i>CALR</i> or <i>MPL</i> mutation, or another clonal ' +
                            'marker<sup>c</sup>, or absence of reactive bone marrow fibrosis<sup>d</sup>'
                    ]
                },
                {
                    label: 'Minor criteria',
                    items: [
                        'Anaemia not attributed to a comorbid condition',
                        'Leukocytosis &ge; 11 &times; 10<sup>9</sup>/L',
                        'Splenomegaly detected clinically and/or by imaging',
                        'LDH above the upper limit of the institutional reference range',
                        'Leukoerythroblastosis'
                    ]
                }
            ],
            rule: 'Requires all three major criteria and at least one minor criterion, met in two consecutive ' +
                'determinations.',
            notes: [
                'Leukoerythroblastosis is the one minor criterion the prefibrotic box does not have.',
                '<sup>b</sup> MPNs can be associated with monocytosis and may mimic CMML. A history of MPN ' +
                    'excludes CMML; MPN marrow features and/or a <i>JAK2</i>, <i>CALR</i> or <i>MPL</i> mutation ' +
                    'support MPN with monocytosis instead.',
                '<sup>c</sup> As for prefibrotic PMF - other myeloid-neoplasm mutations may establish clonality.',
                '<sup>d</sup> Reactive fibrosis: infection, autoimmune or other chronic inflammatory condition, hairy ' +
                    'cell leukaemia or another lymphoid neoplasm, metastatic malignancy, or toxic (chronic) myelopathy.'
            ]
        }) +

        refDiverge('ICC\'s box matches, including the disjunction\'s third limb ("or absence of reactive ' +
            'myelofibrosis") and leukoerythroblastosis as the fifth minor; the numbering differs (ICC puts the ' +
            'exclusions third, the mutation/clonal-marker/no-reactive-fibrosis criterion second), and ICC\'s ' +
            'splenomegaly minor asks for a palpable spleen where WHO accepts detection clinically and/or ' +
            'by imaging. Its monocytosis footnote is WHO\'s note b in the same words: a history of MPN excludes ' +
            'CMML, and a higher driver-mutation VAF supports PMF with monocytosis over CMML.');
    }
});

// docs/who/mpn-pv.md and docs/who/mpn-et.md - both boxes verbatim
// (adapted from Barosi et al., Leukemia 2008).
referenceTopics.push({
    id: 'post-mpn-mf',
    section: 'mpn',
    title: 'Post-PV and post-ET myelofibrosis',
    keywords: ['post-PV', 'post-ET', 'myelofibrosis', 'IWG-MRT', 'progression', 'splenomegaly'],
    related: ['pv', 'et', 'pmf'],
    body: function () {
        return refBox({
            title: 'Post-polycythaemia vera myelofibrosis',
            groups: [
                {
                    label: 'Required',
                    items: [
                        'A previous diagnosis of WHO-defined polycythaemia vera',
                        'Bone marrow fibrosis of grade 2-3 on a scale of 0-3'
                    ]
                },
                {
                    label: 'Additional (two required)',
                    items: [
                        'Anaemia (below the reference range for age, sex and altitude) or sustained loss of the ' +
                            'requirement for phlebotomy (without cytoreductive therapy) or for cytoreductive treatment ' +
                            'of erythrocytosis',
                        'Leukoerythroblastosis',
                        'Increasing splenomegaly - palpable splenomegaly increased &gt; 50 mm from baseline, or newly ' +
                            'palpable',
                        'Any two of: &gt; 10% weight loss in 6 months, night sweats, unexplained fever (&gt; 37.5 &deg;C)'
                    ]
                }
            ]
        }) +

        refBox({
            title: 'Post-essential thrombocythaemia myelofibrosis',
            groups: [
                {
                    label: 'Required',
                    items: [
                        'A previous diagnosis of WHO-defined essential thrombocythaemia',
                        'Bone marrow fibrosis of grade 2-3 on a scale of 0-3'
                    ]
                },
                {
                    label: 'Additional',
                    items: [
                        'Anaemia (below the reference range for age, sex and altitude) and a &gt; 2 g/dL ' +
                            'decrease from baseline haemoglobin',
                        'Leukoerythroblastosis',
                        'Increasing splenomegaly - palpable splenomegaly increased &gt; 50 mm from baseline (or on ' +
                            'imaging), or newly palpable',
                        'Elevated LDH (above the reference range)',
                        'Any two of: &gt; 10% weight loss in 6 months, night sweats, unexplained fever (&gt; 37.5 &deg;C)'
                    ]
                }
            ],
            rule: 'Requires both required criteria and at least two additional criteria.',
            notes: [
                'Post-ET MF has a fifth additional criterion (LDH) and a stricter anaemia clause.'
            ]
        });
    }
});


// docs/who/mpn-cnl.md - the chapter with Box 2.03, verbatim. The ICC block is
// Table 6 of docs/who/icc-2022-arber-blood.md. The paste CONFIRMED the dx rule's
// WHO-side claims (threshold 25 of every case, seg+band >= 80%, the CMML-level
// monocytosis and dysgranulopoiesis exclusions) rather than correcting them.
referenceTopics.push({
    id: 'cnl',
    section: 'mpn',
    title: 'Chronic neutrophilic leukaemia',
    keywords: ['CNL', 'chronic neutrophilic', 'CSF3R', 'T618I', 'neutrophilia', 'SETBP1'],
    related: ['cml', 'cmml', 'mpn-u'],
    body: function () {
        return refBox({
            title: 'CNL - WHO-HAEM5 (Box 2.03)',
            groups: [{
                label: 'Criteria',
                items: [
                    'Peripheral blood: WBC count &ge; 25 &times; 10<sup>9</sup>/L; segmented plus banded ' +
                        'neutrophils &ge; 80% of the WBCs; neutrophil precursors (promyelocytes, myelocytes, and ' +
                        'metamyelocytes) &lt; 10% of the WBCs; myeloblasts rarely observed; monocytes &lt; 10% of ' +
                        'the leukocytes; absolute monocytosis not meeting criteria for chronic myelomonocytic ' +
                        'leukaemia; no dysgranulopoiesis',
                    'Bone marrow: hypercellular; neutrophil granulocytes increased in percentage and ' +
                        'number; neutrophil maturation appears normal; myeloblasts &lt; 5% of the nucleated cells',
                    'Not meeting diagnostic criteria for CML, polycythaemia vera, essential thrombocythaemia, or ' +
                        'primary myelofibrosis, and exclusion of reactive neutrophilia',
                    'No evidence of disease-defining gene rearrangements such as in <i>PDGFRA</i>, <i>PDGFRB</i>, ' +
                        'or <i>FGFR1</i>, and no <i>PCM1</i>::<i>JAK2</i> fusion',
                    'Presence of <i>CSF3R</i> p.T618I or another activating <i>CSF3R</i> mutation - or ' +
                        'persistent neutrophilia (&ge; 3 months), splenomegaly, and no identifiable cause of ' +
                        'reactive neutrophilia, including absence of a plasma cell neoplasm (or, if one is ' +
                        'present, demonstration of clonality of myeloid cells by cytogenetic or molecular studies)'
                ]
            }],
            notes: [
                'The plasma-cell clause is load-bearing: a neutrophilic leukaemoid reaction from G-CSF-' +
                    'producing neoplastic plasma cells is the great mimic, and toxic granulation and Döhle ' +
                    'bodies favour the mimic over CNL.'
            ]
        }) +

        refDiverge(refUL([
            'The white cell threshold. ICC lowers it to &ge; 13 &times; 10<sup>9</sup>/L when an ' +
                'activating <i>CSF3R</i> mutation is present (&ge; 25 without one); WHO holds &ge; 25 of every ' +
                'case.',
            'ICC defines phases in a footnote - 10-19% blasts in blood or marrow is accelerated phase, ' +
                '&ge; 20% blast phase - which WHO\'s box does not.',
            'WHO\'s marrow criterion carries an explicit myeloblasts &lt; 5% clause that ICC\'s does not, ' +
                'and WHO names the <i>PCM1</i>::<i>JAK2</i> fusion specifically where ICC excludes the whole ' +
                'M/LN-eo family.'
        ])) +

        refP('<i>CSF3R</i> is the diagnostic genetic signature (mutated in &gt; 60% of CNL versus &lt; 20% of ' +
            'MDS/MPN with neutrophilia), but its absence does not exclude CNL. Nearly all cases also carry ' +
            '<i>ASXL1</i>, <i>TET2</i> and/or <i>DNMT3A</i> mutations, and <i>ASXL1</i> carries a worse ' +
            'prognosis. Monocytosis, eosinophilia or basophilia are notably absent - their presence, or ' +
            'dysgranulopoiesis, should prompt a critical review toward ' + refJump('cmml', 'CMML') + ' or ' +
            'MDS/MPN with neutrophilia (atypical CML).');
    }
});

// docs/who/mpn-nos.md - the chapter with Box 2.14, verbatim. The ICC block is
// Table 9 of docs/who/icc-2022-arber-blood.md. THE PASTED BOX CORRECTED THE
// mpnU RULE: its clonality criterion is "driver mutations ... OR ANOTHER CLONAL
// MARKER" in both classifications, and the rule had gated on the driver alone -
// see dxMpnUClonality in MarrowDxMpn.js.
referenceTopics.push({
    id: 'mpn-u',
    section: 'mpn',
    title: 'MPN, NOS (unclassifiable)',
    keywords: ['MPN-U', 'MPN-NOS', 'unclassifiable', 'not otherwise specified', 'early phase', 'splanchnic',
        'portal vein thrombosis'],
    related: ['pv', 'et', 'pre-pmf'],
    body: function () {
        return refBox({
            title: 'MPN-NOS - WHO-HAEM5 (Box 2.14)',
            groups: [
                {
                    label: 'Requires all three',
                    ordered: true,
                    items: [
                        'Presence of any one of: clinical and haematological features of an MPN (e.g. ' +
                            'splenomegaly, leukocytosis, thrombocytosis) in the absence of significant monocytosis ' +
                            'and significant eosinophilia; or bone marrow hypercellularity with ' +
                            'megakaryocytic hyperplasia and varying degrees of granulocytic and erythroid ' +
                            'hyperplasia, without dysplastic features; or clinical and morphological ' +
                            'features can be discrepant<sup>a</sup>',
                        'Not meeting criteria for any other MPN, MDS, MDS/MPN<sup>b</sup>, or myeloid/lymphoid ' +
                            'neoplasms with eosinophilia and tyrosine kinase gene fusions',
                        'Presence of driver mutations such as <i>JAK2</i>, <i>CALR</i>, or <i>MPL</i> mutations, ' +
                            'or another clonal marker<sup>c</sup>'
                    ]
                },
                {
                    label: 'Requires the absence of both',
                    items: [
                        'Insufficient clinical data or inadequate bone marrow specimen for accurate evaluation ' +
                            'and classification',
                        'Recent history of cytotoxic or growth factor therapy, particularly when dysplastic ' +
                            'features are seen'
                    ]
                }
            ],
            notes: [
                '<sup>a</sup> The report should describe the morphology, summarise why a specific subtype cannot ' +
                    'be assigned, name the MPN types that <i>can</i> be excluded, and recommend further workup - ' +
                    'expanded molecular testing or a repeat blood/marrow within a reasonable interval.',
                '<sup>b</sup> Effects of previous treatment, severe comorbidity, and changes of natural disease ' +
                    'progression must be excluded.',
                '<sup>c</sup> Absent the three major mutations, other myeloid-neoplasm mutations (e.g. ' +
                    '<i>ASXL1</i>, <i>EZH2</i>, <i>TET2</i>, <i>IDH1</i>, <i>IDH2</i>, <i>SRSF2</i>, ' +
                    '<i>SF3B1</i>) and translocations such as those involving <i>ABL1</i> may confirm clonality.'
            ]
        }) +

        refDiverge('ICC\'s Table 9 carries the same three positive criteria - including the identical ' +
            '"or presence of another clonal marker" limb - without WHO\'s two explicit negative requirements ' +
            '(adequate data and specimen; no recent cytotoxic or growth factor therapy), and states the ' +
            'reactive-fibrosis exclusions as a footnote on criterion 1. ICC names BCR::ABL1-positive CML in its ' +
            'exclusion list where WHO folds CML under "any other MPN" and adds the M/LN-eo family.') +

        refP('The category is for cases whose features prevent a clear subtype diagnosis: very early disease ' +
            'where thresholds are not yet met (follow closely - the subtype tends to declare itself), ' +
            'presentations with otherwise unexplained splanchnic or portal vein thrombosis, and burnt-out ' +
            'late-stage marrows with no earlier histology. It is limited to &le; 5% of MPN diagnoses, and should ' +
            'not stand in for an incomplete workup. Blasts of 10-19% mark accelerated phase and &ge; 20% blast ' +
            'phase; prominent cytopenia or dysplasia should prompt definitive exclusion of MDS/MPN.') +

        refNote('WHO-HAEM5 titles the entity MPN, NOS (unclassifiable) and keeps "myeloproliferative ' +
            'neoplasm, unclassifiable" as acceptable terminology; ICC uses MPN, unclassifiable outright.');
    }
});


/* ============================================================================
   MDS/MPN AND THE BOUNDARIES
   ========================================================================= */

// WHO-HAEM5 Box 2.19 from docs/who/cmml-box-2.19.md, transcribed with all six
// footnotes; ICC Table 13 verbatim from docs/who/cmml-table-2.13-and-icc-table-13.md;
// chapter text from docs/who/mdsmpn-introduction-and-cmml.md.
//
// THE PASTED BOX CORRECTED THE RECONSTRUCTION IN TWO PLACES, both in the SHAPE
// of a criterion: essential criterion 3 reads "not meeting diagnostic criteria
// of CML or other MPNs" - the reconstruction had appended "or for AML", an
// exclusion the box does not carry (the <20% criterion and, for the defining
// genetics, the chapter text do that work) - and criterion 4 is "not meeting
// diagnostic criteria of M/LN-eo with tyrosine kinase gene fusions (e.g. ...)",
// not a closed rearrangement list. Seven sources pasted, seven corrections.
referenceTopics.push({
    id: 'cmml',
    section: 'overlap',
    title: 'Chronic myelomonocytic leukaemia',
    keywords: ['CMML', 'monocytosis', 'monocyte', 'oligomonocytic', 'promonocyte', 'MD-CMML', 'MP-CMML'],
    related: ['blasts', 'pmf', 'dysplasia'],
    body: function () {
        return refBox({
            title: 'CMML - WHO-HAEM5 (Box 2.19)',
            groups: [
                {
                    label: 'Essential',
                    ordered: true,
                    items: [
                        'Persistent absolute (&ge; 0.5 &times; 10<sup>9</sup>/L) and relative ' +
                            '(&ge; 10%) peripheral blood monocytosis',
                        'Blasts constitute &lt; 20% of the cells in the peripheral blood and bone ' +
                            'marrow<sup>a</sup>',
                        'Not meeting diagnostic criteria of chronic myeloid leukaemia or other myeloproliferative ' +
                            'neoplasms<sup>b</sup>',
                        'Not meeting diagnostic criteria of myeloid/lymphoid neoplasms with eosinophilia and ' +
                            'tyrosine kinase gene fusions (e.g. <i>PDGFRA</i>, <i>PDGFRB</i>, <i>FGFR1</i>, or ' +
                            '<i>JAK2</i>)<sup>c</sup>'
                    ]
                },
                {
                    label: 'Desirable',
                    ordered: true,
                    items: [
                        'Dysplasia involving &ge; 1 myeloid lineages<sup>d</sup>',
                        'Acquired clonal cytogenetic or molecular abnormality<sup>e</sup>',
                        'Abnormal partitioning of peripheral blood monocyte subsets<sup>f</sup>'
                    ]
                }
            ],
            rule: 'Essential criteria must be present in all cases. If monocytosis is &ge; 1 &times; ' +
                '10<sup>9</sup>/L: one or more desirable criteria must be met. If monocytosis is &lt; 1 ' +
                '&times; 10<sup>9</sup>/L: desirable criteria 1 and 2 must be met.',
            notes: [
                '<sup>a</sup> Blasts and blast equivalents include myeloblasts, monoblasts, and promonocytes.',
                '<sup>b</sup> MPNs can be associated with monocytosis at presentation or during the course of ' +
                    'disease and can mimic CMML. A documented history of MPN excludes CMML; MPN marrow ' +
                    'features and/or a high burden of MPN-associated mutations (<i>JAK2</i>, <i>CALR</i>, ' +
                    '<i>MPL</i>) tend to support MPN with monocytosis rather than CMML.',
                '<sup>c</sup> To be specifically excluded in cases with eosinophilia.',
                '<sup>d</sup> Morphological dysplasia in &ge; 10% of cells of the lineage in the bone marrow.',
                '<sup>e</sup> See Table 2.13.',
                '<sup>f</sup> Increased classic monocytes (&gt; 94%), in the absence of known active autoimmune ' +
                    'disease and/or systemic inflammatory syndromes.',
                'The count-dependent requirement rule is how oligomonocytic CMML came in from MDS. The 0.5-1.0 ' +
                    'band is the strict one - dysplasia <i>and</i> clonality, with monocyte partitioning ' +
                    'substituting for neither.'
            ]
        }) +

        refTable(['Subtyping', 'Cut-off'], [
            ['MD- / MP-CMML', 'White cell count &lt; 13 versus &ge; 13 &times; 10<sup>9</sup>/L'],
            ['CMML-1 / CMML-2', 'Blasts and promonocytes: &lt; 5% blood and &lt; 10% marrow, versus ' +
                '&ge; 5% blood or &ge; 10% marrow (each &lt; 20%). CMML-0 has been removed.']
        ]) +

        refDiverge(refUL([
            'Clonality is required of every case - abnormal cytogenetics and/or a myeloid-neoplasm-associated ' +
                'mutation at VAF &ge; 10% - where WHO makes it desirable.',
            'A cytopenia is required, at MDS thresholds, which WHO does not ask for - with one stated ' +
                'exception: a small proportion of early-phase cases may show only borderline or no cytopenia, and ' +
                'those need marrow morphology, flow cytometry and molecular data to carry the diagnosis.',
            'The non-clonal route needs monocytes &ge; 1.0 &times; 10<sup>9</sup>/L and &gt; 10%, plus ' +
                'increased blasts (&ge; 5% marrow and/or &ge; 2% blood), or dysplasia, or a CMML-consistent ' +
                'immunophenotype. Those blast thresholds are not the CMML-1/CMML-2 split.',
            'Two lesser categories WHO does not name: CMUS, and CCMUS where a cytopenia is present.'
        ]));
    }
});

// docs/who/mdsmpn-sf3b1t.md - the chapter with Box 2.21, verbatim; the ICC side
// is Table 16 of docs/who/icc-2022-arber-blood.md, compressed into the
// divergence block now that WHO's own box leads. THE PASTE CORRECTED THE RULE'S
// DIVERGENCE STRING, which had the ring-sideroblast direction backwards and a
// WHO VAF floor from nowhere - see mdsMpnSf3b1T in MarrowDxMdsMpn.js.
//
// THE CHAPTER DISAGREES WITH ITSELF in two places and both are transcribed
// rather than resolved: its prose summary makes the JAK2/MPL/CALR co-mutation
// DESIRABLE where Box 2.21 lists it among the molecular criteria (with a
// 3-month-thrombocytosis substitute), and the prose writes platelets >= 450
// where the box writes > 450. The note on the box says so.
referenceTopics.push({
    id: 'mds-mpn-sf3b1t',
    section: 'overlap',
    title: 'MDS/MPN with SF3B1 and thrombocytosis',
    keywords: ['MDS/MPN-SF3B1-T', 'SF3B1', 'thrombocytosis', 'RARS-T', 'ring sideroblast'],
    related: ['mds-sf3b1', 'ring-sideroblasts'],
    body: function () {
        return refP('A low-blast, <i>SF3B1</i>-mutated, ring-sideroblastic marrow with a raised platelet count. ' +
                'MDS-SF3B1\'s first essential criterion reads "cytopenia involving one or more lineages, without ' +
                'thrombocytosis"; this is where the excluded case goes.') +

            refBox({
                title: 'MDS/MPN-SF3B1-T - WHO-HAEM5 (Box 2.21)',
                groups: [
                    {
                        label: 'Peripheral blood',
                        items: [
                            'Anaemia (haemoglobin below the normal range)',
                            'Thrombocytosis (platelet count &gt; 450 &times; 10<sup>9</sup>/L)',
                            'No or very rare blast cells'
                        ]
                    },
                    {
                        label: 'Bone marrow cytology',
                        items: ['Dysplasia, especially dyserythropoiesis with ring sideroblasts']
                    },
                    {
                        label: 'Molecular analyses of blood or bone marrow',
                        items: [
                            '<i>SF3B1</i> heterozygous mutation',
                            'Concurrent <i>JAK2</i> p.V617F or, in its absence, mutation in another ' +
                                'myeloproliferative gene such as <i>MPL</i> or <i>CALR</i>'
                        ]
                    },
                    {
                        label: 'If molecular analyses are unavailable',
                        items: [
                            'Sustained thrombocytosis for &ge; 3 months substitutes the <i>JAK2</i>, <i>MPL</i>, ' +
                                'or <i>CALR</i> mutation',
                            '&ge; 15% ring sideroblasts substitutes the <i>SF3B1</i> mutation'
                        ]
                    },
                    {
                        label: 'To be excluded',
                        items: [
                            'Therapy-related myeloid neoplasms',
                            'MDS with isolated del(5q)',
                            'Myeloid neoplasms with a double-hit <i>TP53</i> alteration',
                            'Myeloid neoplasms with t(3;3)(q21.3;q26.2) or inv(3)(q21.3q26.2)',
                            'Disease-defining gene fusions such as <i>BCR</i>::<i>ABL1</i>'
                        ]
                    }
                ],
                notes: [
                    'The chapter states its criteria twice, and the two differ. Its prose summary makes the ' +
                        'essential set "anaemia with dysplastic erythropoiesis and &ge; 15% ring sideroblasts; ' +
                        'persistent thrombocytosis &ge; 450 &times; 10<sup>9</sup>/L; <i>SF3B1</i> mutation or ' +
                        'biologically similar spliceosome and signalling mutations; exclusions" - with the ' +
                        'concurrent <i>JAK2</i> p.V617F listed as desirable, where the box above lists the ' +
                        'co-mutation among the molecular criteria. Both are the chapter\'s words.',
                    'MDS-SF3B1 that acquires a <i>JAK2</i>, <i>MPL</i>, or <i>CALR</i> mutation with resultant ' +
                        'thrombocytosis may be classified as this entity - the box\'s own "specific ' +
                        'situation".'
                ]
            }) +

            refDiverge(refUL([
                'ICC requires the <i>SF3B1</i> mutation at VAF &gt; 10% and does not require ring ' +
                    'sideroblasts with it; WHO\'s essential criteria ask for &ge; 15% ring sideroblasts and ' +
                    'state no VAF floor.',
                'ICC bounds the blasts numerically - &lt; 1% blood and &lt; 5% marrow - where WHO writes "no or ' +
                    'very rare blast cells", and asks for no co-mutation (<i>JAK2</i> supports, never gates).',
                'Clonal evolution is ruled in opposite directions: WHO may reclassify MDS-SF3B1 that ' +
                    'acquires a driver with thrombocytosis as this entity; ICC regards it as thrombocytotic ' +
                    'progression of MDS-SF3B1, and requires both cytoses at initial diagnosis.',
                'For the <i>SF3B1</i>-wildtype case with &ge; 15% ring sideroblasts, ICC keeps a separate ' +
                    'MDS/MPN-RS-T, NOS; WHO renders "MDS/MPN with ring sideroblasts and thrombocytosis" ' +
                    '(its acceptable alternative name) and calls it management-equivalent.'
            ])) +

            refP('Previously refractory anaemia with ring sideroblasts and thrombocytosis (RARS-T), a name ' +
                'WHO-HAEM5 now lists as not recommended.');
    }
});

// docs/who/ch-clonal-hematopoiesis.md - essential criteria verbatim; the gene
// list is Table 2.02 (docs/who/ch-table-2.02-driver-genes.md).
referenceTopics.push({
    id: 'chip',
    section: 'overlap',
    title: 'Clonal haematopoiesis (CHIP)',
    keywords: ['CHIP', 'clonal hematopoiesis', 'ARCH', 'VAF', 'DNMT3A', 'TET2', 'ASXL1', 'VEXAS'],
    related: ['ccus', 'icus', 'cytopenias'],
    body: function () {
        return refBox({
            groups: [{
                label: 'Essential',
                items: [
                    'One or more somatic mutations in the CH driver genes of Table 2.02, at a variant allele ' +
                        'frequency &ge; 2% (&ge; 4% for X-linked genes in male patients), in DNA from blood or ' +
                        'bone marrow',
                    'Absence of unexplained cytopenias',
                    'Absence of features diagnostic for defined myeloid neoplasms'
                ]
            }],
            notes: [
                'Mutations outside the regions specified in Table 2.02 may qualify if predicted deleterious ' +
                    'and not rare non-pathogenic variants.',
                'Explainable abnormal red cell indices, or an idiopathically raised RDW or MCV, do not preclude the ' +
                    'diagnosis.',
                'There are no histopathological features of CHIP - their absence is integral to the definition.',
                'VEXAS syndrome is the exception to "no clinical features": somatic <i>UBA1</i> mutation with a ' +
                    'systemic autoinflammatory syndrome, and cytoplasmic vacuoles in myeloid and erythroid ' +
                    'precursors. A marrow meeting MDS criteria is diagnosed as MDS.'
            ]
        }) +

        refDiverge('ICC uses the same VAF &ge; 2% threshold but a broader trigger: "a somatic mutation in a ' +
            'myeloid neoplasm driver gene (at VAF &ge; 2%) or a non-MDS-defining clonal cytogenetic ' +
            'aberration in a patient lacking a myeloid neoplasm or unexplained cytopenia". WHO requires a ' +
            'mutation in a Table 2.02 gene, so a clonal karyotypic abnormality alone is CHIP by ICC and unnamed by ' +
            'WHO.');
    }
});

// docs/who/ccus.md - essential criteria verbatim, plus the Histopathology and
// Clinical features sentences that qualify them.
//
// THE CHAPTER CORRECTED TWO THINGS ASSERTED HERE FROM MEMORY. The boundary said
// "a somatic mutation demonstrating clonality", where the criteria allow EITHER a
// Table 2.02 mutation at VAF >= 2% OR a clonal chromosomal abnormality - so a
// cytopenic marrow whose only clonal evidence is a karyotype is CCUS, and this
// page said it was not. And the ICC divergence claimed ICC "puts a duration on
// the cytopenia, which WHO does not"; WHO says "usually of 4 months or longer in
// duration" in Clinical features. Six for six.
referenceTopics.push({
    id: 'ccus',
    section: 'overlap',
    title: 'Clonal cytopenia (CCUS)',
    keywords: ['CCUS', 'clonal cytopenia', 'undetermined significance', 'cytopenia', 'VAF', 'karyotype'],
    related: ['chip', 'icus', 'cytopenias', 'mds-lb'],
    body: function () {
        return refBox({
            title: 'CCUS',
            groups: [{
                label: 'Essential',
                items: [
                    'One or more somatic mutations involving the CH driver genes of Table 2.02 at a VAF &ge; 2% ' +
                        '(&ge; 4% for X-linked genes in male patients) in DNA from blood or bone marrow, or a ' +
                        'clonal chromosomal abnormality',
                    'One or more otherwise unexplained persistent cytopenias',
                    'Absence of features diagnostic for defined myeloid neoplasms on bone marrow examination'
                ]
            }],
            notes: [
                'Either limb of the first criterion will do. A cytopenic marrow whose only clonal evidence is ' +
                    'a karyotypic abnormality is CCUS - unlike CHIP, whose criteria name only the gene list.',
                'Persistent means "usually of 4 months or longer in duration".',
                'Dysplastic changes, if present, must fall short of the diagnostic criteria for MDS. Blasts ' +
                    'should not be increased.',
                'Array-based techniques, flow cytometry and immunohistochemistry are not recommended as sole ' +
                    'diagnostic modalities. Clonal chromosomal abnormalities may be shown by karyotype, FISH or NGS.'
            ]
        }) +

        refP('About 30% of people with one or more cytopenias have a detectable myeloid driver mutation or ' +
            'chromosomal abnormality, and so meet the criteria for CCUS. Without one, the case is ' +
            refJump('icus', 'ICUS') + '.') +

        refH('Risk of progression') +
        refP('Greater with a larger clone, with more somatic alterations, and with mutations in ' +
            '<i>TP53</i>, <i>PPM1D</i>, <i>JAK2</i>, <i>RUNX1</i>, <i>SF3B1</i>, <i>SRSF2</i>, <i>U2AF1</i>, ' +
            '<i>IDH2</i> or <i>IDH1</i>. The number and severity of the cytopenias may also matter, particularly ' +
            'after cytotoxic therapy. An isolated <i>DNMT3A</i> mutation appears to carry a low risk.') +
        refNote('This is not the same list the CHIP chapter publishes - CCUS adds <i>PPM1D</i>, <i>JAK2</i> and ' +
            '<i>RUNX1</i>, and drops <i>ASXL1</i>.') +

        refDiverge(refUL([
            'ICC states the duration in the definition rather than descriptively: "the cytopenia is persistent ' +
                '(4 months or longer in duration), idiopathic, and not caused by another comorbid condition, which ' +
                'must be carefully excluded". WHO says "usually of 4 months or longer" in its clinical features, so ' +
                'the two agree on the number and differ on how binding it is.',
            'Same clone threshold: "a threshold VAF of &ge; 2% is recommended for CCUS and other premalignant clonal ' +
                'cytopenias".',
            'A non-dysplastic cytopenic marrow with &minus;7/del(7q) or a complex karyotype is not CCUS by ' +
                'ICC - it is ' + refJump('mds-lb', 'MDS, NOS without dysplasia') + '. By WHO it remains CCUS, since ' +
                'a clonal chromosomal abnormality is exactly what its first criterion accepts.'
        ]));
    }
});

// docs/who/ccus.md defines it, in one sentence of the CCUS chapter's Clinical
// features. ICUS has no chapter and no criteria box of its own in WHO-HAEM5; it
// is the residue of CCUS's, which is what the box below says.
//
// NOTE THE SPELLING. The chapter writes "idiopathic cytopenia of UNKNOWN
// significance". The literature, this app's rule name and the ICUS initialism as
// everyone says it use "undetermined". Both are printed here; the rule's `who`
// string still says "undetermined" and is report-facing.
referenceTopics.push({
    id: 'icus',
    section: 'overlap',
    title: 'Idiopathic cytopenia (ICUS)',
    keywords: ['ICUS', 'idiopathic cytopenia', 'undetermined significance', 'unknown significance'],
    related: ['ccus', 'chip', 'cytopenias'],
    body: function () {
        return refP('Defined by a single sentence of the CCUS chapter: "Some cytopenias will be sustained and ' +
                'unexplained without meeting diagnostic criteria for CCUS; such cases should be termed ‘idiopathic ' +
                'cytopenia of unknown significance’." It has no chapter and no criteria box of its own - it is ' +
                'the residue of CCUS\'s.') +

            refBox({
                title: 'ICUS - CCUS’s criteria, failed at the clone',
                groups: [{
                    label: 'All must hold',
                    items: [
                        'One or more otherwise unexplained persistent cytopenias - usually 4 months or longer',
                        'No qualifying somatic mutation and no clonal chromosomal abnormality',
                        'Absence of features diagnostic for a defined myeloid neoplasm on bone marrow examination - ' +
                            'dysplasia falling short of MDS criteria, blasts not increased'
                    ]
                }],
                notes: [
                    '"No mutation identified" is not "no clone": it depends on what was sequenced and how deeply, and ' +
                        'no sequencing at all is not evidence. The karyotype matters equally - a clonal ' +
                        'chromosomal abnormality alone makes the case CCUS.',
                    'The MDS exclusions still apply: clinical and drug history known, nutritional deficiency ' +
                        'excluded, no reclassification during growth factor therapy.'
                ]
            }) +

            refNote('WHO spells it "unknown" significance; the literature and this app use ' +
                '"undetermined".') +

            refDiverge('ICC does not use the term at all. ICC defines CHIP and CCUS and stops there, so a ' +
                'cytopenia with no clone and no dysplasia has no ICC name. Reporting ICUS is a WHO-side statement.');
    }
});


// docs/who/mn-pct.md - the chapter, verbatim. The entity every AML and
// differentiation-family box's "not fulfilling diagnostic criteria for myeloid
// neoplasm post cytotoxic therapy" exclusion points at. It corrected the shape
// of three code comments that had called prior therapy "a qualifier in both
// classifications" - WHO-HAEM5 KEEPS it as an entity (9920/3); ICC is the one
// that demoted it to a qualifier. Box 2.27 (the implicated agents) and Table
// 2.20 are referenced by the chapter but not pasted; nothing here lists agents
// beyond the chapter's own prose.
referenceTopics.push({
    id: 'mn-pct',
    section: 'overlap',
    title: 'Myeloid neoplasm post cytotoxic therapy',
    keywords: ['MN-pCT', 'post cytotoxic therapy', 'therapy-related', 't-MDS', 't-AML', 'therapy related',
        'alkylating', 'topoisomerase', 'PARP1', 'radiation', 'PPM1D', 'TP53', 'latency'],
    related: ['aml-overview', 'aml-mr', 'aml-diff', 'mds-bitp53', 'chip'],
    body: function () {
        return refP('The category over MDS, MDS/MPN and AML arising after DNA-damaging cytotoxic ' +
                'chemotherapy and/or large-field radiation therapy - an entity in WHO-HAEM5, replacing ' +
                '"therapy-related" naming. The underlying neoplasm is worked up exactly as its de novo ' +
                'counterpart; the history then moves the case here.') +

            refBox({
                title: 'MN-pCT - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        'Myeloid neoplasm meeting the diagnostic criteria for any MDS, MDS/MPN, or AML',
                        'History of prior exposure to cytotoxic therapy and/or large-field radiation ' +
                            'therapy for an unrelated disorder (Box 2.27 lists the agents commonly involved)',
                        'Not meeting diagnostic criteria for a myeloproliferative neoplasm'
                    ]
                }, {
                    label: 'Desirable',
                    items: ['Detection of clonal molecular and/or chromosomal alterations']
                }],
                notes: [
                    'MPN is excluded - an MPN arising after therapy is simply MPN. At the other ' +
                        'boundary, MN-pCT takes precedence over mixed-phenotype and undifferentiated ' +
                        'acute leukaemia when their immunophenotypes appear.',
                    'Latency is generally within 10 years of last exposure; the chapter cautions that ' +
                        'very long latencies may be unrelated to therapy. The classic alkylator/radiation ' +
                        '(type 1) vs topoisomerase-II-inhibitor (type 2) split blurs under multi-agent ' +
                        'therapy; PARP1 inhibitors are newly implicated, and the role of hydroxyurea, ' +
                        'radioisotopes, purine analogues, L-asparaginase, mycophenolate and limited-field ' +
                        'radiation is unclear.',
                    '<i>TP53</i> mutations are characteristic and usually multi-hit, riding complex ' +
                        'karyotypes with loss of 5q, 7q and 17p; aberrant karyotypes run 70-90% against ' +
                        '40-60% in de novo disease, and <i>PPM1D</i> truncations (~15%) follow platinum ' +
                        'exposure. Chromosome 5 and/or 7 aberrations, <i>TP53</i> mutation or a complex ' +
                        'karyotype carry a median survival under 1 year irrespective of blast count.',
                    'Clonal haematopoiesis in <i>TP53</i>, <i>PPM1D</i>, <i>DNMT3A</i>, <i>ASXL1</i> or ' +
                        '<i>TET2</i> predisposes - MN-pCT is the selective expansion of a pre-existing clone ' +
                        'under therapy, not a de novo event; germline DNA-damage-response and Fanconi ' +
                        'pathway variants matter for transplant donor selection.'
                ]
            }) +

        refDiverge('WHO-HAEM5 keeps this as an entity (ICD-O 9920/3) with three named subtypes, the WHO ' +
            'diagnosis appending "post cytotoxic therapy" to the underlying type\'s name; ICC has no such ' +
            'entity - ", therapy-related" is a comma-separated qualifier that never changes which ' +
            'category the case is in.');
    }
});


/* ============================================================================
   ACUTE MYELOID LEUKAEMIA
   ========================================================================= */

// WHO's half is docs/who/mds-introduction.md for the boundary and
// docs/who/aml-introduction.md - the chapter introduction, pasted - for the
// per-type blast requirements and the AML-MR definition. ICC's half is Table 25
// of docs/who/icc-2022-arber-blood.md, read against it row by row. The
// per-entity WHO criteria boxes (essential/desirable) remain unpasted; nothing
// below reproduces one.
referenceTopics.push({
    id: 'aml-overview',
    section: 'aml',
    title: 'AML - the blast boundary',
    keywords: ['AML', 'acute myeloid leukemia', 'blast', '20%', '10%', 'NPM1', 'CEBPA', 'myelodysplasia-related',
        'BCR::ABL1', 'MDS/AML', 'erythroid leukemia', 'KMT2A', 'NUP98', 'MECOM'],
    related: ['blasts', 'mds-ib', 'mds-bitp53'],
    body: function () {
        return refBox({
            title: 'The MDS/AML boundary',
            groups: [{
                label: 'WHO-HAEM5',
                items: [
                    '20% blasts delineates MDS from AML.',
                    'Blast cut-offs are eliminated for AML types with defining genetic abnormalities, with ' +
                        'two named exceptions: AML with <i>BCR::ABL1</i> (to avoid overlap with CML) and AML with ' +
                        '<i>CEBPA</i> mutation keep &ge; 20%.'
                ]
            }],
            notes: [
                'Lowering the line to 10% was explored and declined: any cut-off is arbitrary, blast enumeration is ' +
                    'subject to sampling error and subjective evaluation, no gold standard exists, and 10% "carries a ' +
                    'risk of overtreatment".',
                'MDS-IB2 may be regarded as AML-equivalent for therapeutic decisions and clinical trial design.',
                'Removing the cut-off makes clone size part of the correlation: VAF or fusion-transcript ' +
                    'quantitation is read beside the morphology, and defining rearrangements - <i>NUP98</i> ' +
                    'especially - may be cryptic on conventional karyotype.'
            ]
        }) +

        refH('WHO - the restructured chapter') +
        refUL([
            'Two families: AML with defining genetic abnormalities and AML defined by ' +
                'differentiation - the latter replaces "AML-NOS". A third section, <i>AML with other defined ' +
                'genetic alterations</i>, is the landing spot for new and uncommon subtypes.',
            '<i>KMT2A</i>, <i>MECOM</i> and <i>NUP98</i> rearrangements are recognised at any blast count - ' +
                'a case under 20% with one of these behaves like its higher-count counterpart. "AML with ' +
                '<i>KMT2A</i> rearrangement" replaces the old t(9;11) naming; the partner (<i>MLLT3</i>, ' +
                '<i>AFDN</i>, <i>ELL</i>, <i>MLLT10</i> are commonest of &gt; 80) is desirable, not required.',
            '<i>NPM1</i> defines AML irrespective of blast count - MDS and MDS/MPN with <i>NPM1</i> ' +
                'progressed to AML in short order.',
            '<i>CEBPA</i> now means biallelic mutations or a single in-frame bZIP mutation ' +
                '(smbZIP-<i>CEBPA</i>) - and keeps its 20%. <i>RUNX1</i> is dropped as a standalone type.',
            'AML, myelodysplasia-related: &ge; 20% blasts with defining cytogenetic abnormalities or a ' +
                'mutation in one of eight genes (<i>SRSF2</i>, <i>SF3B1</i>, <i>U2AF1</i>, <i>ZRSR2</i>, ' +
                '<i>ASXL1</i>, <i>EZH2</i>, <i>BCOR</i>, <i>STAG2</i>), de novo or after MDS or MDS/MPN. ' +
                'Morphology alone no longer qualifies.',
            'Acute erythroid leukaemia (previously pure erythroid leukaemia): erythroid predominance, ' +
                'usually &ge; 80% of marrow elements with &ge; 30% proerythroblasts, biallelic <i>TP53</i> ' +
                'alterations prevalent - and it supersedes AML, myelodysplasia-related.'
        ]) +

        refDiverge('ICC has no single blast line. Ten per cent is enough for almost every genetically defined ' +
            'AML; 10-19% without such a lesion is MDS/AML; 20% is required only for the residual categories ' +
            'and for one recurrent abnormality.') +

        /* BLASTS IN THE FIRST COLUMN, categories in the second, and that is the
           way round the question is actually asked: a reader at the scope has a
           count and wants to know what it is enough for. It also keeps the key
           column short, which is what stops a wide table - see .refTable in
           Template.css. */
        refH('ICC - blasts required, by category') +
        refTable(['Blasts', 'Category'], [
            ['&ge; 10%',
                'APL with <i>PML::RARA</i> or other <i>RARA</i> rearrangements &middot; <i>RUNX1::RUNX1T1</i> ' +
                    '&middot; <i>CBFB::MYH11</i> &middot; <i>MLLT3::KMT2A</i> or other <i>KMT2A</i> &middot; ' +
                    '<i>DEK::NUP214</i> &middot; <i>GATA2</i>;<i>MECOM</i> or other <i>MECOM</i> &middot; other rare ' +
                    'recurring translocations &middot; mutated <i>NPM1</i> &middot; in-frame bZIP <i>CEBPA</i>'],
            ['&ge; 20%', '<i>BCR::ABL1</i> - the single recurrent abnormality still requiring 20%'],
            ['10-19%',
                'MDS/AML: with mutated <i>TP53</i>, with myelodysplasia-related gene mutations, with ' +
                    'myelodysplasia-related cytogenetic abnormalities, or NOS'],
            ['&ge; 20%', 'The same four as AML rather than MDS/AML']
        ]) +

        refP('ICC\'s myelodysplasia-related gene mutations are <i>ASXL1</i>, <i>BCOR</i>, <i>EZH2</i>, ' +
            '<i>RUNX1</i>, <i>SF3B1</i>, <i>SRSF2</i>, <i>STAG2</i>, <i>U2AF1</i>, <i>ZRSR2</i> - the eight WHO ' +
            'shares, plus <i>RUNX1</i>, which WHO dropped as a defining lesion. A <i>RUNX1</i>-mutated AML is ' +
            'therefore myelodysplasia-related by ICC and not by WHO.') +

        refH('The ICC qualifiers') +
        refP('ICC appends qualifiers to a diagnosis rather than making them separate entities, so the name carries ' +
            'the history: therapy-related (prior chemotherapy, radiotherapy or immune intervention), ' +
            'progressing from MDS or from MDS/MPN (each to be confirmed by standard diagnostics), and ' +
            'germline predisposition. The paper\'s own example: "AML with myelodysplasia-related gene ' +
            'mutation, germline <i>RUNX1</i> mutation".') +

        refCite('Arber DA, Orazi A, Hasserjian RP, et al. International Consensus Classification of Myeloid ' +
            'Neoplasms and Acute Leukemias: integrating morphologic, clinical, and genomic data. <i>Blood</i>. ' +
            '2022;140(11):1200-1228. doi:10.1182/blood.2022015850');
    }
});


// docs/who/aml-apl-pml-rara.md - the chapter, verbatim; the first per-entity
// WHO AML criteria in the repo. The ICC side is Table 25 of
// docs/who/icc-2022-arber-blood.md. The paste CONFIRMED the generated amlApl
// rule (PML::RARA gates, blasts only score, urgent flag) rather than
// correcting it.
referenceTopics.push({
    id: 'aml-apl',
    section: 'aml',
    title: 'Acute promyelocytic leukaemia (PML::RARA)',
    keywords: ['APL', 'promyelocytic', 'PML::RARA', 't(15;17)', 'faggot', 'Auer', 'microgranular',
        'RARA', 'ZBTB16', 'DIC', 'coagulopathy'],
    related: ['aml-overview', 'blasts'],
    body: function () {
        return refBox({
            title: 'APL with PML::RARA - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow atypical ' +
                            'promyelocytes showing characteristic abnormal hypergranular promyelocytes or ' +
                            'microgranular blasts (may be &lt; 20%)',
                        'Detection of <i>PML</i>::<i>RARA</i>',
                        'No history of exposure to cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of t(15;17)(q24;q21)']
                }
            ],
            notes: [
                'Abnormal promyelocytes are counted as blasts for enumeration - which is what lets the ' +
                    'first criterion say "may be &lt; 20%" and still describe an acute leukaemia.',
                'The therapy-history criterion routes prior-cytotoxic-therapy cases to myeloid neoplasm post ' +
                    'cytotoxic therapy rather than this entity; ICC keeps the APL diagnosis and appends a ' +
                    '"therapy-related" qualifier instead.',
                'The microgranular variant mimics acute myelomonocytic or monocytic leukaemia and presents ' +
                    'with a high, fast-doubling white count; a minority of cells with visible granules and/or ' +
                    'faggot cells (bundled Auer rods) betray it, and myeloperoxidase is uniformly strong. ' +
                    'CD34 and HLA-DR are characteristically negative.'
            ]
        }) +

        refDiverge('ICC requires &ge; 10% blasts for APL with t(15;17)(q24.1;q21.2)/<i>PML</i>::' +
            '<i>RARA</i>, where WHO sets no floor. ICC also lists APL with other <i>RARA</i> ' +
            'rearrangements as its own &ge; 10% category, naming the same variant partners.') +

        refP('WHO\'s subtype APL with a variant <i>RARA</i> translocation (~5% of cases) covers the ' +
            'non-<i>PML</i> partners (<i>ZBTB16</i>, <i>NPM1</i>, <i>NUMA1</i>, <i>STAT5B</i> and others); ' +
            '<i>ZBTB16</i> and <i>STAT5B</i> fusions respond poorly to ATRA and arsenic trioxide, which is the ' +
            'clinical reason the subtype is named. APL is the emergency of this table: coagulopathy with ' +
            'disseminated intravascular coagulation drives early death and demands immediate recognition.');
    }
});


// docs/who/aml-runx1-runx1t1.md - the chapter, verbatim; ICC side from Table 25
// of docs/who/icc-2022-arber-blood.md. Another CONFIRMING paste: the generated
// amlRunx1t1 rule (fusion gates, blasts score) matches the essential criteria.
referenceTopics.push({
    id: 'aml-runx1t1',
    section: 'aml',
    title: 'AML with RUNX1::RUNX1T1',
    keywords: ['RUNX1::RUNX1T1', 't(8;21)', 'core-binding factor', 'CBF', 'AML1', 'ETO', 'hof',
        'Auer', 'CD19', 'KIT'],
    related: ['aml-overview', 'aml-apl', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with RUNX1::RUNX1T1 - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>RUNX1</i>::<i>RUNX1T1</i>',
                        'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of t(8;21)(q22;q22.1)']
                }
            ],
            notes: [
                'A presentation as myeloid sarcoma may carry low blood and marrow blast counts - one of ' +
                    'the cases the "may be &lt; 20%" clause exists for.',
                'The morphology is distinctive: large blasts with abundant basophilic cytoplasm, ' +
                    'azurophilic granules and perinuclear clearing (hof); Auer rods as a single long rod with ' +
                    'tapered ends; dysplasia largely confined to the granulocytic lineage (pseudo-Pelger-Huët ' +
                    'nuclei, homogeneous pink neutrophil cytoplasm); monocytes few or absent. Eosinophil ' +
                    'precursors are often increased but cytologically normal - the abnormal eosinophils ' +
                    'belong to ' + refJump('aml-cbfb', 'CBFB::MYH11') + '.',
                'Flow carries a signature worth knowing: bright CD34 with aberrant CD19 and cCD79a ' +
                    '(PAX5 usually positive), CD33 weak or negative - lymphoid markers on a myeloid leukaemia, ' +
                    'not a mixed phenotype.',
                '<i>KIT</i> p.D816 in adults is the adverse marker the introduction kept: lower relapse-free ' +
                    'survival.'
            ]
        }) +

        refDiverge('ICC requires &ge; 10% blasts for AML with t(8;21)(q22;q22.1)/<i>RUNX1</i>::' +
            '<i>RUNX1T1</i>, where WHO sets no floor; and ICC handles prior therapy as a "therapy-related" ' +
            'qualifier where WHO routes such cases to myeloid neoplasm post cytotoxic therapy.');
    }
});


// docs/who/aml-cbfb-myh11.md - the chapter, verbatim; ICC side from Table 25 of
// the pasted ICC paper. Another CONFIRMING paste for its generated rule.
referenceTopics.push({
    id: 'aml-cbfb',
    section: 'aml',
    title: 'AML with CBFB::MYH11',
    keywords: ['CBFB::MYH11', 'inv(16)', 't(16;16)', 'core-binding factor', 'CBF', 'abnormal eosinophils',
        'myelomonocytic', 'M4Eo', 'KIT'],
    related: ['aml-overview', 'aml-runx1t1', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with CBFB::MYH11 - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>CBFB</i>::<i>MYH11</i>',
                        'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of inv(16)(p13.1q22) or t(16;16)(p13.1;q22)']
                }
            ],
            notes: [
                'The abnormal eosinophils are the morphological signature, present in the majority of ' +
                    'cases: marrow eosinophilia whose immature granules are abnormally large and distinctly dark ' +
                    'purple-violet, faintly positive on naphthol AS-D CAE (normally negative in eosinophils). ' +
                    'Blood eosinophilia may occur but abnormal circulating forms are rare - this is a marrow ' +
                    'finding. The blasts usually show myelomonocytic differentiation.',
                'inv(16) can be cryptic on conventional karyotype; a suspicious morphology without it ' +
                    'warrants FISH or molecular testing, and a <i>CBFB</i> break-apart probe suffices in the ' +
                    'right morphological context.',
                'Flow usually shows two aberrant populations: a CD45-dim immature blast population ' +
                    '(CD34+, CD13, CD117, MPO) and a CD45-bright monocytic one (CD14, CD64, lysozyme; CD34−).'
            ]
        }) +

        refDiverge('ICC requires &ge; 10% blasts for AML with inv(16)(p13.1q22) or ' +
            't(16;16)(p13.1;q22)/<i>CBFB</i>::<i>MYH11</i>, where WHO sets no floor; prior therapy is a ' +
            '"therapy-related" qualifier in ICC where WHO routes such cases to myeloid neoplasm post cytotoxic ' +
            'therapy.') +

        refP('The core-binding factor counterpart of ' + refJump('aml-runx1t1', 'AML with RUNX1::RUNX1T1') +
            ' - and the two split the eosinophil question between them: <i>CBFB</i>::<i>MYH11</i>\'s ' +
            'eosinophils are increased and abnormal, <i>RUNX1</i>::<i>RUNX1T1</i>\'s are increased and ' +
            'cytologically normal.');
    }
});

// docs/who/aml-dek-nup214.md - the chapter, verbatim; ICC side from Table 25 of
// the pasted ICC paper. Confirming again - including two negative calls: the
// amlDek rule's multilineage-dysplasia support and its deliberate refusal to
// encode basophilia both match the chapter's words.
referenceTopics.push({
    id: 'aml-dek',
    section: 'aml',
    title: 'AML with DEK::NUP214',
    keywords: ['DEK::NUP214', 't(6;9)', 'FLT3-ITD', 'multilineage dysplasia', 'basophilia', 'CAN'],
    related: ['aml-overview', 'aml-mr', 'mds-ib'],
    body: function () {
        return refBox({
            title: 'AML with DEK::NUP214 - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Presence of <i>DEK</i>::<i>NUP214</i> fusion',
                        'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of t(6;9)(p22.3;q34.1)']
                }
            ],
            notes: [
                'The MDS mimic among the fusion AMLs. Multilineage dysplasia is common - abnormal nuclear ' +
                    'lobulation, ring sideroblasts, hypogranular myelopoiesis, micromegakaryocytes - and some ' +
                    'cases present pancytopenic with the morphology of MDS with increased blasts. That is exactly ' +
                    'why the fusion defines AML at any blast count: 61% of the MDS-labelled cases progressed, ' +
                    'with the same survival and co-mutations as those called AML outright.',
                'Basophilia is the classic teaching and a minority finding - the chapter says "may be ' +
                    'increased in a minority of cases". Its absence argues nothing.',
                '<i>FLT3</i>-ITD co-occurs in 50-88% (TKD mutations are generally absent); t(6;9) is often the ' +
                    'sole karyotype abnormality. Prognosis is poor, and transplantation appears to be what ' +
                    'changes it.'
            ]
        }) +

        refDiverge('ICC requires &ge; 10% blasts for AML with t(6;9)(p22.3;q34.1)/<i>DEK</i>::' +
            '<i>NUP214</i>, where WHO sets no floor; prior therapy is a "therapy-related" qualifier in ICC ' +
            'where WHO routes such cases to myeloid neoplasm post cytotoxic therapy.');
    }
});

// docs/who/aml-rbm15-mrtfa.md - the chapter, verbatim. Confirming: the amlRbm15
// spec's MRTFA naming (not MKL1) and its iccFallback to the rare-translocation
// catch-all both hold. NOTE the essential criteria carry NO post-cytotoxic-
// therapy exclusion, unlike every sibling box so far, and megakaryocytic
// differentiation - the entity's own definition - is only DESIRABLE.
referenceTopics.push({
    id: 'aml-rbm15',
    section: 'aml',
    title: 'AML with RBM15::MRTFA',
    keywords: ['RBM15::MRTFA', 'MKL1', 'OTT::MAL', 't(1;22)', 'megakaryoblastic', 'infant', 'CD41', 'CD61',
        'fibrosis'],
    related: ['aml-overview', 'fibrosis', 'megakaryocytes'],
    body: function () {
        return refBox({
            title: 'AML with RBM15::MRTFA - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>RBM15</i>::<i>MRTFA</i> fusion by FISH and/or RT-PCR or a similar ' +
                            'molecular technique'
                    ]
                },
                {
                    label: 'Desirable',
                    items: [
                        'Detection of t(1;22)(p13.3;q13.1) by karyotype analysis',
                        'Demonstration of megakaryocytic differentiation'
                    ]
                }
            ],
            notes: [
                'The megakaryocytic differentiation that defines the entity is only desirable to ' +
                    'diagnose it - the fusion carries the case - and this box, alone among the AML boxes so far, ' +
                    'states no post-cytotoxic-therapy exclusion.',
                'An infant disease: most cases in the first three years, female predominance, and ' +
                    'without Down syndrome - the Down-syndrome megakaryoblastic proliferations are their ' +
                    'own category. Marked hepatosplenomegaly is usual, and fibrotic liver involvement can ' +
                    'present as Budd-Chiari syndrome.',
                'Fibrosis works against every count: reticulin and collagen fibrosis limit the aspirate ' +
                    'and can produce a falsely low blast percentage - the trephine is required, and the fusion ' +
                    'may need FISH when the karyotype fails. Megakaryoblasts show blebs and may mimic ' +
                    'lymphoblasts; cytoplasmic CD41/CD61 beats surface staining, with CD34, CD45, HLA-DR ' +
                    'and MPO negative.'
            ]
        }) +

        refDiverge('<i>RBM15</i>::<i>MRTFA</i> is not in ICC\'s Table 25; ICC reaches such cases only ' +
            'through "AML with other rare recurring translocations" (&ge; 10% blasts) via its supplement, ' +
            'which is also why the Dx rule prints the catch-all rather than an ICC name ICC does not publish.');
    }
});

// docs/who/aml-bcr-abl1.md - the chapter, verbatim. NO DX RULE POINTS HERE, by
// design: the engine reaches BCR::ABL1-positive acute disease through the cml
// rule, whose whoFor prints blast phase - separating de novo AML-BCR::ABL1 from
// CML myeloid blast phase needs history, which the chapter itself calls "often
// challenging". The topic exists because the differential IS the entity.
referenceTopics.push({
    id: 'aml-bcrabl',
    section: 'aml',
    title: 'AML with BCR::ABL1',
    keywords: ['BCR::ABL1', 't(9;22)', 'Philadelphia', 'blast phase', 'p210', 'IKZF1', 'CDKN2A'],
    related: ['cml', 'aml-overview', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with BCR::ABL1 - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with &gt; 20% blasts expressing a myeloid immunophenotype in ' +
                            'the bone marrow and/or peripheral blood',
                        'Detection of <i>BCR</i>::<i>ABL1</i> at initial diagnosis',
                        'Lack of features of CML before or at diagnosis or after therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: [
                        'Presence of t(9;22)(q34;q11.2) on conventional karyotyping',
                        'Determination of the <i>BCR</i>::<i>ABL1</i> transcript subtype and a baseline ' +
                            'transcript level for monitoring'
                    ]
                }
            ],
            notes: [
                'The one fusion AML that keeps a hard blast threshold - to avoid overlap with CML. (The ' +
                    'chapter\'s box writes "&gt; 20%" where the AML introduction wrote "&ge; 20%"; both are ' +
                    'WHO\'s words.)',
                'Against CML myeloid blast phase, the chapter\'s own numbers: blasts median 47% vs 13%, ' +
                    'basophils median 0% vs 2.5%, splenomegaly 25% vs 65%, marrow M:E 2.0 vs 4.8, and marrow ' +
                    'basophils &gt; 2% in 13% vs 53%. Cryptic IG/TR deletions with IKZF1 and/or CDKN2A/B ' +
                    'loss are nearly universal here and absent in myeloid blast phase (they mark lymphoid ' +
                    'blast phase and MPAL instead). The distinction is nonetheless "often challenging".',
                'Secondarily acquired BCR::ABL1 is excluded - post-MDS AML or relapsed AML gaining the ' +
                    'fusion does not enter this category - and a co-occurring abnormality defining another AML ' +
                    'type takes precedence. Aberrant lymphoid antigens (CD7, CD19, TdT) are common, so MPAL ' +
                    'with BCR::ABL1 sits in the differential.'
            ]
        }) +

        refDiverge('The classifications agree on the threshold for once: ICC also requires 20% - its ' +
            'Table 25\'s single &ge; 20% recurrent abnormality - and its footnote bars the MDS/AML category ' +
            'for BCR::ABL1 outright, for the same reason WHO keeps the cut-off: overlap with CML progression.');
    }
});

// docs/who/aml-kmt2a.md - the chapter, verbatim; ICC side from Table 25 of the
// pasted ICC paper. Confirming: the rule's "AML with KMT2A rearrangement" naming
// (replacing the old t(9;11) framing) is the chapter's own.
referenceTopics.push({
    id: 'aml-kmt2a',
    section: 'aml',
    title: 'AML with KMT2A rearrangement',
    keywords: ['KMT2A', 'MLL', '11q23', 'MLLT3', 't(9;11)', 'monoblastic', 'PTD', 'partial tandem duplication',
        'gingival', 'NG2', 'CREBBP'],
    related: ['aml-overview', 'aml-rbm15', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with KMT2A rearrangement - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%), or the presence of a myeloid sarcoma',
                        'Blasts express a myeloid immunophenotype, not fulfilling immunophenotypic criteria for ' +
                            'mixed-phenotype acute leukaemia',
                        'Presence of a <i>KMT2A</i> rearrangement',
                        'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Identification of the <i>KMT2A</i> fusion partner']
                }
            ],
            notes: [
                '<i>KMT2A</i> partial tandem duplication does not qualify - a PTD on an NGS report is not ' +
                    'a rearrangement, and calling it one is the trap this criterion exists to name. Conversely ' +
                    'real rearrangements can be cryptic on karyotype, and some (<i>KMT2A</i>::<i>USP2</i>) ' +
                    'even by FISH.',
                't(11;16)/<i>KMT2A</i>::<i>CREBBP</i> is presumptive evidence of a post-cytotoxic-therapy ' +
                    'origin (topoisomerase II inhibitors) and should prompt a history search - such cases are ' +
                    'myeloid neoplasm post cytotoxic therapy, not this entity.',
                'Most cases are monocytic, monoblastic or myelomonocytic, often with many promonocytes ' +
                    'and NG2 (CSPG4) expression; extramedullary disease - gingival hypertrophy, skin - is ' +
                    'common. In children, <i>KMT2A</i>::<i>MLLT3</i> and ::<i>MLLT10</i> can present ' +
                    'megakaryoblastic with aspirate blasts below 20%, where trephine immunohistochemistry does ' +
                    'the counting. The commonest partners are <i>MLLT3</i>, <i>AFDN</i>, <i>ELL</i> and ' +
                    '<i>MLLT10</i>, of more than 80 described - and the partner carries the prognosis, which is ' +
                    'why identifying it is the one desirable criterion.'
            ]
        }) +

        refDiverge('ICC lists two rows at &ge; 10% blasts - AML with t(9;11)(p21.3;q23.3)/' +
            '<i>MLLT3</i>::<i>KMT2A</i> and AML with other <i>KMT2A</i> rearrangements - where WHO names one ' +
            'entity at any count; prior therapy is a "therapy-related" qualifier in ICC where WHO routes such ' +
            'cases to myeloid neoplasm post cytotoxic therapy.');
    }
});

// docs/who/aml-mecom.md - the chapter, verbatim; ICC side from Table 25 of the
// pasted ICC paper. The chapter ADDED to the rule: the one fusion box with an
// MPN-history exclusion, now encoded (with the concurrent-BCR::ABL1 ruling)
// through a new excludes seam on the dxAmlRule factory.
referenceTopics.push({
    id: 'aml-mecom',
    section: 'aml',
    title: 'AML with MECOM rearrangement',
    keywords: ['MECOM', 'EVI1', 'inv(3)', 't(3;3)', '3q26', 'GATA2', 'megakaryocytic dysplasia',
        'blast phase'],
    related: ['aml-overview', 'aml-mr', 'cml', 'megakaryocytes'],
    body: function () {
        return refBox({
            title: 'AML with MECOM rearrangement - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>MECOM</i> rearrangement',
                        'No history of myeloproliferative neoplasm',
                        'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of inv(3)(q21.3q26.2), t(3;3)(q21;q26), t(3;21)(q26.2;q22), or ' +
                        't(3;12)(q26.2;p13)']
                }
            ],
            notes: [
                'The MPN clause is this box\'s own, alone among the fusion entities: <i>MECOM</i> ' +
                    'acquired in CML defines blast phase regardless of the blast count, and even a ' +
                    'concurrent <i>BCR</i>::<i>ABL1</i> at presentation is best regarded as blast-phase CML.',
                'About one third present with a low blast count - the any-count rule earns its keep here, ' +
                    'and cases above and below 20% share the same mutations and expression profiles.',
                'Megakaryocytic dysplasia is the morphological hallmark: small megakaryocytes with ' +
                    'non-lobated or bilobed nuclei, with giant/hypogranular platelets and bare megakaryocyte ' +
                    'nuclei in the blood. inv(3)/t(3;3) hijacks the <i>GATA2</i> enhancer - <i>EVI1</i> ' +
                    'overexpressed, <i>GATA2</i> functionally haploinsufficient - and a subset of the &gt; 30 ' +
                    'described rearrangements are cryptic, so guidelines recommend a <i>MECOM</i> ' +
                    'break-apart FISH probe. RAS-pathway mutations occur in nearly all cases.'
            ]
        }) +

        refDiverge('ICC lists two rows at &ge; 10% blasts - AML with inv(3)(q21.3q26.2) or ' +
            't(3;3)(q21.3;q26.2)/<i>GATA2</i>; <i>MECOM</i>(<i>EVI1</i>), and AML with other <i>MECOM</i> ' +
            'rearrangements - where WHO names one entity at any count; prior therapy is a "therapy-related" ' +
            'qualifier in ICC where WHO routes such cases to myeloid neoplasm post cytotoxic therapy.');
    }
});

// docs/who/aml-nup98.md - the chapter, verbatim. Confirming: the amlNup98
// spec's iccFallback (ICC publishes no NUP98 entity) holds, and like RBM15's
// box, the essential criteria carry no post-cytotoxic-therapy clause.
referenceTopics.push({
    id: 'aml-nup98',
    section: 'aml',
    title: 'AML with NUP98 rearrangement',
    keywords: ['NUP98', 'NSD1', 'KDM5A', '11p15', 'cryptic', 'normal karyotype', 'FLT3-ITD', 'WT1',
        'RARG', 'megakaryoblastic'],
    related: ['aml-overview', 'aml-apl', 'aml-rbm15'],
    body: function () {
        return refBox({
            title: 'AML with NUP98 rearrangement - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>NUP98</i> rearrangement and/or specific fusion products such as ' +
                            '<i>NUP98</i>::<i>NSD1</i>'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Identification of the <i>NUP98</i> fusion partner at diagnosis, to enable ' +
                        'PCR-based disease monitoring']
                }
            ],
            notes: [
                'The fusion hides from the karyotype. <i>NUP98</i> sits at the terminus of 11p15.4, so ' +
                    'the rearrangements are often cryptic and most patients have a normal karyotype - the ' +
                    'chapter\'s proposed trigger to go looking is exactly what an NGS panel already shows: a ' +
                    'normal karyotype with <i>FLT3</i>-ITD and/or <i>WT1</i> mutation ' +
                    '(<i>NUP98</i>::<i>NSD1</i> carries the ITD in 67-91%). Break-apart FISH, RT-PCR or RNA ' +
                    'sequencing do the finding.',
                'In children: megakaryoblastic differentiation in up to a third of patients under 3 ' +
                    '(<i>KDM5A</i> especially), erythroid-differentiated acute leukaemias commonly ' +
                    '<i>NUP98</i>-rearranged, and a <i>NUP98</i>::<i>RARG</i> fusion that mimics APL ' +
                    'morphologically without a <i>RARA</i> lesion.',
                'Prognosis is poor, worse still with <i>FLT3</i>-ITD; up to half of refractory paediatric AML ' +
                    'carries a <i>NUP98</i> rearrangement. Like the <i>RBM15</i> box - and unlike every other ' +
                    'sibling - the essential criteria state no post-cytotoxic-therapy exclusion.'
            ]
        }) +

        refDiverge('<i>NUP98</i> appears nowhere in ICC\'s main text or Table 25; ICC reaches such cases only ' +
            'through "AML with other rare recurring translocations" (&ge; 10% blasts), which is what the Dx ' +
            'rule prints for the ICC name.');
    }
});

// docs/who/aml-npm1.md - the chapter, verbatim; ICC side from Table 25 of the
// pasted ICC paper. THE CHAPTER CORRECTED THE RULE at the same edge as amlMr's:
// prior cytotoxic therapy was scored +1 toward the entity whose essential
// criteria read "no history of exposure to cytotoxic therapy" (clause deleted,
// here and in the fusion-rule factory) - and it SUPPLIED a caution the rule now
// carries: NPM1 at VAF < 10% with no blast increase may not be definitively
// classifiable as AML (npm1Vaf added to the findings for it).
referenceTopics.push({
    id: 'aml-npm1',
    section: 'aml',
    title: 'AML with NPM1 mutation',
    keywords: ['NPM1', 'nucleophosmin', 'cup-like', 'cytoplasmic NPM1', 'normal karyotype', 'FLT3-ITD',
        'ELN', 'VAF'],
    related: ['aml-overview', 'aml-apl', 'aml-mr', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with NPM1 mutation - WHO-HAEM5',
            groups: [
                {
                    label: 'Essential',
                    items: [
                        'A myeloid neoplasm with increased peripheral blood and/or bone marrow blasts ' +
                            '(may be &lt; 20%)',
                        'Detection of <i>NPM1</i> mutation',
                        'No history of exposure to cytotoxic therapy'
                    ]
                },
                {
                    label: 'Desirable',
                    items: ['Detection of cytoplasmic NPM1 by immunohistochemistry']
                }
            ],
            notes: [
                'The mutation defines AML wherever it is found at presentation - a marrow wearing MDS or ' +
                    'CMML features with <i>NPM1</i> detected is AML with <i>NPM1</i> mutation, and "MDS with ' +
                    '<i>NPM1</i> mutation" is on the chapter\'s not-recommended list. The one stated restraint: ' +
                    'a variant at VAF &lt; 10% with no increase in blasts lacks outcome data and "may not ' +
                    'be definitively classifiable as AML" - interpret with caution, follow closely, and consider ' +
                    'a subclonal variant (MDS cases have relapsed <i>without</i> the mutation).',
                'Cup-like nuclear invaginations in &gt; 10% of blasts are highly specific, associated ' +
                    'with the <i>NPM1</i>/<i>FLT3</i>-ITD pair. About 80% of cases are CD34-negative, ' +
                    'and a CD34−/HLA-DR− subset mimics APL by flow - the ' +
                    'cytoplasmic-NPM1 immunostain (the desirable criterion) is the surrogate that also catches ' +
                    'the rare non-exon-12 mutations.',
                'The karyotype is normal in ~85%; multilineage dysplasia in 20-25% changes nothing ' +
                    'prognostically. <i>FLT3</i>-ITD decides ELN risk (favourable without it or with a low ' +
                    'allelic ratio; intermediate with a high one), which is why the Dx comment reports the ITD ' +
                    'either way.'
            ]
        }) +

        refDiverge('ICC requires &ge; 10% blasts for AML with mutated <i>NPM1</i> - below that, ICC has ' +
            'no acute leukaemia to name and the Dx card prints the WHO name alone. At 10-19% the mutation ' +
            'lifts the case out of ICC\'s MDS/AML category to AML outright. Prior therapy is a ' +
            '"therapy-related" qualifier in ICC where WHO\'s essential criteria exclude it.');
    }
});

// docs/who/aml-cebpa.md - the chapter, verbatim; the LAST of the per-entity AML
// pastes, completing the WHO-side source library for every entity the Dx tab
// ranks. Confirming for the rule's structure (bi-or-bZIP definition, WHO's
// retained 20%); the chapter ADDED the germline-referral caution the rule now
// carries on a reported-biallelic case.
referenceTopics.push({
    id: 'aml-cebpa',
    section: 'aml',
    title: 'AML with CEBPA mutation',
    keywords: ['CEBPA', 'bZIP', 'biallelic', 'biCEBPA', 'smbZIP', 'TAD', 'germline', 'favourable'],
    related: ['aml-overview', 'aml-npm1', 'blasts'],
    body: function () {
        return refBox({
            title: 'AML with CEBPA mutation - WHO-HAEM5',
            groups: [{
                label: 'Essential',
                items: [
                    '&ge; 20% blasts with a myeloid immunophenotype in the bone marrow or blood',
                    'Presence of biallelic mutations in <i>CEBPA</i>, or a single mutation located ' +
                        'in the bZIP region',
                    'Absence of criteria allowing classification into other AMLs with defining genetic ' +
                        'abnormalities',
                    'Not fulfilling diagnostic criteria for myeloid neoplasm post cytotoxic therapy'
                ]
            }],
            notes: [
                'The one defining-mutation entity that kept the 20% - below it WHO has no <i>CEBPA</i> ' +
                    'AML to name, so a low-blast <i>CEBPA</i>-mutated marrow genuinely stays MDS.',
                'The definition widened from biallelic-only to biallelic or single in-frame bZIP ' +
                    '(smbZIP-<i>CEBPA</i>), because the favourable prognosis tracks both - in children and ' +
                    'adults up to 70. A single mutation in the N-terminal TAD does not qualify.',
                'A biallelic result is a germline question: 5-10% of bi<i>CEBPA</i> cases carry a ' +
                    'germline N-terminal variant, and the familial form is highly penetrant at a median of ' +
                    '24.5 years - the chapter asks for suspicion and genetic counselling, which the Dx caution ' +
                    'now relays. Dysgranulopoiesis and dysmegakaryopoiesis are common and change nothing.'
            ]
        }) +

        refDiverge('The one entity where the classifications disagree about which mutations count, not ' +
            'merely the threshold: ICC accepts only in-frame bZIP mutations (at &ge; 10% blasts), so a ' +
            'biallelic non-bZIP case is WHO\'s entity and not ICC\'s - and an ICC bZIP case at 10-19% blasts ' +
            'is AML where WHO still reads MDS. Prior therapy is a "therapy-related" qualifier in ICC where ' +
            'WHO routes such cases to myeloid neoplasm post cytotoxic therapy.');
    }
});

// docs/who/aml-other-defined.md - the chapter, verbatim. NO DX RULE POINTS
// HERE and none of the five fusions is in the abnormality vocabulary - these
// are unrecordable rarities, and the topic exists because this category is
// where the RAM immunophenotype and the RARG APL-mimics the sibling pages
// gesture at actually live.
referenceTopics.push({
    id: 'aml-other',
    section: 'aml',
    title: 'AML with other defined genetic alterations',
    keywords: ['CBFA2T3::GLIS2', 'RAM', 'KAT6A::CREBBP', 'FUS::ERG', 'MNX1::ETV6', 'NPM1::MLF1',
        'RARG', 't(8;16)', 'erythrophagocytosis', 'landing spot'],
    related: ['aml-overview', 'aml-apl', 'aml-rbm15', 'aml-nup98'],
    body: function () {
        return refBox({
            title: 'AML with other defined genetic alterations - WHO-HAEM5',
            groups: [{
                label: 'Essential',
                items: [
                    '&ge; 20% blasts with a myeloid immunophenotype in bone marrow and/or blood',
                    'Detection of one or more of the Table 2.17 cytogenetic or molecular aberrations - the ' +
                        'named subtypes are <i>CBFA2T3</i>::<i>GLIS2</i>, <i>KAT6A</i>::<i>CREBBP</i>, ' +
                        '<i>FUS</i>::<i>ERG</i>, <i>MNX1</i>::<i>ETV6</i>, and <i>NPM1</i>::<i>MLF1</i>',
                    'Not fulfilling diagnostic criteria for AML with defining genetic abnormalities, ' +
                        'myelodysplasia-related AML, AML post cytotoxic therapy, or mixed-phenotype acute ' +
                        'leukaemia'
                ]
            }],
            notes: [
                'The introduction\'s landing spot: emerging subtypes that may or may not become defined ' +
                    'types in future editions - which is why, unlike the defining-genetic entities, this ' +
                    'category keeps the &ge; 20% requirement and yields to every named diagnosis above it.',
                '<i>CBFA2T3</i>::<i>GLIS2</i> - cryptic inv(16)(p13.3q24), exclusively under age 5, ' +
                    'often megakaryoblastic in non-Down infants, wearing the RAM immunophenotype (strong ' +
                    'CD56, absent HLA-DR and CD38); adverse outcome. <i>KAT6A</i>::<i>CREBBP</i> - ' +
                    't(8;16), monocytic with erythrophagocytosis (70%), leukaemia cutis and DIC; ' +
                    'neonatal cases may remit spontaneously. <i>MNX1</i>::<i>ETV6</i> - cryptic t(7;12) ' +
                    'of infancy, misread as del(12p) or del(7q) without FISH, usually with trisomy 19.',
                'Two traps the chapter names: t(16;21) is two different diseases - ' +
                    '<i>FUS</i>::<i>ERG</i> at p11.2;q22 (dismal) versus <i>RUNX1</i>::<i>CBFA2T3</i> at ' +
                    'q24;q22 (favourable) - and the <i>RARG</i> fusions (<i>CPSF6</i>, <i>NUP98</i>, ' +
                    '<i>PML</i>, <i>HNRNPC</i> partners) look like APL and resist ATRA.'
            ]
        }) +

        refDiverge('ICC has no equivalent named category; its nearest is "AML with other rare recurring ' +
            'translocations" (&ge; 10% blasts) via its supplement, which overlaps this list without matching ' +
            'it.');
    }
});

// The family topic for WHO's "AML defined by differentiation" - ONE topic for
// the residual Dx rule, accumulating subtype boxes as their chapters are pasted
// (docs/who/aml-minimal-differentiation.md, aml-without-maturation.md,
// aml-with-maturation.md, aml-myelomonocytic.md, aml-monocytic.md,
// aml-basophilic.md, aml-erythroid.md, aml-megakaryoblastic.md so far). The
// first box drove two rule changes - the residual now yields to AML-MR routes
// and no longer scores prior therapy - see the `aml` rule in MarrowDxAml.js;
// the later boxes confirmed both exclusions and supplied the family's internal
// thresholds (MPO 3%, maturation 10%, monocytes 20%, monocytic predominance
// 80%). AEL is the family's exception (no blast floor; ICC routes it to AML
// with mutated TP53 - Table 21 of the pasted ICC paper), and AMKL is the one
// box excluding a history of MPN by name (such cases are MPN in blast phase).
referenceTopics.push({
    id: 'aml-diff',
    section: 'aml',
    title: 'AML defined by differentiation',
    keywords: ['minimal differentiation', 'without maturation', 'with maturation', 'myelomonocytic',
        'monocytic', 'monoblastic', 'basophilic', 'erythroid', 'pure erythroid', 'megakaryoblastic',
        'AMKL', 'M0', 'M1', 'M2', 'M4', 'M5', 'M6', 'M7', 'AML-NOS', 'defined by differentiation',
        'BCL11B', 'myeloperoxidase', 'flow cytometry', 'promonocyte', 'proerythroblast',
        'toluidine blue', 'TP53', 'CD41', 'CD61', 'RAM phenotype', 'Down syndrome'],
    related: ['aml-overview', 'aml-mr', 'mn-pct', 'cmml', 'blasts'],
    body: function () {
        return refP('The family replacing "AML-NOS": cases at &ge; 20% blasts with no defining ' +
                'genetic abnormality - the residue after every named entity, subtyped by differentiation. ' +
                'The granulocytic-monocytic subtypes are separated by three numbers: myeloperoxidase ' +
                'at 3% (below it, minimal differentiation; at or above, the rest), granulocytic ' +
                'maturation at 10% of marrow cells (below it, without maturation; at or above, with ' +
                'maturation), and monocytes at 20% of marrow cells (at or above it, myelomonocytic - ' +
                'and at &ge; 80% monocytic cells, acute monocytic leukaemia). Basophilic, erythroid ' +
                'and megakaryoblastic leukaemia sit on their own axes, and acute erythroid leukaemia ' +
                'alone carries no blast requirement. Eight subtype boxes are pasted so far.') +

            refBox({
                title: 'AML with minimal differentiation - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts in bone marrow and/or blood, lacking morphological and ' +
                            'cytochemical evidence of myeloid differentiation',
                        'Positive for at least two myeloid-associated immunophenotypic markers ' +
                            '(e.g. CD13, CD33, CD117)',
                        'Not fulfilling diagnostic criteria for AML types with defined genetic alterations, ' +
                            'for mixed-phenotype acute leukaemia, or for myeloid neoplasm post cytotoxic therapy'
                    ]
                }],
                notes: [
                    'The diagnosis lives on the flow cytometer: cytochemistry is negative by definition ' +
                        '(myeloperoxidase, Sudan Black B and CAE all &lt; 3%), the blasts may resemble ' +
                        'lymphoblasts, and CD7/TdT appear in ~30% - the differentials are ALL and ' +
                        'mixed-phenotype acute leukaemia, which the criteria exclude by immunophenotype.',
                    'Many former-M0 cases are AML-MR now: the chapter\'s own mutation list (<i>RUNX1</i> ' +
                        '~30%, <i>ASXL1</i> ~30%, <i>SRSF2</i> ~20%, <i>STAG2</i>) largely qualifies for ' +
                        'myelodysplasia-related AML, which takes precedence - this box names the residue.',
                    '<i>BCL11B</i> rearrangements (~30%) mark a biological continuum with T/myeloid ' +
                        'MPAL, early T-precursor ALL and acute undifferentiated leukaemia, usually with ' +
                        '<i>FLT3</i>-ITD (~85%); their clinical significance is not yet settled.'
                ]
            }) +

            refBox({
                title: 'AML without maturation - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts in bone marrow and/or blood, with cytochemical evidence of ' +
                            'myeloid differentiation (&ge; 3%) and limited (&lt; 10%) ' +
                            'morphological features of granulocytic maturation',
                        'Positive for at least two myeloid-associated markers (e.g. CD13, CD33, CD117)',
                        'Not fulfilling criteria for AML types with defined genetic alterations, or for ' +
                            'myeloid neoplasm post cytotoxic therapy'
                    ]
                }],
                notes: [
                    'The former M1. Blasts may carry azurophilic granules and Auer rods - or lack both and ' +
                        'resemble lymphoblasts, where the &ge; 3% myeloperoxidase (or Sudan Black B) is ' +
                        'what separates this box from minimal differentiation below it, and the &lt; 10% ' +
                        'maturing granulocytes from "with maturation" above it.',
                    'About two thirds have a normal karyotype, and the mutation list (<i>DNMT3A</i>, ' +
                        '<i>RUNX1</i>, <i>ASXL1</i> ~25-30%, <i>IDH1/2</i>) again largely qualifies for ' +
                        'myelodysplasia-related AML, which takes precedence.'
                ]
            }) +

            refBox({
                title: 'AML with maturation - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts in bone marrow and/or blood, with cytochemical evidence of ' +
                            'myeloid differentiation and morphological features of granulocytic maturation in ' +
                            '&ge; 10% of bone marrow cells',
                        'Positive for at least two myeloid-associated markers (e.g. myeloperoxidase, CD13, ' +
                            'CD33, CD117)',
                        'Monocytic-lineage cells constitute &lt; 20% of bone marrow cells',
                        'Not fulfilling criteria for AML types with defined genetic alterations, or for ' +
                            'myeloid neoplasm post cytotoxic therapy'
                    ]
                }],
                notes: [
                    'The former M2, standing between two walls: &ge; 10% maturing granulocytes ' +
                        'separates it from "without maturation" and &lt; 20% monocytes from the ' +
                        'myelomonocytic side. Blasts express maturation markers (CD11b, CD15, CD65), ' +
                        'neutrophilic dysplasia may be present, and Auer rods may occur.',
                    'The mutation profile leans hardest of the family toward the MR list - <i>ASXL1</i> ~40%, ' +
                        '<i>RUNX1</i> and <i>STAG2</i> ~30% - so many of these marrows classify as ' +
                        'myelodysplasia-related AML first; <i>FLT3</i>-ITD is notably rarer here (5-10%) than ' +
                        'in "without maturation".'
                ]
            }) +

            refBox({
                title: 'Acute myelomonocytic leukaemia - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts and blast equivalents (promonocytes) in bone marrow and/or blood',
                        'Positive for myeloid-associated markers (e.g. myeloperoxidase, CD13, CD33, CD117)',
                        'Maturing granulocytes constitute &ge; 20% of bone marrow cells',
                        'Monocyte-lineage cells constitute &ge; 20% of bone marrow cells',
                        'Not fulfilling criteria for AML types with defined genetic alterations, or for ' +
                            'myeloid neoplasm post cytotoxic therapy'
                    ]
                }],
                notes: [
                    'The former M4: both lineages at &ge; 20%, with promonocytes counted as blast ' +
                        'equivalents (as in CMML). Blasts are myeloperoxidase-positive (&ge; 3%); the ' +
                        'monocytic cells are nonspecific esterase-positive, and often more mature in the ' +
                        'blood than in the marrow.',
                    'Stated differentials: microgranular APL and <i>NPM1</i>-mutated AML. <i>FLT3</i>-ITD ' +
                        'reaches 25% here - the family\'s highest.'
                ]
            }) +

            refBox({
                title: 'Acute monocytic leukaemia - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts and blast equivalents (promonocytes) in bone marrow and/or blood',
                        '&ge; 80% of the leukaemic cells are monocytes and their precursors, ' +
                            'including monoblasts and promonocytes',
                        '&lt; 20% maturing granulocytic cells',
                        'Not fulfilling criteria for AML types with defining genetic abnormalities, or for ' +
                            'myeloid neoplasm post cytotoxic therapy'
                    ]
                }],
                notes: [
                    'The former M5. "Acute monoblastic leukaemia" (&ge; 80% monoblasts) remains an acceptable ' +
                        'distinction but is not required. Extramedullary disease is common - gingiva, ' +
                        'skin, CNS.',
                    'The hard boundary is CMML, and it turns on recognising promonocytes as blast ' +
                        'equivalents - poorly reproducible on smears. Flow cytometry helps: promonocytes run ' +
                        'CD14 weak/negative, CD36 weak, CD64 and HLA-DR strong; and the monocytic:granulocytic ' +
                        'ratio runs high in acute monocytic leukaemia, low in CMML.',
                    'Nonspecific esterase is typically strong but may be weak or absent - ' +
                        'immunophenotypic monocytic markers then carry the diagnosis. Other stated ' +
                        'differentials: microgranular APL, <i>NPM1</i>-mutated and <i>KMT2A</i>-rearranged ' +
                        'AML, plasmablastic myeloma.'
                ]
            }) +

            refBox({
                title: 'Acute basophilic leukaemia - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts, with increased immature and mature basophils',
                        'Blasts/basophils metachromatic on toluidine blue staining and negative for ' +
                            'myeloperoxidase, Sudan Black B, and nonspecific esterase',
                        'Blasts positive for at least two myeloid-associated markers (e.g. myeloperoxidase, ' +
                            'CD13, CD33, CD117)',
                        'Not fulfilling criteria for AML types with defined genetic alterations, or for ' +
                            'myeloid neoplasm post cytotoxic therapy'
                    ]
                }, {
                    label: 'Desirable',
                    items: ['Blasts positive for CD9 and/or CD203c, and negative for HLA-DR']
                }],
                notes: [
                    'Very rare. Immature basophils make up 20-80% of marrow cells, mature basophils are ' +
                        'sparse, and Auer rods are absent.',
                    'The differentials are CML in blast phase, the other AMLs with basophilia ' +
                        '(<i>DEK::NUP214</i>, <i>BCR::ABL1</i>) and mast cell leukaemia - strong CD117 ' +
                        'marks the mast cells, CAE-negativity the basophils. A rare infant-boy subtype ' +
                        'carries t(X;6)(p11;q23) / <i>MYB::GATA1</i>.'
                ]
            }) +

            refBox({
                title: 'Acute erythroid leukaemia - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        'Erythroid predominance, usually &ge; 80% of bone marrow elements, of ' +
                            'which &ge; 30% are proerythroblasts'
                    ]
                }, {
                    label: 'Desirable',
                    items: ['Evidence of <i>TP53</i> mutation']
                }],
                notes: [
                    'The family\'s exception: no &ge; 20% blast requirement. CD34-positive myeloblasts ' +
                        'are not increased - the arrest is erythroid, and the count that matters is ' +
                        'proerythroblasts. AEL supersedes AML-MR despite sharing its complex karyotype.',
                    'Biallelic (multi-hit) <i>TP53</i> alteration is characteristic, with complex ' +
                        'karyotypes and losses of 17/17p, 5/5q and 7/7q; p53 immunohistochemistry ' +
                        '(overexpression or complete loss) is a useful adjunct.',
                    'Reactive proerythroblast proliferations (B12/folate deficiency, haemolysis) show ' +
                        'no <i>TP53</i> mutation and a normal karyotype. Prognosis is dismal - median ' +
                        'survival 2-4 months.'
                ]
            }) +

            refBox({
                title: 'Acute megakaryoblastic leukaemia - WHO-HAEM5',
                groups: [{
                    label: 'Essential',
                    items: [
                        '&ge; 20% blasts with megakaryocytic differentiation in bone marrow and/or ' +
                            'peripheral blood',
                        'Blasts express at least one of the platelet glycoproteins: CD41, CD61, or CD42b',
                        'Criteria for other defined AML types are not met',
                        'No history of myeloproliferative neoplasm'
                    ]
                }, {
                    label: 'Desirable',
                    items: ['Evaluation for possible Down syndrome']
                }],
                notes: [
                    'The one family box excluding an MPN history by name: a transformed CML or other ' +
                        'MPN is MPN in blast phase, and megakaryoblastic morphology is where that ' +
                        'transformation shows up. The stated genetic differentials are AML with ' +
                        '<i>RBM15::MRTFA</i> and AML with <i>MECOM</i> rearrangement.',
                    'Cytoplasmic CD41/CD61 is more specific than surface staining - adherent platelets ' +
                        'give false positives. Myeloperoxidase is consistently negative, CD13/CD117 often ' +
                        'absent and CD45 weak, so small-blast cases mimic acute undifferentiated leukaemia, ' +
                        'minimal differentiation or ALL. Micromegakaryocytes are not counted as blasts, ' +
                        'and reticulin fibrosis is typical.',
                    'Three clinical groups: Down syndrome (its own entity, excellent prognosis), other ' +
                        'children (&gt; 75% fusion-driven - <i>CBFA2T3::GLIS2</i>, <i>RBM15::MRTFA</i>, ' +
                        '<i>NUP98::KDM5A</i>, <i>KMT2A</i>), and adults (<i>TP53</i>, <i>RB1</i>; extremely ' +
                        'poor prognosis). The RAM phenotype - strong CD56 with negative CD7, CD13, ' +
                        'CD36, CD45, CD38 and HLA-DR - marks the cytogenetically cryptic ' +
                        '<i>CBFA2T3::GLIS2</i> fusion and a very high induction-failure rate.'
                ]
            }) +

        refDiverge('WHO subtypes the family by differentiation ("AML with minimal differentiation", "…without ' +
            'maturation", and so on); ICC keeps a single residual AML, NOS with no subtype list, at ' +
            '10-19% blasts as MDS/AML, NOS and &ge; 20% as AML, NOS. Prior therapy is a "therapy-related" ' +
            'qualifier in ICC where WHO routes such cases to myeloid neoplasm post cytotoxic therapy. Pure ' +
            'erythroid leukaemia diverges hardest: WHO keeps it here with no blast floor, where ICC classifies ' +
            'it within AML with mutated <i>TP53</i> - its Table 21 admits "&ge; 20% blasts or meets ' +
            'criteria for pure erythroid leukemia".');
    }
});

// docs/who/aml-mr.md - the chapter plus Box 2.25, verbatim. THE CHAPTER SETTLED
// THE RECORDED AMBIGUITY (a bare history of MDS/MDS-MPN is its own route in) and
// Box 2.25 matches MR_CYTO_WHO and the eight-gene list entry for entry. Two
// rule corrections came out of its "absence of" list - see amlMr in
// MarrowDxAml.js. ICC side from Tables 20/21/25 of the pasted ICC paper.
referenceTopics.push({
    id: 'aml-mr',
    section: 'aml',
    title: 'AML, myelodysplasia-related',
    keywords: ['AML-MR', 'myelodysplasia-related', 'secondary AML', 'complex karyotype', 'ASXL1', 'STAG2',
        'antecedent MDS', 'oligoblastic', 'ISCN'],
    related: ['aml-overview', 'mds-ib', 'mn-pct', 'blasts', 'fibrosis'],
    body: function () {
        return refBox({
            title: 'AML-MR - WHO-HAEM5',
            groups: [{
                label: 'Essential',
                items: [
                    '&ge; 20% blasts in blood or marrow',
                    'Presence of at least one of: (1) a history of MDS or MDS/MPN, (2) one or more of the ' +
                        'Box 2.25 cytogenetic or molecular abnormalities below',
                    'Absence of: a history of exposure to cytotoxic therapy; a history of ' +
                        'myeloproliferative neoplasm; criteria for AML with defining genetic abnormalities; and ' +
                        'criteria for myeloid neoplasms associated with germline predisposition'
                ]
            }],
            notes: [
                'The history is its own route. A marrow at &ge; 20% blasts after documented MDS is AML-MR ' +
                    'with no qualifying abnormality needed - and conversely, the abnormality carries a de novo ' +
                    'case with no history. Morphological multilineage dysplasia, though present in most cases, ' +
                    'is not sufficient for the diagnosis.',
                'Acute erythroid leukaemia supersedes AML-MR, its biallelic <i>TP53</i> biology being its ' +
                    'own entity.',
                'Oligoblastic AML-MR - prior MDS with &lt; 30% marrow blasts and a stable course for ' +
                    '&ge; 2 months - may be managed akin to high-risk MDS: trial responses, survival and genetics ' +
                    'all track MDS with increased blasts.'
            ]
        }) +

        refH('Box 2.25 - the defining abnormalities') +
        refTable(['Cytogenetic', 'Somatic mutations'], [
            ['Complex karyotype (at least three abnormalities)<sup>a</sup>', '<i>ASXL1</i>'],
            ['del(5q) or loss of 5q due to unbalanced translocation', '<i>BCOR</i>'],
            ['Monosomy 7, del(7q), or loss of 7q due to unbalanced translocation', '<i>EZH2</i>'],
            ['del(11q)', '<i>SF3B1</i>'],
            ['del(12p) or loss of 12p due to unbalanced translocation', '<i>SRSF2</i>'],
            ['Monosomy 13 or del(13q)', '<i>STAG2</i>'],
            ['del(17p) or loss of 17p due to unbalanced translocation', '<i>U2AF1</i>'],
            ['Isochromosome 17q', '<i>ZRSR2</i>'],
            ['idic(X)(q13)', '']
        ]) +

        refP('<sup>a</sup> Footnote a is the ISCN counting rulebook for "complex": only clonal ' +
            'abnormalities count (one metaphase is ignored); numerical gains and losses, balanced ' +
            'translocations and one-chromosome unbalanced aberrations count as one; two-or-more-chromosome ' +
            'unbalanced aberrations, tetrasomy, triplication/quadruplication and isoderivative chromosomes count ' +
            'as two; constitutional abnormalities are not counted; with multiple clones or a composite ' +
            'karyotype, the count is taken from the clone (or metaphases) with the most abnormalities.') +

        refDiverge(refUL([
            'ICC splits WHO\'s one entity in two - with myelodysplasia-related gene mutations and ' +
                'with myelodysplasia-related cytogenetic abnormalities, the gene category taking ' +
                'precedence - each existing at 10-19% blasts as MDS/AML and at &ge; 20% as AML.',
            'ICC\'s gene list adds <i>RUNX1</i>; the cytogenetic lists differ in both directions (ICC ' +
                'adds +8 and del(20q); WHO adds del(11q) and −13/del(13q)).',
            'A history of MDS or MDS/MPN is a qualifier in ICC ("progressing from MDS"), never a route ' +
                'in; and prior cytotoxic therapy is likewise a qualifier where WHO routes such cases to myeloid ' +
                'neoplasm post cytotoxic therapy.'
        ]));
    }
});


/* ----------------------------------------------------------------------------
   Diagnosis-tab rule id -> reference topic.

   Kept here rather than in MarrowRef.js because it is a fact about the CONTENT:
   whether a rule has a criteria topic to link to is a property of what has been
   written above, and it changes on the same edit. A rule with no entry gets no
   link, which is the correct output for an entity nothing has been written about.
-------------------------------------------------------------------------- */
const referenceForRule = {
    mds5q:        'mds-5q',
    mdsSf3b1:     'mds-sf3b1',
    mdsTp53:      'mds-bitp53',
    mdsIB1:       'mds-ib',
    mdsIB2:       'mds-ib',
    mdsF:         'mds-ib',
    mdsH:         'mds-h',
    mdsLB:        'mds-lb',

    cml:          'cml',
    pv:           'pv',
    et:           'et',
    prePmf:       'pre-pmf',
    pmf:          'pmf',
    cnl:          'cnl',
    mpnU:         'mpn-u',

    cmml:         'cmml',
    mdsMpnSf3b1T: 'mds-mpn-sf3b1t',

    chip:         'chip',
    ccus:         'ccus',
    icus:         'icus',

    amlApl:       'aml-apl',
    amlRunx1t1:   'aml-runx1t1',
    amlCbfb:      'aml-cbfb',
    amlDek:       'aml-dek',
    amlRbm15:     'aml-rbm15',
    amlKmt2a:     'aml-kmt2a',
    amlMecom:     'aml-mecom',
    amlNup98:     'aml-nup98',
    amlNpm1:      'aml-npm1',
    amlCebpa:     'aml-cebpa',
    amlTp53:      'aml-overview',
    amlMr:        'aml-mr',
    aml:          'aml-diff'
};

/* The FAMILY fallback, consulted when a rule id has no entry above.

   It exists for one real case and it is not a convenience: the eight AML rules
   for recurrent genetic abnormalities are GENERATED from a spec table by
   dxAmlRule(), so their ids live in a data table rather than in the source of a
   rule, and enumerating them here would be a list to keep in step with that
   table forever. Without a fallback, eight AML cards carried no criteria link
   while five sibling AML cards did - an inconsistency that reads as a bug rather
   than as "we have no chapter for this one".

   Only 'aml' is mapped, and deliberately so. Every other family's entities have
   their own topic, and a family-wide fallback there would send a reader looking
   for polycythaemia vera's criteria to a page about the MPN family instead -
   worse than no link, because it looks like it answered. */
const referenceForFamily = {
    aml: 'aml-overview'
};
