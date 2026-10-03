// Physical donuts — the layout below drives graphics, sound and printable placement.
// Use Edit layout to move donuts, then Apply layout & run.
// The editor supplies neon and MAT_URL. See README for standalone use.
const TRAIL_COLOR = '#008d95';
const TRAIL_WIDTH = 4;
const DWELL_MS = 250; // Intentional hold before triggering; increase if gaze triggers too easily.
const PLAY_NOTES = true;
const TRAIL_LIFETIME_MS = 1200; // Fade away even when the pointer stops.

// DONUT_LAYOUT_START
const DONUT_LAYOUT = {
  "widthCm": 60,
  "physical": true,
  "donuts": [
    {
      "id": "donut-1",
      "name": "Original",
      "x": 0.185,
      "y": 0.32,
      "r": 0.07,
      "note": 60,
      "color": "#d9ad67"
    },
    {
      "id": "donut-2",
      "name": "Chocolate",
      "x": 0.395,
      "y": 0.32,
      "r": 0.07,
      "note": 62,
      "color": "#705448"
    },
    {
      "id": "donut-3",
      "name": "Strawberry",
      "x": 0.605,
      "y": 0.32,
      "r": 0.07,
      "note": 64,
      "color": "#d48799"
    },
    {
      "id": "donut-4",
      "name": "Matcha",
      "x": 0.815,
      "y": 0.32,
      "r": 0.07,
      "note": 65,
      "color": "#8b9d69"
    },
    {
      "id": "donut-5",
      "name": "Blueberry",
      "x": 0.185,
      "y": 0.65,
      "r": 0.07,
      "note": 67,
      "color": "#9584b2"
    },
    {
      "id": "donut-6",
      "name": "Lemon",
      "x": 0.395,
      "y": 0.65,
      "r": 0.07,
      "note": 69,
      "color": "#dfc76c"
    },
    {
      "id": "donut-7",
      "name": "Caramel",
      "x": 0.605,
      "y": 0.65,
      "r": 0.07,
      "note": 71,
      "color": "#bc8957"
    },
    {
      "id": "donut-8",
      "name": "Vanilla",
      "x": 0.815,
      "y": 0.65,
      "r": 0.07,
      "note": 72,
      "color": "#e7d7b2"
    }
  ]
};
// DONUT_LAYOUT_END

new p5(p => {
  let mat, canvas, audio, trail = [], previous = null;


  // Fit the entire 3:2 mat inside the preview, leaving room for sound controls.
  const size = () => {
    const w = Math.max(1, Math.min(p.windowWidth, (p.windowHeight - 56) * 1.5));
    return [w, w / 1.5];
  };
  p.preload = () => { mat = p.loadImage(MAT_URL); };
  p.setup = () => {
    canvas = p.createCanvas(...size());
    canvas.style('display', 'block');
    canvas.style('margin', '56px auto 0');
    // In live mode, this call is ignored by the editor's input adapter.
    neon.useMouse(canvas);
    neon.setRegions(DONUT_LAYOUT.donuts.map(d => ({
      id: d.id, note: d.note,
      x: d.x - d.r, y: d.y - d.r * 1.5,
      width: d.r * 2, height: d.r * 3, dwellMs: DWELL_MS
    })));
    if (PLAY_NOTES) {
      const button = p.createButton('Enable sound');
      button.position(12, 8);
      button.mousePressed(async () => {
        audio ??= new AudioContext({latencyHint: 'interactive'});
        await audio.resume();
        button.html('Sound enabled · dwell on a donut');
        neon.resetDwell();
      });
    }
    neon.on('dwell', ({region}) => {
      console.log('Dwell:', region.id, 'MIDI note:', region.note);
      if (!PLAY_NOTES || audio?.state !== 'running') return;
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = 440 * 2 ** ((region.note - 69) / 12);
      gain.gain.setValueAtTime(.15, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .5);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + .55);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  };
  p.draw = () => {
    p.background(255);
    // Hide on-screen tags when looking at the printed mat: duplicate IDs confuse tracking.
    if (!DONUT_LAYOUT.physical) p.image(mat, 0, 0, p.width, p.height);
    p.noStroke(); p.fill('#342e28'); p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12); p.text(DONUT_LAYOUT.physical ? 'PHYSICAL MAT · look at the real donuts' : 'SCREEN / MOUSE PREVIEW', p.width/2, p.height*.1);
    for (const [i, d] of DONUT_LAYOUT.donuts.entries()) {
      const x=d.x*p.width, y=d.y*p.height, r=d.r*p.width;
      p.stroke('#bd8b50'); p.strokeWeight(4); p.fill(d.color);
      p.circle(x,y,r*2); p.noStroke(); p.fill('white'); p.circle(x,y,r*.5);
      p.fill('#342e28'); p.textSize(Math.max(9,p.width*.017));
      p.text((i+1)+' · '+d.name+' · '+d.note,x,y+r+12);
    }
    const gaze = neon.update();
    // Protect the corner markers so Neon can locate the surface.
    const inside = gaze && gaze.x > .025 && gaze.x < .975
      && gaze.y > .2 && gaze.y < .8;
    const now = p.millis();
    if (inside && previous && (previous.x !== gaze.x || previous.y !== gaze.y))
      trail.push({a: previous, b: {...gaze}, time: now});
    previous = inside ? {...gaze} : null;
    trail = trail.filter(segment => now - segment.time < TRAIL_LIFETIME_MS);
    p.strokeWeight(TRAIL_WIDTH);
    for (const {a, b, time} of trail) {
      const color = p.color(TRAIL_COLOR);
      color.setAlpha(255 * (1 - (now - time) / TRAIL_LIFETIME_MS));
      p.stroke(color);
      p.line(a.x * p.width, a.y * p.height, b.x * p.width, b.y * p.height);
    }
    if (inside) {
      p.noFill(); p.stroke(TRAIL_COLOR); p.strokeWeight(2);
      p.circle(gaze.x * p.width, gaze.y * p.height, 20);
    }
    if (PLAY_NOTES && neon.active) {
      const r = neon.active;
      p.noFill(); p.stroke('#cc643e');
      p.rect(r.x*p.width, r.y*p.height, r.width*p.width, r.height*p.height, 12);
    }
  };
  p.windowResized = () => p.resizeCanvas(...size());
});
