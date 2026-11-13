// Run with the use_figma tool after 03. Orders the component sets and adds the
// page header. The header text is written once; it is kept on later runs.
const page = await figma.getNodeByIdAsync('16:55'); await page.loadAsync();
await figma.setCurrentPageAsync(page);
await Promise.all(['Regular', 'Bold', 'Extra Bold'].map(s => figma.loadFontAsync({ family: 'Inter', style: s })));
const styles = Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
const vars = Object.fromEntries((await figma.variables.getLocalVariablesAsync('COLOR')).map(v => [v.name, v]));
const ink = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', vars['ink']);
const ORDER = ['Atmosphere mark', 'Icons', 'Avatar', 'Tile', 'Food tile',
  'Button', 'Atmosphere button', 'Potluck button', 'Icon button', 'Input', 'Password input', 'Handle input', 'Locked input', 'Switch', 'Chip', 'Tag', 'Disclosure', 'Autofill', 'Notice',
  'Account row', 'Two accounts', 'Handshake', 'Suggestion', 'Browser account', 'Provider option', 'Menu item', 'Account menu', 'Welcome banner', 'Recipe card', 'Mini recipe',
  'Browser tab', 'Address bar', 'Browser button', 'Sheet header', 'Sheet footer', 'Provider header', 'Provider footer', 'Potluck header', 'Mail list item', 'Mail notification', 'Toast'];
const boxes = page.children.filter(c => c.type === 'FRAME' && c.name !== 'Components header');
boxes.sort((a, b) => (ORDER.indexOf(a.name) + 1 || 999) - (ORDER.indexOf(b.name) + 1 || 999));
let header = page.children.find(c => c.name === 'Components header');
if (!header) {
  header = figma.createAutoLayout('VERTICAL');
  header.name = 'Components header';
  header.itemSpacing = 8; header.fills = [];
  const t = figma.createText(); await t.setTextStyleIdAsync(styles['board/title'].id); t.characters = 'Front Door components'; t.fills = [ink];
  const n = figma.createText(); await n.setTextStyleIdAsync(styles['board/caption'].id);
  n.characters = 'Generated from the prototype’s rendered DOM and styles.css. Each set holds the distinct ways a piece appears across the five scenarios, at desktop and phone widths. Every screen on the scenario pages uses instances of these, so edits here flow through. Colours are bound to the Colour variables (Atmosphere, potluck/ and frame/, with alpha/ for the colours the CSS uses at part opacity); text uses the Prototype/ text styles, in Inter for Atmosphere, Fraunces and Newsreader for Potluck, and Comic Neue for the prototype’s notes. Three small differences from the browser are accepted: Figma’s Fraunces and Newsreader have no optical size axis, so Potluck’s large headings look a little different (the browser sets optical size to the text size); Figma draws Inter a hair wider than Chrome, so some one-line labels and buttons are 1 to 2px wider; and Figma rounds each text box up to a whole pixel, so long screens run a few pixels taller.';
  n.fills = [ink];
  header.appendChild(t); header.appendChild(n);
  n.textAutoResize = 'HEIGHT'; n.resize(1200, n.height);
  page.appendChild(header);
}
header.x = 0; header.y = 0;
let y = header.height + 80;
const placed = [];
for (const b of boxes) {
  b.x = 0; b.y = y;
  y += b.height + 80;
  placed.push(b.name);
}
return { order: placed, totalHeight: Math.round(y), headerId: header.id };