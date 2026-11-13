// Browser-side DOM -> Figma spec extractor. Injected into the prototype page.
// window.FD.extract(rootEl, cfg) returns a compact tree the Figma builder understands.
(() => {
  const r2 = (v) => Math.round(v * 100) / 100;
  const FACES = [400, 500, 600, 700, 800];
  // CSS font matching against the faces the prototype loads (400-800).
  // Figma has these named styles: Fraunces 300/400/600/700/900, Newsreader 200-800, Comic Neue 300/400/700.
  const snapWeight = (w, fam) => {
    if (fam === 'Comic') return w >= 550 ? 700 : w < 350 ? 300 : 400;
    if (fam === 'Fraunces') return w >= 850 ? 900 : w >= 650 ? 700 : w >= 550 ? 600 : w >= 350 ? 400 : 300;
    if (fam === 'Newsreader') return Math.min(800, Math.max(200, Math.round(w / 100) * 100));
    if (FACES.includes(w)) return w;
    if (w < 400) return 400;
    if (w < 500) return 500;
    return FACES.find((f) => f >= w) || 800;
  };
  const RUN_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'CODE', 'SPAN', 'SMALL', 'BUTTON', 'LABEL', 'ABBR', 'TIME', 'MARK', 'Q', 'SUP', 'SUB', 'WBR', 'BR', 'DT', 'DD']);

  let PALETTE = {};
  const parseColor = (s) => {
    const m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const hex2 = (n) => n.toString(16).padStart(2, '0');
  // Colour token: palette variable name, name@alpha, or #hex[@alpha]
  const tok = (s) => {
    const c = parseColor(s);
    if (!c || c.a === 0) return null;
    const hex = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
    if (hex === '#000000' && c.a < 1) {
      const a = Math.round(c.a * 100) / 100;
      if (a === 0.1) return 'line';
      if (a === 0.24) return 'line-strong';
      if (a === 0.36) return 'scrim';
      return `ink@${a}`;
    }
    const name = PALETTE[hex];
    const a = Math.round(c.a * 1000) / 1000;
    if (name) return a < 1 ? `${name}@${a}` : name;
    return a < 1 ? `${hex}@${a}` : hex;
  };
  const px = (v) => parseFloat(v) || 0;

  // CSS gradient layers -> [{a: angle, rep: 0|1, s: [[colourTok|null, value, unit]]}], first layer on top
  const splitTop = (str) => {
    const out = []; let depth = 0, cur = '';
    for (const ch of str) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  const gradients = (bi) => {
    if (!bi || bi === 'none') return null;
    const layers = [];
    for (const layer of splitTop(bi)) {
      const m = layer.match(/^(repeating-)?linear-gradient\((.*)\)$/);
      if (!m) continue;
      const parts = splitTop(m[2]);
      let a = 180;
      if (/^-?[\d.]+deg$/.test(parts[0])) a = parseFloat(parts.shift());
      else if (/^to /.test(parts[0])) { const d = parts.shift(); a = /right/.test(d) ? 90 : /left/.test(d) ? 270 : /top/.test(d) ? 0 : 180; }
      const s = [];
      for (const p of parts) {
        const cm = p.match(/^(rgba?\([^)]*\)|transparent|#[0-9a-f]+)\s*(.*)$/i);
        if (!cm) continue;
        const c = cm[1] === 'transparent' ? null : tok(cm[1]);
        const pos = cm[2].trim() ? cm[2].trim().split(/\s+/) : [];
        if (!pos.length) s.push([c, null, '']);
        for (const q of pos) s.push([c, parseFloat(q), q.endsWith('%') ? '%' : 'px']);
      }
      if (s.length) layers.push({ a, rep: m[1] ? 1 : 0, s });
    }
    return layers.length ? layers : null;
  };

  const hiddenEl = (e, cs, rect) => {
    if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    if (parseFloat(cs.opacity) === 0) return true;
    if (rect.width <= 1.5 && rect.height <= 1.5) return true;
    if (cs.clip && cs.clip.startsWith('rect(0')) return true;
    return false;
  };

  const hasBox = (cs) =>
    tok(cs.backgroundColor) ||
    (cs.backgroundImage && cs.backgroundImage !== 'none') ||
    px(cs.borderTopWidth) + px(cs.borderRightWidth) + px(cs.borderBottomWidth) + px(cs.borderLeftWidth) > 0 ||
    (cs.boxShadow && cs.boxShadow !== 'none');

  // Can this element be part of a single text node (a run)?
  const isRunEl = (e) => {
    if (!RUN_TAGS.has(e.tagName)) return false;
    const cs = getComputedStyle(e);
    if (cs.display === 'none') return true;
    if (!/^(inline|inline-block|contents)$/.test(cs.display)) return false;
    if (hasBox(cs) && e.tagName !== 'CODE') return false;
    if (px(cs.paddingLeft) + px(cs.paddingRight) > 4 && e.tagName !== 'CODE') return false;
    for (const c of e.childNodes) {
      if (c.nodeType === 1 && !isRunEl(c)) return false;
    }
    return true;
  };
  const isTextContainer = (e) => {
    if (e.tagName === 'svg' || e.tagName === 'INPUT') return false;
    let hasText = false;
    for (const c of e.childNodes) {
      if (c.nodeType === 3) {
        if (c.textContent.trim()) hasText = true;
      } else if (c.nodeType === 1) {
        if (!isRunEl(c)) return false;
        if (c.textContent.trim()) hasText = true;
      }
    }
    return hasText;
  };

  const familyOf = (cs) => {
    const f = cs.fontFamily;
    if (/Fraunces/.test(f)) return 'Fraunces';
    if (/Newsreader/.test(f)) return 'Newsreader';
    if (/Comic Neue/.test(f)) return 'Comic';
    if (/Inter/.test(f)) return 'Inter';
    return /mono|Menlo|Consolas|SF Mono/i.test(f) ? 'Mono' : 'Inter';
  };
  const runStyle = (cs) => {
    const fam = familyOf(cs);
    const s = { w: snapWeight(Number(cs.fontWeight), fam), c: tok(cs.color) || 'ink' };
    if (fam !== 'Inter') s.f = fam;
    s.z = px(cs.fontSize);
    if (cs.fontStyle === 'italic') s.it = 1;
    if (/underline/.test(cs.textDecorationLine)) s.u = [tok(cs.textDecorationColor) || 'ink', px(cs.textDecorationThickness) || 1];
    if (cs.letterSpacing !== 'normal') s.ls = px(cs.letterSpacing);
    return s;
  };

  // Collect runs from a text container. Whitespace collapses like CSS normal.
  const collectRuns = (nodes) => {
    let text = '';
    const runs = [];
    let lastSpace = true;
    const push = (str, st) => {
      if (!str) return;
      const prev = runs[runs.length - 1];
      const key = JSON.stringify(st);
      if (prev && prev.k === key) prev.e += str.length;
      else runs.push({ s: text.length, e: text.length + str.length, st, k: key });
      text += str;
    };
    // An inline-block in a sentence (a link button) moves to the next line
    // whole when it fits on one, so it keeps its spaces non-breaking too
    const atomicOneLine = (e) => {
      const cs = getComputedStyle(e);
      if (!/^inline-(block|flex|grid)$/.test(cs.display)) return false;
      const lh = px(cs.lineHeight) || px(cs.fontSize) * 1.25;
      return e.getBoundingClientRect().height < lh * 1.5;
    };
    const walk = (n, keep) => {
      if (n.nodeType === 3) {
        const pcs = getComputedStyle(n.parentElement);
        if (pcs.display === 'none') return;
        let t = n.textContent;
        const pre = /pre/.test(pcs.whiteSpace);
        if (!pre) {
          t = t.replace(/\s+/g, ' ');
          if (lastSpace) t = t.replace(/^ /, '');
        }
        // Text that must not break keeps its spaces non-breaking
        const keepTogether = keep || pcs.whiteSpace === 'nowrap' || pcs.textWrapMode === 'nowrap';
        const endsSpace = / $/.test(t);
        if (keepTogether) t = t.replace(/ (?=.)/g, '\u00a0');
        if (!t) return;
        lastSpace = endsSpace;
        push(t, runStyle(pcs));
      } else if (n.nodeType === 1) {
        if (n.tagName === 'BR') {
          push(' ', runStyle(getComputedStyle(n.parentElement)));
          lastSpace = true;
          return;
        }
        if (n.tagName === 'WBR') return;
        const k = keep || atomicOneLine(n);
        for (const c of n.childNodes) walk(c, k);
      }
    };
    nodes.forEach((n) => walk(n));
    // trim trailing space
    if (text.endsWith(' ')) {
      text = text.slice(0, -1);
      const last = runs[runs.length - 1];
      if (last) last.e = Math.min(last.e, text.length);
    }
    return { text, runs: runs.filter((r) => r.e > r.s).map((r) => [r.s, r.e, r.st]) };
  };

  const lineCount = (nodes) => {
    const rg = document.createRange();
    const tops = new Set();
    for (const n of nodes) {
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) if (q.width > 0.5) tops.add(Math.round(q.top / 3));
    }
    return Math.max(1, tops.size);
  };
  const rangeRect = (nodes) => {
    const rg = document.createRange();
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const n of nodes) {
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) {
        if (q.width < 0.5 && q.height < 0.5) continue;
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      }
    }
    return l === Infinity ? null : { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  };

  const shadows = (s) => {
    if (!s || s === 'none') return undefined;
    const parts = s.split(/,(?![^(]*\))/);
    return parts.map((p) => {
      const col = p.match(/rgba?\([^)]+\)/);
      const nums = p.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).filter((x) => x !== 'inset').map(px);
      return [col ? tok(col[0]) || '#000000@0' : 'ink', nums[0] || 0, nums[1] || 0, nums[2] || 0, nums[3] || 0, /inset/.test(p) ? 1 : 0];
    });
  };

  const textNode = (nodes, cs, box, parentRect, cfgName) => {
    const { text, runs } = collectRuns(nodes);
    if (!text.trim()) return null;
    const base = runStyle(cs);
    const lines = lineCount(nodes);
    let lh = cs.lineHeight === 'normal' ? box.height / lines : px(cs.lineHeight);
    const n = {
      t: 'T', n: cfgName, x: r2(box.left - parentRect.left), y: r2(box.top - parentRect.top), w: r2(box.width), h: r2(box.height),
      s: text, st: { ...base, lh: r2(lh) }, ln: lines,
    };
    if (cs.textTransform === 'uppercase') n.st.tt = 'U';
    if (/balance/.test(cs.textWrap || '') || /balance/.test(cs.textWrapStyle || '')) n.bal = 1;
    const align = cs.textAlign;
    if (align === 'center' || align === 'right' || align === 'end') n.al = align === 'center' ? 'C' : 'R';
    if (cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap') n.el = 1;
    // Only keep runs that differ from the base style
    const bk = JSON.stringify(base);
    const extra = runs.filter((r) => JSON.stringify(r[2]) !== bk);
    if (extra.length) n.r = extra.map(([s, e, st]) => [s, e, st]);
    return n;
  };

  const compFor = (e, cfg) => {
    if (!e.classList || !e.classList.length) return null;
    for (const [cls, key] of cfg.components) if (e.classList.contains(cls)) return { key, cls };
    return null;
  };

  function extract(root, cfg) {
    PALETTE = cfg.palette || {};
    const icons = {};
    const rootRect = root.getBoundingClientRect();

    const elNode = (e, parentRect, ctx) => {
      const cs = getComputedStyle(e);
      const rect = e.getBoundingClientRect();
      if (hiddenEl(e, cs, rect)) return null;
      const rel = { x: r2(rect.left - parentRect.left), y: r2(rect.top - parentRect.top), w: r2(rect.width), h: r2(rect.height) };
      const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean) : [...(e.classList || [])];
      const name = cls.filter((c) => !/^(icon|lucide|fd-)/.test(c))[0] || e.tagName.toLowerCase();
      const abs = cs.position === 'absolute' || cs.position === 'fixed';

      // SVG: Lucide icon or the Atmosphere mark
      if (e.tagName.toLowerCase() === 'svg') {
        const lucideName = cls.find((c) => c.startsWith('lucide-'));
        const col = tok(cs.color) || 'ink';
        if (lucideName) {
          const nm = lucideName.slice(7);
          if (!icons[nm]) icons[nm] = e.innerHTML.replace(/\s+/g, ' ');
          const node = { t: 'I', i: nm, ...rel, col };
          if (px(cs.strokeWidth) && px(cs.strokeWidth) !== 2) node.sw = px(cs.strokeWidth);
          // A turned icon, such as an open disclosure's chevron. Quarter turns
          // only, and nothing animated, so a spinner caught mid-turn stays upright.
          const m = cs.animationName === 'none' && /^matrix\(([^,]+),\s*([^,]+)/.exec(cs.transform);
          if (m) {
            const deg = (((Math.round((Math.atan2(+m[2], +m[1]) * 180) / Math.PI)) % 360) + 360) % 360;
            if (deg && deg % 90 === 0) node.rot = deg;
          }
          if (abs) node.ab = 1;
          return node;
        }
        if (cls.includes('mark')) return { t: 'M', ...rel, col, ...(abs ? { ab: 1 } : {}) };
        return { t: 'F', n: 'svg', ...rel };
      }

      const comp = compFor(e, cfg);

      // Form inputs
      if (e.tagName === 'INPUT') {
        if (['radio', 'checkbox', 'hidden'].includes(e.type)) {
          if (parseFloat(cs.opacity) < 0.05 || rect.width < 4) return null;
        }
        const node = frameBase(e, cs, rel, 'input' + (e.type ? `:${e.type}` : ''), cls);
        node.k = 'Input';
        node.cls = ['input', e.type, ...cls].join(' ');
        node.L = 'H'; node.ci = 'CENTER';
        let value = e.value;
        let color = cs.color;
        if (e.type === 'password' && value) value = '•'.repeat(value.length);
        if (!value && e.placeholder) { value = e.placeholder; color = getComputedStyle(e, '::placeholder').color; }
        if (value) {
          const inner = {
            left: rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), top: rect.top + px(cs.borderTopWidth) + px(cs.paddingTop),
            width: rect.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight),
            height: rect.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom),
          };
          const st = runStyle(cs);
          st.c = tok(color) || 'ink';
          node.c = [{ t: 'T', n: 'value', x: r2(inner.left - rect.left), y: r2(inner.top - rect.top), w: r2(inner.width), h: r2(inner.height), s: value, st: { ...st, lh: r2(px(cs.lineHeight) || inner.height) }, ln: 1, ...(cs.letterSpacing !== 'normal' ? {} : {}) }];
          if (cs.textAlign === 'center') node.c[0].al = 'C';
          node.ai = cs.textAlign === 'center' ? 'CENTER' : 'MIN';
        } else node.c = [];
        node.sw = 'X'; node.sh = 'X';
        if (abs) node.ab = 1;
        return node;
      }

      // A box containing only text: one TEXT, wrapped in a frame if it has a box
      if (isTextContainer(e)) {
        const content = {
          left: rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), top: rect.top + px(cs.borderTopWidth) + px(cs.paddingTop),
          width: rect.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight),
          height: rect.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom),
        };
        const nodes = [...e.childNodes];
        const tr = rangeRect(nodes) || content;
        const boxed = hasBox(cs) || px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.paddingLeft) + px(cs.paddingRight) > 0.5 || comp;
        if (!boxed) {
          const t = textNode(nodes, cs, { left: content.left, top: content.top, width: content.width, height: content.height }, parentRect, name);
          if (!t) return null;
          t.tw = r2(tr.width);
          if (abs) t.ab = 1;
          if (cs.display.startsWith('inline')) t.inl = 1;
          if (parseFloat(cs.flexGrow) > 0) t.grow = 1;
          return t;
        }
        const node = frameBase(e, cs, rel, name, cls);
        node.L = cs.display.includes('flex') && cs.flexDirection.startsWith('column') ? 'V' : 'H';
        node.ci = cs.alignItems === 'center' || cs.display.includes('grid') || cs.display.startsWith('inline') ? 'CENTER' : 'MIN';
        const gridCentre = cs.display.includes('grid') && (/center/.test(cs.placeItems || '') || cs.justifyItems === 'center' || cs.justifyContent === 'center');
        node.ai = cs.justifyContent === 'center' || cs.textAlign === 'center' || gridCentre ? 'CENTER' : cs.justifyContent === 'flex-end' ? 'MAX' : 'MIN';
        const t = textNode(nodes, cs, { left: content.left, top: content.top, width: content.width, height: content.height }, rect, 'text');
        if (t) { t.tw = r2(tr.width); node.c = [t]; } else node.c = [];
        if (comp) { node.k = comp.key; node.cls = cls.join(' '); }
        if (abs) node.ab = 1;
        return node;
      }

      // Generic frame
      const node = frameBase(e, cs, rel, name, cls);
      if (comp) { node.k = comp.key; node.cls = cls.join(' '); }
      if (abs) node.ab = 1;
      const disp = cs.display;
      const kids = [];
      // Children: elements and anonymous text runs
      let pending = [];
      const flush = () => {
        if (!pending.length) return;
        const nodes = pending;
        pending = [];
        if (!nodes.some((n) => n.textContent.trim())) return;
        const rr = rangeRect(nodes);
        if (!rr) return;
        const t = textNode(nodes, cs, rr, rect, 'text');
        if (t) { t.tw = r2(rr.width); t.anon = 1; kids.push(t); }
      };
      const closedDetails = e.tagName === 'DETAILS' && !e.open;
      for (const c of e.childNodes) {
        if (closedDetails && !(c.nodeType === 1 && c.tagName === 'SUMMARY')) continue;
        if (c.nodeType === 3) { if (c.textContent.trim() || pending.length) pending.push(c); continue; }
        if (c.nodeType !== 1) continue;
        const ccs = getComputedStyle(c);
        if (ccs.display === 'none') continue;
        if (isRunEl(c) && ccs.position !== 'absolute' && !compFor(c, cfg)) { pending.push(c); continue; }
        flush();
        const child = elNode(c, rect, { parentCs: cs });
        if (child) kids.push(child);
      }
      flush();

      // A grid of rows and columns, such as the notes' two-column details: one
      // frame per row, so Figma keeps the columns rather than wrapping one run.
      let gridRows = false;
      if (disp.includes('grid')) {
        const cols = cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
        const inFlow = kids.filter((k) => !k.ab);
        if (cols > 1 && inFlow.length > cols && inFlow.length % cols === 0) {
          const rows = [];
          for (let i = 0; i < inFlow.length; i += cols) rows.push(inFlow.slice(i, i + cols));
          if (rows.every((r) => r.every((k) => Math.abs(k.y - r[0].y) < 1.5))) {
            const left = px(cs.borderLeftWidth) + px(cs.paddingLeft);
            const width = rect.width - left - px(cs.borderRightWidth) - px(cs.paddingRight);
            const rowNodes = rows.map((r) => {
              const y = Math.min(...r.map((k) => k.y));
              const h = Math.max(...r.map((k) => k.y + k.h)) - y;
              const c = r.map((k, i) => ({ ...k, x: r2(k.x - left), y: r2(k.y - y), ...(i === r.length - 1 ? { sw: 'F' } : {}) }));
              return { t: 'F', n: 'row', x: r2(left), y: r2(y), w: r2(width), h: r2(h), L: 'H', g: r2(r[1].x - (r[0].x + r[0].w)), ci: 'MIN', ai: 'MIN', c };
            });
            kids.splice(0, kids.length, ...kids.filter((k) => k.ab), ...rowNodes);
            gridRows = true;
          }
        }
      }
      node.c = kids;

      // Layout
      const flow = kids.filter((k) => !k.ab);
      const isFlex = disp.includes('flex');
      const isGrid = disp.includes('grid') && !gridRows;
      let dir;
      if (isFlex) dir = cs.flexDirection.startsWith('row') ? 'H' : 'V';
      else if (isGrid) {
        if (flow.length <= 1) dir = 'H';
        else if (flow.every((k) => Math.abs(k.y - flow[0].y) < 1.5)) dir = 'H';
        else if (flow.every((k) => Math.abs(k.x - flow[0].x) < 1.5)) dir = 'V';
        else { dir = 'H'; node.wr = 1; }
      } else {
        // block flow: vertical unless all children sit on one line
        dir = flow.length > 1 && flow.every((k) => Math.abs(k.y - flow[0].y) < 1.5) && flow.every((k, i) => i === 0 || k.x >= flow[i - 1].x + flow[i - 1].w - 1) ? 'H' : 'V';
      }
      if (isFlex && cs.flexWrap === 'wrap') {
        // A wrapping flex box that actually wrapped: an item starts back at
        // the left, below the one before it. (Centred items on one line sit at
        // different heights, so comparing tops isn't enough.)
        if (flow.some((k, i) => i > 0 && k.x < flow[i - 1].x + flow[i - 1].w - 1 && k.y >= flow[i - 1].y + flow[i - 1].h - 1)) node.wr = 1;
      }
      node.L = dir;
      const padT = px(cs.paddingTop), padR = px(cs.paddingRight), padB = px(cs.paddingBottom), padL = px(cs.paddingLeft);
      const bT = px(cs.borderTopWidth), bR = px(cs.borderRightWidth), bB = px(cs.borderBottomWidth), bL = px(cs.borderLeftWidth);
      const cLeft = bL + padL, cTop = bT + padT;
      const cW = rect.width - bL - bR - padL - padR, cH = rect.height - bT - bB - padT - padB;

      // Alignment
      const ai = cs.alignItems, jc = cs.justifyContent;
      const placeCenter = isGrid && (cs.placeItems === 'center' || cs.alignItems === 'center' || cs.justifyItems === 'center');
      if (isFlex || isGrid) {
        node.ci = ai === 'center' || placeCenter ? 'CENTER' : ai === 'flex-end' || ai === 'end' ? 'MAX' : ai === 'baseline' ? (dir === 'H' ? 'BASELINE' : 'MIN') : 'MIN';
        node.ai = jc === 'center' || (isGrid && (cs.justifyContent === 'center' || placeCenter)) ? 'CENTER' : jc === 'flex-end' || jc === 'end' ? 'MAX' : jc === 'space-between' ? 'SPACE_BETWEEN' : 'MIN';
      } else {
        node.ci = 'MIN';
        node.ai = 'MIN';
      }
      // Child sizing and cross-axis alignment
      const cross = dir === 'H' ? 'h' : 'w';
      const main = dir === 'H' ? 'w' : 'h';
      const cSize = dir === 'H' ? cH : cW;
      const cStart = dir === 'H' ? cTop : cLeft;
      const stretch = isFlex || isGrid ? ai === 'normal' || ai === 'stretch' : true;
      for (const k of kids) {
        if (k.ab || k.t === 'S') continue;
        const kEl = k;
        const posCross = dir === 'H' ? kEl.y : kEl.x;
        // cross axis
        if (k.t !== 'I' && k.t !== 'M' && stretch && Math.abs(kEl[cross] - cSize) < 0.75 && cSize > 0) kEl['s' + cross] = 'F';
        else if (node.ci === 'MIN' && posCross - cStart > 1 && !node.wr && node.L !== 'N') {
          // cross offset that alignment can't express
          kEl.off = r2(posCross - cStart);
          // Stretched but pushed in by a margin, as the staggered recipe cards
          // are: it fills what's left after the offset.
          if (k.t !== 'I' && k.t !== 'M' && stretch && Math.abs(posCross - cStart + kEl[cross] - cSize) < 0.75) kEl['s' + cross] = 'F';
        }
        // main axis grow
        if (!node.wr && node.L !== 'N' && k.t !== 'I' && k.t !== 'M' && k.grow) kEl['s' + main] = 'F';
      }
      // Measured spacing along the main axis
      if (node.wr) {
        node.g = px(isGrid ? cs.columnGap : cs.columnGap) || 0;
        node.cg = px(cs.rowGap) || 0;
        if (dir === 'H' && flow.length > 1) {
          // Lines: a new one starts where an item wraps back to the left.
          // Items on one line can sit at different heights when centred, so
          // their tops don't say which line they're on.
          const lines = [[flow[0]]];
          for (let i = 1; i < flow.length; i++) {
            const p = flow[i - 1], k = flow[i];
            if (k.x < p.x + p.w - 1) lines.push([k]);
            else lines[lines.length - 1].push(k);
          }
          if (lines[0].length > 1) node.g = r2(lines[0][1].x - (lines[0][0].x + lines[0][0].w));
          if (lines.length > 1) node.cg = r2(Math.min(...lines[1].map((k) => k.y)) - Math.max(...lines[0].map((k) => k.y + k.h)));
          // A line that starts in from the content edge (a left margin) keeps
          // its indent as a padding wrapper round its first item
          if (node.ai === 'MIN') {
            for (const ln of lines) {
              const k = ln[0], extra = r2(k.x - cLeft);
              if (extra <= 0.75) continue;
              const w = { t: 'F', n: 'gap', L: 'H', g: 0, ai: 'MIN', ci: 'MIN', p: [0, 0, 0, extra], c: [k], x: r2(k.x - extra), y: k.y, w: r2(k.w + extra), h: k.h };
              if (k.sh === 'F') w.sh = 'F';
              node.c[node.c.indexOf(k)] = w;
            }
          }
        }
      } else if (flow.length > 1) {
        const gaps = [];
        for (let i = 1; i < flow.length; i++) {
          const a = flow[i - 1], b = flow[i];
          gaps.push(dir === 'H' ? b.x - (a.x + a.w) : b.y - (a.y + a.h));
        }
        const min = Math.min(...gaps);
        if (min < -0.75 || node.ai === 'SPACE_BETWEEN') {
          if (node.ai === 'SPACE_BETWEEN') node.g = 0;
          else { node.L = 'N'; }
        } else {
          // Item spacing = the most common gap. Tighter runs become a sub-stack;
          // larger gaps get a padding wrapper; a big trailing gap is a spring.
          // A trailing run pushed to the end (margin-left: auto) is a spring, not spacing
          let springAt = -1;
          if (dir === 'H' && node.ai === 'MIN') {
            const lastEnd = Math.max(...flow.map((q) => q.x + q.w));
            const j = gaps.indexOf(Math.max(...gaps));
            const others = gaps.filter((_, i) => i !== j);
            const ref = others.length ? Math.max(...others) : px(cs.columnGap) || 0;
            if (Math.abs(lastEnd - (cLeft + cW)) < 1.5 && gaps[j] > 16 && gaps[j] > ref + 8 && !flow.some((q) => q.grow)) springAt = j;
          }
          const flexGap = isFlex || isGrid ? px(dir === 'H' ? cs.columnGap : cs.rowGap) : 0;
          const pool = gaps.filter((_, i) => i !== springAt);
          const counts = new Map();
          for (const gp of pool) { const k = Math.round(gp * 2) / 2; counts.set(k, (counts.get(k) || 0) + 1); }
          const ranked = [...counts.entries()].sort((a, b) => (Math.abs(b[0] - flexGap) < 0.75) - (Math.abs(a[0] - flexGap) < 0.75) || b[1] - a[1] || a[0] - b[0]);
          const base = ranked.length ? ranked[0][0] : flexGap;
          node.g = Math.max(0, base);
          const crossFill = (q) => (dir === 'V' ? q.sw === 'F' : q.sh === 'F');
          const box = (members) => {
            const x = Math.min(...members.map((q) => q.x)), y = Math.min(...members.map((q) => q.y));
            return { x: r2(x), y: r2(y), w: r2(Math.max(...members.map((q) => q.x + q.w)) - x), h: r2(Math.max(...members.map((q) => q.y + q.h)) - y) };
          };
          const out = [];
          let fi = 0;
          for (const k of kids) {
            if (k.ab) { out.push(k); continue; }
            if (fi === 0) { out.push(k); fi++; continue; }
            const gp = gaps[fi - 1];
            const extra = r2(gp - base);
            if (fi - 1 === springAt) { out.push({ t: 'S', n: 'spring', x: 0, y: 0, w: 0, h: 0, d: dir, spring: 1 }); out.push(k); }
            else if (Math.abs(extra) <= 0.75) out.push(k);
            else if (extra > 0) {
              {
                const w = { t: 'F', n: 'gap', L: dir, g: 0, ai: 'MIN', ci: 'MIN', p: dir === 'V' ? [extra, 0, 0, 0] : [0, 0, 0, extra], c: [k] };
                const b = box([k]);
                Object.assign(w, dir === 'V' ? { x: b.x, y: r2(b.y - extra), w: b.w, h: r2(b.h + extra) } : { x: r2(b.x - extra), y: b.y, w: r2(b.w + extra), h: b.h });
                if (crossFill(k)) w[dir === 'V' ? 'sw' : 'sh'] = 'F';
                if (k.grow) { w.grow = 1; w[dir === 'V' ? 'sh' : 'sw'] = 'F'; }
                out.push(w);
              }
            } else {
              // tighter than usual: stack with the previous item
              let prev = out[out.length - 1];
              if (!(prev && prev.n === 'group' && Math.abs(prev.g - gp) <= 0.75)) {
                prev = out.pop();
                const grp = { t: 'F', n: 'group', L: dir, g: Math.max(0, r2(gp)), ai: 'MIN', ci: node.ci, c: [prev] };
                out.push(grp);
                prev = grp;
              }
              prev.c.push(k);
              Object.assign(prev, box(prev.c));
              if (prev.c.every(crossFill)) prev[dir === 'V' ? 'sw' : 'sh'] = 'F';
            }
            fi++;
          }
          node.c = out;
        }
      }
      return node;
    };

    const frameBase = (e, cs, rel, name, cls) => {
      const node = { t: 'F', n: name, ...rel };
      const bg = tok(cs.backgroundColor);
      if (bg) node.bg = bg;
      const gr = gradients(cs.backgroundImage);
      if (gr) node.gr = gr;
      const bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
      if (bw.some((v) => v > 0)) {
        const colors = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];
        const idx = bw.findIndex((v) => v > 0);
        node.bd = [bw, tok(colors[idx]) || 'ink'];
        if (cs.borderTopStyle === 'dashed' || cs.borderLeftStyle === 'dashed') node.dash = 1;
      }
      const rad = [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)];
      if (rad.some((v) => v > 0)) {
        const cap = Math.min(rel.w, rel.h) / 2;
        const rr = rad.map((v) => r2(Math.min(v, cap)));
        node.r = rr.every((v) => v === rr[0]) ? rr[0] : rr;
      }
      const sh = shadows(cs.boxShadow);
      if (sh) node.fx = sh;
      if (parseFloat(cs.opacity) < 1) node.op = parseFloat(cs.opacity);
      if (/hidden|auto|scroll|clip/.test(cs.overflow)) node.clip = 1;
      const p = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
      if (p.some((v) => v > 0)) node.p = p;
      const grow = parseFloat(cs.flexGrow) > 0;
      if (grow) node.grow = 1;
      return node;
    };

    const tree = elNode(root, rootRect, {});
    if (tree) { tree.x = 0; tree.y = 0; }
    return { tree, icons };
  }

  // Turn ::before/::after into real spans so they can be measured.
  function materialisePseudo(root) {
    const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'min-width', 'min-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'background-color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
      'flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'color',
      'transform', 'opacity', 'box-shadow', 'white-space', 'vertical-align'];
    const made = [];
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e.closest('svg')) continue;
      for (const which of ['before', 'after']) {
        const pcs = getComputedStyle(e, `::${which}`);
        const content = pcs.content;
        if (!content || content === 'none' || content === 'normal' || pcs.display === 'none') continue;
        const span = document.createElement('span');
        span.className = 'fd-pseudo';
        span.dataset.pseudo = which;
        let txt = '';
        const m = content.match(/^"(.*)"$/s);
        if (m) txt = m[1].replace(/\\"/g, '"');
        else if (/counter/.test(content)) txt = String([...e.parentElement.children].indexOf(e) + 1);
        span.textContent = txt;
        span.style.cssText = PROPS.map((p) => `${p}:${pcs.getPropertyValue(p)}`).join(';');
        if (which === 'before') e.insertBefore(span, e.firstChild);
        else e.appendChild(span);
        e.classList.add(`fd-np-${which}`);
        made.push(span);
      }
    }
    materialiseMarkers(root);
    return made.length;
  }
  // List markers (“1.”, “•”), which aren't in the DOM: a real span where the
  // browser draws each one, outside the item, so the layout doesn't move.
  function materialiseListMarkers(root) {
    for (const li of root.querySelectorAll('li')) {
      const cs = getComputedStyle(li);
      if (cs.display !== 'list-item' || cs.listStyleType === 'none' || cs.listStylePosition !== 'outside') continue;
      const list = li.parentElement;
      const n = [...list.children].filter((c) => c.tagName === 'LI').indexOf(li) + (list.tagName === 'OL' ? list.start || 1 : 1);
      const span = document.createElement('span');
      span.className = 'fd-pseudo';
      span.textContent = /decimal/.test(cs.listStyleType) ? `${n}.` : '\u2022';
      span.style.cssText = 'position:absolute;right:100%;top:0;padding-right:0.45em;white-space:nowrap;text-align:right';
      li.insertBefore(span, li.firstChild);
      li.style.position = 'relative';
      li.style.listStyle = 'none';
      li.classList.add('fd-np-marker');
    }
  }
  // Native <summary> disclosure triangles
  function materialiseMarkers(root) {
    materialiseListMarkers(root);
    for (const sm of root.querySelectorAll('summary')) {
      const cs = getComputedStyle(sm);
      if (cs.display !== 'list-item' || cs.listStyleType === 'none') continue;
      const span = document.createElement('span');
      span.className = 'fd-pseudo';
      span.textContent = (sm.parentElement && sm.parentElement.open ? '\u25BC' : '\u25B6') + '\u00a0';
      span.style.fontSize = '0.7em';
      sm.insertBefore(span, sm.firstChild);
      sm.style.listStyle = 'none';
      sm.classList.add('fd-np-before');
    }
  }
  function restorePseudo(root) {
    root.querySelectorAll('.fd-pseudo').forEach((s) => s.remove());
    root.querySelectorAll('.fd-np-before, .fd-np-after').forEach((e) => { e.classList.remove('fd-np-before', 'fd-np-after'); if (e.tagName === 'SUMMARY') e.style.listStyle = ''; });
    root.querySelectorAll('.fd-np-marker').forEach((e) => { e.classList.remove('fd-np-marker'); e.style.position = ''; e.style.listStyle = ''; });
  }

  window.FD = { extract, materialisePseudo, restorePseudo };
})();
