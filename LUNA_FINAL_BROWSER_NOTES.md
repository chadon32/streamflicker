# Luna final browser QA notes

Date: 2026-07-30. Target: http://127.0.0.1:4173/ (Chrome extension, 1914x911 viewport).

- Baseline loaded successfully in ~1.2s. Hero is “Scream 7”; catalog count 1,799. Screenshot: `LUNA_HOME_DESKTOP.png`.
- Header exposes accessible names: StreamFlicker home, Search movies, Open Watchlist (1 saved movie), distinct header Monetization & API Settings, Legal Disclosures & Terms, Sign In. Skip link is present.
- Search accepts blank Enter without obvious validation; invalid `zzzzzzzzzzzzzzzzzzzzzzzz` returns a “No results” state and updates document title to `Search: ... | StreamFlicker`.
- Settings dialog opens and includes optional TMDB key warning, affiliate IDs, streaming-service checkboxes, Reset Defaults, Save Settings. Trust copy warns that the key is browser-stored and scripts can access it.
- Visual DOM confirms `role=dialog`; labels are present for settings fields. Modal interaction via history/back was unreliable in this run (returned about:blank), so close affordance deserves regression coverage.
- Catalog has dense filter groups (era, genre, service, evidence tags), pressed states, hero trailer/watchlist actions, provider links, movie cards with trailer/save alert/share/watchlist controls.
- Unique icon-only naming is strong in baseline snapshot (previous/next spotlight, scroll controls, watchlist/share/alert buttons carry movie-specific names).
- Automotive/movie-product mismatch: personas expecting vehicle/repair discovery would interpret the branded dashboard as a movie trailer catalog; no automotive intent routing or explanation appears above the fold.
