"""Derived deck images, cut from fresh captures.

Usage: python3 -I crops.py <dir>
<dir> holds shots/ and shots2/ from shots-1.js, shots-2.js and shots-3.js.
Writes shots/create-sheet-top.png, shots/scenario-bar-left.png,
shots/home-top.png, deck2img/* and deck3img/* inside <dir>.

The pixel positions are for the current layout at 2x. Check bar-people.png
after any change to the prototype bar: it starts just before the first pill.
"""
import os
import sys

from PIL import Image

D = sys.argv[1]
os.makedirs(os.path.join(D, 'deck2img'), exist_ok=True)
os.makedirs(os.path.join(D, 'deck3img'), exist_ok=True)
P = lambda *parts: os.path.join(D, *parts)


def fade_white(im, f):
    w, h = im.size
    white = Image.new('RGB', (w, f), (255, 255, 255))
    mask = Image.linear_gradient('L').resize((w, f))
    im.paste(Image.composite(white, im.crop((0, h - f, w, h)), mask), (0, h - f))
    return im


# Deck 1 and 2: the create sheet's top, fading to white
im = Image.open(P('shots', 'create-sheet.png')).convert('RGB').crop((0, 0, 880, 1336))
fade_white(im, 140).save(P('shots', 'create-sheet-top.png'))

# The person picker without the bar's buttons, and the top of the home page
a = Image.open(P('shots', 'scenario-bar.png'))
a.crop((0, 0, 2360, a.height)).save(P('shots', 'scenario-bar-left.png'))
b = Image.open(P('shots', 'home-window.png'))
b.crop((0, 0, b.width, 1283)).save(P('shots', 'home-top.png'))

# Deck 2: the bar with each person selected, consent tops, Priya's sheet
for s in ['new', 'returning', 'forgot', 'multi', 'hidden']:
    a = Image.open(P('shots2', f'bar-{s}.png'))
    a.crop((0, 0, 2360, a.height)).save(P('deck2img', f'bar-{s}.png'))
for n in ['alex', 'rae', 'priya']:
    a = Image.open(P('shots2', f'{n}-consent-card.png'))
    a.crop((0, 0, a.width, 1120)).save(P('deck2img', f'{n}-consent-top.png'))
a = Image.open(P('shots2', 'priya-anyway-sheet.png'))
a.crop((0, 0, a.width, 1500)).save(P('deck2img', 'priya-anyway-top.png'))
fade_white(a.convert('RGB').crop((0, 0, 880, 1500)), 160).save(P('deck2img', 'priya-anyway-fade.png'))

# Deck 3: the events list, and the five people without the brand
s = Image.open(P('shots', 'notes-events.png')).convert('RGB')
fade_white(s.crop((0, 0, min(650, s.width), 560)), 120).save(P('deck3img', 'events-top.png'))
b = Image.open(P('shots2', 'bar-new.png')).convert('RGB')
b.crop((466, 0, 2360, b.height)).save(P('deck3img', 'bar-people.png'))
print('crops written to', D)
