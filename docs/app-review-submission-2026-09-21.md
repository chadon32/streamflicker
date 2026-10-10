# StreamFlicker publication check and App Review resubmission

Checked and submitted September 21, 2026, America/Phoenix.

## Verified publication state

| System | Verified state |
| --- | --- |
| GitHub `chadon32/streamflicker` | Remote HEAD and `main`: `bb93930ff8bf3bde2bb734a445fc4dfa05b658a5`, August 3, 2026, “Use StreamFlicker logo and configure affiliate attribution.” GitHub reports a successful Vercel status for that commit. |
| Live website | Vercel production deployment `dpl_8ciqBJYiijWkP3HyboVAAWC99s3n`, created September 20 at 7:22 PM Arizona time, Ready. Aliases include `www.streamflicker.com`, `streamflicker.com`, and `streamflicker.vercel.app`. No website deployment was performed in this pass. |
| Latest EAS iOS build | Version `1.0`, build `11`; EAS ID `3f1bba0d-825e-483e-a98a-fe5873e50f7f`, FINISHED September 3. Bundle ID `com.streamflicker.app`. |
| App Store Connect | Build 11 was already uploaded and processed on September 3. Replaced the review selection of build 9 with build 11 and resubmitted. Confirmed **Waiting for Review** for `1.0 (11)` at September 21, 6:21 PM Arizona time. |

App Store Connect app ID: `6797452211`.

[Review submission](https://appstoreconnect.apple.com/apps/6797452211/distribution/reviewsubmissions/details/8fa11f49-fb07-4e97-83c5-4d780c2f7ac3)

## Changes made in App Store Connect

- Changed the version's selected build from rejected `1.0 (9)` to the newest processed `1.0 (11)`. The uploaded build 9 itself was not deleted.
- Replaced inaccurate build-9 review notes with build-11 instructions for the native UIKit Movie Night screen: occasion/runtime/genre selection, local Watchlist toggles, saved summary, and native share sheet. Removed claims about native streaming-service filtering and Pick again that did not describe this implementation.
- Filled the empty reviewer phone and email fields using the contact details previously supplied by the owner for Apple review.
- Saved the form, updated the review item, and clicked Resubmit to App Review. Verified the final submission and item both say Waiting for Review.
- Preserved screenshots, privacy declarations, sign-in-required setting, pricing, territories, and the existing automatic-release-after-approval setting.

## Evidence and limitations

- Apple's previous rejection was guideline 4.2.2, Minimum Functionality, for build 9, reviewed on September 3 on an iPad Air 11-inch (M3).
- EAS build 11's Xcode log includes compilation of `NativeMovieNightPlugin.swift`, `SceneDelegate.swift`, and `ARCHIVE SUCCEEDED`.
- Inspected the existing signed build-11 IPA. It contains the native plugin symbol, the native planner introductory text, its saved-plan storage key, and the JavaScript native bridge. This is stronger provenance evidence than the Git SHA alone because the repository has uncommitted/untracked native source files.
- The local repository's native registration, planner source, and release configuration were reviewed. No new Xcode/device runtime test or fresh native build was performed in this pass.
- Build 11 predates the September 4 website/performance pass and later local edits. Those newer changes are not being represented as included in this submission. No Git commit or push was performed.
- Apple has accepted the submission into its queue, not approved the app. Whether the native experience satisfies 4.2.2 remains Apple's review decision.
- Existing local native planner concerns were noted but not changed under this submission request: no-match filters fall back to the full small native catalog, and the result-count string appears to contain literal interpolation placeholders. No claim of full native QA or bug-free behavior is made.
- Only browser-extension controls were used for Apple. No desktop helper, native Windows control, game clients, or unrelated browser tabs were operated.
