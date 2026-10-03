# p5.neon 0.2.0

A small MIT-licensed JavaScript library for eye-driven p5.js sketches. This is an independent community project, not an official Pupil Labs or p5.js product.

[Run the examples](https://sharkburger.github.io/donut-midi/library/) · [Full Donut MIDI](https://sharkburger.github.io/donut-midi/?v=console-2)

## What works in v0.1

- Pair with the existing Donut MIDI Neon connector (no protocol change).
- Read normalized surface gaze and optional pupil diameter.
- Define rectangular AOIs and receive enter, exit and dwell events.
- Simulate gaze with the mouse, including stationary dwell.
- Run Gaze painting and Dwell instrument examples with p5.js 1.11.11.

The full Donut MIDI app is unchanged and has not yet been migrated to this library. There is no cognitive-state classifier in this package. Eye features are not diagnoses.

## Quick start

Copy `p5.neon.js` and the repository's `connector-client.js` into your sketch. Load them after p5.js and before your sketch:

```html
<script src="p5.min.js"></script>
<script src="connector-client.js"></script>
<script src="p5.neon.js"></script>
<script src="sketch.js"></script>
```

A complete mouse example in p5 global mode:

```js
const neon = new NeonP5();
function setup() {
  const canvas = createCanvas(900, 600);
  neon.useMouse(canvas);
  neon.setRegions([
    { id: 'center', x: .4, y: .4, width: .2, height: .2, dwellMs: 500 }
  ]);
  neon.on('dwell', ({ region }) => console.log(region.id));
}
function draw() {
  background(245);
  const gaze = neon.update();
  noFill(); rect(width * .4, height * .4, width * .2, height * .2);
  if (gaze) circle(gaze.x * width, gaze.y * height, 20);
}
```

To switch to live input from a user-clicked button:

```js
await neon.connect({ code: pairingCode, port: connectorPort });
```

Use the port printed by the connector (the Mac app may select a dynamic port). Code and port are not stored by this library. Never commit a pairing code to your sketch or put it in a public URL query. `connect()` initiates transport; listen for `status` / `error` for the actual outcome.

## Live data and coordinate space

Start your existing connector, keep Companion and the computer on the same Wi-Fi, and copy its current pairing code and port into the examples. Allow local-network access if your browser requests it. The current bridge permits `https://sharkburger.github.io` and its own local fallback origin; arbitrary localhost servers, other sites and the p5 Web Editor are NOT supported by this release. Their origin/permission integration requires a separate bridge change. Downloading this library does not bypass that restriction.

Coordinates are on the existing four-AprilTag surface: top-left `(0,0)`, bottom-right `(1,1)`. They are NOT arbitrary screen or world-camera coordinates. For these live examples, display the supplied `monitor-mat.svg` at aspect ratio 1.5 and keep all four tags visible. Custom physical surfaces require matching bridge surface geometry. The drawing example leaves the tags unobscured. Mouse mode does not need a bridge.

The browser samples the connector about every 33 ms; this is not full-rate raw sensor recording. Samples older than 500 ms, unworn glasses, an unlocated mat and out-of-surface coordinates produce `gaze === null`. Never turn missing input into an AOI hit. Drawing uses p5's frame loop; input frequency and display frequency can differ.

## API

| API | Meaning |
| --- | --- |
| `new NeonP5()` | Create a client; no network access until connect. |
| `connect({code, port})` | Stop previous input, then use the authenticated local connector. |
| `useMouse(p5RendererOrCanvas)` | Stop live input and track the pointer on that canvas. Pupil data stays null. |
| `setRegions([{id,x,y,width,height,dwellMs,...}])` | Rectangles in 0–1 surface coordinates; default dwell 500 ms. First region wins overlaps. Custom metadata is retained. |
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

## Distribution

This release is a plain script exposing `NeonP5`, usable alongside p5 global or instance mode. It does not patch p5 prototypes and is not yet listed in the p5 library directory or npm. The tested p5 version is 1.11.11. `connector-client.js` is a required additional script for live input; mouse mode is standalone. See `example.js` for the full runnable sketch. No credentials or gaze data are uploaded to GitHub by the library.


## Fullscreen console and editable templates (0.2)

The [examples](https://sharkburger.github.io/donut-midi/library/) include a **Fullscreen console** button: the four-marker surface, two eyes and state timeline stay visible together. **Maximize mat** hides the two auxiliary views; **Show eyes & state** brings them back. Return or Escape exits the console. Audio controls remain accessible.

Mouse mode shows explicitly labelled synthetic eyes. Live mode renders only fresh native 3D eye centers and directions, when supplied by Neon. Missing 3D data never becomes synthetic live data. The state timeline plots your selected self-report; its vertical regions are categories, not a ranked physiological measurement or classifier. Dwell events add markers to the timeline in music mode.

Open the [editable p5 template](https://sharkburger.github.io/donut-midi/library/editor.html). Edit JavaScript, click Run, load a painting or music template, and download sketch.js. Draft code stays in browser localStorage; pairing codes are not saved. The preview runs in a sandboxed iframe; parent-page code handles the existing connector and forwards only samples. The iframe receives no pairing token. Stop removes the preview and its audio. Live preview shares the same origin permission requirement as the examples; use this published page with your existing connector. Browser local-network permissions still apply.

This is our built-in p5.js editor, not editor.p5js.org. The editor provides `neon` and `MAT_URL`; downloaded sketch.js includes declarations suitable for the starter folder's library directory. Load p5.js and p5.neon.js before it. Live standalone sketches additionally need connector-client.js and a pairing UI. The supplied templates protect the corner markers; keep them clear when editing a live sketch. The sandbox intentionally blocks external network assets: use the included mat or data URLs in this first editor version.


## Physical donut layout

Open Workshop Editor from the main app. Choose **Physical donuts · design & print**, then **Load template** (download your old draft first). **Edit donut layout** lets you drag eight targets and change each name, diameter and MIDI note. All positions use one `DONUT_LAYOUT` JSON block in the sketch. The preview and rectangular AOIs both read that block. Overlapping target bounds and placement across the marker bands are rejected.

Click **Apply layout & run**, then **Download matching mat**. This exports an SVG at the configured physical dimensions, with the exact AprilTag 36h11 IDs 0–3 and original geometry. Default: 60 × 40 cm, 8.4 cm donut diameter. Print at actual size (100%); a 10 cm scale is included. Use a print shop or tiled printing for oversized sheets. Place donut centers on the crosses, on a flat low tray; keep tags visible. Do not rearrange, rotate or independently resize tags. Rerun/reprint after changing positions. A downloaded sketch retains the JSON layout.

**Physical mat mode** hides scanable tags on the screen so the camera only sees the printed set. Uncheck it for screen gaze testing. All four printed tags must be visible to the scene camera. Moving a physical donut alone does not move the sound: this is surface-region mapping, not object recognition. Food height can introduce parallax relative to the flat mat; verify each target with the actual glasses and adjust placement before the workshop. Missing/stale gaze cannot trigger sound. Press **Enable sound** after running a sketch.

The embedded editor shares the main app's input and never receives pairing credentials. Return to performance stops the preview audio; code is kept in this browser. Participant recording and other captures must end before opening the workshop editor.
