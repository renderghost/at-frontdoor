# Front Door prototype

A front-end-only prototype of signing in to an app on the Atmosphere with a shared sign-in experience, Front Door.

It's theatrical: nothing talks to a server. Accounts, providers, emails, redirects and the browser's account chooser are all simulated, so the experience can be shown, discussed and tested without building any of it.

## Run it

Open `index.html` in a browser. To serve it locally instead:

```sh
python3 -m http.server 8000
```

It loads Inter from Google Fonts and Lucide icons from unpkg. Offline, it falls back to the system font and shows no icons.

Link straight to a scenario with a hash: `index.html#new`, `#returning`, `#forgot`, `#multi` or `#hidden`.

### On GitHub Pages

The prototype is published from `main` at [frontdoor.renderg.host](https://frontdoor.renderg.host), the domain set in `CNAME`. No workflow is needed: in the repository, **Settings → Pages** has **Source** set to **Deploy from a branch** with `main` and `/ (root)`. The `.nojekyll` file tells Pages to serve the files as they are.

## Scenarios

Pick one from the bar at the top. Each resets the prototype with a different person and browser state.

| # | Scenario | Person | What it shows |
| - | -------- | ------ | ------------- |
| 1 | New to the Atmosphere | Jo Park | Creating an account, hosted by Potluck itself or by any other provider |
| 2 | Knows their details | Sam Okafor, Bluesky | Forgiving handle entry, provider sign-in, the redesigned consent screen, then a one-tap return visit |
| 3 | Forgot their details | Rae Thompson, Blacksky | Recovering the handle and signing in with an emailed code |
| 4 | Several accounts | Alex Moreno, three accounts | The browser account chooser (FedCM), then consent in a new tab that closes once Potluck is connected |
| 5 | Has one, doesn't know it | Priya Shah, Bluesky | Sign-up that finds the existing account before a duplicate is made |

The simulated browser has working tabs. Anything that would open separately in real life opens in a new tab: the inbox, a link in an email, and the provider's consent step after the browser chooser. A tab opened for signing in closes itself once sign-in is done, and Potluck's tab picks up the session. You can switch between tabs and close them; Potluck's own tab stays open because it runs the demo.

The **Notes** panel explains each screen as you go: who owns it, which design principles it applies, a quote from the Phase 1 research, and the open decisions it touches. It also lists the measurement events an adopting app could count.

## Who owns each screen

| Owner | Screens | Shown as |
| ----- | ------- | -------- |
| App | Potluck's sign-in page and signed-in home | `potluck.kitchen` in the address bar |
| Front Door | Find the account, existing-account check, choose a provider, email recovery | A sheet inside Potluck. The address doesn't change, because there's no extra server in the way |
| Browser | Account chooser | A panel drawn by the browser, under the address bar |
| Provider | Sign-in, sign-up, codes, consent | The provider's own address, such as `bsky.social` or `blacksky.app`. In Potluck's tab after a redirect, or in a new tab when opened from the browser chooser or an email |
| Inbox | Recovery and welcome emails | A Mail notification, then a webmail tab at `mail.example.com` |

## Design positions taken

These are starting positions to test, not conclusions. The numbers refer to the decision log in *Atmosphere Front Door: Design Direction and Next Steps*.

- **One door (D10).** The button says "Continue with Atmosphere" and covers both signing in and signing up. A plain-language line under it names Bluesky (D2).
- **No intermediary page (D4).** Front Door runs inside the app. The only domains people see are the app's and their provider's.
- **Forgiving input.** It accepts a leading `@`, email-style handles (`sam@bsky.social`), common mix-ups (`bsky.app`, `blacksky.community`), names and profile links, and suggests accounts as you type.
- **Duplicate prevention (D7).** The existing-account check sits inline at the top of sign-up. Where the browser knows an account, Front Door offers it before anything is created.
- **Provider listing (D9).** The app pins its own hosting as the default. Everyone else is listed A to Z.
- **Email recovery (D6).** Front Door never looks up emails. The provider emails the account owner, and the screen never reveals whether an account exists.
- **Consent (D8).** Framed as connecting two accounts, with both shown. Permissions are in the app's words, each with a reason, and optional ones can be switched off. Accounts made for the app get a shorter summary.
- **Brand architecture (D3).** The provider names the account ("Bluesky account") and the Atmosphere mark says where it works.
- **After sign-in.** The network is explained once people are in, not at the door.

## Colour

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
