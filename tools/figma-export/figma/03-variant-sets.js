// Run with the use_figma tool after 02. Turns the generated components on the
// Components page into variant sets: Icon by name, size and stroke, the mark by
// size, everything else by a variant label taken from its CSS classes.
const KEY_CLASS = { 'Account menu': 'acct-menu', 'Menu item': 'am-item', 'Welcome banner': 'banner', 'Two accounts': 'two-accounts', Handshake: 'handshake', 'Provider option': 'provider-opt', Suggestion: 'combo-opt', 'Browser account': 'fedcm-acct', Notice: 'notice', Autofill: 'autofill', 'Account row': 'acct', 'Browser tab': 'tab', 'Address bar': 'omnibox', 'Browser button': 'nav-btn', 'Sheet header': 'sheet-top', 'Sheet footer': 'sheet-foot', 'Provider header': 'pv-head', 'Provider footer': 'pv-foot', 'Potluck header': 'pl-head', 'Recipe card': 'recipe-btn', 'Mini recipe': 'mini-recipe', 'Mail list item': 'wm-item', 'Mail notification': 'notif-card', Toast: 'toast', Switch: 'switch', 'Password input': 'pw-wrap', 'Handle input': 'suffix-input', 'Locked input': 'locked-input', Disclosure: 'disclosure', Chip: 'chip', Tag: 'tag', Button: 'btn', 'Atmosphere button': 'atmo-btn', 'Potluck button': 'pl-btn', 'Icon button': 'icon-btn', Avatar: 'avatar', Tile: 'tile', 'Food tile': 'food', Input: 'input' };
const page = await figma.getNodeByIdAsync('16:55'); await page.loadAsync();
const out = {}; const errors = [];
const clean = (s) => s.replace(/[=,]/g, ' ').trim() || 'default';
for (const box of [...page.children].filter(c => c.type === 'FRAME')) {
  const comps = box.children.filter(c => c.type === 'COMPONENT');
  if (!comps.length) continue;
  const key = box.name;
  try {
    const seen = new Set();
    for (const c of comps) {
      let name;
      if (key === 'Icons') {
        const m = c.name.match(/^Icon \/ ([^/]+) \/ ([\d.]+)(?: \/ stroke ([\d.]+))?$/);
        name = m ? `Icon=${m[1].trim()}, Size=${m[2]}, Stroke=${m[3] || 2}` : `Icon=${clean(c.name)}, Size=?, Stroke=2`;
      } else if (key === 'Atmosphere mark') {
        name = `Size=${c.name.split('/').pop().trim()}`;
      } else {
        name = `Variant=${clean(c.name.split(' / ').slice(1).join(' / '))}`;
      }
      let unique = name, i = 2;
      while (seen.has(unique)) unique = `${name} ${i++}`;
      seen.add(unique);
      c.name = unique;
    }
    const set = figma.combineAsVariants(comps, box);
    set.name = key === 'Icons' ? 'Icon' : key;
    set.layoutMode = 'HORIZONTAL';
    set.layoutWrap = 'WRAP';
    set.itemSpacing = 24; set.counterAxisSpacing = 24;
    set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
    set.counterAxisAlignItems = 'MIN';
    set.layoutSizingHorizontal = 'FILL';
    set.layoutSizingVertical = 'HUG';
    set.description = key === 'Icons' ? 'Lucide v0.469.0 icons at the sizes the prototype renders them (1.15em of the text beside them, or a fixed share of a tile). Stroke scales with size.'
      : key === 'Atmosphere mark' ? 'The Atmosphere mark from index.html: a filled circle inside an open ring. Works in one colour.'
      : `Recreated from the prototype’s .${KEY_CLASS[key] || key} markup and styles. Variants are the distinct ways it appears across the five scenarios.`;
    out[set.name] = comps.length;
  } catch (e) { errors.push(`${key}: ${String(e).slice(0, 100)}`); }
}
return { sets: Object.keys(out).length, variants: Object.values(out).reduce((a, b) => a + b, 0), out, errors };