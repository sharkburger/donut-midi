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


## Optional Game Mode

Open **Performance Console → Game Mode**. Free play remains the default; **Return to free play** restores the previous audio/phase settings and keeps note mappings and uploaded audio clips. The eye view and evidence chart stay visible. Game visuals change the task and lighting, so entering the game invalidates an existing eye-reference capture.

Choose Twinkle Twinkle, Mary Had a Little Lamb, or Frère Jacques. Press **Start / restart** for a four-beat count-in. Hold gaze on the gold target for 120 ms; the ring indicates remaining note time, green means hit, and the dashed ring previews the next target. Each score note can sound once, including repeated pitches without looking away. Missed notes stay silent. Melody onsets snap forward to a quarter-beat subdivision within the note window. Optional quiet beat/tonic accompaniment supports the melody; this is a guided rhythm prototype, not a full arrangement engine. Pause freezes score time. Losing live gaze, hiding the tab or leaving the console pauses the game until Resume. Test without hardware using **Connect → Mouse simulation**.

**Local uploads:**
- `.mid` / `.midi`: standard format 0/1, PPQN, constant tempo. Select a single monophonic track/channel. Chords, more than eight distinct pitches, missing note-offs and tempo changes are rejected with an explanation; percussion is ignored. Game tempo is adjustable (20–140 BPM) and notes shorter than 300 ms require a slower tempo. A loaded score starts at up to 100 BPM for gaze play.
- `.txt`: whitespace-separated numbered notes, `1–8` = C4 D4 E4 F4 G4 A4 B4 C5; `0` = rest; `5:2` = two beats; `|` separates phrases. Example: `1 1 5 5 6 6 5:2 | 0 4 4 3 3 2 2 1:2`.
- `.json`: use **Download score template**, then edit `title`, `bpm` and `notes` entries (`note`: MIDI integer or `null` for rest; `beats`: positive duration).

The eight C-major pitches retain their familiar donut positions. Other pitch sets map in ascending order to up to eight donuts; labels show the game pitches, without changing free-play mappings. Uploads remain in browser memory and are lost on reload. Up to 1,000 notes and 2 MB per file; MP3/WAV transcription is not included. Game hit/miss counts are musical task outcomes, not cognitive diagnoses.
