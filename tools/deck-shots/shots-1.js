// Captures 2x screenshots of prototype states for the slide decks.
// Usage: node shots.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const S = path.resolve(__dirname, '../.cache');
const OUT = process.argv[2] || path.join(S, 'out/shots');
fs.mkdirSync(OUT, { recursive: true });

const lucideJs = fs.readFileSync(path.join(S, 'lucide/package/dist/umd/lucide.min.js'));
const F = path.join(S, 'fonts2');
const files = {
  'inter-400': path.join(S, 'inter/package/files/inter-latin-400-normal.woff2'),
  'inter-500': path.join(S, 'inter/package/files/inter-latin-500-normal.woff2'),
  'inter-600': path.join(S, 'inter/package/files/inter-latin-600-normal.woff2'),
  'inter-700': path.join(S, 'inter/package/files/inter-latin-700-normal.woff2'),
  'inter-800': path.join(S, 'inter/package/files/inter-latin-800-normal.woff2'),
  fraunces: path.join(F, 'fontsource-variable-fraunces-5.1.0/package/files/fraunces-latin-opsz-normal.woff2'),
  newsreader: path.join(F, 'fontsource-variable-newsreader-5.1.0/package/files/newsreader-latin-opsz-normal.woff2'),
  'newsreader-i': path.join(F, 'fontsource-variable-newsreader-5.1.0/package/files/newsreader-latin-opsz-italic.woff2'),
  'comic-400': path.join(F, 'fontsource-comic-neue-5.1.0/package/files/comic-neue-latin-400-normal.woff2'),
  'comic-700': path.join(F, 'fontsource-comic-neue-5.1.0/package/files/comic-neue-latin-700-normal.woff2'),
  'comic-400i': path.join(F, 'fontsource-comic-neue-5.1.0/package/files/comic-neue-latin-400-italic.woff2'),
};
const u = (k) => `https://fonts.gstatic.com/local/${k}.woff2`;
const css = [
  ...[400, 500, 600, 700, 800].map((w) => `@font-face{font-family:'Inter';font-weight:${w};font-display:block;src:url(${u('inter-' + w)})}`),
  `@font-face{font-family:'Fraunces';font-weight:100 900;font-display:block;src:url(${u('fraunces')})}`,
  `@font-face{font-family:'Newsreader';font-weight:200 800;font-display:block;src:url(${u('newsreader')})}`,
  `@font-face{font-family:'Newsreader';font-style:italic;font-weight:200 800;font-display:block;src:url(${u('newsreader-i')})}`,
  `@font-face{font-family:'Comic Neue';font-weight:400;font-display:block;src:url(${u('comic-400')})}`,
  `@font-face{font-family:'Comic Neue';font-weight:700;font-display:block;src:url(${u('comic-700')})}`,
  `@font-face{font-family:'Comic Neue';font-style:italic;font-weight:400;font-display:block;src:url(${u('comic-400i')})}`,
].join('\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function session(browser, vp, notesOpen) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-02T10:00:00Z') });
  await page.route(/^https?:\/\//, (route) => {
    const url = route.request().url();
    if (url.startsWith('https://unpkg.com/lucide@0.469.0/')) return route.fulfill({ contentType: 'text/javascript', body: lucideJs });
    if (url.startsWith('https://fonts.googleapis.com/css2')) return route.fulfill({ contentType: 'text/css', body: css });
    const m = url.match(/^https:\/\/fonts\.gstatic\.com\/local\/([\w-]+)\.woff2/);
    if (m && files[m[1]]) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(files[m[1]]) });
    return route.abort();
  });
  const settle = async (ms = 60) => { await page.clock.runFor(ms); await sleep(40); };
  const act = (sel) => page.locator(`.tab-view:not([hidden]) ${sel}, .fedcm:not([hidden]) ${sel}, .notification:not([hidden]) ${sel}`).first();
  const api = {
    page, settle,
    async boot(scenario) {
      await page.setViewportSize(vp);
      await page.goto(`file://${ROOT}/index.html#${scenario}`);
      await page.waitForFunction(() => window.lucide && typeof startScenario === 'function' && document.querySelector('.pl-card'));
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} .sheet{max-height:none!important} .sheet-body{overflow:visible!important}' });
      await page.evaluate((open) => setNotes(open), notesOpen);
      await page.evaluate((id) => startScenario(id), scenario);
      await settle();
    },
    async click(sel) { await act(sel).click(); await settle(); await page.mouse.move(2, 2); await settle(); },
    async type(sel, text) { const l = act(sel); await l.fill(''); await l.type(text); await settle(); },
    async run(ms) { await page.clock.runFor(ms); await sleep(50); },
    async blur() { await page.evaluate(() => { const a = document.activeElement; if (a && a.id !== 'handle' && a.blur) a.blur(); }); await page.mouse.move(2, 2); await sleep(30); },
    // Grow the window until nothing in the active tab scrolls
    async fit() {
      await page.setViewportSize(vp);
      for (let i = 0; i < 10; i++) {
        const extra = await page.evaluate(() => {
          const tab = document.querySelector('.tab-view:not([hidden])');
          const pg = tab.querySelector('.page');
          let need = pg.scrollHeight - pg.clientHeight;
          const layer = tab.querySelector('.layer:not([hidden])');
          if (layer) {
            need = Math.max(need, layer.scrollHeight - layer.clientHeight);
            const sheet = layer.querySelector('.sheet');
            const sb = layer.querySelector('.sheet-body');
            const capped = sheet && sheet.getBoundingClientRect().height >= sheet.parentElement.clientHeight * 0.93 - 40;
            if (sb && capped) {
              const inFlow = [...sb.children].reduce((m, c) => (getComputedStyle(c).position === 'absolute' ? m : Math.max(m, c.getBoundingClientRect().bottom)), 0);
              need = Math.max(need, Math.ceil(inFlow - sb.getBoundingClientRect().bottom + parseFloat(getComputedStyle(sb).paddingBottom)));
            }
          }
          return Math.ceil(need);
        });
        if (extra <= 0) break;
        const cur = page.viewportSize();
        await page.setViewportSize({ width: cur.width, height: cur.height + Math.ceil(extra / 0.93) + 2 });
        await sleep(40);
      }
    },
    async shot(name, sel, opts = {}) {
      await api.blur();
      const file = path.join(OUT, `${name}.png`);
      if (!sel) await page.screenshot({ path: file, fullPage: false });
      else if (opts.clip) {
        const box = await page.locator(sel).first().boundingBox();
        const c = opts.clip(box);
        await page.screenshot({ path: file, clip: c });
      } else await page.locator(sel).first().screenshot({ path: file });
      process.stdout.write(`${name} `);
    },
  };
  return api;
}

(async () => {
  const browser = await chromium.launch();
  const d = await session(browser, { width: 1440, height: 900 }, true);
  const visibleSheet = '.tab-view:not([hidden]) .sheet';
  const visible = (s) => `.tab-view:not([hidden]) ${s}`;

  // Scenario 1: New to the Atmosphere
  await d.boot('new');
  await d.shot('signin-window', '.browser');
  await d.shot('signin-card', visible('.pl-card'));
  await d.shot('scenario-bar', '.proto-bar');
  await d.click('[data-action="createAccount"]');
  await d.fit();
  await d.shot('create-sheet', visibleSheet);
  await d.shot('provider-list', visible('.provider-list'));
  await d.click('#create-submit');
  await d.fit();
  await d.shot('signup-card', visible('.pv-main'));
  await d.click('.autofill');
  await d.type('#new-password', 'cooking123');
  await d.click('form[data-form="signup"] [type="submit"]');
  await d.fit();
  await d.shot('handle-card', visible('.pv-main'));
  await d.click('form[data-form="handle"] [type="submit"]');
  await d.run(900);
  await d.fit();
  await d.shot('consent-first-card', visible('.pv-main'));
  await d.click('[data-action="consentApprove"]');
  await d.run(2000);
  await d.fit();
  await d.shot('home-new-window', '.browser');
  await d.shot('banner-new', visible('.banner'));

  // Scenario 2: Knows their details
  await d.boot('returning');
  await d.click('[data-action="atmosphereButton"]');
  await d.fit();
  await d.shot('prototype-full');
  await d.shot('find-sheet', visibleSheet);
  await d.type('#handle', 'sam');
  await d.fit();
  await d.shot('find-suggestions-window', '.browser');
  await d.type('#handle', 'sam@bsky.social');
  await d.shot('find-didyoumean-sheet', visibleSheet);
  await d.page.locator(visible('.combo-opt')).first().click();
  await d.settle();
  await d.fit();
  await d.shot('confirm-sheet', visibleSheet);
  await d.shot('notes-step-confirm', '#notes-step');
  await d.click('[data-action="toProvider"]');
  await d.fit();
  await d.shot('provider-signin-window', '.browser');
  await d.shot('provider-signin-card', visible('.pv-main'));
  await d.type('#current-password', 'password');
  await d.click('form[data-form="signin"] [type="submit"]');
  await d.run(800);
  await d.fit();
  await d.shot('consent-window', '.browser');
  await d.shot('consent-card', visible('.pv-main'));
  await d.shot('consent-top', visible('.pv-main'), { clip: (b) => ({ x: b.x, y: b.y, width: b.width, height: Math.min(b.height, 560) }) });
  await d.click('[data-action="consentApprove"]');
  await d.run(2000);
  await d.fit();
  await d.shot('home-window', '.browser');
  await d.shot('notes-events', '#notes-events');
  await d.page.locator(visible('.acct-menu summary')).first().click();
  await d.settle();
  await d.shot('menu-panel', visible('.am-panel'));
  await d.shot('menu-window', '.browser');
  await d.click('[data-action="signOut"]');
  await d.click('[data-action="atmosphereButton"]');
  await d.shot('chooser-one', '.fedcm-card');

  // Scenario 3: Forgot their details
  await d.boot('forgot');
  await d.click('[data-action="atmosphereButton"]');
  await d.click('[data-action="goForgot"]');
  await d.click('.autofill');
  await d.page.locator(visible('label.chip:has(input[value="blacksky"])')).first().click();
  await d.settle();
  await d.fit();
  await d.shot('forgot-sheet', visibleSheet);
  await d.click('form[data-form="forgot"] [type="submit"]');
  await d.fit();
  await d.shot('checkemail-sheet', visibleSheet);
  await d.run(2800);
  await d.shot('mail-notification', '.notification .notif-card');
  await d.page.locator('.notification .notif-card').click();
  await d.settle();
  await d.fit();
  await d.shot('mail-window', '.browser');
  await d.click('[data-action="mailContinue"]');
  await d.fit();
  await d.shot('code-card', visible('.pv-main'));
  await d.shot('code-window', '.browser');

  // Scenario 4: Several accounts
  await d.boot('multi');
  await d.click('[data-action="atmosphereButton"]');
  await d.shot('chooser-card', '.fedcm-card');
  await d.shot('chooser-window', '.browser');
  await d.page.locator('[data-handle="alexcooks.eurosky.social"]').click();
  await d.settle();
  await d.run(1000);
  await d.fit();
  await d.shot('consent-tab-window', '.browser');

  // Scenario 5: Has one, doesn't know it
  await d.boot('hidden');
  await d.click('[data-action="createAccount"]');
  await d.fit();
  await d.shot('found-sheet', visibleSheet);
  await d.shot('found-window', '.browser');

  // Phone
  const p = await session(browser, { width: 390, height: 844 }, false);
  await p.boot('returning');
  await p.click('[data-action="atmosphereButton"]');
  await p.shot('phone-find', '.browser');
  await p.boot('multi');
  await p.click('[data-action="atmosphereButton"]');
  await p.shot('phone-chooser', '.browser');

  await browser.close();
  console.log('\ndone');
})().catch((e) => { console.error('\nFAILED', e); process.exit(1); });
