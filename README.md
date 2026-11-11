# Front Door prototype

A front-end-only prototype of signing in to an app on the Atmosphere with a shared sign-in experience, Front Door.

It's theatrical: nothing talks to a server. Accounts, providers, emails, redirects and the browser's account chooser are all simulated, so the experience can be shown, discussed and tested without building any of it.

## Run it

Open `index.html` in a browser. To serve it locally instead:

```sh
python3 -m http.server 8000
```

It loads its fonts from Google Fonts (Inter, Fraunces, Newsreader and Comic Neue) and Lucide icons from unpkg. Offline, it falls back to system fonts and shows no icons.

Link straight to a scenario with a hash: `index.html#new`, `#returning`, `#forgot`, `#multi` or `#hidden`.

### With participants

Press **Shift twice** to hide the prototype bar and the notes, so only the simulated browser shows. Press Shift twice again to bring them back. A reminder shows for a few seconds after hiding them. It works the same on Mac, Windows and Linux, in every browser, and even with the cursor in a field, because Shift on its own types nothing. Choose the scenario before hiding the bar. On a phone or tablet without a keyboard, use the Notes button instead.

### On GitHub Pages

The prototype is published from `main` at [frontdoor.renderg.host](https://frontdoor.renderg.host), the domain set in `CNAME`. No workflow is needed: in the repository, **Settings → Pages** has **Source** set to **Deploy from a branch** with `main` and `/ (root)`. The `.nojekyll` file tells Pages to serve the files as they are.

The site sits behind Cloudflare, which keeps `styles.css` and `script.js` for 4 hours. When either changes, raise the `?v=` number on both links in `index.html`, so browsers and Cloudflare fetch the new files straight away.

## Scenarios

Pick one from the bar at the top. Each resets the prototype with a different person and browser state.

The idea every scenario has to land: **one Atmosphere account works everywhere.** The account is always called an Atmosphere account. Bluesky, Blacksky, Eurosky, Potluck and others are providers that host it, and the copy always names them as the host ("hosted by Bluesky"), never as the name of the account.

| # | Scenario | Person | What it shows |
| - | -------- | ------ | ------------- |
| 1 | New to the Atmosphere | Jo Park | Creating an Atmosphere account, hosted by Potluck itself or by any other provider |
| 2 | Knows their details | Sam Okafor, hosted by Bluesky | Forgiving handle entry, provider sign-in, the redesigned consent screen, then a one-tap return visit |
| 3 | Forgot their details | Rae Thompson, hosted by Blacksky | Recovering the handle, signing in with an emailed code, then a passkey for next time |
| 4 | Several accounts | Alex Moreno, three Atmosphere accounts | The browser account chooser (FedCM), then consent in a new tab that closes once Potluck is connected |
| 5 | Has one, doesn't know it | Priya Shah, hosted by Bluesky | Sign-up that finds the existing account before a duplicate is made |

The simulated browser has working tabs. Anything that would open separately in real life opens in a new tab: the inbox, the confirm link in a welcome email, the provider's consent step after the browser chooser, and the provider's account settings when Potluck links to them. A tab opened for signing in closes itself once sign-in is done, and Potluck's tab picks up the session. You can switch between tabs and close them; Potluck's own tab stays open because it runs the demo.

The **Notes** panel explains each screen as you go: who owns it, which design principles it applies, a quote from the Phase 1 research, and the open decisions it touches. It follows the tab on show, and also lists the measurement events an adopting app could count.

## Who owns each screen

| Owner | Screens | Shown as |
| ----- | ------- | -------- |
| App | Potluck's sign-in page, signed-in home and account settings | `potluck.kitchen` in the address bar |
| Front Door | Find the account, existing-account check, choose a provider, email recovery | A sheet inside Potluck. The address doesn't change, because there's no extra server in the way |
| Browser | Account chooser | A panel drawn by the browser, under the address bar |
| Provider | Sign-in, sign-up, codes, consent, and sign-in and security settings | The provider's own address, such as `bsky.social` or `blacksky.app`. In Potluck's tab after a redirect, or in a new tab when opened from the browser chooser, an email or Potluck's settings |
| Inbox | Recovery and welcome emails | A Mail notification, then a webmail tab at `mail.example.com` |

## Design positions taken

These are starting positions to test, not conclusions. The numbers refer to the decision log in *Atmosphere Front Door: Design Direction and Next Steps*.

- **One door (D10).** The button says "Continue with Atmosphere" and covers both signing in and signing up. The line under it tells Bluesky users they already have an Atmosphere account (D2).
- **No intermediary page (D4).** Front Door runs inside the app. The only domains people see are the app's and their provider's.
- **Forgiving input.** It accepts a leading `@`, email-style handles (`sam@bsky.social`), common mix-ups (`bsky.app`, `blacksky.community`), names and profile links, and suggests accounts as you type.
- **Duplicate prevention (D7).** The existing-account check sits inline at the top of sign-up. Where the browser knows an account, Front Door offers it before anything is created.
- **Provider listing (D9).** The app pins its own hosting as the default. Everyone else is listed A to Z.
- **Email recovery (D6).** Front Door never looks up emails. The provider emails the account owner, and the screen never reveals whether an account exists. The email carries the handle and a code, never a link: people go back to the tab where they started and type the handle, and the provider asks for the code. A passkey on a lost phone is handled the same way, then removed.
- **Consent (D8).** Framed as connecting the app to your Atmosphere account, with both shown and the provider named as its host. Permissions are in the app's words, each with a reason, and optional ones can be switched off. Accounts made for the app get a shorter summary.
- **One Atmosphere account (D1, D3).** The account is always an Atmosphere account, on every screen and in every email. Providers are named as its host ("hosted by Bluesky"). This goes further than the decision log's "issuer and network" leaning, where providers named the account, so it needs testing with operators such as Blacksky.
- **After sign-in.** The network is explained once people are in, not at the door.
- **Passkeys alongside passwords.** A password, with optional verification codes, stays the way everyone can sign in. Passkeys sit beside it at every step: the provider's sign-in page offers one through browser autofill and a "Use a passkey" button, sign-up lets people choose a passkey instead of a password, and the provider offers one after a password sign-in or a recovery. Emailed sign-in is a code, never a link, and only for recovery. "Passkey only" is the owner's choice in the provider's settings, not a default.
- **Passkeys stay with the provider.** The Atmosphere account can move to another provider, but its passkeys can't. The door doesn't say so, because it isn't the place for detail. Sign-up, where a passkey is made, and the "Move to another provider" rows in Potluck's settings and the provider's say people will set up a new passkey with their new provider.
- **Account settings in the app (D11).** Potluck has its own account settings for what it owns: sharing, switching, signing out, disconnecting and its own data. Sign-in, security, moving and deleting the account belong to the provider, so those rows hand off to the provider's page. Potluck never shows whether there's a passkey or a password, because it can't know.

## What an adopting app builds

Signing in with Atmosphere means the app no longer owns credentials, but people still expect to manage their account from inside the app. An app like Potluck needs:

- A signed-in account settings page.
- A clearly labelled "managed by your provider" section, with links out to the provider for sign-in, security, moving and deleting the account.
- Sign out, switch account, and disconnect for its own session.
- A way to delete its own data, in line with App Store and EU rules.
- The current handle and host, read fresh, not a stored copy.

## Look

Three looks keep it clear whose screen you're on:

- **Atmosphere** (Front Door, the browser and the providers): black text on white or whitesmoke, set in Inter. This is the design being prototyped.
- **Potluck** (the made-up app's own pages): dark brown with yellow accents, with Fraunces for headings and Newsreader for text. The sign-in card, where the Atmosphere button sits, stays pale cream. The Atmosphere button inside Potluck keeps the Atmosphere look, because it should look the same in every app. Potluck's logo keeps Potluck's colours wherever it appears, including inside Atmosphere screens such as consent, as an app's logo would.
- **The prototype's frame** (the bar, the notes, and the "Prototype" hints inside screens): a blueprint notepad, in Comic Neue and blueprint blues on squared and ruled paper. The hints are the only part of it inside the simulated browser, so they never read as part of the design.

The palettes are custom properties at the top of `styles.css`: `--pl-*` for Potluck and `--bp-*` for the frame.

### Colour in the Atmosphere look

All text is black. Backgrounds are white or whitesmoke. Colour carries meaning:

- **Accent (green):** go, selected, success
- **Error (pink):** something needs fixing
- **Link (blue):** links and keyboard focus
- **Automated (purple):** something the system worked out or filled in, such as a corrected handle or an account the browser found

## Files

- `index.html`: the prototype bar, simulated browser and notes panel
- `styles.css`: all styles, with the palette as custom properties at the top
- `script.js`: data, scenarios, notes and every screen. Copy, providers, profiles and scenarios are defined at the top of the file.

## What isn't real

- Provider names are real, but the logos are placeholder glyphs and the descriptions are placeholders.
- Nothing typed leaves the page and any password works. Don't type a real one.
- The browser account chooser assumes FedCM identity provider registration, which is still a Stage 1 proposal. FedCM shows the provider's consent step in a pop-up window; the prototype uses a tab so it's easier to read.
- Per-permission reasons on the consent screen would need a new client-metadata field in the protocol.
- The Atmosphere mark is a placeholder.
