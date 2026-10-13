# Try p5.neon in the p5.js Web Editor

This starter uses ordinary p5.js JavaScript. The browser loads the p5.neon scripts from this GitHub branch; the official p5.js Web Editor does not need a custom fork.

## 1. Create a sketch

Open [editor.p5js.org](https://editor.p5js.org/) and create a sketch. In `index.html`, keep the existing p5.js script. Add the following three tags after it and before the existing `sketch.js` tag:

```html
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/connector-client.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon.js"></script>
<script src="https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/p5.neon-addon.js"></script>
```

Use the [`sketch.js`](sketch.js) in this folder. Run it and choose **Use mouse** to try the AOIs. All code is still JavaScript using the familiar p5 `setup()` and `draw()` functions.

## 2. Connect Neon

For live data, start the Donut MIDI connector on the same computer as the browser. Use a connector build that includes this branch's p5 editor origin allowlist. In the sketch controls, paste the one-time pairing code and port printed by that connector, then click **Connect Neon**. If the browser asks, allow local-network access. Do not paste the pairing code into `sketch.js`, a public URL, or a shared editor project.

The installed desktop app is a separate versioned package; loading newer p5 scripts does not update it. If its connector does not accept the p5 editor origin, update/rebuild the connector from this branch or use the browser app's existing supported origin.

## 3. Coordinate note

The current connector returns normalized gaze on the four-marker surface, with `(0, 0)` at its top-left and `(1, 1)` at bottom-right. Keep the four markers visible and align your AOIs to that same surface. The library does not infer which physical object is under gaze without a tracked surface layout.

## CDN note

The example URLs use a branch name so contributors can try this in-progress version. They can change as the branch changes. Before wider workshop use or official p5 directory submission, publish a tagged release (and preferably an npm package) and change the script URLs to that fixed version.
