// Run with the use_figma tool after 04, before 07 removes the _import page.
// Adds each scenario page's header and its Desktop and Phone row labels.
const IMPORT_PAGE = 'PUT-IMPORT-PAGE-ID-HERE';
const imp = await figma.getNodeByIdAsync(IMPORT_PAGE); await imp.loadAsync();
const parts = [];
for (const t of imp.findAllWithCriteria({ types: ['TEXT'] })) { const m = t.name.match(/^@@plan#(\d+)\/(\d+)@@/); if (m) parts.push([+m[1], t.characters.slice(m[0].length)]); }
const plan = JSON.parse(parts.sort((a, b) => a[0] - b[0]).map(p => p[1]).join(''));
await Promise.all(['Regular', 'Bold', 'Extra Bold'].map(s => figma.loadFontAsync({ family: 'Inter', style: s })));
const styles = Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
const vars = Object.fromEntries((await figma.variables.getLocalVariablesAsync('COLOR')).map(v => [v.name, v]));
const ink = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', vars['ink']);
const S = {
  new: ['Scenario 1 · New to the Atmosphere', 'Jo Park', 'Jo has never used Bluesky or any other Atmosphere app. A friend sent Jo a recipe on Potluck.'],
  returning: ['Scenario 2 · Knows their details', 'Sam Okafor', 'Sam uses Bluesky every day, so Sam already has an Atmosphere account, hosted by Bluesky. Sam knows the handle and password, but this is a new laptop, so the browser doesn’t know Sam yet.'],
  forgot: ['Scenario 3 · Forgot their details', 'Rae Thompson', 'Rae created an Atmosphere account last year, with Blacksky as the provider. Rae can’t remember the handle or the password, but does know the email address.'],
  multi: ['Scenario 4 · Several accounts', 'Alex Moreno', 'Alex has three Atmosphere accounts: a personal one hosted by Bluesky, a cooking one hosted by Eurosky, and a work one on a custom domain. This browser has seen all three.'],
  hidden: ['Scenario 5 · Has one, doesn’t know it', 'Priya Shah', 'Priya uses Bluesky on this laptop but doesn’t know that means Priya already has an Atmosphere account that works in other apps. Priya assumes Potluck needs a new account.'],
};
const text = async (chars, style, width) => {
  const t = figma.createText(); await t.setTextStyleIdAsync(styles[style].id); t.characters = chars; t.fills = [ink];
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, t.height); }
  return t;
};
const made = [];
for (const [sc, h] of Object.entries(plan.headers)) {
  const page = await figma.getNodeByIdAsync(h.pageId); await page.loadAsync();
  for (const old of page.children.filter(c => c.name === 'Scenario header' || c.name.startsWith('Row label'))) old.remove();
  const [title, persona, situation] = S[sc];
  const head = figma.createAutoLayout('VERTICAL');
  head.name = 'Scenario header'; head.itemSpacing = 8; head.fills = [];
  head.appendChild(await text(title, 'board/title'));
  head.appendChild(await text(`Persona: ${persona}`, 'board/section'));
  head.appendChild(await text(situation, 'board/caption', 900));
  head.appendChild(await text('Each screen is one step of the journey, captured from the prototype in order. Desktop screens show the browser window (1038px, as the prototype lays it out at 1440px) with the prototype’s notes panel beside it. Phone screens use a 390px viewport. Everything is built from the components on the Components page.', 'board/caption', 900));
  page.appendChild(head); head.x = 0; head.y = -40;
  const d = await text('Desktop', 'board/title'); d.name = 'Row label · Desktop'; page.appendChild(d); d.x = 0; d.y = h.deskY - 30 - d.height + 120;
  const p = await text('Phone · 390px', 'board/title'); p.name = 'Row label · Phone'; page.appendChild(p); p.x = 0; p.y = h.phoneY - p.height - 40;
  made.push({ page: page.name, header: head.id, headH: Math.round(head.height), deskLabelY: Math.round(d.y), phoneLabelY: Math.round(p.y) });
}
return made;