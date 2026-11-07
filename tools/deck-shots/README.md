# Deck screenshots

The three decks (Vision and process, A guided tour, and A draft trial for builders) use screenshots of the prototype. These scripts recapture them, find the ones that really changed, and swap them into the Claude decks and the Google Slides copies.

`blobs/deck1.json`, `deck2.json` and `deck3.json` map each image in a deck (its asset id) to the capture it came from.

## 1. Capture (local)

From the repo root, after `tools/setup.sh`:

```sh
D=tools/deck-shots; W=tools/out/decks
node $D/shots-1.js $W/new/shots
node $D/shots-2.js $W/new/shots2
node $D/shots-3.js $W/new/shots2
python3 -I $D/crops.py $W/new
```

Screenshots are at 2x. `crops.py` cuts the derived images, such as the person picker without the buttons.

## 2. Compare with what the decks show now

Put the images the decks currently use in `$W/old`, in the same layout. Download them from each deck's assets with the Artifact tool (read with the asset id), or keep the previous run's `new` folder.

```sh
python3 -I $D/compare.py $W/old $W/new $W/compare.json
python3 -I $D/fit.py $W/old $W/new $W/compare.json $W/out
```

- `compare.py` allows for small shifts, so images that only moved by a pixel or two count as unchanged.
- `fit.py` writes two versions of each changed image. `out/deck/` is for the Claude decks, with rounded corners made transparent. `out/fit/` is for Google Slides, at exactly the old pixel size, so Replace image keeps the frame.

## 3. Claude decks

1. Read each deck's live `project/` files with the Artifact tool into `$W/live/deck1`, `deck2` and `deck3`, so edits made in the deck editor are kept.
2. Run `python3 -I $D/decks.py plan $W/live $W/compare.json $W/plan.json`.
3. Upload the changed images from `$W/out/deck/` to each deck as assets, and write the returned ids to `$W/new-blobs.json`, like `{"deck1": {"signin-window": "<id>"}}`.
4. Run `python3 -I $D/decks.py swap $W/live $W/plan.json $W/new-blobs.json $W/out/deck`. This refits the image box where the shape changed, and records the new ids in `blobs/`.
5. Render the decks locally to check them: `node $D/render-deck.js $W/live/deck1/project $W/render1 <map.json>`. The map points asset ids at local image paths.
6. Publish only the changed slide files.

## 4. Google Slides copies

There's no Google Slides editing connector at the moment, so the images go to whoever owns the decks as a pack:

```sh
python3 -I $D/decks.py pack $W/live $W/plan.json $W/out/fit $W/pack
```

Each folder holds one deck's images, named by slide number, with a swap list. In Google Slides: right-click the image, choose Replace image, then Upload from computer.
