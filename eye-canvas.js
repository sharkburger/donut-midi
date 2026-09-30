/* CPU projection of native 3D poses for browsers without usable WebGL. */
(function(root){
 const valid=e=>e&&[e.center,e.direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite))&&Math.hypot(...e.direction)>1e-8;
 function project(eyes,w,h){
  const list=['left','right'].filter(side=>valid(eyes?.[side])).map(side=>({side,...eyes[side]}));if(!list.length)return [];
  const mid=[0,1,2].map(i=>list.reduce((s,e)=>s+e.center[i],0)/list.length);
  const extentX=Math.max(...list.map(e=>Math.abs(e.center[0]-mid[0])))+16,extentY=Math.max(...list.map(e=>Math.abs(e.center[1]-mid[1])))+16;
  const scale=Math.max(0,Math.min(w/(2*extentX+10),h/(2*extentY+10)));
  return list.map(e=>{const len=Math.hypot(...e.direction);return {side:e.side,x:w/2+(e.center[0]-mid[0])*scale,y:h/2+(e.center[1]-mid[1])*scale,r:12*scale,n:e.direction.map(v=>v/len),pupil:Number.isFinite(e.pupilDiameter)&&e.pupilDiameter>0?Math.min(12,e.pupilDiameter/2)*scale:null,iris:5.3*scale};});
 }
 function draw(ctx,w,h,eyes){
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#202a32';ctx.fillRect(0,0,w,h);
  for(const e of project(eyes,w,h)){if(!e.r)continue;ctx.save();const shade=ctx.createRadialGradient(e.x-e.r*.3,e.y-e.r*.4,e.r*.05,e.x,e.y,e.r);shade.addColorStop(0,'#ffffff');shade.addColorStop(.7,'#d9e0df');shade.addColorStop(1,'#87928f');ctx.fillStyle=shade;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.clip();
   if(e.n[2]>0){const x=e.x+e.n[0]*e.r,y=e.y+e.n[1]*e.r,angle=Math.atan2(e.n[1],e.n[0])+Math.PI/2;ctx.fillStyle='#719fa0';ctx.beginPath();ctx.ellipse(x,y,e.iris,e.iris*e.n[2],angle,0,Math.PI*2);ctx.fill();if(e.pupil!==null){ctx.fillStyle='#121d24';ctx.beginPath();ctx.ellipse(x,y,e.pupil,e.pupil*e.n[2],angle,0,Math.PI*2);ctx.fill();}}
   ctx.restore();
  }
 }
 function mount(host,getEyes,unavailable,onChange=()=>{}){
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Compatible projection of 3D eye data');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none';host.style.position='relative';host.append(canvas);
  const button=document.createElement('button');button.type='button';button.style.cssText='position:absolute;right:5px;top:5px;z-index:3;font-size:10px;padding:4px 6px;background:#202a32;color:#fff;border-color:#64747b';host.append(button);
  let manual=new URLSearchParams(location.search).get('eyes')==='canvas',active=false,disposed=false;
  button.onclick=()=>{manual=!manual;};
  const view={get active(){return active;},dispose(){disposed=true;canvas.remove();button.remove();}};
  function frame(){if(disposed)return;const next=manual||unavailable();if(next!==active){active=next;onChange(active);}canvas.hidden=!active;button.textContent=active?'Compatible eye view':'Use compatible eye view';button.setAttribute('aria-pressed',String(active));
   if(active){const w=host.clientWidth,h=host.clientHeight,dpr=devicePixelRatio||1;if(w&&h){const nw=Math.round(w*dpr),nh=Math.round(h*dpr);if(canvas.width!==nw||canvas.height!==nh){canvas.width=nw;canvas.height=nh;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);draw(ctx,w,h,getEyes());}}
   requestAnimationFrame(frame);
  }requestAnimationFrame(frame);return view;
 }
 const api={project,draw,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NeonEyeCanvas=api;
})(globalThis);
