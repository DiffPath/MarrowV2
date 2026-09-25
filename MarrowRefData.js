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

   ONE SHAPE FOR EVERY ENTITY PAGE (2026-09):
       refBox "WHO-HAEM5"  - criteria, then everything else as `notes`
       refTable            - only where the classification is a table
       refDiverge          - "ICC 2022", a list of differences
   No prose outside the boxes, no headings, no asides. refP and refH are for
   the bench pages ("At the scope") only, where the prose IS the answer.
   Notes are written to a hematopathologist: no definitions of terms of the
   trade, no explaining why a criterion exists, no mention of this app's
   rules or cards.

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

/* A table. Always headed: a header row costs one line and saves the reader
   working out what the columns are. No caption - a qualification goes in the
   nearest box's `notes`. */
function refTable(headers, rows) {
    const head = `<thead><tr>${headers.map(function (h) { return `<th>${h}</th>`; }).join('')}</tr></thead>`;
    const body = `<tbody>${rows.map(function (r) {
        return `<tr>${r.map(function (c) { return `<td>${c}</td>`; }).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<div class="refTableWrap"><table class="refTable">${head}${body}</table></div>`;
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
   triple-negative PMF - 5-10% of cases - its place in the differential.

   `title` is the classification ("WHO-HAEM5") on every entity page, so the WHO
   and ICC boxes read as a pair; a page holding several boxes (the AML
   differentiation subtypes, the two post-MPN MF boxes) titles each by its
   entity instead. A group `label` may be omitted where the box has one group
   and the title already says what it is. */
function refBox(spec) {
    const groups = (spec.groups || []).map(function (g) {
        const items = g.ordered ? refOL(g.items) : refUL(g.items);
        const label = g.label ? `<div class="refCritLabel">${g.label}</div>` : '';
        return `<div class="refCritGroup">${label}${items}</div>`;
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
   of how ICC's differ). One visual language; the title says which is which.

   ALWAYS A LIST. `items` is an array of short statements, one difference each;
   the subject is ICC and goes unsaid ("Requires >= 10% blasts", not "ICC
   requires..."). `table` is appended below the list for the two pages where
   ICC's difference is itself a table (CML phases, the AML blast lines, the MDS
   category map). */
function refDiverge(items, table) {
    return `<div class="refBox refDiverge"><div class="refBoxTitle">ICC 2022</div>` +
        `<div class="refBoxBody">${refUL(items)}${table || ''}</div></div>`;
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

/* Wright-stain colours. SHADED, not flat: a red cell is read by its central
   pallor, and a pallor that fades into the haemoglobin (the biconcave disc) is
   what the eye is trained on. A flat pale disc on a flat pink one read as a
   diagram of a target cell. The shading is a radial gradient per cell type,
   defined once in rbcDefs() and scaled to each shape by objectBoundingBox, so an
   ellipse gets an elliptical pallor without being told. */
const RBC_FILL   = '#E4A392';   // haemoglobin
const RBC_EDGE   = '#B8705F';   // membrane
const RBC_PALE   = '#F8E4DD';   // central pallor
const RBC_DENSE  = '#D07E68';   // a cell with no pallor stains deeper
const RBC_DEEP   = '#B9624D';   // the rim of a dense cell
const RBC_INCL   = '#4A2E6B';   // Howell-Jolly body
const RBC_STIPPLE= '#5E4E94';   // basophilic stippling
const RBC_RING   = '#AAB6C3';   // the dashed normal-size reference

/* The shared gradients. Every figure carries the same <defs>, so the ids repeat
   across the page; identical definitions make that harmless, and it keeps each
   figure self-contained (a card copied elsewhere still renders). */
function rbcDefs() {
    const stops = function (list) {
        return list.map(function (s) {
            return `<stop offset="${s[0]}%" stop-color="${s[1]}"/>`;
        }).join('');
    };
    return '<defs>' +
        /* Biconcave disc: pale centre fading to haemoglobin, a touch darker at the rim. */
        `<radialGradient id="rbcG-disc" cx="50%" cy="50%" r="50%">${stops([
            [0, RBC_PALE], [22, RBC_PALE], [55, RBC_FILL], [92, RBC_FILL], [100, RBC_EDGE]])}</radialGradient>` +
        /* Little or no pallor: a sphere lit slightly off-centre. */
        `<radialGradient id="rbcG-dense" cx="44%" cy="42%" r="60%">${stops([
            [0, '#E39580'], [60, RBC_DENSE], [100, RBC_DEEP]])}</radialGradient>` +
        /* A teardrop's pallor sits in the round body, not the bounding box centre. */
        `<radialGradient id="rbcG-tear" cx="50%" cy="66%" r="46%">${stops([
            [0, RBC_PALE], [24, RBC_PALE], [62, RBC_FILL], [100, RBC_EDGE]])}</radialGradient>` +
        /* Target: rim, pale ring, central button. */
        `<radialGradient id="rbcG-target" cx="50%" cy="50%" r="50%">${stops([
            [0, RBC_FILL], [22, RBC_FILL], [34, RBC_PALE], [56, RBC_PALE], [70, RBC_FILL],
            [94, RBC_FILL], [100, RBC_EDGE]])}</radialGradient>` +
        /* A disc with haemoglobin throughout (stippling, bite and blister bodies). */
        `<radialGradient id="rbcG-full" cx="50%" cy="50%" r="50%">${stops([
            [0, '#EDB7A8'], [70, RBC_FILL], [100, RBC_EDGE]])}</radialGradient>` +
        `<radialGradient id="rbcG-incl" cx="40%" cy="38%" r="60%">${stops([
            [0, '#6E4F92'], [100, RBC_INCL]])}</radialGradient>` +
        '</defs>';
}

/* Polar around the 100x100 box's centre, 0 degrees at twelve o'clock. */
function rbcPt(angle, r) {
    const a = (angle - 90) * Math.PI / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
}

const rbcXY = function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); };

/* A crenated outline: `n` rounded scallops around radius `r`, each `h` high.
   Built from quadratic curves between valleys, so the projections are short and
   rounded — the echinocyte's regular crenation — rather than thorns. */
function rbcCrenated(n, r, h) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const a0 = i * 360 / n, a1 = (i + 1) * 360 / n, am = (a0 + a1) / 2;
        const start = rbcPt(a0, r), tip = rbcPt(am, r + h * 2), end = rbcPt(a1, r);
        d += (i === 0 ? `M ${rbcXY(start)} ` : '') + `Q ${rbcXY(tip)} ${rbcXY(end)} `;
    }
    return d + 'Z';
}

/* The dashed circle of a normal red cell, drawn with a cell whose definition IS
   its size. Without it "macroovalocyte" and "microspherocyte" are just an oval
   and a circle. DRAWN LAST, ON TOP: behind the cell it vanishes wherever the
   cell is bigger, which is the case it exists for. Stroke-only, so it hides
   nothing. */
function rbcScaleRing() {
    return `<circle cx="50" cy="50" r="31" fill="none" stroke="${RBC_RING}" ` +
        `stroke-width="1.2" stroke-dasharray="3 3"/>`;
}

function rbcFig(inner) {
    return `<svg class="rbcFig" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
        `${rbcDefs()}${inner}</svg>`;
}

const RBC_STROKE = `stroke="${RBC_EDGE}" stroke-width="1.2" stroke-linejoin="round"`;

/* A plain disc - the baseline every other figure departs from. */
function rbcDisc(r, gradient) {
    return `<circle cx="50" cy="50" r="${r}" fill="url(#${gradient || 'rbcG-disc'})" ${RBC_STROKE}/>`;
}

/* The eighteen figures. Keyed by the descriptor key wherever one exists, so a
   dropdown entry and its picture cannot drift apart; `normal` is the reference
   card and belongs to no descriptor. */
const rbcFigures = {
    normal: function () { return rbcFig(rbcDisc(31)); },

    /* Many short, rounded, evenly spaced crenations; the pallor is kept. */
    echinocytes: function () {
        return rbcFig(`<path d="${rbcCrenated(18, 30, 2.2)}" fill="url(#rbcG-disc)" ${RBC_STROKE}/>`);
    },

    /* A small dense cell with a few spicules of UNEQUAL length at UNEQUAL spacing,
       each ending in a small knob — the "spur". Drawn as a body plus separate
       projections, which is what the cell looks like, rather than a star polygon,
       which is what the old figure looked like. No pallor. */
    acanthocytes: function () {
        /* [angle, length beyond the body] — irregular in both, fixed so the
           figure is the same every render. Each spur is a wide-based projection
           with a flat, slightly broadened tip, and the outline runs round the
           body between them. */
        const spurs = [[12, 11], [70, 7], [128, 12], [178, 6], [232, 10], [290, 8], [334, 12]];
        const body = 25;
        const pts = [];
        spurs.forEach(function (s, i) {
            const next = spurs[(i + 1) % spurs.length][0] + (i === spurs.length - 1 ? 360 : 0);
            pts.push(rbcPt(s[0] - 9, body), rbcPt(s[0] - 3.5, body + s[1]),
                rbcPt(s[0] + 3.5, body + s[1]), rbcPt(s[0] + 9, body));
            for (let a = s[0] + 18; a < next - 9; a += 9) pts.push(rbcPt(a, body));
        });
        return rbcFig(`<polygon points="${pts.map(rbcXY).join(' ')}" fill="url(#rbcG-dense)" ` +
            `stroke="${RBC_DEEP}" stroke-width="1.6" stroke-linejoin="round"/>`);
    },

    /* A helmet cell - the dome of a cell with a straight cut edge and a horn at
       each end - beside a small triangular fragment, the two commonest forms. */
    schistocytes: function () {
        /* Dome of a circle (centre 46,40, r 25) cut by a chord at y = 52, the
           cut edge bowed inward, and a sharp horn at each end of it. */
        const helmet = 'M 24.5,52 A 25,25 0 1 1 67.5,52 L 72,63 Q 46,47 20,63 Z';
        const fragment = 'M 66,72 L 90,78 L 73,92 Z';
        return rbcFig(
            `<path d="${helmet}" fill="url(#rbcG-dense)" ${RBC_STROKE}/>` +
            `<path d="${fragment}" fill="url(#rbcG-dense)" ${RBC_STROKE}/>`);
    },

    spherocytes: function () {
        return rbcFig(rbcDisc(24, 'rbcG-dense') + rbcScaleRing());
    },

    microspherocytes: function () {
        return rbcFig(rbcDisc(15, 'rbcG-dense') + rbcScaleRing());
    },

    elliptocytes: function () {
        return rbcFig(`<ellipse cx="50" cy="50" rx="41" ry="15" fill="url(#rbcG-disc)" ${RBC_STROKE}/>`);
    },

    ovalocytes: function () {
        return rbcFig(`<ellipse cx="50" cy="50" rx="34" ry="24" fill="url(#rbcG-disc)" ${RBC_STROKE}/>`);
    },

    /* Larger than the reference ring in both axes, and little pallor - the pair
       of features that separates it from an ovalocyte. */
    macroovalocytes: function () {
        return rbcFig(`<ellipse cx="50" cy="50" rx="44" ry="28" fill="url(#rbcG-dense)" ${RBC_STROKE}/>` +
            rbcScaleRing());
    },

    /* A crescent tapering to points at both ends. */
    sickleCells: function () {
        return rbcFig(
            `<path d="M 14,74 C 18,22 70,8 90,30 C 60,38 30,50 14,74 Z" fill="url(#rbcG-dense)" ` +
            `${RBC_STROKE}/>`);
    },

    /* A round body drawn out to one tapered tail. */
    teardropCells: function () {
        return rbcFig(
            `<path d="M 50,8 C 55,26 76,40 76,62 A 26,26 0 1 1 24,62 C 24,40 45,26 50,8 Z" ` +
            `fill="url(#rbcG-tear)" ${RBC_STROKE}/>`);
    },

    /* Rim, pale ring, central button - one gradient, so the rings blend as they
       do on a smear rather than sitting as three flat discs. */
    targetCells: function () {
        return rbcFig(rbcDisc(31, 'rbcG-target'));
    },

    /* The cell's major arc closed by a concave arc - the smooth "bite" left
       where the spleen removed a Heinz body.

       THE ENDPOINTS ARE THE TWO CIRCLES' INTERSECTIONS AND THEY ARE COMPUTED:
       cell (50,50) r=31, bite (81,50) r=16, so d = 31, a = (d² + r₁² − r₂²) / 2d =
       26.87, h = √(r₁² − a²) = 15.46, intersections (76.9, 50 ∓ 15.46). Guessed
       endpoints and arc flags drew a wedge; four flag combinations pick four arcs
       and three are wrong. */
    biteCells: function () {
        return rbcFig(
            `<path d="M 76.9,34.5 A 31,31 0 1 0 76.9,65.5 A 16,16 0 0 1 76.9,34.5 Z" ` +
            `fill="url(#rbcG-disc)" ${RBC_STROKE}/>`);
    },

    /* Membrane intact, haemoglobin retracted from one edge - so the OUTLINE is a
       whole cell and the FILL is not. A clip path, which is correct by
       construction. */
    blisterCells: function () {
        return rbcFig(
            `<clipPath id="rbcBlisterClip"><circle cx="50" cy="50" r="30"/></clipPath>` +
            `<circle cx="50" cy="50" r="31" fill="#FBEEEA" ${RBC_STROKE}/>` +
            `<circle cx="41" cy="50" r="28" fill="url(#rbcG-full)" clip-path="url(#rbcBlisterClip)"/>` +
            `<circle cx="50" cy="50" r="31" fill="none" ${RBC_STROKE}/>`);
    },

    howellJolly: function () {
        return rbcFig(rbcDisc(31) +
            `<circle cx="65" cy="37" r="5.5" fill="url(#rbcG-incl)"/>`);
    },

    /* Fine, evenly scattered dots through a cell with no pallor to speak of. A
       fixed table, not random, so the figure is the same every render. */
    basophilicStippling: function () {
        const dots = [[38, 32], [50, 28], [62, 33], [31, 43], [44, 41], [56, 44], [68, 42],
                      [34, 55], [47, 53], [60, 57], [70, 53], [40, 66], [53, 65], [64, 67],
                      [28, 50], [72, 64], [50, 76], [45, 30]];
        return rbcFig(rbcDisc(31, 'rbcG-full') +
            dots.map(function (d, i) {
                return `<circle cx="${d[0]}" cy="${d[1]}" r="${i % 3 === 0 ? 1.8 : 1.3}" fill="${RBC_STIPPLE}"/>`;
            }).join(''));
    }
};

/* The two synonym pairs draw the same cell, because they ARE the same cell. The
   dropdown offers both wordings, so both need a card to look up - and each card
   says which other entry it duplicates. */
rbcFigures.burrCells = rbcFigures.echinocytes;
rbcFigures.teardropForms = rbcFigures.teardropCells;

/* HOW EACH PHOTOGRAPH IS SHOWN, and whether it is shown at all.

   A WHOLE FIELD IN A THUMBNAIL SHOWS NOTHING. The Commons images are low-power
   fields 850-2560px wide, and squeezed into a card the cell in question was a few
   pixels across. Each card now shows a CROP around the example cells - `crop` is
   [x, y, w, h] in the source image's own pixels, `size` its full [w, h] - and a
   click opens the whole field. The crops were chosen by looking at each image;
   if a file is replaced, its crop must be chosen again.

   `hide` takes a photograph out of the atlas with the reason. Kept here rather
   than by editing MarrowRefImages.js, which is a generated file. */
const rbcPhotoViews = {
    acanthocytes:        { size: [902, 671],   crop: [520, 130, 280, 210] },
    schistocytes:        { size: [1063, 798],  crop: [400, 300, 280, 210] },
    spherocytes:         { size: [2560, 2048], crop: [474, 384, 333, 250] },
    elliptocytes:        { size: [2560, 2048], crop: [1203, 1126, 410, 307] },
    sickleCells:         { size: [853, 640],   crop: [270, 180, 240, 180] },
    teardropCells:       { size: [1242, 932],  crop: [360, 430, 320, 240] },
    targetCells:         { size: [2560, 2048], crop: [1560, 250, 320, 240] },
    howellJolly:         { size: [1386, 1036], crop: [740, 640, 220, 165] },
    basophilicStippling: { size: [2560, 2048], crop: [1101, 986, 538, 403] },
    /* A text-heavy infographic poster ("BITE CELL … SEEN IN G6PD DEFICENCY"),
       not a smear; its two inset photographs are too small to crop from. */
    biteCells:           { hide: true }
};
rbcPhotoViews.teardropForms = rbcPhotoViews.teardropCells;

/* The photograph half of a card, where there is one.

   DRAWING AND PHOTOGRAPH TOGETHER, never one instead of the other. The schematic
   shows the defining feature at full expression with nothing else in the field;
   the photograph shows what it actually looks like among overlapping cells at
   real stain variation.

   THE UNCONFIRMED BADGE IS NOT DECORATION. Commons is contributor-curated - its
   schistocyte category holds dog, rabbit and rat smears, and a search for
   Howell-Jolly bodies returned a quokka - so a filename is a claim and not a
   diagnosis. Until somebody who can tell has set `verified: true` in
   MarrowRefImages.js, the badge says so on the image itself. */
function rbcPhoto(key) {
    if (typeof rbcPhotos === 'undefined') return '';
    const p = rbcPhotos[key];
    const view = rbcPhotoViews[key] || {};
    if (!p || view.hide) return '';

    /* The crop as CSS: the frame takes the crop's aspect ratio, and the image is
       scaled so the crop fills it and offset so the crop sits in it. Percentages,
       so it holds at any card width. */
    let frameStyle = '', imgStyle = '';
    if (view.crop && view.size) {
        const c = view.crop, s = view.size;
        frameStyle = ` style="aspect-ratio: ${c[2]} / ${c[3]}"`;
        imgStyle = ` style="width: ${(s[0] / c[2] * 100).toFixed(2)}%; ` +
            `left: ${(-c[0] / c[2] * 100).toFixed(2)}%; top: ${(-c[1] / c[3] * 100).toFixed(2)}%"`;
    }

    const credit = p.source === 'own'
        ? ''
        : `<div class="rbcCredit">${p.author ? p.author + ' · ' : ''}` +
          `<a href="${p.licenceUrl || p.source}" target="_blank" rel="noopener">${p.licence}</a></div>`;

    return `<figure class="rbcPhoto${p.verified ? '' : ' rbcPhoto--unconfirmed'}">
        <a class="rbcFrame${view.crop ? ' rbcFrame--crop' : ''}" href="${p.file}" target="_blank"
           title="Open the full field"${frameStyle}>
            <img src="${p.file}" alt="${p.caption}" loading="lazy"${imgStyle}>
            ${p.verified ? '' : '<span class="rbcUnconfirmed">unconfirmed</span>'}
        </a>
        <figcaption>${p.caption}</figcaption>
        ${credit}
    </figure>`;
}

/* One card: what the cell looks like (`desc`), and what it suggests (`seen`). A
   synonym card says so in its `desc`. */
function rbcCard(spec) {
    const fig = rbcFigures[spec.key];
    return `<div class="rbcCard">
        <div class="rbcArt">${fig ? fig() : ''}${rbcPhoto(spec.key)}</div>
        <div class="rbcName">${spec.name}</div>
        <div class="rbcDesc">${spec.desc}</div>
        ${spec.seen ? `<div class="rbcSeen">${spec.seen}</div>` : ''}
    </div>`;
}

function rbcGrid(cards) {
    return `<div class="rbcGrid">${cards.map(rbcCard).join('')}</div>`;
}

/* ----------------------------------------------------------------------------
   Sections - the index's grouping. Labels only; a section blurb is one more line
   between the reader and the list.
-------------------------------------------------------------------------- */
const referenceSections = [
    { id: 'bench',   label: 'At the scope' },
    { id: 'mds',     label: 'Myelodysplastic neoplasms' },
    { id: 'mpn',     label: 'Myeloproliferative neoplasms' },
    { id: 'overlap', label: 'MDS/MPN and related' },
    { id: 'aml',     label: 'Acute myeloid leukaemia' }
];


const referenceTopics = [];

/* The same two sentences close the ICC block of every AML entity whose WHO box
   excludes prior cytotoxic therapy. One copy, so the eleven pages cannot drift
   into eleven wordings. */
const REF_ICC_THERAPY = 'Prior cytotoxic therapy is a "therapy-related" qualifier, not a separate entity. WHO ' +
    'classifies these cases as ' + refJump('mn-pct', 'MN-pCT') + '.';


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
    title: 'Cellularity',
    keywords: ['cellularity', 'hypocellular', 'hypercellular', 'age', '100 minus age', 'aplastic', 'fat'],
    related: ['mds-h', 'megakaryocytes'],
    body: function () {
        return refTable(['Age', 'Normal range', 'Reported mean'], [
                ['Under 20', '45-85%', '72.8%'],
                ['20 to under 40', '40-70%', '56.5%'],
                ['40 to under 60', '35-65%', '51-54%'],
                ['60 and over', '30-60%', '43-45%']
            ]) +
            refCite('Wong J, Jackson R, Chen L, et al. Determination of age-dependent bone marrow normocellularity. ' +
                '<i>Am J Clin Pathol</i>. 2024;161(2):170-176. doi:10.1093/ajcp/aqad129<br>' +
                'Hartsock RJ, Smith EB, Petty CS. Normal variations with aging of the amount of hematopoietic tissue ' +
                'in bone marrow from the anterior iliac crest. <i>Am J Clin Pathol</i>. 1965;43:326-331.') +

            refH('Expected cellularity in this app') +
            refUL([
                '100 minus age: the traditional rule. It overstates the decline with age; measured cellularity ' +
                    'falls about 3% per decade, not 10%.',
                'Evidence based: the age bands above as hard cut-offs, with no mild or marked grading.',
                'Hybrid: the average of the two.'
            ]) +

            refH('Hypoplastic MDS') +
            refP('Below 30% of normal cellularity under age 70, below 20% at 70 or older. Usually diffuse, ' +
                'sometimes patchy.');
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
    title: 'Fibrosis grading',
    keywords: ['fibrosis', 'reticulin', 'collagen', 'MF-0', 'MF-1', 'MF-2', 'MF-3', 'myelofibrosis', 'trichrome', 'osteosclerosis'],
    related: ['pmf', 'pre-pmf'],
    body: function () {
        /* TWO TABLES, NOT THE SOURCE'S ONE. Table 2.03 is four columns of prose,
           which in a half-width panel sets each cell four words wide. The
           reticulin definition is what a grade is assigned on and is split out;
           collagen and osteosclerosis are the confirmatory columns and follow
           under their own heading. No cell is abridged. */
        return refTable(['Grade', 'Reticulin'], [
                ['MF-0', 'Scattered linear reticulin with no intersections (crossovers), corresponding to ' +
                    'normal bone marrow'],
                ['MF-1', 'Loose network of reticulin with many intersections, especially in perivascular areas'],
                ['MF-2', 'Diffuse and dense increase in reticulin with extensive intersections, occasionally ' +
                    'with focal bundles of thick fibres mostly consistent with collagen and/or focal osteosclerosis'],
                ['MF-3', 'Diffuse and dense increase in reticulin with extensive intersections and coarse ' +
                    'bundles of thick fibres consistent with collagen, usually associated with osteosclerosis']
            ]) +

            refBox({
                title: 'WHO-HAEM5',
                groups: [{
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
            refTable(['Grade', 'Collagen', 'Osteosclerosis'], [
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

            refH('Grades named in the criteria') +
            refTable(['Criterion', 'Grade'], [
                ['Prefibrotic PMF, major 1', 'MF-0 or MF-1'],
                ['Overt PMF, major 1', 'MF-2 or MF-3'],
                ['ET, major 2', 'MF-0; very rarely MF-1'],
                ['Post-PV and post-ET MF', 'MF-2 or MF-3'],
                ['MDS-F', 'MF-2 or MF-3']
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
        return refP('Number is judged semiquantitatively: decreased, normal or increased. No WHO criterion ' +
                'requires a count, and published counts do not transfer between laboratories because they depend ' +
                'on field diameter, section thickness and cellularity.') +
            refP('The one direct series reports a mean of 1.5 megakaryocytes per 450× field (range 0.4-2.7) in ' +
                'normal marrows of mean cellularity 72%.') +
            refCite('Singal R, Belliveau RR. Quantitation of megakaryocytes in normal bone marrow. <i>Anal Quant ' +
                'Cytol Histol</i>. 1988;10(1):33-36.<br>' +
                'Zini G, Viscovo M. Cytomorphology of normal, reactive, dysmorphic, and dysplastic megakaryocytes in ' +
                'bone marrow aspirates. <i>Int J Lab Hematol</i>. 2021;43:23-28.') +

            refH('Distribution') +
            refP('Normally intertrabecular, single or in loose pairs. Tight clusters suggest MPN; a paratrabecular ' +
                'location suggests MDS.') +

            refTable(['Pattern', 'Morphology', 'Criterion'], [
                ['Dysplastic',
                    'Micromegakaryocytes; non-lobated nuclei at all sizes; multiple widely separated nuclei',
                    'MDS, 10% threshold'],
                ['ET',
                    'Enlarged, mature, hyperlobulated (staghorn) nuclei; no granulocytic or erythroid left shift',
                    'ET, major 2'],
                ['PMF',
                    'Proliferation with atypia: dense clusters, hypolobated bulbous nuclei, abnormal N:C ratio',
                    'Pre-PMF and PMF, major 1'],
                ['PV',
                    'Increased, mature and pleomorphic (varying size); often staghorn and hyperchromatic, in loose ' +
                        'clusters near the endosteum',
                    'PV, major 2']
            ]);
    }
});

// docs/who/mds-introduction.md for the differential and both denominators;
// blast equivalents from docs/who/mdsmpn-introduction-and-cmml.md. The WHO
// table below is WHO's alone; ICC's blood limb is drawn differently.
referenceTopics.push({
    id: 'blasts',
    section: 'bench',
    title: 'Blast count',
    keywords: ['blast', 'blasts', 'differential', '500 cell', '200 cell', 'promonocyte', 'CD34', 'Auer rod', 'denominator'],
    related: ['dysplasia', 'mds-ib', 'aml-overview'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
            groups: [{
                items: [
                    'Bone marrow: a 500-cell differential of all nucleated cells, on a smear or trephine imprint.',
                    'Peripheral blood: a 200-leukocyte differential.'
                ]
            }],
            notes: [
                'Marrow blasts are a percentage of all nucleated cells, including erythroid precursors. Blood ' +
                    'blasts are a percentage of leukocytes.',
                'In CMML, monoblasts and promonocytes count with myeloblasts, both for the 20% cut-off and for ' +
                    'CMML-1/CMML-2. In APL, abnormal promyelocytes count as blasts.',
                'Where the smear gives no count (fibrosis, dry tap), CD34 immunohistochemistry on the core is ' +
                    'the accepted substitute. It estimates the blast proportion of cellularity and misses ' +
                    'CD34-negative blasts.',
                'Lowering the MDS/AML line to 10% was considered and declined. MDS-IB2 may be treated as ' +
                    'AML-equivalent for therapy and trial eligibility.'
            ]
        }) +

        refTable(['Blasts', 'Category'], [
            ['&lt; 5% marrow and &lt; 2% blood', 'MDS-LB, MDS-5q, MDS-SF3B1, MDS-h'],
            ['5-9% marrow and/or 2-4% blood', 'MDS-IB1'],
            ['10-19% marrow and/or 5-19% blood', 'MDS-IB2'],
            ['Auer rods, 5-19% marrow or 2-19% blood', 'MDS-IB2'],
            ['&ge; 20%', 'AML']
        ]) +

        refDiverge([
            'MDS with excess blasts: 5-9% marrow or 2-9% blood.',
            'MDS/AML: 10-19% marrow or blood.',
            'Most genetically defined AML needs only &ge; 10% blasts. See ' +
                refJump('aml-overview', 'AML overview') + '.'
        ]);
    }
});

// docs/who/mds-introduction.md - threshold verbatim - and the per-lineage
// feature table is Table 2.10, docs/who/mds-dysplasia-table-2.10.md, pasted
// later and now transcribed row for row (the prose paraphrase it replaced
// lacked megaloblastic changes and Auer rods, which the table carries). The
// same terms drive the dropdowns: aspDescriptorGroups in MarrowAsp.js and
// dysplasticDescriptors in MarrowFindings.js.
referenceTopics.push({
    id: 'dysplasia',
    section: 'bench',
    title: 'Dysplasia',
    keywords: ['dysplasia', 'dyserythropoiesis', 'dysgranulopoiesis', 'dysmegakaryopoiesis', '10%', 'pelger', 'micromegakaryocyte'],
    related: ['blasts', 'mds-overview', 'ccus'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
            groups: [{
                items: [
                    '10% of cells in a lineage, for every lineage, in all MDS types and in MDS/MPN.',
                    'Evaluate both the biopsy (or clot) and the aspirate.'
                ]
            }],
            notes: [
                'The dysplastic lineage need not be the cytopenic one.',
                'Megaloblastic change alone does not establish dyserythropoiesis.',
                'Single- versus multilineage dysplasia is no longer needed for classification.',
                'Do not diagnose MDS without a known clinical and drug history, or reclassify during growth ' +
                    'factor therapy, including erythropoietin. Drugs, infection, nutritional deficiency and immune ' +
                    'disorders can cause both cytopenia and dysplasia.'
            ]
        }) +

        refTable(['Lineage', 'Nuclear', 'Cytoplasmic'], [
            ['Dyserythropoiesis',
                'Budding, internuclear bridging, multinucleation, megaloblastic changes, karyorrhexis',
                'Ring sideroblasts, vacuolization, PAS positivity'],
            ['Dysgranulopoiesis',
                'Hyposegmentation (pseudo-Pelger-Huët), hypersegmentation',
                'Hypogranularity, pseudo-Chédiak-Higashi granules, small size, Auer rods'],
            ['Dysmegakaryopoiesis',
                'Hypolobation in megakaryocytes of all sizes, multinucleation (multiple widely separated nuclei)',
                'Micromegakaryocytes']
        ]);
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
            title: 'WHO-HAEM5',
            groups: [{
                label: 'Cytopenic below',
                items: [
                    'Haemoglobin &lt; 13 g/dL in men, &lt; 12 g/dL in women',
                    'Absolute neutrophil count &lt; 1.8 &times; 10<sup>9</sup>/L',
                    'Platelets &lt; 150 &times; 10<sup>9</sup>/L'
                ]
            }],
            notes: [
                'The same thresholds apply to CCUS, MDS and MDS/MPN.',
                'MDS requires at least one cytopenia, though milder anaemia is acceptable with definitive ' +
                    'morphological and cytogenetic findings.',
                'Persistent neutrophilia, monocytosis, erythrocytosis or thrombocytosis alongside cytopenia and ' +
                    'dysplasia usually means MDS/MPN or MPN. MDS-5q is the exception and allows thrombocytosis ' +
                    '(&ge; 450 &times; 10<sup>9</sup>/L).'
            ]
        }) +

        refDiverge([
            'Same thresholds. ICC also requires a cytopenia for CMML, which WHO does not.'
        ]);
    }
});

// The seventeen entries of the Blood tab's anisopoikilocytosis dropdown
// (bloodDescriptorGroups.pbAnisoDesc), plus a normal disc to compare them
// against. Figures are drawn from geometry - see the RED CELL FIGURES block near
// the top of this file.
//
// GROUPED BY WHAT YOU ARE LOOKING AT, NOT ALPHABETICALLY. The dropdown is
// alphabetical because a dropdown you are searching by name should be; a page
// you are searching by SHAPE should not. Grouping this way also puts the
// confusable pairs side by side: two are the same cell under two names, and
// spherocyte/microspherocyte and elliptocyte/ovalocyte differ only by degree.
//
// SEVEN CARDS HAVE NO PHOTOGRAPH (echinocytes, burr cells, macroovalocytes,
// ovalocytes, microspherocytes, blister cells, bite cells): Commons had no
// properly licensed image, the candidate had a heavy green cast, or (bite cells)
// the file is an infographic rather than a smear - see rbcPhotoViews.
// Schematic-only until a real image exists.
referenceTopics.push({
    id: 'rbc-morphology',
    section: 'bench',
    title: 'Red cell morphology',
    keywords: ['RBC', 'red cell', 'poikilocytosis', 'anisopoikilocytosis', 'morphology', 'atlas',
        'acanthocyte', 'echinocyte', 'burr', 'schistocyte', 'keratocyte', 'helmet',
        'spherocyte', 'microspherocyte', 'elliptocyte', 'ovalocyte', 'macroovalocyte',
        'sickle', 'drepanocyte', 'teardrop', 'dacrocyte', 'target', 'codocyte',
        'bite', 'blister', 'Heinz', 'Howell-Jolly', 'basophilic stippling'],
    unverified: 'Drawings are schematic. Photographs are from Wikimedia Commons and have not been confirmed by a ' +
        'pathologist. Descriptions and associations are general haematology, not a pasted source.',
    related: ['pmf', 'fibrosis', 'dysplasia'],
    body: function () {
        return rbcGrid([
                { key: 'normal', name: 'Normal',
                  desc: 'Round, with central pallor about a third of the diameter.' }
            ]) +

            refH('Spiculated') +
            rbcGrid([
                { key: 'echinocytes', name: 'Echinocytes',
                  desc: '10-30 short spicules, evenly spaced and of uniform length. Central pallor preserved.',
                  seen: 'Uraemia, pyruvate kinase deficiency; often a storage or slide artefact.' },
                { key: 'burrCells', name: 'Burr cells',
                  desc: 'Synonym for echinocytes.' },
                { key: 'acanthocytes', name: 'Acanthocytes',
                  desc: '2-10 blunt spicules, irregular in length and spacing. Dense, without central pallor.',
                  seen: 'Liver disease (spur cell anaemia), abetalipoproteinaemia, post-splenectomy.' }
            ]) +

            refH('Fragmented') +
            rbcGrid([
                { key: 'schistocytes', name: 'Schistocytes',
                  desc: 'Fragments with straight, sharp edges: helmet cells, triangles, keratocytes.',
                  seen: 'Microangiopathic haemolysis (TTP, HUS, DIC), mechanical valve, severe burns.' }
            ]) +

            refH('Spherocytic') +
            rbcGrid([
                { key: 'spherocytes', name: 'Spherocytes',
                  desc: 'Small, round and dense, with no central pallor.',
                  seen: 'Hereditary spherocytosis; autoimmune haemolytic anaemia.' },
                { key: 'microspherocytes', name: 'Microspherocytes',
                  desc: 'Very small spherocytes.',
                  seen: 'Burns, fragmentation, severe haemolysis.' }
            ]) +

            refH('Elongated') +
            rbcGrid([
                { key: 'elliptocytes', name: 'Elliptocytes',
                  desc: 'Cigar- or rod-shaped; long axis more than twice the short axis.',
                  seen: 'Hereditary elliptocytosis; iron deficiency; MDS.' },
                { key: 'ovalocytes', name: 'Ovalocytes',
                  desc: 'Egg-shaped; less elongated than an elliptocyte.',
                  seen: 'Megaloblastic anaemia, MDS, thalassaemia.' },
                { key: 'macroovalocytes', name: 'Macroovalocytes',
                  desc: 'Large and oval, with little or no central pallor.',
                  seen: 'Megaloblastic anaemia (B12 or folate deficiency).' },
                { key: 'sickleCells', name: 'Sickle cells',
                  desc: 'Crescent-shaped with pointed ends; dense, no pallor.',
                  seen: 'Sickle cell disease.' }
            ]) +

            refH('Teardrop') +
            rbcGrid([
                { key: 'teardropCells', name: 'Teardrop cells',
                  desc: 'Drawn out to a single blunt tail.',
                  seen: 'Marrow fibrosis or infiltration; thalassaemia; megaloblastic anaemia.' },
                { key: 'teardropForms', name: 'Teardrop forms',
                  desc: 'Synonym for teardrop cells.' }
            ]) +

            refH('Oxidative injury') +
            rbcGrid([
                { key: 'blisterCells', name: 'Blister cells',
                  desc: 'Haemoglobin retracted from one edge, leaving a clear space under intact membrane.',
                  seen: 'G6PD deficiency, oxidant drugs.' },
                { key: 'biteCells', name: 'Bite cells',
                  desc: 'Smooth semicircular defect at the edge, left by splenic removal of a Heinz body.',
                  seen: 'G6PD deficiency, oxidant drugs.' }
            ]) +

            refH('Target') +
            rbcGrid([
                { key: 'targetCells', name: 'Target cells',
                  desc: 'Central spot of haemoglobin within the zone of pallor.',
                  seen: 'Liver disease, thalassaemia, haemoglobin C, post-splenectomy, iron deficiency.' }
            ]) +

            refH('Inclusions') +
            rbcGrid([
                { key: 'howellJolly', name: 'Howell-Jolly bodies',
                  desc: 'Single round, dense nuclear remnant, usually eccentric.',
                  seen: 'Absent or non-functioning spleen; megaloblastic anaemia; MDS.' },
                { key: 'basophilicStippling', name: 'Basophilic stippling',
                  desc: 'Fine blue-purple dots evenly distributed through the cell (ribosomal).',
                  seen: 'Lead poisoning, thalassaemia, MDS, pyrimidine 5′-nucleotidase deficiency.' }
            ]) +

            refCite('Photographs: Wikimedia Commons (CC0, CC BY, CC BY-SA), credited under each image.');
    }
});

// Thresholds from docs/who/mds-sf3b1.md, docs/who/mds-introduction.md and
// docs/who/mds-h-and-mds-ib.md. The morphological definition is the IWGM-MDS
// consensus (Mufti 2008), which is the definition WHO adopted in 2008 and has
// carried since.
referenceTopics.push({
    id: 'ring-sideroblasts',
    section: 'bench',
    title: 'Ring sideroblasts',
    keywords: ['ring sideroblast', 'sideroblast', 'iron', 'Prussian blue', 'SF3B1', 'mitochondrial', 'IWGM'],
    related: ['mds-sf3b1', 'dysplasia'],
    body: function () {
        return refP('An erythroid precursor with at least five perinuclear siderotic granules covering at least ' +
                'one third of the nuclear circumference. Counted as a percentage of erythroid precursors on the ' +
                'aspirate smear; an iron stain on a section shows storage iron only.') +
            refCite('Mufti GJ, Bennett JM, Goasguen J, et al. Diagnosis and classification of myelodysplastic ' +
                'syndrome: International Working Group on Morphology of myelodysplastic syndrome (IWGM-MDS) consensus ' +
                'proposals for the definition and enumeration of myeloblasts and ring sideroblasts. ' +
                '<i>Haematologica</i>. 2008;93(11):1712-1717.') +

            refTable(['Threshold', 'Significance'], [
                ['&ge; 5%', 'Reportable. MDS-SF3B1 accounts for over 90% of MDS at this level.'],
                ['&ge; 15%', 'Substitutes for <i>SF3B1</i> testing where unavailable. "MDS with low blasts and ' +
                    'ring sideroblasts" remains acceptable for <i>SF3B1</i>-wildtype cases at this level.']
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
    title: 'MDS overview',
    keywords: ['MDS', 'myelodysplastic', 'overview', 'classification', 'neoplasm'],
    related: ['dysplasia', 'cytopenias', 'blasts', 'ccus'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Genetically defined',
                    items: ['MDS-5q', 'MDS-SF3B1', 'MDS-biTP53 (takes precedence over both)']
                },
                {
                    label: 'Morphologically defined',
                    items: ['MDS-LB', 'MDS-h', 'MDS-IB1', 'MDS-IB2', 'MDS-F']
                },
                {
                    label: 'All types',
                    items: [
                        'Cytopenia in at least one lineage',
                        'Dysplasia at the 10% threshold, unless a defining genetic abnormality is present',
                        'Blasts &lt; 20%',
                        'Blood and marrow smears, plus at least one of karyotype/FISH, mutation analysis or flow ' +
                            'cytometry; karyotype remains paramount'
                    ]
                }
            ],
            notes: [
                'An <i>SF3B1</i> mutation, or a <i>TP53</i> mutation that is not multi-hit, does not override ' +
                    'MDS-5q. Biallelic <i>TP53</i> inactivation does.',
                'MDS, unclassifiable has been removed; with CCUS in the scheme it is no longer needed.'
            ]
        }) +

        refDiverge([
            'No equivalent of MDS-h (hypocellularity is a qualifier on MDS, NOS) or of MDS-F.'
        ], refTable(['Category', 'Definition'], [
            ['MDS with mutated <i>SF3B1</i>', '<i>SF3B1</i> VAF &ge; 10%'],
            ['MDS with del(5q)', 'As WHO'],
            ['MDS, NOS without dysplasia', '&minus;7/del(7q) or complex karyotype; no WHO equivalent'],
            ['MDS, NOS with single or multilineage dysplasia', 'Two categories; both are WHO MDS-LB'],
            ['MDS with excess blasts', '5-9% marrow, 2-9% blood'],
            ['MDS/AML', '10-19% marrow or blood'],
            ['MDS with mutated <i>TP53</i>', 'Multi-hit; excluded from every other category']
        ]));
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
            title: 'WHO-HAEM5',
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
                'With dysplasia below 10%, consider ' + refJump('ccus', 'CCUS') + ' or ' + refJump('icus', 'ICUS') + '.'
            ]
        }) +

        refDiverge([
            'Keeps the dysplasia count as two categories: MDS, NOS with single lineage dysplasia and MDS, NOS ' +
                'with multilineage dysplasia.',
            'Adds MDS, NOS without dysplasia: cytopenia, &lt; 5% marrow blasts, and &minus;7/del(7q) or a ' +
                'complex karyotype. A non-dysplastic marrow with monosomy 7 is therefore MDS by ICC and ' +
                refJump('ccus', 'CCUS') + ' by WHO.'
        ]);
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
            title: 'WHO-HAEM5',
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
                'Hypocellular: below 30% of normal cellularity under age 70, below 20% at 70 or older. Usually ' +
                    'diffuse, sometimes patchy.',
                'Dyserythropoiesis alone does not meet the dysplasia criterion.',
                'The main differentials are aplastic anaemia and PNH. At very low cellularity, aplastic anaemia may ' +
                    'not be separable on morphology.'
            ]
        }) +

        refDiverge([
            'Not an entity. Hypocellularity is a qualifier on MDS, NOS.'
        ]);
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
            title: 'WHO-HAEM5',
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
                'Either count can raise the subtype: 7% marrow blasts with 6% blood blasts is MDS-IB2.',
                'MDS-IB2 may be treated as AML-equivalent for therapy and trial eligibility.'
            ]
        }) +

        refTable(['Subtype', 'Blasts'], [
            ['MDS-IB1', '5-9% marrow and/or 2-4% blood'],
            ['MDS-IB2', '10-19% marrow and/or 5-19% blood, or Auer rods'],
            ['MDS-F', 'MDS-IB range with MF-2 or MF-3 fibrosis (about 15% of MDS-IB)']
        ]) +

        refDiverge([
            'MDS with excess blasts is 5-9% marrow or 2-9% blood; WHO MDS-IB1 stops at 4% blood. 6% marrow ' +
                'with 6% blood blasts is MDS-IB2 by WHO and MDS-EB by ICC.',
            'MDS/AML covers 10-19% in marrow or blood, subtyped as mutated <i>TP53</i>, myelodysplasia-related ' +
                'gene mutations, myelodysplasia-related cytogenetic abnormalities, or NOS.',
            'At 10-19%, <i>NPM1</i> or in-frame bZIP <i>CEBPA</i> makes the case AML, and <i>TP53</i> makes it ' +
                'MDS/AML with mutated <i>TP53</i>.'
        ]);
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
            title: 'WHO-HAEM5',
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
                'The only MDS type that allows thrombocytosis (&ge; 450 &times; 10<sup>9</sup>/L).'
            ]
        }) +

        refDiverge([
            'Named MDS with del(5q). Same cytogenetics: del(5q) with up to one other abnormality, not ' +
                '&minus;7/del(7q).',
            'Multi-hit <i>TP53</i> is its only stated mutational exclusion.'
        ]);
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
            title: 'WHO-HAEM5',
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
                '"MDS with low blasts and ring sideroblasts" remains an acceptable name for cases with wildtype ' +
                    '<i>SF3B1</i> and/or &ge; 15% ring sideroblasts.',
                'With thrombocytosis, see ' + refJump('mds-mpn-sf3b1t', 'MDS/MPN-SF3B1-T') + '.'
            ]
        }) +

        refDiverge([
            'Requires <i>SF3B1</i> at VAF &ge; 10%, and ring sideroblasts cannot substitute. WHO sets no VAF ' +
                'threshold.',
            'Also excludes co-mutated <i>RUNX1</i> and multi-hit <i>TP53</i>.',
            'Excludes isolated del(5q), &minus;7/del(7q), abn3q26.2 and complex karyotype.'
        ]);
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
            title: 'WHO-HAEM5',
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
                'Any blast count below 20% qualifies, so this takes precedence over MDS-5q, MDS-SF3B1 and MDS-IB.',
                'Monoallelic <i>TP53</i> alteration behaves like wildtype and does not qualify.',
                'Where multi-hit status cannot be assessed, a <i>TP53</i> VAF &ge; 40% and/or a complex karyotype ' +
                    'may carry a similar prognosis. This is a surrogate, not a criterion.'
            ]
        }) +

        refDiverge([
            'Named MDS with mutated <i>TP53</i> (multi-hit) and split by blasts: &lt; 10% MDS, 10-19% MDS/AML, ' +
                '&ge; 20% AML with mutated <i>TP53</i>.',
            'Multi-hit <i>TP53</i> is an exclusion in every other ICC MDS category.'
        ]);
    }
});


/* ============================================================================
   MYELOPROLIFERATIVE NEOPLASMS
   ========================================================================= */

// docs/who/mpn-cml.md; the ICC block is Table 2 of docs/who/icc-2022-arber-blood.md.
referenceTopics.push({
    id: 'cml',
    section: 'mpn',
    title: 'Chronic myeloid leukaemia',
    keywords: ['CML', 'BCR::ABL1', 'Philadelphia', 'basophilia', 'myelocyte peak', 'blast phase'],
    related: ['pv', 'et', 'pmf', 'aml-bcrabl'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
            groups: [{
                label: 'Essential',
                items: [
                    'Peripheral blood neutrophilic leukocytosis',
                    'Detection of the Philadelphia chromosome and/or <i>BCR::ABL1</i>'
                ]
            }],
            notes: [
                'Atypical presentations include marked thrombocytosis without leukocytosis, mimicking ET. The ' +
                    'fusion defines the disease.',
                'Granulocytic dysplasia should be absent in blood and marrow; if present, consider an atypical ' +
                    'myeloid neoplasm.',
                'Neutrophils at all stages of maturation, with peaks of myelocytes and segmented neutrophils. ' +
                    'Basophilia and eosinophilia are common. Megakaryocytes are increased in over half of cases, ' +
                    'typically small and hypolobated.',
                '&ge; 20% blood basophils is a high-risk feature of chronic phase, not a diagnostic threshold.'
            ]
        }) +

        refDiverge([
            'Keeps accelerated phase, which WHO-HAEM5 treats as chronic phase with high-risk features.'
        ], refTable(['Accelerated phase', 'Blast phase'], [
            ['Blood or marrow blasts 10-19%', 'Blood or marrow blasts &ge; 20%'],
            ['Blood basophils &ge; 20%', 'Myeloid sarcoma'],
            ['Additional clonal abnormality in Ph+ cells (major route): second Ph, +8, i(17q), +19, ' +
                'complex karyotype, 3q26.2 abnormalities',
             'Lymphoblasts &gt; 5% raise lymphoid blast phase (immunophenotyping required)']
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
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Major',
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
                    label: 'Minor',
                    items: ['Subnormal serum erythropoietin level']
                }
            ],
            rule: 'Requires either all three major criteria, or the first two major criteria plus the minor ' +
                'criterion.',
            notes: [
                '<sup>a</sup> Haematocrit threshold in the presence of a <i>JAK2</i> mutation. Without one, a ' +
                    'higher threshold (e.g. 52% in men) could be considered before further investigation.',
                '<sup>b</sup> Major criterion 2 may not be required with sustained absolute erythrocytosis ' +
                    '(haemoglobin &gt; 18.5 g/dL in men or &gt; 16.5 g/dL in women, or haematocrit &gt; 55.5% in ' +
                    'men or &gt; 49.5% in women) if major criterion 3 and the minor criterion are present.',
                'Iron deficiency can mask erythrocytosis. WHO does not use the term "masked PV"; such cases are ' +
                    'MPN-NOS with close follow-up.'
            ]
        }) +

        refDiverge([
            'Criterion 1 also accepts red cell mass &gt; 25% above mean normal predicted value. The haemoglobin ' +
                'and haematocrit thresholds are the same.',
            'The major criteria are ordered differently: <i>JAK2</i> second, biopsy third. "First two major plus ' +
                'the minor" is therefore threshold + mutation + low EPO, with no marrow needed. Under WHO, skipping ' +
                'the biopsy needs footnote b\'s higher thresholds, which ICC also has.',
            'The biopsy criterion asks for megakaryocytes "without atypia" where WHO writes "(differences in ' +
                'size)".',
            'In <i>JAK2</i>-negative cases, look for noncanonical <i>JAK2</i> mutations in exons 12-15.'
        ]);
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
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Major',
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
                    label: 'Minor',
                    items: ['Presence of a clonal marker', 'Exclusion of reactive thrombocytosis']
                }
            ],
            rule: 'Requires either all four major criteria, or the first three plus a minor criterion.',
            notes: [
                'The minor criteria allow triple-negative ET.',
                'Against prefibrotic PMF, major criterion 2 decides, not the platelet count. Pre-PMF adds increased ' +
                    'cellularity for age, granulocytic proliferation and megakaryocytic atypia.'
            ]
        }) +

        refDiverge([
            'Same criteria.',
            'A footnote defines dense clustering as &ge; 3 adjacent megakaryocytes with no other cells between. ' +
                'Small clusters (&le; 6) may occasionally be seen in ET; more large clusters (&gt; 6) with ' +
                'granulocytic proliferation are a hallmark of pre-PMF.',
            'Specifies driver assay sensitivity: <i>JAK2</i> V617F below 1% VAF, <i>CALR</i> and <i>MPL</i> 1-3%.'
        ]);
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
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Major',
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
                    label: 'Minor',
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
                'Major criterion 3 is met by a driver mutation, another clonal marker, or the absence of reactive ' +
                    'fibrosis. A triple-negative case with no clonal marker still qualifies once reactive fibrosis is ' +
                    'excluded (triple-negative PMF is 5-10% of cases).',
                '<sup>b</sup> Without a driver mutation, look for other myeloid neoplasm mutations (<i>ASXL1</i>, ' +
                    '<i>EZH2</i>, <i>TET2</i>, <i>IDH1</i>, <i>IDH2</i>, <i>SRSF2</i>, <i>SF3B1</i>).',
                '<sup>c</sup> Reactive grade 1 fibrosis: infection, autoimmune or other chronic inflammatory ' +
                    'disorder, hairy cell leukaemia or other lymphoid neoplasm, metastatic malignancy, toxic ' +
                    '(chronic) myelopathy.'
            ]
        }) +

        refDiverge([
            'Same three-way clonality criterion ("<i>JAK2</i>, <i>CALR</i>, or <i>MPL</i> mutation or presence ' +
                'of another clonal marker or absence of reactive bone marrow reticulin fibrosis"), numbered major 2. ' +
                'Triple-negative cases qualify in both classifications.',
            'Fibrosis is written "grade &lt; 2", equivalent to WHO\'s limit.',
            'Splenomegaly must be palpable; WHO also accepts detection by imaging.'
        ]);
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
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Major',
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
                    label: 'Minor',
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
                'Leukoerythroblastosis is the one minor criterion not in the prefibrotic box.',
                '<sup>b</sup> MPN can show monocytosis and mimic CMML. A history of MPN excludes CMML; MPN marrow ' +
                    'features and/or a <i>JAK2</i>, <i>CALR</i> or <i>MPL</i> mutation favour MPN with monocytosis.',
                '<sup>c</sup> As for prefibrotic PMF: other myeloid neoplasm mutations may establish clonality.',
                '<sup>d</sup> Reactive fibrosis: infection, autoimmune or other chronic inflammatory condition, hairy ' +
                    'cell leukaemia or other lymphoid neoplasm, metastatic malignancy, toxic (chronic) myelopathy.'
            ]
        }) +

        refDiverge([
            'Same criteria, including the third limb of the clonality criterion ("or absence of reactive ' +
                'myelofibrosis") and leukoerythroblastosis; the clonality criterion is numbered second.',
            'Splenomegaly must be palpable; WHO also accepts detection by imaging.',
            'The monocytosis footnote matches WHO\'s: a history of MPN excludes CMML, and a higher driver VAF ' +
                'favours PMF with monocytosis.'
        ]);
    }
});

// docs/who/mpn-pv.md and docs/who/mpn-et.md - both boxes verbatim
// (adapted from Barosi et al., Leukemia 2008). Both chapters state the same
// combination rule; it is printed on both boxes.
referenceTopics.push({
    id: 'post-mpn-mf',
    section: 'mpn',
    title: 'Post-PV and post-ET myelofibrosis',
    keywords: ['post-PV', 'post-ET', 'myelofibrosis', 'IWG-MRT', 'progression', 'splenomegaly'],
    related: ['pv', 'et', 'pmf'],
    body: function () {
        return refBox({
            title: 'Post-PV myelofibrosis',
            groups: [
                {
                    label: 'Required',
                    items: [
                        'A previous diagnosis of WHO-defined polycythaemia vera',
                        'Bone marrow fibrosis of grade 2-3 on a scale of 0-3'
                    ]
                },
                {
                    label: 'Additional',
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
            ],
            rule: 'Requires both required criteria and at least two additional criteria.'
        }) +

        refBox({
            title: 'Post-ET myelofibrosis',
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
            rule: 'Requires both required criteria and at least two additional criteria.'
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
            title: 'WHO-HAEM5',
            groups: [{
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
                'Exclude a plasma cell neoplasm: G-CSF from neoplastic plasma cells can cause a neutrophilic ' +
                    'leukaemoid reaction. Toxic granulation and Döhle bodies favour the reactive process.',
                '<i>CSF3R</i> is mutated in &gt; 60% of CNL (vs &lt; 20% of MDS/MPN with neutrophilia), but its ' +
                    'absence does not exclude CNL. <i>ASXL1</i>, <i>TET2</i> and/or <i>DNMT3A</i> co-mutation is ' +
                    'nearly universal; <i>ASXL1</i> is adverse.',
                'Monocytosis, eosinophilia, basophilia or dysgranulopoiesis should prompt review for ' +
                    refJump('cmml', 'CMML') + ' or MDS/MPN with neutrophilia (atypical CML).'
            ]
        }) +

        refDiverge([
            'WBC threshold is &ge; 13 &times; 10<sup>9</sup>/L with an activating <i>CSF3R</i> mutation ' +
                '(&ge; 25 without one). WHO requires &ge; 25 in all cases.',
            'Defines accelerated phase (10-19% blasts in blood or marrow) and blast phase (&ge; 20%).',
            'No marrow myeloblast &lt; 5% clause. Excludes the whole M/LN-eo family rather than naming ' +
                '<i>PCM1</i>::<i>JAK2</i>.'
        ]);
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
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'All of',
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
                    label: 'None of',
                    items: [
                        'Insufficient clinical data or inadequate bone marrow specimen for accurate evaluation ' +
                            'and classification',
                        'Recent history of cytotoxic or growth factor therapy, particularly when dysplastic ' +
                            'features are seen'
                    ]
                }
            ],
            notes: [
                '<sup>a</sup> The report should describe the morphology, say why a specific subtype cannot be ' +
                    'assigned, name the MPN types that can be excluded, and recommend further workup (expanded ' +
                    'molecular testing, or repeat blood and marrow within a reasonable interval).',
                '<sup>b</sup> Effects of previous treatment, severe comorbidity, and changes of natural disease ' +
                    'progression must be excluded.',
                '<sup>c</sup> Without a driver mutation, other myeloid neoplasm mutations (e.g. <i>ASXL1</i>, ' +
                    '<i>EZH2</i>, <i>TET2</i>, <i>IDH1</i>, <i>IDH2</i>, <i>SRSF2</i>, <i>SF3B1</i>) or ' +
                    'translocations such as those involving <i>ABL1</i> may confirm clonality.',
                'Used for very early disease below subtype thresholds (follow closely), unexplained splanchnic or ' +
                    'portal vein thrombosis, and burnt-out marrows with no earlier histology. Should be &le; 5% of ' +
                    'MPN diagnoses, and not a substitute for an incomplete workup.',
                'Blasts 10-19% define accelerated phase, &ge; 20% blast phase. Prominent cytopenia or dysplasia ' +
                    'should prompt exclusion of MDS/MPN.',
                '"MPN, unclassifiable" remains acceptable terminology.'
            ]
        }) +

        refDiverge([
            'Named MPN, unclassifiable.',
            'Same three positive criteria, including "or presence of another clonal marker", but without WHO\'s ' +
                'two exclusions (inadequate data or specimen; recent cytotoxic or growth factor therapy).',
            'Reactive fibrosis exclusions are a footnote to criterion 1, and <i>BCR::ABL1</i>-positive CML is ' +
                'named in the exclusions.'
        ]);
    }
});


/* ============================================================================
   MDS/MPN AND RELATED
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
//
// THE ICC BLOCK SAID "Clonality is required of every case", which Table 13
// contradicts in its next line: without clonality, monocytes >= 1.0 plus
// increased blasts, dysplasia or a CMML immunophenotype will do. Rewritten
// against the table (docs/who/icc-2022-arber-blood.md, Table 13), 2026-09.
referenceTopics.push({
    id: 'cmml',
    section: 'overlap',
    title: 'Chronic myelomonocytic leukaemia',
    keywords: ['CMML', 'monocytosis', 'monocyte', 'oligomonocytic', 'promonocyte', 'MD-CMML', 'MP-CMML'],
    related: ['blasts', 'pmf', 'dysplasia'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
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
                '<sup>b</sup> MPN can show monocytosis at presentation or later and can mimic CMML. A documented ' +
                    'history of MPN excludes CMML; MPN marrow features and/or a high burden of <i>JAK2</i>, ' +
                    '<i>CALR</i> or <i>MPL</i> mutation favour MPN with monocytosis.',
                '<sup>c</sup> To be specifically excluded in cases with eosinophilia.',
                '<sup>d</sup> Morphological dysplasia in &ge; 10% of cells of the lineage in the bone marrow.',
                '<sup>e</sup> See Table 2.13.',
                '<sup>f</sup> Increased classic monocytes (&gt; 94%), in the absence of known active autoimmune ' +
                    'disease and/or systemic inflammatory syndromes.',
                'Below 1 &times; 10<sup>9</sup>/L (oligomonocytic CMML), both dysplasia and clonality are needed; ' +
                    'monocyte partitioning cannot substitute for either.',
                'CMML-0 has been removed.'
            ]
        }) +

        refTable(['Subtype', 'Cut-off'], [
            ['MD-CMML / MP-CMML', 'WBC &lt; 13 vs &ge; 13 &times; 10<sup>9</sup>/L'],
            ['CMML-1 / CMML-2', 'Blasts and promonocytes &lt; 5% blood and &lt; 10% marrow, vs &ge; 5% ' +
                'blood or &ge; 10% marrow']
        ]) +

        refDiverge([
            'With clonality (abnormal karyotype and/or a myeloid mutation at VAF &ge; 10%), monocytes ' +
                '&ge; 0.5 &times; 10<sup>9</sup>/L and &ge; 10% suffice. Without it, monocytes must be ' +
                '&ge; 1.0 &times; 10<sup>9</sup>/L and &gt; 10%, plus increased blasts (&ge; 5% marrow and/or ' +
                '&ge; 2% blood), dysplasia, or a CMML immunophenotype.',
            'Requires a cytopenia at MDS thresholds, which WHO does not. A few early cases show borderline or ' +
                'no cytopenia.',
            'Requires marrow findings consistent with CMML. Without them, consider clonal monocytosis of ' +
                'undetermined significance (CMUS), or CCMUS if cytopenic.'
        ]);
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
        return refBox({
                title: 'WHO-HAEM5',
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
                    'The chapter\'s prose summary differs from its box: it lists concurrent <i>JAK2</i> p.V617F ' +
                        'as desirable rather than criterial, and gives thrombocytosis as &ge; 450 &times; ' +
                        '10<sup>9</sup>/L.',
                    'MDS-SF3B1 that acquires a <i>JAK2</i>, <i>MPL</i> or <i>CALR</i> mutation with thrombocytosis ' +
                        'may be reclassified as this entity.',
                    'Formerly RARS-T, a name no longer recommended.'
                ]
            }) +

            refDiverge([
                'Requires <i>SF3B1</i> at VAF &gt; 10% and does not require ring sideroblasts. WHO\'s essential ' +
                    'criteria ask for &ge; 15% ring sideroblasts and set no VAF threshold.',
                'Blasts &lt; 1% blood and &lt; 5% marrow, where WHO writes "no or very rare blast cells". No ' +
                    'co-mutation required; <i>JAK2</i> is supportive.',
                'MDS-SF3B1 that later develops thrombocytosis is thrombocytotic progression of MDS-SF3B1, not this ' +
                    'entity; anaemia and thrombocytosis must both be present at diagnosis.',
                '<i>SF3B1</i>-wildtype cases with &ge; 15% ring sideroblasts are MDS/MPN-RS-T, NOS. WHO calls them ' +
                    'MDS/MPN with ring sideroblasts and thrombocytosis and treats them as equivalent for management.'
            ]);
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
            title: 'WHO-HAEM5',
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
                'Mutations outside the Table 2.02 regions may qualify if predicted deleterious and not rare ' +
                    'non-pathogenic variants.',
                'Explainable abnormal red cell indices, or an idiopathically raised RDW or MCV, do not exclude CHIP.',
                'CHIP has no histopathological features.',
                'VEXAS syndrome (somatic <i>UBA1</i> mutation, systemic autoinflammatory disease, vacuoles in ' +
                    'myeloid and erythroid precursors) is the exception to the absence of clinical features. A ' +
                    'marrow meeting MDS criteria is MDS.'
            ]
        }) +

        refDiverge([
            'Same VAF &ge; 2% threshold, but a non-MDS-defining clonal cytogenetic abnormality also qualifies. ' +
                'A karyotypic clone alone is CHIP by ICC and unnamed by WHO.'
        ]);
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
//
// The progression-risk gene list is the CCUS chapter's, not the CHIP chapter's:
// CCUS adds PPM1D, JAK2 and RUNX1 and drops ASXL1 (see dxChRiskText).
referenceTopics.push({
    id: 'ccus',
    section: 'overlap',
    title: 'Clonal cytopenia (CCUS)',
    keywords: ['CCUS', 'clonal cytopenia', 'undetermined significance', 'cytopenia', 'VAF', 'karyotype'],
    related: ['chip', 'icus', 'cytopenias', 'mds-lb'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
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
                'A clonal chromosomal abnormality alone is enough, unlike CHIP.',
                'Persistent means "usually of 4 months or longer in duration".',
                'Any dysplasia must fall short of MDS criteria, and blasts should not be increased.',
                'Array-based methods, flow cytometry and immunohistochemistry are not recommended as the sole ' +
                    'diagnostic modality. Clonal chromosomal abnormalities may be shown by karyotype, FISH or NGS.',
                'About 30% of people with a cytopenia have a myeloid driver mutation or chromosomal abnormality. ' +
                    'Without one, the case is ' + refJump('icus', 'ICUS') + '.',
                'Progression risk rises with clone size, the number of alterations, and mutations in <i>TP53</i>, ' +
                    '<i>PPM1D</i>, <i>JAK2</i>, <i>RUNX1</i>, <i>SF3B1</i>, <i>SRSF2</i>, <i>U2AF1</i>, ' +
                    '<i>IDH2</i> or <i>IDH1</i> (a different list from CHIP\'s). The number and severity of ' +
                    'cytopenias may also matter, especially after cytotoxic therapy. An isolated <i>DNMT3A</i> ' +
                    'mutation appears to carry low risk.'
            ]
        }) +

        refDiverge([
            'Persistence (4 months or longer) is part of the definition; WHO gives the same duration ' +
                'descriptively.',
            'Same VAF &ge; 2% threshold.',
            'A non-dysplastic cytopenic marrow with &minus;7/del(7q) or a complex karyotype is ' +
                refJump('mds-lb', 'MDS, NOS without dysplasia') + ', not CCUS.'
        ]);
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
        return refBox({
            title: 'WHO-HAEM5',
            groups: [{
                label: 'CCUS criteria, without the clone',
                items: [
                    'One or more otherwise unexplained persistent cytopenias, usually 4 months or longer',
                    'No qualifying somatic mutation and no clonal chromosomal abnormality',
                    'No features diagnostic of a defined myeloid neoplasm on bone marrow examination: ' +
                        'dysplasia short of MDS criteria, blasts not increased'
                ]
            }],
            notes: [
                'Defined in one sentence of the CCUS chapter: "Some cytopenias will be sustained and unexplained ' +
                    'without meeting diagnostic criteria for CCUS; such cases should be termed ‘idiopathic ' +
                    'cytopenia of unknown significance’." There is no criteria box of its own.',
                'No mutation found is not the same as no clone; it depends on what was sequenced and how deeply. ' +
                    'A clonal karyotypic abnormality alone makes the case CCUS.',
                'The MDS exclusions still apply: known clinical and drug history, nutritional deficiency excluded, ' +
                    'no reclassification during growth factor therapy.',
                'WHO writes "unknown significance"; the literature uses "undetermined".'
            ]
        }) +

        refDiverge([
            'No equivalent term. A cytopenia with no clone and no dysplasia has no ICC name.'
        ]);
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
        return refBox({
                title: 'WHO-HAEM5',
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
                    'An entity (ICD-O 9920/3) replacing "therapy-related" naming. The underlying neoplasm is ' +
                        'worked up as for de novo disease, and "post cytotoxic therapy" is appended to its name.',
                    'An MPN arising after therapy remains an MPN. MN-pCT takes precedence over mixed-phenotype ' +
                        'and undifferentiated acute leukaemia.',
                    'Latency is usually within 10 years of last exposure; much longer latencies may be unrelated. ' +
                        'The alkylator/radiation (type 1) and topoisomerase II inhibitor (type 2) split blurs with ' +
                        'multi-agent therapy. PARP1 inhibitors are newly implicated; the role of hydroxyurea, ' +
                        'radioisotopes, purine analogues, L-asparaginase, mycophenolate and limited-field ' +
                        'radiation is unclear.',
                    '<i>TP53</i> mutations are characteristic and usually multi-hit, with complex karyotypes and ' +
                        'loss of 5q, 7q and 17p. Karyotypes are abnormal in 70-90% (vs 40-60% de novo). ' +
                        '<i>PPM1D</i> truncations (~15%) follow platinum exposure. Chromosome 5 and/or 7 ' +
                        'abnormalities, <i>TP53</i> mutation or a complex karyotype carry a median survival under ' +
                        '1 year regardless of blast count.',
                    'Pre-existing clonal haematopoiesis (<i>TP53</i>, <i>PPM1D</i>, <i>DNMT3A</i>, <i>ASXL1</i>, ' +
                        '<i>TET2</i>) is selected by therapy. Germline DNA damage response and Fanconi pathway ' +
                        'variants matter for donor selection.'
                ]
            }) +

            refDiverge([
                'No entity. "Therapy-related" is a qualifier appended to the diagnosis and does not change the ' +
                    'category.'
            ]);
    }
});


/* ============================================================================
   ACUTE MYELOID LEUKAEMIA
   ========================================================================= */

// WHO's half is docs/who/mds-introduction.md for the boundary and
// docs/who/aml-introduction.md - the chapter introduction, pasted - for the
// per-type blast requirements and the AML-MR definition. ICC's half is Table 25
// of docs/who/icc-2022-arber-blood.md, read against it row by row (Arber DA et
// al., Blood 2022;140(11):1200-1228).
referenceTopics.push({
    id: 'aml-overview',
    section: 'aml',
    title: 'AML overview',
    keywords: ['AML', 'acute myeloid leukemia', 'blast', '20%', '10%', 'NPM1', 'CEBPA', 'myelodysplasia-related',
        'BCR::ABL1', 'MDS/AML', 'erythroid leukemia', 'KMT2A', 'NUP98', 'MECOM', 'overview'],
    related: ['blasts', 'mds-ib', 'mds-bitp53'],
    body: function () {
        return refBox({
            title: 'WHO-HAEM5',
            groups: [
                {
                    label: 'Blast threshold',
                    items: [
                        '20% separates MDS from AML.',
                        'No blast cut-off for AML with defining genetic abnormalities, except <i>BCR::ABL1</i> ' +
                            'and <i>CEBPA</i> (&ge; 20%).',
                        '<i>KMT2A</i>, <i>MECOM</i> and <i>NUP98</i> rearrangements and <i>NPM1</i> mutation ' +
                            'define AML at any blast count.'
                    ]
                },
                {
                    label: 'Classification',
                    items: [
                        'Two families: AML with defining genetic abnormalities, and AML defined by ' +
                            'differentiation (replacing AML, NOS). AML with other defined genetic alterations ' +
                            'holds new and rare subtypes.',
                        'AML-MR: &ge; 20% blasts with a history of MDS or MDS/MPN, a defining cytogenetic ' +
                            'abnormality, or a mutation in <i>SRSF2</i>, <i>SF3B1</i>, <i>U2AF1</i>, <i>ZRSR2</i>, ' +
                            '<i>ASXL1</i>, <i>EZH2</i>, <i>BCOR</i> or <i>STAG2</i>. Morphology alone no longer ' +
                            'qualifies.',
                        '<i>CEBPA</i>: biallelic or single in-frame bZIP mutation. <i>RUNX1</i>-mutated AML is no ' +
                            'longer a type.',
                        'Acute erythroid leukaemia (formerly pure erythroid): usually &ge; 80% erythroid with ' +
                            '&ge; 30% proerythroblasts and biallelic <i>TP53</i>; takes precedence over AML-MR.'
                    ]
                }
            ],
            notes: [
                'Lowering the MDS/AML line to 10% was considered and declined: any cut-off is arbitrary, blast ' +
                    'counts are subject to sampling error, and 10% "carries a risk of overtreatment".',
                'MDS-IB2 may be treated as AML-equivalent for therapy and trial design.',
                'Without a blast cut-off, clone size matters: read VAF or fusion transcript levels with the ' +
                    'morphology. <i>NUP98</i> and other rearrangements may be cryptic on karyotype.'
            ]
        }) +

        refDiverge([
            'No single blast threshold: &ge; 10% for most genetically defined AML, 10-19% without a defining ' +
                'lesion is MDS/AML, and &ge; 20% for AML, NOS and <i>BCR::ABL1</i>.',
            'The myelodysplasia-related gene list adds <i>RUNX1</i> to WHO\'s eight, so <i>RUNX1</i>-mutated AML ' +
                'is myelodysplasia-related by ICC but not by WHO.',
            'History is a qualifier, not an entity: therapy-related, progressed from MDS or MDS/MPN, or germline ' +
                'predisposition (e.g. "AML with myelodysplasia-related gene mutation, germline <i>RUNX1</i> ' +
                'mutation").'
        ], refTable(['Blasts', 'Category'], [
            ['&ge; 10%',
                'APL with <i>PML::RARA</i> or other <i>RARA</i> rearrangements &middot; <i>RUNX1::RUNX1T1</i> ' +
                    '&middot; <i>CBFB::MYH11</i> &middot; <i>MLLT3::KMT2A</i> or other <i>KMT2A</i> &middot; ' +
                    '<i>DEK::NUP214</i> &middot; <i>GATA2</i>;<i>MECOM</i> or other <i>MECOM</i> &middot; other rare ' +
                    'recurring translocations &middot; mutated <i>NPM1</i> &middot; in-frame bZIP <i>CEBPA</i>'],
            ['&ge; 20%', '<i>BCR::ABL1</i>'],
            ['10-19%',
                'MDS/AML with mutated <i>TP53</i>, with myelodysplasia-related gene mutations, with ' +
                    'myelodysplasia-related cytogenetic abnormalities, or NOS'],
            ['&ge; 20%', 'AML with the same four']
        ]));
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
            title: 'WHO-HAEM5',
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
                'Abnormal promyelocytes count as blasts.',
                'Microgranular variant: mimics acute myelomonocytic or monocytic leukaemia, with a high, rapidly ' +
                    'rising WBC. A few granulated cells or faggot cells give it away; MPO is uniformly strong, and ' +
                    'CD34 and HLA-DR are typically negative.',
                'Variant <i>RARA</i> translocations (~5%) include <i>ZBTB16</i>, <i>NPM1</i>, <i>NUMA1</i> and ' +
                    '<i>STAT5B</i> partners. <i>ZBTB16</i> and <i>STAT5B</i> fusions respond poorly to ATRA and ' +
                    'arsenic trioxide.',
                'DIC is the main cause of early death.'
            ]
        }) +

        refDiverge([
            'Named APL with t(15;17)(q24.1;q21.2)/<i>PML</i>::<i>RARA</i>; requires &ge; 10% blasts. WHO sets ' +
                'no minimum.',
            'APL with other <i>RARA</i> rearrangements is a separate &ge; 10% category.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Myeloid sarcoma may present with low blood and marrow blast counts.',
                'Large blasts with abundant basophilic cytoplasm, azurophilic granules and perinuclear hofs; ' +
                    'single long, tapered Auer rods. Dysplasia is mostly granulocytic (pseudo-Pelger-Huët nuclei, ' +
                    'homogeneous pink neutrophil cytoplasm); monocytes few or absent. Eosinophil precursors are ' +
                    'often increased but cytologically normal, unlike ' + refJump('aml-cbfb', 'CBFB::MYH11') + '.',
                'Flow: bright CD34 with aberrant CD19 and cCD79a (PAX5 usually positive), CD33 weak or negative. ' +
                    'This is not mixed phenotype.',
                '<i>KIT</i> p.D816 in adults is associated with shorter relapse-free survival.'
            ]
        }) +

        refDiverge([
            'Named AML with t(8;21)(q22;q22.1)/<i>RUNX1</i>::<i>RUNX1T1</i>; requires &ge; 10% blasts. WHO sets ' +
                'no minimum.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Abnormal eosinophils in most cases: immature granules that are large and dark purple-violet, ' +
                    'faintly positive for naphthol AS-D CAE (normally negative in eosinophils). Abnormal forms are ' +
                    'rare in blood. Blasts are usually myelomonocytic.',
                'Eosinophils in ' + refJump('aml-runx1t1', 'RUNX1::RUNX1T1') + ' AML may be increased but are ' +
                    'cytologically normal.',
                'inv(16) can be cryptic on karyotype. With suggestive morphology, do FISH or molecular testing; a ' +
                    '<i>CBFB</i> break-apart probe is sufficient.',
                'Flow usually shows two populations: CD45-dim blasts (CD34, CD13, CD117, MPO) and CD45-bright ' +
                    'monocytes (CD14, CD64, lysozyme; CD34−).'
            ]
        }) +

        refDiverge([
            'Named AML with inv(16)(p13.1q22) or t(16;16)(p13.1;q22)/<i>CBFB</i>::<i>MYH11</i>; requires ' +
                '&ge; 10% blasts. WHO sets no minimum.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Multilineage dysplasia is common (abnormal nuclear lobation, ring sideroblasts, hypogranular ' +
                    'myelopoiesis, micromegakaryocytes), and some cases present with pancytopenia and MDS-IB ' +
                    'morphology. The fusion defines AML at any blast count: 61% of cases labelled MDS progressed, ' +
                    'with the same survival and co-mutations.',
                'Basophilia is present only "in a minority of cases".',
                '<i>FLT3</i>-ITD in 50-88% (TKD mutations generally absent); t(6;9) is often the sole ' +
                    'abnormality. Prognosis is poor; transplantation appears to improve it.'
            ]
        }) +

        refDiverge([
            'Named AML with t(6;9)(p22.3;q34.1)/<i>DEK</i>::<i>NUP214</i>; requires &ge; 10% blasts. WHO sets ' +
                'no minimum.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Megakaryocytic differentiation is desirable, not essential. There is no post-cytotoxic-therapy ' +
                    'exclusion.',
                'Infants: most cases in the first three years, female predominance, without Down syndrome (Down ' +
                    'syndrome-associated proliferations are classified separately). Marked hepatosplenomegaly is ' +
                    'usual; fibrotic liver involvement can present as Budd-Chiari syndrome.',
                'Fibrosis limits the aspirate and can falsely lower the blast percentage; the trephine is needed, ' +
                    'and FISH if the karyotype fails. Megakaryoblasts show blebs and can mimic lymphoblasts. ' +
                    'Cytoplasmic CD41/CD61 is better than surface staining; CD34, CD45, HLA-DR and MPO are negative.'
            ]
        }) +

        refDiverge([
            'Not in Table 25. Falls under AML with other rare recurring translocations (&ge; 10% blasts).'
        ]);
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
            title: 'WHO-HAEM5',
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
                'The one fusion-defined AML with a blast threshold, to avoid overlap with CML. The box writes ' +
                    '"&gt; 20%"; the AML introduction writes "&ge; 20%".',
                'Versus CML myeloid blast phase: median blasts 47% vs 13%, median blood basophils 0% vs 2.5%, ' +
                    'splenomegaly 25% vs 65%, M:E 2.0 vs 4.8, marrow basophils &gt; 2% in 13% vs 53%. Cryptic ' +
                    'IG/TR deletions with <i>IKZF1</i> and/or <i>CDKN2A/B</i> loss are nearly universal here and ' +
                    'absent in myeloid blast phase (they occur in lymphoid blast phase and MPAL). The distinction ' +
                    'is "often challenging".',
                'Secondarily acquired <i>BCR::ABL1</i> (post-MDS or relapsed AML) does not qualify, and an ' +
                    'abnormality defining another AML type takes precedence. Aberrant CD7, CD19 and TdT are ' +
                    'common; consider MPAL with <i>BCR::ABL1</i>.'
            ]
        }) +

        refDiverge([
            'Also requires &ge; 20% blasts, the only recurrent abnormality in Table 25 that does.',
            'MDS/AML is not allowed with <i>BCR::ABL1</i>, to avoid overlap with CML progression.'
        ]);
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
            title: 'WHO-HAEM5',
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
                '<i>KMT2A</i> partial tandem duplication is not a rearrangement and does not qualify. True ' +
                    'rearrangements can be cryptic on karyotype, and some (<i>KMT2A</i>::<i>USP2</i>) on FISH.',
                't(11;16)/<i>KMT2A</i>::<i>CREBBP</i> is presumptive evidence of prior topoisomerase II inhibitor ' +
                    'therapy; such cases are MN-pCT.',
                'Usually monocytic, monoblastic or myelomonocytic, often with many promonocytes and NG2 (CSPG4) ' +
                    'expression. Extramedullary disease (gingiva, skin) is common. In children, ' +
                    '<i>KMT2A</i>::<i>MLLT3</i> and ::<i>MLLT10</i> can be megakaryoblastic with aspirate blasts ' +
                    'below 20%; count on trephine immunohistochemistry.',
                'The commonest of more than 80 partners are <i>MLLT3</i>, <i>AFDN</i>, <i>ELL</i> and ' +
                    '<i>MLLT10</i>. The partner affects prognosis.'
            ]
        }) +

        refDiverge([
            'Two categories at &ge; 10% blasts: AML with t(9;11)(p21.3;q23.3)/<i>MLLT3</i>::<i>KMT2A</i>, and ' +
                'AML with other <i>KMT2A</i> rearrangements. WHO has one entity at any count.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'The only fusion entity that excludes an MPN history. <i>MECOM</i> rearrangement acquired in CML ' +
                    'is blast phase at any blast count, and so is a concurrent <i>BCR</i>::<i>ABL1</i> at ' +
                    'presentation.',
                'About a third present with a low blast count; cases above and below 20% share mutations and ' +
                    'expression profiles.',
                'Megakaryocytic dysplasia is the hallmark: small megakaryocytes with non-lobated or bilobed ' +
                    'nuclei, and giant or hypogranular platelets and bare megakaryocyte nuclei in the blood.',
                'inv(3)/t(3;3) repositions the <i>GATA2</i> enhancer, overexpressing <i>EVI1</i> with ' +
                    '<i>GATA2</i> haploinsufficiency. Some of the &gt; 30 rearrangements are cryptic, so a ' +
                    '<i>MECOM</i> break-apart FISH probe is recommended. RAS pathway mutations are nearly universal.'
            ]
        }) +

        refDiverge([
            'Two categories at &ge; 10% blasts: AML with inv(3)(q21.3q26.2) or t(3;3)(q21.3;q26.2)/' +
                '<i>GATA2</i>; <i>MECOM</i>(<i>EVI1</i>), and AML with other <i>MECOM</i> rearrangements. WHO ' +
                'has one entity at any count.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                '<i>NUP98</i> lies at the 11p15.4 terminus, so rearrangements are often cryptic and most ' +
                    'karyotypes are normal. A normal karyotype with <i>FLT3</i>-ITD and/or <i>WT1</i> mutation ' +
                    'should prompt testing by break-apart FISH, RT-PCR or RNA sequencing (<i>NUP98</i>::<i>NSD1</i> ' +
                    'carries the ITD in 67-91%).',
                'Children: megakaryoblastic in up to a third of those under 3 (especially <i>KDM5A</i>); ' +
                    'erythroid leukaemias are often <i>NUP98</i>-rearranged; <i>NUP98</i>::<i>RARG</i> mimics APL ' +
                    'without a <i>RARA</i> lesion.',
                'Poor prognosis, worse with <i>FLT3</i>-ITD; up to half of refractory paediatric AML. There is no ' +
                    'post-cytotoxic-therapy exclusion.'
            ]
        }) +

        refDiverge([
            'Not in ICC. Falls under AML with other rare recurring translocations (&ge; 10% blasts).'
        ]);
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
            title: 'WHO-HAEM5',
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
                'Defines AML even with MDS or CMML features; "MDS with <i>NPM1</i> mutation" is not recommended. ' +
                    'The exception: a VAF &lt; 10% without increased blasts "may not be definitively classifiable ' +
                    'as AML". Interpret with caution, follow closely, and consider a subclonal variant.',
                'Cup-like nuclei in &gt; 10% of blasts are highly specific and associated with <i>FLT3</i>-ITD. ' +
                    'About 80% are CD34-negative, and a CD34−/HLA-DR− subset mimics APL by flow. Cytoplasmic NPM1 ' +
                    'immunohistochemistry also detects the rare non-exon-12 mutations.',
                'Karyotype is normal in ~85%. Multilineage dysplasia (20-25%) has no prognostic effect. ' +
                    '<i>FLT3</i>-ITD sets ELN risk: favourable without it or at a low allelic ratio, intermediate ' +
                    'at a high one.'
            ]
        }) +

        refDiverge([
            'Named AML with mutated <i>NPM1</i>; requires &ge; 10% blasts. At 10-19% the mutation makes the case ' +
                'AML rather than MDS/AML.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Keeps the 20% blast requirement; below it, a <i>CEBPA</i>-mutated marrow remains MDS.',
                'Biallelic or single in-frame bZIP (smbZIP-<i>CEBPA</i>); both carry the favourable prognosis, in ' +
                    'children and in adults up to 70. A single N-terminal TAD mutation does not qualify.',
                'A biallelic result raises germline predisposition: 5-10% of bi<i>CEBPA</i> cases carry a germline ' +
                    'N-terminal variant, and familial disease is highly penetrant (median onset 24.5 years). ' +
                    'Consider genetic counselling.',
                'Dysgranulopoiesis and dysmegakaryopoiesis are common and not significant.'
            ]
        }) +

        refDiverge([
            'Only in-frame bZIP mutations qualify, at &ge; 10% blasts. A biallelic non-bZIP case is AML with ' +
                '<i>CEBPA</i> by WHO only, and a bZIP case at 10-19% blasts is AML by ICC and MDS by WHO.',
            REF_ICC_THERAPY
        ]);
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
            title: 'WHO-HAEM5',
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
                'Holds emerging subtypes that may become defined types. Keeps the 20% requirement and yields to ' +
                    'every defined type.',
                '<i>CBFA2T3</i>::<i>GLIS2</i>: cryptic inv(16)(p13.3q24), under age 5, often megakaryoblastic in ' +
                    'non-Down infants, with the RAM immunophenotype (strong CD56, HLA-DR and CD38 negative). ' +
                    'Adverse.',
                '<i>KAT6A</i>::<i>CREBBP</i>: t(8;16), monocytic with erythrophagocytosis (70%), leukaemia cutis ' +
                    'and DIC. Neonatal cases may remit spontaneously.',
                '<i>MNX1</i>::<i>ETV6</i>: cryptic t(7;12) of infancy, mistaken for del(12p) or del(7q) without ' +
                    'FISH; usually with trisomy 19.',
                't(16;21) has two forms: <i>FUS</i>::<i>ERG</i> at p11.2;q22 (dismal) and ' +
                    '<i>RUNX1</i>::<i>CBFA2T3</i> at q24;q22 (favourable).',
                '<i>RARG</i> fusions (<i>CPSF6</i>, <i>NUP98</i>, <i>PML</i>, <i>HNRNPC</i> partners) resemble APL ' +
                    'and resist ATRA.'
            ]
        }) +

        refDiverge([
            'No named equivalent. The nearest is AML with other rare recurring translocations (&ge; 10% ' +
                'blasts), which overlaps this list only in part.'
        ]);
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
        return refTable(['Subtype', 'Defined by'], [
                ['All', '&ge; 20% blasts (except erythroid), and no defining genetic abnormality, AML-MR or MN-pCT'],
                ['Minimal differentiation', 'MPO &lt; 3%'],
                ['Without maturation', 'MPO &ge; 3%; maturing granulocytes &lt; 10%'],
                ['With maturation', 'Maturing granulocytes &ge; 10%; monocytic cells &lt; 20%'],
                ['Myelomonocytic', 'Maturing granulocytes &ge; 20% and monocytic cells &ge; 20%'],
                ['Monocytic', 'Monocytic cells &ge; 80%; maturing granulocytes &lt; 20%'],
                ['Basophilic', 'Increased basophils, metachromatic on toluidine blue'],
                ['Erythroid', 'Erythroid &ge; 80%, of which proerythroblasts &ge; 30%; no blast minimum'],
                ['Megakaryoblastic', 'Megakaryocytic differentiation; CD41, CD61 or CD42b']
            ]) +

            refBox({
                title: 'AML with minimal differentiation',
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
                    'Formerly M0. Cytochemistry is negative by definition (MPO, Sudan Black B and CAE &lt; 3%). ' +
                        'Blasts may resemble lymphoblasts, and CD7/TdT are expressed in ~30%; ALL and MPAL are ' +
                        'excluded by immunophenotype.',
                    'Common mutations (<i>RUNX1</i> ~30%, <i>ASXL1</i> ~30%, <i>SRSF2</i> ~20%, <i>STAG2</i>) ' +
                        'often make the case AML-MR, which takes precedence.',
                    '<i>BCL11B</i> rearrangements (~30%), usually with <i>FLT3</i>-ITD (~85%), link this subtype ' +
                        'to T/myeloid MPAL, early T-precursor ALL and acute undifferentiated leukaemia. Their ' +
                        'significance is not yet settled.'
                ]
            }) +

            refBox({
                title: 'AML without maturation',
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
                    'Formerly M1. Blasts may have azurophilic granules and Auer rods, or neither and resemble ' +
                        'lymphoblasts.',
                    'About two thirds have a normal karyotype. Common mutations (<i>DNMT3A</i>, <i>RUNX1</i>, ' +
                        '<i>ASXL1</i> ~25-30%, <i>IDH1/2</i>) often make the case AML-MR.'
                ]
            }) +

            refBox({
                title: 'AML with maturation',
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
                    'Formerly M2. Blasts express CD11b, CD15 and CD65; neutrophilic dysplasia and Auer rods may ' +
                        'be present.',
                    '<i>ASXL1</i> (~40%), <i>RUNX1</i> and <i>STAG2</i> (~30%) are common, so many cases are ' +
                        'AML-MR. <i>FLT3</i>-ITD is less frequent (5-10%) than in AML without maturation.'
                ]
            }) +

            refBox({
                title: 'Acute myelomonocytic leukaemia',
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
                    'Formerly M4. Blasts are MPO-positive (&ge; 3%); monocytic cells are nonspecific ' +
                        'esterase-positive and often more mature in blood than in marrow.',
                    'Differentials: microgranular APL, <i>NPM1</i>-mutated AML. <i>FLT3</i>-ITD in 25%.'
                ]
            }) +

            refBox({
                title: 'Acute monocytic leukaemia',
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
                    'Formerly M5. Acute monoblastic leukaemia (&ge; 80% monoblasts) is an optional distinction. ' +
                        'Extramedullary disease (gingiva, skin, CNS) is common.',
                    'Separation from CMML depends on recognising promonocytes, which is poorly reproducible on ' +
                        'smears. By flow, promonocytes are CD14 weak or negative, CD36 weak, CD64 and HLA-DR strong, ' +
                        'and the monocytic:granulocytic ratio is higher than in CMML.',
                    'Nonspecific esterase may be weak or absent; the monocytic immunophenotype then carries the ' +
                        'diagnosis. Other differentials: microgranular APL, <i>NPM1</i>-mutated and ' +
                        '<i>KMT2A</i>-rearranged AML, plasmablastic myeloma.'
                ]
            }) +

            refBox({
                title: 'Acute basophilic leukaemia',
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
                    'Very rare. Immature basophils are 20-80% of marrow cells; mature basophils are sparse; no ' +
                        'Auer rods.',
                    'Differentials: CML in blast phase, other AML with basophilia (<i>DEK::NUP214</i>, ' +
                        '<i>BCR::ABL1</i>), and mast cell leukaemia (strong CD117; basophils are CAE-negative). A ' +
                        'rare subtype in infant boys carries t(X;6)(p11;q23)/<i>MYB::GATA1</i>.'
                ]
            }) +

            refBox({
                title: 'Acute erythroid leukaemia',
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
                    'No 20% blast requirement. Myeloblasts are not increased; the proerythroblast count is what ' +
                        'matters. Takes precedence over AML-MR.',
                    'Multi-hit <i>TP53</i> is characteristic, with complex karyotypes and loss of 17/17p, 5/5q ' +
                        'and 7/7q. p53 immunohistochemistry (overexpression or complete loss) is a useful adjunct.',
                    'Reactive proerythroblast proliferations (B12 or folate deficiency, haemolysis) lack ' +
                        '<i>TP53</i> mutation and have a normal karyotype. Median survival is 2-4 months.'
                ]
            }) +

            refBox({
                title: 'Acute megakaryoblastic leukaemia',
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
                    'The only subtype that excludes an MPN history: transformed CML or other MPN is blast phase. ' +
                        'Genetic differentials are AML with <i>RBM15::MRTFA</i> and AML with <i>MECOM</i> ' +
                        'rearrangement.',
                    'Cytoplasmic CD41/CD61 is more specific than surface staining, where adherent platelets give ' +
                        'false positives. MPO is negative, CD13/CD117 often absent and CD45 weak, so small-blast ' +
                        'cases mimic acute undifferentiated leukaemia, minimal differentiation or ALL. ' +
                        'Micromegakaryocytes are not counted as blasts. Reticulin fibrosis is typical.',
                    'Three groups: Down syndrome (a separate entity, excellent prognosis); other children ' +
                        '(&gt; 75% fusion-driven: <i>CBFA2T3::GLIS2</i>, <i>RBM15::MRTFA</i>, <i>NUP98::KDM5A</i>, ' +
                        '<i>KMT2A</i>); and adults (<i>TP53</i>, <i>RB1</i>; very poor prognosis). The RAM ' +
                        'phenotype (strong CD56; CD7, CD13, CD36, CD45, CD38 and HLA-DR negative) marks cryptic ' +
                        '<i>CBFA2T3::GLIS2</i> and a very high induction failure rate.'
                ]
            }) +

            refDiverge([
                'No subtypes: AML, NOS at &ge; 20% blasts and MDS/AML, NOS at 10-19%.',
                'Acute erythroid leukaemia is classified as AML with mutated <i>TP53</i> (Table 21: "&ge; 20% ' +
                    'blasts or meets criteria for pure erythroid leukemia").',
                REF_ICC_THERAPY
            ]);
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
            title: 'WHO-HAEM5',
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
                'A history of MDS or MDS/MPN is sufficient on its own, and a qualifying abnormality is sufficient ' +
                    'without one. Multilineage dysplasia alone does not qualify.',
                'Acute erythroid leukaemia takes precedence.',
                'Oligoblastic AML-MR (prior MDS, &lt; 30% marrow blasts, stable for &ge; 2 months) may be managed ' +
                    'like high-risk MDS.',
                'Complex karyotype (Box 2.25, footnote a): only clonal abnormalities count, and a single ' +
                    'metaphase is ignored. Numerical gains and losses, balanced translocations and ' +
                    'one-chromosome unbalanced aberrations count as one; unbalanced aberrations of two or more ' +
                    'chromosomes, tetrasomy, triplication/quadruplication and isoderivative chromosomes count as ' +
                    'two. Constitutional abnormalities are not counted. With multiple clones or a composite ' +
                    'karyotype, count the clone (or metaphases) with the most abnormalities.'
            ]
        }) +

        refTable(['Cytogenetic', 'Mutation'], [
            ['Complex karyotype (at least three abnormalities)', '<i>ASXL1</i>'],
            ['del(5q) or loss of 5q due to unbalanced translocation', '<i>BCOR</i>'],
            ['Monosomy 7, del(7q), or loss of 7q due to unbalanced translocation', '<i>EZH2</i>'],
            ['del(11q)', '<i>SF3B1</i>'],
            ['del(12p) or loss of 12p due to unbalanced translocation', '<i>SRSF2</i>'],
            ['Monosomy 13 or del(13q)', '<i>STAG2</i>'],
            ['del(17p) or loss of 17p due to unbalanced translocation', '<i>U2AF1</i>'],
            ['Isochromosome 17q', '<i>ZRSR2</i>'],
            ['idic(X)(q13)', '']
        ]) +

        refDiverge([
            'Split in two: AML with myelodysplasia-related gene mutations and AML with myelodysplasia-related ' +
                'cytogenetic abnormalities, the gene category taking precedence. Each is MDS/AML at 10-19% blasts.',
            'The gene list adds <i>RUNX1</i>. The cytogenetic lists differ both ways: ICC adds +8 and del(20q); ' +
                'WHO adds del(11q) and −13/del(13q).',
            'A history of MDS or MDS/MPN is a qualifier ("progressing from MDS"), not a route in. Prior therapy ' +
                'is also a qualifier.'
        ]);
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
