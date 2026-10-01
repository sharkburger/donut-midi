# Donut MIDI

A gaze-controlled, edible musical interface using Pupil Labs Neon, p5.js and Web Audio.

**Public website:** https://sharkburger.github.io/donut-midi/

**Mac app download:** https://sharkburger.github.io/donut-midi/downloads/Donut-MIDI-Neon.dmg

**Windows / source ZIP:** https://sharkburger.github.io/donut-midi/downloads/donut-midi-connector.zip

## Play without glasses

Click **Enable sound & play**, then hold the pointer over a donut. Eight natural notes span C4–C5. Look away and back to retrigger a note. Choose synth piano, plucked guitar or synthesizer, or load a personal audio clip for each donut. Files stay in the browser and must be loaded again after refreshing.

Use **Focus loop** for continuous accompaniment. Self-reports persist until changed. Creative curve-driven accompaniment requires eight seconds of stability. These choices are musical mappings, not automatic mental-state recognition.

## Connect Neon

On macOS, download the DMG, drag **Donut MIDI Neon.app** to Applications, then open it. Terminal starts automatically. Later launches only require opening the app. The first launch may require **System Settings → Privacy & Security → Open Anyway** and permission to control Terminal. Python 3.11–3.14 is required; first launch installs dependencies into a private environment. The phone and computer must be on the same Wi-Fi, with Companion open.

The connector opens the public site with a fresh pairing code. Click **Connect local Neon**, allow local-network access if requested, then enable sound. Open the marked screen mat and keep all four AprilTags visible. If the browser blocks public-to-local access, use the **Local fallback** link printed by the connector. It serves the same English interface on your computer.

Read the [online setup guide](https://sharkburger.github.io/donut-midi/connector-guide.html) or [connector README](connector/README.md). The Mac app is an ad-hoc-sealed launcher, not Developer ID-signed or notarized, and does not embed Python. It installs files and reusable dependencies under `~/Library/Application Support/Donut MIDI`. The source ZIP remains available. The Windows launcher is included but has not been validated on Windows hardware.

To specify a phone or alternative port from the extracted folder:

```sh
python3 connector/launch.py --ip 10.0.0.155 --port 8766
```

Replace the IP with your Companion address. Close the connector with Ctrl+C. Restarting generates a new pairing code.

The previous local WebSocket route remains available: run `python3 serve.py`, start `bridge/neon_bridge.py` in an environment with `bridge/requirements.txt`, and connect to `ws://127.0.0.1:8765` from the local page.

## Signals, privacy and research

The connector maps matched scene/gaze samples to a planar mat at roughly 30 Hz. It forwards gaze position, worn/surface validity, pupil diameter when available, and native Neon eye geometry. Pupil baseline calibration is required for pupil modulation, but not for gaze notes. The 3D spheres visualize native Neon centers and optical axes; they are not pye3d fits or eye video.

The connector binds only to loopback, checks website origins, requires a per-launch bearer code and retains only the latest sample. It does not save or upload scene video, gaze histories or audio. Optional website recording requires consent and an explicit start. Refreshing clears in-memory data; export sessions to keep them.

The four sound regions are **relaxed, focused, stressed and confused**. Their ordering is artistic, not a psychological intensity scale. Eye patterns alone do not validate these states. The research panel collects a 45-second baseline and six short melody blocks with independent self-reports; the cognitive classifier is still **untrained**. Historical scientific notes are in [research/SCIENTIFIC-MODE.md](research/SCIENTIFIC-MODE.md).

## Development and publishing

GitHub Pages publishes `aoi-cognitive-voices` via `.github/workflows/pages.yml`. The workflow checks JavaScript, stages an explicit asset list, and generates a clean connector ZIP; it never includes environments, logs or participant recordings.

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build_connector.py
```

Python bridge tests require bridge dependencies. Connector HTTP tests use only the Python standard library. Four corner markers use AprilTag 36h11, IDs 0–3. Eight AOIs are defined in `core.js`; regenerate mats with `bridge/generate_mat.py` after changing the layout.

Browser audio needs a user gesture. Web MIDI availability and external DAW configuration vary. Online-to-local permissions vary across browsers; use the bundled local fallback when necessary.


## Optional Game Mode: phrase play

Open **Performance Console → Game Mode → Start gaze play**. One donut launches a complete musical phrase. Donuts represent parts of a song, not fixed pitches. The default is 60 BPM, 2 seconds to find each target, then 600 ms of gaze to confirm; preparation and dwell are adjustable independently of music tempo. The target waits without a deadline, penalty or skipped notes. A phrase continues through brief tracking loss, blinking or looking away. At the next phrase, tracking must be valid again. No connection auto-resume is attempted after an actual connector disconnect; re-pair when required.

Gold ring: find and hold. Green ring: phrase playback progress. Dashed ring: next target. The music inside each phrase is scheduled on the Web Audio clock with a small lookahead, independent of gaze and animation frame timing. There is no constant metronome or auto-generated bass. Between phrases, take as long as needed. **Listen to full song** is explicitly an automatic preview, not an eye-controlled performance. Pause, tab hiding, leaving the console or muting audio freezes playback; Resume continues from the saved point (an unfinished sustained note is re-attacked). Tracking loss alone never demands a manual Resume.

Built-ins: **Twinkle Twinkle** (6 phrases / 42 notes), **Mary Had a Little Lamb** (4 phrases / 26 notes), **Frère Jacques** (8 phrases / 32 notes). The route moves through neighboring donuts instead of rapidly jumping between pitches. The eye view, evidence chart and decorative gaze art remain visible. Return to free play restores previous audio/phase settings; free-play pitches and samples are unchanged. The game invalidates the previous pupil reference because the task and lighting have changed.

**Local uploads:**
- `.mid` / `.midi`: select a monophonic track/channel from constant-tempo, PPQN format 0/1 MIDI. Grouping uses roughly 8 beats per block, moving boundaries to note onsets rather than cutting notes. This is a beat-based heuristic, not automatic musical phrase recognition. More than eight distinct pitches are supported because targets are phrase blocks. Chords and changing tempos still require a simpler melody track.
- `.txt`: `1–8` = C4 D4 E4 F4 G4 A4 B4 C5, `0` = rest, `5:2` = two beats. Put `|` at your phrase boundaries. Example: `1 1 5 5 6 6 5:2 | 4 4 3 3 2 2 1:2`. Without bars, roughly eight-beat grouping is used. **Score template** downloads an editable example.
- `.json`: `{ "title": "My melody", "bpm": 60, "notes": [{"note": 60, "beats": 1}, {"note": null, "beats": 1}] }`; `note` is a MIDI integer or null for a rest. Grouped into eight-beat blocks.

Uploads stay in browser memory and disappear on reload. Maximum 1,000 notes / 2 MB per file. No MP3/WAV transcription. Musical BPM defaults to 60 for gaze play even if the imported score has a faster original tempo. Completion counts describe musical interaction, not cognitive diagnosis.

Design references: [Rhythm Paradise Megamix manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_3ds_2/rhythmparadisemegamix/ElectronicManual_Nintendo3DS_RhythmParadiseMegamix_EN.pdf) includes practice and visual rhythm help; [Rhythm Doctor](https://rhythmdr.com/) demonstrates one-button rhythm play; [Microsoft eye-gaze and dwell guidance](https://learn.microsoft.com/en-us/windows/mixed-reality/design/gaze-and-dwell-eyes) discusses intentional dwell, feedback and the risks of too-short activation. Our phrase grouping and wait-for-gaze behavior are adaptations for this installation, not claims about those games' segmentation algorithms or validated optimal eye-tracking timings.
