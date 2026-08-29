/* ============================================================================
   MarrowAncillary.js — the Ancillary tab (#ancillaryPanel)

   PARTLY A PLACEHOLDER. On screen: the NGS block (status, paste box, the
   variant list the paste fills), then cytogenetics (status, paste box, and the
   restored growing list of disease-defining abnormalities). Still off screen:
   BCR::ABL1, sex/spleen/LDH/EPO, prior therapy, antecedent neoplasm.

   WHAT THAT COSTS, and what it does NOT: MarrowFindings.js still asks for all of
   it, and every reader below still answers — with the "nobody has said" value,
   because `toggleGroupValue()` on a group with no chips returns '' and
   `ancAbnNamed()` on a missing list returns []. Nothing throws.

   NO CANDIDATE LEAVES THE DIFFERENTIAL FOR IT. This app suggests comments for a
   pathologist to choose between; it does not decide, and it never required the
   form to be complete. An unanswered `requires` puts a rule in `pending` or
   `incomplete`, which `DX_TIER` ranks level with `supported` — candidates rank on
   EVIDENCE, and completeness is a one-point bonus at most. So CML still headlines
   on a CML-shaped marrow with no fusion result anywhere (verified: WBC 62, 7%
   basophils, eosinophilia, circulating immature granulocytes and increased
   megakaryocytes rank it first at 11 points), and its comment simply stays in the
   conditional register — "would be best classified as … pending studies" — which
   is exactly the sentence such a case should carry.

   What is genuinely lost is narrower: a finding nobody can enter cannot score.
   The +8 for a demonstrated BCR::ABL1, PV's erythropoietin and sex-specific
   thresholds and PMF's minor criteria are unavailable, so those entities compete
   on their morphology alone. (The named-karyotype points are back — the
   abnormality list was the first block restored.) The readers for the rest are
   kept precisely so restoring a control is a render change and nothing more.

   ---------------------------------------------------------------------------
   PHI. The paste box is `class="noSave"`, like the CBC's: an NGS report carries
   the accession, the collection date and the clinical indication, and none of it
   may reach a saved case. The raw text lives in that textarea and nowhere else —
   it is never copied into a module variable, so there is nothing here for a
   future save to pick up by accident. The VARIANTS parsed out of it are findings
   (a gene, a change, a number) and are ordinary saveable form state.

   ---------------------------------------------------------------------------
   Why a parser and not just typing. The variants table is the one part of a
   4,000-word report a pathologist needs, it is at the top, and re-typing "TET2
   p.(Q1348*) 63%" is exactly the transcription the CBC paste exists to avoid.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Parsing

   Only the "Variants of known or potential clinical significance" table is read.
   That is the ask, and it is also the honest boundary: the report's own VUS
   table is headed "of Unknown Significance", so pulling those in would be
   putting words in the lab's mouth. They stay for the pathologist to type if
   they want them, and the section bounds below are where they would be added.

   The table arrives from Epic as a grid whose rows span up to three lines:

       SRSF2
       p.(P95L)    NM_003016.4
       c.284C>T    3%    None    None

   So a record STARTS at a line whose first cell is a bare gene symbol and runs
   until the next one. Reading it that way rather than by line count is what
   makes it survive the same table pasted flat, or with the transcript on its own
   line, or with a column missing — none of which we can rule out from one sample
   of one lab's format.
-------------------------------------------------------------------------- */

/* The heading that opens the table. Several wordings because "known or potential
   clinical significance" is this lab's phrasing, not a standard. */
const NGS_SECTION_START = [
    /variants?\s+of\s+known\s+or\s+potential\s+clinical\s+significance/i,
    /variants?\s+of\s+(known|potential)\s+clinical\s+significance/i,
    /clinically\s+significant\s+variants?/i
];

/* Anything that ends it. Every heading that follows the table in the sample,
   plus the ones that would follow it if the table were empty. */
const NGS_SECTION_END = [
    /^pertinent\s+negatives/i,
    /^prognostic\s+implications/i,
    /^diagnostic\s+implications/i,
    /^therapeutic\s+implications/i,
    /^potentially\s+relevant/i,
    /^selected\s+alteration\s+details/i,
    /^variants?\s+of\s+(unknown|uncertain)\s+significance/i,
    /^assay\s+description/i,
    /^interpretation\b/i,
    /^note:/i
];

/* A bare gene symbol: all caps, digits allowed, a hyphen for the H1-4 sort.
   Deliberately strict about what it will NOT match — the transcript
   "NM_003016.4" (underscore, dot), "p.(P95L)" and "c.284C>T" (lowercase) all
   fail, and so does the "Alteration" header cell. */
const NGS_GENE = /^[A-Z][A-Z0-9]{1,8}(?:-[A-Z0-9]{1,3})?$/;

/* Epic's two delimiters, same as the CBC's: columns are tabs, but a cell can
   hold single spaces ("Drugs Associated with Sensitivity"), so split on tab or
   a run of two spaces and never on one. */
function ngsCells(line) {
    return line.split(/\t| {2,}/)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length; });
}

function ngsMatchesAny(text, patterns) {
    return patterns.some(function (re) { return re.test(text); });
}

/* The lines between the table's heading and whatever heading ends it. */
function ngsSectionLines(raw) {
    const lines = raw.split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (ngsMatchesAny(lines[i].trim(), NGS_SECTION_START)) { start = i + 1; break; }
    }
    if (start === -1) return [];

    const out = [];
    for (let i = start; i < lines.length; i++) {
        if (ngsMatchesAny(lines[i].trim(), NGS_SECTION_END)) break;
        out.push(lines[i]);
    }
    return out;
}

/* One record's worth of cells -> the three things we want.

   The protein change is preferred over the cDNA as the variant's NAME because
   that is what a report says ("SRSF2 P95L"), with the cDNA as the fallback for a
   variant that has no protein consequence to name. The parenthesised form is
   tried first: "p.(P95L)" is this lab's, "p.P95L" is everyone else's. */
function ngsRecordFrom(gene, cells) {
    const text = cells.join(' ');

    let variant = '';
    const paren = text.match(/p\.\(([^)]+)\)/);
    const bare = text.match(/p\.([A-Za-z0-9*_=]+)/);
    const cdna = text.match(/c\.[^\s,;]+/);

    if (paren) variant = paren[1];
    else if (bare) variant = bare[1];
    else if (cdna) variant = cdna[0];

    /* The FIRST percentage in the record. The transcript version ("NM_003016.4")
       has no % and cannot be mistaken for one, which is the reason this reads a
       percent sign rather than "the next number along". */
    const vaf = text.match(/(\d+(?:\.\d+)?)\s*%/);

    return { gene: gene, variant: variant, vaf: vaf ? vaf[1] : '', source: 'parsed' };
}

function ngsParse(raw) {
    const records = [];
    let gene = null;
    let cells = [];

    const flush = function () {
        if (gene) records.push(ngsRecordFrom(gene, cells));
        gene = null;
        cells = [];
    };

    ngsSectionLines(raw).forEach(function (line) {
        const parts = ngsCells(line);
        if (!parts.length) return;
        // The column header, whichever of its cells survived the copy.
        if (/^alteration$/i.test(parts[0]) || /allele\s+proportion/i.test(line)) return;

        if (NGS_GENE.test(parts[0])) {
            flush();
            gene = parts[0];
            cells = parts.slice(1);
        } else if (gene) {
            cells = cells.concat(parts);
        }
    });
    flush();

    // A gene with neither a change nor a VAF is a stray capitalised word, not a
    // variant — the strictest thing we can say without knowing every lab's layout.
    return records.filter(function (r) { return r.variant || r.vaf; });
}


/* ----------------------------------------------------------------------------
   The variant list

   Rows are free text, so this does NOT rebuild itself on every keystroke the way
   the descriptor and stain lists do — a rebuild moves the caret out of the field
   being typed in. It grows by appending one row and shrinks by removing one, and
   only a paste rebuilds the whole thing (where the caret is in the paste box and
   has nothing to lose).
-------------------------------------------------------------------------- */

/* The Pan-Heme panel's gene list, offered as a type-to-filter helper on the
   manual gene field. A native <datalist>: the browser does the matching, so
   there is no custom dropdown to build or keep open, and it stays keyboard- and
   screen-reader-accessible for free.

   NOT a whitelist — the field still accepts anything typed. A variant from a
   different assay, or a gene added to the panel next year, must never be
   un-typeable; the list is a shortcut for the common case, not a gate. Verbatim
   from the assay's own gene roster (the sample report's "Genes included"), which
   is why it is alphabetical: that is the order the datalist shows before you
   filter. */
const NGS_GENE_PANEL = [
    'ABL1', 'ABL2', 'AEBP2', 'AKT2', 'AKT3', 'ALK', 'ANKRD26', 'ARHGAP26', 'ARID1A', 'ARID1B',
    'ASXL1', 'ATM', 'ATRX', 'B2M', 'BARD1', 'BCL10', 'BCL2', 'BCL6', 'BCOR', 'BCORL1', 'BCR',
    'BIRC3', 'BLM', 'BMP7', 'BRAF', 'BRCA1', 'BRCA2', 'BRIP1', 'BTK', 'CALR', 'CARD11', 'CASP10',
    'CBFB', 'CBL', 'CBLB', 'CBLC', 'CCND1', 'CCND2', 'CCND3', 'CCR4', 'CD38', 'CD58', 'CD70',
    'CD79A', 'CD79B', 'CD83', 'CDC25C', 'CDKN1B', 'CDKN2A', 'CDKN2B', 'CEBPA', 'CHEK1', 'CHEK2',
    'CREBBP', 'CRLF2', 'CSF3R', 'CUX1', 'CXCR4', 'DCK', 'DDR2', 'DDX41', 'DHX15', 'DIS3', 'DKC1',
    'DNMT3A', 'DNMT3B', 'DUSP2', 'EBF1', 'EGFR', 'ELANE', 'EP300', 'ERBB2', 'ETNK1', 'ETV6', 'EZH2',
    'FANCL', 'FAS', 'FAT1', 'FAT4', 'FBXW7', 'FGFR3', 'FLT3', 'FOXO1', 'GADD45B', 'GALNT12', 'GATA1',
    'GATA2', 'GATA3', 'GNA13', 'GNAI2', 'GNAS', 'GNB1', 'GP6', 'H1-4', 'HRAS', 'ID3', 'IDH1', 'IDH2',
    'IKZF1', 'IKZF2', 'IKZF3', 'IL7R', 'INO80', 'IRF4', 'JAK1', 'JAK2', 'JAK3', 'KDM6A', 'KIT',
    'KLF2', 'KMT2A', 'KMT2C', 'KMT2D', 'KRAS', 'LUC7L2', 'MAP2K1', 'MBD4', 'MECOM', 'MEF2B', 'MET',
    'MPL', 'MRTFA', 'MTOR', 'MYC', 'MYD88', 'NF1', 'NOTCH1', 'NOTCH2', 'NPM1', 'NRAS', 'NUMA1',
    'NUP214', 'PALB2', 'PAX5', 'PDGFRA', 'PDGFRB', 'PF4', 'PHF6', 'PICALM', 'PIGA', 'PIK3CA', 'PIM1',
    'PLCG2', 'PPM1D', 'PRPF8', 'PTEN', 'PTPN11', 'RAD21', 'RAD51B', 'RAD51C', 'RAD51D', 'RAD54B',
    'RAD54L', 'RARA', 'RB1', 'RBBP6', 'RET', 'RHOA', 'RPS14', 'RRAGC', 'RTEL1', 'RUNX1', 'SAMD9',
    'SAMD9L', 'SEC23B', 'SETBP1', 'SETD2', 'SF3B1', 'SGK1', 'SH2B3', 'SLC29A1', 'SMC1A', 'SMC3',
    'SOCS1', 'SP140', 'SRP72', 'SRSF2', 'STAG2', 'STAT3', 'STAT5A', 'STAT5B', 'STAT6', 'TCF3',
    'TCF4', 'TENT5C', 'TERC', 'TERT', 'TET1', 'TET2', 'TNFAIP3', 'TNFRSF14', 'TP53', 'TPSAB1',
    'TRAF3', 'U2AF1', 'U2AF2', 'UBA1', 'WT1', 'XPO1', 'ZAP70', 'ZC3H18', 'ZEB2', 'ZRSR2'
];

function ngsGeneDatalistHTML() {
    return `<datalist id="ngsGenePanel">` +
        NGS_GENE_PANEL.map(function (g) { return `<option value="${g}">`; }).join('') +
        `</datalist>`;
}

/* `parsed` or `manual`, and the distinction is the whole point: a re-paste
   replaces what it parsed last time and leaves alone what you typed. Editing a
   parsed row makes it yours — once you have corrected a VAF, a second paste of
   the same report has no business putting the old one back.

   The gene field points at the panel datalist (`list="ngsGenePanel"`) — typing
   filters it, and picking an option lands the canonical upper-case symbol. */
function ngsRowHTML(record) {
    const value = function (v) { return (v || '').replace(/"/g, '&quot;'); };
    return `<div class="ngsRow" data-source="${record.source || 'manual'}">
        <input type="text" class="ngsGene form" placeholder="Gene" spellcheck="false"
               list="ngsGenePanel" autocomplete="off" value="${value(record.gene)}">
        <input type="text" class="ngsVariant form" placeholder="Variant" spellcheck="false"
               value="${value(record.variant)}">
        <input type="text" inputmode="decimal" maxlength="5" class="ngsVaf form" placeholder="VAF"
               value="${value(record.vaf)}">
        <span class="ngsPct">%</span>
        <button type="button" class="ngsRemove" title="Remove this variant"
                aria-label="Remove this variant">&times;</button>
    </div>`;
}

/* Every row on screen, in order, including the trailing empty one. */
function ngsRowElements() {
    return Array.prototype.slice.call(document.querySelectorAll('#ngsList .ngsRow'));
}

/* The gene is upper-cased HERE, in the reader, not in the input as it is typed.
   Rewriting the box on every keystroke fights the caret; leaving it alone would
   mean the screen says JAK2 (`.ngsGene` is `text-transform: uppercase`) while
   the value is "jak2" and a comment built from it prints the typo. Normalising
   on the way out makes the data agree with what is displayed, and a re-render
   then writes the tidy form back into the box. */
function ngsRecordOf(row) {
    return {
        gene: row.querySelector('.ngsGene').value.trim().toUpperCase(),
        variant: row.querySelector('.ngsVariant').value.trim(),
        vaf: row.querySelector('.ngsVaf').value.trim(),
        source: row.dataset.source
    };
}

/* Gene + change, for asking "is this the same variant". Not the VAF: a corrected
   VAF is the commonest reason a row was touched at all, so keying on it would
   defeat the point. */
function ngsKey(record) {
    return record.gene.toUpperCase() + ' ' + record.variant.toUpperCase();
}

function ngsRowIsEmpty(record) {
    return !record.gene && !record.variant && !record.vaf;
}

/* THE READER the report side will use when the comment work lands. Non-empty
   rows, in the order they are shown, parsed and typed alike — by then it should
   not matter where a variant came from, only that the pathologist left it in the
   list. */
function ngsVariants() {
    return ngsRowElements().map(ngsRecordOf).filter(function (r) { return !ngsRowIsEmpty(r); });
}

/* One empty row always waits at the end, so adding a variant is typing rather
   than pressing something first — the same bargain the descriptor lists make. */
function renderNgsRows(records) {
    const host = document.getElementById('ngsList');
    if (!host) return;
    host.innerHTML = records.map(ngsRowHTML).join('') + ngsRowHTML({ source: 'manual' });
}

function ngsEnsureTrailingRow() {
    const host = document.getElementById('ngsList');
    if (!host) return;
    const rows = ngsRowElements();
    const last = rows[rows.length - 1];
    if (!last || !ngsRowIsEmpty(ngsRecordOf(last))) {
        host.insertAdjacentHTML('beforeend', ngsRowHTML({ source: 'manual' }));
    }
}

/* What the paste did, in words. Silence would be ambiguous in the one case that
   matters: a report pasted in a layout this parser does not recognise looks
   exactly like a report with no significant variants, and the pathologist has to
   be able to tell those apart before trusting an empty list. */
function ngsSetStatus(raw, count) {
    const el = document.getElementById('ngsStatus');
    if (!el) return;

    if (!raw.trim()) {
        el.textContent = '';
        el.classList.remove('ngsStatusEmpty');
        return;
    }
    el.classList.toggle('ngsStatusEmpty', count === 0);
    el.textContent = count
        ? `${count} variant${count === 1 ? '' : 's'} of known or potential clinical significance.`
        : 'No variants of known or potential clinical significance found in this text — add any below by hand.';
}


/* ----------------------------------------------------------------------------
   Studies and cytogenetics

   THE STATUS TOGGLES ARE THE POINT OF THIS BLOCK, and they exist because
   `ngsVariants()` returning `[]` cannot tell "no variants were found" from "the
   study has not resulted yet" — opposite facts that a diagnosis comment must
   word completely differently. Marking a study Pending is what produces "…in the
   absence of disease-defining genetic alterations, the findings are best
   classified as X, pending cytogenetic and molecular studies"; marking it
   Resulted with nothing found is a real negative that can close a criterion.

   The abnormality chips are what the engine reads. The ISCN string is for the
   report and for a human — parsing ISCN is a research project, and a wrong parse
   of a karyotype is worse than no parse.
-------------------------------------------------------------------------- */

/* Deliberately not defaulted. An unset status is "nobody has said", which is a
   third state again, and guessing "not performed" would quietly turn every
   un-filled case into a negative one.

   PENDING AND NOT PERFORMED ARE THE TWO YOU CLICK; Performed is normally set for
   you, by pasting into the study's import box (see ancAutoPerformed below). It is
   still a chip rather than a hidden state because the results can be entered by
   hand — typing variants into the list without pasting the report is an ordinary
   way to work, and there has to be something to click that says so.

   The VALUE stays `resulted`, which is what MarrowFindings.js compares against;
   only the label changed. Label and value are separate here for the usual reason
   — the UI wording is free to move without touching what the engine reads. */
const ancStudyStates = [
    { label: 'Pending', value: 'pending' },
    { label: 'Performed', value: 'resulted' },
    { label: 'Not performed', value: 'notPerformed' }
];

/* ----------------------------------------------------------------------------
   The cytogenetic abnormality vocabulary

   ONE TABLE KEYED BY ABNORMALITY, and the same bargain the descriptor and stain
   vocabularies make: a list is a CHOICE OF KEYS, not a copy of the words. The
   MDS-defining abnormalities and the AML-defining ones are one table because they
   are one question — "what did the karyotype show" — and because several sit in
   both answers at once. del(5q) is MDS-5q's defining lesion AND one of the nine
   myelodysplasia-related abnormalities that make a ≥20% blast case AML-MR; keyed
   by category rather than by abnormality it would be two entries free to drift
   into two different findings.

   This REPLACED four checkboxes. Four chips were right while the engine only
   asked MDS's questions; the AML entities are almost all defined by a fusion, and
   seventeen chips would be three rows of the panel forever, named or none — which
   is the calculation the growing-dropdown idiom exists to lose. A group costs the
   height of what you named.

   `label` is the scan form, read by someone checking their own list at a glance:
   the cytogenetic notation AND the fusion, because either may be what the report
   in front of them says. `phrase` is the formal form for report and comment text,
   kept separate for the usual reason — the UI may be shortened without touching a
   clinical string.

   WHAT AN ENTRY DOES NOT CARRY is what it MEANS. Which of these are
   myelodysplasia-related, and which define an AML type, are clinical judgements
   and live in MarrowFindings.js beside `dysplasticDescriptors` and
   `MEG_PMF_PATTERN` — exactly as the descriptor vocabulary holds the words while
   Findings holds which of them are dysplasia. This file owns what can be
   recorded; that file owns what it argues for. Adding an abnormality here is
   therefore inert until something there names it, which is the safe direction for
   the dependency to run.

   NAMES ARE WHO-HAEM5's, from Khoury et al., Leukemia 2022;36:1703 (PMID
   35732831) — the `GENE1::GENE2` double-colon form of ISCN 2020, and MRTFA rather
   than the older MKL1. */
const ancAbnVocabulary = {
    /* ---- AML-defining, in WHO-HAEM5's own order (its Table 7) -------------- */
    pmlRara:      { label: 't(15;17) PML::RARA',
                    phrase: 't(15;17)(q24.1;q21.2) resulting in PML::RARA fusion' },
    runx1Runx1t1: { label: 't(8;21) RUNX1::RUNX1T1',
                    phrase: 't(8;21)(q22;q22.1) resulting in RUNX1::RUNX1T1 fusion' },
    cbfbMyh11:    { label: 'inv(16)/t(16;16) CBFB::MYH11',
                    phrase: 'inv(16)(p13.1q22) or t(16;16)(p13.1;q22) resulting in CBFB::MYH11 fusion' },
    dekNup214:    { label: 't(6;9) DEK::NUP214',
                    phrase: 't(6;9)(p22.3;q34.1) resulting in DEK::NUP214 fusion' },
    rbm15Mrtfa:   { label: 't(1;22) RBM15::MRTFA',
                    phrase: 't(1;22)(p13.3;q13.1) resulting in RBM15::MRTFA fusion' },
    kmt2a:        { label: 'KMT2A rearrangement',    phrase: 'a KMT2A rearrangement' },
    mecom:        { label: 'inv(3)/t(3;3) MECOM',
                    phrase: 'inv(3)(q21.3q26.2) or t(3;3)(q21.3;q26.2) resulting in MECOM rearrangement' },
    nup98:        { label: 'NUP98 rearrangement',    phrase: 'a NUP98 rearrangement' },

    /* ---- Myelodysplasia-related, WHO-HAEM5 Table 8 ------------------------- */
    /* All nine, verbatim from the table's "Defining cytogenetic abnormalities"
       column. NOTE THIS LIST IS SHORTER THAN WHO-HAEM4R's and an old one must not
       be carried forward: +8, del(20q), −Y, t(11;16), t(3;21), t(1;3), t(2;11),
       t(5;12), t(5;7), t(5;17), t(5;10) and t(3;5) are NOT on it.

       Note also the table's recurring "or loss of … due to unbalanced
       translocation" — a BALANCED translocation involving those arms does not
       qualify. The labels say "loss of" for that reason; it is the loss that
       counts, not the rearrangement. */
    complex:      { label: 'Complex (≥3)',           phrase: 'a complex karyotype (≥3 abnormalities)' },
    del5q:        { label: 'del(5q) / loss of 5q',   phrase: 'del(5q) or loss of 5q' },
    minus7:       { label: '−7 / del(7q)',           phrase: 'monosomy 7 or del(7q)' },
    del11q:       { label: 'del(11q)',               phrase: 'del(11q)' },
    del12p:       { label: 'del(12p) / loss of 12p', phrase: 'del(12p) or loss of 12p' },
    minus13:      { label: '−13 / del(13q)',         phrase: 'monosomy 13 or del(13q)' },
    del17p:       { label: 'del(17p) / loss of 17p', phrase: 'del(17p) or loss of 17p' },
    i17q:         { label: 'i(17q)',                 phrase: 'isochromosome 17q' },
    idicX:        { label: 'idic(X)(q13)',           phrase: 'idic(X)(q13)' },

    /* THE TWO THAT ARE MYELODYSPLASIA-RELATED IN ICC 2022 AND NOT IN WHO-HAEM5.
       The two lists diverge in BOTH directions — ICC adds these, WHO adds del(11q)
       and −13/del(13q) — which is the same shape as the MR *gene* divergence over
       RUNX1, and is why MarrowFindings.js carries two lists rather than one with a
       flag. Offered here regardless of which classification counts them, because
       the karyotype either showed the abnormality or it did not; what it MEANS is
       the other file's question.

       Worth knowing while answering the row: +8 and del(20q) are also the classic
       abnormalities that do NOT by themselves establish MDS in the absence of
       morphologic dysplasia, so naming one here is not the same act as naming
       del(5q). */
    trisomy8:     { label: '+8',                     phrase: 'trisomy 8' },
    del20q:       { label: 'del(20q)',               phrase: 'del(20q)' }
};

/* The order they are offered in — clinical, not alphabetical, and the same order
   as above: the AML-defining lesions first, because a case with one is that
   entity and the question stops there, then the myelodysplasia-related set.
   Stated once, here, rather than relying on object key order. */
const ancAbnOrder = ['pmlRara', 'runx1Runx1t1', 'cbfbMyh11', 'dekNup214', 'rbm15Mrtfa',
    'kmt2a', 'mecom', 'nup98',
    'complex', 'del5q', 'minus7', 'del11q', 'del12p', 'minus13', 'del17p', 'i17q', 'idicX',
    'trisomy8', 'del20q'];

/* WHAT USED TO BE HERE, and what taking it out costs — worth stating once, in
   the file that removed it, rather than leaving it to be worked out from a
   diagnosis that never fires.

   BCR::ABL1 was its own four-answer row (Positive / Negative / Pending / Not
   performed) because it is not on the NGS panel — it is a fusion, found by FISH
   or RT-PCR — and it is the most consequential gate in the myeloid space:
   positive makes the case CML, and its ABSENCE is a requirement of PV, ET and
   PMF in both classifications. With the row gone `ancBcrAbl()` is null forever,
   so CML cannot be reached and those three cannot clear that criterion.

   SEX, SPLENOMEGALY, LDH AND SERUM EPO were criteria, not convenience: subnormal
   EPO is the only minor criterion for polycythemia vera, PMF needs a minor
   criterion from that list, and PV's haemoglobin and haematocrit thresholds are
   sex-specific. Without them neither entity can leave `pending`, whatever the
   marrow shows.

   PRIOR CYTOTOXIC THERAPY and ANTECEDENT NEOPLASM were the two history items —
   the first an ICC qualifier ("…, therapy-related") and a WHO-HAEM5 ENTITY
   (myeloid neoplasm post cytotoxic therapy, whose WHO name appends "post
   cytotoxic therapy" to the underlying diagnosis), the second a WHO-HAEM5
   CLASSIFIER that by itself makes a ≥20% blast case AML, myelodysplasia-related.

   All four groups are gone from the markup only. Their readers are below and
   answer null, and restoring any of them is a row in renderAncillaryPanel(). */

/* One labelled row of one exclusive toggle group. `states` defaults to the
   Pending/Performed/Not performed set, so the two study rows read as one
   question asked twice. */
function ancStatusRow(label, group, states) {
    const chips = (states || ancStudyStates).map(function (state) {
        const id = `${group}_${state.value}`;
        return `<input type="checkbox" class="chipInput form" id="${id}" value="${state.value}"` +
            ` data-toggle="${group}"><label class="chip" for="${id}">${state.label}</label>`;
    }).join('');
    return `<div class="findingLabel">${label}</div>` +
        `<div class="findingChips"><span class="chipGroup">${chips}</span></div>`;
}

/* The abnormality keys named, in the order they were named.

   IT READS THE DOM rather than a module variable — the list IS the state, which
   is what let this reader survive the placeholder era unchanged: the selects
   left and came back as markup alone, and every reader below, and
   MarrowFindings.js above them, resumed answering with nothing else touched. */
function ancAbnNamed() {
    return Array.from(document.querySelectorAll('#ancAbnList .ancAbnSelect'))
        .map(function (select) { return select.value; })
        .filter(Boolean);
}

/* One select of the growing list. An abnormality already named elsewhere is
   OFFERED BY NO OTHER SELECT — the option simply is not there, so naming the
   same lesion twice cannot be expressed. "—" is the empty state and also the
   remove action: setting a row back to it drops the row on the rebuild, which
   is why there is no remove button (the descriptor lists' bargain, kept in this
   reimplementation like every other behaviour). */
function ancAbnSelectHTML(selected, named) {
    const options = ancAbnOrder.filter(function (key) {
        return key === selected || named.indexOf(key) === -1;
    }).map(function (key) {
        return `<option value="${key}"${key === selected ? ' selected' : ''}>${ancAbnVocabulary[key].label}</option>`;
    }).join('');

    return `<select class="ancAbnSelect form"><option value=""${selected ? '' : ' selected'}>&mdash;</option>${options}</select>`;
}

/* Rebuilt WHOLE on every change, like the descriptor and stain lists: the named
   rows in naming order, then the one empty select that always waits, so adding
   an abnormality is choosing rather than pressing something first. Rebuilding
   whole is what keeps every select's option list honest with no bookkeeping —
   each rebuild recomputes who may offer what from the one list of names. */
function renderAncAbnList() {
    const host = document.getElementById('ancAbnList');
    if (!host) return;

    const named = ancAbnNamed();
    host.innerHTML = named.map(function (key) { return ancAbnSelectHTML(key, named); }).join('')
        + ancAbnSelectHTML('', named);
}


/* Public readers for the diagnosis engine. */
function ancStudyStatus(group) {
    return toggleGroupValue(group);       // '' | 'pending' | 'resulted' | 'notPerformed'
}

/* Was this abnormality named? Takes a VOCABULARY KEY, not an element id — with a
   list there is no per-abnormality element for an id to refer to, and keeping the
   old `ancDel5q` spelling would have been a name for something that no longer
   exists. */
function ancCytoFinding(key) {
    return ancAbnNamed().indexOf(key) !== -1;
}

/* Is anything at all named? What "has the karyotype said something" reduces to,
   and what findingGenetics() reads to decide whether cytogenetics are still
   outstanding. */
function ancAbnAny() {
    return ancAbnNamed().length > 0;
}

/* An abnormality's report wording, for a comment that names what was found. */
function ancAbnPhrase(key) {
    return ancAbnVocabulary[key] ? ancAbnVocabulary[key].phrase : '';
}

function ancKaryotypeText() {
    return document.getElementById('ancIscn')?.value.trim() || '';
}

/* BCR::ABL1 as the three-valued answer the engine wants, resolving the four chips
   down to the one question every rule actually asks — "is this a BCR::ABL1
   neoplasm?".

       positive              -> true
       negative              -> false   (a real negative; it is what OPENS PV/ET/PMF)
       pending / not done    -> null    (nobody has said)

   Pending and Not performed collapse to the same null on purpose: neither is
   evidence, and the difference between them is about what the comment says is
   outstanding, which dxPendingStudies() reads from the raw value.

   NO CHIPS RENDER THIS GROUP AT PRESENT, so it answers null on every case — see
   the note where the row used to be defined. */
function ancBcrAbl() {
    const value = toggleGroupValue('ancBcrAbl');
    if (value === 'positive') return true;
    if (value === 'negative') return false;
    return null;
}

/* The raw clinical toggle value, or '' — the seam MarrowFindings reads. Also
   unrendered at present, so also '' on every case. */
function ancClinical(group) {
    return toggleGroupValue(group);
}


/* ----------------------------------------------------------------------------
   Render
-------------------------------------------------------------------------- */

function renderAncillaryPanel() {
    const panel = document.getElementById('ancillaryPanel');
    if (!panel) return;

    panel.innerHTML = `
        ${/* ONE BLOCK PER STUDY, each its own status row over its own paste box.
              Status and import belong together — the chips are the answer for
              the case where there is nothing to paste, so putting all the
              statuses in one Studies block at the top would separate the two
              halves of one question by the height of a textarea.

              NGS FIRST, cytogenetics second — the user's order. The variants
              block stays glued under the NGS block that fills it. */''}
        <div class="fieldBlock">
            <div class="fieldLabel">NGS</div>
            <div class="findingGroup"><div class="findingGrid">
                ${ancStatusRow('Status', 'ancNgsStatus')}
            </div></div>
            ${/* noSave: an NGS report carries the accession, the collection date
                  and the clinical indication. Same rule and same marker as the
                  CBC paste box. */''}
            <textarea class="textBox noSave ancImport" id="ngsPaste" rows="4" spellcheck="false"
                      placeholder="Paste the NGS report here"></textarea>
            <div class="ngsStatus" id="ngsStatus"></div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Variants</div>
            <div class="ngsList" id="ngsList"></div>
        </div>

        <div class="fieldBlock">
            <div class="fieldLabel">Cytogenetics</div>
            <div class="findingGroup"><div class="findingGrid">
                ${ancStatusRow('Status', 'ancKaryotypeStatus')}
            </div></div>
            ${/* noSave for the same reason as the NGS box above: a cytogenetics
                  report pasted whole carries the accession, the collection date
                  and the indication. The ISCN string itself is a finding, but
                  this box holds whatever was on the clipboard. */''}
            <textarea class="textBox noSave ancImport form" id="ancIscn" rows="3" spellcheck="false"
                      placeholder="Paste the cytogenetics report or ISCN karyotype here"></textarea>
            ${/* The disease-defining abnormality list, restored from the parked
                  block. AFTER the paste box, because that is the working order:
                  the report goes in, then what it showed is named. The list is
                  what the diagnosis engine reads; the paste is for the human. */''}
            <div class="findingGroup"><div class="findingGrid">
                <div class="findingLabel">Abnormalities</div>
                <div class="findingChips"><div class="ancAbnList" id="ancAbnList"></div></div>
            </div></div>
        </div>
        ${/* Once, OUTSIDE #ngsList: renderNgsRows() replaces that container's
              innerHTML on every paste, and every gene input references this by id,
              so it must live where the rebuild cannot take it. */''}
        ${ngsGeneDatalistHTML()}`;

    renderNgsRows([]);
    renderAncAbnList();
}


/* ----------------------------------------------------------------------------
   Pasting is answering the status

   A report in the box IS the study having resulted, so the chip is set for you
   and Pending / Not performed are the only two left to click. Without this the
   commonest case — paste, read, move on — leaves the status unset, and an unset
   status is what makes the comment say the study is still awaited underneath the
   result it is quoting.

   TWO RULES, and both are about not overruling a person:

   It fires only on the EMPTY → FILLED transition, not on every keystroke. Paste a
   report into a box you have deliberately marked Pending (a preliminary result,
   an addendum in progress) and the next character typed would otherwise snap it
   back to Performed, repeatedly, with nothing on screen explaining why.

   It takes back only what it set. `data-autoStatus` marks a chip this function
   chose, so clearing the box clears the chip again — but a Performed you clicked
   yourself survives emptying the box, because entering the variants by hand
   without pasting anything is an ordinary way to work.
-------------------------------------------------------------------------- */

function ancAutoPerformed(box, group) {
    const filled = box.value.trim().length > 0;
    if (filled === (box.dataset.filled === '1')) return;   // "is there a result" unchanged
    box.dataset.filled = filled ? '1' : '0';

    if (filled) {
        setToggleGroup(group, 'resulted');
        box.dataset.autoStatus = '1';
        return;
    }
    if (box.dataset.autoStatus === '1') clearToggleGroup(group);
    delete box.dataset.autoStatus;
}

/* The two boxes and the two groups they answer for, so the wiring below and the
   hands-off rule above both read from one list. */
const ancImports = [
    { box: 'ancIscn', group: 'ancKaryotypeStatus' },
    { box: 'ngsPaste', group: 'ancNgsStatus' }
];


/* ----------------------------------------------------------------------------
   Bootstrap
-------------------------------------------------------------------------- */

renderAncillaryPanel();

/* ----------------------------------------------------------------------------
   Case state

   THE ONLY TWO CONTROLS IN THE APP WITH NO ids, so the only two MarrowSave's
   by-id capture cannot see — and that is not an oversight in either place. A
   variant row is free text with no fixed identity (its gene is what names it,
   and that is the thing being typed), and an abnormality select is one of a list
   whose length is the state. Neither has an id to be keyed by, so both capture
   and restore themselves here.

   THE PASTE BOXES ARE NOT SAVED and need no mention beyond this one: both carry
   class="noSave" for the reasons stated at the top of this file, so the capture
   never sees them. What that costs on restore is the ISCN string, which is a
   finding — `ancKaryotypeText()` reads it, and a restored case answers ''. The
   abnormality LIST, which is what the diagnosis engine actually reads, comes
   back whole; the karyotype text has to be re-pasted. That is the price of the
   PHI rule as written, not a gap in this handler.

   The status chips are ordinary chips with ids and ride the generic path. Their
   `data-autoStatus` marker is not saved on purpose: it says "this chip was set
   for you by a paste", and after a restore there is no paste in the box for it
   to be taken back by. A restored Performed is simply yours.
-------------------------------------------------------------------------- */
registerCaseState({
    id: 'ancillary',
    capture: function () {
        return { variants: ngsVariants(), abnormalities: ancAbnNamed() };
    },
    restore: function (saved) {
        // renderNgsRows() adds the trailing empty row itself, and
        // renderAncAbnList() reads the DOM it is given — so the empty case is
        // the same call with nothing in it, not a special path.
        renderNgsRows((saved && saved.variants) || []);

        const host = document.getElementById('ancAbnList');
        if (host) {
            const named = (saved && saved.abnormalities) || [];
            host.innerHTML = named.map(function (key) { return ancAbnSelectHTML(key, named); }).join('');
            renderAncAbnList();     // appends the trailing empty select
        }
    }
});

/* No registerReportSection yet. The variants produce no report text until the
   comment/addendum work lands; when it does, it reads ngsVariants() and nothing
   in this file needs to change. The rows already carry `class="form"`, so that
   section will be live from its first keystroke. */

/* Parse on input, like the CBC — a paste IS an input event, and so is a
   correction typed into the box afterwards. */
document.getElementById('ngsPaste')?.addEventListener('input', function () {
    ancAutoPerformed(this, 'ancNgsStatus');
    const parsed = ngsParse(this.value);

    // Keep what was typed by hand; replace what a previous paste put there.
    const manual = ngsRowElements().map(ngsRecordOf)
        .filter(function (r) { return r.source === 'manual' && !ngsRowIsEmpty(r); });

    /* A variant you have already taken ownership of is NOT re-added from the
       report. Without this, correcting a parsed VAF and then re-pasting left two
       rows for the one variant — the lab's and yours — which is worse than either
       rule on its own. Yours wins, because you edited it after seeing theirs. */
    const claimed = {};
    manual.forEach(function (r) { claimed[ngsKey(r)] = true; });
    const fresh = parsed.filter(function (r) { return !claimed[ngsKey(r)]; });

    renderNgsRows(fresh.concat(manual));
    ngsSetStatus(this.value, parsed.length);
    fillReport();
});

/* The cytogenetics box parses nothing yet — it is an import area and a status,
   and `ancKaryotypeText()` is the seam whatever reads it will come through. All
   this does is answer the status chip and re-render, since a textarea's `change`
   fires on blur and the report should not wait that long. */
document.getElementById('ancIscn')?.addEventListener('input', function () {
    ancAutoPerformed(this, 'ancKaryotypeStatus');
    fillReport();
});

/* CLICKING A STATUS CHIP TAKES IT OFF AUTOPILOT. Once the answer is yours, an
   emptied box must not reach over and clear it — see the second rule above.

   Bound on #ancillaryPanel rather than #inputPanel because this file loads after
   MarrowReport.js: an #inputPanel listener of ours would be added second and so
   run after fillReport(), and the abnormality list — rebuilt from the same
   event — would be read one render stale. Same reason `.stainSelect` binds on
   #stainPanel. */
document.getElementById('ancillaryPanel')?.addEventListener('change', function (e) {
    // The abnormality list rebuilds whole on any of its selects changing —
    // BEFORE #inputPanel's fillReport() listener runs, per the binding note.
    if (e.target.classList.contains('ancAbnSelect')) { renderAncAbnList(); return; }

    const group = e.target.dataset?.toggle;
    if (!group) return;
    ancImports.forEach(function (pair) {
        if (pair.group !== group) return;
        const box = document.getElementById(pair.box);
        if (box) delete box.dataset.autoStatus;
    });
});

/* Typing in a row: it becomes yours, and the list grows if you have reached the
   end of it. Neither of those replaces the row being typed in, which is what
   keeps the caret where it is. */
document.getElementById('ancillaryPanel')?.addEventListener('input', function (e) {
    const row = e.target.closest('.ngsRow');
    if (!row) return;
    row.dataset.source = 'manual';
    ngsEnsureTrailingRow();
});

document.getElementById('ancillaryPanel')?.addEventListener('click', function (e) {
    if (!e.target.closest('.ngsRemove')) return;
    e.target.closest('.ngsRow').remove();
    ngsEnsureTrailingRow();
    fillReport();
});
