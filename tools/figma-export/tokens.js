// Prints Potluck's and the prototype frame's colours from styles.css, as the
// TOKENS object 00-prepare-file.js needs, named as capture.js names them.
// Usage: node tools/figma-export/tokens.js
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.resolve(__dirname, '../../styles.css'), 'utf8');
const out = {};
for (const m of css.matchAll(/--(pl-[a-z-]+|bp-[a-z-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) {
  let hex = m[2].toLowerCase();
  if (hex.length === 4) hex = '#' + [...hex.slice(1)].map((c) => c + c).join('');
  const name = m[1].replace(/^pl-/, 'potluck/').replace(/^bp-/, 'frame/');
  if (!out[name]) out[name] = hex;
}
console.log(JSON.stringify(out));
