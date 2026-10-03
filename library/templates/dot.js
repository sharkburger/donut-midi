// @neon-template: dot
// Gaze dot
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;

 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);

 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Gaze dot' : 'MOUSE SIMULATION · Gaze dot');
  NeonEffects.clip(p, () => NeonEffects.dot(p,g,COLOR));
  NeonEffects.label(p,g ? `x ${g.x.toFixed(2)} · y ${g.y.toFixed(2)}` : 'Move into the center / keep all four tags visible');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
