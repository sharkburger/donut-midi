const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const E=require('../library/p5.neon-effects'),{Neon}=require('../library/p5.neon'),{zip}=require('../library/project-zip');
const eye={center:[0,0,0],direction:[0,0,1],pupilDiameter:4,aperture:8};
test('eye measurements work without surface mapping; missing, stale, unworn and mouse values are never live physiology',()=>{
 let now=0;const n=new Neon({clock:()=>now});n.mode='live';n.accept({worn:true,surfaceValid:false,pupilLeft:3,pupilRight:5,deviceTimestamp:1,eyes:{left:eye,right:eye}});
 assert.equal(E.read(n).pupil,4);assert.equal(E.read(n).aperture,8);assert.equal(E.read(n).gaze,null);now=501;assert.equal(E.read(n).left,null);now=0;n.sample.worn=false;assert.equal(E.read(n).pupil,null);n.sample.worn=true;n.mode='mouse';assert.equal(E.read(n).pupil,null);assert.equal(E.read(n).aperture,null);
});
test('blink candidates require calibrated valid closure/reopen; no duplicate, dropout, long closure or mouse events',()=>{
 const g=new E.BlinkGate();g.setReference(8);let seq=0;const sample=(aperture,patch={})=>({live:true,fresh:true,worn:true,stamp:++seq,aperture,...patch});
 assert.equal(g.update(sample(8),0),false);assert.equal(g.update(sample(1),50),false);assert.equal(g.update(sample(8),150),true);
 g.update(sample(8),500);g.update(sample(1),550);g.update(sample(null),600);assert.equal(g.update(sample(8),650),false);
 g.update(sample(1),700);assert.equal(g.update(sample(8),1000),false); // >150ms gap, no inferred blink
 assert.equal(g.update(sample(8,{live:false}),1100),false);
 const d=sample(8);g.update(d,1200);assert.equal(g.update({...d,aperture:1},1250),false);
});
test('particles and trails expire and remain bounded; gaze gaps do not connect lines',()=>{
 const field=new E.Particles(20,()=>.5);field.emit(.5,.5,100);assert.equal(field.items.length,20);for(let t=0;t<2000;t+=50)field.update(t);assert.equal(field.items.length,0);
 const trail=new E.Trail(100);trail.update({x:0,y:0},0);trail.update(null,20);trail.update({x:1,y:1},40);assert.equal(trail.points.length,0);trail.update({x:.5,y:.5},50);assert.equal(trail.points.length,1);trail.update(null,200);assert.equal(trail.points.length,0);
});
test('every workshop effect loads and renders in mouse and missing-live modes',()=>{
 for(const file of fs.readdirSync('library/templates')){
  let p,now=0;const n=new Neon({clock:()=>now});n.useMouse=()=>n.mode='mouse';
  const noop=()=>{},controls=()=>({elt:{},position:noop,style:noop,attribute:noop,mousePressed:noop,value:()=>4});
  const context={document:{hidden:false,addEventListener:noop},window:{addEventListener:noop},neon:n,MAT_URL:'mat',DEFAULT_IMAGE_URL:'donut',NeonEffects:E,console:{log:noop},p5:function(fn){p=new Proxy({windowWidth:900,windowHeight:600,width:800,height:533,CENTER:'center',drawingContext:new Proxy({},{get:()=>noop}),millis:()=>now,constrain:(x,a,b)=>Math.max(a,Math.min(b,x)),color:()=>({setAlpha:noop}),createCanvas(w,h){p.width=w;p.height=h;return {style:noop}},createButton:controls,createSpan:controls,createSlider:controls,loadImage:()=>({width:100,height:100,get:()=>({resize:noop,loadPixels:noop,pixels:[]})})},{get:(o,k)=>k in o?o[k]:noop});fn(p);}};
  assert.doesNotThrow(()=>vm.runInNewContext(fs.readFileSync('library/templates/'+file,'utf8'),context),file);p.preload();p.setup();n.accept({x:.4,y:.4,worn:true,surfaceValid:true});for(let i=0;i<4;i++){now+=100;p.draw();}n.mode='live';now+=1000;assert.doesNotThrow(()=>p.draw(),file+' missing live');
 }
});
test('project zip has valid signatures and excludes unintended files',async()=>{const data=new Uint8Array(await zip({'sketch.js':'// test','README.txt':'hello'}).arrayBuffer());assert.equal(new DataView(data.buffer).getUint32(0,true),0x04034b50);assert.equal(new DataView(data.buffer).getUint32(data.length-22,true),0x06054b50);assert.throws(()=>zip({'../secrets':'no'}));});

test('pixel mirror samples image colors once, flips only gaze neighbors, and restores on lost input',()=>{
 let samples=0;const image={width:200,height:100,get(){samples++;return {resize(w,h){this.pixels=Array.from({length:w*h*4},(_,i)=>[240,60,20,128][i%4]);},loadPixels(){}};}};
 const mirror=new E.PixelMirror({columns:20,radius:1.5,returnMs:100,speedMs:100});mirror.setImage(image);
 assert.equal(samples,1);assert.equal(mirror.tiles.length,200);assert.equal(mirror.tiles[0].color[0],243);
 const b=mirror.bounds,g={x:b.x+b.width/2,y:b.y+b.height/2};
 mirror.update(null,0);mirror.update(g,50);assert(mirror.tiles.some(t=>t.flip>0));assert.equal(mirror.tiles[0].flip,0);
 const peak=Math.max(...mirror.tiles.map(t=>t.flip));mirror.update({x:0,y:0},100);for(let t=200;t<1200;t+=50)mirror.update(null,t);
 assert(Math.max(...mirror.tiles.map(t=>t.flip))<peak*.01);assert.equal(samples,1);
 mirror.reset();assert(mirror.tiles.every(t=>t.flip===0));assert(b.y>=.2&&b.y+b.height<.8);
});

test('continuous dwell starts at 3 s, grows through 10 s, resets outside and on stale frame gaps',()=>{
 const t=new E.DwellRamp(3000,7000);let r;
 for(let now=0;now<=2900;now+=100)r=t.update(true,now);
 assert.equal(r.active,false);r=t.update(true,3000);assert.equal(r.active,true);assert.equal(r.level,0);
 for(let now=3100;now<=10000;now+=100)r=t.update(true,now);assert.equal(r.level,1);
 assert.equal(t.update(false,10010).elapsed,0);t.update(true,11000);assert.equal(t.update(true,11400).elapsed,0);
});
test('scream output is capped and silence is scheduled even when rendering stalls',()=>{
 const scheduled=[];let stopped=0,disconnected=0;
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(...v){scheduled.push(v)},setValueAtTime(...v){scheduled.push(v)}});
 const node=()=>({connect(){},disconnect(){disconnected++},start(){},stop(){stopped++},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
 const ctx={currentTime:1,destination:{},createGain:node,createDynamicsCompressor:node,createOscillator:node,createBiquadFilter:node};
 const voice=new E.ScreamVoice(ctx);voice.update(true,9,9);assert(scheduled.some(v=>v[0]===0&&v[1]===1.3));
 assert(scheduled.some(v=>Math.abs(v[0]-.159)<1e-6));voice.dispose();assert.equal(stopped,2);assert(disconnected>=10);voice.dispose();assert.equal(stopped,2);
});
