"""Swap changed screenshots into the decks.

The Claude decks are artifacts made from the Slides type. Each slide is a file
under project/slides/, and images are uploaded assets referenced as
/_blob/<id>. blobs/deck1.json etc. map each asset id to the capture it came from.

  python3 -I decks.py plan <live-dir> <compare.json> <plan.json>
      <live-dir>/deck1, deck2, deck3 each hold project/deck.json and
      project/slides/*.html, read from the live decks just before editing.
      Lists every slide image whose capture changed.

  python3 -I decks.py swap <live-dir> <plan.json> <new-blobs.json> <deck-images-dir>
      After uploading <deck-images-dir>/<name>.png to each deck as assets,
      put the new ids in new-blobs.json ({"deck1": {"<name>": "<id>"}, ...}).
      Rewrites the img src in the live slide files, and refits the img box
      where the image's shape changed. Then publish the changed slide files.
      It also records the new ids in blobs/*.json.

  python3 -I decks.py pack <live-dir> <plan.json> <fit-dir> <pack-dir>
      Builds the Google Slides swap pack: one folder per deck, files named by
      slide number, each the exact pixel size of the image it replaces, plus
      a swap list.
"""
import json
import os
import re
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DECKS = {
    'deck1': ('1 Vision and process', 'Sign in with Atmosphere: vision and process'),
    'deck2': ('2 A guided tour', 'Sign in with Atmosphere: a guided tour'),
    'deck3': ('3 A draft trial for builders', 'Sign in with Atmosphere: a draft trial for builders'),
}
BLOB = re.compile(r'/_blob/([0-9a-f]{32})')


def blobs(deck):
    return json.load(open(os.path.join(HERE, 'blobs', f'{deck}.json')))


def name_of(src):
    return os.path.basename(src)


def plan(live, cmp_path, out):
    changed = {name_of(c) for c in json.load(open(cmp_path))['changed']}
    result = {}
    for deck in DECKS:
        order = json.load(open(os.path.join(live, deck, 'project', 'deck.json')))['order']
        m = blobs(deck)
        rows = []
        for i, sid in enumerate(order, 1):
            html = open(os.path.join(live, deck, 'project', 'slides', f'{sid}.html')).read()
            for bid in BLOB.findall(html):
                src = m.get(bid)
                rows.append({'slide': i, 'id': sid, 'blob': bid, 'name': name_of(src) if src else None,
                             'changed': bool(src) and name_of(src) in changed})
        result[deck] = rows
        print(deck, sum(r['changed'] for r in rows), 'images to replace')
    json.dump(result, open(out, 'w'), indent=1)


def swap(live, plan_path, new_blobs_path, images):
    p = json.load(open(plan_path))
    nb = json.load(open(new_blobs_path))
    for deck, rows in p.items():
        touched = set()
        for r in rows:
            if not r['changed']:
                continue
            new = nb[deck][r['name']]
            path = os.path.join(live, deck, 'project', 'slides', f"{r['id']}.html")
            html = open(path).read()
            m = re.search(r'<img src="/_blob/' + r['blob'] + r'"[^>]*>', html)
            tag = m.group(0)
            img = Image.open(os.path.join(images, r['name'] + '.png'))
            t = tag.replace(r['blob'], new)
            w = re.search(r'width:\s*(\d+(?:\.\d+)?)px', t)
            h = re.search(r'height:\s*(\d+(?:\.\d+)?)px', t)
            if w and h:
                bw, bh = float(w.group(1)), float(h.group(1))
                if abs(bw / bh - img.width / img.height) / (bw / bh) > 0.005:
                    s = min(bw / img.width, bh / img.height)
                    t = re.sub(r'width:\s*\d+(?:\.\d+)?px', 'width:%dpx' % round(img.width * s), t, count=1)
                    t = re.sub(r'height:\s*\d+(?:\.\d+)?px', 'height:%dpx' % round(img.height * s), t, count=1)
            open(path, 'w').write(html.replace(tag, t))
            touched.add(f"project/slides/{r['id']}.html")
        m = blobs(deck)
        for name, i in nb.get(deck, {}).items():
            m[i] = name
        json.dump(m, open(os.path.join(HERE, 'blobs', f'{deck}.json'), 'w'), indent=1)
        print(deck, 'changed files:', sorted(touched))


def pack(live, plan_path, fit_dir, out):
    p = json.load(open(plan_path))
    lines = ['# Image swaps for the Google Slides decks', '',
             'Each replacement has exactly the same pixel size as the image it replaces, so it drops into the same frame.',
             'In Google Slides: right-click the image, choose Replace image, then Upload from computer.', '']
    for deck, (folder, title) in DECKS.items():
        os.makedirs(os.path.join(out, folder), exist_ok=True)
        lines += [f'## {title}', '', '| Slide | Image to replace | File |', '| --- | --- | --- |']
        for r in p[deck]:
            if not r['changed']:
                continue
            html = open(os.path.join(live, deck, 'project', 'slides', f"{r['id']}.html")).read()
            m = blobs(deck)
            alt = next((a for bid, a in re.findall(r'<img src="/_blob/([0-9a-f]{32})" alt="([^"]*)"', html)
                        if m.get(bid) and name_of(m[bid]) == r['name']), '')
            fn = f"slide-{r['slide']:02d}-{r['name']}.png"
            shutil.copy(os.path.join(fit_dir, r['name'] + '.png'), os.path.join(out, folder, fn))
            lines.append(f"| {r['slide']} | {alt} | {fn} |")
        lines.append('')
    open(os.path.join(out, 'Swap list.md'), 'w').write('\n'.join(lines))
    print('pack written to', out)


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    {'plan': plan, 'swap': swap, 'pack': pack}[cmd](*args)
