// p5.neon starter: a reusable blank four-marker surface, no built-in donuts.
// Load p5.js, connector-client.js, p5.neon.js, p5.neon-addon.js, and
// p5.neon-surface.js in index.html. Pairing credentials stay in the controls.
const MAT_URL = 'https://cdn.jsdelivr.net/gh/sharkburger/donut-midi@p5-neon-community-library/library/assets/blank-marker-mat.svg';
let neon;
let mat;
let statusText = 'Mouse simulation · no biometric data';

function preload() {
  mat = new NeonMat(this, { imageUrl: MAT_URL, aspect: 1.5 });
  mat.load();
}

function setup() {
  const canvas = createCanvas(900, 600);
  neon = createNeonTracker();
  neon.useMouse(canvas);
  neon.on('status', text => statusText = text);
  neon.on('error', text => statusText = text);
  createNeonControls(neon);

  // Add only the AOIs your physical objects need. Coordinates are normalized
  // to the whole printed surface: x/y are top-left, width/height are fractions.
  // neon.aoi('donut-1', { x: 0.25, y: 0.35, width: 0.18, height: 0.2 }, { dwell: 900 });
  // neon.onAOI('donut-1', {
  //   enter: () => console.log('Gaze entered donut-1'),
  //   dwell: () => playSound(),
  //   exit: () => console.log('Gaze left donut-1')
  // });
}

function draw() {
  background('#f1eee7');
  mat.draw(0, 0, width, height);
  const gaze = neon.update();

  // Optional, for screen preview only. In physical mode the person looks at
  // the printed mat; this marker stays on the editor canvas.
  neon.drawGaze(this, gaze, { color: '#008d95', radius: 18 });

  noStroke();
  fill('#342c27');
  textAlign(LEFT, TOP);
  textSize(14);
  text(statusText, 14, 14, width - 28);
}
