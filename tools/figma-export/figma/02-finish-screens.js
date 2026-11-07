// Run with the use_figma tool after every batch is built.
// 1. Overlays (suggestion lists, open account menus) paint above later siblings.
// 2. Offset rows: Mini recipe cards inside an offset wrapper keep their main
//    component's width, which overflows on phone screens. Make them fill.
//    (Only Mini recipe: other offset rows, such as the provider card, overhang
//    their parent on purpose.) Issue #14 is to fix this in the builder.
const SCENARIO_PAGES = ['16:56', '16:57', '16:58', '16:59', '16:60'];

const inInstance = (n) => { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; };
const changed = new Set();
const report = {};
for (const id of SCENARIO_PAGES) {
  const page = await figma.getNodeByIdAsync(id); await page.loadAsync();
  const targets = page.findAll((n) => (n.type === 'FRAME' && n.name === 'combo-list') || (n.type === 'INSTANCE' && n.name.startsWith('Account menu') && !!n.findOne((c) => c.name === 'am-panel')));
  for (const t of targets) {
    let p = t.parent;
    while (p && p.type !== 'PAGE' && p.name !== 'Browser window') {
      if (p.type === 'FRAME' && !inInstance(p) && p.layoutMode !== 'NONE' && !p.itemReverseZIndex) { p.itemReverseZIndex = true; changed.add(p.id); }
      if (p.clipsContent && !inInstance(p)) break;
      p = p.parent;
    }
  }
  for (const f of page.findAllWithCriteria({ types: ['FRAME'] }).filter((f) => f.name === 'potluck')) {
    if (f.findOne((c) => c.name === 'am-panel')) { f.itemReverseZIndex = true; changed.add(f.id); }
  }
  let offsets = 0;
  for (const w of page.findAllWithCriteria({ types: ['FRAME'] }).filter((f) => f.name === 'offset')) {
    const p = w.parent;
    const c = w.children[0];
    if (!p || p.layoutMode !== 'VERTICAL' || !c || c.type !== 'INSTANCE' || c.name !== 'Mini recipe') continue;
    if (w.width <= p.width - p.paddingLeft - p.paddingRight + 0.5) continue;
    w.layoutSizingHorizontal = 'FILL';
    c.layoutSizingHorizontal = 'FILL';
    changed.add(w.id); offsets++;
  }
  report[page.name] = { overlays: targets.length, offsets };
}
return { report, mutated: changed.size };
