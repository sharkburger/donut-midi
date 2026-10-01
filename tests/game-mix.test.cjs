const {test}=require('node:test'),assert=require('node:assert/strict');
const {builtinScores,phrases,PhraseScheduler,PhraseGame,textScore}=require('../game-core');
const {events}=require('../game-mix');
for(const song of builtinScores())test(song.title+' complete mix: bounded layers, intact lead and seamless queued scheduling',()=>{
 const blocks=phrases(song);assert.ok(new Set(blocks.map(b=>b.beats)).size>1);
 const lead=[];for(const block of blocks){const mix=events(song,block);assert.deepEqual(new Set(mix.map(e=>e.kind)),new Set(['lead','pad','bass','kick','snare','hat']));
 for(const e of mix){assert.ok(e.start>=0&&e.end<=block.beats&&e.end>e.start);if(e.kind==='lead')lead.push([e.midi,block.start+e.start,block.start+e.end]);}}
 assert.deepEqual(lead,song.events.map(e=>[e.midi,e.start,e.end]));
 const g=new PhraseGame();g.start(song,song.bpm,0,{automatic:true,prepMs:0});let current=null,next=null,played=[],starts=[];
 const job=(b,start)=>({index:b.index,start,scheduler:new PhraseScheduler({events:events(song,b)},song.bpm)});
 for(let now=0;now<60000&&!g.done;now+=25){const o=g.update(now,-1,false);if(o.queue)next=job(o.queue.block,o.queue.startAt);if(o.launch){current=next?.index===o.launch.index?next:job(o.launch,g.playStart);next=null;starts.push(g.playStart);}
 for(const j of [current,next])if(j)for(const e of j.scheduler.take((now-j.start)/1000))if(e.kind==='lead')played.push([e.midi,j.start+e.start*1000]);}
 assert.ok(g.done);assert.equal(played.length,song.events.length);for(let i=0;i<played.length;i++){assert.equal(played[i][0],song.events[i].midi);assert.ok(Math.abs(played[i][1]-(100+song.events[i].start*60000/song.bpm))<.001);}
});
test('uploaded melody gets no guessed accompaniment',()=>{const s=textScore('1 2 | 3');assert.ok(events(s,phrases(s)[0]).every(e=>e.kind==='lead'));});
test('mix voices schedule finite audio, stop on pause and disconnect after ending',()=>{
 const nodes=[];const param=()=>({value:0,setValueAtTime(v,t){assert.ok(Number.isFinite(v)&&Number.isFinite(t));},linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);},exponentialRampToValueAtTime(v,t){assert.ok(v>0);this.setValueAtTime(v,t);},cancelScheduledValues(){},setTargetAtTime(){}});
 const node=()=>{const n={gain:param(),frequency:param(),detune:param(),connect(){},disconnect(){this.disconnected=true;},start(t){this.startAt=t;},stop(t){this.stopAt=t;}};nodes.push(n);return n;};
 const ctx={currentTime:0,sampleRate:44100,createGain:node,createBiquadFilter:node,createOscillator:node,createBufferSource:node,createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)})};
 const {Player}=require('../game-mix');const player=new Player(ctx,{}),song=builtinScores()[0];
 for(const e of events(song,phrases(song)[0]))player.play(e,.1+e.start*60/song.bpm,(e.end-e.start)*60/song.bpm);
 assert.equal(player.active.size,events(song,phrases(song)[0]).length);player.setBacking(false);player.stop();
 for(const v of [...player.active]){assert.ok(v.sources.every(s=>s.stopAt===.06));v.sources[0].onended();assert.ok(v.nodes.every(n=>n.disconnected));}assert.equal(player.active.size,0);
});
