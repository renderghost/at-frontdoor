// Run with the use_figma tool once the carriers are on the _import page.
// The first run (FIRST = true) creates or updates the Prototype/ text styles.
// Then build the batches a page at a time: NS lists batch numbers from
// plan.json that share one scenario page (a call can't change page).
// About 10 to 15 screens per call is comfortable.
const IMPORT_PAGE = 'PUT-IMPORT-PAGE-ID-HERE';
const COMP_PAGE = '16:55';
const FIRST = true;
const NS = [0];

const t0 = Date.now();
const imp = await figma.getNodeByIdAsync(IMPORT_PAGE); await imp.loadAsync();
const P = []; for (const t of imp.findAllWithCriteria({ types: ['TEXT'] })) { const m = t.name.match(/^@@builder#(\d+)\/(\d+)@@/); if (m) P.push([+m[1], t.characters.slice(m[0].length)]); }
const B = new Function(JSON.parse(P.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join('')))();
const { res: base } = await B.readPayloads(IMPORT_PAGE, ['foundations', 'plan']);
const F = base.foundations;

let stylesMade = 0, stylesUpdated = 0;
if (FIRST) {
  const WI = { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold' };
  const WM = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'Bold' };
  const WN = { 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
  const FAM = { Fraunces: 'Fraunces', Newsreader: 'Newsreader', Comic: 'Comic Neue' };
  const fn = (ts) => (ts.fam === 'Mono' ? { family: 'Roboto Mono', style: WM[ts.w] } : FAM[ts.fam] ? { family: FAM[ts.fam], style: WN[ts.w] || 'Regular' } : { family: 'Inter', style: WI[ts.w] });
  const label = { Mono: 'monospace', Inter: 'Inter', Fraunces: 'Fraunces', Newsreader: 'Newsreader', Comic: 'Comic Neue' };
  const local = await figma.getLocalTextStylesAsync();
  const byName = new Map(local.map((s) => [s.name, s]));
  const fonts = new Map(F.textStyles.map((ts) => [JSON.stringify(fn(ts)), fn(ts)]));
  for (const s of local) if (F.textStyles.some((ts) => ts.name === s.name)) fonts.set(JSON.stringify(s.fontName), s.fontName);
  await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
  for (const ts of F.textStyles) {
    let s = byName.get(ts.name);
    if (s) stylesUpdated++; else { s = figma.createTextStyle(); s.name = ts.name; stylesMade++; }
    s.fontName = fn(ts); s.fontSize = ts.z;
    s.lineHeight = { unit: 'PIXELS', value: ts.lh }; s.letterSpacing = { unit: 'PIXELS', value: ts.ls || 0 };
    s.textCase = ts.tt === 'U' ? 'UPPER' : 'ORIGINAL';
    s.description = `From the prototype CSS: ${label[ts.fam] || ts.fam} ${ts.z}px, weight ${ts.w}, line-height ${ts.lh}px`;
  }
}

await B.setup({ compPageId: COMP_PAGE, icons: F.icons, tiles: F.tiles });
const out = []; let page = null;
for (const N of NS) {
  const batch = base.plan.batches[N];
  const { res, used } = await B.readPayloads(IMPORT_PAGE, batch.items.map((i) => i.key));
  if (page !== batch.pageId) {
    if (page) throw new Error('These batches are on different pages: split the call');
    await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(batch.pageId));
    page = batch.pageId;
  }
  for (const it of batch.items) { const r = await B.buildGroup(res[it.key], it); out.push(`${it.key} ${r.id}`); }
  B.removeCarriers(used);
}
return { stylesMade, stylesUpdated, batches: NS, out, newComps: B.S.newComps, nodes: B.S.nodes, warn: [...new Set(B.S.warn)].slice(0, 10), ms: Date.now() - t0 };
