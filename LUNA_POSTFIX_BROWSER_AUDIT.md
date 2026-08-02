# StreamFlicker post-fix browser audit

Date: 2026-07-30  
Environment: Chrome extension automation, `http://127.0.0.1:4173`, Vite preview (PID 73916 reported by Sol)

## Executive result

The primary movie-discovery journey is usable and the reviewed fixes are present: labelled auth fields, one auth submit control, descriptive watchlist/share/alert controls, watchlist count updates, empty-search recovery copy, trailer disclosure, and scoped settings access. Overall confidence: **7.6/10** for the tested desktop viewport. No source files were changed.

The requested automotive personas do not match this product: StreamFlicker is a movie-trailer and streaming-discovery app. Their goals below are therefore translated to speed, clarity, and low-domain-knowledge movie decisions.

## Evidence and verified flows

- Landing screen rendered with semantic `banner`, `main`, `contentinfo`, skip link, labelled movie search, filter groups, poster alt text, and descriptive card actions. Screenshot: [audit_landing.png](audit_landing.png).
- Search `matrix`: completed without a stuck loading state; showed `Showing 0 of 0 top-rated titles`, `No movies match your filters`, helper copy, and `Reset All Filters`.
- Search `Scream 7`: completed without a stuck loading state; showed two smart-match suggestions and `Showing 2 of 2 top-rated titles`.
- Trailer detail opened at `?movie=scream-7-2026`; YouTube link, `Next Trailer`, `Close trailer`, lazy-load/privacy disclosure, score, runtime, genre, overview, and Max/Hulu links were present.
- `Add to Watchlist` changed to `In Watchlist`; header became `Open Watchlist, 1 saved movie`; card action became `Remove Scream 7 from Watchlist`.
- Share dialog opened with title/year/genres, X, Facebook, WhatsApp, Reddit, shareable-link textbox, and `Copy Link`.
- Auth dialog exposed exactly one `Sign in` submit button plus labelled `Email Address` and `Password` fields. No credentials were submitted.
- Settings dialog opened through a banner-scoped locator and contained API-key, affiliate-ID, service-selection, reset, and save controls. Warning states that keys are browser-stored and available to scripts.
- Legal dialog opened and exposed Affiliate Disclosure, Privacy Policy, Terms of Service, DMCA, and FTC affiliate disclosure copy.

## Persona journeys

| Persona | Goal and path | Result | Friction / opportunity |
|---|---|---|---|
| Professional mechanic / speed-focused power user | Search a known title, compare services, save, then share quickly | Pass: labelled search, smart matches, provider links, watchlist state, and share dialog all worked | Add keyboard shortcut to focus search; expose a compact “where to watch” comparison and copy-link confirmation |
| Everyday driver / low movie-domain knowledge | Start from a phrase, understand whether a title is suitable, then choose a service | Pass with good genre, year, score, runtime, overview, and availability caveat | Explain scores and provider badges in plain language; make region/pricing caveat more prominent at decision point |
| Average quick-decision user | Find one option in under a minute and leave with a clear next action | Mostly pass: result card → trailer → watchlist/provider CTA is clear | Search/filter state can be visually dense; add a single recommended CTA and stronger empty-state reset affordance |

## Severity findings

### P1 — none observed in tested flows

No blocking failure, crash, or stuck search loading state was observed.

### P2 — icon-only controls need a complete accessible-name pass

The initial accessibility inventory contained several icon-only buttons with `aria: null` (while movie-specific controls had good names). This is a risk for screen-reader and automation users, even though the core named controls passed. Audit every icon-only button and require an accessible name plus visible tooltip.

### P2 — duplicate settings control requires scope-aware targeting

`Monetization & API Settings` appears in both banner and footer, so an unscoped role query returns two matches. The UI is still operable when scoped to the banner, but uniqueness would improve automation and keyboard discoverability (or use distinct labels such as “Footer settings”).

### P3 — share completion feedback not verified

The `Copy Link` control was present but not activated during this run; toast/clipboard success remains unverified.

### P3 — filter assertion needs follow-up

The attempted Horror filter check was inconclusive after a state transition to the Classic Albums detail route. Re-run as an isolated fresh-page test and verify `aria-pressed`, result count, and back-navigation preservation.

## Backlog and feature recommendations

1. Add accessible names/tooltips to all icon-only controls and automated axe-style checks (P2).
2. Add a visible “Copied” confirmation and clipboard fallback for Share → Copy Link (P3).
3. Add one-tap “Best match” recommendation with provider comparison and region-aware price/availability refresh (P2).
4. Persist recent searches and filter chips; support keyboard focus shortcut `/` (P3).
5. Add signed-out alert explanation and a non-account reminder option, without weakening account boundaries (P3).
6. Add analytics for search-to-trailer, trailer-to-provider, and trailer-to-watchlist conversion, respecting disclosure and consent (P3).

## Competitive patterns worth borrowing

- Netflix-style “Because you searched…” relevance explanation for smart matches.
- JustWatch-style provider matrix with region and subscription/rental distinction.
- Letterboxd-style lightweight watchlist/share affordances with immediate confirmation.
- YouTube-style consent-gated embed loading (already represented by the privacy-enhanced disclosure).

## Suggested roadmap

**Now:** finish icon-label audit, copy confirmation, isolated filter regression, and mobile/keyboard pass.  
**Next:** provider comparison, region/price refresh, recommendation rationale, and recent-search persistence.  
**Later:** account alerts, notification preferences, experimentation, and conversion analytics with privacy review.

## Limitations

Desktop Chrome extension only; no mobile viewport, Safari/Firefox, real account sign-in, real clipboard permission, external provider checkout, YouTube playback, or network/API-key configuration was exercised. This report is an evidence-backed product audit, not a security review.
