# Planner: well-known checked titles — design

Approved: the web planner may suggest well-known titles that were matched to TMDB ("checked"), labeled, with reviewed titles always first. Date: October 1, 2026. Builds on `2026-10-01-tmdb-verified-facts-design.md`.

## Goal

The planner draws only from the 17 hand-reviewed titles, so narrow choices dead-end (Family night has 2 picks, Date night 0). Let it also suggest well-known titles that the TMDB enrichment verified, without lowering the trust the planner promises.

## Constraints found in the code

- The iPhone app uses a native Swift planner with its own generated 17-title catalog (`openNativeMovieNight`), so web changes do not reach it. Out of scope.
- Picks are ranked by the legacy `score` and `matchPercentage` fields, which are placeholders for unreviewed titles, so checked titles need a different ranking.
- Every pick has a "See trailer" button, so a pick without a trustworthy trailer is a dead end.
- Saved plans restore by id against the planner's pool, so the pool must contain the full catalog's eligible titles before a restore is judged.
- The planner copy and the shared plan text say "our reviewed list", and per-title sharing is reserved for reviewed records.

## Design

**Pool.** Every reviewed title, then each checked title (`recordSource: 'tmdb-checked'`) that clears all of:
- `voteCount >= PLANNER_MIN_VOTES` (starts at 1,000; set from the real vote distribution after the enrichment run);
- `trailerVerified`: the trailer is TMDB's official trailer, not the bundled catalog's own unverified id;
- a synopsis of at least 80 characters and at least one genre other than "Other";
- a poster; released, and rating and runtime verified (implied by being checked).

**Ranking.** Reviewed titles lead (a fixed bonus, with their existing editorial score). Checked titles rank by `log10(voteCount)`. Their legacy score never counts. The watchlist, trending and genre bonuses are unchanged. Because reviewed titles always lead, adding checked titles can only append picks after the reviewed ones; no existing pick changes.

**Occasions.** Unchanged for reviewed titles. A checked title qualifies for Family night only when rated G, PG, TV-G or TV-PG (reviewed PG-13 titles stay). Date night, Friends night, Just me and the length bands use the existing rules, which already require verified facts where they matter.

**Honest labels.** A checked pick shows a visible "Checked on TMDB" pill. When the pool contains checked titles the footer says "Picks come from our reviewed list (date) and from well-known titles we matched to TMDB, which are labeled", and the empty state and disabled-option tooltips stop saying "reviewed". With no checked titles the copy is unchanged.

**Sharing.** A copied or shared plan lists checked picks marked "(checked on TMDB)" with a line explaining the mark. Per-title sharing stays reviewed-only.

**Loading.** Opening the planner starts the full-catalog load. Until it arrives the pool is the reviewed titles, the planner shows "Loading more titles...", and a restored plan with unresolved ids shows "Loading your saved titles..." instead of "no longer available".

**Provenance flag.** `Movie.trailerVerified` is set by `applyTmdbFacts` when the record's trailer equals the TMDB official trailer key (it was either filled from it or already identical). It is packed as bit 2 of the existing `flags` column. A bundled trailer that differs from TMDB's is left in place for browsing but does not make the title planner-eligible.

## Not in scope

The iPhone planner, per-title sharing of checked titles, interleaving checked picks into the default view, and changing what "reviewed" means.

## Tests

Pool eligibility matrix; ranking (reviewed first, votes order, legacy score ignored); the Family rule; option counts for dead-end choices; the monotonic property (checked titles never change the picks a reviewed-only pool gives); the provenance flag through `applyTmdbFacts` and through generation; shared-plan text; UI guards for the label and the loading and copy wiring. A rehearsal with invented facts in a scratch copy checks the real UI.
