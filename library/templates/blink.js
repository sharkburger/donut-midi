// @neon-template: blink
// Blink reaction (experimental)
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const gate=new NeonEffects.BlinkGate(),particles=new NeonEffects.Particles(400);
 let count=0,simCount=0,capture=null,values=[],lastStamp=null,status='Live: capture open-eye reference first',button,simulate;
 const burst=()=>particles.emit(.5,.48,100);
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);
  button=p.createButton('Capture open eyes · 2 s');button.position(8,8);
  button.mousePressed(()=>{capture=p.millis();values=[];lastStamp=null;status='Keep both eyes comfortably open for 2 seconds';});
  simulate=p.createButton('Simulate blink');simulate.position(205,8);
  simulate.mousePressed(()=>{if(neon.mode!=='live'){simCount++;burst();}});
 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Blink reaction (experimental)' : 'MOUSE SIMULATION · Blink reaction (experimental)');
  const input=NeonEffects.read(neon),now=p.millis();
  simulate.elt.disabled=input.live;button.elt.disabled=!input.live;
  if(capture!==null){
   if(input.live&&input.fresh&&input.worn&&input.aperture>0&&input.stamp!==null&&input.stamp!==lastStamp){values.push(input.aperture);lastStamp=input.stamp;}
   if(now-capture>=2000){capture=null;if(values.length>=15){values.sort((a,b)=>a-b);gate.setReference(values[Math.floor(values.length/2)]);status='Reference ready · experimental closure / reopening candidates';}else status='Not enough eyelid data · check Companion eye state support';}
  } else if(gate.update(input,now)){count++;burst();}
  particles.update(now);
  NeonEffects.clip(p,()=>{particles.draw(p,COLOR);NeonEffects.eyes(p,input,g);});
  NeonEffects.label(p,input.live?(input.aperture===null?'No eyelid data · missing samples are NOT blinks':status+' · '+count):'SIMULATED blink reactions: '+simCount+' · click Simulate blink');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
