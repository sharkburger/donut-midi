// @neon-template: aoi
// Live AOI dashboard
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const hits={}; let event="Waiting for gaze";
 const HOLD_MS=600;
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);
  neon.setRegions(NeonEffects.regions(HOLD_MS));
  neon.on('enter',({region})=>event='ENTER '+region.id);
  neon.on('exit',({region})=>event='EXIT '+region.id);
  neon.on('dwell',({region})=>{hits[region.id]=(hits[region.id]||0)+1;event='DWELL '+region.id;});
 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Live AOI dashboard' : 'MOUSE SIMULATION · Live AOI dashboard');
  NeonEffects.clip(p,()=>{NeonEffects.boxes(p,neon,hits);NeonEffects.dot(p,g,COLOR);});
  NeonEffects.label(p,event+' · '+Math.round(neon.progress*100)+'% hold');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
