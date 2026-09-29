const {test}=require('node:test');const assert=require('node:assert/strict');
const {GazePatterns}=require('../patterns.js');
test('continuous dwell anchors, missing data clears evidence',()=>{const p=new GazePatterns();for(let t=0;t<=2200;t+=100)p.update(t,0,true);assert.equal(p.update(2300,0,true).kind,'anchor');assert.equal(p.update(2400,0,false).kind,'unknown');assert.equal(p.update(2500,0,true).seconds,0);});
test('four direct AOI transitions are exploration; gaps do not join visits',()=>{const p=new GazePatterns();[0,1,0,1,0].forEach((z,i)=>p.update(i*200,z,true));assert.equal(p.update(900,0,true).kind,'explore');assert.equal(p.update(2000,0,true).switches,0);});
test('rest never becomes sustained AOI dwell',()=>{const p=new GazePatterns();for(let t=0;t<4000;t+=100)assert.notEqual(p.update(t,-1,true).kind,'anchor');});
