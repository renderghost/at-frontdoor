"""Which deck images really changed between two captures.

Usage: python3 -I compare.py <old-dir> <new-dir> <out.json>
Both dirs use the layout crops.py writes. Only images the decks use (listed
in blobs/*.json) are compared. Small shifts are allowed for, because a
taller bar moves the page by a pixel or two without changing anything on it.

Each image is reported as "same", "edges-only" or a percentage of pixels
that still differ at the best shift. Anything at 10% or more is listed in
"changed" and needs replacing; Atmosphere-only screens usually stay under 5%.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

OLD, NEW, OUT = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
used = sorted({v for f in glob.glob(os.path.join(here, 'blobs', '*.json')) for v in json.load(open(f)).values()})
# Older maps point at v2/deck/<name>; normalise to the capture's own path
used = sorted({os.path.basename(u) for u in used})


def find(root, name):
    for sub in ('shots', 'shots2', 'deck2img', 'deck3img'):
        p = os.path.join(root, sub, os.path.basename(name) + '.png')
        if os.path.exists(p):
            return p
    return None


report, changed = {}, []
for name in used:
    a_path, b_path = find(OLD, name), find(NEW, name)
    if not a_path or not b_path:
        report[name] = 'missing'
        continue
    a = np.asarray(Image.open(a_path).convert('L'), dtype=np.int16)
    b = np.asarray(Image.open(b_path).convert('L'), dtype=np.int16)
    if a.shape == b.shape and not (np.abs(a - b) > 8).any():
        report[name] = 'same'
        continue
    best = None
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            ay0, by0 = (0, dy) if dy >= 0 else (-dy, 0)
            ax0, bx0 = (0, dx) if dx >= 0 else (-dx, 0)
            h = min(a.shape[0] - ay0, b.shape[0] - by0)
            w = min(a.shape[1] - ax0, b.shape[1] - bx0)
            A = a[ay0 + 6:ay0 + h - 6, ax0 + 6:ax0 + w - 6]
            B = b[by0 + 6:by0 + h - 6, bx0 + 6:bx0 + w - 6]
            if A.size == 0:
                continue
            f = float((np.abs(A - B) > 24).mean())
            if best is None or f < best:
                best = f
    report[name] = f'{best * 100:.2f}%'
    if best >= 0.10:
        changed.append(os.path.relpath(b_path, NEW)[:-4])

json.dump({'report': report, 'changed': changed}, open(OUT, 'w'), indent=1)
for k, v in report.items():
    print(f'{k:40} {v}')
print(len(changed), 'changed')
