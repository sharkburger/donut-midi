// @neon-template: signals
// Live eye signals
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
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Live eye signals' : 'MOUSE SIMULATION · Live eye signals');
  const input=NeonEffects.read(neon),fmt=v=>v===null?'unavailable':v.toFixed(2);
  const rows=[['Input',input.live?'Neon live':'Mouse simulation'],['Fresh / worn',input.fresh+' / '+input.worn],['Surface gaze',g?g.x.toFixed(3)+', '+g.y.toFixed(3):'unavailable'],['Binocular pupil / mm',fmt(input.pupil)],['Eyelid aperture / mm',fmt(input.aperture)],['Native eye poses',Number(!!input.left)+Number(!!input.right)+' / 2']];
  NeonEffects.clip(p,()=>{p.noStroke();p.fill('#342e28');p.textSize(Math.max(10,p.width*.022));for(let i=0;i<rows.length;i++){const y=p.height*(.28+i*.075);p.text(rows[i][0],p.width*.18,y);p.text(rows[i][1],p.width*.55,y);}});
 };
 p.windowResized = () => NeonEffects.resize(p);
});
