/* Front Door prototype

   A theatrical, front-end-only demo of signing in to an app on the Atmosphere.
   Nothing here talks to a server. Accounts, providers, emails and redirects
   are all simulated so the experience can be shown, discussed and tested.

   Who owns each screen:
     App        Potluck, the made-up app being signed in to
     Front Door the shared component, running inside the app (no extra server)
     Browser    the FedCM account chooser, drawn by the browser itself
     Provider   where the account lives (Bluesky, Blacksky, Eurosky…)
     Inbox      the person's own email */

'use strict';

/* ------------------------------------------------------------------------ */
/* Data                                                                     */
/* ------------------------------------------------------------------------ */

const APP = { name: 'Potluck', domain: 'potluck.kitchen' };

// Descriptions are placeholders. Who gets listed, and how, is open (D9).
const PROVIDERS = {
  potluck: { name: 'Potluck', host: 'account.potluck.kitchen', suffix: 'potluck.kitchen', glyph: 'cooking-pot', blurb: 'Potluck looks after your account for you. The quickest way to start.' },
  blacksky: { name: 'Blacksky', host: 'blacksky.app', suffix: 'blacksky.app', glyph: 'moon-star', blurb: 'A community-run home for Black people on the open social web.' },
  bluesky: { name: 'Bluesky', host: 'bsky.social', suffix: 'bsky.social', glyph: 'cloud', blurb: 'The biggest provider, run by the team behind the Bluesky app.' },
  eurosky: { name: 'Eurosky', host: 'eurosky.social', suffix: 'eurosky.social', glyph: 'star', blurb: 'Hosted in Europe and open to everyone.' },
  mu: { name: 'mu.social', host: 'mu.social', suffix: 'mu.social', glyph: 'μ', blurb: 'An independent provider.' },
  northsky: { name: 'Northsky', host: 'northsky.social', suffix: 'northsky.social', glyph: 'compass', blurb: 'A community-run provider.' },
  own: { name: 'Own server', host: '', suffix: '', glyph: 'server', blurb: 'Hosted on a server the person runs.' },
};

// The app pins its own default first; everyone else is A to Z so the
// prototype doesn't rank providers.
const OTHER_PROVIDERS = ['blacksky', 'bluesky', 'eurosky', 'mu', 'northsky'];
const RECOVERY_PROVIDERS = ['blacksky', 'bluesky', 'eurosky', 'mu', 'northsky', 'potluck'];

// Public profiles, as type-ahead would see them. Handle endings don't always
// match the provider: a custom domain can be hosted anywhere.
const PROFILES = [
  { name: 'Sam Okafor', handle: 'sam.bsky.social', provider: 'bluesky', email: 'sam.okafor@example.com' },
  { name: 'Sam Lee', handle: 'samlee.eurosky.social', provider: 'eurosky' },
  { name: 'Samira Haddad', handle: 'samira.blacksky.app', provider: 'blacksky' },
  { name: 'Sami Virtanen', handle: 'sami.northsky.social', provider: 'northsky' },
  { name: 'Samuel Adeyemi', handle: 'samuel.mu.social', provider: 'mu' },
  { name: 'Rae Thompson', handle: 'rae.blacksky.app', provider: 'blacksky', email: 'rae.thompson@example.com' },
  { name: 'Rae Kim', handle: 'raekim.bsky.social', provider: 'bluesky' },
  { name: 'Priya Shah', handle: 'priya.bsky.social', provider: 'bluesky', email: 'priya.shah@example.com' },
  { name: 'Alex Moreno', handle: 'alex.bsky.social', provider: 'bluesky', email: 'alex.moreno@example.com' },
  { name: 'Alex Cooks', handle: 'alexcooks.eurosky.social', provider: 'eurosky' },
  { name: 'Alex Moreno Studio', handle: 'alexmoreno.studio', provider: 'bluesky' },
  { name: 'Kit Ng', handle: 'kitng.net', provider: 'own', host: 'pds.kitng.net' },
  { name: 'Jordan Ellis', handle: 'jordan.northsky.social', provider: 'northsky' },
];

const RECIPES = [
  { title: 'Smoky tomato and red lentil soup', by: 'rae.blacksky.app', time: '35 min', icon: 'soup', tint: 2 },
  { title: 'Lemon, pea and mint orzo', by: 'samlee.eurosky.social', time: '20 min', icon: 'salad', tint: 0 },
  { title: 'Brown butter banana bread', by: 'priya.bsky.social', time: '1 hr 10 min', icon: 'cake-slice', tint: 5 },
  { title: 'Crispy chilli fried eggs', by: 'kitng.net', time: '10 min', icon: 'egg-fried', tint: 1 },
  { title: 'Weeknight tarka dal', by: 'samuel.mu.social', time: '40 min', icon: 'cooking-pot', tint: 3 },
  { title: 'Croissant bread and butter pudding', by: 'jordan.northsky.social', time: '50 min', icon: 'croissant', tint: 4 },
];

// Forgiving input. Handle endings people often get wrong, from support tickets.
const HANDLE_DOMAINS = { 'bsky.social': 'bluesky', 'blacksky.app': 'blacksky', 'eurosky.social': 'eurosky', 'mu.social': 'mu', 'northsky.social': 'northsky', 'potluck.kitchen': 'potluck' };
const DOMAIN_FIXES = { 'bsky.app': 'bsky.social', 'bluesky.social': 'bsky.social', 'bluesky.app': 'bsky.social', 'bsky.com': 'bsky.social', 'blacksky.community': 'blacksky.app', 'blacksky.social': 'blacksky.app', 'eurosky.app': 'eurosky.social', 'eurosky.tech': 'eurosky.social' };

const SCENARIOS = {
  new: {
    n: 1,
    label: 'New to the Atmosphere',
    persona: { name: 'Jo Park', email: 'jo.park@example.com' },
    browserAccounts: [],
    situation: 'Jo has never used Bluesky or any other Atmosphere app. A friend sent Jo a recipe on Potluck.',
    tryThis: [
      'Press <strong>Create an account</strong> (or <strong>Continue with Atmosphere</strong>, then “New here?”).',
      'Keep Potluck as the provider, or pick another one.',
      'Use the browser’s saved email. Any password of 8 or more characters works.',
    ],
    data: [['Email', 'jo.park@example.com'], ['Password', 'anything, 8+ characters']],
  },
  returning: {
    n: 2,
    label: 'Knows their details',
    personaHandle: 'sam.bsky.social',
    browserAccounts: [],
    situation: 'Sam uses Bluesky every day and knows their handle and password, but this is a new laptop, so the browser doesn’t know Sam yet.',
    tryThis: [
      'Press <strong>Continue with Atmosphere</strong>.',
      'Type <code>sam</code>, <code>@sam.bsky.social</code>, <code>sam@bsky.social</code> or <code>sam.bsky.app</code> and see what Front Door makes of it.',
      'Afterwards, sign out and sign in again. The browser now offers Sam’s account.',
    ],
    data: [['Handle', 'sam.bsky.social'], ['Password', 'anything']],
  },
  forgot: {
    n: 3,
    label: 'Forgot their details',
    personaHandle: 'rae.blacksky.app',
    browserAccounts: [],
    situation: 'Rae made a Blacksky account last year. Rae can’t remember the handle or the password, but does know the email address.',
    tryThis: [
      'Press <strong>Continue with Atmosphere</strong>, then <strong>Forgot your handle?</strong>',
      'Use Rae’s email and pick Blacksky, or “Not sure”.',
      'Open the email when it arrives (top right).',
    ],
    data: [['Email', 'rae.thompson@example.com'], ['Provider', 'Blacksky'], ['Code', 'shown in the email']],
  },
  multi: {
    n: 4,
    label: 'Several accounts',
    personaHandle: 'alex.bsky.social',
    browserAccounts: ['alex.bsky.social', 'alexcooks.eurosky.social', 'alexmoreno.studio'],
    situation: 'Alex has three accounts: a personal one on Bluesky, a cooking one on Eurosky and a work one on a custom domain. This browser has seen all three.',
    tryThis: [
      'Press <strong>Continue with Atmosphere</strong>. The browser lists Alex’s accounts.',
      'Pick the cooking account, Alex Cooks.',
      'Try the account menu afterwards to switch accounts.',
    ],
    data: [['Accounts', '3, remembered by the browser'], ['Password', 'not needed']],
  },
  hidden: {
    n: 5,
    label: 'Has one, doesn’t know it',
    personaHandle: 'priya.bsky.social',
    browserAccounts: ['priya.bsky.social'],
    situation: 'Priya uses Bluesky on this laptop but doesn’t think of it as an account for other apps. Priya assumes Potluck needs a new account.',
    tryThis: [
      'Press <strong>Create an account</strong>, as Priya would.',
      'Front Door finds the Bluesky account before anything is created.',
      'Use it, or open “Create a new account anyway” to see the other route.',
    ],
    data: [['Account', 'priya.bsky.social, known to the browser']],
  },
};

const PRINCIPLES = {
  recognition: 'Recognition before education',
  handshake: 'Show both sides of the handshake',
  noDuplicates: 'Never create an account they already have',
  forgive: 'Forgive the input',
  noDependency: 'No new dependency in the critical path',
  issuer: 'Provider as issuer, Atmosphere as network',
  ownWords: 'Permissions in the app’s own words',
  standard: 'Standard where it builds trust',
  measure: 'If we can’t measure it, we can’t sell it',
};

const OWNERS = {
  app: 'App',
  frontdoor: 'Front Door',
  browser: 'Browser',
  provider: 'Provider',
  inbox: 'Inbox',
};

const JOURNEY = [
  { id: 'button', label: 'Atmosphere button', owner: 'app' },
  { id: 'chooser', label: 'Browser account chooser', owner: 'browser' },
  { id: 'find', label: 'Find the account', owner: 'frontdoor' },
  { id: 'check', label: 'Check for an existing account', owner: 'frontdoor' },
  { id: 'choose', label: 'Choose a provider', owner: 'frontdoor' },
  { id: 'auth', label: 'Sign in or create the account', owner: 'provider' },
  { id: 'consent', label: 'Consent', owner: 'provider' },
  { id: 'back', label: 'Back in the app', owner: 'app' },
  { id: 'manage', label: 'Manage the account (later)', owner: 'provider' },
];

// Notes for each screen: who owns it, what it shows, and what's still open.
const STEPS = {
  'app.signin': {
    title: 'The app’s sign-in page', owner: 'app', journey: ['button'], event: 'app.signin_shown',
    what: 'One Atmosphere button. The line under it names Bluesky, because that’s the name people know. “Create an account” goes into the same flow, so newcomers get the existing-account check too.',
    principles: ['recognition', 'standard'],
    quote: ['Nobody, except for us, knows the word atmosphere', 'Tessa, Germ'],
    open: 'D10: “Continue with” (one door for signing in and signing up) or “Sign in with”? D2: when the Bluesky bridge copy can come off.',
  },
  'fedcm.choose': {
    title: 'Browser account chooser', owner: 'browser', journey: ['chooser'], event: 'browser.chooser_shown',
    what: 'The browser lists the Atmosphere accounts used on this device, including ones Potluck has never seen. Nothing to type. Potluck learns nothing until an account is picked.',
    principles: ['forgive', 'noDependency'],
    quote: ['so many of my users were just like having to sign in once a week', 'Dame, Anisota'],
    open: 'Relies on FedCM identity provider registration, still a Stage 1 proposal. Without it, Front Door falls back to handle entry.',
  },
  'fd.find': {
    title: 'Find the account', owner: 'frontdoor', journey: ['find'], event: 'frontdoor.find_shown',
    what: 'Accepts a handle, a name, a leading @, an email-style handle (sam@bsky.social) or a common mix-up (bsky.app, blacksky.community), and works out what was meant. Suggestions appear while typing. This runs inside Potluck: no extra server sits in the way.',
    principles: ['forgive', 'noDependency'],
    quote: ['handle is way too uh tech tech user specific', 'Guido, Sifa'],
    open: 'D1: “handle” or “username”? D5: where suggestions come from, and falling back to plain entry when that source is down.',
  },
  'fd.confirm': {
    title: 'Who we found, and where next', owner: 'frontdoor', journey: ['find'], event: 'frontdoor.account_found',
    what: 'Before the address bar changes, Front Door says which site comes next and why. Naming the provider’s address in advance is meant to defuse the “is this phishing?” moment.',
    principles: ['handshake', 'issuer'],
    quote: ['a lot of people saw this page, the OAuth page, for the very first time and they thought it was phishing', 'Bailey, PDS Moover'],
    open: 'Does this extra tap pay for itself in trust, or should Front Door redirect straight away? Test in R1.',
  },
  'fd.create': {
    title: 'Create an account', owner: 'frontdoor', journey: ['check', 'choose'], event: 'frontdoor.create_shown',
    what: 'The existing-account prompt sits inline at the top, not in a warning pop-up. Then pick where the account lives: Potluck is pinned as the app’s default and everyone else is listed A to Z.',
    principles: ['noDuplicates', 'issuer'],
    quote: ['there’s a 75% drop off from people seeing the login page to coming back.', 'Guido, Sifa'],
    open: 'D7: how strong the existing-account prompt should be. D9: who gets listed, and in what order.',
  },
  'fd.found': {
    title: 'Existing account detected', owner: 'frontdoor', journey: ['check'], event: 'frontdoor.existing_account_offered',
    what: 'Priya came to make a new account, but the browser knows Priya is signed in to Bluesky. Front Door offers that account first. Making a second one is still possible, one tap away.',
    principles: ['noDuplicates', 'recognition'],
    quote: ['So if you click sign up, then it says, are you sure you don’t have an account yet?', 'Flo, Atmo.rsvp'],
    open: 'Guido expects any existing-account step to cost sign-ups. Only the P4 A/B test in a partner app will settle it.',
  },
  'fd.forgot': {
    title: 'Find the account by email', owner: 'frontdoor', journey: ['find'], event: 'frontdoor.recovery_shown',
    what: 'Front Door never looks up emails itself. It asks the provider to email the account details to the owner, and the screen never reveals whether an account exists.',
    principles: ['noDependency', 'forgive'],
    quote: ['So it is the email that defines who you are.', 'Holke, Hypercerts'],
    open: 'D6: email sign-in under the Atmosphere name. “Not sure” asks several providers at once, which needs protocol support and a privacy review.',
  },
  'fd.checkEmail': {
    title: 'Check your email', owner: 'frontdoor', journey: ['find'], event: 'frontdoor.recovery_sent',
    what: 'Says who the email will come from and that it can be slow, with a way out if it never arrives.',
    principles: ['issuer'],
    evidence: 'Some of MaEarth’s one-time codes never reached Hotmail users. A couple of dozen people contacted support, and more probably gave up (Erika, MaEarth).',
    open: 'How long to wait before suggesting another provider.',
  },
  'mail.open': {
    title: 'Email from the provider', owner: 'inbox', journey: [], event: 'inbox.email_opened',
    what: 'Emails come from the provider that holds the account, not from Potluck or Atmosphere. A recovery email carries the forgotten handle and a one-time code. A welcome email repeats the handle so it’s easy to find later.',
    principles: ['issuer', 'handshake'],
    open: 'Should every provider email say which app asked for it?',
  },
  'pv.signin': {
    title: 'Provider sign-in', owner: 'provider', journey: ['auth'], event: 'provider.signin_shown',
    what: 'The provider’s own page, on its own address. Front Door passed the handle through, so only the password is left. The footer says whose page this is and that Potluck never sees the password.',
    principles: ['handshake', 'issuer'],
    quote: ['especially because now it redirects to something that looks like it’s owned by Bluesky.', 'Pouria, Semble'],
    open: 'Providers own this page. This layout is what we’d propose to the reference PDS and Bluesky’s entryway (D8).',
  },
  'pv.code': {
    title: 'Sign in with an emailed code', owner: 'provider', journey: ['auth'], event: 'provider.code_shown',
    what: 'The code from the email signs the person in. The browser offers to fill it in from Mail, as phones already do.',
    principles: ['forgive'],
    quote: ['ideally, there would be still a way to just put in your email and then log in with that.', 'Holke, Hypercerts'],
    open: 'Should providers offer code sign-in all the time, not only for recovery?',
  },
  'pv.newPassword': {
    title: 'New password, optional', owner: 'provider', journey: ['auth'], event: 'provider.password_offered',
    what: 'The person is already signed in. A new password is offered, not forced, so getting into Potluck isn’t held up.',
    principles: ['forgive'],
    open: 'Offer a passkey here instead of a password (Eli, Streamplace).',
  },
  'pv.signup': {
    title: 'Create the account at the provider', owner: 'provider', journey: ['auth'], event: 'provider.signup_shown',
    what: 'Account creation belongs to the provider, whether that’s Potluck’s own hosting or anyone else. Two fields. The confirmation email doesn’t block getting in.',
    principles: ['issuer', 'noDuplicates'],
    quote: ['even if you lose two or 3% of users, if you scale up, that’s a lot.', 'Holke, Hypercerts'],
    open: 'Passkeys instead of passwords. Where age checks and terms belong.',
  },
  'pv.handle': {
    title: 'Choose a handle', owner: 'provider', journey: ['auth'], event: 'provider.handle_shown',
    what: 'Comes after email and password, with a suggestion already filled in and a live availability check. The copy says the handle works across apps.',
    principles: ['forgive', 'recognition'],
    quote: ['I think handle always kind of lands pretty well for people', 'Bailey, PDS Moover'],
    open: 'D1: is “handle” the right word for people outside atproto?',
  },
  'pv.consent': {
    title: 'Consent, redesigned', owner: 'provider', journey: ['consent'], event: 'provider.consent_shown',
    what: 'Framed as connecting two accounts, with both shown. Each permission is in Potluck’s words with a reason, and optional ones can be switched off. The technical detail is there for anyone who opens it.',
    principles: ['handshake', 'ownWords', 'standard'],
    quote: ['That sounds like, Oh, they’re asking for root access to my account.', 'Eli, Streamplace'],
    open: 'Per-permission reasons need a new client-metadata field, which is a protocol change. D8: who owns this screen’s design.',
  },
  'pv.consentPopup': {
    title: 'Consent in a pop-up', owner: 'provider', journey: ['consent'], event: 'provider.consent_shown',
    what: 'After an account is picked in the browser chooser, the provider asks for consent in a pop-up window (FedCM’s “continue on” step). Potluck’s page stays put underneath, and the pop-up shows the provider’s own address.',
    principles: ['handshake', 'ownWords'],
    quote: ['it’d be really nice if like on that OAuth screen, they could see Anisota’s logo somewhere as like the app that they’re trying to connect to.', 'Dame, Anisota'],
    open: 'Pop-ups are easy to lose behind other windows on desktop. Test whether people find their way back.',
  },
  'pv.consentFirst': {
    title: 'Consent for an account made here', owner: 'provider', journey: ['consent'], event: 'provider.consent_shown',
    what: 'The account was just made for Potluck, so this is a short summary with the detail one tap away. Certified skips consent for its own apps, and Holke now thinks they simplified too much.',
    principles: ['ownWords', 'handshake'],
    open: 'Is any confirmation needed here at all?',
  },
  'app.home': {
    title: 'Signed in', owner: 'app', journey: ['back'], event: 'app.home_shown',
    what: 'Back in Potluck. Now, not at the door, is when the network gets explained. Account settings link out to the provider, which owns them.',
    principles: ['recognition', 'issuer', 'measure'],
    quote: ['It is only after you get through the account creation when you’re walking through some of the onboarding steps that we have that we surface that there is such a thing as the atmosphere.', 'Rishi, Blacksky'],
    open: 'D11: where managing, moving and deleting the account live, and how in-app deletion meets App Store and EU rules.',
  },
};

/* ------------------------------------------------------------------------ */
/* State                                                                    */
/* ------------------------------------------------------------------------ */

let S;
let runCounter = 0;

function freshState(id) {
  return {
    scenario: id,
    run: ++runCounter,
    startedAt: Date.now(),
    flowStart: null,
    screens: 0,
    browserAccounts: [...SCENARIOS[id].browserAccounts], // accounts the browser can offer (FedCM)
    approved: new Set(), // handles already connected to Potluck
    created: [], // accounts made during this run
    signedIn: null,
    pending: null, // { profile, isNew } while a sign-in is in progress
    draft: {},
    code: null,
    declinedPost: false,
    consentInPopup: false,
    flash: null,
    step: null,
    visited: new Set(),
    events: [],
    mailbox: new Map(),
  };
}

// Timers belong to a run, so switching scenario never lets an old email arrive.
function later(fn, ms) {
  const run = S.run;
  setTimeout(() => {
    if (S.run === run) fn();
  }, ms);
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);

const els = {
  scenarioNav: $('#scenario-nav'),
  notesToggle: $('#notes-toggle'),
  tabIcon: $('#tab-icon'),
  tabTitle: $('#tab-title'),
  omnibox: $('#omnibox'),
  urlHost: $('#url-host'),
  urlPath: $('#url-path'),
  page: $('#page'),
  layer: $('#layer'),
  fedcm: $('#fedcm'),
  toast: $('#toast'),
  notif: $('#notification'),
  mail: $('#mail'),
  notesScenario: $('#notes-scenario'),
  notesStep: $('#notes-step'),
  notesJourney: $('#notes-journey'),
  notesEvents: $('#notes-events'),
  live: $('#live'),
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const icon = (name, cls = '') => `<i data-lucide="${name}" class="icon ${cls}" aria-hidden="true"></i>`;

function paintIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

// Placeholder Atmosphere mark: a planet inside its atmosphere. Works in one colour.
function mark(cls = '') {
  return `<svg class="mark ${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 2.75a9.25 9.25 0 1 1-8.01 4.62" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}

const first = (name) => name.split(/\s+/)[0];

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function avatar(person, size = '') {
  const initials = person.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return `<span class="avatar ${size ? `avatar-${size}` : ''} tint-${hash(person.name) % 5}" aria-hidden="true">${esc(initials)}</span>`;
}

function providerTile(id, size = '') {
  const p = PROVIDERS[id];
  const inner = [...p.glyph].length === 1 ? `<span class="glyph">${p.glyph}</span>` : icon(p.glyph);
  return `<span class="tile ${size ? `tile-${size}` : ''} ${id === 'potluck' ? 'tile-app' : ''}" aria-hidden="true">${inner}</span>`;
}

const appTile = (size = '') => `<span class="tile tile-app ${size ? `tile-${size}` : ''}" aria-hidden="true">${icon('cooking-pot')}</span>`;

const allProfiles = () => PROFILES.concat(S.created);
const profile = (handle) => allProfiles().find((p) => p.handle === handle);
const hostFor = (p) => p.host || PROVIDERS[p.provider].host;
const providerName = (p) => (p.provider === 'own' ? hostFor(p) : PROVIDERS[p.provider].name);

function accountRow(p, { meta = true } = {}) {
  return `<span class="acct">${avatar(p)}<span class="acct-text"><span class="acct-name">${esc(p.name)}</span><span class="acct-handle">@${esc(p.handle)}</span></span>${
    meta ? `<span class="acct-provider">${providerTile(p.provider, 'xs')}${esc(providerName(p))}</span>` : ''
  }</span>`;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}•••••@${domain}`;
}

// Let long handles wrap at the dots rather than mid-word.
const breakable = (text) => esc(text).replace(/\./g, '.<wbr>');

const formatCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

function announce(text) {
  els.live.textContent = '';
  requestAnimationFrame(() => {
    els.live.textContent = text;
  });
}

function toast(text, iconName = 'info') {
  els.toast.innerHTML = `${icon(iconName)}<span>${text}</span>`;
  els.toast.hidden = false;
  paintIcons();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3400);
}

function busy(button, label) {
  if (!button) return;
  button.disabled = true;
  button.innerHTML = `${icon('loader-circle', 'spin')}<span>${label}</span>`;
  paintIcons();
}

function focusIn(root) {
  const target = root.querySelector('[data-autofocus]') || root.querySelector('h1, h2');
  if (!target) return;
  if (!target.matches('input')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

function fieldMsg(field, type, html) {
  const box = $(`#${field}-msg`);
  if (!box) return;
  const icons = { error: 'circle-alert', info: 'info', auto: 'wand-sparkles', ok: 'circle-check' };
  box.innerHTML = html ? `<div class="notice notice-${type}">${icon(icons[type])}<p>${html}</p></div>` : '';
  const input = $(`#${field}`);
  if (input) input.setAttribute('aria-invalid', String(type === 'error' && Boolean(html)));
  paintIcons();
}

function autofillButton(target, value, source, iconName) {
  return `<button type="button" class="autofill" data-action="autofill" data-target="${target}" data-value="${esc(value)}">${icon(iconName)}<span class="autofill-value">${esc(value)}</span><span class="autofill-source">${source}</span></button>`;
}

function passwordInput(id, autocomplete) {
  return `<div class="pw-wrap"><input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required aria-describedby="${id}-msg"><button type="button" class="icon-btn icon-btn-sm" data-action="togglePassword" data-target="${id}" aria-label="Show password" aria-pressed="false">${icon('eye')}</button></div>`;
}

/* ------------------------------------------------------------------------ */
/* Browser, layers and notes                                                */
/* ------------------------------------------------------------------------ */

function setBrowser({ host, path = '', title, favicon }) {
  const moved = els.urlHost.textContent !== host;
  els.urlHost.textContent = host;
  els.urlPath.textContent = path;
  els.tabTitle.textContent = title;
  els.tabIcon.innerHTML = favicon;
  if (moved) {
    els.omnibox.classList.remove('is-new');
    void els.omnibox.offsetWidth;
    els.omnibox.classList.add('is-new');
    announce(`Now on ${host}`);
  }
}

function closeLayer() {
  els.layer.hidden = true;
  els.layer.innerHTML = '';
  els.page.inert = Boolean(!els.fedcm.hidden);
}

function closeFedcm() {
  els.fedcm.hidden = true;
  els.fedcm.innerHTML = '';
  els.page.inert = Boolean(!els.layer.hidden);
}

function showPage(markup, browser) {
  closeLayer();
  closeFedcm();
  setBrowser(browser);
  els.page.innerHTML = markup;
  els.page.scrollTop = 0;
  paintIcons();
  focusIn(els.page);
}

function sheet(body, { back } = {}) {
  return `
    <div class="sheet-top">
      ${back ? `<button class="icon-btn" type="button" data-action="${back}" aria-label="Back">${icon('arrow-left')}</button>` : ''}
      <span class="sheet-brand">${mark('mark-sm')}Atmosphere account</span>
      <button class="icon-btn" type="button" data-action="closeSheet" aria-label="Close">${icon('x')}</button>
    </div>
    <div class="sheet-body">${body}</div>
    <div class="sheet-foot">${mark('mark-xs')}<span>One account for Bluesky and a growing world of apps.</span></div>`;
}

function showSheet(markup) {
  closeFedcm();
  els.layer.className = 'layer layer-sheet';
  els.layer.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${markup}</div>`;
  els.layer.hidden = false;
  els.page.inert = true;
  paintIcons();
  focusIn(els.layer);
}

function showPopup(p, path, inner) {
  closeFedcm();
  els.layer.className = 'layer layer-popup';
  els.layer.innerHTML = `
    <div class="popup" role="dialog" aria-modal="true" aria-label="${esc(providerName(p))} pop-up window">
      <div class="popup-bar">${icon('lock')}<span class="popup-url"><strong>${esc(hostFor(p))}</strong>${path}</span><button class="icon-btn icon-btn-sm" type="button" data-action="consentCancel" aria-label="Close pop-up">${icon('x')}</button></div>
      <div class="popup-body">${providerFrame(p.provider, inner, { compact: true })}</div>
    </div>`;
  els.layer.hidden = false;
  els.page.inert = true;
  paintIcons();
  focusIn(els.layer);
}

function enter(stepId) {
  const step = STEPS[stepId];
  S.step = stepId;
  if (S.flowStart) S.screens += 1;
  step.journey.forEach((j) => S.visited.add(j));
  if (step.event) track(step.event);
  renderNotes();
}

function track(name, detail = '') {
  const t = ((Date.now() - S.startedAt) / 1000).toFixed(1);
  S.events.push({ t, name, detail });
  renderEvents();
}

function renderScenarioNav() {
  els.scenarioNav.innerHTML = Object.entries(SCENARIOS)
    .map(([id, sc]) => `<button class="scenario-btn" type="button" data-scenario="${id}" aria-pressed="${id === S.scenario}"><span class="scenario-num">${sc.n}</span>${sc.label}</button>`)
    .join('');
}

function personaFor(sc) {
  return sc.persona || profile(sc.personaHandle);
}

function renderNotes() {
  const sc = SCENARIOS[S.scenario];
  const persona = personaFor(sc);
  const step = STEPS[S.step];

  els.notesScenario.innerHTML = `
    <p class="ns-label">Scenario ${sc.n} of ${Object.keys(SCENARIOS).length}</p>
    <div class="persona">${avatar(persona, 'md')}<div><p class="persona-name">${esc(persona.name)}</p><p class="persona-title">${sc.label}</p></div></div>
    <p>${sc.situation}</p>
    <p class="ns-sub">Try this</p>
    <ol class="try">${sc.tryThis.map((t) => `<li>${t}</li>`).join('')}</ol>
    <dl class="demo-data">${sc.data.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

  els.notesStep.innerHTML = `
    <p class="ns-label">This screen</p>
    <h2 class="ns-title">${step.title}</h2>
    <p class="owner"><span class="owner-dot owner-${step.owner}" aria-hidden="true"></span>Owned by <strong>${OWNERS[step.owner]}</strong></p>
    <p>${step.what}</p>
    ${step.principles.length ? `<p class="ns-sub">Principles</p><ul class="chips">${step.principles.map((k) => `<li>${PRINCIPLES[k]}</li>`).join('')}</ul>` : ''}
    ${step.quote ? `<figure class="quote"><blockquote>“${step.quote[0]}”</blockquote><figcaption>${step.quote[1]}</figcaption></figure>` : ''}
    ${step.evidence ? `<p class="evidence">${step.evidence}</p>` : ''}
    ${step.open ? `<p class="ns-sub">Open questions</p><p>${step.open}</p>` : ''}`;

  els.notesJourney.innerHTML = `
    <p class="ns-label">Journey</p>
    <ol class="journey">${JOURNEY.map((j) => {
      const current = step.journey.includes(j.id);
      const seen = S.visited.has(j.id) && !current;
      return `<li class="${current ? 'is-current' : ''}${seen ? ' is-seen' : ''}"${current ? ' aria-current="step"' : ''}><span class="owner-dot owner-${j.owner}" aria-hidden="true"></span><span class="j-label">${j.label}</span><span class="j-owner">${OWNERS[j.owner]}</span></li>`;
    }).join('')}</ol>`;
  paintIcons();
}

function renderEvents() {
  const recent = S.events.slice(-14).reverse();
  els.notesEvents.innerHTML = `
    <p class="ns-label">Events</p>
    <p class="ns-fine">What an adopting app could count, opt-in and in aggregate, to show the flow is working.</p>
    <ol class="events">${recent.map((e) => `<li><span class="ev-t">${e.t}s</span><code>${e.name}</code>${e.detail ? `<span class="ev-d">${esc(e.detail)}</span>` : ''}</li>`).join('')}</ol>`;
}

function setNotes(open) {
  document.body.dataset.notes = open ? 'open' : 'closed';
  els.notesToggle.setAttribute('aria-expanded', String(open));
  try {
    localStorage.setItem('frontdoor-notes', open ? 'open' : 'closed');
  } catch {
    /* storage can be unavailable; the panel still works */
  }
}

/* ------------------------------------------------------------------------ */
/* Potluck: the app                                                         */
/* ------------------------------------------------------------------------ */

function potluckHeader(p) {
  return `
    <header class="pl-head">
      <a class="pl-logo" href="#" data-action="noop" aria-label="Potluck home">${appTile('sm')}<span>potluck</span></a>
      <nav class="pl-nav" aria-label="Potluck"><a href="#" data-action="noop">Recipes</a><a href="#" data-action="noop">Cookbooks</a><a href="#" data-action="noop">${p ? 'Friends' : 'About'}</a></nav>
      ${p ? accountMenu(p) : ''}
    </header>`;
}

function food(r) {
  return `<span class="food tint-${r.tint}" aria-hidden="true">${icon(r.icon)}</span>`;
}

function appSignin({ quiet = false } = {}) {
  const flash = S.flash;
  S.flash = null;
  const flashMarkup = {
    cancelled: `<div class="notice notice-info">${icon('info')}<p>You didn’t connect an account, so you’re not signed in. Try again whenever you like.</p></div>`,
    signedOut: `<div class="notice notice-ok">${icon('circle-check')}<p>You’ve signed out. Next time, your browser can offer this account.</p></div>`,
  }[flash] || '';

  showPage(`
    <div class="potluck">
      ${potluckHeader(null)}
      <main class="pl-signin">
        <section aria-label="About Potluck">
          <p class="pl-kicker">Recipes from people you know</p>
          <h1 class="pl-display">Cook it. Share it. Keep it.</h1>
          <p class="pl-lede">Potluck is where friends swap the recipes they actually make. Save what you love and share what you cook.</p>
          <ul class="pl-cards">
            ${RECIPES.slice(0, 3).map((r) => `<li class="mini-recipe">${food(r)}<span><strong>${r.title}</strong><span class="by">by @${r.by}</span></span></li>`).join('')}
          </ul>
        </section>
        <section class="pl-card" aria-labelledby="pl-signin-title">
          ${flashMarkup}
          <h2 id="pl-signin-title">Sign in to Potluck</h2>
          <p class="pl-card-lede">Save recipes, follow friends and share what you cook.</p>
          <button class="atmo-btn" type="button" data-action="atmosphereButton">${mark()}<span>Continue with Atmosphere</span></button>
          <p class="pl-bridge">Works with your Bluesky account, and with Blacksky, Eurosky and other Atmosphere accounts.</p>
          <details class="explainer">
            <summary>${icon('circle-help')}<span>What’s an Atmosphere account?</span></summary>
            <div class="explainer-body">
              <p>If you use Bluesky, you already have one. The same account works on Potluck and a growing number of other apps.</p>
              <p>Like email, lots of different providers can look after it, and you can move between them without starting again.</p>
            </div>
          </details>
          <div class="pl-divider"><span>New to Potluck?</span></div>
          <button class="pl-btn" type="button" data-action="createAccount">Create an account</button>
          <p class="pl-legal">By continuing you agree to Potluck’s <a href="#" class="link" data-action="noop">Terms</a> and <a href="#" class="link" data-action="noop">Privacy Policy</a>.</p>
        </section>
      </main>
    </div>`, { host: APP.domain, path: '/sign-in', title: 'Sign in · Potluck', favicon: appTile('xs') });
  if (!quiet) enter('app.signin');
}

function accountMenu(p) {
  const pv = PROVIDERS[p.provider];
  return `
    <details class="acct-menu">
      <summary aria-label="Account menu for @${esc(p.handle)}">${avatar(p, 'sm')}<span class="am-handle">@${esc(p.handle)}</span>${icon('chevron-down')}</summary>
      <div class="am-panel">
        <div class="am-who">${accountRow(p, { meta: false })}</div>
        <p class="am-issuer">${providerTile(p.provider, 'xs')}<span>${esc(pv.name)} account</span><span aria-hidden="true">·</span>${mark('mark-xs')}<span>Atmosphere</span></p>
        <button class="am-item" type="button" data-action="switchAccount">${icon('users-round')}Switch account</button>
        <button class="am-item" type="button" data-action="manageAccount">${icon('external-link')}Manage account on ${esc(pv.name)}</button>
        <button class="am-item" type="button" data-action="signOut">${icon('log-out')}Sign out</button>
      </div>
    </details>`;
}

function welcomeCopy(p, isNew) {
  const pv = PROVIDERS[p.provider];
  const name = esc(first(p.name));
  const handle = `<strong>@${esc(p.handle)}</strong>`;
  if (isNew && p.provider === 'potluck') {
    return `<h1 id="banner-title">Welcome to Potluck, ${name}.</h1><p>Your handle is ${handle}. It’s an Atmosphere account, so you can also use it to sign in to Bluesky and other apps.</p>`;
  }
  if (isNew) {
    return `<h1 id="banner-title">Welcome to Potluck, ${name}.</h1><p>Your new ${esc(pv.name)} account, ${handle}, is ready. It works here, on Bluesky and on other Atmosphere apps.</p>`;
  }
  const others = p.provider === 'bluesky' ? 'Bluesky' : `${esc(pv.name)}, Bluesky`;
  return `<h1 id="banner-title">You’re in, ${name}.</h1><p>You signed in with your ${esc(pv.name)} account, ${handle}. It works here because ${others} and Potluck are all part of the Atmosphere: one account for a growing world of apps. Recipes you save are kept in your account, so they’re yours even if you stop using Potluck.</p>`;
}

function recipeCard(r) {
  const author = profile(r.by);
  return `<li><button type="button" class="recipe-btn" data-action="noop">
      ${food(r)}
      <span class="recipe-title">${r.title}</span>
      <span class="recipe-meta">${avatar(author, 'xs')}<span>@${r.by}</span></span>
      <span class="recipe-time">${icon('clock')}${r.time}</span>
    </button></li>`;
}

function appHome({ isNew = false } = {}) {
  const p = S.signedIn;
  showPage(`
    <div class="potluck">
      ${potluckHeader(p)}
      <main class="pl-home">
        <section class="banner" aria-labelledby="banner-title">
          <span class="banner-mark">${mark()}</span>
          <div class="banner-text">
            ${welcomeCopy(p, isNew)}
            ${S.declinedPost ? `<p class="banner-note">${icon('info')}Sharing recipes to your followers is off. You can switch it on in Settings at any time.</p>` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" type="button" data-action="dismissBanner">Got it</button>
        </section>
        <h2 class="pl-section">Cooking this week</h2>
        <ul class="recipe-grid">${RECIPES.map(recipeCard).join('')}</ul>
      </main>
    </div>`, { host: APP.domain, path: '/kitchen', title: 'Your kitchen · Potluck', favicon: appTile('xs') });
  enter('app.home');
}

/* ------------------------------------------------------------------------ */
/* Browser account chooser (FedCM)                                          */
/* ------------------------------------------------------------------------ */

function fedcmChoose() {
  const accounts = S.browserAccounts.map(profile).filter(Boolean);
  const one = accounts.length === 1 ? accounts[0] : null;
  const body = one
    ? `<div class="fedcm-one">${accountRow(one)}<button class="btn btn-primary btn-block" type="button" data-action="fedcmPick" data-handle="${one.handle}">Continue as ${esc(first(one.name))}</button></div>`
    : `<ul class="fedcm-list">${accounts.map((p) => `<li><button class="fedcm-acct" type="button" data-action="fedcmPick" data-handle="${p.handle}">${accountRow(p)}</button></li>`).join('')}</ul>`;

  els.fedcm.innerHTML = `
    <div class="fedcm-card" role="dialog" aria-labelledby="fedcm-title">
      <div class="fedcm-head">
        ${mark('mark-sm')}
        <div class="fedcm-head-text" id="fedcm-title"><strong>Sign in to ${APP.domain}</strong><span>${one ? 'with your Atmosphere account' : 'Choose an Atmosphere account'}</span></div>
        <button class="icon-btn icon-btn-sm" type="button" data-action="fedcmClose" aria-label="Close">${icon('x')}</button>
      </div>
      ${body}
      <button class="fedcm-other" type="button" data-action="fedcmOther">${icon('user-plus')}Use another account</button>
      <p class="fedcm-fine">Your browser shows Atmosphere accounts you’ve used on this device. ${APP.name} doesn’t see them unless you pick one.</p>
    </div>`;
  els.fedcm.hidden = false;
  els.page.inert = true;
  paintIcons();
  focusIn(els.fedcm);
  els.fedcm.querySelector('[data-action="fedcmPick"]')?.focus();
  enter('fedcm.choose');
}

function fedcmPick(handle) {
  const p = profile(handle);
  const returning = S.approved.has(handle);
  track('browser.account_picked', providerName(p));
  els.fedcm.querySelector('.fedcm-card').innerHTML = `<div class="fedcm-busy">${icon('loader-circle', 'spin')}<span>${returning ? `Signing you in as @${esc(handle)}…` : `Connecting to ${esc(providerName(p))}…`}</span></div>`;
  paintIcons();
  later(() => {
    closeFedcm();
    continueWithBrowserAccount(handle);
  }, 900);
}

function continueWithBrowserAccount(handle) {
  const p = profile(handle);
  S.pending = { profile: p, isNew: false };
  S.flowStart = S.flowStart || Date.now();
  if (S.approved.has(handle)) {
    track('browser.returning_sign_in');
    completeSignIn();
    return;
  }
  pvConsent(p, { popup: true });
}

/* ------------------------------------------------------------------------ */
/* Front Door: find the account                                             */
/* ------------------------------------------------------------------------ */

const combo = { items: [], active: -1 };

// Turn whatever someone typed into a handle, a partial name, or an email.
function interpret(raw) {
  let s = raw.trim().toLowerCase().replace(/\s+/g, '');
  const fixes = [];
  s = s.replace(/^@+/, ''); // a leading @ is fine; drop it silently
  const link = s.match(/bsky\.app\/profile\/([^/?#]+)/);
  if (link) {
    s = link[1];
    fixes.push({ type: 'link' });
  }
  if (s.includes('@')) {
    const [local, domain] = s.split('@');
    if (!(domain in HANDLE_DOMAINS) && !(domain in DOMAIN_FIXES)) return { kind: 'email', value: s, fixes };
    s = `${local}.${domain}`;
    fixes.push({ type: 'email-style' });
  }
  for (const [bad, good] of Object.entries(DOMAIN_FIXES)) {
    if (s.endsWith(`.${bad}`)) {
      s = s.slice(0, -bad.length) + good;
      fixes.push({ type: 'ending', bad, good });
      break;
    }
  }
  if (!s.includes('.')) return { kind: 'partial', value: s, fixes };
  return { kind: 'handle', value: s, fixes };
}

function suggestionsFor(raw) {
  const r = interpret(raw);
  const nameQuery = raw.trim().toLowerCase().replace(/^@+/, '');
  if (r.kind === 'email' || nameQuery.length < 2) return [];
  const out = [];
  if (r.kind === 'handle') {
    const exact = profile(r.value);
    if (exact) out.push({ p: exact, fixed: r.fixes.length > 0, raw, r });
  }
  for (const p of allProfiles()) {
    if (out.some((o) => o.p === p)) continue;
    const name = p.name.toLowerCase();
    if (p.handle.startsWith(r.value) || name.startsWith(nameQuery) || name.split(/\s+/).some((w) => w.startsWith(nameQuery))) out.push({ p });
  }
  return out.slice(0, 5);
}

function fixMessage(raw, r) {
  const ending = r.fixes.find((f) => f.type === 'ending');
  let why = 'Handles use dots, not an @ in the middle.';
  if (ending) why = `${ending.bad} isn’t a handle ending. ${PROVIDERS[HANDLE_DOMAINS[ending.good]].name} handles end in ${ending.good}.`;
  else if (r.fixes.some((f) => f.type === 'link')) why = 'We took the handle from the profile link.';
  return `We read <strong>${esc(raw.trim())}</strong> as <strong>@${esc(r.value)}</strong>. ${why}`;
}

function fdFind({ mode = 'signin' } = {}) {
  const search = mode === 'search';
  combo.items = [];
  combo.active = -1;
  showSheet(sheet(`
    <h2 id="sheet-title" class="sheet-title">${search ? 'Find your account' : `Sign in to ${APP.name}`}</h2>
    <p>${search ? 'Start typing your name or handle. We’ll show matching accounts.' : 'Use the account you already have on Bluesky or any other Atmosphere app.'}</p>
    <form class="form" data-form="find" novalidate autocomplete="off">
      <div class="field">
        <label for="handle">${search ? 'Your name or handle' : 'Your handle'}</label>
        <div class="combo">
          <input id="handle" name="handle" type="text" data-autofocus role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="handle-list" aria-describedby="handle-hint handle-msg" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">
          <ul id="handle-list" class="combo-list" role="listbox" aria-label="Matching accounts" hidden></ul>
        </div>
        <p id="handle-hint" class="hint">It’s on your profile, like <span class="nowrap">sam.bsky.social</span> or <span class="nowrap">rae.blacksky.app</span>. You can type your name instead.</p>
        <div id="handle-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Find my account</button>
    </form>
    <div class="sheet-links">
      <button class="link-btn" type="button" data-action="goForgot">Forgot your handle?</button>
      <button class="link-btn" type="button" data-action="goCreate">New here? Create an account</button>
    </div>`));
  enter('fd.find');
}

function renderCombo(input, items) {
  const list = $('#handle-list');
  if (!list) return;
  combo.items = items;
  combo.active = -1;
  input.removeAttribute('aria-activedescendant');
  if (!items.length) {
    list.hidden = true;
    list.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  list.innerHTML = items
    .map((it, i) => `<li role="option" id="opt-${i}" class="combo-opt${it.fixed ? ' is-auto' : ''}" data-index="${i}" aria-selected="false">${it.fixed ? `<span class="opt-auto">${icon('wand-sparkles')}Did you mean</span>` : ''}${accountRow(it.p)}</li>`)
    .join('');
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  paintIcons();
}

function setActive(index) {
  const input = $('#handle');
  combo.active = index;
  document.querySelectorAll('.combo-opt').forEach((el, i) => el.setAttribute('aria-selected', String(i === index)));
  const option = $(`#opt-${index}`);
  if (option) {
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }
}

function pickSuggestion(index) {
  const it = combo.items[index];
  if (!it) return;
  track('frontdoor.suggestion_picked', it.fixed ? 'corrected' : '');
  if (it.fixed) track('frontdoor.handle_corrected', it.r.fixes.map((f) => f.type).join(', '));
  fdConfirm(it.p, it.fixed ? fixMessage(it.raw, it.r) : '');
}

function submitFind(form) {
  const input = $('#handle', form);
  const raw = input.value;
  const r = interpret(raw);
  renderCombo(input, []);

  if (!raw.trim()) {
    fieldMsg('handle', 'error', 'Type your handle or your name to find your account.');
    return;
  }
  if (r.kind === 'email') {
    track('frontdoor.email_typed');
    fieldMsg('handle', 'info', `That looks like an email address. Handles look like <strong>name.bsky.social</strong>. <button type="button" class="link-btn" data-action="goForgot" data-email="${esc(r.value)}">Find my account with this email</button>`);
    return;
  }
  if (r.kind === 'partial') {
    const items = suggestionsFor(raw);
    if (items.length) {
      fieldMsg('handle', 'auto', 'Handles have a dot in them, like sam.bsky.social. Is it one of these?');
      renderCombo(input, items);
      return;
    }
    track('frontdoor.handle_not_found');
    fieldMsg('handle', 'error', `We couldn’t find anyone called “${esc(raw.trim())}”. Handles look like <strong>name.bsky.social</strong> or <strong>name.blacksky.app</strong>. New to the Atmosphere? <button type="button" class="link-btn" data-action="goCreate">Create an account</button>`);
    return;
  }
  const p = profile(r.value);
  if (!p) {
    track('frontdoor.handle_not_found');
    fieldMsg('handle', 'error', `We couldn’t find <strong>@${esc(r.value)}</strong>. Check the spelling, or <button type="button" class="link-btn" data-action="goForgot">find your account with your email</button>.`);
    return;
  }
  if (r.fixes.length) track('frontdoor.handle_corrected', r.fixes.map((f) => f.type).join(', '));
  fdConfirm(p, r.fixes.length ? fixMessage(raw, r) : '');
}

function fdConfirm(p, fixNote = '') {
  const pv = PROVIDERS[p.provider];
  const host = hostFor(p);
  const who = p.provider === 'own' ? host : pv.name;
  showSheet(sheet(`
    ${fixNote ? `<div class="notice notice-auto">${icon('wand-sparkles')}<p>${fixNote}</p></div>` : ''}
    <h2 id="sheet-title" class="sheet-title">Is this you?</h2>
    <div class="found-card">${accountRow(p)}</div>
    <div class="next-hop">
      <p class="next-hop-title">Next, sign in on ${esc(who)}’s page</p>
      <ul class="hop-list">
        <li>${icon('arrow-right')}<span>You’ll go to <strong>${esc(host)}</strong>, where ${esc(who)} accounts sign in.</span></li>
        <li>${icon('shield-check')}<span>${esc(who)} will show what Potluck wants to do. You decide.</span></li>
        <li>${icon('undo-2')}<span>Then you’ll come straight back to Potluck.</span></li>
      </ul>
    </div>
    <button class="btn btn-primary btn-block" type="button" data-action="toProvider" data-handle="${p.handle}">Continue to ${esc(who)}</button>`, { back: 'goFind' }));
  enter('fd.confirm');
}

/* ------------------------------------------------------------------------ */
/* Front Door: create an account                                            */
/* ------------------------------------------------------------------------ */

function providerOption(id, { pinned = false, checked = false } = {}) {
  const pv = PROVIDERS[id];
  return `
    <label class="provider-opt">
      <input type="radio" name="provider" value="${id}"${checked ? ' checked' : ''}>
      ${providerTile(id, 'sm')}
      <span class="po-text"><span class="po-name">${pv.name}${pinned ? `<span class="tag">Suggested by ${APP.name}</span>` : ''}</span><span class="po-blurb">${pv.blurb}</span></span>
      <span class="po-check" aria-hidden="true">${icon('check')}</span>
    </label>`;
}

function createForm() {
  return `
    <form class="form" data-form="create" novalidate>
      <fieldset class="field">
        <legend>Where should your account live?</legend>
        <p class="hint">A provider looks after your account. You can move to another one later and take your posts and followers with you, like keeping your number when you change mobile network.</p>
        <div class="provider-list">
          ${providerOption('potluck', { pinned: true, checked: true })}
          <p class="list-label">Other providers, A to Z</p>
          ${OTHER_PROVIDERS.map((id) => providerOption(id)).join('')}
          <label class="provider-opt">
            <input type="radio" name="provider" value="other">
            ${providerTile('own', 'sm')}
            <span class="po-text"><span class="po-name">Another provider</span><span class="po-blurb">Use any provider’s address, or your own server.</span></span>
            <span class="po-check" aria-hidden="true">${icon('check')}</span>
          </label>
          <div class="field" id="other-server" hidden>
            <label for="server">Provider address</label>
            <input id="server" name="server" type="text" inputmode="url" autocomplete="url" autocapitalize="none" spellcheck="false" aria-describedby="server-msg">
            <div id="server-msg" class="field-msg" aria-live="polite"></div>
          </div>
        </div>
      </fieldset>
      <button class="btn btn-primary btn-block" type="submit" id="create-submit">Create my account with Potluck</button>
    </form>`;
}

function fdCreate() {
  const known = S.browserAccounts.map(profile).filter(Boolean);
  let body;
  if (known.length) {
    const intro = known.length === 1
      ? `This browser is signed in to ${esc(providerName(known[0]))} as ${esc(known[0].name)}. That account works on ${APP.name} too, so there’s no need to make another one.`
      : `This browser knows these Atmosphere accounts. Any of them works on ${APP.name}, so there’s no need to make another one.`;
    body = `
      <h2 id="sheet-title" class="sheet-title">Before you create an account</h2>
      <section class="found" aria-labelledby="found-title">
        <p class="found-kicker">${icon('sparkles')}Found on this device</p>
        <h3 id="found-title" class="found-title">You already have an account</h3>
        <p>${intro}</p>
        <ul class="found-list">${known.map((p) => `<li><button type="button" class="acct-btn" data-action="useExisting" data-handle="${p.handle}">${accountRow(p, { meta: false })}<span class="acct-cta">Use this</span></button></li>`).join('')}</ul>
      </section>
      <button type="button" class="disclosure" data-action="toggleNew" aria-expanded="false" aria-controls="new-account">Create a new account anyway${icon('chevron-down')}</button>
      <div id="new-account" hidden>${createForm()}</div>`;
  } else {
    body = `
      <h2 id="sheet-title" class="sheet-title">Create your account</h2>
      <div class="notice notice-info">${icon('info')}<p><strong>Used Bluesky or another Atmosphere app before?</strong> Then you already have an account and can <button type="button" class="link-btn" data-action="goFind">sign in with it</button>. Not sure? <button type="button" class="link-btn" data-action="goSearch">Search for yourself</button>.</p></div>
      ${createForm()}`;
  }
  showSheet(sheet(body));
  enter(known.length ? 'fd.found' : 'fd.create');
}

function submitCreate(form) {
  const choice = form.querySelector('input[name="provider"]:checked')?.value || 'potluck';
  if (choice === 'other') {
    const address = $('#server', form).value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(address)) {
      fieldMsg('server', 'error', 'Enter the provider’s address, like <strong>pds.example.com</strong>. Your provider can tell you what it is.');
      return;
    }
    PROVIDERS.custom = { name: address, host: address, suffix: address, glyph: 'server', blurb: '' };
    track('frontdoor.provider_chosen', address);
    pvSignup('custom');
    return;
  }
  track('frontdoor.provider_chosen', PROVIDERS[choice].name);
  pvSignup(choice);
}

/* ------------------------------------------------------------------------ */
/* Front Door: recover by email                                             */
/* ------------------------------------------------------------------------ */

function fdForgot(prefill = '') {
  const persona = personaFor(SCENARIOS[S.scenario]);
  showSheet(sheet(`
    <h2 id="sheet-title" class="sheet-title">Find your account with your email</h2>
    <p>Your provider can email you your handle and a code to sign in. ${APP.name} never finds out whether you have an account.</p>
    <form class="form" data-form="forgot" novalidate>
      <div class="field">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" autocomplete="email" spellcheck="false" required enterkeyhint="next" value="${esc(prefill)}" aria-describedby="email-msg">
        ${persona.email && !prefill ? autofillButton('email', persona.email, 'Saved in this browser', 'key-round') : ''}
        <div id="email-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <fieldset class="field">
        <legend>Where did you make your account?</legend>
        <div class="chip-grid">
          ${RECOVERY_PROVIDERS.map((id) => `<label class="chip"><input type="radio" name="provider" value="${id}">${providerTile(id, 'xs')}${PROVIDERS[id].name}</label>`).join('')}
          <label class="chip"><input type="radio" name="provider" value="unsure">${icon('circle-help')}Not sure</label>
        </div>
        <div id="where-msg" class="field-msg" aria-live="polite"></div>
      </fieldset>
      <button class="btn btn-primary btn-block" type="submit">Email me my account details</button>
    </form>
    <div class="sheet-links"><button class="link-btn" type="button" data-action="goSearch">Search by name instead</button></div>`, { back: 'goFind' }));
  enter('fd.forgot');
}

function submitForgot(form) {
  const email = $('#email', form).value.trim();
  const choice = form.querySelector('input[name="provider"]:checked')?.value;
  fieldMsg('email', 'error', '');
  fieldMsg('where', 'error', '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldMsg('email', 'error', 'Enter the email address you used when you made your account, like name@example.com.');
    return;
  }
  if (!choice) {
    fieldMsg('where', 'error', 'Choose where you made your account, or pick “Not sure”.');
    return;
  }
  track('frontdoor.recovery_requested', choice === 'unsure' ? 'not sure' : PROVIDERS[choice].name);
  const owner = allProfiles().find((p) => p.email && p.email.toLowerCase() === email.toLowerCase());
  // Only the provider that really holds the account sends anything, as in real life.
  if (owner && (choice === 'unsure' || choice === owner.provider)) {
    later(() => deliverMail(recoveryMail(owner)), 2600);
  }
  fdCheckEmail(email, choice);
}

function fdCheckEmail(email, choice) {
  const unsure = choice === 'unsure';
  const who = unsure ? 'your provider' : PROVIDERS[choice].name;
  const asked = RECOVERY_PROVIDERS.map((id) => PROVIDERS[id].name).join(', ');
  showSheet(sheet(`
    <span class="sheet-hero">${icon('mail-open')}</span>
    <h2 id="sheet-title" class="sheet-title">Check your email</h2>
    <p>If ${unsure ? 'one of the providers we asked' : esc(who)} has an account for <strong>${esc(email)}</strong>, it’s emailing your handle and a sign-in code there now.</p>
    ${unsure ? `<p class="hint">We asked ${asked}. Only the one with your account will email you.</p>` : ''}
    <p>The email comes from ${esc(who)}, not from ${APP.name}. It can take a minute or two, and sometimes lands in spam or junk.</p>
    <div class="sheet-links">
      <button class="link-btn" type="button" data-action="goForgot" data-email="${esc(email)}">Try another provider</button>
      <button class="link-btn" type="button" data-action="goSearch">Search by name instead</button>
    </div>`, { back: 'goForgot' }));
  enter('fd.checkEmail');
}

/* ------------------------------------------------------------------------ */
/* Mail                                                                     */
/* ------------------------------------------------------------------------ */

function recoveryMail(p) {
  const pv = PROVIDERS[p.provider];
  S.code = newCode();
  return {
    id: `recovery-${Date.now()}`,
    from: pv.name,
    address: `no-reply@${hostFor(p)}`,
    to: p.email,
    subject: `Your ${pv.name} account details`,
    preview: `Your handle is @${p.handle}. Your sign-in code is ${formatCode(S.code)}.`,
    code: S.code,
    body: `
      <p>Hi ${esc(first(p.name))},</p>
      <p>You asked for your account details while signing in to <strong>${APP.name}</strong>. Here they are.</p>
      <dl class="mail-facts">
        <div><dt>Your handle</dt><dd>@${esc(p.handle)}</dd></div>
        <div><dt>Your sign-in code</dt><dd class="code">${formatCode(S.code)}</dd></div>
      </dl>
      <p>The code works for 15 minutes.</p>
      <p><button class="btn btn-primary" type="button" data-action="mailContinue" data-handle="${p.handle}">Continue signing in to ${APP.name}</button></p>
      <p>If you didn’t ask for this, you can ignore this email. Nobody can get into your account without the code.</p>
      <p>${esc(pv.name)}</p>`,
  };
}

function welcomeMail(p) {
  const pv = PROVIDERS[p.provider];
  return {
    id: `welcome-${Date.now()}`,
    from: pv.name,
    address: `no-reply@${hostFor(p)}`,
    to: p.email,
    subject: `Confirm your email for ${pv.name}`,
    preview: 'One tap to confirm. You can keep using Potluck in the meantime.',
    body: `
      <p>Hi ${esc(first(p.name))},</p>
      <p>Welcome to ${esc(pv.name)}. Please confirm this is your email address, so you can get back into your account if you ever forget your password.</p>
      <p><button class="btn btn-primary" type="button" data-action="mailConfirm">Confirm my email address</button></p>
      <dl class="mail-facts"><div><dt>Your handle</dt><dd>@${esc(p.handle)}</dd></div></dl>
      <p>Your handle works on Potluck, Bluesky and other Atmosphere apps. Keep this email: it’s an easy place to find your handle later.</p>
      <p>${esc(pv.name)}</p>`,
  };
}

function deliverMail(m) {
  S.mailbox.set(m.id, m);
  els.notif.innerHTML = `
    <button class="notif-card" type="button" data-action="openMail" data-id="${m.id}">
      <span class="notif-app">${icon('mail')}Mail<span class="notif-time">now</span></span>
      <span class="notif-from">${esc(m.from)}</span>
      <span class="notif-subject">${esc(m.subject)}</span>
      <span>${esc(m.preview)}</span>
    </button>
    <button class="icon-btn icon-btn-sm notif-close" type="button" data-action="hideNotification" aria-label="Dismiss notification">${icon('x')}</button>`;
  els.notif.style.top = `${Math.round($('.proto-bar').getBoundingClientRect().bottom) + 12}px`;
  els.notif.hidden = false;
  paintIcons();
  announce(`New email from ${m.from}: ${m.subject}`);
  track('inbox.email_arrived', m.from);

  // The browser offers the code from Mail, as phones do, if the code screen is open.
  const otp = $('#otp');
  if (m.code && otp && !otp.value && !$('.autofill', otp.parentElement)) {
    otp.insertAdjacentHTML('afterend', autofillButton('otp', formatCode(m.code), 'From Mail', 'mail'));
    paintIcons();
  }
}

function openMail(id) {
  const m = S.mailbox.get(id);
  if (!m) return;
  els.notif.hidden = true;
  els.mail.innerHTML = `
    <div class="mail-bar">${icon('inbox')}<span>Mail</span><button class="icon-btn icon-btn-sm" type="button" data-action="closeMail" aria-label="Close Mail">${icon('x')}</button></div>
    <div class="mail-head">
      <h2 id="mail-subject">${esc(m.subject)}</h2>
      <p><strong>${esc(m.from)}</strong> &lt;${esc(m.address)}&gt;</p>
      <p>To ${esc(m.to)} · just now</p>
    </div>
    <div class="mail-body">${m.body}</div>`;
  paintIcons();
  if (!els.mail.open) els.mail.showModal();
  enter('mail.open');
}

function closeMail() {
  if (els.mail.open) els.mail.close();
}

/* ------------------------------------------------------------------------ */
/* Provider pages                                                           */
/* ------------------------------------------------------------------------ */

function providerFrame(pid, inner, { compact = false } = {}) {
  const pv = PROVIDERS[pid];
  return `
    <div class="pv${compact ? ' pv-compact' : ''}">
      <header class="pv-head">${providerTile(pid, 'sm')}<span class="pv-name">${esc(pv.name)}</span><span class="pv-network">${mark('mark-xs')}<span>Atmosphere account</span></span></header>
      <main class="pv-main">${inner}</main>
      <footer class="pv-foot">${icon('lock')}<span>${
        pid === 'potluck'
          ? 'This is Potluck’s account service. It’s separate from the app, and your account works in other Atmosphere apps too.'
          : `This is ${esc(pv.name)}’s own page. ${APP.name} never sees your password.`
      }</span></footer>
    </div>`;
}

function showProviderPage(p, path, title, inner) {
  showPage(providerFrame(p.provider, inner), {
    host: hostFor(p),
    path,
    title: `${title} · ${PROVIDERS[p.provider].name}`,
    favicon: providerTile(p.provider, 'xs'),
  });
}

function handshake(p) {
  const right = p.handle ? `${avatar(p, 'xs')}<span>@${esc(p.handle)}</span>` : `${providerTile(p.provider, 'xs')}<span>${esc(providerName(p))}</span>`;
  return `<p class="handshake"><span class="hs-side">${appTile('xs')}<span>${APP.name}</span></span>${icon('arrow-left-right')}<span class="hs-side">${right}</span></p>`;
}

function twoAccounts(p) {
  return `
    <div class="two-accounts" aria-hidden="true">
      <div class="ta-item">${appTile('lg')}<span class="ta-label">${APP.name}</span><span class="ta-sub">${icon('shield-check')}${APP.domain}</span></div>
      <span class="ta-link">${icon('link-2')}</span>
      <div class="ta-item">${avatar(p, 'lg')}<span class="ta-label">@${breakable(p.handle)}</span><span class="ta-sub">${providerTile(p.provider, 'xs')}${esc(providerName(p))} account</span></div>
    </div>`;
}

function toProvider(handle) {
  const p = profile(handle);
  S.pending = { profile: p, isNew: false };
  track('frontdoor.sent_to_provider', providerName(p));
  pvSignin(p);
}

function pvSignin(p) {
  showProviderPage(p, '/oauth/authorize', 'Sign in', `
    ${handshake({ provider: p.provider })}
    <h1 class="pv-title">Sign in to ${esc(providerName(p))}</h1>
    <p class="pv-lede">to continue to ${APP.name}</p>
    <form class="form" data-form="signin" novalidate>
      <div class="field">
        <label for="username">Handle</label>
        <div class="locked-input"><input id="username" name="username" type="text" autocomplete="username" value="${esc(p.handle)}" readonly><button type="button" class="link-btn" data-action="changeAccount">Change</button></div>
      </div>
      <div class="field">
        <div class="label-row"><label for="current-password">Password</label><button type="button" class="link-btn" data-action="forgotPassword">Forgot password?</button></div>
        ${passwordInput('current-password', 'current-password')}
        <p class="proto-hint">Any password works. Please don’t type a real one.</p>
        <div id="current-password-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>`);
  enter('pv.signin');
}

function submitSignin(form) {
  const password = $('#current-password', form).value;
  if (!password) {
    fieldMsg('current-password', 'error', 'Type your password, or choose “Forgot password?”.');
    return;
  }
  track('provider.signed_in');
  busy(form.querySelector('[type="submit"]'), 'Signing in…');
  later(() => pvConsent(S.pending.profile), 700);
}

function forgotPassword() {
  const p = S.pending.profile;
  track('provider.password_reset_requested');
  S.code = null;
  later(() => deliverMail(recoveryMail(p)), 2200);
  pvCode(p);
}

function pvCode(p, { prefilled = false } = {}) {
  showProviderPage(p, '/account/recover', 'Enter your code', `
    ${handshake({ provider: p.provider })}
    <h1 class="pv-title">Enter your sign-in code</h1>
    <p class="pv-lede">We sent a 6-digit code to ${esc(maskEmail(p.email))}.</p>
    ${prefilled ? `<div class="notice notice-auto">${icon('wand-sparkles')}<p>We filled in the code from your email link.</p></div>` : ''}
    <form class="form" data-form="code" novalidate>
      <div class="field">
        <label for="otp">Code</label>
        <input id="otp" name="otp" type="text" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required aria-describedby="otp-msg" value="${prefilled && S.code ? formatCode(S.code) : ''}">
        ${!prefilled && S.code ? autofillButton('otp', formatCode(S.code), 'From Mail', 'mail') : ''}
        <div id="otp-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="pv-alt">No email? <button class="link-btn" type="button" data-action="resendCode">Send a new code</button></p>`);
  enter('pv.code');
}

function submitCode(form) {
  const digits = $('#otp', form).value.replace(/\D/g, '');
  if (!S.code || digits !== S.code) {
    fieldMsg('otp', 'error', `That code doesn’t match. Use the code in the latest email from ${esc(providerName(S.pending.profile))}, or send a new one.`);
    return;
  }
  track('provider.code_accepted');
  busy(form.querySelector('[type="submit"]'), 'Checking…');
  later(() => pvNewPassword(S.pending.profile), 600);
}

function pvNewPassword(p) {
  const pv = PROVIDERS[p.provider];
  showProviderPage(p, '/account/password', 'New password', `
    <div class="notice notice-ok">${icon('circle-check')}<p>You’re signed in to ${esc(pv.name)} as <strong>@${esc(p.handle)}</strong>.</p></div>
    <h1 class="pv-title">Set a new password?</h1>
    <p class="pv-lede">You’ll need it next time you sign in. You can also do this later in your ${esc(pv.name)} settings.</p>
    <form class="form" data-form="newPassword" novalidate>
      <input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(p.handle)}" readonly tabindex="-1" aria-hidden="true">
      <div class="field">
        <label for="reset-password">New password</label>
        ${passwordInput('reset-password', 'new-password')}
        <p class="proto-hint">Any password works. Please don’t type a real one.</p>
        <div id="reset-password-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" type="button" data-action="skipPassword">Not now</button>
        <button class="btn btn-primary" type="submit">Save password</button>
      </div>
    </form>`);
  enter('pv.newPassword');
}

function pvSignup(pid) {
  const pv = PROVIDERS[pid];
  const persona = personaFor(SCENARIOS[S.scenario]);
  S.draft = { provider: pid };
  showProviderPage({ provider: pid }, '/signup', 'Create an account', `
    ${handshake({ provider: pid })}
    <h1 class="pv-title">Create your ${esc(pv.name)} account</h1>
    <p class="pv-lede">to use with ${APP.name} and other Atmosphere apps</p>
    <form class="form" data-form="signup" novalidate>
      <div class="field">
        <label for="signup-email">Email address</label>
        <input id="signup-email" name="email" type="email" autocomplete="username" spellcheck="false" required enterkeyhint="next" aria-describedby="signup-email-msg">
        ${persona.email ? autofillButton('signup-email', persona.email, 'Saved in this browser', 'key-round') : ''}
        <div id="signup-email-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <div class="field">
        <label for="new-password">Password</label>
        ${passwordInput('new-password', 'new-password')}
        <p class="hint">At least 8 characters.</p>
        <p class="proto-hint">Any password works. Please don’t type a real one.</p>
        <div id="new-password-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <p class="fine">By creating an account you agree to ${esc(pv.name)}’s <a href="#" class="link" data-action="noop">Terms</a> and <a href="#" class="link" data-action="noop">Privacy Policy</a>.</p>
      <button class="btn btn-primary btn-block" type="submit">Next: choose your handle</button>
    </form>
    <p class="pv-alt">Already have an account? <button class="link-btn" type="button" data-action="backToFind">Sign in instead</button></p>`);
  enter('pv.signup');
}

function submitSignup(form) {
  const email = $('#signup-email', form).value.trim();
  const password = $('#new-password', form).value;
  fieldMsg('signup-email', 'error', '');
  fieldMsg('new-password', 'error', '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldMsg('signup-email', 'error', 'Enter an email address, like name@example.com. You’ll use it if you ever need to get back into your account.');
    return;
  }
  if (password.length < 8) {
    fieldMsg('new-password', 'error', 'Use at least 8 characters.');
    return;
  }
  S.draft.email = email;
  track('provider.signup_details_entered');
  pvHandle();
}

function normaliseHandle(raw, suffix) {
  let s = raw.trim().toLowerCase().replace(/^@+/, '').replace(/\s+/g, '');
  if (suffix && s.endsWith(`.${suffix}`)) s = s.slice(0, -(suffix.length + 1));
  return s;
}

function suggestHandle(name, suffix) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '') || 'cook';
  for (const candidate of [base, `${base}-cooks`, `${base}${new Date().getFullYear()}`]) {
    if (!profile(`${candidate}.${suffix}`)) return candidate;
  }
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

function pvHandle() {
  const pid = S.draft.provider;
  const pv = PROVIDERS[pid];
  const persona = personaFor(SCENARIOS[S.scenario]);
  showProviderPage({ provider: pid }, '/signup/handle', 'Choose your handle', `
    <h1 class="pv-title">Choose your handle</h1>
    <p class="pv-lede">It’s how people find you on ${APP.name}, Bluesky and other Atmosphere apps. You can change it later.</p>
    <form class="form" data-form="handle" novalidate>
      <div class="field">
        <label for="display-name">Your name</label>
        <input id="display-name" name="name" type="text" autocomplete="name" required value="${esc(persona.name)}">
      </div>
      <div class="field">
        <label for="new-handle">Handle</label>
        <div class="suffix-input">
          <input id="new-handle" name="handle" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required aria-describedby="new-handle-msg" value="${suggestHandle(persona.name, pv.suffix)}">
          <span class="suffix">.${esc(pv.suffix)}</span>
        </div>
        <div id="new-handle-msg" class="field-msg" aria-live="polite"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>`);
  checkHandle();
  enter('pv.handle');
}

function checkHandle() {
  const input = $('#new-handle');
  if (!input) return false;
  const suffix = PROVIDERS[S.draft.provider].suffix;
  const local = normaliseHandle(input.value, suffix);
  if (!local) {
    fieldMsg('new-handle', 'error', '');
    return false;
  }
  if (!/^[a-z0-9-]+$/.test(local)) {
    fieldMsg('new-handle', 'error', 'Use letters, numbers and hyphens only.');
    return false;
  }
  if (local.length < 3 || local.length > 20) {
    fieldMsg('new-handle', 'error', 'Handles are 3 to 20 characters long.');
    return false;
  }
  if (profile(`${local}.${suffix}`)) {
    const alt = suggestHandle(`${local}-cooks`, suffix);
    fieldMsg('new-handle', 'error', `<strong>@${local}.${esc(suffix)}</strong> is taken. How about <button type="button" class="link-btn" data-action="useHandle" data-value="${alt}">${alt}</button>?`);
    return false;
  }
  fieldMsg('new-handle', 'ok', `<strong>@${local}.${esc(suffix)}</strong> is available.`);
  return true;
}

function submitHandle(form) {
  if (!checkHandle()) {
    $('#new-handle', form).focus();
    return;
  }
  const pid = S.draft.provider;
  const suffix = PROVIDERS[pid].suffix;
  const name = $('#display-name', form).value.trim() || personaFor(SCENARIOS[S.scenario]).name;
  const p = { name, handle: `${normaliseHandle($('#new-handle', form).value, suffix)}.${suffix}`, provider: pid, email: S.draft.email };
  S.created.push(p);
  S.pending = { profile: p, isNew: true };
  S.flowStart = S.flowStart || Date.now();
  track('provider.account_created', PROVIDERS[pid].name);
  busy(form.querySelector('[type="submit"]'), 'Creating your account…');
  later(() => pvConsent(p), 800);
}

/* Consent */

function permissionList({ withSwitch }) {
  return `
    <ul class="perm-list">
      <li>${icon('book-open')}<div class="perm-text"><strong>Save recipes and cookbooks to your account</strong><p>Why: so your recipes stay yours, even if you stop using ${APP.name}.</p></div></li>
      <li>${icon('user-round')}<div class="perm-text"><strong>Use your name and profile picture</strong><p>Why: so friends recognise you.</p></div></li>
      <li class="${withSwitch ? 'perm-optional' : ''}">${icon('send')}<div class="perm-text"><strong>Post recipes you choose to share</strong><p>Why: so people who follow you on Bluesky and other apps can see them. Only when you press Share.</p>${withSwitch ? '<p><strong>Optional.</strong> You can switch this off.</p>' : ''}</div>${
        withSwitch ? '<label class="switch"><input type="checkbox" checked data-perm="post"><span class="switch-ui" aria-hidden="true"></span><span class="sr-only">Allow Potluck to post recipes you choose to share</span></label>' : ''
      }</li>
    </ul>`;
}

function consentMarkup(p, firstParty) {
  const pv = PROVIDERS[p.provider];
  if (firstParty) {
    return `
      ${twoAccounts(p)}
      <h1 class="pv-title">Your Potluck account is ready</h1>
      <p class="pv-lede">Potluck looks after this account, so it can save your recipes to it straight away.</p>
      <details class="perm-details"><summary>What Potluck can do with your account</summary>${permissionList({ withSwitch: false })}</details>
      <button class="btn btn-primary btn-block" type="button" data-action="consentApprove">Start cooking</button>
      <p class="fine">It’s also an Atmosphere account, so you can use it to sign in to Bluesky and other apps.</p>`;
  }
  return `
    ${twoAccounts(p)}
    <h1 class="pv-title">Connect ${APP.name} to your ${esc(pv.name)} account?</h1>
    <div class="acct-chip">${accountRow(p, { meta: false })}<button type="button" class="link-btn" data-action="changeAccount">Not you?</button></div>
    <section class="perm-block" aria-labelledby="perm-can">
      <h2 class="perm-heading" id="perm-can">${APP.name} will be able to</h2>
      ${permissionList({ withSwitch: true })}
      <h2 class="perm-heading">${APP.name} won’t be able to</h2>
      <ul class="perm-not">
        <li>${icon('x')}See your password</li>
        <li>${icon('x')}Read your private messages</li>
        <li>${icon('x')}Delete your posts or change your profile</li>
      </ul>
    </section>
    <details class="tech">
      <summary>Technical details</summary>
      <dl>
        <div><dt>App</dt><dd><code>https://${APP.domain}/client-metadata.json</code></dd></div>
        <div><dt>Recipes and cookbooks</dt><dd><code>include:kitchen.potluck.recipes</code></dd></div>
        <div><dt>Profile</dt><dd><code>rpc:app.bsky.actor.getProfile</code></dd></div>
        <div><dt>Posts (optional)</dt><dd><code>repo:app.bsky.feed.post?action=create</code></dd></div>
      </dl>
    </details>
    <div class="btn-row">
      <button class="btn btn-secondary" type="button" data-action="consentCancel">Cancel</button>
      <button class="btn btn-primary" type="button" data-action="consentApprove">Connect</button>
    </div>
    <p class="fine verified">${icon('shield-check')}<span>${pv.name} has checked this request comes from <strong>${APP.domain}</strong>. You can disconnect ${APP.name} at any time in your ${esc(pv.name)} settings.</span></p>`;
}

function pvConsent(p, { popup = false } = {}) {
  const firstParty = Boolean(S.pending?.isNew) && p.provider === 'potluck';
  const inner = consentMarkup(p, firstParty);
  S.consentInPopup = popup;
  if (popup) showPopup(p, '/oauth/authorize', inner);
  else showProviderPage(p, '/oauth/authorize', `Connect ${APP.name}`, inner);
  enter(popup ? 'pv.consentPopup' : firstParty ? 'pv.consentFirst' : 'pv.consent');
}

function consentApprove(button) {
  const p = S.pending.profile;
  const post = $('[data-perm="post"]');
  S.declinedPost = post ? !post.checked : false;
  if (S.declinedPost) track('provider.permission_declined', 'post recipes');
  track('provider.consent_approved');
  S.approved.add(p.handle);
  busy(button, 'Connecting…');
  if (S.consentInPopup) {
    later(() => {
      closeLayer();
      completeSignIn();
    }, 700);
  } else {
    later(pvReturning, 600);
  }
}

function consentCancel() {
  track('provider.consent_cancelled');
  S.pending = null;
  S.flowStart = null;
  S.flash = 'cancelled';
  appSignin();
}

function pvReturning() {
  const p = S.pending.profile;
  showProviderPage(p, '/oauth/redirect', 'Returning', `<div class="returning">${twoAccounts(p)}<p class="returning-text">${icon('loader-circle', 'spin')}Taking you back to ${APP.name}…</p></div>`);
  later(completeSignIn, 1100);
}

function completeSignIn() {
  const { profile: p, isNew } = S.pending;
  S.signedIn = p;
  S.pending = null;
  // The provider has now registered with the browser, so FedCM can offer it next time.
  if (!S.browserAccounts.includes(p.handle)) S.browserAccounts.push(p.handle);
  const detail = S.flowStart ? `${Math.round((Date.now() - S.flowStart) / 1000)}s, ${S.screens} screens` : '';
  S.flowStart = null;
  S.screens = 0;
  track('app.signed_in', detail);
  appHome({ isNew });
  if (isNew && p.email) later(() => deliverMail(welcomeMail(p)), 2500);
}

/* ------------------------------------------------------------------------ */
/* Actions                                                                  */
/* ------------------------------------------------------------------------ */

function startFlow() {
  S.flowStart = Date.now();
  S.screens = 0;
}

const ACTIONS = {
  restart: () => startScenario(S.scenario),
  toggleNotes: () => setNotes(document.body.dataset.notes !== 'open'),

  atmosphereButton: () => {
    startFlow();
    track('app.atmosphere_button_pressed');
    if (S.browserAccounts.length) fedcmChoose();
    else fdFind();
  },
  createAccount: () => {
    startFlow();
    track('app.create_account_pressed');
    fdCreate();
  },
  closeSheet: () => {
    closeLayer();
    track('frontdoor.dismissed');
  },
  goFind: () => fdFind(),
  goSearch: () => fdFind({ mode: 'search' }),
  goCreate: () => fdCreate(),
  goForgot: (el) => fdForgot(el.dataset.email || ''),
  toProvider: (el) => toProvider(el.dataset.handle),

  fedcmClose: () => {
    closeFedcm();
    track('browser.chooser_dismissed');
  },
  fedcmPick: (el) => fedcmPick(el.dataset.handle),
  fedcmOther: () => {
    closeFedcm();
    fdFind();
  },
  useExisting: (el) => {
    track('frontdoor.existing_account_used');
    closeLayer();
    continueWithBrowserAccount(el.dataset.handle);
  },
  toggleNew: (el) => {
    const open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    $('#new-account').hidden = !open;
    if (open) track('frontdoor.new_account_anyway');
  },

  changeAccount: () => {
    S.pending = null;
    if (!els.layer.hidden && els.layer.classList.contains('layer-popup')) {
      closeLayer();
      if (S.browserAccounts.length) fedcmChoose();
      else fdFind();
      return;
    }
    appSignin({ quiet: true });
    fdFind();
  },
  backToFind: () => {
    appSignin({ quiet: true });
    fdFind();
  },
  forgotPassword,
  resendCode: () => {
    track('provider.code_resent');
    later(() => deliverMail(recoveryMail(S.pending.profile)), 1800);
    toast('We’ve sent a new code. Use the latest email.', 'mail');
  },
  skipPassword: () => {
    track('provider.password_skipped');
    pvConsent(S.pending.profile);
  },
  togglePassword: (el) => {
    const input = $(`#${el.dataset.target}`);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', String(show));
    el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    el.innerHTML = icon(show ? 'eye-off' : 'eye');
    paintIcons();
  },
  autofill: (el) => {
    const input = $(`#${el.dataset.target}`);
    input.value = el.dataset.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    el.remove();
    input.focus();
  },
  useHandle: (el) => {
    $('#new-handle').value = el.dataset.value;
    checkHandle();
  },
  consentApprove: (el) => consentApprove(el),
  consentCancel: () => consentCancel(),

  openMail: (el) => openMail(el.dataset.id),
  closeMail: () => closeMail(),
  hideNotification: () => {
    els.notif.hidden = true;
  },
  mailContinue: (el) => {
    closeMail();
    const p = profile(el.dataset.handle);
    S.pending = { profile: p, isNew: false };
    S.flowStart = S.flowStart || Date.now();
    track('inbox.link_followed');
    pvCode(p, { prefilled: true });
  },
  mailConfirm: () => {
    closeMail();
    track('provider.email_confirmed');
    toast('Email address confirmed.', 'circle-check');
  },

  dismissBanner: (el) => el.closest('.banner').remove(),
  switchAccount: () => {
    track('app.switch_account');
    S.signedIn = null;
    appSignin({ quiet: true });
    ACTIONS.atmosphereButton();
  },
  manageAccount: () => {
    const p = S.signedIn;
    S.visited.add('manage');
    track('app.manage_account_opened', providerName(p));
    renderNotes();
    toast(`This would open your account settings on ${hostFor(p)}. It isn’t part of this prototype.`, 'external-link');
  },
  signOut: () => {
    track('app.signed_out');
    S.signedIn = null;
    S.flash = 'signedOut';
    appSignin();
  },
  noop: () => toast('That part of Potluck isn’t in this prototype.'),
};

const FORMS = {
  find: submitFind,
  create: submitCreate,
  forgot: submitForgot,
  signin: submitSignin,
  code: submitCode,
  newPassword: (form) => {
    if (!$('#reset-password', form).value) {
      fieldMsg('reset-password', 'error', 'Type a new password, or choose “Not now”.');
      return;
    }
    track('provider.password_changed');
    pvConsent(S.pending.profile);
  },
  signup: submitSignup,
  handle: submitHandle,
};

/* ------------------------------------------------------------------------ */
/* Events                                                                   */
/* ------------------------------------------------------------------------ */

document.addEventListener('click', (e) => {
  const scenario = e.target.closest('[data-scenario]');
  if (scenario) {
    startScenario(scenario.dataset.scenario);
    return;
  }
  const option = e.target.closest('.combo-opt');
  if (option) {
    pickSuggestion(Number(option.dataset.index));
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  e.preventDefault();
  ACTIONS[el.dataset.action](el, e);
});

// Keep focus in the input while choosing a suggestion with the mouse,
// and close the suggestions when focus moves elsewhere.
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.combo-list')) e.preventDefault();
});

document.addEventListener('focusout', (e) => {
  if (e.target.id === 'handle') renderCombo(e.target, []);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  FORMS[form.dataset.form]?.(form);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'handle') {
    fieldMsg('handle', 'error', '');
    renderCombo(t, suggestionsFor(t.value));
  } else if (t.id === 'new-handle') {
    checkHandle();
  } else if (t.id && $(`#${t.id}-msg`) && t.getAttribute('aria-invalid') === 'true') {
    fieldMsg(t.id, 'error', '');
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.name === 'provider' && t.closest('form[data-form="create"]')) {
    $('#other-server').hidden = t.value !== 'other';
    $('#create-submit').textContent = t.value === 'other' ? 'Create my account with this provider' : `Create my account with ${PROVIDERS[t.value].name}`;
    if (t.value === 'other') $('#server').focus();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.id === 'handle' && combo.items.length) {
    const n = combo.items.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((combo.active + 1) % n);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((combo.active - 1 + n) % n);
      return;
    }
    if (e.key === 'Enter' && combo.active >= 0) {
      e.preventDefault();
      pickSuggestion(combo.active);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      renderCombo(e.target, []);
      return;
    }
  }
  if (e.key === 'Escape' && !els.mail.open) {
    if (!els.fedcm.hidden) ACTIONS.fedcmClose();
    else if (els.layer.classList.contains('layer-sheet') && !els.layer.hidden) ACTIONS.closeSheet();
  }
});

/* ------------------------------------------------------------------------ */
/* Start                                                                    */
/* ------------------------------------------------------------------------ */

function startScenario(id) {
  const scenario = SCENARIOS[id] ? id : 'new';
  S = freshState(scenario);
  delete PROVIDERS.custom;
  closeMail();
  els.notif.hidden = true;
  els.toast.hidden = true;
  renderScenarioNav();
  try {
    history.replaceState(null, '', `#${scenario}`);
  } catch {
    /* some hosts block history changes; the scenario still starts */
  }
  appSignin();
}

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (SCENARIOS[id] && id !== S.scenario) startScenario(id);
});

(function boot() {
  let stored = null;
  try {
    stored = localStorage.getItem('frontdoor-notes');
  } catch {
    /* ignore */
  }
  setNotes(stored ? stored === 'open' : window.matchMedia('(min-width: 1100px)').matches);
  startScenario(location.hash.slice(1));
})();
