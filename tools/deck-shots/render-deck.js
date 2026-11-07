// Local full-size render of slide files with uploaded images mapped to local PNGs. Not the real viewer.
// Usage: node render-deck.js <projectDir> <outDir> <map.json>
// map.json maps each /_blob/<id> to an image path, relative to the map file
// (".png" optional) or absolute. Slides render at 1920x1080 with Inter.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const S = path.resolve(__dirname, '../.cache');
const [PROJ, OUT, MAPFILE] = process.argv.slice(2);
const MAP = JSON.parse(fs.readFileSync(MAPFILE, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const font = [400, 500, 600, 700, 800].map((w) => `@font-face{font-family:'Inter';font-weight:${w};src:url(file://${S}/inter/package/files/inter-latin-${w}-normal.woff2) format('woff2');}`).join('\n');
const base = `${font}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#888;width:1920px;height:1080px;overflow:hidden}
section{width:1920px;height:1080px;position:relative;overflow:hidden;display:flex;flex-direction:column}
h1{font-size:96px;font-weight:600;line-height:1.1} h2{font-size:64px;font-weight:600;line-height:1.15} h3{font-size:44px;font-weight:600;line-height:1.2} p{font-size:32px;line-height:1.4}
ul,ol{padding-left:1.3em} a{color:inherit}
aside{display:none}
x-shape,x-icon{display:block;flex:none}
x-icon{background:currentColor;border-radius:8px;opacity:.35}
x-shape[kind=arrow-right]{clip-path:polygon(0 30%,60% 30%,60% 0,100% 50%,60% 100%,60% 70%,0 70%)}
.ov{}`;
(async () => {
  const deck = JSON.parse(fs.readFileSync(path.join(PROJ, 'deck.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.route(/\/_blob\//, (r) => {
    const id = r.request().url().split('/_blob/')[1];
    const f = MAP[id];
    if (!f) return r.abort();
    const file = path.resolve(path.dirname(MAPFILE), f.endsWith('.png') ? f : `${f}.png`);
    return r.fulfill({ contentType: 'image/png', body: fs.readFileSync(file) });
  });
  const report = [];
  for (const [i, id] of deck.order.entries()) {
    const html = fs.readFileSync(path.join(PROJ, 'slides', `${id}.html`), 'utf8').replace(/src="\/_blob\//g, 'src="http://blob.local/_blob/');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const info = await page.evaluate(() => {
      const out = { overflow: [], below920: [], missing: [], notes: 0 };
      const sec = document.querySelector('section');
      const aside = sec.querySelector(':scope > aside');
      out.notes = aside ? aside.textContent.trim().length : 0;
      for (const el of sec.querySelectorAll('*')) {
        if (el.tagName === 'ASIDE') continue;
        const r = el.getBoundingClientRect();
        if (el.tagName === 'IMG' && !(el.complete && el.naturalWidth)) out.missing.push(el.getAttribute('src'));
        if (['P', 'H1', 'H2', 'H3', 'LI', 'UL', 'OL'].includes(el.tagName)) {
          if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) { out.overflow.push(el.textContent.slice(0, 50)); el.classList.add('ov'); }
          if (getComputedStyle(el).position !== 'absolute' && r.bottom > 952 && r.height) out.below920.push(`${Math.round(r.bottom)} ${el.textContent.slice(0, 40)}`);
        }
        if (r.right > 1921 || r.bottom > 1081) { out.overflow.push(`offcanvas ${el.tagName} ${Math.round(r.right)}x${Math.round(r.bottom)}`); }
      }
      // flow content bottom vs padding
      const kids = [...sec.children].filter((c) => c.tagName !== 'ASIDE' && getComputedStyle(c).position !== 'absolute');
      out.flowBottom = Math.round(Math.max(...kids.map((c) => c.getBoundingClientRect().bottom)));
      return out;
    });
    const file = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${id}.png`);
    await page.screenshot({ path: file });
    report.push({ n: i + 1, id, ...info });
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
