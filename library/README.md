# p5.neon 0.3.0 (community draft)

A small MIT-licensed JavaScript library for eye-driven p5.js sketches. This is an independent community project, not an official Pupil Labs or p5.js product.

[Run the examples](https://sharkburger.github.io/donut-midi/library/) · [Full Donut MIDI](https://sharkburger.github.io/donut-midi/?v=console-2)

## What works in v0.3 draft

- Pair with the existing Donut MIDI Neon connector (no protocol change).
- Read normalized surface gaze and optional pupil diameter.
- Define rectangular AOIs and receive enter, exit and dwell events.
- Simulate gaze with the mouse, including stationary dwell.
- Reuse the blank four-marker mat with `NeonMat`; the default p5 Web Editor starter has no donuts or AOIs.
- Define AOIs with `neon.aoi()` and subscribe by ID with `neon.onAOI()`.
- Draw an optional normalized gaze cursor with `neon.drawGaze()`.
- Run Gaze painting and Dwell instrument examples with p5.js 1.11.11.
- Create an instance-scoped tracker through the p5 sketch API.

The app behavior remains unchanged; its pure phrase-game, accompaniment, soundscape, MIDI output and pupil-evidence modules are now shared from library/modules. The app-specific performance controls and participant-study interface are still being migrated. There is no cognitive-state classifier in this package. Eye features are not diagnoses.

## Quick start

### Use it in the p5.js Web Editor

Create a sketch at [editor.p5js.org](https://editor.p5js.org/). In its `index.html`, add these scripts after the existing p5.js script and before `sketch.js`:

```html
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/connector-client.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon-addon.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon-surface.js"></script>
```

Then put this in `sketch.js`. It starts in mouse mode so you can try the interaction without hardware:

```js
let neon;
let gaze = null;
let message = 'Move the mouse over the canvas';
const targets = [
  { id: 'left', x: .15, y: .25, width: .3, height: .5, dwellMs: 600 },
  { id: 'right', x: .55, y: .25, width: .3, height: .5, dwellMs: 600 }
];

function setup() {
  const renderer = createCanvas(900, 600);
  neon = createNeonTracker();
  neon.useMouse(renderer);
  neon.setRegions(targets);
  neon.on('dwell', ({ region }) => message = `Dwell: ${region.id}`);
  neon.on('status', text => message = text);
  neon.on('error', text => message = text);
  createNeonControls(neon); // Pairing is entered at run time, not saved in sketch.js.
}

function draw() {
  background(245);
  gaze = neon.update(); // Fresh normalized position, or null when input is invalid.
  noFill(); stroke(160); strokeWeight(2);
  for (const target of targets) {
    rect(target.x * width, target.y * height,
         target.width * width, target.height * height, 16);
    noStroke(); fill(40); textAlign(CENTER, CENTER);
    text(target.id, (target.x + target.width / 2) * width,
         (target.y + target.height / 2) * height);
    noFill(); stroke(160);
  }
  noStroke(); fill(35); textAlign(LEFT, TOP); text(message, 16, 16);
  if (!gaze) return;
  fill('#008d95'); noStroke();
  if (gaze) circle(gaze.x * width, gaze.y * height, 20);
}
```

Click **Connect Neon** in the controls and enter the pairing code and port shown by the running connector. The **Use mouse** button switches back to simulation. The current release uses the local connector as its transport; it does not put credentials in the sketch or send them to GitHub. See [`p5-web-editor/README.md`](p5-web-editor/README.md) for the copyable starter and live-connection checklist.

For a hand-coded setup, call `await neon.connect({ code, port })` from a user-clicked button. Never commit a pairing code to a public sketch or URL.

## Live data and coordinate space

Start a connector build from this branch, keep Companion and the computer on the same Wi-Fi, and enter its current pairing code and port in the controls. Allow local-network access if your browser requests it. This branch's connector has an exact origin allowlist for the official p5 editor and preview. An older installed connector may not have that allowlist; updating the p5 JavaScript files alone does not update the desktop connector. Never broaden CORS to arbitrary websites.

Coordinates are on the existing four-AprilTag surface: top-left `(0,0)`, bottom-right `(1,1)`. They are NOT arbitrary screen or world-camera coordinates. For these live examples, display the supplied `monitor-mat.svg` at aspect ratio 1.5 and keep all four tags visible. Custom physical surfaces require matching bridge surface geometry. The drawing example leaves the tags unobscured. Mouse mode does not need a bridge.

The browser samples the connector about every 33 ms; this is not full-rate raw sensor recording. Samples older than 500 ms, unworn glasses, an unlocated mat and out-of-surface coordinates produce `gaze === null`. Never turn missing input into an AOI hit. Drawing uses p5's frame loop; input frequency and display frequency can differ.

## API

| API | Meaning |
| --- | --- |
| `new NeonP5()` | Create a client; no network access until connect. |
| `connect({code, port})` | Stop previous input, then use the authenticated local connector. |
| `useMouse(p5RendererOrCanvas)` | Stop live input and track the pointer on that canvas. Pupil data stays null. |
| `setRegions([{id,x,y,width,height,dwellMs,...}])` | Rectangles in 0–1 surface coordinates; default dwell 500 ms. First region wins overlaps. Custom metadata is retained. |
| `aoi(id, {x,y,width,height}, {dwell,...metadata})` | Add or replace one AOI using shorter, sketch-friendly syntax. `w`/`h` and `dwellMs` are also accepted. Returns the tracker. |
| `onAOI(id, {enter,dwell,exit})` | Subscribe to lifecycle events for one AOI; returns an unsubscribe function. |
| `drawGaze(p, gaze, {color,radius,weight})` | Draw an optional circle at normalized gaze coordinates; returns false for missing gaze. |
| `update()` | Call once per draw frame; update AOI events and return valid gaze or null. |
| `gaze` | Valid `{x,y}` or null; read-only getter. |
| `pupil` | Mean of available positive eye diameters in mm, or null. Requires valid surface gaze in v0.1. |
| `sample` | Latest sample, which may be stale; use gaze for validity. Includes source-specific optional fields. Treat as read-only. |
| `active` / `progress` | Current AOI or null / dwell fraction 0–1. |
| `on(event, callback)` | Subscribe; returns unsubscribe function. |
| `resetDwell()` | Clear current dwell (e.g. when changing scenes). |
| `disconnect()` | Stop requests/listeners and clear gaze; subscriptions remain. |
| `dispose()` | Disconnect and remove all subscriptions. |

Events: `sample` receives the latest sample; `status` and `error` receive a message; `enter` and `dwell` receive `{region,gaze}`; `exit` receives `{region}`. A held gaze triggers dwell once. Leaving a region, invalid input or switching sources resets the dwell. Returning starts a new dwell. The examples use native Web Audio, so p5.sound is not required; users must enable audio themselves.

## Blank marker mat and sketch-friendly syntax (0.3 draft)

The [p5 Web Editor starter](p5-web-editor/README.md) now starts with a reusable blank mat rather than the eight-donut MIDI layout. The mat SVG is [`assets/blank-marker-mat.svg`](assets/blank-marker-mat.svg): it has the same four AprilTag patterns as the established mat, at 420 × 280 mm, and contains no target objects. The physical eight-donut setup remains available in the optional physical template.

Load `p5.neon-surface.js` after the tracker scripts. It adds `NeonMat(p5, {imageUrl, aspect})`; call `mat.load()` in `preload()` and `mat.draw()` in `draw()`. Define only the AOIs your own physical objects need:

```js
neon.aoi('donut-1', { x: .25, y: .35, width: .18, height: .20 }, { dwell: 900 });
neon.onAOI('donut-1', {
  enter: () => console.log('look began'),
  dwell: () => playSound(),
  exit: () => console.log('look ended')
});
```

This is a small JavaScript API layered on p5, not a new syntax or separate language. `aoi()` is a concise wrapper around the existing `setRegions()` method, and `onAOI()` filters the existing `enter`, `dwell`, and `exit` events by region ID. Coordinates refer to the whole calibrated mat. Moving a physical object requires updating its AOI placement; AprilTags locate the surface but do not recognize objects.

## Distribution

The core remains a plain script exposing `NeonP5`; the optional `p5.neon-addon.js` adapter adds `createNeonTracker()` to p5 sketches and automatically disposes trackers when the sketch is removed. It uses p5.js 2 `registerAddon()` where available and the p5.js 1 prototype lifecycle as a compatibility path. This project is not yet listed in the p5 library directory or npm; the release checklist is in ROADMAP.md. The p5 site asks maintainers to submit a library-listing pull request after the library is ready: https://p5js.org/contribute/creating_libraries/. The tested p5 version is 1.11.11; the addon adapter also uses p5.js 2 registration when present. `connector-client.js` is a required additional script for live input; mouse mode is standalone. See `example.js` for the full runnable sketch. No credentials or gaze data are uploaded to GitHub by the library.


## Fullscreen console and editable templates (0.2)

The [examples](https://sharkburger.github.io/donut-midi/library/) include a **Fullscreen console** button: the four-marker surface, two eyes and state timeline stay visible together. **Maximize mat** hides the two auxiliary views; **Show eyes & state** brings them back. Return or Escape exits the console. Audio controls remain accessible.

Mouse mode shows explicitly labelled synthetic eyes. Live mode renders only fresh native 3D eye centers and directions, when supplied by Neon. Missing 3D data never becomes synthetic live data. The state timeline plots your selected self-report; its vertical regions are categories, not a ranked physiological measurement or classifier. Dwell events add markers to the timeline in music mode.

Open the [editable p5 template](https://sharkburger.github.io/donut-midi/library/editor.html). Edit JavaScript, click Run, load a painting or music template, and download sketch.js. Draft code stays in browser localStorage; pairing codes are not saved. The preview runs in a sandboxed iframe; parent-page code handles the existing connector and forwards only samples. The iframe receives no pairing token. Stop removes the preview and its audio. Live preview shares the same origin permission requirement as the examples; use this published page with your existing connector. Browser local-network permissions still apply.

This is our built-in p5.js editor, not editor.p5js.org. The editor provides `neon` and `MAT_URL`; downloaded sketch.js includes declarations suitable for the starter folder's library directory. Load p5.js and p5.neon.js before it. Live standalone sketches additionally need connector-client.js and a pairing UI; use createNeonControls() to create that transient UI. The supplied templates protect the corner markers; keep them clear when editing a live sketch. The sandbox intentionally blocks external network assets: use the included mat or data URLs in this first editor version.


## Physical donut layout

Open Workshop Editor from the main app. Choose **Physical donuts · design & print**, then **Load template** (download your old draft first). **Edit donut layout** lets you drag eight targets and change each name, diameter and MIDI note. All positions use one `DONUT_LAYOUT` JSON block in the sketch. The preview and rectangular AOIs both read that block. Overlapping target bounds and placement across the marker bands are rejected.

Click **Apply layout & run**, then **Download matching mat**. This exports an SVG at the configured physical dimensions, with the exact AprilTag 36h11 IDs 0–3 and original geometry. Default: 60 × 40 cm, 8.4 cm donut diameter. Print at actual size (100%); a 10 cm scale is included. Use a print shop or tiled printing for oversized sheets. Place donut centers on the crosses, on a flat low tray; keep tags visible. Do not rearrange, rotate or independently resize tags. Rerun/reprint after changing positions. A downloaded sketch retains the JSON layout.

**Physical mat mode** hides scanable tags on the screen so the camera only sees the printed set. Uncheck it for screen gaze testing. All four printed tags must be visible to the scene camera. Moving a physical donut alone does not move the sound: this is surface-region mapping, not object recognition. Food height can introduce parallax relative to the flat mat; verify each target with the actual glasses and adjust placement before the workshop. Missing/stale gaze cannot trigger sound. Press **Enable sound** after running a sketch.

The embedded editor shares the main app's input and never receives pairing credentials. Return to performance stops the preview audio; code is kept in this browser. Participant recording and other captures must end before opening the workshop editor.


## Effect library (App 1.4)

Open **Workshop Editor**, select an effect in the grouped **Effect library** dropdown, then **Load template**. The code remains editable. **Restore previous draft** undoes the most recent template load or asset replacement; download work you want to keep before browsing multiple templates. **Copy project code** adds the `neon` and `MAT_URL` declarations. **Download project ZIP** includes p5.js 1.11.11, the client, both libraries, the mat, your current sketch and a README. It never exports pairing tokens or participant data. A full project runs in mouse mode using any ordinary local web server; live access is still restricted to the existing allowed origins.

Templates: gaze dot; fading trail; particle trail; dwell-triggered particles; AOI events/progress; dwell image reveal; shaded eye pose illustration; binocular pupil timeline; live signal inspector; experimental blink reaction; physical donut designer; donut trail + sound; donut painting.

**Replace image** accepts PNG/JPEG/WebP up to 2 MB in the image-reveal and pixel-mirror templates. It embeds the image as a data URL, so the copied/exported sketch includes it. External assets are blocked inside the editor sandbox; a standalone project can use local assets via `p.loadImage()`.

### Reusable helpers (`p5.neon-effects.js`)

Load after `p5.neon.js`. They consume your existing `neon` instance and never open another connection.

- `NeonEffects.read(neon)` returns fresh live eye/pupil/aperture data independently of surface location. Missing data is null. Mouse input never becomes physical measurements.
- `new NeonEffects.Trail(lifetimeMs)`; `update(gazeOrNull,timeMs)` and `draw(p,color,width)`.
- `new NeonEffects.Particles(limit)`; `emit(x,y,count)`, `update(timeMs)`, `draw(p,color)`. Coordinates are normalized to the canvas; particle count and lifetime are bounded.
- `NeonEffects.regions(dwellMs)` supplies three example AOIs. Use `neon.on('enter'/'exit'/'dwell', handler)` for your own actions.
- `NeonEffects.eyes(p,input,syntheticGaze)` draws native optical axes as a compatible shaded projection. This is not eye-camera video or a reconstructed eye mesh. Synthetic eyes are only drawn in mouse mode.
- `new NeonEffects.BlinkGate()`; `setReference(openEyeApertureMm)` and `update(input,timeMs)` return closure/reopening **candidates**. The template collects a 2-second reference with at least 15 distinct valid samples. Closure <35% and reopening >70% of reference, lasting 60–700 ms, form a candidate; gaps >150 ms reset it. These are editable teaching heuristics, not validated thresholds or Pupil Labs' official detector. The scene-matched bridge is about 30 Hz, so short blinks may be missed. No inferred events from missing samples. For real use enable Compute eye state and verify your Companion supplies both eyelid apertures.

Signals and simulations are explicitly labelled. No cognitive classification, raw eye-camera video, camera permissions or new recording are added by these templates. Pupil Labs' eye-state fields and aperture units: https://docs.pupil-labs.com/neon/data-collection/data-streams/


### Gaze pixel mirror (App 1.4.1)

Choose **14 · Gaze pixel mirror** under **Regions & interaction**, then **Load template**. The default donut image is sampled into colored tiles; **Replace image** embeds a PNG/JPEG/WebP (up to 2 MB). The left slider changes columns (16–64); the right changes the gaze brush radius (1–5 tiles). Look or hover on the image: nearby tiles turn around a vertical hinge to a warm wood-colored back. They return after looking away. No click or dwell event is required. **Reset tiles** restores the image; edit `SPEED_MS` and `RETURN_MS` for animation timing. Pixel density changes reset the tiles.

This is an original gaze-controlled digital study inspired by [Daniel Rozin’s Wooden Mirror (1999)](https://www.smoothware.com/danny/woodenmirrormov.html), not a camera mirror or a reproduction of its mechanical system. The four corner tags stay visible. Lost/unmapped gaze stops new flips and the tiles settle.

`new NeonEffects.PixelMirror({columns,radius,speedMs,returnMs})` provides `setImage(p5Image)`, `update(gazeOrNull,timeMs)`, `draw(p)`, and `reset()`. Image colors are sampled once per image/density change; each animation frame uses the cached grid. The helper exposes `bounds` in normalized surface coordinates, so you can reuse the same image AOI in another sketch.

The editor supplies `DEFAULT_IMAGE_URL` as an embedded default image to its sandbox. Copy/sketch download includes the public image URL; project ZIP includes `donut-eye.png` and a local URL. Custom uploaded image data is preserved in all exports. No images or gaze are uploaded by Replace image.


### Resize code / preview (App 1.4.2)

Drag the divider between code and preview to give the render more space. The full 3:2 mat and all four tags resize together; the preview grows vertically with its width instead of stopping at 420 px. Your split is remembered in this browser. Double-click the divider (or press Enter while focused) to return to 50/50; arrow keys adjust it, Shift+arrow makes larger steps. Small windows stack both panes. Resizing preserves the running sketch and shared Neon connection.

### Physical donut → scream (App 1.5)

Select **15 · Physical donut → scream**, then **Load template**. Use **Edit layout** to position the single target and **Download matching mat** to print its four-marker mat. The default mat is 50 × 33.3 cm with one 10 cm target in the centre. Print at actual size, place the donut within the target, and keep all four markers visible to Neon. Changing the physical position requires updating the layout and matching mat. The preview deliberately does not duplicate the printed tags.

Connect your selected Neon, click **Enable scream** once, and look at the physical donut. After 3 seconds of continuous valid gaze inside its AOI, a synthesized cartoon scream starts; pitch and tremble intensify over the next 7 seconds with capped volume. Looking away, losing valid gaze, hiding the page or stopping the sketch resets and silences it. Sound comes from the computer or a connected speaker beside the donut. This measures AOI dwell, not a classified fixation or cognitive state. Mouse mode is available for testing. Edit `THRESHOLD_MS`, `RAMP_MS` and `DONUT_LAYOUT` to reuse it; project export includes the reusable `DwellRamp` and `ScreamVoice` helpers.


## p5 addon API adapter

`p5.neon-addon.js` scopes trackers to an individual sketch. In global mode call `createNeonTracker()` from `setup()`; in instance mode call `p.createNeonTracker()` from `p.setup()`. Use the existing `connect({code, port})`, `useMouse(canvas)`, `setRegions()`, and `on()` methods on the returned tracker. p5 cleanup automatically disposes all trackers created by that sketch. The downloadable example now uses this API.

The p5 Web Editor can run mouse-based sketches. On this branch, the connector also adds an exact allowlist for official p5 editor and preview origins. The controls created by createNeonControls() keep the pairing code in a password field at run time; it is not part of the saved sketch. Browser Local Network Access permission may still be required. Only run sketches whose source you trust while a pairing code is active.

## Shared creative modules

The app and starter package now load the same framework-independent helpers from `library/modules/`:

- `game-core.js` exposes `DonutGame` for MIDI / numbered-score parsing, authored phrases, target routes and slow-gaze game state.
- `game-mix.js` exposes `DonutMix` for phrase accompaniment scheduling.
- `soundscapes.js` exposes `StateSoundscapes` for continuous, cross-faded audio textures. The labels are artistic mappings, not inferred diagnoses.
- `midi-core.js` exposes `MidiOutput` and `StableChoice` for optional MIDI output and stable selection.
- `cognitive-evidence.js` exposes `CognitiveEvidence` for pupil reference and missing-data-safe evidence. It does not classify mental states.

These modules are intentionally separate from `p5.neon.js`; a sketch can use only the pieces it needs. Physical geometry and the 15 marker-safe creative examples remain in `library/` as reusable visual and layout modules. The performance dashboard, database server and participant-study interface are still app-specific and are listed as remaining migration work in ROADMAP.md.
