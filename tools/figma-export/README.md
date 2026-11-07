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

- `capture.js` walks all five scenarios in Chromium and saves each state as a spec, using `extract.js` in the page.
- `prepare.js` works out component variants, text styles, colour tokens and the ruled-paper tiles. Check its last line: any "unmapped colours" are drawn as fixed colours, not variables.
- `plan.js` lays the screens out on their pages and splits them into build batches.

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
5. Run `02-finish-screens.js`, `03-variant-sets.js`, `04-components-page.js`, `05-scenario-headers.js` and `06-hover-variants.js`.
6. Run `07-repoint-and-clean-up.js`. Check `unmatched` is empty.
7. Spot-check one desktop and one phone screen per scenario against the browser.

## Known differences

Issue #14 tracks these: numbered lists lose their numbers, the notes' demo box wraps differently, Fraunces and Newsreader use Figma's default optical size, offset rows need the fix in step 02, and variant names come from CSS classes.
