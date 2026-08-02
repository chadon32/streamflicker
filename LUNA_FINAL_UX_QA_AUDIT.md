# StreamFlicker final UX / browser QA audit

## Executive scorecard

| Area | Score | Evidence |
|---|---:|---|
| Discoverability | 8/10 | Hero, search, skip link, filter bands visible immediately |
| Search/filter UX | 7/10 | Rich controls and counts; blank search feedback is weak |
| Accessibility | 8/10 | Strong accessible names, combobox label, pressed states, dialog role |
| Trust/transparency | 7/10 | API/affiliate disclosure is explicit; provider exits are external |
| Visual hierarchy | 8/10 | Strong hero and score badges; dense lower-page control load |
| Resilience | 6/10 | Invalid query empty state works; modal history/back exposed blank-page risk |
| Overall | 7.4/10 | Polished movie discovery surface with a few state/clarity gaps |

## Persona journeys

### Professional mechanic / speed-focused power user
Flow: load → immediately inspect search/filter controls → choose year/genre/service → open a card → trailer/provider.

Reaction: appreciates counts, pressed states, movie-specific icon names and fast scanability. Pain: many simultaneous filter chips and repeated card actions increase target density; no keyboard shortcut or compact “clear all”. Missing: saved filter presets and bulk watchlist actions. Trust: clear affiliate/API disclosure. Satisfaction: 8/10 for movie task, 2/10 for automotive task because intent mismatch is unexplained. Recommendation: add filter summary, Clear all, and power-user keyboard shortcuts.

### Everyday driver / low automotive knowledge

Flow: read hero → type a natural phrase (`80s horror`) → inspect no-result/empty feedback → open trailer and provider.

Reaction: helper copy (“Search by title, actor, or a phrase…”) is welcoming; provider labels are recognizable. Pain: blank search gives no clear instructional response; “Catalog score” is unexplained. Missing: plain-language “where to watch” and “why this score” helper. Trust: optional key warning is understandable but technical. Satisfaction: 7/10 movie, 1/10 automotive. Recommendation: add novice glossary/tooltips and a friendly empty-state example.

### Average quick-decision user

Flow: scan hero → Watch Trailer → Save/Share → Watchlist → return and compare providers.

Reaction: hero CTA and poster imagery make the next action obvious; movie-specific Share/Alert names reduce ambiguity. Pain: repeated provider/action controls compete with title metadata; modal dismissal/back behavior needs hardening. Missing: one “Play now”/availability summary. Trust: external provider links are clearly named. Satisfaction: 8/10 movie, 2/10 automotive. Recommendation: prioritize one primary CTA and collapse secondary actions under an overflow menu.

## Page-by-page findings

| Surface | Positive evidence | Risk / recommendation |
|---|---|---|
| Landing / hero | Skip link, hero score, rating, runtime, Watch Trailer, watchlist, providers | Explain catalog score; clarify movie-only product intent |
| Search | Accessible combobox; title updates on query | Blank query needs guidance; long/unsupported input should show length/normalization feedback |
| Filters | Era/genre/service/tag groups, counts, pressed state | Dense horizontal groups need mobile overflow and Clear all summary |
| Catalog cards | Poster alt text, movie-specific trailer/share/alert/watchlist names | Repetition raises cognitive load; expose card heading/metadata grouping |
| Movie detail/trailer | Hero/card actions and provider links present | Verify trailer failure fallback and modal close on every browser history path |
| Watchlist | Header badge reports saved count | Empty watchlist guidance and persistence after refresh should be explicit |
| Alerts | Per-movie “Save an alert preference” names | Explain notification timing and permission expectations |
| Share | Movie-specific Share names; Copied status fix targeted | Verify clipboard-denied fallback and live announcement |
| Sign in | Single visible Sign In entry point | Test labels and one submit; avoid duplicate submit controls |
| Settings/legal | Distinct header labels; settings disclosure is strong | Modal close/back state should never blank the app |
| Provider links | Service-specific, named external links | Add “opens external site” hint and availability timestamp |
| Footer | Expected settings/legal destinations should remain distinct from header | Regression-check duplicate labels and focus order |

## Intentional-break matrix

| Input/state | Expected | Observed |
|---|---|---|
| Blank search + Enter | Guidance or untouched catalog | No obvious feedback; improve helper state |
| Invalid query | Empty state + retry/fallback | “No results” state and title update observed |
| Long query | Safe normalization/limit | Not fully verified; add explicit boundary test |
| Unsupported phrase | Friendly no-results example | No-results path works for nonsense string |
| Network/catalog failure | Retry and local fallback | Not practical without intercept; acceptance should include offline test |
| Rapid clicks | Debounced/idempotent actions | Not fully verified; stress Share/Watchlist/Trailer |
| Refresh/back | Preserve app state | Back from modal surfaced about:blank in this run; high-priority regression |
| Keyboard/focus | Visible focus, Escape close, logical order | Skip link and names verified; complete tab sweep still needed |

## Backlog

### Critical

- Prevent modal close/history paths from navigating to `about:blank`; preserve app shell and focus return.

### High

- Add explicit blank-search guidance and clear-all filter summary.
- Add trailer/provider network failure fallback with retry and local catalog messaging.
- Verify ShareModal Copied live status plus clipboard fallback when permission is denied.

### Medium

- Explain catalog score, availability freshness, and affiliate behavior in plain language.
- Reduce action density on cards with progressive disclosure.
- Add mobile filter overflow, desktop compact filter summary, and keyboard shortcuts.

### Low

- Add movie-only onboarding cue and optional automotive/product mismatch explanation.
- Add favorites/watchlist empty-state examples and personalized filter presets.

## Feature recommendations

| Feature | Complexity | Impact |
|---|---|---|
| Clear-all + active-filter summary | S | High |
| Availability freshness/provider summary | M | High |
| Offline retry/local fallback UI | M | High |
| Score glossary/tooltips | S | Medium |
| Saved filter presets | M | Medium |
| Keyboard command palette | M | Medium |

## Competitive reference

- JustWatch: https://www.justwatch.com/ — strong availability-first comparison.
- Letterboxd: https://letterboxd.com/ — strong social lists and discovery context.
- IMDb: https://www.imdb.com/ — familiar metadata, ratings, and trailers.

## Roadmap

1. Phase 1: harden modal/history behavior, blank/long/unsupported states, retry/fallback, and clipboard-denied Share.
2. Phase 2: clarify score/availability/affiliate copy, simplify card actions, add active-filter summary and mobile overflow.
3. Phase 3: presets, command palette, personalization, richer availability freshness and onboarding.

## Verified fixes vs limitations

Verified in browser: unique icon-only accessible names; distinct header settings/legal labels; labeled search; dialog role and settings disclosure; movie-specific trailer/share/alert/watchlist names; invalid-query no-results title/state; visible catalog counts and pressed filters.

Limitations: Chrome run did not intercept network traffic, complete every responsive breakpoint, or finish a full tab-order audit. Modal back navigation produced an about:blank page once and should be treated as an actionable regression until reproduced/fixed. No source files were modified.

## Post-fix verification

Focused Chrome verification after the modal/search fixes confirmed:

- Opening the Scream 7 trailer adds a `?movie=` URL; browser Back closes the modal and returns to `/` with the StreamFlicker shell visible (not `about:blank`).
- Reopening the trailer and using Close also restores `/` with the shell visible and no modal.
- Pressing Enter in an empty Search movies field shows lightweight guidance: "Type a title, actor, genre, or phrase to search the catalog."

Remaining limitations: network/interruption fallback, provider handoff behavior, responsive breakpoints, alternate browsers, complete keyboard traversal, and authenticated/persistent workflows remain unverified. Availability and pricing can change on external services.
