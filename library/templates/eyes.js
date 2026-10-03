// @neon-template: eyes
// Eye pose visualization
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
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Eye pose visualization' : 'MOUSE SIMULATION · Eye pose visualization');
  const input=NeonEffects.read(neon);
  NeonEffects.clip(p,()=>NeonEffects.eyes(p,input,g));
  const count=Number(!!input.left)+Number(!!input.right);
  NeonEffects.label(p,input.live?(count?`Native 3D axes · ${count}/2 eyes · illustrated projection`:'No eye state · enable Compute eye state'):'Synthetic eyes follow the mouse · not eye video');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
