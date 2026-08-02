# StreamFlicker Microtag and Filter Audit

Audit date: 2026-07-28  
Scope: all 1,799 bundled records, canonical runtime classification, filter predicates, and browser UI

## Outcome

The original genre and microtag fields were not reliable enough to expose directly:

- All 1,799 records were labelled Thriller.
- 1,733 were labelled Sci-Fi and 1,711 were labelled Horror.
- `#MustWatch` appeared on 1,690 titles despite having no objective definition.
- Several microtags had very low synopsis support: `#MindBending` 0%, `#BodyHorror` 2.1%, `#Cyberpunk` 5.0%, `#SciFiHorror` 5.6%, and `#DarkComedy` 6.8%.
- Known false positives included `Scream 7` as `#ZombieOutbreak`, title-only “monster” matches, documentaries about found footage treated as found-footage stories, and documentaries about sci-fi horror treated as sci-fi horror.
- The “International” filter meant “not tagged American blockbuster,” which is not a valid country-of-origin test.

The application now ignores those exposed legacy assignments and generates a canonical classification from explicit synopsis evidence plus a deliberately small exact-title editorial map for widely established mainstream films. An override requires the normalized title and year to match, does not apply to live TMDB results, and is omitted when the fact is not high confidence. The raw source records remain intact for provenance; cards, search, rows, modals, and filters use the canonical layer.

## Canonical microtag coverage

| Microtag | Titles |
| --- | ---: |
| `#Survival` | 142 |
| `#Vampires` | 95 |
| `#ZombieOutbreak` | 76 |
| `#MartialArts` | 71 |
| `#SerialKiller` | 66 |
| `#Monsters` | 53 |
| `#Psychological` | 46 |
| `#HauntedHouse` | 26 |
| `#SpaceExploration` | 22 |
| `#Slasher` | 22 |
| `#PostApocalyptic` | 18 |
| `#FoundFootage` | 17 |
| `#AlienInvasion` | 11 |
| `#SciFiHorror` | 10 |
| `#Cyberpunk` | 5 |
| `#MindBending` | 4 |
| `#DarkComedy` | 3 |
| `#BodyHorror` | 1 |

591 movies have at least one supported microtag. The remaining movies intentionally have no microtag instead of receiving a speculative assignment.

`#CultClassic` was removed because cult status is a reception/history claim that cannot be established from a plot synopsis. Unsupported promotional or origin tags such as `#MustWatch`, `#OscarWinner`, `#AmericanBlockbuster`, `#KoreanCinema`, `#Action`, and `#HighTension` are not part of the canonical microtag set.

## Canonical genre/category coverage

| Category | Titles |
| --- | ---: |
| Horror | 346 |
| Thriller | 253 |
| Sci-Fi | 238 |
| Action | 152 |
| Documentary | 96 |
| Drama | 54 |
| Comedy | 44 |
| Animation | 23 |
| Other | 790 |
| All | 1,799 |

“Other” is deliberate: the supplied synopsis does not contain enough evidence for one of the focused categories and the title is not in the limited editorial correction set. It means “unclassified from available data,” not “this movie has no genre.” This avoids repeating the previous behavior of assigning Thriller/Sci-Fi/Horror to almost every title. Authoritative source genres are preserved for optional live TMDB results.

## Era coverage

The unverifiable origin categories were replaced with objective, non-overlapping eras:

| Era | Rule | Titles |
| --- | --- | ---: |
| 2020s | 2020–2029 | 734 |
| 2010s | 2010–2019 | 682 |
| 2000s | 2000–2009 | 358 |
| Before 2000 | Year ≤ 1999 | 25 |
| All Years | Any year | 1,799 |

## Provider filter coverage

| Provider | Titles |
| --- | ---: |
| Prime Video | 468 |
| Apple TV | 423 |
| Shudder | 420 |
| Paramount+ | 417 |
| Hulu | 416 |
| Netflix | 398 |
| Peacock | 391 |
| Max | 382 |
| Tubi | 14 |

Provider filtering is functionally correct and deduplicates repeated provider records. These counts describe the bundled data, not verified live availability.

## Corrections implemented

- Added `src/services/catalogClassification.ts` as the single canonical taxonomy and filter engine.
- Tag rules use synopsis evidence rather than title-only keyword matching.
- Added 39 exact normalized title/year corrections for widely established films and clear metadata exceptions, including `John Wick`, `Interstellar`, `Inception`, `Godzilla x Kong: The New Empire`, `Shaun of the Dead`, `Kong: Skull Island`, `The Dark Knight`, `Alien Outpost`, `Monster` (2008), `Robot Planet`, the bundled `Paranormal Activity` films, and nine unmistakable 2025–2026 mainstream franchise titles.
- Exact editorial keys do not affect similarly named titles, different release years, or live TMDB results.
- Added exclusions for genre-history, documentary, festival, and making-of false positives.
- Split documentary detection into strong nonfiction evidence and narrow fictional filmmaking contexts. A confirmed synopsis-inferred Documentary classification is exclusive, preventing retrospectives about horror or sci-fi from entering fiction shelves.
- Added fictional-documentary regressions for documentary crews, characters making documentaries, documentary projects/styles, documentarians inside fiction, and behind-the-scenes footage used as a plot device.
- Added title/context guards so found-footage festival programs are not treated as found-footage narratives.
- Tightened `#Monsters` to require an actual threatening monster/creature context and exclude venue names, metaphorical labels, documentary subjects, benign helpers, friendly creatures, sympathetic captives, and non-threatening monster students.
- Restored high-confidence natural threat language for threatening, hunting, blood-thirsty, killer, unstoppable, undead, demonic, and monstrous creatures; monsters out for revenge or becoming deadly dangers; creatures tied to killings; unleashed/escaped monsters; and creatures characters must fight, stop, catch, or escape.
- Removed generic “end of the world” as `#PostApocalyptic` evidence; the rule now keeps explicit post-apocalyptic, collapsed-world, and “during the end of the world” settings without tagging history, prophecy, or a prevented catastrophe.
- Documentary classifications cannot inherit `#PostApocalyptic` or `#ZombieOutbreak` from a film discussed inside the nonfiction synopsis.
- Added exact conservative corrections for explanatory nonfiction `Robot Planet` and the unclassified `android music videos (volume 1` compilation.
- Removed “terrified” and generic “terror” as standalone Horror signals; this fixes `The Dark Knight` being misread as Horror.
- Removed “space station” as standalone `#SpaceExploration` evidence; a setting alone is not exploration.
- Removed subjective or unverifiable public tags.
- Added explicit microtag definitions and UI tooltips.
- Replaced origin filters with objective era filters.
- Added Drama, Documentary, Animation, and Other to the visible genre coverage.
- Added Documentary and Animation homepage shelves so every focused genre has a discovery row.
- Reworded homepage shelves to remove unsupported “award-winning,” “masterpiece,” and “blockbuster” claims.
- Added a visible explanation when the Other category is selected.
- Added live result counts to every era, genre, microtag, and provider option.
- Hide any filter option with zero results.
- Canonicalized the catalog before search so legacy tags cannot influence search relevance.
- Removed fabricated TMDB fallback tags and provider availability.

## Verification

- `npm test`: passed.
- All 1,799 records produce at least one canonical category.
- Every assigned tag is in the canonical taxonomy and passes its evidence rule.
- All 18 microtag filters return at least one result and every result contains the selected tag.
- All 10 category filters, 5 era filters, and 9 provider filters return consistent counts.
- Known false-positive regression tests pass for `Scream 7`, `Money Monster`, `The Found Footage Phenomenon`, and `Time Warp Vol. 2: Horror and Sci-Fi`.
- Known positive regression tests pass for `Scream 7`/Slasher, `28 Days Later`/Zombie Outbreak, and `Inception`/Mind-bending.
- Curated-classification regressions pass for `John Wick`, `Godzilla x Kong`, `Shaun of the Dead`, `The Dark Knight`, `Alien: Romulus`, and the bundled `Paranormal Activity` entries.
- Fictional-documentary regressions pass for `Alien Outpost`, `A Haunted House`, `Paranormal Demons`, `Found Footage 3D`, `Monster` (2008), `Vampire Diary`, `The Haunted House Hotel`, `15 Murders`, `Found Footage` (2018), and `My Dinner With An Android`.
- Exclusive-documentary regressions pass for `Alien Contact: Government Coverup`, `The Alien Saga`, `Time Warp Vol. 2`, `Sex Robot Madness`, and `Hollywood in the Atomic Age`.
- Monster-context regressions reject the club named The Monster and “birth of a monster,” while retaining `Godzilla x Kong`, `Kong: Skull Island`, and `Monster` (2008).
- Fifteen additional natural-language monster-threat fixtures are positive; nine metaphorical, benign, captive, helper, harmless, or non-threatening monster controls remain negative.
- Apocalypse regressions reject the end of World War II, a doomsday belief, and an apocalypse plot being prevented while retaining an explicit during-the-end-of-the-world story.
- Found-footage festival regressions reject both bundled festival programs while retaining franchise narratives.
- `Albert Pyun: King of Cult Movies` remains exclusively Documentary without inheriting a discussed film’s setting; `Robot Planet` remains exclusively Documentary; and the android music-video compilation remains Other without sci-fi-horror or false-rumor serial-killer tags.
- True narrative controls remain positive for `13 Minutes of Horror: Sci-Fi Horror` and `I Hate Found Footage`.
- Exact category regressions cover `Spider-Man 4`, `The Mandalorian & Grogu`, `Avatar: Fire and Ash`, `Superman`, `The Fantastic Four: First Steps`, `Mickey 17`, `Captain America: Brave New World`, `Thunderbolts*`, and `M3GAN 2.0`. `Sinners` and the uncertain `Parasite 2`/`Parasite 3` entries deliberately remain Other.
- Editorial corrections are verified to require an exact normalized title and year.
- A four-way 2010s + Horror + `#ZombieOutbreak` + Netflix test verifies AND behavior across filter groups.
- A Netflix + Max test verifies OR behavior within the provider group without duplicate movies.

## Remaining editorial limitation

These corrections guarantee that exposed microtags are supported either by the supplied synopsis or by a reviewed exact-title editorial correction, and that filters implement their definitions consistently. They do not prove the full external filmography of every title. Exact official genres, production countries, awards, cult status, and regional streaming availability require an authoritative licensed metadata source and entity matching. Until that exists, the application intentionally prefers missing/Other classifications over unsupported claims.
