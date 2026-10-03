/* p5.neon-effects 0.1 · MIT · reusable workshop helpers, no extra connection. */
(function(root){
 const finite=x=>typeof x==='number'&&Number.isFinite(x),positive=x=>finite(x)&&x>0;
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
 function read(neon){
  const s=neon.sample,now=neon.clock(),live=neon.mode==='live',fresh=!!s&&now-neon.received<neon.maxAge,worn=fresh&&s.worn===true;
  const eye=e=>worn&&live&&e&&vector(e.center)&&vector(e.direction)&&Math.hypot(...e.direction)>1e-5?e:null;
  const left=eye(s?.eyes?.left),right=eye(s?.eyes?.right);
  const l=live&&worn&&positive(s.pupilLeft)?s.pupilLeft:null,r=live&&worn&&positive(s.pupilRight)?s.pupilRight:null;
  return {live,simulation:neon.mode==='mouse',fresh,worn,gaze:neon.gaze,pupil:l!==null&&r!==null?(l+r)/2:null,left,right,
   aperture:left&&right&&finite(left.aperture)&&finite(right.aperture)&&left.aperture>=0&&right.aperture>=0?(left.aperture+right.aperture)/2:null,
   stamp:finite(s?.deviceTimestamp)?s.deviceTimestamp:null};
 }
 class Trail{
  constructor(lifetime=1200){this.lifetime=lifetime;this.points=[];this.previous=null;}
  update(gaze,now){this.points=this.points.filter(p=>now-p.time<this.lifetime);if(gaze){if(this.previous)this.points.push({a:this.previous,b:{...gaze},time:now});this.previous={...gaze};}else this.previous=null;if(this.points.length>600)this.points.splice(0,this.points.length-600);}
  draw(p,color='#008d95',weight=3){p.push();p.strokeWeight(weight);for(const s of this.points){const c=p.color(color);c.setAlpha(255*(1-(p.millis()-s.time)/this.lifetime));p.stroke(c);p.line(s.a.x*p.width,s.a.y*p.height,s.b.x*p.width,s.b.y*p.height);}p.pop();}
 }
 class Particles{
  constructor(limit=400,random=Math.random){this.limit=limit;this.random=random;this.items=[];this.last=null;}
  emit(x,y,count=5){for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,v=.025+this.random()*.1;this.items.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,max:1});}if(this.items.length>this.limit)this.items.splice(0,this.items.length-this.limit);}
  update(now){const dt=this.last===null?0:Math.max(0,Math.min(.05,(now-this.last)/1000));this.last=now;for(const a of this.items){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;}this.items=this.items.filter(a=>a.life>0);}
  draw(p,color='#008d95'){p.push();p.noStroke();for(const a of this.items){const c=p.color(color);c.setAlpha(220*a.life);p.fill(c);p.circle(a.x*p.width,a.y*p.height,2+6*a.life);}p.pop();}
 }
 // Closed -> reopened candidate after individual open-eye reference. Not Pupil Labs' blink detector.
 class BlinkGate{
  constructor(){this.reference=null;this.lastStamp=null;this.lastAt=null;this.closedAt=null;this.armed=false;this.lastBlink=-Infinity;}
  setReference(value){if(!positive(value))throw Error('Use a positive open-eye aperture reference.');this.reference=value;this.reset();}
  reset(){this.lastStamp=null;this.lastAt=null;this.closedAt=null;this.armed=false;}
  update(input,now){
   if(!input.live||!input.fresh||!input.worn||input.aperture===null||input.stamp===null||!this.reference){this.reset();return false;}
   if(input.stamp===this.lastStamp)return false;
   if(this.lastAt!==null&&(now-this.lastAt>150||input.stamp<this.lastStamp)){this.closedAt=null;this.armed=false;}
   this.lastAt=now;this.lastStamp=input.stamp;const ratio=input.aperture/this.reference;
   if(ratio>.7){const elapsed=this.closedAt===null?null:now-this.closedAt;this.closedAt=null;this.armed=true;if(elapsed!==null&&elapsed>=60&&elapsed<=700&&now-this.lastBlink>300){this.lastBlink=now;return true;}}
   else if(ratio<.35&&this.armed&&this.closedAt===null){this.closedAt=now;this.armed=false;}
   return false;
  }
 }
 // A fixed 3:2 mat; all effects are clipped away from the corner tags.
 function canvas(p,neon){const w=Math.max(1,Math.min(p.windowWidth,(p.windowHeight-64)*1.5));const c=p.createCanvas(w,w/1.5);c.style('margin','64px auto 0');neon.useMouse(c);return c;}
 function resize(p){const w=Math.max(1,Math.min(p.windowWidth,(p.windowHeight-64)*1.5));p.resizeCanvas(w,w/1.5);}
 function begin(p,mat,title){p.background('#fbfaf6');if(mat)p.image(mat,0,0,p.width,p.height);p.push();p.noStroke();p.fill('#342e28');p.textAlign(p.CENTER,p.CENTER);p.textSize(12);p.text(title,p.width/2,p.height*.1);p.pop();}
 function clip(p,draw){p.push();const c=p.drawingContext;c.save();c.beginPath();c.rect(p.width*.14,p.height*.20,p.width*.72,p.height*.60);c.clip();try{draw();}finally{c.restore();p.pop();}}
 function inside(g){return g&&g.x>.14&&g.x<.86&&g.y>.2&&g.y<.8?g:null;}
 function dot(p,g,color='#008d95'){if(!g)return;p.push();p.noStroke();p.fill(color);p.circle(g.x*p.width,g.y*p.height,16);p.pop();}
 function regions(dwellMs=600){return ['A','B','C'].map((id,i)=>({id,x:.17+i*.23,y:.33,width:.20,height:.32,dwellMs}));}
 function boxes(p,neon,hits={}){p.push();for(const r of neon.regions){p.stroke('#008d95');p.fill(neon.active?.id===r.id?'#c4e7df':'#eee9de');p.rect(r.x*p.width,r.y*p.height,r.width*p.width,r.height*p.height,12);p.fill('#342e28');p.noStroke();p.textAlign(p.CENTER,p.CENTER);p.textSize(18);p.text(r.id+' · '+(hits[r.id]||0), (r.x+r.width/2)*p.width,(r.y+r.height/2)*p.height);if(neon.active?.id===r.id){p.fill('#008d95');p.rect(r.x*p.width,(r.y+r.height-.02)*p.height,r.width*p.width*neon.progress,.02*p.height);}}p.pop();}
 function label(p,text){p.push();p.noStroke();p.fill('#342e28');p.textAlign(p.CENTER,p.CENTER);p.textSize(11);p.text(text,p.width/2,p.height*.74);p.pop();}
 // Compatible shaded projection of native 3D optical axes; it is not eye-camera video.
 function eyes(p,input,syntheticGaze=null,pupil=4){
  const native=[input.left,input.right];p.push();p.noStroke();
  for(let i=0;i<2;i++){
   const e=native[i],sim=input.simulation===true;if(!sim&&!e)continue;
   const dir=sim?[((syntheticGaze?.x??.5)-.5)*.9,((syntheticGaze?.y??.5)-.5)*.7,1]:e.direction,len=Math.hypot(...dir);
   const x=p.width*(i===0?.35:.65),y=p.height*.46,r=Math.min(p.width*.11,p.height*.19);
   for(let n=20;n>0;n--){p.fill(160+(20-n)*4);p.circle(x-r*.10*(1-n/20),y-r*.12*(1-n/20),r*2*n/20);}
   p.fill('#6c9b94');const dx=p.constrain(dir[0]/len,-.75,.75)*r,dy=p.constrain(dir[1]/len,-.75,.75)*r;
   p.circle(x+dx,y+dy,r*.86);const diameter=sim?pupil:e.pupilDiameter;
   if(positive(diameter)){p.fill('#112329');p.circle(x+dx,y+dy,r*Math.min(.65,diameter/12));}
   p.fill('white');p.circle(x+dx-r*.12,y+dy-r*.12,r*.10);
  }p.pop();
 }
 const api={read,Trail,Particles,BlinkGate,canvas,resize,begin,clip,inside,dot,regions,boxes,label,eyes};
 if(typeof module!=='undefined')module.exports=api;else root.NeonEffects=api;
})(typeof window!=='undefined'?window:globalThis);
