# Panel layout and report-side tables

> Split out of the root `CLAUDE.md` so it is read on demand rather than loaded every
> session. The scroll chain, the two header bars, the shared .dataTable.

## Report-side tables
`.dataTable` (Template.css) is the base for the **CBC block**: fixed layout, dark header row
whose first cell is the collapse toggle, name/value/unit columns (`.dataName` / `.dataValue` /
`.dataUnit`, `.dataToggle` / `.dataChevron` / `.dataCaption`). Its collapse handler is delegated
from `#rightPanelFinal` and keys on its wrapper `.cbcGroup`; CBC-specific styling (the two-up
`.cbcGrid`, `.cbcDate`, and the H/L abnormal flags) stays under `.cbc*`.

**The differential tables do NOT use it.** They are the old app's tables reproduced byte for
byte (`../Marrow/BoneMarrow.html:773-846`): a classless 440px fixed-layout table over
220/75/145 columns, 10pt, black hairline borders, caption cell carrying the target
("Peripheral Blood (200 cells)"), "Result", "Reference Range", M:E ratio last on the aspirate,
a trailing `<br>` — **inline-styled end to end** (`COUNTER_TABLE_*` in MarrowCounter.js) so a
copy lands in Epic/Word exactly as rendered, which is the requirement that decided the format.
No Total row and no collapse control, matching the original; a `.dataTable` version with both
existed and was replaced on that requirement.


## Panel layout
`.panelContainer` is a flex row of `.panel` cards. The template view is two panels side
by side: `#inputPanel` (data entry, tabbed) and `#templatePanel` (report output, with the
`.copyHeader` button bar). `#helpPanel`, `#infoPanel`, `#savePanel`, and `#settingPanel`
are siblings, hidden until their page tab is clicked.

**The page never scrolls; the panels do.** The app is exactly one viewport tall, and the only
scrollbars are `.panelBody`'s. That is a *chain*, and every link is load-bearing:

```
body (100vh, overflow:hidden, flex column)
  → .panelContainer (flex:1)         takes what the header leaves
    → .panel (flex column)           stretches to the row's full height
      → #inputBodies / #settingBodies   the shell's mount points must pass the height through
        → .panelBody (flex:1, overflow-y:auto)   the one part that grows and scrolls
```

**`min-height: 0` at every link is the whole trick.** A flex item defaults to `min-height: auto`
and refuses to shrink below its content, so one missing `min-height: 0` lets a tall panel push the
chain open from the inside and the *page* scrolls instead of the panel. Panels also stretch to a
common height (no `align-items: flex-start`), which is what gives each a scroll region of a known
size rather than one that depends on its own content.

This replaced `.panelBody { max-height: calc(100vh - 120px) }` — a guess at the chrome above it,
which the panel's own header sat *outside* of, so the total overshot and the page scrolled by a few
pixels. **Don't reintroduce a viewport-derived height**; let the chain do it.

Hide with `display: none`, show with `display: ''` — never `'block'`. The switcher's job is
visibility, not layout: an inline `block` beats `.panel`'s `display: flex` and collapses the column
that gives its body a height to scroll inside.


- **`.panelHeader` and `.copyHeader` are ONE bar in two variants**, and their shared metrics —
  background, padding, radius, and the items' padding, font-size, colour and reserved top border —
  are declared once across both selectors. They sit side by side at the same y, so a difference in
  height or type reads as a mistake rather than a distinction; declared separately they had already
  drifted to 16px against 13px, which wrapped "Copy Microscopic" onto a second line and left the copy
  bar 14px taller. **The copy buttons keep the tab's transparent 3px top border** even though they
  have no accent stripe: sharing the whole box model is what makes the bars provably equal, where
  matching padding by arithmetic is a sum somebody has to redo. Copy buttons no longer carry
  `underline unclicked`; a button has no selected state and those classes only stood between it and
  its own styling.
  - **`.copyHeader` has no padding at all**, so the end buttons reach the bar's left and right edges
    and their hover takes its **rounded corners** rather than stopping short as a rectangle. That is
    what `overflow: hidden` on the bar is for — it clips the wash to the radius. The tab bar keeps
    its `--headerBarPad` inset because there the point is the opposite: tabs are meant to look laid
    *on* the bar, not to be it.
  - **Both bars are `flex: none`.** They are flex items of a `.panel` column, so a short viewport
    squeezed them — and by *different* amounts, since a copy button's height is padding it can be
    squeezed out of while a tab's is its content. `.panelBody` is what absorbs it, and it already
    scrolls. (Measured: below a ~140px viewport the copy bar dropped to 34px while the tab bar held
    40px. Also a warning about probes — a short `--window-size` will reproduce this and look like a
    CSS regression when it is the window.)
  - **The tabs sit inset below `--headerBarPad`; the copy buttons ARE the bar, top to bottom.** That
    strip of bar moves out of `.copyHeader`'s padding and into the button's `padding-top` as
    `calc(var(--headerItemPadY) + var(--headerBarPad))` — written as that sum, not as `14px`, which
    is what keeps the two bars the same height. Because the extra is all *above* the text, it also
    lands both bars' text on the same line (measured: both at y=73). It is what lets a divider reach
    the top edge and a hover fill the whole cell, so don't "tidy" it back into the container.
  - **No radius on a copy-button hover.** A rounded top on a highlighted cell is the tab shape, and
    it read as "this one is selected" on a bar where nothing ever is. The wash fills the cell corner
    to corner instead; `.copyHeader { overflow: hidden }` is what stops a full-height hover on the
    end buttons squaring off the bar's rounded corners.
  - **Every copy button carries the divider border and the first one's is transparent** — `flex: 1 1 0`
    shares out the space between borders, so a border only some items have is a width only some items
    have (measured 144.8 against 145.8 before this).
- **Anything you click but never read from opts out of text selection.** `.headerTab`, `.copyButton`
  and `.navItem` carry `user-select: none`, as `.chip`, `.toggleSwitch` and `.toggleText` already
  did — they are `<div>`s and `<a>`s made of text, so a double-click selects the label instead of
  doing anything and leaves it highlighted. Tabs are where it shows most: clicking twice on the tab
  you are already on is a natural thing to do. Keyed on `.headerTab` because that is the class every
  tab already carries as the switcher's contract, so a new tab is covered without knowing the rule
  exists. **Real prose stays selectable** — the report panel above all, since copying out of it is
  the point — which is why the rule names the three chrome classes and never something broad.
