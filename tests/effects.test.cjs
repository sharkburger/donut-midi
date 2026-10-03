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
  const noop=()=>{},controls=()=>({elt:{},position:noop,attribute:noop,mousePressed:noop,value:()=>4});
  const context={neon:n,MAT_URL:'mat',NeonEffects:E,console:{log:noop},p5:function(fn){p=new Proxy({windowWidth:900,windowHeight:600,width:800,height:533,CENTER:'center',drawingContext:new Proxy({},{get:()=>noop}),millis:()=>now,constrain:(x,a,b)=>Math.max(a,Math.min(b,x)),color:()=>({setAlpha:noop}),createCanvas(w,h){p.width=w;p.height=h;return {style:noop}},createButton:controls,createSlider:controls,loadImage:()=>({width:100,height:100})},{get:(o,k)=>k in o?o[k]:noop});fn(p);}};
  assert.doesNotThrow(()=>vm.runInNewContext(fs.readFileSync('library/templates/'+file,'utf8'),context),file);p.preload();p.setup();n.accept({x:.4,y:.4,worn:true,surfaceValid:true});for(let i=0;i<4;i++){now+=100;p.draw();}n.mode='live';now+=1000;assert.doesNotThrow(()=>p.draw(),file+' missing live');
 }
});
test('project zip has valid signatures and excludes unintended files',async()=>{const data=new Uint8Array(await zip({'sketch.js':'// test','README.txt':'hello'}).arrayBuffer());assert.equal(new DataView(data.buffer).getUint32(0,true),0x04034b50);assert.equal(new DataView(data.buffer).getUint32(data.length-22,true),0x06054b50);assert.throws(()=>zip({'../secrets':'no'}));});
