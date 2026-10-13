# p5.neon: blank marker mat and gaze API

This starter is a normal p5.js sketch. It opens with a reusable, blank four-marker mat and a gaze cursor. It does **not** add donuts or create AOIs until you define them. The eight-donut MIDI layout remains an optional example.

## Start in the p5.js Web Editor

1. Create a sketch at [editor.p5js.org](https://editor.p5js.org/).
2. In `index.html`, keep the p5.js script already provided. Add these scripts after p5.js and before `sketch.js`:

```html
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/connector-client.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon-addon.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon-surface.js"></script>
```

3. Replace the editor's `sketch.js` with [`sketch.js`](sketch.js), then click **Run**. Click **Use mouse** to test without glasses. This starter references the blank mat SVG in the same GitHub branch, so it is retained and loaded automatically.
4. For live gaze, start the desktop Neon connector, then enter its current pairing code and port in the sketch controls and click **Connect Neon**. Keep the connector running. If asked, allow the browser's local-network access. Codes are entered at runtime and are not saved in the sketch.

## The basic pattern

The library handles the shared work: reading gaze, validating it, checking AOI bounds, tracking dwell, and drawing the reusable mat. Your sketch describes what happens when gaze enters, dwells in, or leaves an AOI.

```js
const MAT_URL = 'https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/assets/blank-marker-mat.svg';
let neon;
let mat;

function preload() {
  mat = new NeonMat(this, { imageUrl: MAT_URL, aspect: 1.5 });
  mat.load();
}

function setup() {
  const canvas = createCanvas(900, 600);
  neon = createNeonTracker();
  neon.useMouse(canvas); // Use the mouse to rehearse; connect Neon in the controls for live gaze.
  createNeonControls(neon);

  neon.aoi('donut-1', {
    x: 0.25, y: 0.35, width: 0.18, height: 0.20
  }, { dwell: 900 });

  neon.onAOI('donut-1', {
    enter: () => console.log('Gaze entered donut-1'),
    dwell: () => playSound(),
    exit: () => console.log('Gaze left donut-1')
  });
}

function draw() {
  background('#f1eee7');
  mat.draw(0, 0, width, height);
  const gaze = neon.update();
  neon.drawGaze(this, gaze); // Optional preview cursor; omit in a clean performance view.
}
```

## API reference

### Reusable marker mat

```js
const mat = new NeonMat(p5Instance, { imageUrl: MAT_URL, aspect: 1.5 });
mat.load();                 // Call from p5 preload().
const bounds = mat.draw(); // Draw fitted within the canvas; returns its pixel bounds.
```

`library/assets/blank-marker-mat.svg` is a 420 × 280 mm, white, blank surface with the same four AprilTag patterns as this project's existing marker mat. It contains no donuts. Print at 100% scale if using that physical size; scaling the full SVG uniformly is fine. Keep the tags unobstructed and preserve their relative positions. This is a four-marker surface image, not a QR-code generator.

### Tracker and AOIs

```js
const gaze = neon.update();     // {x, y} normalized to the marked surface, or null.
neon.aoi(id, bounds, options);  // Add or replace one rectangular AOI.
neon.onAOI(id, handlers);       // Subscribe to this AOI's enter/dwell/exit events.
neon.drawGaze(p, gaze, options); // Optional circle at normalized gaze position.
```

`bounds` uses normalized coordinates: `x`, `y`, `width`, and `height` range from 0 to 1. `w` and `h` are accepted as short aliases. `(0, 0)` is the top-left of the four-marker surface, and `(1, 1)` is the bottom-right. `options.dwell` (or `dwellMs`) sets the continuous gaze time in milliseconds; it defaults to 500 ms. Extra options are retained as AOI metadata.

`onAOI` accepts any combination of `enter`, `dwell`, and `exit` callbacks. Each callback receives an event containing `region`; enter/dwell also include `gaze`. Save the returned unsubscribe function if you need to detach callbacks later.

The lower-level API remains available: `setRegions([...])`, `on(event, callback)`, `connect({code, port})`, `useMouse(canvas)`, `disconnect()`, and `dispose()`. This convenience API is JavaScript using ordinary p5 `setup()` and `draw()`; it is not a new programming language and does not replace p5.js.

## Add more objects

An AOI is just a normalized rectangle, independent of how many physical objects you have. Add only the ones you need:

```js
neon.aoi('left-donut',  { x: .15, y: .30, width: .20, height: .28 }, { dwell: 700 });
neon.aoi('right-donut', { x: .65, y: .30, width: .20, height: .28 }, { dwell: 700 });
neon.onAOI('left-donut',  { dwell: () => playLeftSound() });
neon.onAOI('right-donut', { dwell: () => playRightSound() });
```

To match a real table, put the physical objects inside the AOI coordinates you defined. Moving an object without updating its AOI changes the mapping. The markers locate the surface; they do not identify objects.

The pairing code and port belong in the runtime controls, not in `sketch.js`, `index.html`, or a public editor project. The desktop connector remains a separate process; Sketch Files contain the reusable browser-side library and creative sketch.
