'use strict';
const gazeArt=new GazeArt(),artCanvas=document.createElement('canvas');artCanvas.id='gazeArtCanvas';artCanvas.setAttribute('aria-label','Decorative gaze trail, dwell progress and note-trigger ripples');artCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';fit.append(artCanvas);
const artControl=document.createElement('button');artControl.id='gazeArtToggle';artControl.textContent='Gaze art · on';artControl.setAttribute('aria-pressed','true');$('fullController').after(artControl);
const artHint=document.createElement('span');artHint.id='gazeArtHint';artHint.style.cssText='font-size:10px;display:none';dash.querySelector('.score-bottom').append(artHint);
let gazeArtEnabled=true,gazeArtFrame=0,gazeArtSource=source;
const reducedGazeMotion=matchMedia('(prefers-reduced-motion: reduce)');
artControl.onclick=()=>{gazeArtEnabled=!gazeArtEnabled;artControl.textContent='Gaze art · '+(gazeArtEnabled?'on':'off');artControl.setAttribute('aria-pressed',String(gazeArtEnabled));gazeArt.clear();};
const artStyle=document.createElement('style');artStyle.textContent='#gazeArtToggle{font-size:11px;padding:6px;width:100%;margin-top:5px}.controller-mode.gaze-art-active .live-gaze{visibility:hidden}.controller-mode .score-bottom{flex-wrap:wrap;height:auto}.controller-mode #dwellStatus{display:none}';document.head.append(artStyle);
function onGazeArtNote(zone){if(gazeArtEnabled&&document.body.classList.contains('controller-mode'))gazeArt.hit(performance.now(),zone);}
function paintGazeArt(now){
 requestAnimationFrame(paintGazeArt);if(now-gazeArtFrame<32)return;gazeArtFrame=now;
 const measuring=!!cognitiveEvidence.capture||researchRunning();
 artControl.textContent=measuring&&gazeArtEnabled?'Gaze art · paused for measurement':'Gaze art · '+(gazeArtEnabled?'on':'off');
 const active=gazeArtEnabled&&document.body.classList.contains('controller-mode')&&!document.hidden&&!measuring;
 artCanvas.hidden=!active;document.body.classList.toggle('gaze-art-active',active);artHint.style.display=active?'inline':'none';
 if(!active){gazeArt.clear();return;}
 if(source!==gazeArtSource){gazeArt.clear();gazeArtSource=source;}
 const fresh=sample&&now-sampleReceived<500,valid=fresh&&sample.worn&&sample.surfaceValid&&(source!=='replay'||replayPlaying);
 gazeArt.update(now,sample,valid,reducedGazeMotion.matches);
 artHint.textContent=!gazeArt.last?'Waiting for located gaze':source==='live'?'Live gaze · decorative trail':source==='simulate'?'Mouse trail · not eye data':'Replay trail · recorded data';
 const w=fit.clientWidth,h=fit.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(artCanvas.width!==Math.round(w*dpr)||artCanvas.height!==Math.round(h*dpr)){artCanvas.width=Math.round(w*dpr);artCanvas.height=Math.round(h*dpr);}const c=artCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);if(!gazeArt.last)return;
 // Keep each AprilTag and its white margin completely clear of decorative pixels.
 c.save();c.beginPath();c.rect(0,0,w,h);for(const x of [0,.85*w])for(const y of [0,.78*h])c.rect(x,y,.15*w,.22*h);c.clip('evenodd');
 c.lineCap='round';
 for(let i=1;i<gazeArt.points.length;i++){const a=gazeArt.points[i-1],b=gazeArt.points[i],alpha=(1-(now-b.time)/650)*.55;c.strokeStyle=`rgba(36,144,164,${alpha})`;c.lineWidth=2.5;c.beginPath();c.moveTo(a.x*w,a.y*h);c.lineTo(b.x*w,b.y*h);c.stroke();}
 for(const p of gazeArt.particles){const age=(now-p.time)/700;c.fillStyle=`rgba(204,105,148,${(1-age)*.65})`;c.beginPath();c.arc((p.x+p.vx*age)*w,(p.y+p.vy*age)*h,Math.max(.2,(1-age)*2.2),0,Math.PI*2);c.fill();}
 const q=gazeArt.last,z=zoneAt(q.x,q.y);const x=q.x*w,y=q.y*h;
 c.fillStyle='#fff';c.strokeStyle='#258da3';c.lineWidth=2;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();c.stroke();
 if(z>=0){const donut=ZONES[z],r=donut.r*w*.8,dx=donut.x*w,dy=donut.y*h;
  c.strokeStyle='rgba(42,137,153,.2)';c.lineWidth=3;c.beginPath();c.arc(dx,dy,r,0,Math.PI*2);c.stroke();
  if(dwell.zone===z){c.strokeStyle=dwell.fired?'#cb6491':'#258da3';c.lineWidth=4;c.beginPath();c.arc(dx,dy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*dwell.progress);c.stroke();}
 }
 for(const p of gazeArt.ripples){const d=ZONES[p.zone];if(!d)continue;const age=(now-p.time)/850;c.strokeStyle=`rgba(196,84,132,${1-age})`;c.lineWidth=3*(1-age);c.beginPath();c.arc(d.x*w,d.y*h,d.r*w*(.65+age*.9),0,Math.PI*2);c.stroke();}
 c.restore();
}
requestAnimationFrame(paintGazeArt);
