// Encodes payloads as SVG files whose <text> lines carry JSON, for upload_assets.
// Usage: node carrier.js <outDir> name=file.json|file.js ...
// A .js file is carried as a JSON string (its source); a .json file as its parsed value.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const CHUNK = 3000;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// ASCII-only, no spaces: SVG text import must not touch whitespace or encodings
const pack = (value) => JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).replace(/ /g, '\\u0020');

for (const arg of process.argv.slice(3)) {
  const [name, file] = arg.split('=');
  const raw = fs.readFileSync(file, 'utf8');
  const body = pack(file.endsWith('.js') ? raw : JSON.parse(raw));
  const n = Math.ceil(body.length / CHUNK);
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(`<text x="0" y="${(i + 1) * 16}" font-family="Inter" font-size="10">${esc(`@@${name}#${i}/${n}@@` + body.slice(i * CHUNK, (i + 1) * CHUNK))}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${(n + 1) * 16}" viewBox="0 0 400 ${(n + 1) * 16}">${lines.join('')}</svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
  console.log(`${name}: ${body.length} chars, ${n} chunks, ${svg.length} bytes`);
}
