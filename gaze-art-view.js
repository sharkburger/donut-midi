'use strict';
const gazeArt=new GazeArt(),artCanvas=document.createElement('canvas');artCanvas.id='gazeArtCanvas';artCanvas.setAttribute('aria-label','Decorative gaze trail, dwell progress and note-trigger ripples');artCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';fit.append(artCanvas);
const artControl=document.createElement('button');artControl.id='gazeArtToggle';artControl.textContent='Gaze art · on';artControl.setAttribute('aria-pressed','true');$('fullController').after(artControl);
const artHint=document.createElement('span');artHint.id='gazeArtHint';artHint.style.cssText='font-size:10px;display:none';dash.querySelector('.score-bottom').append(artHint);
let gazeArtEnabled=true,gazeArtFrame=0,gazeArtSource=source,gazeArtDisplay=null;
const reducedGazeMotion=matchMedia('(prefers-reduced-motion: reduce)');
artControl.onclick=()=>{gazeArtEnabled=!gazeArtEnabled;artControl.textContent='Gaze art · '+(gazeArtEnabled?'on':'off');artControl.setAttribute('aria-pressed',String(gazeArtEnabled));gazeArt.clear();};
const artStyle=document.createElement('style');artStyle.textContent='#gazeArtToggle{font-size:11px;padding:6px;width:100%;margin-top:5px}.controller-mode.gaze-art-active .live-gaze{visibility:hidden}.controller-mode .score-bottom{flex-wrap:wrap;height:auto}.controller-mode #dwellStatus{display:none}';document.head.append(artStyle);
function onGazeArtNote(zone){if(gazeArtEnabled&&document.body.classList.contains('controller-mode'))gazeArt.hit(performance.now(),zone);}
function paintGazeArt(now){
 requestAnimationFrame(paintGazeArt);if(now-gazeArtFrame<16)return;const artDt=Math.min(100,now-gazeArtFrame);gazeArtFrame=now;
 const measuring=!!cognitiveEvidence.capture||researchRunning();
 artControl.textContent=measuring&&gazeArtEnabled?'Gaze art · paused for measurement':'Gaze art · '+(gazeArtEnabled?'on':'off');
 const active=gazeArtEnabled&&document.body.classList.contains('controller-mode')&&!document.hidden&&!measuring;
 artCanvas.hidden=!active;document.body.classList.toggle('gaze-art-active',active);artHint.style.display=active?'inline':'none';
 if(!active){gazeArt.clear();gazeArtDisplay=null;return;}
 if(source!==gazeArtSource){gazeArt.clear();gazeArtSource=source;gazeArtDisplay=null;}
 const fresh=sample&&now-sampleReceived<500,valid=fresh&&sample.worn&&sample.surfaceValid&&(source!=='replay'||replayPlaying);
 // This filter affects decoration only; AOI and dwell still use the original sample.
 const located=valid&&Number.isFinite(sample.x)&&Number.isFinite(sample.y)&&sample.x>=0&&sample.x<=1&&sample.y>=0&&sample.y<=1;
 if(!located)gazeArtDisplay=null;
 else if(!gazeArtDisplay||!gazeArt.last||now-gazeArt.last.time>500||reducedGazeMotion.matches)gazeArtDisplay={x:sample.x,y:sample.y};
 else {const blend=1-Math.exp(-artDt/55);gazeArtDisplay.x+=(sample.x-gazeArtDisplay.x)*blend;gazeArtDisplay.y+=(sample.y-gazeArtDisplay.y)*blend;}
 gazeArt.update(now,gazeArtDisplay,located,reducedGazeMotion.matches);
 artHint.textContent=!gazeArt.last?'Waiting for located gaze':source==='live'?'Live gaze · decorative trail':source==='simulate'?'Mouse trail · not eye data':'Replay trail · recorded data';
 const w=fit.clientWidth,h=fit.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(artCanvas.width!==Math.round(w*dpr)||artCanvas.height!==Math.round(h*dpr)){artCanvas.width=Math.round(w*dpr);artCanvas.height=Math.round(h*dpr);}const c=artCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);if(!gazeArt.last)return;
 // Keep each AprilTag and its white margin completely clear of decorative pixels.
 c.save();c.beginPath();c.rect(0,0,w,h);for(const x of [0,.85*w])for(const y of [0,.78*h])c.rect(x,y,.15*w,.22*h);c.clip('evenodd');
 c.lineCap='round';
 const path=gazeArt.points;
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],prev=path[Math.max(0,i-2)],alpha=(1-(now-b.time)/650)*.6;
  c.strokeStyle=`rgba(44,143,130,${alpha})`;c.lineWidth=2.5;c.beginPath();c.moveTo((prev.x+a.x)*.5*w,(prev.y+a.y)*.5*h);c.quadraticCurveTo(a.x*w,a.y*h,(a.x+b.x)*.5*w,(a.y+b.y)*.5*h);if(i===path.length-1)c.lineTo(b.x*w,b.y*h);c.stroke();}

 for(const p of gazeArt.particles){const age=(now-p.time)/700;c.fillStyle=`rgba(91,179,158,${(1-age)*.65})`;c.beginPath();c.arc((p.x+p.vx*age)*w,(p.y+p.vy*age)*h,Math.max(.2,(1-age)*2.2),0,Math.PI*2);c.fill();}
 const q=gazeArt.last,z=zoneAt(sample.x,sample.y);const x=q.x*w,y=q.y*h;
 // A small illustrated eyeball cursor; not a second anatomical eye measurement.
 const radius=Math.max(10,Math.min(16,w*.014));
 const shell=c.createRadialGradient(x-radius*.3,y-radius*.4,1,x,y,radius);shell.addColorStop(0,'#ffffff');shell.addColorStop(.72,'#edf6f2');shell.addColorStop(1,'#a6c9bf');
 c.fillStyle=shell;c.strokeStyle='#347d70';c.lineWidth=1.2;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();c.stroke();
 const ix=x+Math.max(-radius*.18,Math.min(radius*.18,(sample.x-q.x)*w*.25)),iy=y+Math.max(-radius*.18,Math.min(radius*.18,(sample.y-q.y)*h*.25));
 c.fillStyle='#55a994';c.beginPath();c.arc(ix,iy,radius*.56,0,Math.PI*2);c.fill();
 c.strokeStyle='#347d70';c.lineWidth=.8;for(let k=0;k<12;k++){const angle=k*Math.PI/6;c.beginPath();c.moveTo(ix+Math.cos(angle)*radius*.34,iy+Math.sin(angle)*radius*.34);c.lineTo(ix+Math.cos(angle)*radius*.51,iy+Math.sin(angle)*radius*.51);c.stroke();}
 c.fillStyle='#163e36';c.beginPath();c.arc(ix,iy,radius*.29,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(ix-radius*.14,iy-radius*.17,radius*.13,0,Math.PI*2);c.fill();
 if(z>=0){const donut=ZONES[z],r=donut.r*w*.8,dx=donut.x*w,dy=donut.y*h;
  c.strokeStyle='rgba(44,143,130,.2)';c.lineWidth=3;c.beginPath();c.arc(dx,dy,r,0,Math.PI*2);c.stroke();
  if(dwell.zone===z){c.strokeStyle=dwell.fired?'#246f63':'#4ba996';c.lineWidth=4;c.beginPath();c.arc(dx,dy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*dwell.progress);c.stroke();}
 }
 for(const p of gazeArt.ripples){const d=ZONES[p.zone];if(!d)continue;const age=(now-p.time)/850;c.strokeStyle=`rgba(44,143,130,${1-age})`;c.lineWidth=3*(1-age);c.beginPath();c.arc(d.x*w,d.y*h,d.r*w*(.65+age*.9),0,Math.PI*2);c.stroke();}
 c.restore();
}
requestAnimationFrame(paintGazeArt);
