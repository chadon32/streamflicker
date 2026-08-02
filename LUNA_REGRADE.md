# StreamFlicker live regrade (2026-07-31)

Target: `http://127.0.0.1:4173/` in Chrome extension browser automation only. No source/package/report files were edited.

## Scores

| Area | Score | Evidence |
|---|---:|---|
| UX / task flow | 8.1/10 | Landing page exposes search, era/genre/service/tag filters, featured CTA, watchlist, trailer, and sharing. Search for `zzzzzzzz` produced an explicit zero-results state with reset guidance. |
| UI / visual hierarchy | 8.0/10 | Desktop viewport observed at 1920×911; clear featured hero, filter groups, catalog rails, score badges, service links, and footer. Dense long catalog can feel overwhelming. |
| Trust / transparency | 8.4/10 | Score tooltip text explains curated 0–10 rating; evidence-based tag tooltips explain provenance; service links warn that availability/pricing can change; legal/affiliate/monetization controls are exposed. |
| Conversion | 7.8/10 | Watch Trailer, availability links, watchlist, share, and alert-preference actions are prominent. Sign-in button is present, but its unauthenticated interaction did not reveal a form in this run. |
| Accessibility | 8.2/10 | Search has accessible name; icon-only controls have names (navigation, spotlight arrows, watchlist, settings, legal, scroll, share, watchlist actions); images expose descriptive alt text; Share Movie dialog has named close button, textbox, and Copy Link. Header/footer monetization controls use distinct accessible names. |
| Performance | 7.2/10 | Initial page became interactive quickly in local run and filter/search transitions completed within ~0.3s. The very large catalog/DOM and image payload are expensive; no Lighthouse or network profiling was run. |

Overall: **8.0/10 (strong B+)**.

## Focused checks

- Landing/search/filter: PASS. Search combobox was unique and accepted text; entering `zzzzzzzz` rendered `Results for "zzzzzzzz"`, `Showing 0 of 0`, `No movies match your filters`, and `Reset All Filters`. Reset returned the catalog.
- Filter controls: PASS by visible state. Era, genre, streaming-service, and evidence-based tag controls expose pressed state/counts and explanatory tag titles.
- Modal open/close: PASS for Share Movie. Dialog exposed `Share Movie`, movie metadata, social links, shareable-link textbox, named close control, and Copy Link.
- Share copied confirmation: PASS. Copy action changed button text to `Copied!` and rendered `Link copied to your clipboard.`
- Back/history: LIMITATION. Closing the share dialog returned to the app URL with zero dialogs. A subsequent browser Back reached `about:blank` rather than restoring an in-app state; history semantics should be hardened/verified in a fresh-session regression.
- Blank/empty search guidance: PASS for no-match guidance above; zero-result copy is useful but suggests resetting tags/query rather than a richer related-search fallback.
- Accessible icon-only names: PASS in sampled DOM audit (home, watchlist, settings, legal, nav, spotlight arrows, rail scroll, share, alert, and watchlist actions).
- Header/footer settings labels: PASS. Header is `Open header Monetization & API Settings`; footer is `Open footer Monetization & API Settings`.
- Auth labels / one submit: LIMITATION. `Sign In` is uniquely named, but clicking it did not expose a visible dialog/form in this unauthenticated run; submit-count could not be verified.
- Provider/score tooltips: PASS. Score generic has descriptive accessible label; tag/provider controls expose title/availability guidance.
- Watchlist actions: PASS by sampled controls: featured item showed `In Watchlist`; cards exposed `Add ... to Watchlist` / `Remove ... from Watchlist` and alert/share actions.
- Trust/error/loading/empty/success states: PASS for empty and share success; loading/error branches were not forced because no controllable fault injection was available.
- Responsive: LIMITATION. Only the available 1920×911 desktop viewport was checked; no browser resize control was available in this Chrome session.

## Persona and mismatch notes

- Professional mechanic: useful search/filter discipline and service links, but this is a movie-discovery product and has no automotive repair/vehicle workflow.
- Everyday driver: fast “what can I watch?” discovery and watchlist/share are understandable; service availability disclaimer is appropriately visible.
- Average user: hero CTA, plain-language search hint, count-labelled filters, and empty-state recovery are approachable.
- Automotive/movie mismatch remains fundamental: StreamFlicker is coherent as a movie trailer/streaming app, not as an automotive tool. Any automotive evaluation should score intent fit separately.

## Remaining limitations / risks

1. Re-test Sign In in a clean browser state to confirm the auth modal, field labels, and exactly one submit action.
2. Verify Back/Close URL restoration with a fresh tab/session; current run reached `about:blank` after Back.
3. Run a real mobile-width pass and Lighthouse/network profiling before a production performance claim.
4. Exercise controlled provider outage and trailer-loading failures to verify error/loading copy.
