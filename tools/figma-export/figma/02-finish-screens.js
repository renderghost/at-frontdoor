// Run with the use_figma tool after every batch is built. Overlays
// (suggestion lists, open account menus) paint above later siblings.
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
  report[page.name] = { overlays: targets.length };
}
return { report, mutated: changed.size };
