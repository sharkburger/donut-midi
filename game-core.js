/* Isolated score parsing and rhythm-game state; no browser or audio dependencies. */
(function(root){
 const SCALE=[60,62,64,65,67,69,71,72];
 function score(title,bpm,events){
  if(!Number.isFinite(bpm)||bpm<20||bpm>240)throw Error('Tempo must be 20–240 BPM.');
  if(!events.length||events.length>1000)throw Error('Use a melody containing 1–1000 notes.');
  const notes=events.map(e=>({...e})).sort((a,b)=>a.start-b.start);
  for(let i=0;i<notes.length;i++){const e=notes[i];if(!Number.isInteger(e.midi)||e.midi<0||e.midi>127||!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.start<0||e.end<=e.start||e.end>4000)throw Error('Invalid note pitch or duration.');if(i&&e.start<notes[i-1].end-1e-6)throw Error('This track contains overlapping notes / chords. Choose a monophonic melody track.');}
  const unique=[...new Set(notes.map(e=>e.midi))].sort((a,b)=>a-b);if(unique.length>8)throw Error('This melody uses more than 8 different pitches. Choose or simplify a melody for eight donuts.');
  const pitches=unique.every(n=>SCALE.includes(n))?[...SCALE]:unique;
  return {title:String(title||'Uploaded melody').slice(0,80),bpm,pitches,events:notes.map(e=>({...e,zone:pitches.indexOf(e.midi)})),beats:notes.at(-1).end};
 }
 function sequential(title,bpm,items){let beat=0;const events=[];for(const item of items){if(!item||!Number.isFinite(item.beats)||item.beats<=0||item.beats>64)throw Error('Each duration must be greater than 0 and at most 64 beats.');if(item.note!==null)events.push({midi:item.note,start:beat,end:beat+item.beats});beat+=item.beats;}return score(title,bpm,events);}
 function textScore(text,title='Uploaded numbered score'){
  if(text.length>100000)throw Error('Score text is too large.');
  if(text.trim().startsWith('{')){const d=JSON.parse(text);if(!Array.isArray(d.notes)||d.notes.length>1000)throw Error('JSON needs a notes array (maximum 1000).');return sequential(d.title,d.bpm??72,d.notes);}
  const tokens=text.replace(/\|/g,' ').trim().split(/\s+/);if(tokens.length>1000)throw Error('Maximum 1000 tokens.');
  const items=tokens.map(t=>{const m=/^([0-8])(?::(\d+(?:\.\d+)?))?$/.exec(t);if(!m)throw Error('Use 1–8 for C4–C5, 0 for rest, and optional :beats (example 5:2).');return {note:m[1]==='0'?null:SCALE[Number(m[1])-1],beats:m[2]?Number(m[2]):1};});return sequential(title,72,items);
 }
 function midiScores(buffer){
  const d=new DataView(buffer);let pos=0;const need=n=>{if(pos+n>d.byteLength)throw Error('Truncated MIDI file.');};const u8=()=>{need(1);return d.getUint8(pos++);};const u16=()=>{need(2);const v=d.getUint16(pos);pos+=2;return v;};const u32=()=>{need(4);const v=d.getUint32(pos);pos+=4;return v;};const str=n=>{need(n);let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(u8());return s;};const vlq=()=>{let v=0;for(let i=0;i<4;i++){const b=u8();v=(v<<7)|(b&127);if(!(b&128))return v;}throw Error('Invalid MIDI delta time.');};
  if(str(4)!=='MThd')throw Error('Not a standard MIDI file.');const header=u32();if(header<6)throw Error('Invalid MIDI header.');need(header);const format=u16(),count=u16(),division=u16();pos+=header-6;if(format>1||!division||(division&32768)||count>128)throw Error('Use format 0/1 MIDI with beat-based timing (PPQN).');
  const tracks=[],tempos=new Set();let firstTempoTick=Infinity;
  for(let tr=0;tr<count;tr++){if(str(4)!=='MTrk')throw Error('Invalid MIDI track.');const length=u32();need(length);const end=pos+length;let tick=0,running=0,name='Track '+(tr+1),eventCount=0;const held=new Map(),channels=new Map();
   while(pos<end){if(++eventCount>100000)throw Error('MIDI track is too large.');tick+=vlq();let status=u8();if(status<128){if(!running)throw Error('Invalid running status.');pos--;status=running;}else if(status<240)running=status;else running=0;
    if(status===255){const type=u8(),n=vlq();need(n);if(pos+n>end)throw Error('Invalid MIDI meta event.');if(type===81&&n===3){const t=(d.getUint8(pos)<<16)|(d.getUint8(pos+1)<<8)|d.getUint8(pos+2);if(!t)throw Error('Invalid MIDI tempo.');tempos.add(t);firstTempoTick=Math.min(firstTempoTick,tick);}if(type===3)name=new TextDecoder().decode(new Uint8Array(buffer,pos,n)).slice(0,60);pos+=n;if(type===47){pos=end;break;}continue;}
    if(status===240||status===247){const n=vlq();need(n);pos+=n;continue;}
    if(status>=240)throw Error('Unsupported MIDI system event.');const kind=status>>4,ch=status&15,a=u8(),b=(kind===12||kind===13)?0:u8();if(a>127||b>127||pos>end)throw Error('Invalid MIDI event.');if(ch===9)continue;
    const key=ch+':'+a;if(kind===9&&b>0){if(held.has(key))throw Error('Overlapping repeated MIDI pitch.');held.set(key,tick);}else if(kind===8||(kind===9&&b===0)){if(held.has(key)){const start=held.get(key);held.delete(key);if(tick>start){if(!channels.has(ch))channels.set(ch,[]);channels.get(ch).push({midi:a,start:start/division,end:tick/division});}}}
   }
   if(pos>end)throw Error('MIDI event exceeds track length.');if(held.size)throw Error('MIDI contains notes without note-off events.');for(const [ch,events]of channels)tracks.push({title:name+' · channel '+(ch+1),events});pos=end;
  }
  if(tempos.size>1||(firstTempoTick>0&&tempos.size&&![...tempos].includes(500000)))throw Error('Changing-tempo MIDI is not supported yet. Export a constant-tempo melody.');const bpm=tempos.size?60000000/[...tempos][0]:120;
  if(!tracks.length)throw Error('No pitched melody tracks found.');return tracks.map(t=>{try{return {...t,score:score(t.title,bpm,t.events)};}catch(e){return {...t,error:e.message};}});
 }
 class RhythmGame{
  start(s,bpm,now){this.score=s;this.bpm=bpm;this.startTime=now+4*60000/bpm;this.index=0;this.hits=0;this.misses=0;this.fired=false;this.since=null;this.last=null;this.done=false;}
  update(now,zone,valid){if(this.done)return {done:true};const beat=(now-this.startTime)*this.bpm/60000;
   while(this.index<this.score.events.length&&beat>=this.score.events[this.index].end){if(!this.fired)this.misses++;this.index++;this.fired=false;this.since=null;}
   if(this.index===this.score.events.length){this.done=true;return {done:true};}
   const e=this.score.events[this.index],active=beat>=e.start;let hit=null;
   if(!valid||!active||zone!==e.zone||this.last!==null&&now-this.last>250)this.since=null;
   if(valid&&active&&zone===e.zone&&!this.fired){if(this.since===null)this.since=now;if(now-this.since>=120){this.fired=true;this.hits++;hit=e;}}
   this.last=now;return {done:false,beat,event:e,next:this.score.events[this.index+1],active,hit,fired:this.fired,remaining:Math.max(0,Math.min(1,(e.end-beat)/(e.end-e.start))),dwell:this.since===null?0:Math.min(1,(now-this.since)/120)};
  }
 }
 const api={SCALE,score,sequential,textScore,midiScores,RhythmGame};if(typeof module!=='undefined')module.exports=api;else root.DonutGame=api;
})(globalThis);
