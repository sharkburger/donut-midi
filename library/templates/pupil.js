// @neon-template: pupil
// Pupil size timeline
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 let history=[],last=0,slider;
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);
  slider=p.createSlider(2,8,4,.1);slider.position(12,14);slider.attribute('aria-label','Synthetic pupil diameter');
 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Pupil size timeline' : 'MOUSE SIMULATION · Pupil size timeline');
  const input=NeonEffects.read(neon),now=p.millis();
  slider.elt.disabled=input.live;
  const value=input.live?input.pupil:Number(slider.value()); // No fake live values.
  if(now-last>=100){history.push({t:now,value});last=now;}
  history=history.filter(a=>now-a.t<15000);
  NeonEffects.clip(p,()=>{
   p.stroke('#bbb');p.line(p.width*.17,p.height*.65,p.width*.83,p.height*.65);
   p.stroke(COLOR);p.strokeWeight(2);let previous=null;
   for(const a of history){if(a.value===null){previous=null;continue;}const q={x:p.width*(.17+.66*(1-(now-a.t)/15000)),y:p.height*(.65-.35*p.constrain((a.value-2)/6,0,1))};if(previous)p.line(previous.x,previous.y,q.x,q.y);previous=q;}
   p.noStroke();p.fill('#342e28');p.textSize(11);p.text('8 mm',p.width*.17,p.height*.27);p.text('2 mm · last 15 seconds',p.width*.17,p.height*.69);
  });
  NeonEffects.label(p,value===null?'No binocular pupil data · enable Compute eye state':value.toFixed(2)+' mm · '+(input.live?'measured, not a mental-state score':'synthetic slider'));
 };
 p.windowResized = () => NeonEffects.resize(p);
});
