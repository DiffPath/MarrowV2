/* ============================================================================
   MarrowDescriptors.js — the morphology descriptor vocabulary, and how to
   render and print it.

   A shared library. Blood uses it five times over (RBC features, and the
   neutrophil / lymphocyte / monocyte / platelet lists); the aspirate and core
   will bring their own lists to the same machinery. A tab says WHICH keys its
   group offers; this file owns what each one is called, what it prints, and how
   a set of them becomes a sentence fragment.

   Ported from ../Marrow/MarrowData.js:336 (descriptorList) and
   ../Marrow/MarrowText.js:1-111 (listText). The report strings are verbatim.

   TWO IDEAS:

   1. A GROWING LIST OF DROPDOWNS, one row per named morphology, and the list is
      the state. An unused group is one empty select; naming a morphology reveals
      its qualifier beside it and adds a fresh empty select below for the next.
      A group costs exactly as many rows as you have used it for, which is what
      a seventeen-option list of chips cannot do — those cost three rows of the
      panel forever, whether you name one morphology or none. The rebuild is
      whole-list, from the DOM, on every change, which is what keeps the option
      lists free of duplicates without any bookkeeping.

   2. THE QUALIFIER GROUPS THE OUTPUT. Two descriptors sharing a qualifier print
      as one phrase — "rare schistocytes and target cells", not "rare
      schistocytes and rare target cells". That is what descriptorPhrase() is
      for, and it is the reason a qualifier is a property of each descriptor
      rather than of the group.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Qualifier sets

   `value` is the report word, `label` the chip's. They differ in case on
   purpose: some qualifiers lead a sentence ("Rare nucleated red blood cells
   are identified") and carry their own capital, which is exactly how the old
   app got the capitalization right without a sentence-casing pass. Copying the
   values verbatim keeps that working.
-------------------------------------------------------------------------- */
const descriptorQualifiers = {
    // ../Marrow/MarrowData.js:107
    quant:  [{ label: 'Rare', value: 'rare' }, { label: 'Occasional', value: 'occasional' }, { label: 'Frequent', value: 'frequent' }],
    // ../Marrow/MarrowData.js:108
    degree: [{ label: 'Slight', value: 'slight' }, { label: 'Mild', value: 'mild' }, { label: 'Marked', value: 'marked' }],
    none:   []
};


/* ----------------------------------------------------------------------------
   The vocabulary

     label     the chip's text
     text      what the report prints
     qual      which qualifier set the chip offers ('none' for no qualifier)
     prefix    an article the phrase needs ("a shift to immaturity"); 'a'/'an'
               is resolved against whatever word ends up next, so "a mild shift"
               and "an increase" both come out right
     stop      this descriptor MEANS the absence of the others — it clears its
               group and its group clears it

   ONE TABLE FOR EVERY TAB, keyed by descriptor rather than by group — the
   original's shape, and it earns itself: `hypolobatedForms` is a single
   descriptor offered to neutrophils, myeloid precursors AND megakaryocytes, and
   keyed by group that would be three entries free to drift into three different
   sentences. The aspirate's lymphocyte list is the blood one entire; its myeloid
   list shares four of its five with the neutrophil list.

   A group is a CHOICE OF KEYS, not a copy of the words, which is what lets those
   lists overlap without having to agree: the aspirate's myeloid list adds
   `monolobatedForms` and drops `toxicChanges`, because toxic change is something
   a neutrophil does in blood and not something a marrow precursor is described
   as. The core's lists join the same table.
-------------------------------------------------------------------------- */
const descriptorVocabulary = {
    // --- Red cell morphology (../Marrow/MarrowData.js anisoList) -------------
    acanthocytes:        { label: 'Acanthocytes',         text: 'acanthocytes',         qual: 'quant' },
    basophilicStippling: { label: 'Basophilic stippling', text: 'basophilic stippling', qual: 'quant' },
    biteCells:           { label: 'Bite cells',           text: 'bite cells',           qual: 'quant' },
    blisterCells:        { label: 'Blister cells',        text: 'blister cells',        qual: 'quant' },
    burrCells:           { label: 'Burr cells',           text: 'burr cells',           qual: 'quant' },
    echinocytes:         { label: 'Echinocytes',          text: 'echinocytes',          qual: 'quant' },
    elliptocytes:        { label: 'Elliptocytes',         text: 'elliptocytes',         qual: 'quant' },
    howellJolly:         { label: 'Howell-Jolly bodies',  text: 'Howell-Jolly bodies',  qual: 'quant' },
    macroovalocytes:     { label: 'Macroovalocytes',      text: 'macroovalocytes',      qual: 'quant' },
    microspherocytes:    { label: 'Microspherocytes',     text: 'microspherocytes',     qual: 'quant' },
    ovalocytes:          { label: 'Ovalocytes',           text: 'ovalocytes',           qual: 'quant' },
    schistocytes:        { label: 'Schistocytes',         text: 'schistocytes',         qual: 'quant' },
    sickleCells:         { label: 'Sickle cells',         text: 'sickle cells',         qual: 'quant' },
    spherocytes:         { label: 'Spherocytes',          text: 'spherocytes',          qual: 'quant' },
    targetCells:         { label: 'Target cells',         text: 'target cells',         qual: 'quant' },
    teardropCells:       { label: 'Teardrop cells',       text: 'teardrop cells',       qual: 'quant' },
    teardropForms:       { label: 'Teardrop forms',       text: 'teardrop forms',       qual: 'quant' },

    // --- Neutrophils (neutrophilList) ---------------------------------------
    hypogranularForms:   { label: 'Hypogranular forms',   text: 'hypogranular forms',   qual: 'quant' },
    hypolobatedForms:    { label: 'Hypolobated forms',    text: 'hypolobated forms',    qual: 'quant', isForm: true },
    hypersegmentedForms: { label: 'Hypersegmented forms', text: 'hypersegmented forms', qual: 'quant' },
    shiftToImmaturity:   { label: 'Shift to immaturity',  text: 'shift to immaturity',  qual: 'degree', prefix: 'a' },
    toxicChanges:        { label: 'Toxic changes',        text: 'toxic changes',        qual: 'degree' },

    // --- Lymphocytes (lymphocyteList) ---------------------------------------
    // lymphNoAtypical's text is unused: the Blood tab prints the whole sentence
    // for it (see fillBlood), matching the old app. It is here to keep the
    // vocabulary complete rather than half-stated.
    lymphNoAtypical:              { label: 'No atypical',                text: 'No discrete atypical lymphocyte population is identified', qual: 'none', stop: true },
    smallMature:                  { label: 'Small mature',               text: 'predominantly small, mature lymphocytes', qual: 'none' },
    smallMatureAndLargeGranular:  { label: 'Small mature + LGL',         text: 'a mixture of small, mature lymphocytes and large granular lymphocytes', qual: 'none' },
    predominantlyLargeGranular:   { label: 'Predominantly LGL',          text: 'predominantly large granular lymphocytes', qual: 'none' },
    polymorphous:                 { label: 'Polymorphous',               text: 'a polymorphous population of lymphocytes', qual: 'none' },
    reactive:                     { label: 'Reactive',                   text: 'reactive lymphocytes', qual: 'quant' },
    predominantlyCllLike:         { label: 'Predominantly CLL-like',     text: 'predominantly small, mature lymphocytes with clumped chromatin', qual: 'none' },
    subsetCllLike:                { label: 'Subset CLL-like',            text: 'a subset of small, mature lymphocytes with clumped chromatin', qual: 'none' },
    marginalZoneLike:             { label: 'Marginal zone-like',         text: 'small lymphocytes abundant pale cytoplasm and polarized cytoplasmic projections', qual: 'none' },
    hairyCellLike:                { label: 'Hairy cell-like',            text: 'lymphocytes with abundant cytoplasm and circumferential cytoplasmic projections', qual: 'none' },

    // --- Monocytes (monocyteList) -------------------------------------------
    matureMorphology:    { label: 'Mature-appearing',     text: 'mature-appearing morphology', qual: 'none' },

    // --- Platelets (plateletList) -------------------------------------------
    hypogranularPlatelets: { label: 'Hypogranular',       text: 'hypogranular platelets', qual: 'quant' },
    largePlatelets:        { label: 'Large',              text: 'large platelets',        qual: 'quant' },
    giantPlatelets:        { label: 'Giant',              text: 'giant platelets',        qual: 'quant' },

    /* --- Blasts -----------------------------------------------------------
       ONE LIST, OFFERED ON BOTH SMEARS — see BLAST_DESCRIPTORS below. A blast is
       the same cell in blood and in marrow and the words used of it do not change
       with the slide it was found on, which is exactly the case the aspirate's
       lymphocyte list already makes: the group is a choice of keys, so two tabs
       can offer the same list without either owning it.

       NEW PROSE, no original to port. The old app described blasts by NUMBER only
       — a presence chip on blood, an increased/not-increased chip on the aspirate
       — so there is nothing here to be byte-compatible with, and the wording is
       the author's.

       AUER RODS ARE WHY THIS GROUP EXISTS. They are the one blast morphology that
       carries a classification consequence on its own: WHO-HAEM5 makes a case
       MDS-IB2 at ANY blast count within the MDS-IB range on their presence alone,
       so a 6% marrow with Auer rods is IB2 and a 6% marrow without them is IB1.
       Until now the application recorded them nowhere and the diagnosis engine
       could only warn about them in prose. `blastAuerBundles` counts as naming
       them too — a bundle is Auer rods — and WHICH keys mean Auer rods is a
       clinical judgement, written out in MarrowFindings.js beside
       dysplasticDescriptors rather than inferred from a label.

       WHAT THEIR ABSENCE MEANS IS NOTHING, and that is deliberate. There is no
       "no Auer rods" stop chip, because a stop chip clears its whole group and
       "no Auer rods" is perfectly compatible with agranular cytoplasm and
       prominent nucleoli — they are not alternatives. So an unnamed Auer rod is
       `null`, never `false`, and the engine can only ever be promoted by this
       finding, never demoted. See findingAuerRods().

       Mostly UNGRADED. "Frequent prominent nucleoli" is not a thing anyone
       writes: these describe the population, and a qualifier that cannot be said
       is a click that can only be wrong. The three that DO grade are the ones
       counted cell by cell — Auer rods, Auer rod bundles and cup-like nuclei are
       each seen in some blasts and not in others.

       `blastAuerBundles` CARRIED AN OBSOLETE EPONYM as its key, its label and its
       report string until it was retired at the author's instruction. The term is
       not used in current practice and does not belong in a report; the finding
       it named is a blast carrying a bundle of Auer rods, which is what all three
       now say. Deliberate, not a porting error — the rule in CLAUDE.md is that
       clinical strings are exact, and the exact current term is this one. */
    blastAuerRods:          { label: 'Auer rods',          text: 'Auer rods',                    qual: 'quant' },
    blastAuerBundles:       { label: 'Auer rod bundles',   text: 'bundles of Auer rods',         qual: 'quant' },

    // Nuclear.
    blastFineChromatin:     { label: 'Fine chromatin',     text: 'fine, dispersed chromatin',    qual: 'none' },
    blastProminentNucleoli: { label: 'Prominent nucleoli', text: 'prominent nucleoli',           qual: 'none' },
    blastCupLike:           { label: 'Cup-like nuclei',    text: 'cup-like nuclear invaginations', qual: 'quant' },
    blastFoldedNuclei:      { label: 'Folded nuclei',      text: 'folded and convoluted nuclei', qual: 'none' },
    blastBilobedNuclei:     { label: 'Bilobed nuclei',     text: 'bilobed and reniform nuclei',  qual: 'none' },

    // Cytoplasmic.
    blastHighNC:            { label: 'High N:C ratio',     text: 'high nuclear-to-cytoplasmic ratios', qual: 'none' },
    blastAgranular:         { label: 'Agranular',          text: 'agranular cytoplasm',          qual: 'none' },
    blastGranular:          { label: 'Granular',           text: 'granular cytoplasm',           qual: 'none' },
    blastHypergranular:     { label: 'Hypergranular',      text: 'hypergranular cytoplasm',      qual: 'none' },
    blastBasophilic:        { label: 'Basophilic',         text: 'deeply basophilic cytoplasm',  qual: 'none' },
    blastVacuolated:        { label: 'Vacuolated',         text: 'cytoplasmic vacuolization',    qual: 'none' },
    blastBlebs:             { label: 'Cytoplasmic blebs',  text: 'cytoplasmic blebs and pseudopod formation', qual: 'none' },
    blastMonocytoid:        { label: 'Monocytoid',         text: 'monocytoid features',          qual: 'none' },

    /* --- Aspirate ---------------------------------------------------------
       Sixteen new words for a whole tab, because the vocabulary was always
       shared: the aspirate's lymphocyte list is the blood one entire, and its
       myeloid list shares four of five with the neutrophil list. That is the
       whole reason this table is keyed by descriptor rather than by group —
       hypolobatedForms is one descriptor offered to three lineages, not three
       descriptors that happen to read alike.

       All quant except the adequacy words, which are `none`: a marrow is
       hemodilute or it is not, and "occasionally aspiculate" is not a thing
       anyone writes. Verbatim from ../Marrow/MarrowData.js:336. */

    // Adequacy (adequacyList) — adjectives on the smear, not on a cell:
    // "The bone marrow aspirate smears are hemodilute and paucicellular...".
    hemodilute:          { label: 'Hemodilute',           text: 'hemodilute',           qual: 'none' },
    paucicellular:       { label: 'Paucicellular',        text: 'paucicellular',        qual: 'none' },
    virtuallyAcellular:  { label: 'Virtually acellular',  text: 'virtually acellular',  qual: 'none' },
    paucispicular:       { label: 'Paucispicular',        text: 'paucispicular',        qual: 'none' },
    aspiculate:          { label: 'Aspiculate',           text: 'aspiculate',           qual: 'none' },

    /* Erythroid precursors (erythroidList). shiftToImmaturity is shared, and
       vacuolization is `blastVacuolated` above - the same words for the same
       cytoplasm, so the same key.

       THE TERMS ARE WHO-HAEM5 TABLE 2.10's (docs/who/mds-dysplasia-table-2.10.md),
       at the author's instruction. Two consequences: `megaloblastoid` keeps its
       KEY but prints "megaloblastic changes" - the introduction says in terms
       that megaloblastic is "preferred over the term 'megaloblastoid'" - and
       the erythroid lists offer `multinuclearity` (the table's erythroid word)
       while `multinucleation` stays for the plasma and megakaryocyte lists,
       which is the word the table uses THERE. */
    nuclearBudding:             { label: 'Nuclear budding',        text: 'nuclear budding',              qual: 'quant' },
    internuclearBridging:       { label: 'Internuclear bridging',  text: 'internuclear bridging',        qual: 'quant' },
    nuclearContourIrregularity: { label: 'Nuclear contours',       text: 'nuclear contour irregularity', qual: 'quant' },
    multinuclearity:            { label: 'Multinuclearity',        text: 'multinuclearity',              qual: 'quant' },
    multinucleation:            { label: 'Multinucleation',        text: 'multinucleation',              qual: 'quant' },
    megaloblastoid:             { label: 'Megaloblastic changes',  text: 'megaloblastic changes',        qual: 'quant' },
    karyorrhexis:               { label: 'Karyorrhexis',           text: 'karyorrhexis',                 qual: 'quant' },

    /* Myeloid precursors (myeloidList) - everything else it offers is the
       neutrophil list's, already above, plus these Table 2.10 terms. The
       pseudo-Pelger-Huët key exists BESIDE hypolobated/monolobated forms
       rather than replacing them: the anomaly is the named entity, the forms
       are the looser everyday description, and the author's instruction was to
       add the WHO terms without removing options. */
    monolobatedForms:     { label: 'Monolobated forms',    text: 'monolobated forms',    qual: 'quant' },
    pseudoPelgerHuet:     { label: 'Pseudo-Pelger-Huët',   text: 'hyposegmented (pseudo-Pelger-Huët) forms', qual: 'quant' },
    pseudoChediakHigashi: { label: 'Pseudo-Chédiak-Higashi granules', text: 'pseudo-Chédiak-Higashi granules', qual: 'quant' },
    smallSize:            { label: 'Small size',           text: 'small size',           qual: 'none' },

    /* Megakaryocytes (aspMegList). Hypolobated/hypersegmented are shared with
       the myeloid list; these five are the megakaryocyte's own.

       `isForm` marks a descriptor that names a KIND OF CELL rather than a feature
       of one, which decides the verb: a population *includes* micromegakaryocytes
       but *shows* widely separated nuclear lobes. Only coreMegText() reads it (see
       there); it is a property of the descriptor, not of the core, which is why it
       sits here and why hypolobatedForms carries it for every lineage offered it. */
    widelySeparatedNuclearLobes: { label: 'Widely separated lobes', text: 'widely separated nuclear lobes', qual: 'quant' },
    separationNuclearLobes:      { label: 'Separated lobes',        text: 'separation of nuclear lobes',    qual: 'quant' },
    smallHypolobated:            { label: 'Small hypolobated',      text: 'small hypolobated forms',        qual: 'quant', isForm: true },
    micromegakaryocytes:         { label: 'Micromegakaryocytes',    text: 'micromegakaryocytes',            qual: 'quant', isForm: true },
    largeHypersegmented:         { label: 'Large hypersegmented',   text: 'large hypersegmented forms',     qual: 'quant', isForm: true },

    // Plasma cells (aspPlasmaList). multinucleation is shared with erythroids.
    largeAtypical:       { label: 'Large atypical',       text: 'large, atypical forms with prominent nucleoli', qual: 'quant' },

    /* --- Core biopsy -----------------------------------------------------
       The core's megakaryocyte list reuses the aspirate keys above, so only ME,
       lymphocytes and adequacy are new here. Text verbatim from
       ../Marrow/MarrowData.js:336.

       Myeloids/erythroids on the core are whole findings, not per-cell morphology
       — all `none` but coreIncreasedBlasts, which grades.

       They print existentially ("There is a mild increase in blasts"), NOT under
       the original's "Myeloid and erythroid precursors show …" stem. The stem
       named both lineages and then every descriptor named one again: "Myeloid and
       erythroid precursors show left-shifted myeloid maturation." The lineage
       belongs to the finding, so the finding says it once and the stem is gone.
       (The unremarkable sentence keeps the stem — with nothing to name, "Myeloid
       and erythroid precursors show progressive maturation" is the finding, and
       the aspirate prints that same line.)

       `coreMEFrame` says how coreMEText() uses each one:
         'lineage' — `text` is just the LINEAGE, pooled into one "left-shifted
                     <myeloid and erythroid> maturation". Two left shifts are one
                     finding said once, not the same sentence twice.
         'noun'    — `text` is the noun phrase itself, qualifier and article
                     resolved by descriptorNounPhrase().
       `plural` picks the existential verb, and only the FIRST finding's number
       counts ("There is left-shifted myeloid maturation and scattered erythroid
       islands"), which is how the construction agrees in English. */
    coreLeftShiftMyeloid:   { label: 'Left-shifted myeloid',   text: 'myeloid',                    qual: 'none', coreMEFrame: 'lineage' },
    coreLeftShiftErythroid: { label: 'Left-shifted erythroid', text: 'erythroid',                  qual: 'none', coreMEFrame: 'lineage' },
    coreErythroidIslands:   { label: 'Erythroid islands',      text: 'scattered erythroid islands', qual: 'none', coreMEFrame: 'noun', plural: true },
    // "Megaloblastic" over "megaloblastoid" - WHO-HAEM5's stated preference
    // (docs/who/mds-introduction.md), same rename as the aspirate key above.
    coreMegaloblastoid:     { label: 'Megaloblastic',          text: 'megaloblastic maturation',   qual: 'none', coreMEFrame: 'noun' },
    coreIncreasedBlasts:    { label: 'Increased blasts',       text: 'increase in blasts', qual: 'degree', prefix: 'a', coreMEFrame: 'noun' },

    /* MEGAKARYOCYTE MORPHOLOGY OF THE MYELOPROLIFERATIVE NEOPLASMS, offered on
       the core's Megakaryocytes row beside the dysplastic features already there.

       ONE ROW, because it is one question — "what do the megakaryocytes look
       like" — and a case may honestly answer it with both kinds of word: a
       fibrotic marrow can show cloud-like nuclei AND micromegakaryocytes. A
       second row would be the aspirate's "Counted on" mistake, two questions
       under one subject.

       These are what separates essential thrombocythemia from prefibrotic PMF,
       which is the least reproducible call in the whole classification — six
       hematopathologists reached full consensus on 13% of non-fibrotic trephines
       and averaged kappa 0.41 (Eur. Bone Marrow Working Group, Haematologica
       2012;97:360). That is WHY they are here: an engine cannot weigh a feature
       nobody was given a way to record. It is also why the diagnosis engine
       scores them and never gates on them.

       NEW PROSE, no original to port — the old app described megakaryocytes with
       dysplastic words only, so there is nothing here to be byte-compatible with.
       Wording is the author's; `staghorn` is ICC 2022's term (WHO-HAEM5 says only
       "hyperlobulated"), kept because it is what the finding is called at the
       scope.

       `isForm` for the two that name a KIND of cell rather than a feature of one,
       so coreMegText() puts them after "include" — megakaryocytes *include* bare
       nuclei but *show* clumped chromatin. Mostly `qual: 'none'`: "frequent
       marked size variation" is not a thing anyone writes, and a qualifier that
       cannot be said is a click that can only be wrong. */
    megDenseClusters:    { label: 'Dense clusters',      text: 'dense clustering',                        qual: 'none' },
    megLooseClusters:    { label: 'Loose clusters',      text: 'loose clustering',                        qual: 'none' },
    megParatrabecular:   { label: 'Paratrabecular',      text: 'paratrabecular and perisinusoidal displacement', qual: 'none' },
    megStaghorn:         { label: 'Staghorn nuclei',     text: 'hyperlobulated, staghorn-like nuclei',    qual: 'none' },
    megCloudLike:        { label: 'Cloud-like nuclei',   text: 'bulbous, cloud-like hypolobulated nuclei', qual: 'none' },
    megHyperchromatic:   { label: 'Hyperchromatic',      text: 'abnormally clumped, hyperchromatic chromatin', qual: 'none' },
    megPleomorphic:      { label: 'Size pleomorphism',   text: 'marked variation in size, from small to giant forms', qual: 'none' },
    megBareNuclei:       { label: 'Bare nuclei',         text: 'bare (naked) nuclei',                     qual: 'quant', isForm: true },
    megLargeMature:      { label: 'Large mature',        text: 'large, mature forms',                     qual: 'quant', isForm: true },

    /* Lymphocytes on the core describe DISTRIBUTION, not cytology — where the
       lymphocytes sit in the section.

       These are the one group with NO fixed subject stem. The original printed
       them as "Lymphocytes are <text>", which forced every aggregate to arrive as
       a predicate of the lymphocytes ("Lymphocytes are present as focal loose
       aggregates") — grammatical, and not how the finding is written. The
       aggregate is the thing being reported, so it is the subject of its own
       sentence and `coreLymphFrame` says which shape a descriptor takes:

         'aggregate' — `text` is an ADJECTIVE, pooled by coreLymphText() into one
                       "<adjectives> lymphoid aggregates are seen." Two named
                       share the sentence, exactly as a qualifier pools elsewhere.
         'sentence'  — `text` is the WHOLE sentence, minus its capital and period.
                       The two findings that are not aggregates: scattered
                       lymphocytes have no aggregate to be the subject, and a
                       diffuse infiltrate takes the existential "There is".

       Deliberate deviation from ../Marrow/MarrowData.js:336 — wording only; the
       findings and the order they are offered in are unchanged. */
    coreLymphScattered:        { label: 'Interstitial, unremarkable', coreLymphFrame: 'sentence',  qual: 'none',
                                 text: 'lymphocytes are scattered singly within the interstitium, without lymphoid aggregate formation' },
    /* The unqualified aggregate: focal, and nothing claimed about whether it is
       loose, paratrabecular or not. It prints "Focal lymphoid aggregates are
       seen." and is the answer for a section where the aggregate is there and
       its character is not the point. */
    coreLymphFocal:            { label: 'Focal aggregates',        text: 'focal',                    qual: 'none', coreLymphFrame: 'aggregate' },
    coreLymphLooseAgg:         { label: 'Focal loose aggregates',  text: 'focal loose',              qual: 'none', coreLymphFrame: 'aggregate' },
    coreLymphNonparatrabecular:{ label: 'Focal nonparatrabecular', text: 'focal non-paratrabecular', qual: 'none', coreLymphFrame: 'aggregate' },
    coreLymphParatrabecular:   { label: 'Focal paratrabecular',    text: 'focal paratrabecular',     qual: 'none', coreLymphFrame: 'aggregate' },
    coreLymphMultifocal:       { label: 'Multifocal aggregates',   text: 'multifocal',               qual: 'none', coreLymphFrame: 'aggregate' },
    coreLymphDiffuse:          { label: 'Diffuse infiltrate',      qual: 'none', coreLymphFrame: 'sentence',
                                 text: 'there is a diffuse interstitial lymphoid infiltrate' },

    /* Adequacy carries a VERB, not a qualifier: the descriptor is printed as
       "shows a crush artifact" or "is fragmented", and MarrowCore groups the
       selected ones by that verb ("is fragmented and small"). `coreVerb` and
       `article` are read only by coreAdequacyPhrase() — descriptorPhrase() never
       sees them, so `qual` stays 'none'. `article` means the noun takes a/an,
       resolved against the noun itself (crush -> a, aspiration -> an).

       The original mislaid the two: it printed "a shows crush artifact", the
       prefix landing before the verb (../Marrow/MarrowText.js:40-60 with the
       showsDescriptors prefix). Ungrammatical, and unambiguously meant to read
       "shows a crush artifact" — fixed here, flagged in CLAUDE.md. */
    // No article, at the author's instruction: artifact is a mass noun here -
    // "shows crush artifact", never "shows a crush artifact".
    crushArtifact:            { label: 'Crush artifact',          text: 'crush artifact',          qual: 'none', coreVerb: 'shows' },
    aspirationArtifact:       { label: 'Aspiration artifact',     text: 'aspiration artifact',     qual: 'none', coreVerb: 'shows' },
    proceduralArtifact:       { label: 'Procedural artifact',     text: 'procedural artifact',     qual: 'none', coreVerb: 'shows' },
    fragmented:               { label: 'Fragmented',              text: 'fragmented',              qual: 'none', coreVerb: 'is' },
    subcortical:              { label: 'Subcortical',             text: 'subcortical',             qual: 'none', coreVerb: 'is' },
    predominantlySubcortical: { label: 'Predominantly subcortical', text: 'predominantly subcortical', qual: 'none', coreVerb: 'is' },
    small:                    { label: 'Small',                   text: 'small',                   qual: 'none', coreVerb: 'is' }
};


/* ----------------------------------------------------------------------------
   Ids

   One descriptor key can appear in more than one group (shiftToImmaturity is
   offered to neutrophils AND monocytes), so an id is group + key. The old app's
   ids were per-select-position, which is why remembering a selection across a
   re-render was impossible there.
-------------------------------------------------------------------------- */
function descriptorId(group, key) {
    return group + '_' + key;
}

/* The toggle group holding one descriptor's qualifier. Derived, not stored:
   qualChipHTML() builds the same name from the chip's id, and the two must
   agree or a qualifier would be set where nothing reads it. */
function descriptorQualGroup(group, key) {
    return descriptorId(group, key) + 'Qual';
}

/* ----------------------------------------------------------------------------
   Groups

   A tab registers which keys its group offers; the list machinery below looks
   them up by name. Registered rather than passed around because the delegated
   change handler only ever learns a group's NAME from the DOM, and it has to be
   able to rebuild it from that alone.
-------------------------------------------------------------------------- */
const descriptorGroups = {};

function registerDescriptorGroup(group, keys) {
    descriptorGroups[group] = keys;
}

/* THE ONE KEY LIST THAT LIVES HERE RATHER THAN IN A TAB, because it is the one
   offered by two tabs verbatim: `pbBlastDesc` and `aspBlastDesc` are the same
   question about the same cell asked of two slides, and there is no reading of
   the vocabulary on which they should ever differ.

   The lymphocyte list is the standing counter-example and is deliberately left
   duplicated: blood and the aspirate happen to agree on it today, and either
   could add a word without the other. Here they cannot — the diagnosis engine
   reads Auer rods out of BOTH groups (findingAuerRods), so a key present in one
   list and missing from the other would make the same finding classifying on one
   slide and invisible on the other. That is the kind of drift a shared constant
   exists to make impossible, and the kind a copy invites. */
const BLAST_DESCRIPTORS = ['blastAuerRods', 'blastAuerBundles', 'blastFineChromatin',
    'blastProminentNucleoli', 'blastCupLike', 'blastFoldedNuclei', 'blastBilobedNuclei',
    'blastHighNC', 'blastAgranular', 'blastGranular', 'blastHypergranular',
    'blastBasophilic', 'blastVacuolated', 'blastBlebs', 'blastMonocytoid'];

/* The named descriptors, IN ROW ORDER — which is selection order, and therefore
   report order. The list IS the state: there is nothing else to read, nothing to
   keep in step with it, and no way for the two to disagree. */
function descriptorSelected(group) {
    return Array.from(document.querySelectorAll('#' + group + 'List .descSelect'))
        .map(function (select) { return select.value; })
        .filter(Boolean);
}

function descriptorChecked(group, key) {
    return descriptorSelected(group).indexOf(key) !== -1;
}


/* ----------------------------------------------------------------------------
   Render

   The whole list is rebuilt from its own DOM on every change (renderDescriptorList
   below), which is what the old app did too and is the right shape here: each
   select's options are "everything not already named", so they all change
   whenever any one of them does. Rebuilding sidesteps that entirely.
-------------------------------------------------------------------------- */

/* A chip that carries its own qualifier, revealed by CSS when it is checked
   (.chipWrap:has(...) — see Template.css). NOT for descriptor lists, which are
   dropdowns: this is for the handful of named findings that are questions in
   their own right rather than entries in a list — polychromasia, NRBCs,
   rouleaux, anisopoikilocytosis — each with its own qualifier set and its own
   bespoke sentence. Hence `options` is passed rather than looked up. */
function qualChipHTML(id, label, options, group) {
    const groupAttr = group ? ` data-stopgroup="${group}"` : '';

    const quals = options.map(function (option) {
        const qid = id + 'Q' + option.value;
        return `<input type="checkbox" class="chipInput chipQualInput form" id="${qid}" value="${option.value}" data-toggle="${id}Qual"><label class="chip chipQual" for="${qid}">${option.label}</label>`;
    }).join('');

    // The qualifiers are one toggle group, so they are one segmented control
    // (.chipGroup) inside .chipQuals — which stays, since it is what :has()
    // reveals and hides.
    return `<span class="chipWrap">
        <input type="checkbox" class="chipInput form" id="${id}"${groupAttr}><label class="chip" for="${id}">${label}</label>${quals ? `<span class="chipQuals"><span class="chipGroup">${quals}</span></span>` : ''}
    </span>`;
}

/* One row: the dropdown, and the qualifier chips for whatever it names.

   "—" is the empty option and it means the same thing in both places it can
   appear: nothing here. On the trailing select that is its resting state; on a
   named one, picking it is how you take the morphology back out. */
function descriptorRowHTML(group, index, key, options, qual) {
    const optionHTML = '<option value="">—</option>' + options.map(function (k) {
        return `<option value="${k}"${k === key ? ' selected' : ''}>${descriptorVocabulary[k].label}</option>`;
    }).join('');

    let qualHTML = '';
    if (key) {
        qualHTML = (descriptorQualifiers[descriptorVocabulary[key].qual] || []).map(function (option) {
            const qid = descriptorId(group, key) + 'Q' + option.value;
            return `<input type="checkbox" class="chipInput chipQualInput form" id="${qid}" value="${option.value}" data-toggle="${descriptorQualGroup(group, key)}"${option.value === qual ? ' checked' : ''}><label class="chip chipQual" for="${qid}">${option.label}</label>`;
        }).join('');
        // "Rare | Occasional | Frequent" is one question, so one segmented
        // control — and one flex item, so it wraps below the select whole rather
        // than breaking apart mid-group.
        if (qualHTML) qualHTML = `<span class="chipGroup">${qualHTML}</span>`;
    }

    // `form` opts the select into MarrowReport's live re-render, exactly as it
    // does for a chip. The rebuild above runs first (this file loads ahead of
    // MarrowReport), so fillReport() reads the list as it now stands.
    return `<div class="descRow">
        <select class="descSelect form" id="${group}Sel${index}" data-group="${group}">${optionHTML}</select>${qualHTML}
    </div>`;
}

/* Rebuild a group's list from what it currently names.

   Two things the old app got right and this keeps. A descriptor already named
   is offered by no other select, so it cannot be said twice. And a STOP
   descriptor ("No atypical") suppresses the trailing select: it means the
   absence of the others, so there is nothing further to add and the UI should
   not pretend otherwise.

   Qualifiers are read off the OLD DOM before it is replaced and written back
   into the new — and keyed by descriptor rather than by row, so a qualifier
   follows its morphology rather than the slot it happened to sit in. */
function renderDescriptorList(group) {
    const host = document.getElementById(group + 'List');
    if (!host) return;

    const all = descriptorGroups[group] || [];
    const chosen = descriptorSelected(group);

    const quals = {};
    chosen.forEach(function (key) { quals[key] = toggleGroupValue(descriptorQualGroup(group, key)); });

    let html = '';
    let stopped = false;

    chosen.forEach(function (key, i) {
        if (descriptorVocabulary[key].stop) stopped = true;
        // Its own value, plus everything nobody has named.
        const options = all.filter(function (k) { return k === key || chosen.indexOf(k) === -1; });
        html += descriptorRowHTML(group, i, key, options, quals[key]);
    });

    const remaining = all.filter(function (k) { return chosen.indexOf(k) === -1; });
    if (remaining.length && !stopped) html += descriptorRowHTML(group, chosen.length, '', remaining, '');

    host.innerHTML = html;
}

/* The empty shell. renderDescriptorList() fills it, and is what every later
   change goes through. */
function descriptorListHTML(group) {
    return `<span class="descList" id="${group}List"></span>`;
}

function clearDescriptorList(group) {
    document.querySelectorAll('#' + group + 'List .descSelect').forEach(function (select) { select.value = ''; });
    renderDescriptorList(group);
}

/* Delegated from the static #inputPanel, bound once: the rows are replaced on
   every change, so nothing may be bound to them. Rebuilding BEFORE MarrowReport
   reads the DOM is the same ordering constraint the toggle groups have, and is
   why MarrowForm.js and this file both load ahead of it.

   The second half is the stop-chip contract reaching across into a list.
   MarrowForm's handler clears stop chips against each OTHER, but it works by
   unchecking, and a <select> has nothing to uncheck — so "unremarkable
   morphology" and a named morphology have to be reconciled here, where the list
   is understood. They are contradictory in both directions, and both directions
   are one line. */
document.getElementById('inputPanel')?.addEventListener('change', function (e) {
    const target = e.target;

    if (target.classList.contains('descSelect')) {
        if (target.value) {
            document.querySelectorAll('[data-stopgroup="' + target.dataset.group + '"][data-stop]')
                .forEach(function (chip) { chip.checked = false; });
        }
        renderDescriptorList(target.dataset.group);
        return;
    }

    const group = target.dataset?.stopgroup;
    if (group && target.checked && target.dataset.stop !== undefined && descriptorGroups[group]) {
        clearDescriptorList(group);
    }
});


/* ----------------------------------------------------------------------------
   Print

   descriptorPhrase() is listText() (../Marrow/MarrowText.js:1-111) rebuilt
   against chips. One behavior is deliberately NOT carried over: the old
   listText let a descriptor with no qualifier INHERIT the previous one's, when
   both offered the same qualifier set. That existed because setting the
   qualifier on every select was laborious — it was a workaround for the UI, and
   it silently qualified things you never qualified. Here each chip carries its
   own qualifier and setting two of them is two clicks, so the grouping below is
   reached by saying what you mean.
-------------------------------------------------------------------------- */

/* "a" vs "an", decided by whatever word actually lands next — which is the
   qualifier when there is one ("a mild shift") and the descriptor when there is
   not ("an increase"). */
function descriptorArticle(prefix, nextWord) {
    if (prefix !== 'a' && prefix !== 'an') return prefix;
    return 'aeiou'.indexOf(nextWord.trim().charAt(0).toLowerCase()) !== -1 ? 'an' : 'a';
}

/* One descriptor as a printed noun phrase — its qualifier and its article
   resolved, nothing else. This is descriptorPhrase()'s per-key step, pulled out
   so a caller building its own sentence (coreMEText) can get "a mild increase in
   blasts" without also getting descriptorPhrase's pooling and its stem. */
function descriptorNounPhrase(group, key) {
    const d = descriptorVocabulary[key];
    const qual = toggleGroupValue(descriptorQualGroup(group, key));
    const body = qual ? `${qual} ${d.text}` : d.text;
    return d.prefix ? `${descriptorArticle(d.prefix, qual || d.text)} ${body}` : body;
}

/* Join independent phrases into one fragment. `pooled` says whether any phrase
   is ITSELF a list — once one is, commas cannot also separate the phrases from
   each other without ambiguity, so they get "with", or semicolons once there are
   three. ../Marrow/MarrowText.js:92-108.

   Shared with coreMEText(), which runs into exactly this: "left-shifted myeloid
   and erythroid maturation" is one pooled phrase, so a second finding joins it
   with "with" rather than a third "and". */
function descriptorJoin(phrases, pooled) {
    if (phrases.length === 0) return '';
    if (phrases.length === 1) return phrases[0];
    if (!pooled) return addCommas(phrases);
    if (phrases.length === 2) return `${phrases[0]} with ${phrases[1]}`;

    let joined = '';
    for (let i = 0; i < phrases.length; i++) {
        joined += i < phrases.length - 1 ? `${phrases[i]}; ` : `and ${phrases[i]}`;
    }
    return joined;
}

/* The named descriptors of one group, as a sentence fragment ('' if none), in
   the order they were named — the rows' order, which is the only order there is.

   Descriptors sharing a qualifier collapse into one phrase, which is the whole
   point: "rare schistocytes and target cells" is how a pathologist says it and
   "rare schistocytes and rare target cells" is not. A prefixed descriptor
   ("a mild shift to immaturity") stands alone — it carries its own article, so
   it cannot be pooled with anything.

   `filter` (optional) narrows it to the keys a caller wants, so one group can be
   printed as two phrases under two verbs — coreMegText's "shows … and includes
   …". Without it, every named descriptor in the group. */
function descriptorPhrase(group, filter) {
    const phrases = [];
    const byQualifier = new Map();
    let pooled = false;

    /* THE QUALIFIER CARRIES DOWN THE LIST (the author's instruction): a named
       descriptor with no qualifier picked takes the nearest one picked ABOVE
       it, so "occasional schistocytes" over a bare "target cells" prints
       "occasional schistocytes and target cells" rather than "... with target
       cells", and two bare rows below make "occasional x, y, and z". The run
       only flows through rows offering the SAME qualifier set - a row with a
       different set, no set at all, or its own article breaks it - and rows
       above the first pick stay bare, as they always did. An explicit pick
       starts a new run wherever it lands. */
    let run = null;    // { value, set } of the nearest explicit qualifier above

    descriptorSelected(group).forEach(function (key) {
        if (filter && !filter(key)) return;
        const d = descriptorVocabulary[key];

        if (d.prefix) {
            phrases.push(descriptorNounPhrase(group, key));
            run = null;
            return;
        }

        const explicit = toggleGroupValue(descriptorQualGroup(group, key));
        let qual = explicit;
        if (explicit) run = { value: explicit, set: d.qual };
        else if (run && d.qual !== 'none' && d.qual === run.set) qual = run.value;
        else run = null;

        if (!byQualifier.has(qual)) byQualifier.set(qual, []);
        byQualifier.get(qual).push(d.text);
    });

    byQualifier.forEach(function (items, qual) {
        if (items.length >= 2) pooled = true;
        const joined = addCommas(items);
        phrases.push(qual ? `${qual} ${joined}` : joined);
    });

    return descriptorJoin(phrases, pooled);
}
