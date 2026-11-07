# Tools

Scripts that keep the Figma file and the slide decks in step with the prototype. None of this is part of the prototype itself.

- `figma-export/`: rebuilds the Figma file from the running prototype, as editable layers built from components.
- `deck-shots/`: captures the screenshots the decks use, works out which ones changed, and swaps them in.
- `check-screens.js`: a quick visual check of key states after a styling change.

## What you need

- Node 18 or later, and Playwright with its Chromium (`npm i -g playwright` then `npx playwright install chromium`).
- Python 3 with Pillow and NumPy (`pip install pillow numpy`), for the deck steps.
- The fonts and icons, fetched once into `tools/.cache` (git-ignored):

```sh
tools/setup.sh
```

The prototype loads the same fonts from Google Fonts and the same Lucide build from unpkg. The tools serve local copies, so every capture renders the same way, offline.

## Quick check

```sh
node tools/check-screens.js "$PWD" tools/out/check
```

It opens the main states at desktop and phone widths and saves screenshots to `tools/out/check`. Set `PIN_BAR=1` to fix the prototype bar's height, which helps when comparing two runs pixel by pixel.
