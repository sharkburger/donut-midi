/* Views consume the same library instance; they never open a second connection. */
const consolePanel=document.createElement('section');consolePanel.className='console-views';
consolePanel.innerHTML=`<section class="eye-view"><h2>Eyes <small id="eye-kind">Mouse simulation</small></h2><div id="library-eyes"></div><p id="eye-caption">Synthetic preview · not real eye data</p></section><section class="state-view"><h2>State & sound</h2><canvas id="library-curve" aria-label="Self-reported state timeline"></canvas><select id="feeling" aria-label="Self-reported feeling"><option value="">Choose your feeling</option><option value="0.5">Relaxed</option><option value="1.5">Focused</option><option value="2.5">Stressed</option><option value="3.5">Confused</option></select><p>Self-report, not automatic cognitive detection.</p></section>`;
document.querySelector('.layout').append(consolePanel);
const expand=document.createElement('button');expand.id='expand';expand.textContent='⛶ Fullscreen console';document.querySelector('.tabs').append(expand,document.querySelector('#audio'),document.querySelector('#clear'));
const matOnly=document.createElement('button');matOnly.id='mat-only';matOnly.textContent='Maximize mat';matOnly.setAttribute('aria-pressed','false');document.querySelector('.tabs').append(matOnly);
function restoreConsole(){document.body.classList.remove('library-full','mat-only');expand.textContent='⛶ Fullscreen console';matOnly.setAttribute('aria-pressed','false');}
async function enterConsole(){if(document.body.classList.contains('library-full')){restoreConsole();if(document.fullscreenElement)await document.exitFullscreen();return;}document.body.classList.add('library-full');expand.textContent='↙ Return';try{await document.documentElement.requestFullscreen();}catch{} }
expand.onclick=enterConsole;matOnly.onclick=async()=>{if(!document.body.classList.contains('library-full'))await enterConsole();const only=document.body.classList.toggle('mat-only');matOnly.setAttribute('aria-pressed',String(only));matOnly.textContent=only?'Show eyes & state':'Maximize mat';};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){restoreConsole();matOnly.textContent='Maximize mat';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){restoreConsole();matOnly.textContent='Maximize mat';}});
const curveHistory=[],noteHistory=[];
neon.on('dwell',()=>{if(mode==='music')noteHistory.push({time:performance.now(),value:Number(document.querySelector('#feeling').value||.1)});});
new p5(p=>{
 p.setup=()=>{const host=document.querySelector('#library-eyes');p.createCanvas(host.clientWidth,host.clientHeight,p.WEBGL).parent(host);p.pixelDensity(1);new ResizeObserver(()=>p.resizeCanvas(host.clientWidth,host.clientHeight)).observe(host);};
 p.draw=()=>{
  p.background('#202a32');p.ortho(-85*p.width/Math.max(1,p.height),85*p.width/Math.max(1,p.height),-85,85,0,1500);p.ambientLight(145);p.directionalLight(255,245,235,-.3,-.3,-1);
  const live=neon.mode==='live',fresh=neon.sample&&performance.now()-neon.received<neon.maxAge&&neon.sample.worn;
  const gaze=neon.gaze;let eyes=live&&fresh?neon.sample.eyes:null;
  if(neon.mode==='mouse'){const dx=((gaze?.x??.5)-.5)*.8,dy=((gaze?.y??.5)-.5)*.6;eyes={left:{center:[-31,0,0],direction:[dx,dy,1],pupilDiameter:4},right:{center:[31,0,0],direction:[dx,dy,1],pupilDiameter:4}};}
  const valid=e=>e&&[e.center,e.direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite))&&Math.hypot(...e.direction)>.0001;
  const available=['left','right'].filter(side=>valid(eyes?.[side]));document.querySelector('#eye-kind').textContent=live?'Neon live':neon.mode==='mouse'?'Mouse simulation':'Disconnected';document.querySelector('#eye-caption').textContent=live?(available.length?`Native Neon 3D · ${available.length}/2 eyes`:'Waiting for valid 3D eye data'):neon.mode==='mouse'?'Synthetic preview · not real eye data':'No eye data';
  if(!available.length)return;const origin=[0,1,2].map(i=>available.reduce((sum,side)=>sum+eyes[side].center[i],0)/available.length);
  for(const side of available){const eye=eyes[side],len=Math.hypot(...eye.direction),n=eye.direction.map(v=>v/len),axis=[-n[1],n[0],0];p.push();p.translate(...eye.center.map((v,i)=>(v-origin[i])*1.6));const angle=Math.acos(Math.max(-1,Math.min(1,n[2])));if(Math.hypot(...axis)>.0001)p.rotate(angle,axis);else if(n[2]<0)p.rotateY(Math.PI);p.noStroke();p.ambientMaterial(230);p.sphere(24,24,16);p.translate(0,0,24.1);p.fill('#729b9c');p.circle(0,0,21);if(Number.isFinite(eye.pupilDiameter)&&eye.pupilDiameter>0){p.translate(0,0,.2);p.fill('#101a21');p.circle(0,0,eye.pupilDiameter*2);}p.pop();}
 };
});
let lastCurve=0;
function drawLibraryCurve(now){
 if(now-lastCurve>100){const value=document.querySelector('#feeling').value;curveHistory.push({time:now,value:value===''?null:Number(value)});lastCurve=now;}
 while(curveHistory[0]?.time<now-30000)curveHistory.shift();while(noteHistory[0]?.time<now-30000)noteHistory.shift();
 const c=document.querySelector('#library-curve'),w=c.clientWidth,h=c.clientHeight,dpr=devicePixelRatio||1;
 if(w>0&&h>0){if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const left=60,right=w-8,bottom=h-25,top=8,x=t=>left+(t-now+30000)/30000*(right-left),y=v=>bottom-v/4*(bottom-top);ctx.font='10px system-ui';['Relaxed','Focused','Stressed','Confused'].forEach((name,i)=>{ctx.fillStyle=['#dfe3ca','#d5e2ea','#f1dfbd','#e2d5e5'][i];ctx.fillRect(left,y(i+1),right-left,(bottom-top)/4);ctx.fillStyle='#382e29';ctx.fillText(name,0,y(i+.5)+3);});ctx.strokeStyle='#6c4b70';ctx.lineWidth=2;ctx.beginPath();let pen=false;for(const point of curveHistory){if(point.value===null){pen=false;continue;}if(pen)ctx.lineTo(x(point.time),y(point.value));else ctx.moveTo(x(point.time),y(point.value));pen=true;}ctx.stroke();ctx.fillStyle='#cc643e';for(const note of noteHistory){ctx.beginPath();ctx.arc(x(note.time),y(note.value),3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#766958';ctx.fillText('−30s · sound timeline',left,h-7);ctx.fillText('Now',w-26,h-7);}
 requestAnimationFrame(drawLibraryCurve);
}requestAnimationFrame(drawLibraryCurve);
