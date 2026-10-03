// @neon-template: dwell
// Dwell particle burst
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const particles = new NeonEffects.Particles(400);
 const hits={};
 const HOLD_MS=700; // Change how long someone must look.
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);
  neon.setRegions(NeonEffects.regions(HOLD_MS));
  neon.on('dwell',({region})=>{
   hits[region.id]=(hits[region.id]||0)+1;
   particles.emit(region.x+region.width/2,region.y+region.height/2,100);
  });
 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Dwell particle burst' : 'MOUSE SIMULATION · Dwell particle burst');
  particles.update(p.millis());
  NeonEffects.clip(p,()=>{NeonEffects.boxes(p,neon,hits); particles.draw(p,COLOR); NeonEffects.dot(p,g,COLOR);});
  NeonEffects.label(p,'Hold for 700 ms · leave and return to repeat');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
