# p5.neon community library roadmap

This branch turns the working Donut MIDI app into a set of reusable p5.js modules. The app remains the behavioral reference: an extracted helper must preserve its tested behavior and must not make up missing eye data or a cognitive diagnosis.

## Library layers

1. **Tracker core** — connector transport, normalized gaze, pupil and eye-pose measurements, stale/unworn handling, mouse simulation, AOIs, dwell and lifecycle cleanup.
2. **Visual effects** — trails, particles, eye projection, pupil/signal views, pixel mirror and marker-safe canvas helpers.
3. **Interaction and sound** — configurable AOI actions, synthesized tones and soundscapes, optional MIDI output, phrase timing and gaze-game scheduling.
4. **Physical layouts** — target geometry, marker-safe mat export and helpers that keep the sketch AOIs aligned with printed objects.
5. **Research extension** — explicit consent, self-report and session event export through the local connector. This stays optional and local; it is not part of the tracker core or an implicit classifier.
6. **Learning examples** — small p5 sketches that compose the layers, so users can copy a single effect or replace assets without forking the Donut MIDI app.

## Current branch milestone

- The tracker works with plain JavaScript and exposes `createNeonTracker()` as a p5.js sketch method.
- p5.js 1.x and 2.x registration/lifecycle paths are covered by unit tests.
- `createNeonControls()` provides a transient pairing form; credentials are not written into sketch source or browser storage.
- The connector permits only the Donut MIDI site, local fallback and exact official p5 editor/preview origins.
- Existing marker-safe examples and visual helpers remain available.\n- Phrase scoring/scheduling, accompaniment, state soundscapes, MIDI output helpers, and pupil evidence are now canonical modules shared by the app and starter package.

## Remaining migration

- Wrap the shared audio, soundscape, MIDI, phrase/game, and pupil-evidence modules in a stable p5-facing namespace; migrate the app-specific game and performance UI as an optional example layer.
- Refactor the Donut MIDI app to consume the same package modules where practical, preventing behavior from drifting between app and community library.
- Package a single browser bundle and a source/ES-module entry, document supported p5 versions, and provide independently runnable examples.
- After API and origin tests pass, publish a tagged release and submit the library listing to the p5.js website repository. A GitHub branch alone does not add a library to the official directory.

Research storage, pairing secrets, and video remain outside portable sketches. A missing gaze sample is always missing; mouse simulation is explicitly synthetic.
