/* A runnable p5.js instance-mode sketch using only the public NeonP5 API. */
const neon = new NeonP5();
let mode='paint',canvas,marks=[],audio=null,soundEnabled=false,lastPoint=null;
const status=document.querySelector('#status'),eventLabel=document.querySelector('#event');
const centers=[.185,.395,.605,.815],notes=[60,62,64,65,67,69,71,72];
neon.setRegions(notes.map((note,i)=>({id:'note-'+i,x:centers[i%4]-.07,y:(i<4?.32:.65)-.1,width:.14,height:.2,dwellMs:500,note})));
neon.on('status',message=>status.textContent=message);
neon.on('error',message=>{status.textContent=message;eventLabel.textContent='Disconnected · no gaze data';});
neon.on('dwell',({region})=>{
  if(mode!=='music')return;
  eventLabel.textContent=`Dwell → MIDI note ${region.note}${soundEnabled?'':' · enable sound to hear it'}`;
  if(!soundEnabled||audio?.state!=='running')return;
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.type='sine';oscillator.frequency.value=440*2**((region.note-69)/12);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.15,now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+.6);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+.65);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
});
const fragment=new URLSearchParams(location.hash.slice(1));
if(fragment.has('pair')){document.querySelector('#code').value=fragment.get('pair');document.querySelector('#port').value=fragment.get('port')||8766;history.replaceState(null,'',location.pathname+location.search);}
document.querySelector('#connect').onclick=async()=>{lastPoint=null;status.textContent='Connecting…';try{await neon.connect({code:document.querySelector('#code').value.trim(),port:Number(document.querySelector('#port').value)});}catch(error){status.textContent=error.message;}};
document.querySelector('#mouse').onclick=()=>{neon.useMouse(canvas);lastPoint=null;status.textContent='Mouse simulation · no biometric data';};
document.querySelector('#clear').onclick=()=>{marks=[];lastPoint=null;};
document.querySelector('#audio').onclick=async()=>{try{audio??=new AudioContext();if(soundEnabled){soundEnabled=false;await audio.suspend();}else{await audio.resume();soundEnabled=true;}document.querySelector('#audio').textContent=soundEnabled?'Mute sound':'Enable sound';}catch(error){status.textContent=error.message;}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;lastPoint=null;neon.resetDwell();for(const tab of document.querySelectorAll('[data-mode]'))tab.setAttribute('aria-pressed',String(tab===b));eventLabel.textContent=mode==='music'?'Hold on a donut for 500 ms':'Gaze leaves a trail';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio?.suspend();soundEnabled=false;document.querySelector('#audio').textContent='Enable sound';lastPoint=null;}});
window.addEventListener('pagehide',()=>neon.dispose());
new p5(p=>{
  let mat,observer;
  p.preload=()=>{mat=p.loadImage('../monitor-mat.svg');};
  p.setup=()=>{const host=document.querySelector('#canvas');const size=()=>Math.min(host.clientWidth,host.clientHeight*1.5);canvas=p.createCanvas(size(),size()/1.5).parent(host);neon.useMouse(canvas);observer=new ResizeObserver(()=>p.resizeCanvas(size(),size()/1.5));observer.observe(host);};
  p.draw=()=>{
    p.background(255);p.image(mat,0,0,p.width,p.height);const gaze=neon.update();
    const inside=gaze&&gaze.x>.13&&gaze.x<.87&&gaze.y>.2&&gaze.y<.8;
    if(mode==='paint'){
      if(inside&&lastPoint)marks.push([lastPoint.x,lastPoint.y,gaze.x,gaze.y]);lastPoint=inside?gaze:null;
      if(marks.length>1600)marks.splice(0,marks.length-1600);
      p.stroke(26,126,134,150);p.strokeWeight(3);for(const [x,y,u,v] of marks)p.line(x*p.width,y*p.height,u*p.width,v*p.height);
    }
    // Never draw over the corner tags: the tracker needs their full black/white pattern.
    if(inside){p.noFill();p.stroke('#007c91');p.strokeWeight(2);p.circle(gaze.x*p.width,gaze.y*p.height,18);}
    if(mode==='music'&&neon.active){const r=neon.active;p.noFill();p.stroke('#cc643e');p.strokeWeight(3);p.rect(r.x*p.width,r.y*p.height,r.width*p.width,r.height*p.height,12);}
    document.querySelector('#gaze').textContent=gaze?`x ${gaze.x.toFixed(2)} · y ${gaze.y.toFixed(2)} · ${neon.mode==='live'?'Neon':'mouse'}`:'No valid surface gaze';
  };
});
