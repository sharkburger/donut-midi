// p5.neon template — edit the color, trail width or dwell time, then Run.
// The editor supplies neon and MAT_URL. See README for standalone use.
const TRAIL_COLOR = '#008d95';
const TRAIL_WIDTH = 4;
const DWELL_MS = 500;
const PLAY_NOTES = false;

new p5(p => {
  let mat, canvas, audio, trail = [], previous = null;
  const notes = [60, 62, 64, 65, 67, 69, 71, 72];
  const columns = [.185, .395, .605, .815];

  p.preload = () => { mat = p.loadImage(MAT_URL); };
  p.setup = () => {
    canvas = p.createCanvas(p.windowWidth, p.windowWidth / 1.5);
    // In live mode, this call is ignored by the editor's input adapter.
    neon.useMouse(canvas);
    neon.setRegions(notes.map((note, i) => ({
      id: 'donut-' + i, note,
      x: columns[i % 4] - .07, y: (i < 4 ? .32 : .65) - .1,
      width: .14, height: .2, dwellMs: DWELL_MS
    })));
    if (PLAY_NOTES) {
      const button = p.createButton('Enable sound');
      button.mousePressed(async () => {
        audio ??= new AudioContext();
        await audio.resume();
        button.html('Sound enabled');
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
    p.image(mat, 0, 0, p.width, p.height);
    const gaze = neon.update();
    // Protect the corner markers so Neon can locate the surface.
    const inside = gaze && gaze.x > .13 && gaze.x < .87
      && gaze.y > .2 && gaze.y < .8;
    if (!PLAY_NOTES) {
      if (inside && previous) trail.push([previous, gaze]);
      previous = inside ? gaze : null;
      if (trail.length > 1200) trail.shift();
      p.stroke(TRAIL_COLOR); p.strokeWeight(TRAIL_WIDTH);
      for (const [a, b] of trail)
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
  p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowWidth / 1.5);
});
