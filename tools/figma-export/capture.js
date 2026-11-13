// Walks every scenario of the prototype and captures each screen as a Figma spec.
// Usage: node capture.js <desktop|phone> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const S = path.resolve(__dirname, '../.cache');
const MODE = process.argv[2] || 'desktop';
const OUT = process.argv[3] || path.join(S, 'out/specs');
fs.mkdirSync(path.join(OUT, MODE), { recursive: true });

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
const fontFaces = [
  ...[400, 500, 600, 700, 800].map((w) => `@font-face{font-family:'Inter';font-weight:${w};font-display:block;src:url(${u('inter-' + w)})}`),
  `@font-face{font-family:'Fraunces';font-weight:100 900;font-display:block;src:url(${u('fraunces')})}`,
  `@font-face{font-family:'Newsreader';font-weight:200 800;font-display:block;src:url(${u('newsreader')})}`,
  `@font-face{font-family:'Newsreader';font-style:italic;font-weight:200 800;font-display:block;src:url(${u('newsreader-i')})}`,
  `@font-face{font-family:'Comic Neue';font-weight:400;font-display:block;src:url(${u('comic-400')})}`,
  `@font-face{font-family:'Comic Neue';font-weight:700;font-display:block;src:url(${u('comic-700')})}`,
  `@font-face{font-family:'Comic Neue';font-style:italic;font-weight:400;font-display:block;src:url(${u('comic-400i')})}`,
].join('\n');
const extractJs = fs.readFileSync(path.join(__dirname, 'extract.js'), 'utf8');

// Palette from :root in styles.css
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const palette = {};
for (const m of css.matchAll(/--((?:accent|error|link|automated)-\d+|ink|paper|smoke|pl-[a-z-]+|bp-[a-z-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) {
  let hex = m[2].toLowerCase();
  if (hex.length === 4) hex = '#' + [...hex.slice(1)].map((c) => c + c).join('');
  // Potluck's palette is potluck/*, the prototype frame's is frame/*
  const name = m[1].replace(/^pl-/, 'potluck/').replace(/^bp-/, 'frame/').replace(/-(\d+)$/, '/$1');
  if (!palette[hex]) palette[hex] = name;
}

const COMPONENTS = [
  ['acct-menu', 'Account menu'], ['am-item', 'Menu item'], ['banner', 'Welcome banner'],
  ['two-accounts', 'Two accounts'], ['handshake', 'Handshake'],
  ['provider-opt', 'Provider option'], ['combo-opt', 'Suggestion'], ['fedcm-acct', 'Browser account'],
  ['notice', 'Notice'], ['autofill', 'Autofill'], ['acct', 'Account row'],
  ['tab', 'Browser tab'], ['omnibox', 'Address bar'], ['nav-btn', 'Browser button'],
  ['sheet-top', 'Sheet header'], ['sheet-foot', 'Sheet footer'],
  ['pv-head', 'Provider header'], ['pv-foot', 'Provider footer'], ['pl-head', 'Potluck header'],
  ['recipe-btn', 'Recipe card'], ['mini-recipe', 'Mini recipe'], ['wm-item', 'Mail list item'],
  ['notif-card', 'Mail notification'], ['toast', 'Toast'], ['switch', 'Switch'],
  ['pw-wrap', 'Password input'], ['suffix-input', 'Handle input'], ['locked-input', 'Locked input'],
  ['disclosure', 'Disclosure'], ['chip', 'Chip'], ['tag', 'Tag'],
  ['btn', 'Button'], ['atmo-btn', 'Atmosphere button'], ['pl-btn', 'Potluck button'], ['icon-btn', 'Icon button'],
  ['avatar', 'Avatar'], ['tile', 'Tile'], ['food', 'Food tile'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const vp = MODE === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-26T10:00:00Z') });
  await page.route(/^https?:\/\//, (route) => {
    const url = route.request().url();
    if (url.startsWith('https://unpkg.com/lucide@0.469.0/')) return route.fulfill({ contentType: 'text/javascript', body: lucideJs });
    if (url.startsWith('https://fonts.googleapis.com/css2')) return route.fulfill({ contentType: 'text/css', body: fontFaces });
    const m = url.match(/^https:\/\/fonts\.gstatic\.com\/local\/([\w-]+)\.woff2/);
    if (m && files[m[1]]) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(files[m[1]]) });
    return route.abort();
  });

  const index = [];
  const allIcons = {};
  let counter = 0;

  async function boot(scenario) {
    // A blank page first, so booting the same scenario again reloads it.
    await page.goto('about:blank');
    await page.goto(`file://${ROOT}/index.html#${scenario}`);
    await page.waitForFunction(() => window.lucide && typeof startScenario === 'function' && document.querySelector('.pl-card'), null, { polling: 100 });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} .fd-np-before::before,.fd-np-after::after{content:none!important}' });
    await page.addScriptTag({ content: extractJs });
    // A toast hides itself after a few seconds, so which states caught one
    // came down to timing. Here it stays up until its state is captured, then
    // goes: it shows in the state straight after the action that raised it.
    await page.evaluate(() => {
      const raise = window.toast;
      window.toast = function (...args) {
        raise.apply(this, args);
        clearTimeout(window.toast.timer);
      };
    });
    if (MODE === 'phone') await page.evaluate(() => setNotes(false));
    else await page.evaluate(() => setNotes(true));
    await page.evaluate((id) => startScenario(id), scenario);
    await settle();
  }
  async function settle(ms = 50) {
    await page.clock.runFor(ms);
    await sleep(30);
  }
  const act = (sel) => page.locator(`.tab-view:not([hidden]) ${sel}, .fedcm:not([hidden]) ${sel}, .notification:not([hidden]) ${sel}`).first();
  async function click(sel) {
    await act(sel).click();
    await settle();
  }
  async function run(ms) {
    await page.clock.runFor(ms);
    await sleep(40);
  }

  async function capture(scenario, id, label) {
    // Grow the window until nothing in the active tab scrolls.
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
          // Only a sheet held back by max-height grows with the window
          const capped = sheet && parseFloat(getComputedStyle(sheet).maxHeight) && sheet.getBoundingClientRect().height >= sheet.parentElement.clientHeight * 0.93 - 40;
          if (sb && capped) {
            const inFlow = [...sb.children].reduce((m, c) => (getComputedStyle(c).position === 'absolute' ? m : Math.max(m, c.getBoundingClientRect().bottom)), 0);
            need = Math.max(need, Math.ceil(inFlow - sb.getBoundingClientRect().bottom + parseFloat(getComputedStyle(sb).paddingBottom)));
          }
        }
        const fed = document.querySelector('.fedcm:not([hidden])');
        if (fed) {
          const v = document.querySelector('.viewport').getBoundingClientRect();
          const r = fed.getBoundingClientRect();
          need = Math.max(need, r.bottom - v.bottom + 12);
        }
        return Math.ceil(need);
      });
      if (extra <= 0) break;
      const cur = page.viewportSize();
      await page.setViewportSize({ width: cur.width, height: cur.height + Math.ceil(extra / 0.93) + 2 });
      await sleep(40);
    }
    // Blur focus rings unless the suggestions depend on focus.
    await page.evaluate(() => {
      const a = document.activeElement;
      if (a && a.id !== 'handle' && a.blur) a.blur();
    });
    await sleep(20);
    const num = String(++counter).padStart(2, '0');
    const file = `${scenario}-${num}-${id}`;
    const data = await page.evaluate(({ palette, components, mode }) => {
      const cfg = { palette, components };
      const br = document.querySelector('.browser');
      const notes = document.querySelector('.notes');
      const notif = document.querySelector('.notification:not([hidden])');
      FD.materialisePseudo(br);
      if (notif) FD.materialisePseudo(notif);
      const brRect = br.getBoundingClientRect();
      const out = { browser: FD.extract(br, cfg) };
      out.size = { w: brRect.width, h: brRect.height };
      if (mode === 'desktop' && notes && getComputedStyle(notes).display !== 'none') {
        const keep = notes.getAttribute('style') || '';
        notes.style.cssText += ';height:auto !important;max-height:none !important;overflow:visible !important;align-self:flex-start !important;flex:none !important;position:relative !important';
        FD.materialisePseudo(notes);
        const nr = notes.getBoundingClientRect();
        out.notes = FD.extract(notes, cfg);
        out.notesAt = { x: nr.left - brRect.left, y: nr.top - brRect.top };
        FD.restorePseudo(notes);
        notes.setAttribute('style', keep);
      }
      if (notif) {
        const card = notif;
        const nr = card.getBoundingClientRect();
        out.notif = FD.extract(card, cfg);
        out.notifAt = { x: nr.left - brRect.left, y: nr.top - brRect.top };
        FD.restorePseudo(notif);
      }
      FD.restorePseudo(br);
      return out;
    }, { palette, components: COMPONENTS, mode: MODE });
    Object.assign(allIcons, data.browser.icons, data.notes ? data.notes.icons : {}, data.notif ? data.notif.icons : {});
    const step = await page.evaluate(() => ({ step: S.step, title: STEPS[S.step]?.title || '', host: document.querySelector('#url-host').textContent }));
    const spec = { file, scenario, id, label, mode: MODE, step: step.step, stepTitle: step.title, host: step.host, size: data.size, browser: data.browser.tree, notes: data.notes ? data.notes.tree : null, notesAt: data.notesAt, notif: data.notif ? data.notif.tree : null, notifAt: data.notifAt };
    fs.writeFileSync(path.join(OUT, MODE, `${file}.json`), JSON.stringify(spec));
    await page.locator('.browser').screenshot({ path: path.join(OUT, MODE, `${file}.png`) });
    await page.evaluate(() => { els.toast.hidden = true; });
    index.push({ file, scenario, id, label, step: step.step, size: data.size });
    await page.setViewportSize(vp);
    await sleep(30);
    process.stdout.write(`${file} `);
  }

  const typeInto = async (sel, text) => {
    const loc = act(sel);
    await loc.fill('');
    await loc.type(text);
    await settle();
  };

  // ONLY=returning,forgot captures just those scenarios, while working on a walk.
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const want = (id) => !only || only.includes(id);

  // A simulated account setting, as the notes' “Try a variation” controls set it.
  async function vary(kind) {
    await page.evaluate((kind) => {
      const h = S.pending.profile.handle;
      if (kind === 'here' || kind === 'away') S.passkeys.set(h, [{ device: kind === 'here' ? thisDevice() : 'Old phone', here: kind === 'here' }]);
      if (kind === 'none') S.passkeys.delete(h);
      if (kind === 'codes') S.codesOn.add(h);
      if (kind === 'only') S.passkeyOnly.add(h);
      pvSignin(S.pending.profile, { quiet: true });
    }, kind);
    await settle();
  }

  // Front Door's search, as far as the provider's sign-in page.
  async function toProviderSignin(handle) {
    await click('[data-action="atmosphereButton"]');
    await typeInto('#handle', handle);
    await page.keyboard.press('Enter');
    await settle();
    await click('[data-action="toProvider"]');
  }

  // ---- Scenario 1: New to the Atmosphere (Jo) ----
  if (want('new')) {
    await boot('new');
    await capture('new', 'app.signin', 'Potluck sign-in');
    await click('[data-action="createAccount"]');
    await capture('new', 'fd.create', 'Create an Atmosphere account');
    await click('#create-submit');
    await capture('new', 'pv.signup', 'Provider sign-up');
    await click('.autofill');
    // The radios are hidden inside their cards, so press the cards.
    await click('label:has(input[name="method"][value="password"])');
    await capture('new', 'pv.signup.password', 'Sign up with a password');
    await click('label:has(input[name="method"][value="passkey"])');
    await capture('new', 'pv.signup.passkey', 'Sign up with a passkey');
    await click('form[data-form="signup"] [type="submit"]');
    await capture('new', 'browser.passkeyCreate', 'The browser makes a passkey');
    await page.locator('.fedcm [data-action="passkeyConfirm"]').click();
    await run(1000);
    await capture('new', 'pv.handle', 'Choose a handle');
    await click('form[data-form="handle"] [type="submit"]');
    await run(900);
    await capture('new', 'pv.consentFirst', 'Consent for an account made here');
    await click('[data-action="consentApprove"]');
    await run(650);
    await capture('new', 'pv.returning', 'Taking you back');
    await run(1200);
    await capture('new', 'app.home', 'Welcome, Jo');
    await run(2600);
    await capture('new', 'app.home.mail', 'Welcome email arrives');
    await page.locator('.notification .notif-card').click();
    await settle();
    await capture('new', 'mail.open', 'Welcome email');
    await click('[data-action="mailConfirm"]');
    await capture('new', 'pv.emailConfirmed', 'Email confirmed');
  }

  // ---- Scenario 2: Knows their details (Sam) ----
  if (want('returning')) {
    counter = 0;
    await boot('returning');
    await capture('returning', 'app.signin', 'Potluck sign-in');
    await click('[data-action="atmosphereButton"]');
    await capture('returning', 'fd.find', 'Find the account');
    await typeInto('#handle', 'sam@example.com');
    await page.keyboard.press('Enter');
    await settle();
    await capture('returning', 'fd.find.email', 'Typed an email');
    await typeInto('#handle', 'nobody.bsky.social');
    await page.keyboard.press('Enter');
    await settle();
    await capture('returning', 'fd.find.notFound', 'Handle not found');
    await typeInto('#handle', 'sam');
    await capture('returning', 'fd.find.suggestions', 'Suggestions while typing');
    await typeInto('#handle', 'sam@bsky.social');
    await capture('returning', 'fd.find.didYouMean', 'Did you mean');
    await act('.combo-opt').click();
    await settle();
    await capture('returning', 'fd.confirm', 'Is this you?');
    await click('[data-action="toProvider"]');
    await capture('returning', 'pv.signin', 'Provider sign-in');
    await typeInto('#current-password', 'password');
    await click('form[data-form="signin"] [type="submit"]');
    await run(800);
    await capture('returning', 'pv.passkeyOffer', 'Offered a passkey');
    await click('[data-action="passkeyOfferAdd"]');
    await capture('returning', 'browser.passkeyCreate', 'The browser makes a passkey');
    await page.locator('.fedcm [data-action="passkeyConfirm"]').click();
    await run(1000);
    await capture('returning', 'pv.consent', 'Consent');
    await click('[data-action="consentApprove"]');
    await run(650);
    await capture('returning', 'pv.returning', 'Taking you back');
    await run(1200);
    await capture('returning', 'app.home', 'You’re in, Sam');
    await act('.acct-menu summary').click();
    await settle();
    await capture('returning', 'app.home.menu', 'Account menu');
    await click('[data-action="openSettings"]');
    await capture('returning', 'app.settings', 'Account settings in Potluck');
    await click('[data-action="providerSettings"]');
    await run(200);
    await capture('returning', 'pv.security', 'Sign-in and security at Bluesky');
    await click('[data-action="backToApp"]');
    await act('.acct-menu summary').click();
    await settle();
    await click('[data-action="signOut"]');
    await capture('returning', 'app.signin.signedOut', 'Signed out');
    await click('[data-action="atmosphereButton"]');
    await capture('returning', 'fedcm.choose', 'Browser offers Sam’s account');

    // The variations on Bluesky's sign-in page.
    await boot('returning');
    await toProviderSignin('sam.bsky.social');
    await vary('here');
    await capture('returning', 'pv.signin.passkeyHere', 'A passkey saved on this device');
    await click('[data-action="usePasskey"]');
    await capture('returning', 'browser.passkey', 'Sign in with a passkey');
    await page.locator('.fedcm [data-action="passkeyConfirm"]').click();
    await run(1000);
    await capture('returning', 'pv.signin.withPasskey', 'Signed in with a passkey');

    await boot('returning');
    await toProviderSignin('sam.bsky.social');
    await vary('away');
    await click('[data-action="usePasskey"]');
    await capture('returning', 'browser.passkey.none', 'No passkey on this device');
    await page.locator('.fedcm [data-action="passkeyOtherDevice"]').click();
    await settle();
    await capture('returning', 'browser.passkey.phone', 'Use a phone or tablet');

    await boot('returning');
    await toProviderSignin('sam.bsky.social');
    await vary('codes');
    await typeInto('#current-password', 'password');
    await click('form[data-form="signin"] [type="submit"]');
    await run(800);
    await capture('returning', 'pv.totp', 'Verification code');

    await boot('returning');
    await toProviderSignin('sam.bsky.social');
    await vary('here');
    await vary('only');
    await typeInto('#current-password', 'password');
    await click('form[data-form="signin"] [type="submit"]');
    await capture('returning', 'pv.signin.passkeyOnly', 'Passkey only refuses a password');
  }

  // ---- Scenario 3: Forgot their details (Rae) ----
  if (want('forgot')) {
    counter = 0;
    await boot('forgot');
    await capture('forgot', 'app.signin', 'Potluck sign-in');
    await click('[data-action="atmosphereButton"]');
    await click('[data-action="goForgot"]');
    await capture('forgot', 'fd.forgot', 'Find the account by email');
    await click('.autofill');
    await act('label.chip:has(input[value="blacksky"])').click();
    await settle();
    await capture('forgot', 'fd.forgot.filled', 'Email and provider chosen');
    await click('form[data-form="forgot"] [type="submit"]');
    await capture('forgot', 'fd.checkEmail', 'Check your email');
    await run(2800);
    await capture('forgot', 'fd.checkEmail.mail', 'Email arrives');
    await page.locator('.notification .notif-card').click();
    await settle();
    await capture('forgot', 'mail.open', 'Recovery email, in a new tab');
    await page.locator('.tab-main').first().click();
    await settle();
    await click('[data-action="goRecover"]');
    await capture('forgot', 'fd.recover', 'Type the handle from the email');
    await typeInto('#handle', 'rae.blacksky.app');
    await page.keyboard.press('Enter');
    await settle();
    await capture('forgot', 'fd.confirm', 'Is this you?');
    await click('[data-action="toProvider"]');
    await capture('forgot', 'pv.code', 'Enter the code');
    // Rae types the code from the email.
    await typeInto('#otp', await page.evaluate(() => S.code));
    await click('form[data-form="code"] [type="submit"]');
    await run(700);
    await capture('forgot', 'pv.newPassword', 'How to sign in next time');
    await click('[data-action="recoveryAddPasskey"]');
    await capture('forgot', 'browser.passkeyCreate', 'The browser makes a passkey');
    await page.locator('.fedcm [data-action="passkeyConfirm"]').click();
    await run(1000);
    await capture('forgot', 'pv.consent', 'Consent');
    await click('[data-action="consentApprove"]');
    await run(650);
    await capture('forgot', 'pv.returning', 'Taking you back');
    await run(1500);
    await capture('forgot', 'app.home', 'You’re in, Rae');
  }

  // ---- Scenario 4: Several accounts (Alex) ----
  if (want('multi')) {
    counter = 0;
    await boot('multi');
    await capture('multi', 'app.signin', 'Potluck sign-in');
    await click('[data-action="atmosphereButton"]');
    await capture('multi', 'fedcm.choose', 'Browser account chooser');
    await act('[data-handle="alexcooks.eurosky.social"]').click();
    await settle();
    await capture('multi', 'fedcm.busy', 'Connecting to Eurosky');
    await run(1000);
    await capture('multi', 'pv.consentTab', 'Consent in a new tab');
    await click('[data-action="consentApprove"]');
    await run(650);
    await capture('multi', 'pv.returning', 'Closing the tab');
    await run(1500);
    await capture('multi', 'app.home', 'You’re in, Alex');
    await act('.acct-menu summary').click();
    await settle();
    await capture('multi', 'app.home.menu', 'Account menu');
    await click('[data-action="openSettings"]');
    await capture('multi', 'app.settings', 'Account settings in Potluck');
  }

  // ---- Scenario 5: Has one, doesn't know it (Priya) ----
  if (want('hidden')) {
    counter = 0;
    await boot('hidden');
    await capture('hidden', 'app.signin', 'Potluck sign-in');
    await click('[data-action="createAccount"]');
    await capture('hidden', 'fd.found', 'Existing account detected');
    await click('[data-action="toggleNew"]');
    await capture('hidden', 'fd.found.createAnyway', 'Create another anyway');
    await click('[data-action="useExisting"]');
    await run(100);
    await capture('hidden', 'pv.consentTab', 'Consent in a new tab');
    await click('[data-action="consentApprove"]');
    await run(650);
    await capture('hidden', 'pv.returning', 'Closing the tab');
    await run(1500);
    await capture('hidden', 'app.home', 'You’re in, Priya');
  }

  fs.writeFileSync(path.join(OUT, MODE, '_index.json'), JSON.stringify(index, null, 1));
  fs.writeFileSync(path.join(OUT, MODE, '_icons.json'), JSON.stringify(allIcons));
  console.log(`\n${MODE}: ${index.length} states, ${Object.keys(allIcons).length} icons`);
  await browser.close();
})().catch((e) => { console.error('\nFAILED', e); process.exit(1); });
