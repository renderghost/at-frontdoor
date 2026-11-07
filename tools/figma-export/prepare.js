// Post-processes captured specs: component signatures and unique variant names,
// text-style catalogue, icon table, unmapped colours. Usage: node prepare.js <specsDir> <outDir>
const fs = require('fs');
const path = require('path');
const SPECS = process.argv[2];
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });

const KEY_CLASS = {
  'Account menu': 'acct-menu', 'Menu item': 'am-item', 'Welcome banner': 'banner', 'Two accounts': 'two-accounts', Handshake: 'handshake',
  'Provider option': 'provider-opt', Suggestion: 'combo-opt', 'Browser account': 'fedcm-acct', Notice: 'notice', Autofill: 'autofill', 'Account row': 'acct',
  'Browser tab': 'tab', 'Address bar': 'omnibox', 'Browser button': 'nav-btn', 'Sheet header': 'sheet-top', 'Sheet footer': 'sheet-foot',
  'Provider header': 'pv-head', 'Provider footer': 'pv-foot', 'Potluck header': 'pl-head', 'Recipe card': 'recipe-btn', 'Mini recipe': 'mini-recipe',
  'Mail list item': 'wm-item', 'Mail notification': 'notif-card', Toast: 'toast', Switch: 'switch', 'Password input': 'pw-wrap', 'Handle input': 'suffix-input',
  'Locked input': 'locked-input', Disclosure: 'disclosure', Chip: 'chip', Tag: 'tag', Button: 'btn', 'Atmosphere button': 'atmo-btn', 'Potluck button': 'pl-btn',
  'Icon button': 'icon-btn', Avatar: 'avatar', Tile: 'tile', 'Food tile': 'food', Input: 'input',
};
const r1 = (v) => Math.round(v * 10) / 10;
const tsKey = (st) => `${st.f || 'Inter'}|${st.z}|${st.w}|${st.lh}|${st.ls || 0}|${st.tt || ''}`;

const files = [];
for (const mode of ['desktop', 'phone']) {
  const idx = JSON.parse(fs.readFileSync(path.join(SPECS, mode, '_index.json'), 'utf8'));
  for (const e of idx) files.push({ mode, ...e, spec: JSON.parse(fs.readFileSync(path.join(SPECS, mode, `${e.file}.json`), 'utf8')) });
}
const icons = { ...JSON.parse(fs.readFileSync(path.join(SPECS, 'desktop', '_icons.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(SPECS, 'phone', '_icons.json'), 'utf8')) };

// ---- signatures ----
function sigOf(n, isRoot) {
  if (!n) return '';
  switch (n.t) {
    case 'T': return 'T' + JSON.stringify([tsKey(n.st), n.st.c, n.st.u, n.st.it, n.al, n.el, n.ln > 1 ? 1 : 0, n.sw, n.ab ? 1 : 0]);
    case 'I': return `I${n.i}:${r1(n.w)}`;
    case 'M': return `M:${r1(n.w)}`;
    case 'S': return `S:${n.spring ? 'spring' : `${r1(n.w)}x${r1(n.h)}`}`;
    default: {
      if (n.k && !isRoot) return 'K:' + n.k;
      const leaf = !(Array.isArray(n.c) ? n.c : []).some((c) => c.t === 'T' || c.t === 'F');
      const own = [n.n, n.k ? n.cls : null, n.L, n.g, n.cg, n.wr, n.p, n.ai, n.ci, n.bg, n.gr, n.bd, n.dash, n.r, n.fx, n.op, n.clip, isRoot ? null : n.sw, isRoot ? null : n.sh, n.ab ? 1 : 0, n.off, leaf ? [r1(n.w), r1(n.h)] : null];
      return 'F' + JSON.stringify(own) + '[' + (Array.isArray(n.c) ? n.c : []).map((c) => sigOf(c, false)).join(',') + ']';
    }
  }
}
const labelOf = (n) => {
  const key = KEY_CLASS[n.k];
  const cls = (n.cls || '').split(/\s+/).filter(Boolean);
  let parts = cls.filter((c) => c !== key && !/^(icon|lucide)/.test(c)).map((c) => c.replace(new RegExp(`^${key}-`), '').replace(/^is-/, ''));
  if (n.k === 'Tile' || n.k === 'Food tile') {
    const ic = (n.c || []).find((c) => c.t === 'I');
    const gl = (n.c || []).find((c) => c.t === 'T' || (c.c && c.c[0] && c.c[0].t === 'T'));
    if (ic) parts.push(ic.i);
    else if (gl) parts.push('glyph ' + (gl.s || gl.c[0].s));
  }
  if (n.k === 'Input') parts = parts.filter((p) => p !== 'input');
  if (n.k !== 'Tile' && n.k !== 'Food tile') {
    const ic = (n.c || []).find((c) => c.t === 'I') || ((n.c || []).find((c) => c.t === 'F' && (c.c || []).some((q) => q.t === 'I')) || { c: [] }).c.find((q) => q.t === 'I');
    if (ic) parts.push(ic.i);
  }
  return parts.join(' ') || 'default';
};

const compSigs = new Map(); // sig -> name
const labelsUsed = new Map(); // key -> Map(label -> count)
const textStyles = new Map(); // tsKey -> {count, names}
const colours = new Map();
const walk = (n, fn) => { if (!n) return; if ((n.t === 'I' || n.t === 'M') && typeof n.c === 'string') { n.col = n.c; delete n.c; } fn(n); (Array.isArray(n.c) ? n.c : []).forEach((c) => walk(c, fn)); };

// A wrapping paragraph that ends at its row's content edge fills the rest of the row
const fillRest = (n) => {
  if (n.t !== 'F' || n.L !== 'H' || n.wr || !Array.isArray(n.c)) return;
  const flow = n.c.filter((c) => !c.ab && c.t !== 'S');
  const last = flow[flow.length - 1];
  if (!last || last.t !== 'T' || !(last.ln > 1)) return;
  const right = n.w - (n.p ? n.p[1] : 0) - (n.bd ? n.bd[0][1] : 0);
  if (Math.abs(last.x + last.w - right) < 2) last.sw = 'F';
};
for (const f of files) for (const tree of [f.spec.browser, f.spec.notes, f.spec.notif]) walk(tree, fillRest);

for (const f of files) {
  for (const tree of [f.spec.browser, f.spec.notes, f.spec.notif]) {
    walk(tree, (n) => {
      if (n.t === 'F' && n.k) {
        const sig = sigOf(n, true);
        if (!compSigs.has(sig)) {
          const base = labelOf(n);
          const used = labelsUsed.get(n.k) || new Map();
          labelsUsed.set(n.k, used);
          const cnt = (used.get(base) || 0) + 1;
          used.set(base, cnt);
          compSigs.set(sig, `${n.k} / ${cnt > 1 ? `${base} ${cnt}` : base}`);
        }
        n.cn = compSigs.get(sig);
      }
      if (n.t === 'T') {
        const k = tsKey(n.st);
        const e = textStyles.get(k) || { count: 0, names: {} };
        e.count++;
        e.names[n.n] = (e.names[n.n] || 0) + 1;
        textStyles.set(k, e);
      }
      for (const c of [n.bg, n.bd && n.bd[1], n.st && n.st.c]) if (c && c.startsWith('#')) colours.set(c, (colours.get(c) || 0) + 1);
      if ((n.t === 'I' || n.t === 'M') && n.col && n.col.startsWith('#')) colours.set(n.col, (colours.get(n.col) || 0) + 1);
    });
  }
}

// ---- text style names ----
const styleNames = {};
const takenNames = new Set();
const sorted = [...textStyles.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [k, e] of sorted) {
  const [fam, z, w] = k.split('|');
  const top = Object.entries(e.names).sort((a, b) => b[1] - a[1]).map(([n]) => n).find((n) => !['text', 'value', 'span', 'p', 'strong', 'label', 'button', 'a', 'li', 'dd', 'dt'].includes(n));
  let name = top || `${fam === 'Mono' ? 'mono' : 'text'} ${z}/${w}`;
  if (takenNames.has(name)) name = `${name} ${z}/${w}`;
  if (takenNames.has(name)) name = `${name} ${k.split('|').slice(3).join(' ')}`;
  takenNames.add(name);
  styleNames[k] = `Prototype/${name}`;
}
// attach style names to text nodes
for (const f of files) for (const tree of [f.spec.browser, f.spec.notes, f.spec.notif]) walk(tree, (n) => { if (n.t === 'T') n.ts = styleNames[tsKey(n.st)]; });

// ---- repeating gradients become small PNG tiles (a ruled line every N px) ----
const zlib = require('zlib');
const cssText = fs.readFileSync(path.resolve(__dirname, '../../styles.css'), 'utf8');
const hexOf = {};
for (const m of cssText.matchAll(/--((?:accent|error|link|automated)-\d+|ink|paper|smoke|pl-[a-z-]+|bp-[a-z-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) {
  let hex = m[2].toLowerCase();
  if (hex.length === 4) hex = '#' + [...hex.slice(1)].map((c) => c + c).join('');
  const name = m[1].replace(/^pl-/, 'potluck/').replace(/^bp-/, 'frame/').replace(/-(\d+)$/, '/$1');
  if (!hexOf[name]) hexOf[name] = hex;
}
const rgbaOf = (tok) => {
  if (!tok) return null;
  const [name, a] = tok.split('@');
  const hex = name.startsWith('#') ? name : hexOf[name];
  if (!hex) return null;
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(255 * (a === undefined ? 1 : Number(a)))];
};
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const pngOf = (w, h, pixel) => {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const p = pixel(x, y); p.forEach((v, i) => { raw[y * (w * 4 + 1) + 1 + x * 4 + i] = v; }); } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
};
const tiles = {};
const tileFor = (g) => {
  const stops = g.s.filter((s) => s[1] !== null && s[2] === 'px');
  if (!stops.length) return null;
  const period = Math.round(stops[stops.length - 1][1]);
  if (!(period > 0)) return null;
  const colourAt = (t) => {
    let prev = stops[0], next = stops[stops.length - 1];
    for (const s of stops) { if (s[1] <= t) prev = s; }
    for (const s of stops) { if (s[1] > t) { next = s; break; } }
    const c = rgbaOf(prev[0]) || (rgbaOf(next[0]) ? [...rgbaOf(next[0]).slice(0, 3), 0] : [0, 0, 0, 0]);
    return c;
  };
  const vertical = g.a === 180 || g.a === 0;
  const key = JSON.stringify([g.a, stops]);
  if (!tiles[key]) {
    const id = 't' + Object.keys(tiles).length;
    const b64 = vertical ? pngOf(1, period, (x, y) => colourAt(y + 0.5)) : pngOf(period, 1, (x) => colourAt(x + 0.5));
    tiles[key] = { id, png: b64, w: vertical ? 1 : period, h: vertical ? period : 1 };
  }
  return tiles[key].id;
};
for (const f of files) for (const tree of [f.spec.browser, f.spec.notes, f.spec.notif]) walk(tree, (n) => {
  if (n.gr) for (const g of n.gr) if (g.rep) g.tile = tileFor(g);
});

const foundations = {
  tiles: Object.fromEntries(Object.values(tiles).map((t) => [t.id, t])),
  textStyles: Object.entries(styleNames).map(([k, name]) => {
    const [fam, z, w, lh, ls, tt] = k.split('|');
    return { name, fam, z: Number(z), w: Number(w), lh: Number(lh), ls: Number(ls), tt };
  }),
  icons,
};
fs.writeFileSync(path.join(OUT, 'foundations.json'), JSON.stringify(foundations));
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
const manifest = [];
for (const f of files) {
  fs.writeFileSync(path.join(OUT, 'screens', `${f.mode}-${f.file}.json`), JSON.stringify(f.spec));
  manifest.push({ key: `${f.mode}-${f.file}`, mode: f.mode, scenario: f.scenario, id: f.id, label: f.label, w: f.size.w, h: f.size.h, notesW: f.spec.notes ? f.spec.notes.w : 0, notesX: f.spec.notesAt ? f.spec.notesAt.x : 0 });
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

const perKey = {};
for (const name of compSigs.values()) { const k = name.split(' / ')[0]; perKey[k] = (perKey[k] || 0) + 1; }
console.log('components (variants per key):', JSON.stringify(perKey));
console.log('total component variants:', compSigs.size, '| text styles:', textStyles.size, '| icons:', Object.keys(icons).length);
console.log('unmapped colours:', JSON.stringify([...colours.entries()]));
