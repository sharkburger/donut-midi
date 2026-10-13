// p5.neon starter — normal p5.js JavaScript, no pairing secrets in this file.
let neon;
let gaze = null;
let message = 'Move the mouse over the canvas';

const targets = [
  { id: 'left', x: 0.15, y: 0.25, width: 0.3, height: 0.5, dwellMs: 600 },
  { id: 'right', x: 0.55, y: 0.25, width: 0.3, height: 0.5, dwellMs: 600 }
];

function setup() {
  const renderer = createCanvas(900, 600);
  neon = createNeonTracker();
  neon.useMouse(renderer);
  neon.setRegions(targets);
  neon.on('dwell', ({ region }) => {
    message = `Dwell: ${region.id}`;
  });
  neon.on('status', text => message = text);
  neon.on('error', text => message = text);
  createNeonControls(neon);
}

function draw() {
  background(247, 244, 237);
  gaze = neon.update();

  textAlign(CENTER, CENTER);
  textSize(24);
  for (const target of targets) {
    const x = target.x * width;
    const y = target.y * height;
    const w = target.width * width;
    const h = target.height * height;
    const active = neon.active?.id === target.id;
    stroke(active ? '#e5b936' : '#786a5c');
    strokeWeight(active ? 5 : 2);
    fill(active ? '#fff1bd' : '#fffdf8');
    rect(x, y, w, h, 22);
    noStroke();
    fill('#342c27');
    text(target.id, x + w / 2, y + h / 2);
  }

  textAlign(LEFT, TOP);
  textSize(15);
  noStroke();
  fill('#342c27');
  text(message, 16, 16, width - 32);

  if (gaze) {
    fill('#008d95');
    noStroke();
    circle(gaze.x * width, gaze.y * height, 20);
  }
}
