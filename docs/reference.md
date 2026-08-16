# The reference section

> The book icon in the page bar. Diagnostic criteria for the entities the Diagnosis tab
> ranks, plus the bench facts a marrow is measured with. Two files: `MarrowRefData.js` is
> the content, `MarrowRef.js` is the panel.

## A topic is the criteria and almost nothing else

**This is the standing instruction, and it was arrived at by writing the opposite first.**

The initial pass gave every entity a one-line subtitle under the title, a provenance line
(`docs/who/mds-lb.md — essential and desirable criteria verbatim`), a histopathology
paragraph, an epidemiology paragraph and a practice note. All true, all sourced, and all
between the reader and the box they opened the page for. A reference you have to scroll
past prose to use is a reference you stop opening.

What a topic may contain:

- the criteria box,
- an **ICC 2022** divergence block where the two classifications differ,
- a table where the classification itself is a table (MDS-IB's three subtypes, CMML's
  subtyping cut-offs, the MF grades),
- for the bench topics only, the short prose that *is* the answer.

Detail that qualifies a criterion goes in **that criterion's own `notes`**, inside the box,
where it is read with the criterion rather than after it. PV's footnote b, PMF's
three-way major criterion 3, MDS-IB's and/or trap all live there.

Two things were removed outright and should not come back:

- **`source`.** Provenance is now a `//` comment above each topic in `MarrowRefData.js`.
  The maintainer needs it and is already looking at the file; the reader never did.
- **`blurb`.** Twenty-six one-line descriptions that each said "these are the criteria for
  X" in different words. The title says what the page is.

### `refCite` is not the `source` line coming back

`source` pointed at a file in this repo, on pages whose content is a criteria box the
classification defines by fiat — there is nothing to look up, the criteria *are* the source.

A **`refCite`** is a literature reference for a *measurement*: an age-specific cellularity
range, a megakaryocyte count, the ring-sideroblast definition. Those are numbers somebody
produced, they vary between series, and a reader deciding whether to grade a marrow against
one has to be able to see whose number it is. **Every quantitative claim in this file that
is not part of a criteria box carries one**, rendered small and last under the table it
belongs to.

**A citation is standard AMA and nothing more** — authors, title, journal, year;vol(issue):
pages, DOI where there is one; full page ranges; no PMID, no appended commentary about the
study or what it found (the user's call, 2026-08). Anything the reader needs from the paper
belongs in the body; anything only the maintainer needs belongs in the `//` comment. The
same instruction cut the over-explanations: no table caption or note that restates the
obvious ("lower bound inclusive"), no worked arithmetic for trivia, no maintenance
instructions rendered to the reader.

The box header is also dropped where it would repeat the page title — a page headed
*Polycythaemia vera* does not need a box headed *Polycythaemia vera*. It is kept where it
distinguishes (`CMML — WHO-HAEM5` above an ICC block, the two post-MPN boxes) or where the
box is not the entity (`The count`, `The threshold`).


## What it is for

Two audiences, the same person at different moments.

Someone filling in a form who needs one fact — what MF-2 means, what cellularity is
expected at 70, what the dysplasia threshold is — and should not lose the form to find it.

Someone reading the Diagnosis tab's ranking and disputing it. A card says a criterion is
unmet; they need the criteria box that clause was written from, next to the card rather
than instead of it.


## The left panel stays put

`#inputPanel` is deliberately absent from `Template.js`'s `headerObject`, so it is not
owned by the `pageTab` group and never hides. Opening the reference swaps the **report**
panel and leaves the form exactly where it was.

That is what makes a quick link worth having, and it means the reference section is **not**
a modal, a drawer or an overlay and should not become one. Each of those hides the thing
the reader is comparing against.


## Two screens, one panel

The index and one topic. `refCurrent` is the topic id on screen or `null` for the index;
`refQuery` is the filter text, kept across both.

A nested sidebar was the obvious alternative and is wrong: this panel is already one half
of a two-panel layout, so a topic list down its left edge would spend a third of the
remaining width on navigation only needed between reads.

### The index is a table of contents, not a gallery

Section label, then single-line rows in as many columns as fit. It was a grid of bordered
cards with a description each — four screens to reach a page whose title you already know.
All twenty-six rows now fit one screen with no scrolling.

`align-items: start` on `.refItems` is load-bearing. A grid item defaults to `stretch`, and
a `<button>` centres its content vertically, so a one-line title in a row whose other
column wrapped floated to the middle of a double-height row. Three boundary entities had
titles long enough to wrap in a half-width panel, so this was every viewing of the MDS/MPN
section. They were also shortened to the `Name (ABBR)` form the MDS rows already use, which
is what stopped the wrap in the first place.

### The filter input is built once and never rebuilt

The only subtle thing in `MarrowRef.js`. The bar's left side changes with the screen —
`Reference` on the index, an **All topics** button inside a topic — so the obvious shape is
to redraw the whole bar on render. Doing that replaces the input the keystroke came from:
focus goes, and refocusing the replacement puts the caret at 0. Typing `jak2` while a topic
was open produced `ak2j`.

Rebuilding only when the screen changed does **not** fix it, and that is the trap: leaving a
topic *is* a screen change, triggered by the first keystroke. So the bar is split into
`#refBarLead` (redrawn freely) and the filter (a permanent sibling nothing touches).

### The filter searches keywords, not bodies

`refMatches()` reads the title and the `keywords` list. Searching bodies would be one line
shorter and much worse: every criteria box names its neighbouring entities in its exclusion
clause, so `polycythaemia` would match essential thrombocythaemia, both PMF stages and CML,
and the filter would stop narrowing anything.

`keywords` is where a topic declares what it should be findable **by**, including the
spellings its title does not use — `polycythemia` with an e, `MDS-RS`, `RARS-T`, `teardrop`
for dacrocyte.


## `unverified` is the one thing here that is not content

**Topics not transcribed from a pasted chapter carry `unverified`: a chip on the index row,
and one amber line above the criteria.**

CLAUDE.md records that every WHO chapter pasted into `docs/who/` so far has corrected the
rule written from memory before it — four for four on the MPN chapters, and three of those
four errors were in the **shape** of the accepted paths rather than in a threshold. A topic
written from memory is a different kind of object from a transcribed one, and the reader has
to be able to tell.

It is one line, not a headed paragraph. On a page whose whole point is to be the criteria
and nothing else, the warning has to earn its space as hard as everything that was cut.

Currently flagged: **only `rbc-morphology`** — the photomicrograph confirmations, which wait
on a pathologist's eyes rather than a paste (see the atlas section). Every criteria topic is
now source-backed on the WHO side, the ICC side, or both.

**Do not clear a flag without pasting the source and reading the topic against it.**
Clearing it is the same act as correcting a rule and carries the same standard.

### The ICC paper is pasted, and the fetch era is over

`docs/who/icc-2022-arber-blood.md` is the **full ICC paper, pasted by the author** — it
replaced the web fetch (`…-fetched.md`, deleted) whose paraphrased prose had made the MPN
section unusable. Everything the fetch discipline held open is now settled, and every answer
vindicated the caution:

- **ICC's pre-PMF box keeps the "absence of reactive bone marrow reticulin fibrosis" limb**
  (its major criterion 2; ICC numbers the exclusions third). Triple-negative PMF stands in
  both classifications, and both PMF topics now say so in an ICC block.
- **ICC's splenomegaly minor criterion does require a palpable spleen**, where WHO accepts
  detection clinically and/or by imaging — the second question the fetch could not answer,
  and a real divergence now printed in both PMF topics.
- The −17 discrepancy is **closed without a code change**: Table 25 prints "−17/add(17p) or
  del(17p)", and the abnormality vocabulary's `del17p` key ("del(17p) / loss of 17p") already
  carries monosomy 17 as loss of 17p. `MR_CYTO_ICC` was correct as written.
- Every MPN topic (CML, PV, ET, pre-PMF, PMF) now carries an ICC block read against the
  paste, and **CNL and MPN-U gained topics** built from Tables 6 and 9 — ICC-side only, their
  WHO chapters being still unpasted, which their flags state.

### Ten flags cleared, and what each was hiding

- **`mds-mpn-sf3b1t`** — the entity's chapter was pasted (`docs/who/mdsmpn-sf3b1t.md`, with
  Box 2.21) and **corrected the rule's report-facing divergence string**, which had the
  ring-sideroblast direction backwards and a WHO VAF floor from nowhere: it claimed WHO
  "admits cases with &lt; 15% ring sideroblasts, requiring a VAF of ≥ 5%", where the chapter's
  essential criteria *require* ≥ 15% ring sideroblasts and state no floor — it is ICC that
  admits ring-sideroblast-free cases on the mutation (at VAF &gt; 10%). The rule also gained
  Box 2.21's answerable exclusions (double-hit *TP53*; t(3;3)/inv(3) MECOM) and the box's
  *MPL*/*CALR* alternative as a support. The paste surfaced something rarer too: **the
  chapter disagrees with itself** — its prose summary makes the *JAK2* co-mutation desirable
  where its own box lists it among the molecular criteria, and the two state the platelet
  boundary differently (≥ 450 vs &gt; 450). Both statements are transcribed on the topic; the
  clonal-evolution divergence (WHO may reclassify, ICC calls it progression) is printed in
  both the topic and the rule's divergence string.

- **`mpn-u`** — WHO's MPN-NOS chapter was pasted (`docs/who/mpn-nos.md`, with Box 2.14) and
  **corrected the `mpnU` rule**: both classifications' clonality criterion reads "driver
  mutations … **or another clonal marker**", and the rule had gated on `dxMpn.driver` — the
  bare JAK2/CALR/MPL limb — so a marrow whose clonality was a *TET2* mutation or a clonal
  karyotype was `excluded` from the residual category outright. The same first-limb-only
  shape error PMF's criterion had, fixed the same way (`dxMpnUClonality`). The box also
  brought WHO's two explicit negative requirements (adequate workup; no recent cytotoxic or
  growth factor therapy) and the accelerated/blast-phase definitions.

- **`cnl`** — WHO's CNL chapter was pasted (`docs/who/mpn-cnl.md`, with Box 2.03) two days
  after the topic was created from ICC Table 6. The second clean clearing: the ICC-side
  content was accurate, the dx rule's WHO-side claims (≥ 25 of every case, ≥ 80% seg + band,
  the CMML-monocytosis and dysgranulopoiesis exclusions) were confirmed in the box's own
  words, and the WHO box now leads the topic with ICC as the divergence block, like every
  other MPN entity. New from the box: the marrow myeloblasts &lt; 5% clause and the named
  <i>PCM1</i>::<i>JAK2</i> exclusion, which ICC's version does not carry.

The three bench flags came off once their sources were found, and every one had been
covering a real error. This is the flag's whole justification, so it is worth recording
what it caught.

- **`cmml`** — WHO Box 2.19 was pasted (`docs/who/cmml-box-2.19.md`) and corrected the
  reconstruction in two places, both in the **shape** of a criterion: essential criterion 3
  is "not meeting diagnostic criteria of CML **or other MPNs**" — the reconstruction had
  appended "or for AML", an exclusion the box does not carry (the < 20% criterion and the
  chapter text on *NPM1* do that work, and the *rule* had always encoded them separately and
  correctly; the error was the transcription's alone) — and criterion 4 is "not meeting
  diagnostic criteria of M/LN-eo with tyrosine kinase gene fusions (e.g. …)", an open
  criteria reference, not the closed rearrangement list the reconstruction printed. The box's
  six footnotes came with it, including the ≥ 10%-of-lineage bar on desirable dysplasia and
  the autoimmune/inflammatory caveat on monocyte partitioning.

- **`aml-overview`** — cleared by two pastes at once: the full ICC paper (its half was a web
  fetch before) and WHO's AML chapter **introduction** (`docs/who/aml-introduction.md`). The
  first flag whose content survived its source intact — the AML encoding came from Khoury's
  own tables rather than memory, and the intro confirmed the shape: cut-offs gone except
  *BCR::ABL1* and *CEBPA*, the eight MR genes verbatim, *RUNX1* dropped, morphology-alone
  removed from AML-MR. The WHO side gained what only the chapter could give: the two-family
  restructure, the KMT2A/MECOM/NUP98 any-count rule, smbZIP-*CEBPA*, and acute erythroid
  leukaemia superseding AML-MR. The per-entity WHO criteria boxes are still unpasted.

- **`fibrosis`** — Table 2.03 was pasted. The four reticulin descriptions were close, but
  the from-memory version said the grade is the marrow's "overall" grade and "not its worst
  field", where footnote a says a heterogeneous marrow takes **the highest grade present in
  ≥ 30% of the marrow area**. That is the opposite emphasis and would under-grade a marrow
  with a third of its area at MF-2. The collagen and osteosclerosis columns were absent
  entirely. **Five for five: every WHO table pasted so far has corrected the text written
  from memory before it, and this one — like three of the four MPN chapters — corrected a
  rule about how a criterion is applied rather than a number.**
- **`megakaryocytes`** — the count was wrong by roughly fivefold. "Roughly 7–15 per 400×
  field, of the order of 10–20 per mm²" against a primary series reporting a mean of **1.5
  per 450× field** (range 0.4–2.7). Now cited, and reframed around the fact the
  classification actually relies on: number is judged semiquantitatively and no WHO
  criterion asks for a count.
- **`ring-sideroblasts`** — the definition was right, and now carries the IWGM-MDS
  consensus reference (Mufti 2008) that WHO adopted.
- **`ccus`** — the CCUS chapter was pasted, and it corrected two assertions. The boundary
  said "a somatic mutation demonstrating clonality"; the essential criteria accept **either**
  a Table 2.02 mutation at VAF ≥ 2% **or a clonal chromosomal abnormality**, so a cytopenic
  marrow whose only clonal evidence is a karyotype is CCUS and this page said it was not.
  And an ICC divergence block claimed ICC "puts a duration on the cytopenia, which WHO does
  not" — WHO says *"usually of 4 months or longer in duration"* in its clinical features. The
  real difference is only how binding it is, which is a far smaller claim than the one
  printed.
- **`icus`** — the same chapter defines it, in one sentence, which no previously pasted
  chapter did: *"Some cytopenias will be sustained and unexplained without meeting diagnostic
  criteria for CCUS; such cases should be termed 'idiopathic cytopenia of unknown
  significance'."* Note **unknown**, where the literature and this app say *undetermined*.

**Six for six.** Every source pasted has corrected the text written from memory before it.

**A report-facing defect fell out of the CCUS paste.** `dxChRiskText()` in `MarrowDxCh.js`
is called by both the CHIP and the CCUS comment and printed one gene list — the CHIP
chapter's. The two chapters publish two lists: CCUS adds *PPM1D*, *JAK2* and *RUNX1* and
drops *ASXL1*. So a CCUS comment named the wrong genes for its own entity. The function now
takes the entity as an argument, `MarrowFindings.js` exposes a second readout
(`ccusHighRisk`), and the CCUS comment additionally carries the chapter's own low-risk
statement for an isolated *DNMT3A* clone. Verified by rendering both comments against a
stub: a *JAK2* clone is flagged high-risk on the CCUS comment and not on the CHIP one, which
is what the two chapters say.

One correction landed outside this section as a result: `coreCellBand()` in `MarrowCore.js`
carried a comment attributing the age bands to the wrong first author, and claiming the band
midpoints *are* the reported means. That holds for the three adult bands and not for the
youngest, whose reported mean is 72.8% against a midpoint of 65 — so the hybrid method's
expected cellularity runs a little low in a young patient. The ranges themselves are the
paper's and are unchanged; only the comment was wrong.


## Adding a topic

```js
// docs/who/<file>.md — what was transcribed. (Maintainer's note, not rendered.)
referenceTopics.push({
    id: 'kebab-case',            // stable: quick links and `related` name it
    section: 'mds',              // must exist in referenceSections
    title: 'The entity name, or Name (ABBR)',
    keywords: ['what', 'it', 'is', 'findable', 'by'],
    unverified: 'One sentence: what has NOT been checked.',   // omit if transcribed
    related: ['other-topic-id'],
    body: function () { return refBox({ … }); }
});
```

`body()` is called at render time and returns an HTML string. Write it with the markup
vocabulary at the top of `MarrowRefData.js` — `refBox`, `refDiverge`, `refTable`, `refCite`,
`refP`, `refH`, `refUL`, `refOL`, `refJump` — for the same reason the report has
`REPORT_PARAGRAPH`: a criteria box built two ways is one that will eventually look two ways.

**The reader is a pathologist.** Never define a term of the trade — "hyper- and
hypocellular mean above and below the range expected for age" was written and cut on the
author's feedback. A definition belongs only when it is criterial: a stipulated threshold
someone looks up (the ring-sideroblast five-granule rule, "persistent means 4 months or
longer") is content; a dictionary line is not.

**Typography rules (author's, swept through the whole file):** no inline `<b>` in topic
bodies — the section's only bold is structural (box titles, group labels, `refH`), which is
also how WHO's own boxes set their thresholds; no em- or en-dashes — a hyphen or no dash at
all (cytogenetic minus signs are not dashes and stay); genes keep `<i>`, which is notation
rather than emphasis. On the format side there is **one visual language**: `refDiverge` is a
`refBox` with an "ICC 2022" title bar (it was a blue bubble, and that was a third block style
for no third kind of thing), criteria-group labels and table headers share one label style,
and `refCite` is the same small print as a table caption.

**A quantitative claim outside a criteria box needs a `refCite` or an `unverified` flag.**
Those are the only two honest states for a number in this file, and shipping one with
neither is what put a fivefold error on the megakaryocyte page.

### The red cell atlas, and why the figures are drawings

`rbc-morphology` covers all seventeen entries of the Blood tab's anisopoikilocytosis
dropdown plus a normal disc to compare them against. The figures are **inline SVG
schematics, not photomicrographs**, and that is a choice rather than a limitation worked
around: this app is a folder of static files that must work from `file://` with no network,
so a photographic atlas means either megabytes of embedded base64 or an external host, and
every usable image is somebody's copyright. A drawing also does something a photograph
cannot — show one cell with the defining feature at full expression and nothing else in the
field. The topic says so in its `unverified` line; a reader must never think these are real
cells.

Three rules for the figures, all learned the hard way in one sitting:

- **Geometry is computed, not typed.** `rbcSpikes()` takes `[angle, radius]` pairs; even
  spacing gives an echinocyte, an irregular fixed table gives an acanthocyte. Eighteen
  hand-written path strings would be eighteen chances to fat-finger a shape nobody notices
  is wrong.
- **Nothing is random.** An acanthocyte's spicules are irregular and the temptation is
  `Math.random()`. A figure that redraws differently every render is unsettling and
  impossible to check. The irregularity is a fixed table.
- **Arc flags get computed or avoided.** The first bite-cell and blister-cell figures used
  eyeballed endpoints with guessed `large-arc`/`sweep` flags and drew wedges nothing like a
  cell — four flag combinations pick four different arcs and three are wrong. The bite cell
  now uses the real circle-intersection points (the arithmetic is in the comment); the
  blister cell uses a `clipPath`, which is correct by construction.

Two other things worth knowing: `stroke-linejoin: round` with a thick stroke is what makes a
spicule **blunt**, so the same point list is a club or a thorn depending on one property —
that is the entire echinocyte/acanthocyte distinction. And `rbcScaleRing()` is drawn **last,
on top**: behind the cell it is invisible wherever the cell is bigger, which is the one case
it exists for.

### Photomicrographs alongside the schematics

Eleven cards also carry a photograph, in `images/rbc/`, manifested in
`MarrowRefImages.js`. **Drawing above, photograph below — never one instead of the other.**
They answer different questions: the schematic shows the defining feature at full expression
with nothing else in the field; the photograph shows it among overlapping cells at real stain
variation.

Four rules, and each of them cost something to learn:

- **Vendored, never hotlinked.** The page must work from `file://` offline, and must make no
  outbound request from a screen that has patient data on it. Verified: every `src` starts
  `images/`.
- **The manifest is generated by the download script**, from each file's own Commons metadata
  fetched in the same run. For CC BY and CC BY-SA the credit *is* the licence condition, so a
  credit line typed separately from the download is a licence breach waiting for someone to
  rename a file.
- **`verified: false` on everything from Commons**, rendering an amber *unconfirmed* badge on
  the image itself. Commons is contributor-curated, not pathologist-reviewed — its
  schistocyte category holds dog, rabbit and rat smears, and a Howell-Jolly search returned a
  quokka. A filename is a claim, not a diagnosis. Clearing the flag is the pathologist's act,
  not the script's.
- **Check the colour of anything added.** Two of twelve downloads had a heavy green cast —
  mean RGB (117,144,85) and (117,150,92), green dominant on a Wright-Giemsa smear that should
  read red ≥ blue > green. They looked like pond water beside the pink schematic and were
  thrown away; those cards are schematic-only. The check is a canvas, an average and a
  comparison, and at a 2-in-12 failure rate it is worth doing every time.

To add your own: drop it in `images/rbc/`, add an entry with `source: 'own'` and
`verified: true`, and delete the Commons file it replaces.

### Keep the first table column short

`.refTable`'s first column is styled as the key you look a row up by. It used to carry
`white-space: nowrap` so a short key would not wrap while its long description set the row
height — which worked until a first cell held a phrase. The ICC AML table's first cells
listed six fusion genes each, and `nowrap` pushed the second column clean off the right edge
behind the scroll.

The rule is gone: **a short key has no break opportunity to wrap at**, so `MF-0`, `Under 20`
and `≥ 10%` stay on one line without being told to. Keep first cells short, and if a table
wants a long key, it is usually the wrong way round — the ICC AML table reads better with
the blast range first, which is the question a reader actually arrives with.

### When a source table is too wide

Table 2.03 is four columns of prose, which in a half-width panel sets each cell four words
wide. It is split into a 2-column reticulin table (what a grade is actually assigned on),
a box carrying the three footnotes, and a 3-column collagen/osteosclerosis table under its
own heading. **No cell is abridged** — splitting for width is fine, dropping a column is
not.

### `refBox` and why `rule` is optional

WHO writes some entities as **major/minor** criteria and others as **essential/desirable**,
and the difference is not cosmetic. A major/minor box has a combination rule ("all three
major, or the first two plus the minor"); an essential/desirable box does not. `rule` is
printed only where the source states one — **inventing a combination rule for an
essential/desirable box is inventing a criterion.**


## Quick links

One contract for all three places a link can live: **`data-ref="<topicId>"` on an element**,
handled by a single delegated listener on `document`. A tab adding a link needs no wiring.

| helper | where | shape |
|---|---|---|
| `refLinkHTML(topicId)` | input tabs | icon-only book, quiet grey, at the end of a row's controls |
| `refRuleLinkHTML(rule)` | Diagnosis cards | worded **Criteria** pill |
| `refJump(topicId, text)` | inside a topic body | an underlined link in running text |

Everything goes through `openReference(id)`, which switches the page tab by **clicking**
`#helpTab` rather than by setting styles — the shell's switcher already knows how to hide a
group's panels and move the `clicked` class.

### Where they are, and why not on the row label

| tab | row | topic |
|---|---|---|
| Blood | Anisopoikilocytosis (the tier that reveals the poikilocyte dropdowns) | `rbc-morphology` |
| Aspirate | Erythroids, Myeloids | `dysplasia` |
| Aspirate | Megakaryocytes | `megakaryocytes` |
| Aspirate | Blasts | `blasts` |
| Core | Cellularity | `cellularity` |
| Core | Megakaryocytes | `megakaryocytes` |
| Stains | Reticulin (when named) | `fibrosis` |
| Stains | Iron (when named) | `ring-sideroblasts` |
| Diagnosis | every candidate card, both views | the entity's own topic |

**Never on the `.findingLabel`.** That column is a fixed 100px, and 108px on the Core tab
because `Myeloid/Erythroid` already needs it — an icon there would push the longest label
onto a second line, and a book beside "Megakaryocytes" reads as though it were labelling the
row rather than offering something.

The link goes **inside** `.findingChips`, not beside it: `.findingGrid` has exactly two
columns, so a third child would start a new row and land the icon in the label column of the
row below.

On the Stains tab it goes **outside** `.stainFields`, at the row's end — inside, it would
compete with the result control for width, and on iron (a two-question block) it would land
under a sub-row rather than beside the stain. The Stains links are declared on the **stain**
(`ref:` in `stainVocabulary`), not on the list: iron is offered on three specimens and
reticulin on two, so a per-list link would be the same link written five times.

### The family fallback

`referenceForRule` maps a Diagnosis rule id to a topic. `referenceForFamily` is consulted
when a rule id has no entry, and exists for one real case: the eight AML rules for recurrent
genetic abnormalities are **generated** from a spec table by `dxAmlRule()`, so their ids live
in a data table rather than in rule source. Without it, eight AML cards carried no criteria
link while five sibling AML cards did — an inconsistency that reads as a bug rather than as
"we have no chapter for this one".

**Only `aml` is mapped.** Every other family's entities have their own topic, and a
family-wide fallback there would send a reader looking for polycythaemia vera's criteria to
a page about the MPN family — worse than no link, because it looks like it answered.

Three rules deliberately have no link: chronic neutrophilic leukemia and MPN-NOS (chapters
unpasted), and the no-neoplasm boundary (no criteria box exists).


## Checking it

`docs/who/` is the source of truth and this section is a transcription of it; both can
drift. The audit that catches structural drift runs in Node with no browser — load
`MarrowRefData.js` into a `vm` context, render every `body()`, and check that every `related`
id, every inline `data-ref`, every `referenceForRule` topic **and** every `referenceForRule`
*rule id* resolves. The last matters most: a mapping naming a rule that no longer exists is a
link that silently never renders. Same technique the Dx comments are verified with.


## Not done yet

- **No AML criteria.** Waiting on a pasted chapter; see `aml-overview`.
- **CNL and MPN-NOS** have rules but no topic, for the same reason.
- **No quick link on the Blood tab's CBC box.** It is the obvious anchor for `cytopenias`
  and is not wired. (The anisopoikilocytosis tier does carry one, to `rbc-morphology`.)
- **No atlas for the other descriptor lists.** The same machinery would serve the
  neutrophil, lymphocyte, monocyte and platelet dropdowns. If a second atlas is added, the
  figure library is the point to split into its own file.
