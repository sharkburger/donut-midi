'use strict';
const publicWebsite=!['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const studio=document.createElement('section');studio.className='studio';
studio.innerHTML=`<div class="studio-heading"><div><small>BODY / SCORE</small><h2>Eyes & sound timeline</h2></div><div><button id="startDuet">▶ Start melody + accompaniment</button><button id="connectEyes">Connect Neon</button><button id="studioDemo">Start synthetic eye demo</button></div></div>
<div class="studio-grid"><section><h3>3D eye poses</h3><p id="eyeStatus">Waiting for Neon 3D eye data</p><div id="eyeScene"></div><p id="eyeNumbers"></p><small>Native Neon centers and optical axes. The 12 mm sphere radius is illustrative, not eye video or a pye3d fit. Drag to rotate.</small></section>
<section><h3>Curve enters a region → sound</h3><label>Curve source <select id="curveSource"><option value="report">My self-report</option><option value="activity">Creative gaze-activity mapping</option><option value="pupil">Creative pupil-change mapping</option></select></label><label><input type="checkbox" id="curveSound" checked>Play on region entry</label><p id="curveStatus">Waiting for valid input</p><canvas id="stateChart" aria-label="Sound-region curve and sound events over the last 30 seconds"></canvas><p>Bottom to top: relaxed → focused → stressed → confused. These are sound regions, not a cognitive-intensity scale.</p><small>Single region tones trigger after 0.6 s of stability, with a 1.5 s cooldown. Automatic mapping does not identify mental states. Keys 1–4 mark a self-report; 0 clears it. Missing data creates gaps.</small></section></div>`;
document.querySelector('.workspace').before(studio);
const dockStyle=document.createElement('style');dockStyle.textContent='.studio.studio-docked{width:42%;max-height:88vh;overflow:auto;margin:0;padding:14px;box-sizing:border-box}.studio-docked .studio-grid{grid-template-columns:1fr;gap:12px}.studio-docked #eyeScene{height:120px}.studio-docked h2{font-size:18px;margin:3px 0 10px}.studio-docked h3{font-size:15px;margin:4px 0}.studio-docked small{display:none}.studio-docked p{font-size:12px;margin:5px 0}.studio-docked #eyeNumbers{min-height:0}.studio-docked label{font-size:12px}.studio-docked select{max-width:200px}';document.head.append(dockStyle);
const studioStyle=document.createElement('style');studioStyle.textContent=`.studio{margin:24px 0;padding:24px;background:#f2efe7;border:1px solid #d8d0c2;border-radius:20px}.studio-heading{display:flex;justify-content:space-between;align-items:center}.studio h2{margin:8px 0 22px}.studio h3{margin:0 0 12px}.studio-grid{display:grid;grid-template-columns:minmax(280px,1fr) minmax(420px,2fr);gap:26px}.studio small{color:#675f54;line-height:1.6}.studio label{display:inline-flex;gap:8px;align-items:center;margin-right:12px}.studio canvas{max-width:100%}#eyeScene{height:240px;background:#202a32;border-radius:14px;overflow:hidden}#stateChart{width:100%;height:280px}#eyeNumbers{min-height:40px;font-size:13px}@media(max-width:850px){.studio-grid{grid-template-columns:1fr}}`;document.head.append(studioStyle);
const regionCurve=new RegionCurve(),curvePoints=[],soundPoints=[];
const regionKeys=['relax','focus','stress','confusion'],regionNames=['Relaxed','Focused','Stressed','Confused'],regionColors=['#b4c6a5','#a8c6d9','#e4bc84','#c9acd0'];
let studioDemo=false,studioLastPoint=0,studioLastNote=noteCount,studioLastSource=source,studioLastMode='report',eyeDemoTime=0;
function resetStudio(){regionCurve.reset();curvePoints.length=0;soundPoints.length=0;studioLastPoint=0;stopStateSound();if(typeof resetEvidence==='function')resetEvidence();}
function connectRealEyes(){if(publicWebsite){toast('Use the local version for real gaze; the public connector is being prepared.');return;}studioDemo=false;$('studioDemo').textContent='Start synthetic eye demo';resetStudio();if(source!=='live')switchSource('live');connect();}
$('connectEyes').onclick=connectRealEyes;
async function startDuet(){
  if(calibrating){toast('Wait for pupil calibration to finish before playing.');return;}
  studioDemo=false;$('studioDemo').textContent='Start synthetic eye demo';
  if(typeof neonPackageActive!=='undefined'&&neonPackageActive){/* Keep the authenticated live stream. */}
  else if(publicWebsite){if(source!=='simulate')switchSource('simulate');}
  else {if(source!=='live')switchSource('live');if(!ws||ws.readyState>1)connect();}
  if(!audioEnabled)await toggleAudio();
  else {try{await instrument.start();}catch(e){toast('Could not start audio: '+e.message);return;}}
  if(!audioEnabled||instrument.ctx?.state!=='running')return;
  setPhase('look');
  $('curveSource').value='report';
  setReportedState('focus');
  if(typeof startFocusBacking==='function')startFocusBacking();
  patternSoundEnabled=true;$('patternSound').checked=true;
  $('curveSound').checked=true;resetStudio();
  if(source!=='live'){$('canvasHost').scrollIntoView({behavior:'smooth',block:'center'});toast('Hold the pointer on a donut to play. Focus accompaniment is manually selected, not inferred.');return;}
  screenScoreButton.click();
  if(!studio.classList.contains('studio-docked'))$('screenStudioToggle')?.click();
  toast('Both voices enabled: dwell on donuts for notes; manually selected focus accompaniment continues.');
}
$('startDuet').onclick=startDuet;
function performanceHint(now,mode){
  if(!audioEnabled||instrument.ctx?.state!=='running')return 'Click Start melody + accompaniment to enable audio';
  if(calibrating)return 'Capturing pupil baseline';
  if(!['look','after'].includes(phase))return 'Not in a playing stage. Click Start melody + accompaniment.';
  if(!studioDemo){
    if(!sample||now-sampleReceived>=500)return 'Waiting for fresh gaze data; check the phone connection';
    if(!sample.worn)return 'Device has not reported that glasses are worn';
    if(!sample.surfaceValid)return `Mat not located (markers ${sample.markerCount??0}/4). Keep all four corners in the scene camera.`;
    if(mode==='report'&&reportedState==='none')return 'Use keys 1–4 to report a feeling, or select gaze activity';
    if(mode==='pupil'&&!baselineReady)return 'Capture a 15 s pupil baseline first';
    if(mode==='pupil'&&pupil(sample)===null)return 'Waiting for valid pupil diameter';
  }
  return 'Dwell for about half a second. Look away and back to repeat. Region tones require 0.6 s of stability.';
}
$('studioDemo').onclick=async()=>{studioDemo=!studioDemo;resetStudio();$('studioDemo').textContent=studioDemo?'Stop synthetic eye demo':'Start synthetic eye demo';if(studioDemo&&!audioEnabled)await toggleAudio();};
$('curveSource').onchange=resetStudio;
$('curveSound').onchange=()=>{regionCurve.reset();stopStateSound();};
function updateStudio(now,observation,valid){
  const mode=$('curveSource').value;if(source!==studioLastSource||mode!==studioLastMode){resetStudio();studioLastSource=source;studioLastMode=mode;}
  let target=null,origin='';
  if(studioDemo){target=1.999+1.85*Math.sin(now/3400);origin='Synthetic demo · not human data';}
  else if(mode==='report'){target=reportedState==='none'?null:regionKeys.indexOf(reportedState)+.5;origin='Self-report (held until changed)';}
  else if(mode==='activity'){target=valid?clamp(.5+observation.switches*.65-Math.min(observation.seconds,3)*.1,0,3.99):null;origin='Gaze activity → sound region · creative mapping, not classification';}
  else {const pv=sample&&pupil(sample);target=valid&&baselineReady&&pv!==null?clamp(1.5+delta*2,0,3.99):null;origin='Pupil change → sound region · not classification';}
  const running=!(typeof gameModeActive==='function'&&gameModeActive())&&(studioDemo||valid)&&audioEnabled&&['look','after'].includes(phase)&&!calibrating&&!document.hidden;
  const out=regionCurve.update(now,target,running);
  if(!running||out.value===null)stopStateSound();
  const allowSound=$('curveSound').checked&&(mode==='report'?stateSoundEnabled:patternSoundEnabled||studioDemo);
  if(out.hit&&allowSound&&!(typeof backingActive==='function'&&backingActive())){playStateMotif(stateDefs[out.hit][1],out.hit);const event={time:now,label:stateDefs[out.hit][0],value:out.value};soundPoints.push(event);log('region_sound',{region:out.hit,value:out.value,origin:studioDemo?'synthetic-demo':mode,ruleVersion:'curve-1'});}
  if(noteCount!==studioLastNote){studioLastNote=noteCount;soundPoints.push({time:now,label:noteLabel(config.notes[lastNoteZone]),value:null});}
  if(now-studioLastPoint>100){studioLastPoint=now;curvePoints.push({time:now,value:out.value});if(recording)log('curve_sample',{value:out.value,origin:studioDemo?'synthetic-demo':mode});}
  while(curvePoints.length&&now-curvePoints[0].time>30000)curvePoints.shift();while(soundPoints.length&&now-soundPoints[0].time>30000)soundPoints.shift();
  $('curveStatus').textContent=origin+(out.value===null?'':`  |  Current region: ${regionNames[Math.floor(out.value)]}`)+'  |  '+performanceHint(now,mode)+(allowSound?'':'  |  Region tones off');
  if(typeof updateEvidence==='function')updateEvidence(now,observation,valid,mode,out.value,target);
  drawStateChart(now);eyeDemoTime=now;
}
function drawStateChart(now){
 const canvas=$('stateChart'),w=Math.max(canvas.clientWidth,180),h=Math.max(canvas.clientHeight,120),dpr=window.devicePixelRatio||1;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=h*dpr;}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const l=Math.min(72,w*.28),r=w-10,t=8,b=h-35,x=time=>l+(time-(now-30000))/30000*(r-l),y=value=>b-value/4*(b-t);
 c.font='10px system-ui';for(let i=0;i<4;i++){c.fillStyle=regionColors[i];c.globalAlpha=.42;c.fillRect(l,y(i+1),r-l,(b-t)/4);c.globalAlpha=1;c.fillStyle='#4a4039';c.fillText(regionNames[i],3,y(i+.5)+4);}
 c.strokeStyle='#3a3530';c.lineWidth=1;c.beginPath();c.moveTo(l,t);c.lineTo(l,b);c.lineTo(r,b);c.stroke();for(let s=0;s<=30;s+=5){const px=l+s/30*(r-l);c.fillText(s===30?'Now':`${s-30}s`,px-10,h-20);}c.fillText('Sound timeline (s) · dots = notes',l,h-3,r-l);
 c.strokeStyle='#513e59';c.lineWidth=2.5;c.beginPath();let pen=false;for(const p of curvePoints){if(p.value===null){pen=false;continue;}if(pen)c.lineTo(x(p.time),y(p.value));else c.moveTo(x(p.time),y(p.value));pen=true;}c.stroke();
 for(const p of soundPoints){const px=x(p.time),py=p.value===null?b:y(p.value);c.fillStyle=p.value===null?'#876b3f':'#722e77';c.beginPath();c.arc(px,py,4,0,Math.PI*2);c.fill();c.fillText(p.label,Math.min(px+4,r-c.measureText(p.label).width),p.value===null?h-12:py-7);}
}
function validEye(eye){return eye&&Array.isArray(eye.center)&&eye.center.length===3&&eye.center.every(Number.isFinite)&&Array.isArray(eye.direction)&&eye.direction.length===3&&eye.direction.every(Number.isFinite)&&Math.hypot(...eye.direction)>.0001;}
let eyeRendererState='starting',eyeCanvasView=null;
const eyeRendererStarted=performance.now();
function currentEyePoses(){
 if(studioDemo)return {left:{center:[-31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)},right:{center:[31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)}};
 return source==='live'&&sample&&sample.worn&&performance.now()-sampleReceived<500?sample.eyes:null;
}

function refreshEyeStatus(){
 const fresh=source==='live'&&sample&&performance.now()-sampleReceived<500;
 const count=fresh&&sample.worn?['left','right'].filter(side=>validEye(sample.eyes?.[side])).length:0;
 let message=studioDemo?'Synthetic demo · not real eye data':source!=='live'?'No live Neon input · pair this page to see real eyes':!fresh?'Waiting for fresh Neon samples':!sample.worn?'Neon reports glasses not worn':count?`Native Neon 3D data · ${count}/2 eyes`:'Live gaze received · 3D eye pose missing; check Compute eye state';
 if(eyeCanvasView?.active)message+=' · compatible projection (no WebGL)';
 else if(eyeRendererState==='failed'||eyeRendererState==='lost')message+=' · switching to compatible eye view';
 $('eyeStatus').textContent=message;
 $('eyeStatus').title=message;
}
eyeCanvasView=NeonEyeCanvas.mount($('eyeScene'),currentEyePoses,()=>eyeRendererState==='failed'||eyeRendererState==='lost'||(eyeRendererState==='starting'&&performance.now()-eyeRendererStarted>5000),refreshEyeStatus);
setInterval(refreshEyeStatus,250);
new p5(p=>{p.setup=()=>{const host=$('eyeScene');let renderer;try{renderer=p.createCanvas(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),p.WEBGL);renderer.parent(host);eyeRendererState='ready';}catch(error){eyeRendererState='failed';p.noLoop();refreshEyeStatus();return;}
 renderer.elt.addEventListener('webglcontextlost',event=>{event.preventDefault();eyeRendererState='lost';p.noLoop();refreshEyeStatus();});
 renderer.elt.addEventListener('webglcontextrestored',()=>{eyeRendererState='ready';p.loop();});p.pixelDensity(1);p.camera(0,0,230,0,0,0,0,1,0);new ResizeObserver(()=>p.resizeCanvas(host.clientWidth,host.clientHeight)).observe(host);};p.draw=()=>{
 if(eyeRendererState==='failed'||eyeRendererState==='lost'||eyeCanvasView?.active)return;
 const halfHeight=p.height<180?40:75,halfWidth=halfHeight*p.width/p.height;p.background('#202a32');p.ortho(-halfWidth,halfWidth,-halfHeight,halfHeight,0,1000);p.orbitControl();p.ambientLight(130);p.directionalLight(255,245,225,-.3,-.3,-1);
 const fresh=source==='live'&&sample&&sample.worn&&performance.now()-sampleReceived<500;let eyes=fresh?sample.eyes:null;
 if(studioDemo)eyes={left:{center:[-31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)},right:{center:[31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)}};
 const available=['left','right'].filter(side=>validEye(eyes?.[side]));
 if(!available.length){$('eyeNumbers').textContent='The connector must supply eye centers and optical axes. No animated eyes are drawn when data is missing.';return;}
 const origin=[0,1,2].map(i=>available.reduce((s,side)=>s+eyes[side].center[i],0)/available.length);
 $('eyeNumbers').textContent=available.map(side=>`${side==='left'?'Left':'Right'} pupil: ${Number.isFinite(eyes[side].pupilDiameter)?eyes[side].pupilDiameter.toFixed(2)+' mm':'Unavailable'}`).join(' · ');
 for(const side of available){const eye=eyes[side],len=Math.hypot(...eye.direction),n=eye.direction.map(v=>v/len),axis=[-n[1],n[0],0];p.push();p.translate(...eye.center.map((v,i)=>(v-origin[i])*1.6));const angle=Math.acos(clamp(n[2],-1,1));if(Math.hypot(...axis)>.0001)p.rotate(angle,axis);else if(n[2]<0)p.rotateY(Math.PI);p.noStroke();p.ambientMaterial(220,225,226);p.sphere(19.2,24,16);p.translate(0,0,19.25);p.fill('#6d9e9e');p.circle(0,0,17);if(Number.isFinite(eye.pupilDiameter)&&eye.pupilDiameter>0){p.translate(0,0,.15);p.fill('#101a21');p.circle(0,0,eye.pupilDiameter*1.6);}p.stroke('#ebbf7a');p.line(0,0,0,0,0,24);p.pop();}
 };});
if(new URLSearchParams(location.search).get('neon')==='1')connectRealEyes();
