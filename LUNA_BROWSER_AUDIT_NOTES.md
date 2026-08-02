# Luna browser audit — StreamFlicker (127.0.0.1:4173)

Date: 2026-07-30. Surface: Chrome via in-app browser control. Desktop viewport tested; mobile viewport resize was unavailable, so mobile findings are unverified.

## Executive findings

- **P0/P1 — Catalog load is extremely heavy / unstable in browser tooling.** Initial DOM stayed on “Loading the movie catalog” for ~4s, then populated. Browser emitted a Statsig networking error and a `nodeRepl.fetch response is too large` diagnostic while loading. This is a performance/resilience concern, not a confirmed user-visible failure.
- **P1 — Global Watchlist locator/accessibility-name collision.** `getByRole('button', {name:'Watchlist'})` resolved to **92 elements** because card actions named “Add to Watchlist” are exposed as matches. Exact-name matching finds one header control, but assistive-tech/automation consumers may encounter ambiguous names. Screenshot: [luna_desktop.png](C:/Users/chado/Documents/streamflicker/luna_desktop.png)
- **P1 — Sign-in form controls are not label-associated.** Visible labels “EMAIL ADDRESS” and “PASSWORD” exist, but `getByLabel("EMAIL ADDRESS")` and `getByLabel("PASSWORD")` both resolved to 0. Inputs only exposed placeholders (`you@example.com`, `••••••••`), indicating a likely WCAG label association defect.
- **P2 — Invalid search is handled well.** Query `zzzzzzzz` produced “Results for \"zzzzzzzz\"”, “Showing 0 of 0 top-rated titles”, “No movies match your filters”, and a “Reset All Filters” action.
- **P2 — Empty watchlist state is clear.** Header Watchlist opens a dialog titled “Your Saved Watchlist (0)” with “Your watchlist is empty” and guidance to bookmark movies.

## Persona/workflow evidence

### Anonymous discovery persona
- Home catalog loads featured “Scream 7”, score/year/runtime, trailer CTA, availability links, era/genre/service/tag filters, and recent catalog cards.
- Search with a nonsense term returns a dedicated empty state and reset action (pass).
- Filter controls expose pressed state (`All Years`, `All`, `All Apps`) and numeric counts (pass observed).
- Header watchlist opens empty-state dialog (pass).
- Header Sign In opens “Welcome Back” dialog with email/password, Sign In, and Sign Up (pass).

### Returning/watchlist persona
- Empty watchlist dialog is reachable without authentication and clearly communicates zero saved titles (pass).
- Adding/removing a title and persistence across reload were not completed because the sign-in modal was open and no test account was authorized.

### Signed-in persona
- Not verifiable without credentials; no credentials were supplied. Sign-in UI was inspected only.
- Invalid credential submission could not be cleanly isolated because two `Sign In` buttons are present in the page/modal context (ambiguous locator), another interaction ambiguity.

## Keyboard/accessibility

- Skip link “Skip to movie discovery” is present in DOM (positive).
- Interactive controls have mostly descriptive names (featured navigation, trailer, sharing, alerts, filters).
- Watchlist naming collision (92 matches for non-exact name) and unassociated sign-in labels are actionable accessibility defects.
- Full keyboard traversal, focus-ring visibility, escape-to-close, and screen-reader announcements were not fully verified.

## Error/loading/empty/success states

- Loading state observed initially (“Loading the movie catalog”), eventually resolved.
- Empty search state verified.
- Empty watchlist state verified.
- Sign-in success/error state not verified; no authorized account.
- Network/API failure behavior beyond observed Statsig diagnostic not verified.

## Trust/accessibility/performance

- Footer exposes Terms of Service, Privacy Policy, Affiliate Disclosure, and Monetization/API Settings (positive trust signal).
- External streaming links visibly identify providers (Max, Hulu, etc.); external-navigation confirmation behavior not verified.
- Catalog load transfers/DOM are unusually large in this browser session; image-heavy page and repeated movie-card controls suggest performance risk. No formal Web Vitals measurement was available.

## Mobile

- Mobile viewport interaction and responsive layout are **unverified**; browser control did not provide a supported viewport resize operation in this run.

## Evidence files

- [luna_desktop.png](C:/Users/chado/Documents/streamflicker/luna_desktop.png) — desktop screenshot captured after catalog load.

## Unverified / not completed

- Authenticated sign-in, sign-up, watchlist persistence, alert preference workflow, trailer playback, share flow, monetization/API settings, legal disclosure modal content, external provider handoff, mobile layout, and full keyboard traversal.
