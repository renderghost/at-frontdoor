// Run with the use_figma tool after 05. Captures can catch a button mid-hover;
// list the button-like variants' fills first (read-only) and adjust FIXES to
// the hover copies found (a primary button in accent/300, its hover colour).
// These were the ones in the last run.
const comp = await figma.getNodeByIdAsync('16:55'); await comp.loadAsync();
for (const id of ['16:56', '16:57', '16:58', '16:59', '16:60']) { const p = await figma.getNodeByIdAsync(id); await p.loadAsync(); }
const sets = Object.fromEntries(comp.findAllWithCriteria({ types: ['COMPONENT_SET'] }).map(s => [s.name, s]));
const fixes = [['Button', 'Variant=primary block desktop', 'Variant=primary block'], ['Atmosphere button', 'Variant=default phone', 'Variant=default']];
const report = [];
for (const [setName, hoverName, restName] of fixes) {
  const set = sets[setName];
  const hover = set.children.find(c => c.name === hoverName);
  const rest = set.children.find(c => c.name === restName);
  if (!hover || !rest) { report.push(`${setName}: not found`); continue; }
  const insts = await hover.getInstancesAsync();
  let swapped = 0;
  for (const i of insts) { i.swapComponent(rest); swapped++; }
  const left = (await hover.getInstancesAsync()).length;
  if (left === 0) hover.remove();
  report.push(`${setName}: swapped ${swapped}, removed hover copy: ${left === 0}`);
}
const chip = sets['Chip'].children.find(c => c.name === 'Variant=moon-star desktop');
if (chip) { chip.name = 'Variant=selected moon-star'; report.push('Chip: renamed selected variant'); }
return report;