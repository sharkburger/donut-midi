# Donut MIDI — Eyes & Sound Regions

An experimental gaze-controlled musical interface with eight donut-shaped note regions, built with Pupil Labs Neon, p5.js and Web Audio. The current instrument and its project documentation are in English.

## Try it or download the beta

- **Mac TestFlight beta:** [Join Donut MIDI Neon](https://testflight.apple.com/join/g24me2GT) — Apple Silicon Mac, macOS 26 or later. Install Apple’s TestFlight app first. Live gaze requires Pupil Labs Neon; mouse simulation works without eye-tracking hardware.
- **Play online:** [Donut MIDI](https://sharkburger.github.io/donut-midi/)
- **Download the desktop beta:** [GitHub Releases](https://github.com/sharkburger/donut-midi/releases/tag/v1.4.2-beta.1)
- **Current web and desktop source:** [`aoi-cognitive-voices`](https://github.com/sharkburger/donut-midi/tree/aoi-cognitive-voices)
- **Current setup and feature guide:** [Project documentation](https://github.com/sharkburger/donut-midi/blob/aoi-cognitive-voices/README.md)
- **iOS touch and replay beta project:** [iOS preparation](https://github.com/sharkburger/donut-midi/tree/ios-touch-testflight/ios)

The `main` branch retains the early prototype code. Use the current source branch linked above for the eight-key version served on the public website. The older three-donut prototype is not the desktop beta distributed in the release linked here.

## What the current version includes

- Eight note regions, mouse simulation, live Neon input and session replay.
- Synthesized piano, plucked guitar and synthesizer sounds, with user-provided audio clips.
- Accompaniment, gaze visuals, the Performance Console and Workshop Editor.
- A local Neon connector and opt-in session recording and research tools. See the current guide for their requirements and data-storage behavior.

For a quick experience without glasses, open the website, click **Enable sound & play**, and hold the pointer over a donut region. Simulated pupils and generated demonstrations are synthetic input, not human measurements. State-related sound mappings are creative associations, not validated cognitive diagnosis.

## Mac TestFlight beta

[Join the Mac beta on TestFlight](https://testflight.apple.com/join/g24me2GT). This is the native Mac edition with a bundled runtime; no separate Python installation is needed. This invitation is for macOS, not iPhone or iPad. Availability depends on an approved, unexpired build in TestFlight.

## Legacy Mac DMG installation

Download **Donut-MIDI-Neon.dmg** from the release page, drag **Donut MIDI Neon.app** to Applications, and open it. This is a launcher that starts Terminal, prepares the local connector and opens the instrument in a browser.

**Python 3.11–3.14 and internet access on first launch are required.** The launcher reuses its isolated environment on later launches. The beta is ad-hoc signed and has not been Apple-notarized. Installation details and verification limits are documented on the release page. The Windows/source ZIP contains scripts and source, not a Windows installer.

## iOS project status

The initial iOS project supports touch performance and JSON replay. It has passed unsigned simulator compilation and browser checks of touch input, JSON import and the native export bridge. Physical iPhone/iPad verification is still pending.

**It has not been uploaded to TestFlight, and no invitation link is available yet.** Apple Developer Program activation, signing, device verification and Apple's external beta review are still required. The Mac edition has separately been submitted for App Store review; this does not mean it is publicly available on the App Store.

