# StreamFlicker — Luna Live UX, QA, CRO, and Accessibility Audit

**Audit date:** 2026-07-30  
**Runtime:** local Vite app at `http://127.0.0.1:4173`  
**Method:** real desktop browser interaction via Luna; notes captured during the journey.  
**Evidence:** [desktop screenshot](C:/Users/chado/Documents/streamflicker/luna_desktop.png) and [raw Luna notes](C:/Users/chado/Documents/streamflicker/LUNA_BROWSER_AUDIT_NOTES.md).

## Executive summary

StreamFlicker has a strong cinematic first impression and a useful core loop: browse a catalog, search, filter, inspect a title, and save or open a provider. The live pass confirmed that loading, invalid-search, filter, and empty-watchlist states are present. The biggest experience risks are not visual polish; they are performance resilience, ambiguous accessibility names, weak form semantics, and trust gaps around catalog and availability data.

The requested personas are not the product’s natural audience: a mechanic and an everyday driver are automotive personas, while StreamFlicker is a film-discovery product. They were still tested as requested. Their domain mismatch makes the need for plain-language orientation and immediate proof of value even more important.

### Scores

| Dimension | Score | Rationale |
|---|---:|---|
| Overall UX | **6.5/10** | Core discovery works, but load delay and incomplete critical workflows reduce confidence. |
| Overall UI | **7.5/10** | Distinctive dark/cinematic system with good hierarchy; dense controls and ambiguous icon/button naming remain. |
| Trust | **5.5/10** | Legal/disclosure links are visible, but live availability, catalog provenance, and auth persistence were not proven in-browser. |
| Conversion | **6/10** | Strong “find something” value proposition; provider conversion is weakened by delay, uncertainty, and unverified outbound handoff. |
| Accessibility | **5/10** | Skip link and many descriptive controls are positive; sign-in labels and watchlist naming collision are high-priority defects. |
| Performance | **5/10** | Catalog eventually loads, but the initial wait was roughly four seconds with oversized-response and network diagnostics. |

### What is working

- Featured content communicates title, score, year, runtime, trailer, and availability quickly.
- Filter controls expose pressed state and numeric counts.
- Nonsense search (`zzzzzzzz`) produces a clear zero-result state with reset action.
- Empty watchlist copy explains what to do next.
- Footer exposes Terms, Privacy, Affiliate Disclosure, and Monetization/API Settings.

### Highest-risk issues

1. **High — catalog startup feels heavy and potentially unstable.** The “Loading the movie catalog” state persisted for about four seconds; browser diagnostics included a Statsig networking error and an oversized response diagnostic.
2. **High — watchlist control names are ambiguous.** A non-exact Watchlist role lookup matched 92 elements because “Add to Watchlist” card actions are treated as matches.
3. **High — sign-in labels are not programmatically associated.** `getByLabel("EMAIL ADDRESS")` and `getByLabel("PASSWORD")` returned zero; placeholders are doing the work of labels.
4. **Medium — critical flows were not fully verifiable without credentials.** Authenticated watchlist persistence, sign-up, alerts, trailer playback, sharing, settings, provider handoff, and mobile behavior remain open test risks.
5. **Medium — domain trust is under-explained.** Users need a visible freshness/provenance statement for ratings, availability, and prices before clicking out to a service.

## Test method and boundaries

Luna used the application as a real user on desktop: waited through initial load, inspected the populated catalog, searched for an impossible term, checked filter state/counts, opened the empty watchlist dialog, opened the sign-in dialog, and inspected accessible names and labels. A screenshot was captured after load. No account credentials were supplied, so authenticated paths were not fabricated. Mobile viewport resizing was unavailable in the browser control surface and is explicitly marked unverified.

This is a live UX/QA audit, not a replacement for production telemetry, formal WCAG testing with assistive technology, or a network-throttled performance lab run.

## Persona reports

### Persona 1 — Professional mechanic

**Context:** Strong technical user, speed-oriented, desktop-first, may use a phone between jobs. Because the product is entertainment rather than automotive, this persona starts with low domain fit and needs orientation immediately.

**Journey map**

| Stage | Observed reaction | Friction / opportunity |
|---|---|---|
| Land | “This looks premium, but what exactly do I do first?” | Hero is visually strong; a concise one-line product explanation and direct search affordance would reduce interpretation time. |
| Browse | Quickly scans title cards and stats. | Repeated card actions create a noisy control surface; the watchlist naming collision reinforces this. |
| Search/filter | Appreciates counts and pressed states. | Search vocabulary should explain title, person, year, provider, and concept support without requiring trial-and-error. |
| Decide | Wants a reliable answer about where to watch. | Availability freshness, region, and price provenance are not prominent enough. |
| Save/return | Empty watchlist is understandable. | Cross-device persistence and signed-in success were not proven. |

**Emotional reactions:** Initial interest → impatience during load → confidence after filters work → uncertainty around data freshness and account persistence.

**Pain points**

- Roughly four-second catalog wait before the productive state.
- Too many similarly named watchlist actions for fast scanning and automation.
- No obvious “last updated” timestamp for provider availability.
- Auth flow asks for sign-in without making the value of signing in explicit.

**Positive experiences**

- Dense metadata supports quick triage.
- Numeric filter counts make narrowing efficient.
- Empty-state copy is action-oriented rather than a dead end.

**Trust concerns**

- Static or stale availability would directly damage a technical user’s confidence.
- A visible affiliate/disclosure link is good, but disclosure should also appear adjacent to provider CTAs.

**Recommendations**

- Add “Updated X hours ago” and region beside every availability result.
- Add keyboard shortcuts and a compact results mode for power users.
- Provide a one-click “copy title + provider” action.
- Replace broad Watchlist naming with exact “Open watchlist” / “Add [title] to watchlist” labels.

**Satisfaction:** **6/10** — capable once loaded, but not yet a workflow replacement for a speed-sensitive expert.

### Persona 2 — Everyday driver with limited automotive knowledge

**Context:** Low technical confidence and no assumed film expertise. This persona most closely exposes comprehension and reassurance problems.

**Journey map**

| Stage | Observed reaction | Friction / opportunity |
|---|---|---|
| Land | Understands the visual promise before understanding the mechanics. | Add plain language such as “Find a movie and where to watch it.” |
| Search | Nonsense search behaves well. | Empty state is clear; search help should explain accepted terms and examples. |
| Filters | Counts and pressed states help. | Terms such as era, micro-tags, and provider may be unfamiliar without helper text. |
| Sign in | Sees a conventional modal. | Label semantics are weak and the value exchange is not explained. |
| Watchlist | Empty state gives a clear next step. | Explain whether saving is local, account-backed, or both. |

**Emotional reactions:** Curious → temporarily lost during loading → reassured by zero-result/reset copy → cautious at sign-in.

**Pain points / confusion**

- “Availability,” “provider,” “micro-tag,” and score terminology need plain-language definitions.
- Placeholder-only fields are not enough for screen readers or users who clear input.
- Two visible “Sign In” buttons make automation and user targeting ambiguous.
- A user cannot tell whether results are current, complete, or personalized.

**What would cause abandonment**

- A blank or slow catalog with no progress explanation.
- A provider click that lands somewhere unexpected.
- Asking for account creation before letting the user save or explore.
- Technical filters without examples.

**Recommendations**

- Add inline “What does this mean?” help to ratings, availability, and filters.
- Use visible labels plus examples, not placeholders as labels.
- Add a no-account path: “Save on this device” with a clear privacy note.
- Add reassurance copy: “We show discovery links; verify current price and availability with the provider.”

**Satisfaction:** **6.5/10** — the empty states are friendly, but the product assumes too much vocabulary and trust.

### Persona 3 — Average user

**Context:** Wants the fastest possible answer and reads very little.

**Journey map**

| Stage | Observed reaction | Friction / opportunity |
|---|---|---|
| Land | Strong visual hierarchy and featured title. | Make the primary action more singular: search or choose the featured title. |
| Scan | Card rows are attractive. | Repeated metadata and actions increase scanning cost. |
| Narrow | Filter counts are useful. | Preserve the compactness but hide advanced filters behind a clear “More filters” control. |
| Save | Watchlist intent is obvious. | Ambiguous global naming and unverified persistence create hesitation. |
| Convert | Provider labels are visible. | Add freshness and external-link context right before handoff. |

**Emotional reactions:** Impressed → impatient → efficient after filtering → hesitant at sign-in/outbound handoff.

**Recommendations**

- Keep the hero, reduce secondary copy, and promote one primary CTA.
- Use a single-card overflow menu for secondary actions.
- Preserve zero-result/reset behavior; it is one of the strongest moments in the current flow.

**Satisfaction:** **7/10** — polished surface, but the path to a confident click is not yet frictionless.

## Page-by-page / screen-by-screen audit

The app is a single-page experience rather than a multi-route site. The “pages” below are the user-visible screens and modal states encountered or inferred from the product surface.

| Screen / state | What works | What does not | Severity | Recommended fix | Estimated impact | Evidence |
|---|---|---|---|---|---|---|
| Landing / featured catalog | Strong cinematic hero; featured title exposes score/year/runtime/trailer/provider cues. | Initial catalog load held the user on a loading message for ~4s; oversized-response and network diagnostics appeared. | High | Split catalog payload further, show a useful skeleton/featured fallback, instrument LCP and catalog load duration. | Faster first action; lower bounce. | Live browser observation; [screenshot](C:/Users/chado/Documents/streamflicker/luna_desktop.png) |
| Header navigation | Watchlist and Sign In are discoverable; skip link exists. | Watchlist role/name is ambiguous: 92 non-exact matches. | High | Give header control an exact accessible name such as “Open saved watchlist”; ensure card actions use title-specific names. | Better keyboard/AT use and fewer mistaken clicks. | Luna role query |
| Search | Impossible query returns a dedicated zero-result state and reset action. | Search help and supported query syntax are not obvious. | Medium | Add examples and clarify title/person/year/provider/concept support. | More successful first searches. | `zzzzzzzz` test |
| Filters | Pressed state and numeric counts are clear. | Advanced vocabulary and provider/era semantics need explanation. | Medium | Add helper text, tooltip definitions, and a compact “More filters” grouping. | Better comprehension and faster narrowing. | Live filter inspection |
| Results grid | Rich cards provide useful decision metadata. | Many repeated controls increase clutter; watchlist labels collide globally. | High | Reduce always-visible actions; use exact, title-specific labels and a secondary menu. | Faster scanning, cleaner accessibility tree. | Live role query; screenshot |
| Movie details / trailer | Trailer and provider concepts are visible in the product model. | Trailer playback and detail interaction were not completed in the live run. | Medium / unverified | Test privacy gate, loading, failure, captions, keyboard controls, and provider handoff in a credential-free environment. | Directly affects conversion. | Not verified |
| Empty search | Clear “No movies match your filters” message and “Reset All Filters.” | No suggestion for alternate spelling or nearby concepts. | Low | Add suggested queries and a “Browse featured” escape hatch. | Recovers some failed searches. | Live `zzzzzzzz` test |
| Watchlist dialog (empty) | “Your Saved Watchlist (0)” and guidance are clear. | Persistence, add/remove, refresh, and cross-device semantics unverified. | Medium | Test anonymous save, sign-in merge, reload, and failure states; explain storage model. | Increases retention and trust. | Live empty dialog |
| Sign-in dialog | Conventional email/password entry and Sign Up affordance. | Labels are not programmatically associated; two Sign In buttons create ambiguity; success/error not verified. | High | Use `<label for>`/`id`, one modal-scoped submit name, inline validation, error summary, password reveal, and clear benefit copy. | Accessibility compliance and auth completion. | `getByLabel` returned 0 |
| Settings / alerts / monetization | Footer exposes trust and configuration entry points. | Modal content and persistence were not verified. | Medium / unverified | Test each setting with blank, unsupported, long, and cancel values; state local-only behavior. | Reduces false expectations and support load. | Not verified |
| Legal / disclosures | Terms, Privacy, Affiliate Disclosure are visible. | Placement and comprehension at the point of provider click were not verified. | Low | Add short disclosure near outbound CTAs plus full footer links. | Trust and informed conversion. | Footer inspection |
| Provider handoff | Providers are visibly named (e.g. Max, Hulu). | External navigation, region, freshness, and price were not verified. | High / unverified | Add region, timestamp, “opens external site,” and fallback when inventory is unavailable. | Fewer dead ends and higher qualified clicks. | Not verified |
| Mobile layout | No conclusion possible. | Mobile viewport resize was unavailable during the live pass. | High / unverified | Run 320/375/390/430px tests with real touch targets, overflow, dialog focus, and sticky header. | Mobile conversion and accessibility. | Not tested |

## Intentional-break and resilience matrix

| Scenario | Result | Severity / next action |
|---|---|---|
| Invalid search (`zzzzzzzz`) | Handled with zero-result copy and reset. | Pass; add alternate suggestions as polish. |
| Blank search | Not isolated in live run. | Medium; verify submit, clear, and focus behavior. |
| Extremely long text | Not verified. | Medium; add max length, truncation, and safe rendering test. |
| Unsupported filter value | Not verified. | Medium; reject safely and preserve a usable state. |
| Rapid repeated clicks | Not verified. | Medium; de-dupe requests and guard modal transitions. |
| Refresh / browser back | Not verified for modal and watchlist state. | High; test deep-link and state restoration. |
| Multiple tabs | Not verified. | Medium; verify localStorage synchronization and conflict behavior. |
| Network/API failure | Statsig diagnostic observed; user-facing fallback not fully verified. | High; add deterministic offline/error-state test. |
| Authenticated success/error | Not verified without credentials. | High; provide test account or staging auth harness. |
| Trailer failure/captions | Not verified. | High; test privacy gate, YouTube failure, captions, and keyboard controls. |

## Accessibility review

### Verified positives

- Skip link “Skip to movie discovery” is present.
- Most sampled controls expose descriptive names.
- Filter pressed states and counts communicate state to assistive technology.
- Empty states provide explanatory text, not only visuals.

### Required fixes

1. Associate the visible sign-in labels with input IDs; do not rely on placeholders.
2. Make header Watchlist exact and unique; distinguish “Open saved watchlist” from “Add *Title* to watchlist.”
3. Scope modal submit controls so only one actionable “Sign In” is exposed in the dialog.
4. Verify focus trap, initial focus, Escape close, focus return, visible focus ring, and screen-reader announcement for dialogs.
5. Test all poster/icon-only actions at 200% zoom and on a 320px viewport.

## CRO and trust review

**Primary conversion:** click through to a streaming provider.  
**Secondary conversions:** trailer load, watchlist save, share, sign-in.

The hero creates desire, but conversion confidence is weakened by the catalog wait, unclear data freshness, and unverified external handoff. Add a small “availability checked” timestamp, region selector, and a concise disclosure adjacent to provider buttons. Let users save anonymously before asking for an account, then explain the benefit of syncing across devices. Do not imply that a local alert preference sends email unless a notification backend exists.

## Improvement backlog

### Critical

- Establish a deterministic catalog-load fallback and measure the ~4s startup path.
- Fix sign-in label association and modal button ambiguity.
- Make Watchlist accessible names unique and exact.
- Verify provider links, availability freshness, and no-inventory behavior before relying on outbound conversion.

### High impact

- Run a complete mobile audit at 320/375/390/430px.
- Add authenticated staging credentials or a test harness for sign-in, sign-up, watchlist persistence, and alerts.
- Add trailer loading/error/caption/keyboard coverage.
- Add catalog provenance, region, timestamp, and price/source language.
- Add first-use plain-language onboarding: “Find a movie and where to watch it.”

### Medium

- Add search examples and filter helper text.
- Add long-input, blank-input, unsupported-filter, rapid-click, back/refresh, and multi-tab tests.
- Reduce always-visible card actions with an overflow menu.
- Add no-result suggestions and a featured-content escape hatch.
- Instrument Core Web Vitals, catalog load, search success, provider click, and watchlist conversion.

### Low

- Add keyboard shortcuts for power users.
- Add “opens external site” microcopy and lightweight outbound confirmation.
- Add visual focus-ring and reduced-motion regression snapshots.
- Add export/import for local watchlists.

## Feature recommendations

| Feature | Why it helps | Personas | Complexity | Expected impact |
|---|---|---|---|---|
| Region-aware availability with freshness timestamp | Converts discovery into a trustworthy decision. | All | Medium–High | High provider-click confidence. |
| Anonymous watchlist + account merge | Removes sign-in friction while enabling retention. | Everyday, Average | Medium | Higher save rate and later account conversion. |
| Plain-language filter help | Reduces intimidation and trial-and-error. | Everyday | Low | Better search/filter completion. |
| Power-user compact mode and keyboard shortcuts | Makes high-volume scanning faster. | Mechanic persona, Average | Medium | Lower time-to-decision. |
| “Why this match?” explanation | Makes recommendations feel credible rather than arbitrary. | Everyday, Average | Medium | More trust and trailer/provider clicks. |
| Watchlist availability alerts with honest delivery status | Gives users a reason to return without false promises. | All | High | Strong retention if backed by real notifications. |
| Provenance and data-quality report | Makes catalog limitations transparent. | Professional, Average | Medium | Higher trust, fewer failed clicks. |

## Competitive analysis

| Pattern | Industry reference | Gap in StreamFlicker | Recommendation |
|---|---|---|---|
| One watchlist across services/devices | JustWatch describes a single watchlist spanning services and devices ([source](https://www.justwatch.com/)). | Current browser-local watchlist and account sync were not proven. | Make storage behavior explicit and support account-backed sync. |
| Watchlist state is visually obvious | Letterboxd documents a distinct visual state for watchlisted films ([source](https://letterboxd.com/about/faq/)). | StreamFlicker has naming ambiguity and no verified persistence journey. | Add a clear saved state plus exact per-title labels. |
| Rich film context and community loops | Letterboxd positions watchlist, ratings, reviews, lists, diary, and cast/crew discovery as a connected system ([source](https://letterboxd.com/welcome/?register=true)). | StreamFlicker is stronger at provider discovery but lighter on context and return loops. | Add lightweight “why this,” lists, or trusted editorial collections before building a social network. |
| Recommendation feedback | Google TV explains that watchlist and activity can inform recommendations ([source](https://blog.google/products-and-platforms/platforms/google-tv/tailor-your-recommendations/)). | StreamFlicker does not visibly explain how a saved title improves recommendations. | Add an explicit recommendation feedback loop. |

## Final roadmap

### Phase 1 — Immediate

1. Fix sign-in labels, dialog focus semantics, and duplicate Sign In exposure.
2. Fix Watchlist naming collision and add exact title-specific accessible names.
3. Add useful catalog skeleton/fallback and investigate the oversized response / Statsig diagnostic.
4. Add availability timestamp, region, disclosure, and external-site context.
5. Create a staging auth/test account and automate the currently unverified critical flows.

### Phase 2 — Next sprint

1. Complete 320/375/390/430px responsive and touch audit.
2. Add search examples, filter help, no-result suggestions, and plain-language onboarding.
3. Validate trailer privacy gate, captions, keyboard controls, failure state, and provider handoff.
4. Instrument catalog load, search success, watchlist save, trailer load, provider click, and error rates.
5. Add anonymous watchlist persistence and sign-in merge semantics.

### Phase 3 — Future

1. Build region-aware live availability and honest alert delivery.
2. Add “Why this match?” explanations and feedback-driven recommendations.
3. Add compact power-user mode, keyboard shortcuts, export/import, and curated lists.
4. Add a provenance/data-quality surface and editorial trust signals.

## Acceptance criteria for the next audit

- Catalog first useful interaction is under 2 seconds on a throttled desktop run, with a tested offline/error fallback.
- `getByLabel("EMAIL ADDRESS")` and `getByLabel("PASSWORD")` each resolve exactly one control.
- Exact “Open saved watchlist” resolves exactly one control; “Add [title] to watchlist” resolves the intended card action only.
- Full keyboard journey passes for search, filters, card action, dialog open/close, trailer gate, and provider CTA.
- Mobile tests pass at 320px and 390px with no horizontal overflow and 44px minimum touch targets.
- Authenticated watchlist, refresh/back, multi-tab, trailer error, provider handoff, and alert states have recorded evidence.
