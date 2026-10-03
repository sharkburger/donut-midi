const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const L=require('../library/layout-core');
test('one layout survives code editing and exports the exact physical size and coordinates',()=>{
 const code=fs.readFileSync('library/physical-template.js','utf8'),v=L.read(code);assert.equal(v.physical,true);v.donuts[0].x=.2;v.donuts[0].note=72;v.donuts[0].name='Berry <&>';const modified=L.write(code,v);assert.deepEqual(L.read(modified),v);assert.ok(modified.includes('neon.setRegions(DONUT_LAYOUT.donuts.map'));
 const svg=L.svg(v,'<rect fill="black"/>');assert.match(svg,/width="600mm" height="400mm"/);assert.match(svg,/cx="240" cy="256" r="84/);assert.match(svg,/Berry &lt;&amp;&gt;/);assert.match(svg,/MIDI 72/);assert.match(svg,/h 200/);
});
test('reject ambiguous overlapping, out-of-bounds or marker-obscuring layouts and invalid notes',()=>{
 for(const mutate of [v=>v.donuts[1].x=v.donuts[0].x,v=>v.donuts[0].y=.1,v=>v.donuts[0].note=NaN,v=>v.donuts[1].id=v.donuts[0].id,v=>v.widthCm=0]){const v=L.defaults();mutate(v);assert.throws(()=>L.validate(v));}
 assert.throws(()=>L.read('const x=1'),/Load the Physical/);
});
test('print marker modules are identical to the established tracked surface',()=>{
 const black=s=>s.match(/<rect [^>]*fill="black"[^>]*\/>/g);
 assert.deepEqual(black(fs.readFileSync('markers.svg','utf8')),black(fs.readFileSync('monitor-mat.svg','utf8')));
});
test('physical template uses the same layout for dwell targets and actual sound notes',async()=>{
 const vm=require('node:vm');let setup,regions,onDwell,enable,frequency;const l=L.defaults();l.physical=true;l.donuts[0].x=.2;l.donuts[0].note=72;
 const code=L.write(fs.readFileSync('library/physical-template.js','utf8'),l);
 class AudioContext{constructor(){this.state='running';this.currentTime=0;}async resume(){}createOscillator(){const o={frequency:{},connect(){},start(){frequency=o.frequency.value;},stop(){}};return o;}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
 const neon={useMouse(){},setRegions(r){regions=r},on(_,f){onDwell=f},resetDwell(){}};
 vm.runInNewContext(code,{neon,MAT_URL:'',AudioContext,console:{log(){}},p5:function(fn){const p={windowWidth:800,windowHeight:500,createCanvas:()=>({style(){}}),createButton:()=>({position(){},mousePressed(f){enable=f},html(){}})};fn(p);setup=p.setup;}});
 setup();assert.equal(regions[0].x,.2-.07);assert.equal(regions[0].note,72);assert.equal(regions[0].dwellMs,250);await enable();onDwell({region:regions[0]});assert.ok(Math.abs(frequency-523.2511)<.001);
});

test('single physical scream target exports the same center and radius used by the sketch',()=>{
 const code=fs.readFileSync('library/templates/scream.js','utf8');const v=L.read(code);assert.equal(v.donuts.length,1);assert.equal(v.physical,true);assert.equal(v.donuts[0].x,.5);
 const svg=L.svg(v,'');assert.match(svg,/width="500mm"/);assert.match(svg,/cx="600" cy="400" r="120"/);assert.match(svg,/Look here for 3 seconds/);assert(!svg.includes('MIDI 60'));
});
