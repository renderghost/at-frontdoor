// Run with the use_figma tool last. Anything outside the generated pages that
// used the old components (the Cover, for example) is repointed to the new
// component with the same set and variant name. If nothing still uses the
// old components, the holding page and the _import page are deleted, along
// with Prototype/ text styles nothing uses. Anything without a match is
// reported and left alone, so check "unmatched" before trusting the result.
const HOLD_PAGE = 'PUT-HOLDING-PAGE-ID-HERE';
const IMPORT_PAGE = 'PUT-IMPORT-PAGE-ID-HERE';
const COMP_PAGE = '16:55';
const OUTSIDE_PAGES = ['0:1']; // pages people compose by hand
const ALL_PAGES = ['0:1', '16:55', '16:56', '16:57', '16:58', '16:59', '16:60'];

const hold = await figma.getNodeByIdAsync(HOLD_PAGE); await hold.loadAsync();
const comp = await figma.getNodeByIdAsync(COMP_PAGE); await comp.loadAsync();
const sets = {};
for (const s of comp.findAllWithCriteria({ types: ['COMPONENT_SET'] })) sets[s.name] = Object.fromEntries(s.children.map((c) => [c.name, c]));
const pageOf = (n) => { let p = n; while (p && p.type !== 'PAGE') p = p.parent; return p; };
const inInstance = (n) => { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; };

const swapped = {}, unmatched = {};
for (const id of OUTSIDE_PAGES) {
  const page = await figma.getNodeByIdAsync(id); await page.loadAsync();
  const fonts = new Map();
  for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) for (const s of t.getStyledTextSegments(['fontName'])) fonts.set(JSON.stringify(s.fontName), s.fontName);
  await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f).catch(() => null)));
  for (let pass = 0; pass < 4; pass++) {
    const todo = [];
    for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] })) {
      if (inInstance(i)) continue;
      const mc = await i.getMainComponentAsync();
      if (mc && pageOf(mc)?.id === HOLD_PAGE) todo.push([i, mc]);
    }
    if (!todo.length) break;
    for (const [i, mc] of todo) {
      const setName = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name;
      const target = sets[setName] && sets[setName][mc.name];
      const key = `${setName} / ${mc.name}`;
      if (!target) { unmatched[key] = (unmatched[key] || 0) + 1; continue; }
      i.swapComponent(target);
      swapped[key] = (swapped[key] || 0) + 1;
    }
  }
}

let stillOld = 0;
for (const id of ALL_PAGES) {
  const p = await figma.getNodeByIdAsync(id); await p.loadAsync();
  for (const i of p.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await i.getMainComponentAsync();
    if (mc && pageOf(mc)?.id === HOLD_PAGE) stillOld++;
  }
}
if (stillOld) return { swapped, unmatched, stillOld, deleted: false };

hold.remove();
const imp = await figma.getNodeByIdAsync(IMPORT_PAGE);
if (imp) imp.remove();
let removedStyles = 0;
for (const s of await figma.getLocalTextStylesAsync()) {
  if (!s.name.startsWith('Prototype/')) continue;
  if (!(await s.getStyleConsumersAsync()).length) { s.remove(); removedStyles++; }
}
return { swapped, unmatched, stillOld, deleted: true, removedStyles };
