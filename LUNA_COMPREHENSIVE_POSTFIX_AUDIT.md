# StreamFlicker comprehensive post-fix audit

Date: 2026-07-30  
Surface: Chrome extension automation against `http://127.0.0.1:4173` (desktop viewport)  
Evidence: [audit_landing.png](audit_landing.png) and [LUNA_POSTFIX_BROWSER_AUDIT.md](LUNA_POSTFIX_BROWSER_AUDIT.md)

## Executive scorecard

| Dimension | Score | Rationale |
|---|---:|---|
| UX | 8/10 | Clear search → result → trailer/provider/watchlist path; empty-state recovery is present |
| UI | 8/10 | Strong hierarchy, poster cards, filters, modal surfaces, and semantic landmarks observed |
| Trust | 7/10 | Availability caveats, affiliate disclosure, privacy-enhanced trailer loading, and API-key warning are explicit |
| Conversion | 7/10 | Provider, trailer, watchlist, share, and alert actions are available; one primary recommendation could be stronger |
| Accessibility | 7/10 | Good labels on core flow; initial inventory found several icon-only buttons without names |
| Performance | 8/10 | Search settled in under the observed wait and did not remain in a loading state; no formal timing benchmark run |

Overall: **7.5/10** for the tested desktop journey. This is a product audit, not a security review.

## Methodology and tested browser surface

I used the Chrome extension browser automation surface only. I inspected DOM snapshots and interacted with named roles/labels. Tested: landing render, blank search, no-result search (`matrix`), successful search (`Scream 7`), smart-match suggestions, movie detail modal, trailer-link/disclosure controls, watchlist add/count state, share modal, authentication modal (without submitting credentials), settings modal, legal disclosures, and provider links. A landing screenshot was saved as evidence. The Vite server was live on port 4173 (PID 73916 reported by Sol).

Unverified: real authentication, clipboard permissions and Copy Link toast, external provider handoff/checkout, YouTube playback, API-key configuration, notifications, mobile layouts, Safari/Firefox, network failure states, and formal performance metrics.

## Persona reports

The requested automotive personas are a domain mismatch for this movie-discovery product. Their behavioral needs are translated below: speed, low cognitive load, and confidence when choosing a film.

### 1. Professional mechanic / speed-focused power user

Journey map: Search known title → scan score/genre/year → open trailer → compare provider → save/share.

Emotional reactions: confident when the result resolves quickly; satisfied when the watchlist count changes immediately; mildly impatient when multiple controls compete for attention.

Positives: labelled search, smart-match suggestions, descriptive provider links, immediate watchlist state, share surface with canonical link.

Pain points/confusing moments: no single “best next action”; duplicate settings labels require scoping in automation; icon-only buttons may be opaque to assistive technologies.

Missing features: keyboard search shortcut, compact provider comparison, recent-search history, copy confirmation.

Trust concerns: provider availability and pricing can change; affiliate relationships require users to understand that outbound clicks may be monetized.

Recommendations: add a keyboard `/` shortcut, primary “Watch now”/“Save” emphasis, provider matrix, and explicit copied confirmation.

Satisfaction: **8/10**.

### 2. Everyday driver / low movie-domain knowledge

Journey map: Enter a phrase or genre → read score/runtime/overview → understand where it is available → decide whether to watch or save.

Emotional reactions: reassured by the overview, rating, runtime, and genre; uncertain if provider badges are unfamiliar or region availability is not read.

Positives: plain-language empty-state helper, title metadata, trailer disclosure, availability caveat, legal disclosures, and service links.

Pain points/confusing moments: score meaning is not explained; provider abbreviations (for example `P+`) may be unclear; no prominent region selector.

Missing features: “why this match” explanation, region and subscription/rental distinction, clearer badge legend, recommended single choice.

Trust concerns: live catalog freshness and affiliate disclosures are visible but should sit closer to the provider decision.

Recommendations: add “Good match because…” rationale, region-aware refresh, plain-language provider labels, and a prominent availability timestamp.

Satisfaction: **7/10**.

### 3. Average quick-decision user

Journey map: Search → pick first useful result → play trailer or open provider → optionally add to watchlist.

Emotional reactions: pleased by quick discovery and low commitment; slight friction from dense filters and multiple equally weighted card actions.

Positives: visible result count, poster art, score, trailer action, watchlist and share controls, modal close controls, and no stuck loading in tested searches.

Pain points/confusing moments: filter assertion needs an isolated regression; result cards contain many actions without a clear priority; successful copy completion was not verified.

Missing features: “Top pick” CTA, recent searches, filter reset persistence, toast feedback.

Trust concerns: outbound links and changing availability warrant a clear confirmation step.

Recommendations: establish one recommended CTA per card, preserve search/filter state on back, and show visible success toasts.

Satisfaction: **7.5/10**.

## Page/screen-by-page audit

| Surface | Evidence and status | Assessment |
|---|---|---|
| Landing | Rendered semantic banner/main/footer, skip link, search, filters, cards, poster alt text | Pass; dense but coherent |
| Navigation | Home, watchlist count, settings, legal, sign-in controls observed | Pass; settings label duplicated in footer |
| Search | `matrix` no-result and `Scream 7` success tested; no stuck loading | Pass; add keyboard shortcut and recent searches |
| Filters | Era, genre, service, and tag groups observed; Horror click assertion inconclusive after route transition | Follow-up required |
| Movie detail/trailer | Modal with YouTube link, privacy disclosure, next/close/load controls, metadata, overview | Pass |
| Watchlist | Add changed to In Watchlist; header count became 1; remove label present | Pass |
| Share | Modal with social links, shareable URL, Copy Link button | Pass surface; completion unverified |
| Auth | One Sign in submit; labelled Email Address and Password; close and sign-up controls | Pass without credential submission |
| Settings | API key warning, affiliate IDs, service buttons, reset/save | Pass; sensitive key handling deserves continued caution |
| Legal | Affiliate, privacy, terms, DMCA, FTC copy rendered | Pass |
| Provider handoff | Max, Hulu, Paramount+ links present with disclosure | Link presence pass; external behavior unverified |
| Loading/error/empty/success | Empty and success states tested; no persistent loading | Pass for tested states; network errors unverified |
| Mobile | Not tested | Unverified |

## Intentional-break matrix

| Break scenario | Expected behavior | Observed / status |
|---|---|---|
| Blank query | Return catalog without stuck spinner | Catalog returned; pass |
| Unsupported query (`matrix`) | Explain no matches and offer recovery | Empty state, helper, Reset All Filters; pass |
| Slow search | Settle and clear loading state | Settled in observed waits; no timing benchmark |
| Modal close | Return to prior catalog context | Close controls present and used; pass |
| Watchlist toggle | Update item and header count | Count changed to 1; pass |
| Duplicate nav action | Scope or distinguish controls | Banner scoping works; duplicate label remains |
| Copy Link denied | Show fallback/toast | Not exercised |
| Provider unavailable | Explain stale/region-dependent availability | Disclosure present; external behavior unverified |
| Invalid sign-in | Show field errors without leaking data | Not submitted |
| Network/API failure | Recoverable error and retry | Unverified |
| Narrow/mobile viewport | Responsive reflow and keyboard access | Unverified |

## Accessibility, CRO, and trust review

Accessibility strengths: semantic landmarks, skip link, labelled search, labelled auth inputs, descriptive movie-specific buttons (`Share Scream 7`, `Save an alert preference for Scream 7`), poster alt text, and modal close labels. Primary gap: the initial button inventory contained several icon-only controls with no accessible name. Run an automated accessibility scan and add names/tooltips before release.

CRO strengths: trailer, provider, watchlist, share, and alert actions all appear at discovery points; watchlist state is immediate. Conversion gaps: no obvious “best next action,” provider badges can be cryptic, and Copy Link success is not verified. Recommend one primary CTA, provider comparison, and clear success feedback.

Trust strengths: changing-availability caveat, affiliate disclosure, legal dialog, YouTube privacy-enhanced loading disclosure, and explicit warning that the API key is browser-stored and script-accessible. Trust gaps: region, freshness, pricing, and subscription/rental distinctions are not yet first-class decision data.

## Prioritized backlog

### Critical

None observed in tested flows.

### High

- Complete icon-only accessible-name audit and add automated regression coverage.
- Add a provider comparison that distinguishes subscription, rental, purchase, region, and freshness.
- Add clear primary CTA hierarchy on result cards.

### Medium

- Add Copy Link success toast and clipboard fallback.
- Resolve duplicate settings naming or document deliberate footer duplication.
- Add filter regression test covering `aria-pressed`, count, and back navigation.
- Add invalid-auth validation test and retryable network-error state.

### Low

- Add `/` search shortcut and recent searches.
- Explain score semantics and provider abbreviations.
- Add recommendation rationale and availability timestamp.
- Add mobile viewport and touch-target regression coverage.

## Feature recommendations

| Feature | Best persona | Complexity | Expected impact |
|---|---|---:|---:|
| Provider matrix with region/freshness | All, especially everyday user | High | High trust and conversion |
| One “Top pick” CTA per card | Quick-decision user | Medium | High decision speed |
| Accessible icon labels + tooltips | Power user and assistive users | Low | High accessibility confidence |
| Copy confirmation + fallback | Power and quick-decision users | Low | Medium completion confidence |
| Recommendation rationale | Everyday user | Medium | Medium trust and relevance |
| Recent searches + `/` shortcut | Power user | Medium | Medium speed |
| Mobile responsive pass | All | Medium | High reach, currently unverified |

## Competitive patterns

These are canonical patterns to benchmark, not additional evidence from this run:

- [Netflix](https://www.netflix.com/) — personalized “because you watched” rationale and clear primary play action.
- [JustWatch](https://www.justwatch.com/) — provider matrix, region-aware availability, and subscription/rental distinctions.
- [Letterboxd](https://letterboxd.com/) — lightweight watchlist, rating context, and sharing behaviors.
- [YouTube](https://www.youtube.com/) — familiar trailer playback and privacy/consent expectations.

## Phase roadmap

### Phase 1 — Reliability and accessibility

Finish icon-label audit, Copy Link confirmation, isolated filter regression, invalid-auth validation, network-error recovery, and keyboard/mobile smoke tests.

### Phase 2 — Decision confidence and conversion

Ship provider matrix, region/freshness metadata, recommendation rationale, one primary CTA, recent searches, and score/badge explanations.

### Phase 3 — Retention and measurement

Add account alerts and notification preferences, privacy-reviewed conversion analytics, experimentation, and personalized discovery while preserving disclosure and account boundaries.

## Verified fixes versus limitations

Verified in Chrome: labelled Email Address and Password fields; one auth submit; descriptive watchlist/share/alert controls; watchlist count update; search empty-state recovery; trailer privacy disclosure; provider/legal/settings surfaces; semantic landmarks and poster alt text; no stuck loading in tested searches.

Limitations: no source edits were made; no credentials were available or submitted; Copy Link, external provider pages, YouTube playback, API-key save, real alerts, mobile, alternate browsers, network failure, and formal performance metrics remain unverified. The automotive persona framing is intentionally noted as a domain mismatch and translated to movie-discovery behavior.
