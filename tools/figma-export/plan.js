// Lays out every screen on its scenario page and splits the work into build batches.
// Usage: node plan.js <prepDir>
const fs = require('fs');
const path = require('path');
const PREP = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(path.join(PREP, 'manifest.json'), 'utf8'));
const PAGES = { new: '16:56', returning: '16:57', forgot: '16:58', multi: '16:59', hidden: '16:60' };
const TOP = 260; // room for the page header
const DESK_STEP = 1600;
const PHONE_STEP = 520;

const batches = [];
const headers = {};
for (const [scenario, pageId] of Object.entries(PAGES)) {
  const items = manifest.filter((m) => m.scenario === scenario);
  const desk = items.filter((m) => m.mode === 'desktop');
  const phone = items.filter((m) => m.mode === 'phone');
  let deskH = 0;
  const deskItems = desk.map((m, i) => {
    const spec = JSON.parse(fs.readFileSync(path.join(PREP, 'screens', `${m.key}.json`), 'utf8'));
    deskH = Math.max(deskH, Math.max(spec.browser.h, spec.notes ? spec.notes.h : 0) + 80);
    const n = String(i + 1).padStart(2, '0');
    return { key: m.key, x: i * DESK_STEP, y: TOP, name: `${n} · ${m.label}`, title: `${i + 1}. ${m.label}`, caption: [spec.step, spec.stepTitle, spec.host].filter(Boolean).join(' · ') };
  });
  const phoneY = TOP + deskH + 360;
  const phoneItems = phone.map((m, i) => {
    const spec = JSON.parse(fs.readFileSync(path.join(PREP, 'screens', `${m.key}.json`), 'utf8'));
    const n = String(i + 1).padStart(2, '0');
    return { key: m.key, x: i * PHONE_STEP, y: phoneY, name: `${n} · ${m.label} · phone`, title: `${i + 1}. ${m.label}`, caption: [spec.step, spec.host].filter(Boolean).join(' · ') };
  });
  headers[scenario] = { pageId, deskY: TOP, phoneY, deskW: deskItems.length * DESK_STEP, phoneW: phoneItems.length * PHONE_STEP };
  for (let i = 0; i < deskItems.length; i += 3) batches.push({ pageId, scenario, items: deskItems.slice(i, i + 3) });
  for (let i = 0; i < phoneItems.length; i += 4) batches.push({ pageId, scenario, items: phoneItems.slice(i, i + 4) });
}
fs.writeFileSync(path.join(PREP, 'plan.json'), JSON.stringify({ batches, headers }));
console.log(`${batches.length} batches`);
batches.forEach((b, i) => console.log(i, b.scenario, b.items.map((x) => x.key.replace(/^(desktop|phone)-/, (m) => m[0] + ':')).join(' ')));
