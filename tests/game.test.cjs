const {test}=require('node:test'),assert=require('node:assert/strict');
const {textScore,score,midiScores,RhythmGame}=require('../game-core.js');
const start=s=>{const g=new RhythmGame();g.start(s,60,0);return g;};
test('score keeps canonical donut notes and honors rests and held durations',()=>{
 const s=textScore('1 1 0:2 | 5:2 8:0.5');
 assert.deepEqual(s.events.map(e=>[e.midi,e.start,e.end,e.zone]),[[60,0,1,0],[60,1,2,0],[67,4,6,4],[72,6,6.5,7]]);
 assert.throws(()=>textScore('1 hello'),/Use 1/);assert.throws(()=>textScore('0 0'),/1–1000/);
 assert.throws(()=>textScore('{"notes":[{"note":60,"beats":-1}]}'),/duration/);
 assert.throws(()=>score('chords',72,[{midi:60,start:0,end:2},{midi:64,start:1,end:3}]),/overlapping/);
 assert.throws(()=>score('large',72,Array.from({length:9},(_,i)=>({midi:60+i,start:i,end:i+1}))),/8 different/);
 const custom=score('custom',72,[{midi:61,start:0,end:1},{midi:66,start:1,end:2}]);assert.deepEqual(custom.pitches,[61,66]);assert.deepEqual(custom.events.map(e=>e.zone),[0,1]);
});
test('count-in cannot score; repeated target notes retrigger once per new beat',()=>{
 const g=start(textScore('1 1'));assert.equal(g.update(3900,0,true).hit,null);
 assert.equal(g.update(4000,0,true).hit,null);assert.ok(g.update(4120,0,true).hit);
 assert.equal(g.update(4240,0,true).hit,null);assert.equal(g.hits,1);
 assert.equal(g.update(5000,0,true).hit,null);assert.ok(g.update(5120,0,true).hit);assert.equal(g.hits,2);
 assert.equal(g.update(6000,0,true).done,true);assert.equal(g.misses,0);
});
test('wrong target, lost gaze and delayed frames reset dwell; skipped notes count misses',()=>{
 const g=start(textScore('1 2 0 3'));g.update(4000,0,true);g.update(4080,0,false);assert.equal(g.update(4120,0,true).hit,null);
 g.update(4200,1,true);assert.equal(g.update(4250,0,true).hit,null);assert.equal(g.update(4600,0,true).hit,null);
 const o=g.update(6120,2,true);assert.equal(o.active,false);assert.equal(o.hit,null);assert.equal(g.misses,2);
 g.update(7000,2,true);assert.ok(g.update(7120,2,true).hit);g.update(8000,2,true);assert.equal(g.hits,1);assert.equal(g.misses,2);
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
