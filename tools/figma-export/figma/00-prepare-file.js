// Run with the use_figma tool before a rebuild. It adds any missing colour
// variables, parks the old components on a holding page (anything outside the
// generated pages, such as the Cover, keeps working until 09 repoints it),
// clears the generated screens, and creates the _import page for carriers.
// Return values hold the new page IDs: put them into the later steps.
const COMP_PAGE = '16:55';
const SCENARIO_PAGES = ['16:56', '16:57', '16:58', '16:59', '16:60'];
// Hex tokens from styles.css: node -e "..." in the README prints this object.
const TOKENS = {"potluck/card": "#fffcf4", "potluck/cream": "#fbefd2", "potluck/yellow": "#f3be3a", "potluck/yellow-soft": "#fde3a1", "potluck/yellow-deep": "#b9860b", "potluck/brown": "#5b3a22", "potluck/ink": "#2f1f14", "potluck/ink-soft": "#6a4b35", "potluck/bark": "#3a2416", "potluck/bark-raised": "#4b3020", "potluck/on-bark": "#fff4dc", "potluck/on-bark-soft": "#e2c9a6", "frame/paper": "#f6f9fe", "frame/ground": "#e9f1fc", "frame/card": "#fdfeff", "frame/ink": "#14396f", "frame/ink-soft": "#3d5f8f", "frame/blue": "#1f5fbf", "frame/tint": "#d7e6fb"};

const out = {};
const coll = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === 'Colour');
const mode = coll.modes[0].modeId;
const have = new Map((await figma.variables.getLocalVariablesAsync('COLOR')).map((v) => [v.name, v]));
let made = 0, updated = 0;
for (const [name, hex] of Object.entries(TOKENS)) {
  const n = parseInt(hex.slice(1), 16);
  const value = { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  let v = have.get(name);
  if (v) updated++;
  else { v = figma.variables.createVariable(name, coll, 'COLOR'); v.scopes = ['ALL_FILLS', 'STROKE_COLOR']; made++; }
  v.setValueForMode(mode, value);
}
out.variables = { made, updated };

const comp = await figma.getNodeByIdAsync(COMP_PAGE);
await comp.loadAsync();
const hold = figma.createPage();
hold.name = 'Components (old, to remove)';
for (const k of [...comp.children]) hold.appendChild(k);
out.holdPage = hold.id;

const mine = (n) => /^\d\d · /.test(n.name) || n.name === 'Scenario header' || n.name.startsWith('Row label · ');
out.removed = {};
for (const id of SCENARIO_PAGES) {
  const p = await figma.getNodeByIdAsync(id);
  await p.loadAsync();
  let n = 0;
  for (const k of [...p.children]) if (mine(k)) { k.remove(); n++; }
  out.removed[p.name] = n;
}

const imp = figma.createPage();
imp.name = '_import';
out.importPage = imp.id;
return out;
