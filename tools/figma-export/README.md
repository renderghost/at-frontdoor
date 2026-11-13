# Figma export

Rebuilds the Front Door Figma file from the running prototype: every scenario at desktop (with the notes panel) and phone widths, as auto-layout frames built from components, with colours bound to variables and text on the `Prototype/` text styles.

- File: `v3i4nsa9LG0A77uMNgP59P` (Front Door)
- Pages it writes: Components `16:55`, and the scenario pages `16:56` to `16:60`
- Pages it leaves alone: Cover `0:1` and the divider pages. Instances on the Cover are repointed to the new components in the last step.

The Figma side runs through Claude's Figma connector (the `use_figma` and `upload_assets` tools). The scripts in `figma/` are the exact code to run, in order.

## 1. Capture and prepare (local)

From the repo root, after `tools/setup.sh`:

```sh
T=tools/figma-export; O=tools/out/figma
node $T/capture.js desktop $O/specs
node $T/capture.js phone $O/specs
node $T/prepare.js $O/specs $O/prep
node $T/plan.js $O/prep
```

- `capture.js` walks all five scenarios in Chromium and saves each state as a spec, using `extract.js` in the page. It also saves a PNG of each state, to check the Figma screens against. `ONLY=returning,forgot` captures just those scenarios, while you work on a walk. A toast shows in the state straight after the action that raised it, and no later.
- `prepare.js` works out component variants, text styles, colour tokens and the ruled-paper tiles. Check its last line: any "unmapped colours" are drawn as fixed colours, not variables.
- `plan.js` lays the screens out on their pages and splits them into build batches.
- If `styles.css` gains or changes a Potluck (`--pl-`) or frame (`--bp-`) colour, run `node $T/tokens.js` and paste what it prints into `TOKENS` in `figma/00-prepare-file.js`.

## 2. Pack the carriers (local)

Figma's upload tool only takes images, so the builder and the specs travel as SVG files whose text holds the JSON.

```sh
args="builder=$T/builder.js foundations=$O/prep/foundations.json plan=$O/prep/plan.json"
for f in $O/prep/screens/*.json; do args="$args $(basename $f .json)=$f"; done
node $T/carrier.js $O/carriers $args > $O/carriers.log
ls $O/carriers | wc -l
```

## 3. Rebuild in Figma

1. Note the time in the file's version history. Plugins can't save a named version, so the automatic history is the way back.
2. Run `figma/00-prepare-file.js`. It returns the new `_import` and holding page IDs.
3. Ask `upload_assets` for upload URLs on the `_import` page (60 at a time), then post the carriers:
   `tools/figma-export/upload.sh $O/carriers name1 url1 name2 url2 …`
4. Run `figma/01-text-styles-and-batches.js`, first with `FIRST = true` and `NS = [0]`, then with `FIRST = false` and the remaining batch numbers, one scenario page per call.
5. Run `02-finish-screens.js`, `03-variant-sets.js`, `04-components-page.js`, `05-scenario-headers.js` and `06-hover-variants.js`. Before 06, list the button variants' fills (its comment says how) and check its `fixes` still name the hover copies.
   Run each `use_figma` call on its own, never two at once: two batches can both create the same new component.
6. Run `07-repoint-and-clean-up.js`. Check `unmatched` is empty.
7. Spot-check one desktop and one phone screen per scenario against the browser.

## How it handles what Figma can't do directly

- **Colours at part opacity.** A paint bound to a variable can't safely carry its own opacity: Figma drops it in instances nested inside instances (an avatar's 12% ring drawn solid black). So the builder gives each such colour a variable of its own, made from its base colour, such as `alpha/ink 12%` or `alpha/potluck/brown 34%`.
- **Sizes of nested components.** Figma ignores resizing an instance inside an instance, so a nested component's height is part of its parent's variant (a phone recipe card has its own variant for its taller food tile).
- **Wrapped rows.** A row that wraps keeps the browser's gap between lines, and a line pushed in by a margin keeps its indent.
- **Turned icons**, such as an open disclosure's chevron, keep their quarter turn.
- **Spread shadows**, such as the highlight round a linked settings row, are drawn by clipping their frame: Figma only draws a frame's shadow spread when the frame clips its content.
- **Buttons in a sentence** ("Sign in instead") move to the next line whole, as an inline-block does in the browser.
- **Numbered lists** get their numbers as text, since Figma has no list markers.

## Known differences

Small, and accepted:

- Figma's Fraunces and Newsreader have no optical size axis, so Potluck's large headings look a little different. The browser sets optical size to the text size.
- Figma draws Inter a hair wider than Chrome, so some one-line labels and buttons are 1 to 2px wider, and a truncated tab title cuts off a character later or sooner.
- Figma rounds each text box's height up to a whole pixel, so long screens run a few pixels taller than the browser (about 5px by the end of the phone settings page).
- Variant names come from CSS classes and, where those match, from the words or width that set a variant apart.
