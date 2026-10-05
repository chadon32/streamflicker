# Website improvement pass — September 4, 2026

## Scope

Local StreamFlicker website improvements. Existing dark/rose branding, logo, account behavior, monetization, catalog data, and native iOS implementation were preserved. No deployment, commit, or push was performed. Browser testing used only an isolated in-app browser tab; no desktop helper or user Chrome/game windows were used.

## Changes

| Before | After |
| --- | --- |
| Featured movie was the only homepage introduction | Clear discovery headline, Help me pick action, and one-tap family, date-night, quick-watch, and zombie shortcuts |
| No direct unfiltered full-catalog view | Browse all opens the complete catalog with existing incremental loading |
| Desktop showed every filter immediately; phone filters hid the active selections | Collapsible filters on desktop, removable selection chips, wrapped themes, clearer year/genre grouping, live result count in the mobile panel |
| Resizing an open mobile panel could leave desktop scrolling locked | Modal/focus locking now follows the actual responsive breakpoint |
| Featured navigation was visually hidden on desktop | Always-visible 44px controls, slide count and screen-reader announcement |
| Fixed hero height risked clipping long titles/actions | Content-driven height, shorter copy, fewer competing actions |
| Movie-row controls were hidden or enabled at either end | Visible touch-sized controls with accurate disabled edges and keyboard arrows; programmatic scrolling respects reduced motion |
| Planner silently ignored constraints when no titles matched | All constraints are retained, with an explicit no-match recovery action |
| Pick again generally repeated the same highest-scoring films | Deterministic rotating groups of matching movies |
| Runtime labels disagreed with selection thresholds | Explicit bands: at most 100 minutes, 101–150 minutes, over 150 minutes; unknown durations excluded from bounded filters |
| Planner service filters trusted bundled provider metadata | Service options require verified title and provider data; direct availability links are supplied per recommendation |
| Restoring a saved plan generated new movies | Saved IDs restore in saved order, with unavailable titles disclosed |
| A failed local save could display success | Save failure displays an error; saved-plan validation and duplicate handling are shared |
| Opening a trailer from the planner could layer modal focus traps | Planner closes before the trailer opens |

## Validation

- Baseline and final service/catalog tests passed for 1,799 records. Added regression coverage for strict matching, runtime boundaries, rotating cohorts, verified providers, saved-plan validation, and deduplication.
- TypeScript, Oxlint, and Vite production build passed.
- Browser viewport checks: 320 × 740, 390 × 844, and 1440 × 900.
- All 18 featured slides checked at 320px: no horizontal page overflow or clipped hero buttons.
- Zombie shortcut: 76 matching titles; active theme removable without reopening filters.
- Family, date-night, and quick-watch shortcuts opened their corresponding results with no horizontal overflow at 320px.
- Open mobile filters resized to desktop: dialog semantics and body scroll lock cleared. Escape closed mobile filters and restored focus to the trigger.
- Featured Next activated with Enter; movie-row scrolling moved the row and initially disabled its left arrow.
- Planner Pick again changed all three titles in the tested initial set. Family + Horror returned no matches and disabled save.
- Saving, re-picking, and restoring returned the exact three saved titles.
- Opening a planner trailer left only one dialog; closing it restored body scrolling.

## Remaining limits

- This is a UX and selection-correctness pass, not a verification of all movie metadata. Existing bundled scores, ratings, runtimes, future titles, and availability still depend on source quality. Do not present these changes as a catalog accuracy certification or a comprehensive accessibility audit.
- Native iOS Movie Night uses a separate implementation and was not rebuilt or modified here.
- No live subscription/account/payment operations were tested or changed.
- Production build still warns about the existing 752.80 kB lazy-loaded catalog chunk; 18 legacy duplicate provider entries are normalized by the existing catalog pipeline.
- Storage-failure messaging was reviewed in code; actual browser storage failure was not injected during the UI test.
