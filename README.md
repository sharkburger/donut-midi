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

Open **Performance Console → Game Mode** and choose a song. **Listen to full song** previews its complete arrangement automatically; **Start gaze play** lets eyes or the mouse launch musical blocks. The built-in arrangements use melody, chord pads, bass, kick, snare and hi-hat, with three synthesized styles: **Twinkle · starlight groove** (96 BPM, 13 blocks / 42 melody notes), **Mary · sunshine pop** (100 BPM, 9 blocks / 26 notes), and **Frère Jacques · night drive** (104 BPM, 9 blocks / 32 notes). These are original synthesized arrangements of traditional melodies, not commercial recordings. Full arrangement can be switched off to hear just the melody; external MIDI output carries the melody only.

The built-ins have hand-authored 2- and 4-beat motif boundaries (about 1.15–2.5 seconds at their default tempos), with opening, answering and closing segments. Notes are never cut halfway. Hover over a segment label to see its boundary description. This is authored segmentation, not lyric or semantic analysis. Donuts represent blocks, not fixed pitches, and move through neighboring targets. Music tempo is adjustable from 40–140 BPM. Initial lead-in defaults to 350 ms and confirmation to 400 ms; longer holds are available for gaze comfort. These defaults are interaction choices, not validated optimal eye-tracking timings.

**Route:** Random (default in the UI) generates a fresh target route on each Start while keeping the music in order. It avoids consecutive repeats, favors less-visited donuts, and limits each move to two grid steps so targets do not repeatedly jump across the mat. Once generated, NEXT stays fixed throughout the run, including pauses. Practice keeps the neighboring-donut sequence. Both modes support early READY queueing and wait when the next block is not confirmed.

**Gold = hold to start. Soft yellow halo = playing (with a gold progress ring). NEXT = the next target. READY = confirmed and queued.** While a block plays, move to NEXT and hold until READY. It joins exactly at the musical boundary, even if the pointer stays stationary there. There is no leave/re-enter requirement. A partly completed hold carries across the boundary; if nothing is confirmed, playback waits without a penalty or skipped block. Confirmation queues only one block, and stays confirmed through a blink or looking away. Mouse positions are recalculated against the current mat layout so resizing does not require a fresh movement.

The melody and accompaniment use the Web Audio clock and a short lookahead, including the next queued block. Pause, tab hiding, leaving the console or muting audio freezes playback; Resume continues from the saved point (an unfinished sustained note is re-attacked). Tracking loss alone does not require manual Resume; a truly disconnected connector still needs re-pairing. The eye view, evidence chart, decorative gaze art, free-play pitches and samples remain unchanged. Leaving Game Mode restores prior audio/phase settings. Game entry invalidates the pupil reference because the task and lighting changed.

**Local uploads:**
- `.mid` / `.midi`: select a monophonic track/channel from constant-tempo, PPQN format 0/1 MIDI. Grouping uses roughly 8 beats per block, moving boundaries to note onsets rather than cutting notes. This is a beat-based heuristic, not automatic musical phrase recognition. More than eight distinct pitches are supported because targets are phrase blocks. Chords and changing tempos still require a simpler melody track.
- `.txt`: `1–8` = C4 D4 E4 F4 G4 A4 B4 C5, `0` = rest, `5:2` = two beats. Put `|` at your phrase boundaries. Example: `1 1 5 5 6 6 5:2 | 4 4 3 3 2 2 1:2`. Without bars, roughly eight-beat grouping is used. **Score template** downloads an editable example.
- `.json`: `{ "title": "My melody", "bpm": 60, "notes": [{"note": 60, "beats": 1}, {"note": null, "beats": 1}] }`; `note` is a MIDI integer or null for a rest. Grouped into eight-beat blocks.

Uploads stay in browser memory and disappear on reload. Maximum 1,000 notes / 2 MB per file. No MP3/WAV transcription. Imported tempo is used, clamped to the 40–140 BPM game range. Uploaded scores remain melody-only; no harmony is guessed for them. Completion counts describe musical interaction, not cognitive diagnosis.

Design references: [Rhythm Paradise Megamix manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_3ds_2/rhythmparadisemegamix/ElectronicManual_Nintendo3DS_RhythmParadiseMegamix_EN.pdf) includes practice and visual rhythm help; [Rhythm Doctor](https://rhythmdr.com/) demonstrates one-button rhythm play; [Microsoft eye-gaze and dwell guidance](https://learn.microsoft.com/en-us/windows/mixed-reality/design/gaze-and-dwell-eyes) discusses intentional dwell, feedback and the risks of too-short activation. Our phrase grouping and wait-for-gaze behavior are adaptations for this installation, not claims about those games' segmentation algorithms or validated optimal eye-tracking timings.

## Participant tests and local database (connector 1.3)

Use **Participant test** in the control rail, or **Research → Start participant test**. Open the updated connector, use its pairing link, choose live Neon or mouse simulation, enter a printable participant ID (up to 128 characters), consent, and begin. A fresh UUID identifies every test, so reused participant IDs do not overwrite earlier tests. Start Gaze Play works as before. Finishing a song opens a whole-test self-report; **End test & self-report** can end early. The six 1–5 ratings (attention, effort, confusion, stuck, relaxation, stress) accept “Unsure / mixed”. Free-play note events and guided-research block/report events can also be collected within a participant test; phrase-level performance summaries are for Game Mode.

The connector stores SQLite at `~/Library/Application Support/Donut MIDI/data/study.sqlite3` on macOS (other systems: `~/.donut-midi/data/study.sqlite3`). It survives browser closure and app updates; no videos or cloud uploads are made. `--data-dir PATH` overrides the directory. Keep the connector running until the page confirms **Saved to this computer**. Samples are submitted in authenticated, retry-safe batches every two seconds. A failed write shows **NOT SAVED** and retries; use **Retry save with current pairing** after changing credentials. An abrupt browser close can lose the unacknowledged tail and leaves a session marked in_progress. It does not resume a prior test automatically. Unfinished tests remain exportable. Browser buffering stops after 3,000 unacknowledged samples during an outage; collection has a 30-minute session limit.

Research provides a recent-tests list (latest 100) and individual or all-session exports. CSV folders and ZIPs are written by the connector under the database directory’s `exports` folder; the page shows their exact paths, with an optional browser download. Each package contains `sessions.csv`, `blocks.csv`, `samples.csv`, `events.csv`, and a data dictionary README. IDs and spreadsheet-like text are escaped against CSV formula execution. All export endpoints require the local pairing code. This is a single-computer researcher-operated collection tool, not a multi-user cloud account system.

Samples are browser observations at approximately **10 Hz**, not raw Neon data. CSVs distinguish synthetic mouse tests from live measurements; synthetic/stale/invalid pupils are excluded from physical pupil summaries. Reference changes are included only while Signals has a valid reference; Game Mode invalidates the previous reference, so game samples normally provide raw pupil diameter, mean/range/SD, and quality coverage instead. Target observed time is approximate occupancy, not fixation. Completion and early-ready counts exclude automatic previews. Acquisition wall time may include pauses. There is no invented accuracy or cognitive-state score. Self-reports cover the whole test, and guided-task reports appear separately in events; neither is assigned to every sample as a ground-truth label.

**Update required:** replace the old Mac app with the new 1.3 download, close the old connector Terminal process, and reopen the new app. This installs the new database endpoints. Merely refreshing the webpage cannot add them to an old connector. Existing gaze pairing protocol and free-play behavior are retained.
