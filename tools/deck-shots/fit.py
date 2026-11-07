# Makes two versions of each changed image:
#   <out>/fit/<name>.png   exactly the old image's pixel size (drop-in for Google Slides)
#   <out>/deck/<name>.png  for the Claude decks (masked corners, no padding)
# Usage: python3 -I fit.py <old-dir> <new-dir> <compare.json> <out-dir>
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
OLD, NEW, CMP, OUT = [os.path.abspath(a) for a in sys.argv[1:5]]
changed = json.load(open(CMP))['changed']

def mask(im, r, corners='all'):
    im = im.convert('RGBA'); W, H = im.size
    m = Image.new('L', (W * 4, H * 4), 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, W * 4 - 1, H * 4 - 1), radius=r * 4, fill=255)
    m = m.resize((W, H), Image.LANCZOS)
    if corners == 'top':
        m.paste(255, (0, H // 2, W, H))
    a = np.minimum(np.asarray(im.getchannel('A')), np.asarray(m))
    im.putalpha(Image.fromarray(a)); return im

def pad_to(im, size):
    """Pad with transparency to the target aspect, then scale to the target size."""
    im = im.convert('RGBA'); W, H = im.size; tw, th = size
    if W / H < tw / th:
        nw = round(H * tw / th); c = Image.new('RGBA', (nw, H), (0, 0, 0, 0)); c.paste(im, ((nw - W) // 2, 0))
    else:
        nh = round(W * th / tw); c = Image.new('RGBA', (W, nh), (0, 0, 0, 0)); c.paste(im, (0, (nh - H) // 2))
    return c.resize(size, Image.LANCZOS)

def drop_rows(im, n):
    """Remove n rows from the run of plain page background nearest the bottom."""
    a = np.asarray(im.convert('RGB')).astype(int); H, W, _ = a.shape
    inner = a[:, 40:W - 40, :]
    plain = (inner.max(axis=1) - inner.min(axis=1)).max(axis=1) <= 2
    y = H - 1
    while y > 0 and not plain[y]: y -= 1
    end = y
    while y > 0 and plain[y]: y -= 1
    start = y + 1
    run = end - start + 1
    assert run > n + 8, (run, n)
    cut = start + (run - n) // 2
    out = np.concatenate([a[:cut], a[cut + n:]], axis=0).astype(np.uint8)
    return Image.fromarray(out)

os.makedirs(os.path.join(OUT, 'fit'), exist_ok=True); os.makedirs(os.path.join(OUT, 'deck'), exist_ok=True)
report = {}
for s in changed:
    old = Image.open(os.path.join(OLD, s + '.png')); new = Image.open(os.path.join(NEW, s + '.png')).convert('RGB')
    name = s.split('/')[1]; size = old.size
    if name.startswith('bar-') or name == 'scenario-bar-left':
        if name == 'bar-people':
            src = Image.open(os.path.join(NEW, 'shots2', 'bar-new.png')).convert('RGB'); fit = src.crop((466, 4, 2386, 126))
        else:
            fit = new.crop((0, new.height - size[1], new.width, new.height))
        deck = fit; how = 'cropped 2px of empty bar top'
    elif name in ('signin-window', 'chooser-window', 'find-suggestions-window', 'found-window'):
        fit = mask(new.resize(size, Image.LANCZOS), 28); deck = fit; how = 'resized by 2px'
    elif name.startswith('phone-'):
        fit = new.resize(size, Image.LANCZOS); deck = fit; how = 'resized by 2px'
    elif name in ('home-window', 'home-new-window', 'alex-home-window', 'priya-home-window', 'alex-switch-window'):
        fit = mask(drop_rows(new, new.height - size[1]), 28); deck = fit; how = 'trimmed plain space under the recipes'
    elif name == 'home-top':
        fit = mask(new, 28, 'top'); deck = fit; how = 'same size'
    elif name == 'prototype-full':
        fit = new; deck = fit; how = 'same size'
    elif name == 'events-top':
        W, H = new.size; ext = size[0] - W
        c = Image.new('RGB', size); c.paste(new, (0, 0)); c.paste(new.crop((W - ext, 0, W, H)), (W, 0))
        fit = c; deck = fit; how = 'ruled paper extended on the right'
    elif name in ('menu-panel', 'alex-menu-panel'):
        deck = mask(new, 28); fit = pad_to(deck, size); how = 'padded with transparency'
    elif name == 'signin-card':
        deck = mask(new, 48); fit = pad_to(deck, size); how = 'padded with transparency'
    elif name.startswith('notes-'):
        deck = new; fit = pad_to(new, size); how = 'padded with transparency'
    else:
        raise SystemExit('unhandled ' + s)
    assert fit.size == size, (s, fit.size, size)
    fit.save(os.path.join(OUT, 'fit', f'{name}.png')); deck.save(os.path.join(OUT, 'deck', f'{name}.png'))
    report[s] = {'old': size, 'deck': deck.size, 'how': how}
json.dump(report, open(os.path.join(OUT, 'fit-report.json'), 'w'), indent=1)
for s, r in report.items(): print(f"{s:34} old {r['old']} deck {r['deck']}  {r['how']}")
