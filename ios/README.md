# Donut MIDI iOS beta — TestFlight preparation

Based on the deployed **Eyes & Sound Regions · Eight Keys** version at commit `5ea221b8dd8916528a4215230dcc4385abf33faf`. The existing website and desktop release are unchanged.

This target is an **offline touch instrument and JSON replay app** for iPhone/iPad (iOS 16+). It shares the instrument logic with the web app and adds native document import, native export through the system share sheet, and audio shutdown when the app becomes inactive. It does not use a camera, connect to Neon, or measure pupils. Workshop Editor, desktop MIDI output and the connector-backed participant database are unavailable in this initial mobile beta. The pupil slider is synthetic input.

## Build

Install full Xcode and XcodeGen, then run from the repository root:

```sh
python3 scripts/prepare_ios.py
xcodegen generate --spec ios/project.yml
open ios/DonutMIDI.xcodeproj
```

`prepare_ios.py` copies only offline web assets and generates the app icon. Neither generated web resources nor the generated Xcode project are committed. Mobile input, native JSON export, and import hooks are applied only to the staged iOS resources; the deployed web source remains unchanged. The **iOS beta build check** GitHub Action builds the simulator target without signing. A simulator artifact cannot be installed through TestFlight.

Choose your Apple team under Signing & Capabilities. The provisional bundle ID is `io.github.sharkburger.donutmidi`; confirm it is available under your team. The marketing version is 0.4.0 and build number 1. Increment the build number for subsequent uploads.

## Required before TestFlight invitations

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/) and finish the account agreements. Standard membership is paid; the account holder must complete enrollment personally.
2. Register the bundle ID and create an iOS app record in App Store Connect. Add a support contact and review contact supplied by the project owner.
3. On an actual iPhone/iPad, verify audio, finger-down dwell and finger-up reset, synthetic demo replay, Files JSON import, record consent, stop/export to Files, background audio stop, and re-import. No real-device verification has been performed for this beta yet.
4. In Xcode select a generic iOS device, Product → Archive → Distribute App → App Store Connect → Upload. This uploads a build; it does not make the app publicly available on the App Store.
5. In App Store Connect → TestFlight, add the description and “What to Test” text below. Complete export compliance and the beta review contact details accurately.
6. Create an external test group, add the build and submit for **TestFlight beta review**. The first external build needs Apple's approval. After approval, enable the group's public invitation link or add explicitly authorized tester emails. Do not submit an App Store release.

There is currently no paid developer account or signing identity configured for this project. No TestFlight upload, Apple beta approval, public invitation link, or tester invitation has been completed.

## Suggested beta description

Donut MIDI is an experimental musical instrument. Hold a finger over a donut region to play a note, change the synthetic pupil slider to explore timbre, and replay JSON session recordings with new sound mappings. This beta works offline and includes a generated demonstration. It does not track eyes or infer emotions.

## What to Test

- Turn on sound and hold each donut for about half a second. Lift your finger, then touch it again to retrigger.
- Change note assignments, dwell time, brightness/vibrato, and volume.
- Play the synthetic demo and pause/restart it.
- With consent enabled, record simulated input, stop, export to Files, then import the JSON recording and replay it.
- Switch apps and confirm the sound stops.
- Report device model, OS version, steps, and screenshots using TestFlight feedback. Avoid including personal session data unless you intend to share it.

## Privacy

No analytics, advertising, account login, camera, microphone, or network tracking is included. Session data stays in memory until the user exports it. Exported files are stored or shared only through the user's selected destination. Closing the app can lose unexported records. Apple may collect TestFlight diagnostics/feedback separately under its own terms.

Reference: [Apple external testing instructions](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/).
