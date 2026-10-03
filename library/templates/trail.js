// @neon-template: trail
// Fading gaze trail
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const trail = new NeonEffects.Trail(1200); // Milliseconds until a segment disappears.
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);

 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Fading gaze trail' : 'MOUSE SIMULATION · Fading gaze trail');
  trail.update(g,p.millis());
  NeonEffects.clip(p,()=>{ trail.draw(p,COLOR,4); NeonEffects.dot(p,g,COLOR); });
 };
 p.windowResized = () => NeonEffects.resize(p);
});
