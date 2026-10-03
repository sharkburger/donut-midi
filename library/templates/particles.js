// @neon-template: particles
// Gaze particles
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const particles = new NeonEffects.Particles(350);
 let lastEmission=0;
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);

 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Gaze particles' : 'MOUSE SIMULATION · Gaze particles');
  const now=p.millis();
  if(g && now-lastEmission>35){ particles.emit(g.x,g.y,3); lastEmission=now; }
  particles.update(now);
  NeonEffects.clip(p,()=>{ particles.draw(p,COLOR); NeonEffects.dot(p,g,COLOR); });
 };
 p.windowResized = () => NeonEffects.resize(p);
});
