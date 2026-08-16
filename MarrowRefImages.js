/* ============================================================================
   MarrowRefImages.js — the photomicrograph manifest for the red cell atlas.

   GENERATED, NOT HAND-WRITTEN. Every entry was produced by the same script run
   that downloaded the file beside it, from the file's own Commons metadata at
   that moment. For CC BY and CC BY-SA the credit IS the licence condition, so a
   credit line typed separately from the download is a licence breach waiting for
   somebody to rename a file.

   TO ADD YOUR OWN IMAGE: drop it in images/rbc/ and add an entry by hand with
   `source: 'own'`. Own images need no licence or author line and should be set
   `verified: true` — you took them, so the cell is what you say it is. An own
   image REPLACES the Commons one for that key; the Commons file can then be
   deleted.

   `verified` IS THE SIGN-OFF GATE AND IT IS FALSE ON EVERY COMMONS IMAGE.
   Commons is contributor-curated, not pathologist-reviewed: the schistocyte
   category holds dog, rabbit and rat smears, and a search for Howell-Jolly
   bodies returned a quokka. Nothing here has been confirmed to show the cell its
   filename claims. Until `verified: true`, the atlas renders the photograph with
   an amber "unconfirmed" badge over it.

   ---------------------------------------------------------------------------
   CHECK THE COLOUR OF ANYTHING ADDED HERE.

   Twelve images were downloaded and two were thrown away: the echinocyte and
   macroovalocyte candidates had a heavy GREEN CAST — mean RGB (117,144,85) and
   (117,150,92), green the dominant channel on a Wright-Giemsa smear that should
   read red >= blue > green. They looked like pond water beside the pink
   schematic, and a reference page that teaches the wrong colour is worse than
   one with no photograph at all. Those two cards are schematic-only until a real
   image exists for them.

   The check is objective and takes a minute: draw the image to a canvas, average
   the pixels, and reject anything where green is the largest channel. Two of
   twelve failed, which is a high enough rate to be worth doing every time.
   ========================================================================= */

const rbcPhotos = {
    acanthocytes: {
        file: 'images/rbc/acanthocytes.jpg',
        caption: "Abetalipoproteinaemia.",
        author: "Rola Zamel, Razi Khan, Rebecca L Pollex and Robert A Hegele",
        licence: "CC BY 2.0",
        licenceUrl: "https://creativecommons.org/licenses/by/2.0",
        source: "https://commons.wikimedia.org/wiki/File%3AAcanthocytosis.jpg",
        verified: false
    },
    schistocytes: {
        file: 'images/rbc/schistocytes.jpg',
        caption: "Haemolytic uraemic syndrome. May-Grünwald Giemsa.",
        author: "Paulo Henrique Orlandi Mourao",
        licence: "CC BY-SA 3.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        source: "https://commons.wikimedia.org/wiki/File%3ASchizocyte_smear_2009-12-22.JPG",
        verified: false
    },
    spherocytes: {
        file: 'images/rbc/spherocytes.jpg',
        caption: "Haemolysis.",
        author: "Prof. Osaro Erhabor",
        licence: "CC0",
        licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        source: "https://commons.wikimedia.org/wiki/File%3ASpherocytes.jpg",
        verified: false
    },
    elliptocytes: {
        file: 'images/rbc/elliptocytes.jpg',
        caption: "Hereditary elliptocytosis.",
        author: "Dr Erhabor Osaro",
        licence: "CC BY-SA 3.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        source: "https://commons.wikimedia.org/wiki/File%3AHereditary_Elliptocytosis_6_0.jpg",
        verified: false
    },
    sickleCells: {
        file: 'images/rbc/sickle-cells.jpg',
        caption: "Sickle cell anaemia — haemoglobin S polymerisation.",
        author: "Paulo Henrique Orlandi Mourao",
        licence: "CC BY-SA 4.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        source: "https://commons.wikimedia.org/wiki/File%3ASickle-cell_smear_2015-09-10.jpg",
        verified: false
    },
    teardropCells: {
        file: 'images/rbc/teardrop-cells.jpg',
        caption: "Dacrocytes.",
        author: "Paulo Henrique Orlandi Mourao",
        licence: "CC BY-SA 3.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        source: "https://commons.wikimedia.org/wiki/File%3ATeardrop_Cells_smear_2009-09-22.JPG",
        verified: false
    },
    targetCells: {
        file: 'images/rbc/target-cells.jpg',
        caption: "Target cells (codocytes).",
        author: "Prof. Osaro Erhabor",
        licence: "CC0",
        licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        source: "https://commons.wikimedia.org/wiki/File%3ATarget_cells.jpg",
        verified: false
    },
    howellJolly: {
        file: 'images/rbc/howell-jolly.jpg',
        caption: "Howell-Jolly bodies.",
        author: "Paulo Henrique Orlandi Mourao",
        licence: "CC BY-SA 3.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        source: "https://commons.wikimedia.org/wiki/File%3AHowell-Jolly_smear_2010-11-17.JPG",
        verified: false
    },
    basophilicStippling: {
        file: 'images/rbc/basophilic-stippling.jpg',
        caption: "Basophilic stippling.",
        author: "Prof. Erhabor Osaro",
        licence: "CC BY-SA 4.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        source: "https://commons.wikimedia.org/wiki/File%3ABasophilic_stippling_2.jpg",
        verified: false
    },
    biteCells: {
        file: 'images/rbc/bite-cells.jpg',
        caption: "G6PD deficiency.",
        author: "RJDS MEDIX (RONAK DARJI)",
        licence: "CC BY-SA 4.0",
        licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        source: "https://commons.wikimedia.org/wiki/File%3ABITE_CELLS.jpg",
        verified: false
    }
};

/* The two synonym pairs share a photograph, exactly as they share a drawing. */
rbcPhotos.teardropForms = rbcPhotos.teardropCells;
