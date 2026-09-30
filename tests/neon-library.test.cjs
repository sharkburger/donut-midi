const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Neon}=require('../library/p5.neon.js');
const region={id:'a',x:.2,y:.2,width:.2,height:.2,dwellMs:500};
const sample={x:.3,y:.3,worn:true,surfaceValid:true,pupilLeft:3,pupilRight:5};
test('dwell fires once per visit, invalid signal breaks the dwell',()=>{
 let time=0,hits=0;const n=new Neon({clock:()=>time});n.setRegions([region]);n.on('dwell',()=>hits++);
 n.accept(sample);n.update();time=300;n.accept(sample);n.update();time=550;n.accept(sample);n.update();assert.equal(hits,1);
 time=750;n.accept(sample);n.update();assert.equal(hits,1);
 n.accept({...sample,surfaceValid:false});n.update();assert.equal(n.active,null);
 n.accept(sample);n.update();time=1000;n.accept(sample);n.update();assert.equal(hits,1);
 time=1300;n.accept(sample);n.update();assert.equal(hits,2);
});
test('stale, unworn and out-of-range input clears gaze; pupil is optional',()=>{
 let time=0;const n=new Neon({clock:()=>time});n.accept(sample);assert.equal(n.pupil,4);
 time=500;assert.equal(n.gaze,null);assert.equal(n.pupil,null);
 for(const patch of [{worn:false},{surfaceValid:false},{x:null},{x:NaN},{y:1.1}]){n.accept({...sample,...patch});assert.equal(n.gaze,null);}
 n.accept({...sample,pupilLeft:null,pupilRight:4});assert.equal(n.pupil,4);
 n.accept({...sample,pupilLeft:null,pupilRight:null});assert.equal(n.pupil,null);
});
test('stale samples cannot complete a dwell, even after a delayed frame',()=>{
 let time=0,hits=0;const n=new Neon({clock:()=>time});n.setRegions([region]);n.on('dwell',()=>hits++);n.accept(sample);n.update();time=600;n.update();assert.equal(hits,0);assert.equal(n.active,null);
});
test('switching connections ignores old callbacks and clears pending gaze',async()=>{
 const callbacks=[];let stops=0;const n=new Neon({clientFactory:opts=>{callbacks.push(opts);return{start:async()=>{},stop:()=>stops++};}});
 await n.connect({code:'one'});callbacks[0].sample(sample,0);assert.ok(n.gaze);
 await n.connect({code:'two'});callbacks[0].sample(sample,0);assert.equal(n.gaze,null);
 callbacks[1].sample(sample,0);assert.ok(n.gaze);n.disconnect();callbacks[1].sample(sample,0);assert.equal(n.gaze,null);assert.equal(stops,2);
});
test('mouse holds are refreshed and listeners are released',()=>{
 let time=0,hits=0;const listeners={};global.document={hidden:false,addEventListener(){},removeEventListener(){}};
 const canvas={addEventListener:(e,f)=>listeners[e]=f,removeEventListener:e=>delete listeners[e],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};
 const n=new Neon({clock:()=>time});n.useMouse(canvas);n.setRegions([region]);n.on('dwell',()=>hits++);listeners.pointermove({clientX:30,clientY:30});n.update();time=600;n.update();assert.equal(hits,1);assert.equal(n.pupil,null);listeners.pointerleave();assert.equal(n.gaze,null);n.dispose();assert.equal(Object.keys(listeners).length,0);delete global.document;
});
test('AOI validation preserves the previous set on invalid replacement',()=>{
 const n=new Neon();n.setRegions([region]);assert.throws(()=>n.setRegions([{...region,width:2}]));assert.equal(n.regions[0].id,'a');assert.throws(()=>n.setRegions([region,region]));
});
test('an invalid sample or a long gap between frames restarts dwell',()=>{
 let time=0,hits=0;const n=new Neon({clock:()=>time});n.setRegions([region]);n.on('dwell',()=>hits++);
 n.accept(sample);n.update();time=600;n.accept(sample);n.update();assert.equal(hits,0);
 time=800;n.accept({...sample,worn:false});n.accept(sample);n.update();
 time=1100;n.accept(sample);n.update();assert.equal(hits,0);
 time=1350;n.accept(sample);n.update();assert.equal(hits,1);
});
