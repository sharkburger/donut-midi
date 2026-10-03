// @neon-template: scream
// A real donut that screams when you keep looking at its printed position.
// Audio is synthesized on your computer. No microphone, camera video or sample download.
const THRESHOLD_MS = 3000;
const RAMP_MS = 7000; // Reach maximum intensity after 10 seconds total.
// DONUT_LAYOUT_START
const DONUT_LAYOUT = {
  "widthCm": 50,
  "physical": true,
  "interaction": "scream",
  "donuts": [{"id":"screaming-donut","name":"Screaming donut","x":0.5,"y":0.5,"r":0.1,"note":60,"color":"#e596a2"}]
};
// DONUT_LAYOUT_END
new p5(p => {
 let mat,audio,voice,armed=false,button,volume,lastMode=null;
 const timer=new NeonEffects.DwellRamp(THRESHOLD_MS,RAMP_MS),donut=DONUT_LAYOUT.donuts[0];
 function reset(){timer.reset();voice?.update(false,0);}
 function disarm(){armed=false;reset();button?.html('Enable scream');}
 p.preload=()=>{mat=p.loadImage(MAT_URL);};
 p.setup=()=>{
  NeonEffects.canvas(p,neon);
  button=p.createButton('Enable scream');button.position(8,0);
  button.mousePressed(async()=>{
   if(armed){disarm();return;}
   audio??=new AudioContext({latencyHint:'interactive'});await audio.resume();
   voice??=new NeonEffects.ScreamVoice(audio);reset();armed=true;button.html('Stop / mute');
  });
  volume=p.createSlider(0,.3,.18,.01);volume.position(200,16);volume.style('width','100px');volume.attribute('aria-label','Scream volume');
  p.createSpan('Volume').position(310,16);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)disarm();});
  window.addEventListener('pagehide',()=>{disarm();voice?.dispose();audio?.close();});
 };
 p.draw=()=>{
  const gaze=neon.update(),now=p.millis();
  if(lastMode!==neon.mode){reset();lastMode=neon.mode;}
  const fresh=neon.mode==='mouse'||neon.clock()-neon.received<200;
  // Elliptical normalized bounds correspond to a circle on the 3:2 printed surface.
  const inside=!!gaze&&fresh&&Math.hypot((gaze.x-donut.x)/donut.r,(gaze.y-donut.y)/(donut.r*1.5))<=1;
  const result=timer.update(armed&&audio?.state==='running'&&inside&&!document.hidden,now);
  voice?.update(result.active,result.level,Number(volume.value()));
  NeonEffects.begin(p,DONUT_LAYOUT.physical?null:mat,DONUT_LAYOUT.physical?'PHYSICAL DONUT · look at the printed mat':'SCREEN / MOUSE REHEARSAL');
  const x=donut.x*p.width,y=donut.y*p.height,r=donut.r*p.width;
  p.stroke('#b58249');p.strokeWeight(4);p.fill(donut.color);p.circle(x,y,r*2);p.noStroke();p.fill('#fbfaf6');p.circle(x,y,r*.55);
  p.noFill();p.stroke(result.active?'#bb351e':'#d9ad48');p.strokeWeight(5);
  const progress=Math.min(1,result.elapsed/THRESHOLD_MS);
  if(progress>0)p.arc(x,y,r*2+14,r*2+14,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);
  p.noStroke();p.fill('#342e28');p.textAlign(p.CENTER);p.textSize(13);
  p.text(!armed?'Enable sound, then look at the real donut':result.active?`SCREAM · ${Math.round(result.level*100)}% intensity`:`Dwell ${ (result.elapsed/1000).toFixed(1)} / ${THRESHOLD_MS/1000} s`,p.width/2,p.height*.75);
  p.text(neon.mode==='mouse'?'Mouse rehearsal · hover on the donut':!fresh||!gaze?'Tracking missing · silent / timer reset':'Live Neon · look away to stop',p.width/2,p.height*.81);
 };
 p.windowResized=()=>NeonEffects.resize(p);
});
