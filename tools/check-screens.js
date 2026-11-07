// Captures the restyle at key states. Usage: node restyle-check.js <repoRoot> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const S = path.resolve(__dirname, '.cache');
const [ROOT, OUT] = process.argv.slice(2);
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
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-03T10:00:00Z') });
  await page.route(/^https?:\/\//, (route) => {
    const url = route.request().url();
    if (url.startsWith('https://unpkg.com/lucide@0.469.0/')) return route.fulfill({ contentType: 'text/javascript', body: lucideJs });
    if (url.startsWith('https://fonts.googleapis.com/css2')) return route.fulfill({ contentType: 'text/css', body: css });
    const m = url.match(/^https:\/\/fonts\.gstatic\.com\/local\/([\w-]+)\.woff2/);
    if (m && files[m[1]]) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(files[m[1]]) });
    return route.abort();
  });
  const settle = async (ms = 60) => { await page.clock.runFor(ms); await sleep(40); };
  const act = (sel) => page.locator(`.tab-view:not([hidden]) ${sel}, .fedcm:not([hidden]) ${sel}`).first();
  return {
    page, settle,
    async boot(scenario) {
      await page.goto(`file://${ROOT}/index.html#${scenario}`);
      await page.waitForFunction(() => window.lucide && typeof startScenario === 'function' && document.querySelector('.pl-card'));
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' + (process.env.PIN_BAR ? ' .proto-bar{height:64px!important;min-height:64px!important;max-height:64px!important;overflow:hidden!important;box-sizing:border-box!important}' : '') + '' });
      await page.evaluate((open) => setNotes(open), notesOpen);
      await page.evaluate((id) => startScenario(id), scenario);
      await settle(); await page.evaluate(() => document.fonts.ready);
    },
    async click(sel) { await act(sel).click(); await settle(); await page.mouse.move(2, 2); await settle(); },
    async type(sel, text) { const l = act(sel); await l.fill(''); await l.type(text); await settle(); },
    async run(ms) { await page.clock.runFor(ms); await sleep(50); },
    async shot(name, sel) {
      await page.mouse.move(2, 2); await sleep(30);
      const file = path.join(OUT, `${name}.png`);
      if (sel) await page.locator(sel).first().screenshot({ path: file }); else await page.screenshot({ path: file });
      process.stdout.write(name + ' ');
    },
  };
}

(async () => {
  const browser = await chromium.launch();
  const d = await session(browser, { width: 1440, height: 900 }, true);
  const vis = (s) => `.tab-view:not([hidden]) ${s}`;
  await d.boot('new');
  await d.shot('w-signin');
  await d.click('[data-action="createAccount"]');
  await d.shot('w-create');
  await d.shot('a-create-sheet', vis('.sheet'));
  await d.boot('returning');
  await d.click('[data-action="atmosphereButton"]');
  await d.type('#handle', 'sam@bsky.social');
  await d.shot('a-find-sheet', vis('.sheet'));
  await d.page.locator(vis('.combo-opt')).first().click(); await d.settle();
  await d.click('[data-action="toProvider"]');
  await d.shot('a-provider-signin', vis('.pv-main'));
  await d.type('#current-password', 'password');
  await d.click('form[data-form="signin"] [type="submit"]');
  await d.run(800);
  await d.shot('a-consent', vis('.pv-main'));
  await d.click('[data-action="consentApprove"]');
  await d.run(2000);
  await d.page.locator(vis('.acct-menu summary')).first().click(); await d.settle();
  await d.shot('w-home-menu');
  await d.boot('multi');
  await d.click('[data-action="atmosphereButton"]');
  await d.shot('w-chooser');
  await d.shot('a-chooser', '.fedcm-card');
  // Narrow window: notes as an overlay
  const n = await session(browser, { width: 1000, height: 820 }, true);
  await n.boot('forgot');
  await n.shot('w-narrow-notes');
  // Phone
  const p = await session(browser, { width: 390, height: 844 }, false);
  await p.boot('new');
  await p.shot('p-signin');
  await p.page.evaluate(() => setNotes(true)); await p.settle();
  await p.shot('p-notes');
  await browser.close();
  console.log('\ndone');
})().catch((e) => { console.error('\nFAILED', e); process.exit(1); });
