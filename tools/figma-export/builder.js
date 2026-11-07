// Figma-side builder. Loaded in use_figma with: const B = new Function(source)();
const W_INTER = { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold' };
const W_MONO = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'Bold' };
const MONO = 'Roboto Mono';
const W_NAMED = { 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const FAMILY = { Fraunces: 'Fraunces', Newsreader: 'Newsreader', Comic: 'Comic Neue' };
const fontOf = (st) => {
  if (st.f === 'Mono') return { family: MONO, style: W_MONO[st.w] || 'Regular' };
  if (FAMILY[st.f]) {
    const base = W_NAMED[st.w] || 'Regular';
    return { family: FAMILY[st.f], style: st.it ? (base === 'Regular' ? 'Italic' : `${base} Italic`) : base };
  }
  const base = W_INTER[st.w] || 'Regular';
  return { family: 'Inter', style: st.it ? (base === 'Regular' ? 'Italic' : `${base} Italic`) : base };
};
const S = { vars: {}, vals: {}, styles: {}, comps: {}, compPage: null, frames: {}, icons: {}, newComps: 0, nodes: 0, warn: [] };

async function setup(opts) {
  const colls = await figma.variables.getLocalVariableCollectionsAsync();
  const modeOf = {};
  for (const c of colls) modeOf[c.id] = c.modes[0].modeId;
  for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) {
    S.vars[v.name] = v;
    S.vals[v.name] = v.valuesByMode[modeOf[v.variableCollectionId]];
  }
  for (const s of await figma.getLocalTextStylesAsync()) S.styles[s.name] = s;
  const fonts = [];
  for (const st of Object.values(W_INTER)) { fonts.push({ family: 'Inter', style: st }); fonts.push({ family: 'Inter', style: st === 'Regular' ? 'Italic' : `${st} Italic` }); }
  for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold']) fonts.push({ family: MONO, style: st });
  const named = { Fraunces: ['Light', 'Regular', 'SemiBold', 'Bold', 'Black'], Newsreader: ['ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'], 'Comic Neue': ['Light', 'Regular', 'Bold'] };
  for (const [family, list] of Object.entries(named)) for (const st of list) { fonts.push({ family, style: st }); fonts.push({ family, style: st === 'Regular' ? 'Italic' : `${st} Italic` }); }
  await Promise.all(fonts.map((f) => figma.loadFontAsync(f).catch(() => S.warn.push('font ' + f.family + ' ' + f.style))));
  if (opts.compPageId) {
    S.compPage = await figma.getNodeByIdAsync(opts.compPageId);
    await S.compPage.loadAsync();
    for (const c of S.compPage.findAllWithCriteria({ types: ['COMPONENT'] })) S.comps[c.name] = c;
    for (const f of S.compPage.children) if (f.type === 'FRAME') S.frames[f.name] = f;
  }
  S.icons = opts.icons || {};
  S.tiles = opts.tiles || {};
  S.tileHash = {};
}

// CSS gradient layers -> Figma paints (bottom layer first, as Figma stacks fills)
function gradientPaints(n) {
  const out = [];
  for (const g of [...(n.gr || [])].reverse()) {
    if (g.rep) {
      const t = g.tile && S.tiles[g.tile];
      if (!t) { S.warn.push('tile ' + g.tile); continue; }
      if (!S.tileHash[g.tile]) S.tileHash[g.tile] = figma.createImage(figma.base64Decode(t.png)).hash;
      out.push({ type: 'IMAGE', imageHash: S.tileHash[g.tile], scaleMode: 'TILE', scalingFactor: 1 });
      continue;
    }
    const horiz = g.a === 90 || g.a === 270;
    const L = (horiz ? n.w : n.h) || 1;
    const raw = g.s.map(([c, v, u], i, arr) => [c, v === null ? (i === 0 ? 0 : i === arr.length - 1 ? 1 : null) : u === '%' ? v / 100 : v / L]);
    for (let i = 0; i < raw.length; i++) if (raw[i][1] === null) raw[i][1] = (raw[i - 1][1] + (raw[i + 1] ? raw[i + 1][1] : 1)) / 2;
    const stops = [];
    let last = -1;
    raw.forEach(([c, p], i) => {
      let pos = Math.min(1, Math.max(0, p));
      if (pos <= last) pos = Math.min(1, last + 0.0001);
      last = pos;
      const ref = c || (raw.slice(i).find((r) => r[0]) || raw.slice(0, i).reverse().find((r) => r[0]) || [null])[0];
      const base = ref ? rgba(ref) : { r: 0, g: 0, b: 0, a: 0 };
      const stop = { position: pos, color: { r: base.r, g: base.g, b: base.b, a: c ? base.a : 0 } };
      const [name] = c ? splitTok(c) : [null];
      if (c && name && !name.startsWith('#') && S.vars[name] && !c.includes('@')) stop.boundVariables = { color: figma.variables.createVariableAlias(S.vars[name]) };
      stops.push(stop);
    });
    const tf = g.a === 90 ? [[1, 0, 0], [0, 1, 0]] : g.a === 270 ? [[-1, 0, 1], [0, -1, 1]] : g.a === 0 ? [[0, -1, 1], [1, 0, 0]] : [[0, 1, 0], [-1, 0, 1]];
    out.push({ type: 'GRADIENT_LINEAR', gradientTransform: tf, gradientStops: stops });
  }
  return out;
}

const hexRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
function splitTok(tok) { const i = tok.indexOf('@'); return i < 0 ? [tok, undefined] : [tok.slice(0, i), parseFloat(tok.slice(i + 1))]; }
function paint(tok) {
  if (!tok) return null;
  const [name, a] = splitTok(tok);
  if (name.startsWith('#')) return { type: 'SOLID', color: hexRgb(name), opacity: a === undefined ? 1 : a };
  const v = S.vars[name];
  if (!v) { S.warn.push('var ' + name); return { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: a === undefined ? 1 : a }; }
  const b = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
  return a === undefined ? b : { ...b, opacity: a };
}
function rgba(tok) {
  const [name, a] = splitTok(tok);
  if (name.startsWith('#')) return { ...hexRgb(name), a: a === undefined ? 1 : a };
  const v = S.vals[name] || { r: 0, g: 0, b: 0, a: 1 };
  return { r: v.r, g: v.g, b: v.b, a: (v.a === undefined ? 1 : v.a) * (a === undefined ? 1 : a) };
}

function applyBox(f, n) {
  if (n.r !== undefined) {
    if (Array.isArray(n.r)) { f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1]; f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3]; }
    else f.cornerRadius = n.r;
  }
  if (n.fx) f.effects = n.fx.map(([c, x, y, b, s, ins]) => ({ type: ins ? 'INNER_SHADOW' : 'DROP_SHADOW', color: rgba(c), offset: { x, y }, radius: b, spread: s, visible: true, blendMode: 'NORMAL' }));
  if (n.op !== undefined) f.opacity = n.op;
  f.clipsContent = !!n.clip;
  if (n.bd) {
    const [w, c] = n.bd;
    f.strokeAlign = 'INSIDE';
    if (w.every((x) => x === w[0])) f.strokeWeight = w[0];
    else { f.strokeTopWeight = w[0]; f.strokeRightWeight = w[1]; f.strokeBottomWeight = w[2]; f.strokeLeftWeight = w[3]; }
    if (n.dash) f.dashPattern = [4, 3];
    f.strokes = [paint(c)];
  } else f.strokes = [];
  f.fills = [...(n.bg ? [paint(n.bg)] : []), ...gradientPaints(n)];
}
function applyLayout(f, n) {
  if (n.L === 'H' || n.L === 'V') {
    f.layoutMode = n.L === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    f.strokesIncludedInLayout = true;
    f.itemSpacing = n.g || 0;
    if (n.wr) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = Math.max(0, n.cg || 0); }
    f.primaryAxisAlignItems = n.ai || 'MIN';
    f.counterAxisAlignItems = n.ci === 'BASELINE' && n.L !== 'H' ? 'MIN' : n.ci || 'MIN';
    const p = n.p || [0, 0, 0, 0];
    f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
  } else {
    f.layoutMode = 'NONE';
    f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  }
}

async function makeText(n) {
  const t = figma.createText();
  const st = n.st;
  const style = n.ts && S.styles[n.ts];
  if (style) await t.setTextStyleIdAsync(style.id);
  else {
    t.fontName = fontOf(st);
    t.fontSize = st.z;
    t.lineHeight = { unit: 'PIXELS', value: st.lh };
    if (st.ls) t.letterSpacing = { unit: 'PIXELS', value: st.ls };
    if (st.tt === 'U') t.textCase = 'UPPER';
  }
  if (st.it) t.fontName = fontOf(st);
  t.characters = n.s;
  t.name = n.n || 'text';
  applyRuns(t, n, false);
  if (n.al) t.textAlignHorizontal = n.al === 'C' ? 'CENTER' : 'RIGHT';
  S.nodes++;
  return t;
}
function decorate(t, s, e, u) {
  try {
    t.setRangeTextDecoration(s, e, 'UNDERLINE');
    t.setRangeTextDecorationColor(s, e, { value: paint(u[0]) });
    t.setRangeTextDecorationThickness(s, e, { unit: 'PIXELS', value: u[1] });
  } catch (err) { S.warn.push('deco ' + String(err).slice(0, 60)); }
}
function applyRuns(t, n, reset) {
  const st = n.st;
  const len = t.characters.length;
  if (reset && len) {
    t.setRangeFontName(0, len, fontOf(st));
    t.setRangeFontSize(0, len, st.z);
    t.setRangeTextDecoration(0, len, 'NONE');
  }
  if (len) t.setRangeFills(0, len, [paint(st.c)]);
  if (st.u && len) decorate(t, 0, len, st.u);
  for (const [s, e, r] of n.r || []) {
    if (e > len || s >= e) continue;
    if (r.w !== st.w || r.f !== st.f || r.it !== st.it) t.setRangeFontName(s, e, fontOf(r));
    if (r.z !== st.z) t.setRangeFontSize(s, e, r.z);
    if (r.c !== st.c) t.setRangeFills(s, e, [paint(r.c)]);
    if (r.u) decorate(t, s, e, r.u);
    if ((r.ls || 0) !== (st.ls || 0)) t.setRangeLetterSpacing(s, e, { unit: 'PIXELS', value: r.ls || 0 });
  }
}

function container(key) {
  let f = S.frames[key];
  if (!f) {
    f = figma.createFrame();
    f.name = key;
    f.layoutMode = 'HORIZONTAL';
    f.layoutWrap = 'WRAP';
    f.itemSpacing = 24; f.counterAxisSpacing = 24;
    f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = 32;
    f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'AUTO';
    f.resize(1200, 100);
    f.cornerRadius = 16;
    f.fills = [paint('paper')];
    f.strokes = [paint('line')]; f.strokeWeight = 1;
    S.compPage.appendChild(f);
    const below = S.compPage.children.filter((c) => c !== f).reduce((m, c) => Math.max(m, c.y + c.height), 0);
    f.x = 0; f.y = below + 80;
    S.frames[key] = f;
  }
  return f;
}

function svgNode(kind, name, size, sw) {
  const svg = kind === 'mark'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#000000"/><path d="M12 2.75a9.25 9.25 0 1 1-8.01 4.62" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round">${S.icons[name] || ''}</svg>`;
  return figma.createNodeFromSvg(svg);
}
function recolour(root, tok) {
  for (const v of root.findAll((x) => x.type !== 'FRAME' && x.type !== 'INSTANCE' && x.type !== 'COMPONENT')) {
    if ('strokes' in v && v.strokes.length) v.strokes = v.strokes.map(() => paint(tok));
    if ('fills' in v && v.fills.length) v.fills = v.fills.map(() => paint(tok));
  }
}
async function glyphMain(kind, name, size, sw) {
  const sz = Math.round(size * 100) / 100;
  const cname = kind === 'mark' ? `Atmosphere mark / ${sz}` : `Icon / ${name} / ${sz}${sw && sw !== 2 ? ` / stroke ${sw}` : ''}`;
  if (S.comps[cname]) return S.comps[cname];
  const c = figma.createComponent();
  c.name = cname;
  container(kind === 'mark' ? 'Atmosphere mark' : 'Icons').appendChild(c);
  c.resize(sz, sz);
  c.fills = [];
  c.clipsContent = false;
  const f = svgNode(kind, name, sz, sw);
  for (const ch of [...f.children]) c.appendChild(ch);
  f.remove();
  recolour(c, 'ink');
  S.comps[cname] = c;
  S.newComps++;
  return c;
}
async function glyphInstance(n) {
  // An SVG keeps its aspect ratio: the drawing is as big as the box's smaller side
  const main = await glyphMain(n.t === 'M' ? 'mark' : 'icon', n.i, Math.min(n.w, n.h || n.w), n.sw);
  const inst = main.createInstance();
  inst.name = n.t === 'M' ? 'mark' : `icon/${n.i}`;
  if (n.col && n.col !== 'ink') recolour(inst, n.col);
  S.nodes++;
  return inst;
}

// ---- frames, components, instances ----
async function fillFrame(f, n, pairs) {
  f.name = n.n || 'frame';
  applyLayout(f, n);
  applyBox(f, n);
  for (const k of n.c || []) await build(k, f, pairs);
}
async function buildMain(n) {
  const c = figma.createComponent();
  container(n.k).appendChild(c);
  const pairs = [];
  await fillFrame(c, n, pairs);
  c.name = n.cn;
  // A component that fills its slot gets that slot's width
  if (c.layoutMode !== 'NONE') {
    if (n.sw === 'F') { c.layoutSizingHorizontal = 'FIXED'; c.resize(n.w, c.height); }
    if (n.sh === 'F') { c.layoutSizingVertical = 'FIXED'; c.resize(c.width, n.h); }
  }
  pairs.push([c, n]);
  verify(pairs);
  S.comps[n.cn] = c;
  S.newComps++;
  return c;
}
async function override(node, n, isRoot) {
  if (!node || !n) return;
  if (n.t === 'T') {
    if (node.type !== 'TEXT') return;
    if (node.characters !== n.s) node.characters = n.s;
    applyRuns(node, n, true);
    if ((n.ln > 1 || n.el) && node.layoutSizingHorizontal === 'FIXED' && Math.abs(node.width - n.w) > 1) {
      node.resize(n.w, node.height);
      // Text inside an instance ignores resize; fill the slot instead
      if (Math.abs(node.width - n.w) > 1 && node.parent && node.parent.layoutMode && node.parent.layoutMode !== 'NONE') node.layoutSizingHorizontal = 'FILL';
    }
    return;
  }
  if (n.t === 'I' || n.t === 'M') { if (n.col && n.col !== 'ink') recolour(node, n.col); return; }
  if (n.t === 'S') return;
  if (n.k && n.cn && !isRoot) {
    if (node.type === 'INSTANCE') {
      const want = S.comps[n.cn] || (await buildMain(n));
      const cur = await node.getMainComponentAsync();
      if (!cur || cur.id !== want.id) node.swapComponent(want);
      await override(node, n, true);
    }
    return;
  }
  const kids = 'children' in node ? node.children : [];
  const spec = n.c || [];
  for (let i = 0; i < spec.length && i < kids.length; i++) {
    let kid = kids[i];
    if (spec[i].off && kid.name === 'offset' && kid.children.length) kid = kid.children[0];
    await override(kid, spec[i], false);
  }
  if (!isRoot && 'layoutSizingHorizontal' in node && node.type !== 'TEXT') {
    if (node.layoutSizingHorizontal === 'FIXED' && Math.abs(node.width - n.w) > 1.5) node.resize(n.w, node.height);
    if (node.layoutSizingVertical === 'FIXED' && Math.abs(node.height - n.h) > 1.5) node.resize(node.width, n.h);
  }
}

async function build(n, parent, pairs) {
  let node;
  if (n.t === 'T') node = await makeText(n);
  else if (n.t === 'I' || n.t === 'M') node = await glyphInstance(n);
  else if (n.t === 'S') {
    node = figma.createFrame();
    node.name = n.spring ? 'spring' : 'spacer';
    node.fills = [];
    node.resize(Math.max(0.01, n.w || 0.01), Math.max(0.01, n.h || 0.01));
  } else if (n.k && n.cn) {
    const main = S.comps[n.cn] || (await buildMain(n));
    node = main.createInstance();
    await override(node, n, true);
    S.nodes++;
  } else {
    node = figma.createFrame();
    await fillFrame(node, n, pairs);
    S.nodes++;
  }
  const inAL = parent.layoutMode && parent.layoutMode !== 'NONE';
  let target = node;
  if (n.off && inAL && !n.ab) {
    const w = figma.createFrame();
    w.name = 'offset';
    w.fills = [];
    w.clipsContent = false;
    w.layoutMode = parent.layoutMode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL';
    if (parent.layoutMode === 'HORIZONTAL') w.paddingTop = n.off; else w.paddingLeft = n.off;
    w.primaryAxisSizingMode = 'AUTO'; w.counterAxisSizingMode = 'AUTO';
    w.appendChild(node);
    target = w;
  }
  parent.appendChild(target);
  // Sizing and position
  const isText = node.type === 'TEXT';
  if (isText) {
    // One line hugs (Figma's Inter runs a hair wider than Chrome's); alignment only matters if the box is wider than the text
    const truncates = n.el && n.tw !== undefined && n.tw > n.w + 0.5;
    const wraps = n.ln > 1 || truncates || (n.al && n.tw !== undefined && n.w - n.tw > 4);
    if (wraps) {
      node.textAutoResize = 'HEIGHT';
      if (inAL && !n.ab && !n.bal && (n.sw === 'F' || (n.anon && n.ln > 1))) node.layoutSizingHorizontal = 'FILL';
      else node.resize(Math.max(1, n.bal && n.tw ? n.tw + 2 : n.w), node.height);
      if (truncates) { node.textAutoResize = 'NONE'; node.resize(Math.max(1, n.w), n.h); node.textTruncation = 'ENDING'; }
    } else node.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  if (inAL && n.ab) {
    target.layoutPositioning = 'ABSOLUTE';
    target.x = n.x; target.y = n.y;
    if (!isText && node.type !== 'INSTANCE' && 'layoutMode' in node && node.layoutMode !== 'NONE') {
      node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
      node.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
    }
  } else if (inAL) {
    if (n.t === 'S' && n.spring) target.layoutSizingHorizontal = 'FILL';
    else {
      if (n.sw === 'F' && !isText) target.layoutSizingHorizontal = 'FILL';
      if (n.sh === 'F' && !isText) target.layoutSizingVertical = 'FILL';
    }
  } else {
    target.x = n.x; target.y = n.y;
  }
  if (node.type !== 'TEXT' && n.t !== 'S' && n.t !== 'I' && n.t !== 'M') pairs.push([node, n]);
  return node;
}
// Pin any hug size that disagrees with the browser (post-order: children first).
function verify(pairs) {
  for (const [node, n] of pairs) {
    if (node.removed || !('layoutMode' in node)) continue;
    const al = node.layoutMode !== 'NONE';
    const parentAL = node.parent && 'layoutMode' in node.parent && node.parent.layoutMode !== 'NONE' && node.layoutPositioning !== 'ABSOLUTE';
    if (!al && node.type !== 'INSTANCE') continue;
    const hz = parentAL || al ? node.layoutSizingHorizontal : 'FIXED';
    const vt = parentAL || al ? node.layoutSizingVertical : 'FIXED';
    // Pin when CSS made the box bigger than its content, or when it is far off; never squeeze content Figma sets a little larger
    const dw = node.width - n.w, dh = node.height - n.h;
    if (hz === 'HUG' && (dw < -1.5 || dw > 8)) { node.layoutSizingHorizontal = 'FIXED'; node.resize(Math.max(0.01, n.w), node.height); }
    if (vt === 'HUG' && (dh < -1.5 || dh > 8)) { node.layoutSizingVertical = 'FIXED'; node.resize(node.width, Math.max(0.01, n.h)); }
    if (node.type === 'INSTANCE' && !parentAL && (Math.abs(node.width - n.w) > 1.5 || Math.abs(node.height - n.h) > 1.5)) node.resize(n.w, n.h);
  }
}

async function label(text, style, parent) {
  const t = figma.createText();
  if (S.styles[style]) await t.setTextStyleIdAsync(S.styles[style].id);
  t.characters = text;
  t.fills = [paint('ink')];
  parent.appendChild(t);
  return t;
}
// One screen: label, browser window, notes panel, notification.
async function buildGroup(spec, at) {
  const g = figma.createFrame();
  g.name = at.name || spec.label;
  g.layoutMode = 'VERTICAL';
  g.itemSpacing = 16;
  g.primaryAxisSizingMode = 'AUTO'; g.counterAxisSizingMode = 'AUTO';
  g.fills = [];
  g.clipsContent = false;
  figma.currentPage.appendChild(g);
  g.x = at.x; g.y = at.y;
  const head = figma.createFrame();
  head.name = 'Label';
  head.layoutMode = 'VERTICAL'; head.itemSpacing = 4; head.fills = [];
  head.primaryAxisSizingMode = 'AUTO'; head.counterAxisSizingMode = 'AUTO';
  g.appendChild(head);
  await label(at.title || spec.label, 'board/section', head);
  if (at.caption) await label(at.caption, 'board/caption', head);
  const body = figma.createFrame();
  body.name = 'Screen';
  body.fills = [];
  body.clipsContent = false;
  g.appendChild(body);
  const pairs = [];
  const br = await build(spec.browser, body, pairs);
  br.name = 'Browser window';
  br.x = 0; br.y = 0;
  let W = spec.browser.w, H = spec.browser.h;
  if (spec.notes) {
    const nt = await build(spec.notes, body, pairs);
    nt.name = 'Notes';
    nt.x = spec.notesAt.x; nt.y = Math.max(0, spec.notesAt.y);
    W = Math.max(W, nt.x + spec.notes.w); H = Math.max(H, nt.y + spec.notes.h);
  }
  if (spec.notif) {
    const no = await build(spec.notif, body, pairs);
    no.name = 'Notification';
    no.x = spec.notifAt.x; no.y = Math.max(0, spec.notifAt.y);
    W = Math.max(W, no.x + spec.notif.w);
  }
  body.resize(W, H);
  verify(pairs);
  return { id: g.id, x: g.x, y: g.y, w: g.width, h: g.height };
}

async function readPayloads(importPageId, names) {
  const imp = await figma.getNodeByIdAsync(importPageId);
  await imp.loadAsync();
  const out = {};
  const used = [];
  for (const t of imp.findAllWithCriteria({ types: ['TEXT'] })) {
    const m = t.characters.slice(0, 120).match(/^@@([^#]+)#(\d+)\/(\d+)@@/);
    if (!m || (names && !names.includes(m[1]))) continue;
    (out[m[1]] = out[m[1]] || []).push([Number(m[2]), t.characters.slice(m[0].length)]);
    used.push(t);
  }
  const res = {};
  for (const [k, parts] of Object.entries(out)) res[k] = JSON.parse(parts.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join(''));
  return { res, used };
}
function removeCarriers(used) {
  const tops = new Set();
  for (const t of used) {
    if (t.removed) continue;
    let top = t;
    while (top.parent && top.parent.type !== 'PAGE') top = top.parent;
    tops.add(top);
  }
  for (const top of tops) if (!top.removed) top.remove();
}

return { setup, buildGroup, readPayloads, removeCarriers, S, paint };
