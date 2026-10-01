const {test}=require('node:test'),assert=require('node:assert/strict');
const {textScore,score,midiScores,phrases,PhraseGame,PhraseScheduler,builtinScores}=require('../game-core.js');

test('score keeps canonical donut notes and honors rests and held durations',()=>{
 const s=textScore('1 1 0:2 | 5:2 8:0.5');
 assert.deepEqual(s.events.map(e=>[e.midi,e.start,e.end,e.zone]),[[60,0,1,0],[60,1,2,0],[67,4,6,4],[72,6,6.5,7]]);
 assert.throws(()=>textScore('1 hello'),/Use 1/);assert.throws(()=>textScore('0 0'),/1–1000/);
 assert.throws(()=>textScore('{"notes":[{"note":60,"beats":-1}]}'),/duration/);
 assert.throws(()=>score('chords',72,[{midi:60,start:0,end:2},{midi:64,start:1,end:3}]),/overlapping/);
 assert.equal(score('large',72,Array.from({length:9},(_,i)=>({midi:60+i,start:i,end:i+1}))).events.length,9);
 const custom=score('custom',72,[{midi:61,start:0,end:1},{midi:66,start:1,end:2}]);assert.deepEqual(custom.pitches,[61,66]);assert.deepEqual(custom.events.map(e=>e.zone),[0,1]);
});
const chunk=(name,a)=>Buffer.concat([Buffer.from(name),Buffer.from([a.length>>>24,a.length>>>16&255,a.length>>>8&255,a.length&255]),Buffer.from(a)]);
function midi(tracks,format=1){const b=Buffer.concat([chunk('MThd',[0,format,0,tracks.length,1,224]),...tracks.map(t=>chunk('MTrk',t))]);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
const melody=[0,255,3,4,84,101,115,116,0,144,60,80,131,96,60,0,0,144,67,80,131,96,128,67,0,0,255,47,0];
test('MIDI format 0/1 parse track names, tempo, running status and velocity-zero note-off',()=>{
 const tracks=midiScores(midi([[0,255,81,3,7,161,32,0,255,47,0],melody]));
 assert.equal(tracks.length,1);assert.equal(tracks[0].title,'Test · channel 1');assert.equal(tracks[0].score.bpm,120);
 assert.deepEqual(tracks[0].score.events.map(e=>[e.midi,e.start,e.end]),[[60,0,1],[67,1,2]]);
 assert.equal(midiScores(midi([melody],0))[0].score.events.length,2);
});
test('MIDI rejects truncation, changing tempo and unsupported timing; marks chord track unavailable',()=>{
 assert.throws(()=>midiScores(new ArrayBuffer(3)),/Truncated/);
 assert.throws(()=>midiScores(midi([melody],2)),/format 0/);
 assert.throws(()=>midiScores(midi([[0,255,81,3,7,161,32,1,255,81,3,6,26,128,0,255,47,0],melody])),/Changing-tempo/);
 const chord=[0,144,60,80,0,144,64,80,131,96,128,60,0,0,128,64,0,0,255,47,0];
 assert.match(midiScores(midi([chord]))[0].error,/overlapping/);
 assert.throws(()=>midiScores(midi([[0,144,60,80,0,255,47,0]])),/without note-off/);
});

for(const song of builtinScores())test(song.title+': complete every phrase with slow gaze, a blink and delayed acquisition',()=>{
 const blocks=phrases(song);assert.deepEqual(blocks.flatMap(b=>b.events.map(e=>[e.midi,b.start+e.start,b.start+e.end])),song.events.map(e=>[e.midi,e.start,e.end]));
 const g=new PhraseGame();g.start(song,60,0,{prepMs:2000,dwellMs:600});let launched=[],scheduled=[],scheduler=null,waitingSince=0;
 for(let now=0;now<240000&&!g.done;now+=25){
  // Wait another 1.5 s after the preparation time; one 100 ms blink per dwell.
  const waitAge=now-g.readyAt;const valid=g.phase==='playing'?false:waitAge>=1500&&!(waitAge>=1800&&waitAge<1900);
  const o=g.update(now,g.blocks[g.index]?.zone??-1,valid);
  if(o.launch){assert.ok(waitAge>=2100);launched.push(o.launch.index);scheduler=new PhraseScheduler(o.launch,60);}
  if(scheduler&&!g.done&&g.phase==='playing')scheduled.push(...scheduler.take((now-g.playStart)/1000).map(e=>e.midi));
 }
 assert.equal(g.done,true);assert.equal(g.completed,blocks.length);assert.deepEqual(launched,blocks.map(b=>b.index));assert.deepEqual(scheduled,song.events.map(e=>e.midi));
});
test('Built-ins use authored variable-length motifs; pitch does not choose target',()=>{
 assert.deepEqual(builtinScores().map(s=>phrases(s).length),[13,9,9]);assert.equal(phrases(builtinScores()[0])[0].events.length,4);
 assert.deepEqual(phrases(builtinScores()[2]).slice(0,8).map(p=>p.zone),[0,1,2,3,7,6,5,4]);
});
test('waiting has no timeout; lost tracking recovers without a manual pause or skipped phrase',()=>{
 const g=new PhraseGame();g.start(textScore('1 2 | 3 4'),60,0);g.update(100000,-1,false);assert.equal(g.index,0);assert.equal(g.phase,'prepare');
 for(let t=100025;t<=100650;t+=25)g.update(t,0,true);assert.equal(g.phase,'playing');
 for(let t=100675;t<104000;t+=25)g.update(t,-1,false);assert.equal(g.completed,1);assert.equal(g.pausedAt,null);assert.equal(g.index,1);
 for(let t=104000;t<106000;t+=25)g.update(t,1,true);assert.equal(g.phase,'playing');
});
test('pause/resume freezes a phrase and resumes remaining notes rather than replaying past notes',()=>{
 const g=new PhraseGame();g.start(textScore('1:2 3 5'),60,0,{automatic:true,prepMs:0});g.update(0,-1,false);g.pause(1100);const before=g.view(1100);g.update(50000,-1,false);assert.deepEqual(g.view(50000),before);g.resume(50000);assert.equal(g.view(50000).elapsed,1);
 const scheduler=new PhraseScheduler(g.blocks[0],60,1);const due=scheduler.take(1);assert.equal(due.length,1);assert.equal(due[0].start,1);assert.equal(due[0].end,2);assert.equal(scheduler.take(1.1).length,0);assert.equal(scheduler.take(2)[0].midi,64);
});
test('short invalid gaps cannot add dwell; wrong targets and long gaps reset selection',()=>{
 const g=new PhraseGame();g.start(textScore('1'),60,0,{prepMs:0});for(let t=0;t<=300;t+=25)g.update(t,0,true);assert.equal(g.dwell,300);g.update(325,-1,false);g.update(350,0,true);assert.equal(g.dwell,300);g.update(375,1,true);assert.equal(g.dwell,0);g.update(1000,0,true);assert.equal(g.dwell,0);
});
test('MIDI grouping keeps every note and sustained duration; more than eight pitches are supported',()=>{
 const s=score('chromatic',60,Array.from({length:12},(_,i)=>({midi:60+i,start:i,end:i+1})));const p=phrases(s);assert.equal(p.length,2);assert.equal(p.flatMap(b=>b.events).length,12);assert.equal(p[0].zone,0);assert.equal(p[1].zone,1);
 const long=phrases(textScore('1:12 2 3'));assert.equal(long[0].events[0].end,12);assert.equal(long[1].start,12);
});

test('explicit rest-only phrases are retained as silence without requiring an empty target',()=>{const s=textScore('0:2 | 1 | 0:4 | 2 | 0:2');const p=phrases(s);assert.equal(p.length,2);assert.equal(p.reduce((sum,b)=>sum+b.beats,0),10);assert.deepEqual(p.flatMap(b=>b.events.map(e=>[b.start+e.start,b.start+e.end])),[[2,3],[7,8]]);});

test('early next confirmation queues once and starts at the exact boundary without re-entry',()=>{
 const g=new PhraseGame();g.start(textScore('1:2 | 3:2 | 5:2'),60,0,{prepMs:0});
 for(let t=0;t<=400;t+=25)g.update(t,0,true);
 const boundary=g.playStart+2000;let queues=0;
 for(let t=425;t<boundary;t+=25){const o=g.update(t,1,true);if(o.queue){queues++;assert.equal(o.queue.startAt,boundary);}}
 assert.equal(queues,1);assert.equal(g.queued,true);const o=g.update(boundary,1,true);assert.equal(o.launch.index,1);assert.equal(g.playStart,boundary);assert.equal(g.phase,'playing');assert.equal(g.queued,false);
});
test('partial next dwell carries across a boundary while the pointer stays in place',()=>{
 const g=new PhraseGame();g.start(textScore('1 | 3'),60,0,{prepMs:0});for(let t=0;t<=400;t+=25)g.update(t,0,true);
 for(let t=425;t<=1200;t+=25)g.update(t,0,true);
 for(let t=1225;t<=1500;t+=25)g.update(t,1,true);
 assert.equal(g.index,1);assert.equal(g.phase,'prepare');assert.equal(g.dwell,275);
 for(let t=1525;t<=1625;t+=25)g.update(t,1,true);assert.equal(g.phase,'playing');
});
test('queued selection survives pause and its boundary shifts by the pause duration',()=>{
 const g=new PhraseGame();g.start(textScore('1:4 | 3:4'),60,0,{automatic:true,prepMs:0});g.update(0,-1,false);g.update(25,-1,false);assert.equal(g.queued,true);g.pause(1000);g.resume(6000);assert.equal(g.playStart,5100);const o=g.update(9100,-1,false);assert.equal(o.launch.index,1);assert.equal(g.playStart,9100);
});

test('random routes change only targets, avoid repeats and long jumps, and do not mutate the score',()=>{
 const {routeBlocks}=require('../game-core');let seed=13;const rng=()=>((seed=seed*16807%2147483647)-1)/2147483646;
 const original=phrases(builtinScores()[0]),before=JSON.stringify(original),routes=new Set();
 for(let run=0;run<100;run++){const result=routeBlocks(original,'random',rng);routes.add(result.map(b=>b.zone).join(','));
 result.forEach((b,i)=>{assert.equal(b.events,original[i].events);assert.equal(b.start,original[i].start);assert.equal(b.index,i);assert.ok(b.zone>=0&&b.zone<8);if(i){const prev=result[i-1].zone;assert.notEqual(b.zone,prev);assert.ok(Math.abs(b.zone%4-prev%4)+Math.abs(Math.floor(b.zone/4)-Math.floor(prev/4))<=2);}});}
 assert.ok(routes.size>90);assert.equal(JSON.stringify(original),before);assert.equal(routeBlocks(original,'practice'),original);
});
test('random target preview stays stable through play and pause, all music completes',()=>{
 const s=builtinScores()[0],g=new PhraseGame();g.start(s,s.bpm,0,{automatic:true,prepMs:0,route:'random',random:()=>.6});const route=g.blocks.map(b=>b.zone);g.update(0,-1,false);g.pause(100);g.resume(500);
 for(let now=500;now<40000&&!g.done;now+=25){g.update(now,-1,false);assert.deepEqual(g.blocks.map(b=>b.zone),route);}assert.equal(g.done,true);assert.equal(g.completed,13);
});
