/* Isolated score parsing and rhythm-game state; no browser or audio dependencies. */
(function(root){
 const SCALE=[60,62,64,65,67,69,71,72];
 function score(title,bpm,events){
  if(!Number.isFinite(bpm)||bpm<20||bpm>240)throw Error('Tempo must be 20–240 BPM.');
  if(!events.length||events.length>1000)throw Error('Use a melody containing 1–1000 notes.');
  const notes=events.map(e=>({...e})).sort((a,b)=>a.start-b.start);
  for(let i=0;i<notes.length;i++){const e=notes[i];if(!Number.isInteger(e.midi)||e.midi<0||e.midi>127||!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.start<0||e.end<=e.start||e.end>4000)throw Error('Invalid note pitch or duration.');if(i&&e.start<notes[i-1].end-1e-6)throw Error('This track contains overlapping notes / chords. Choose a monophonic melody track.');}
  const unique=[...new Set(notes.map(e=>e.midi))].sort((a,b)=>a-b);
  const pitches=unique.every(n=>SCALE.includes(n))?[...SCALE]:unique;
  return {title:String(title||'Uploaded melody').slice(0,80),bpm,pitches,events:notes.map(e=>({...e,zone:pitches.indexOf(e.midi)})),beats:notes.at(-1).end};
 }
 function sequential(title,bpm,items){let beat=0;const events=[];for(const item of items){if(!item||!Number.isFinite(item.beats)||item.beats<=0||item.beats>64)throw Error('Each duration must be greater than 0 and at most 64 beats.');if(item.note!==null)events.push({midi:item.note,start:beat,end:beat+item.beats});beat+=item.beats;}const result=score(title,bpm,events);result.beats=beat;return result;}
 function textScore(text,title='Uploaded numbered score'){
  if(text.length>100000)throw Error('Score text is too large.');
  if(text.trim().startsWith('{')){const d=JSON.parse(text);if(!Array.isArray(d.notes)||d.notes.length>1000)throw Error('JSON needs a notes array (maximum 1000).');return sequential(d.title,d.bpm??72,d.notes);}
  const tokens=text.replace(/\|/g,' | ').trim().split(/\s+/);if(tokens.length>1000)throw Error('Maximum 1000 tokens.');
  const starts=[0],items=[];let beat=0;
  for(const t of tokens){if(t==='|'){if(beat>starts.at(-1))starts.push(beat);continue;}const m=/^([0-8])(?::(\d+(?:\.\d+)?))?$/.exec(t);if(!m)throw Error('Use 1–8 for C4–C5, 0 for rest, :beats for duration and | between phrases.');const item={note:m[1]==='0'?null:SCALE[Number(m[1])-1],beats:m[2]?Number(m[2]):1};items.push(item);beat+=item.beats;}
  const result=sequential(title,72,items);result.phraseStarts=starts.filter(x=>x<result.beats);return result;
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

 // Explicit | boundaries preserve musical phrases. Otherwise group roughly eight
 // beats at note onsets, never cutting a note to meet an arbitrary bar boundary.
 const ROUTE=[0,1,2,3,7,6,5,4];
 function phrases(s,beats=8){
  const starts=s.phraseStarts?.length>1?[...s.phraseStarts]:[0];
  if(starts.length===1){let start=0;for(const e of s.events){if(e.start>=start+beats){start=e.start;starts.push(start);}}}
  const parts=starts.map((start,i)=>{const end=starts[i+1]??s.beats;return {start,end,beats:end-start,events:s.events.filter(e=>e.start>=start&&e.start<end).map(e=>({...e,start:e.start-start,end:e.end-start}))};});
  const joined=[];let leading=null;
  for(const p of parts){if(!p.events.length){if(joined.length){joined.at(-1).end=p.end;joined.at(-1).beats=p.end-joined.at(-1).start;}else if(leading===null)leading=p.start;continue;}if(leading!==null){const shift=p.start-leading;p.start=leading;p.beats+=shift;p.events=p.events.map(e=>({...e,start:e.start+shift,end:e.end+shift}));leading=null;}joined.push(p);}
  return joined.map((p,i)=>({...p,index:i,zone:ROUTE[i%8],title:'Part '+(i+1)}));
 }
 class PhraseGame{
  start(s,bpm,now,{prepMs=2000,dwellMs=600,automatic=false}={}){
   this.score=s;this.blocks=phrases(s);this.bpm=bpm;this.prepMs=prepMs;this.dwellMs=dwellMs;this.automatic=automatic;this.index=0;this.completed=0;this.phase='prepare';this.readyAt=now+prepMs;this.pausedAt=null;this.done=false;this.resetDwell();
  }
  resetDwell(){this.dwell=0;this.last=null;this.lastGood=-Infinity;this.wasTarget=false;}
  pause(now){if(this.pausedAt===null&&!this.done){this.pausedAt=now;this.resetDwell();}}
  resume(now){if(this.pausedAt===null)return;const gap=now-this.pausedAt;this.readyAt+=gap;if(this.phase==='playing')this.playStart+=gap;this.pausedAt=null;this.resetDwell();}
  update(now,zone,valid){
   if(this.done||this.pausedAt!==null)return this.view(now);
   if(this.phase==='playing'&&now>=this.playStart+this.blocks[this.index].beats*60000/this.bpm){this.completed++;this.index++;this.resetDwell();if(this.index===this.blocks.length){this.done=true;return this.view(now);}this.phase='prepare';this.readyAt=now+(this.automatic?0:this.prepMs);}
   let launch=null;
   if(this.phase==='prepare'&&now>=this.readyAt){
    const target=valid&&zone===this.blocks[this.index].zone;
    if(this.last!==null&&now-this.last>250)this.resetDwell();
    if(valid&&!target||!valid&&now-this.lastGood>180)this.dwell=0;
    if(target){if(this.wasTarget&&this.last!==null)this.dwell+=Math.min(80,now-this.last);this.lastGood=now;}
    this.wasTarget=target;this.last=now;
    if(this.automatic||target&&this.dwell>=this.dwellMs){this.phase='playing';this.playStart=now+100;launch=this.blocks[this.index];this.resetDwell();}
   }
   return {...this.view(now),launch};
  }
  view(now){if(this.done)return {done:true,completed:this.completed};if(this.pausedAt!==null)now=this.pausedAt;const block=this.blocks[this.index];const elapsed=this.phase==='playing'?Math.max(0,(now-this.playStart)/1000):0;return {done:false,phase:this.phase,block,next:this.blocks[this.index+1],elapsed,remaining:Math.max(0,1-elapsed/(block.beats*60/this.bpm)),prepareLeft:Math.max(0,this.readyAt-now),dwell:Math.min(1,this.dwell/this.dwellMs),completed:this.completed};}
 }
 // Small audio lookahead, independent of screen redraws. On resume, unfinished
 // long notes are re-attacked; already-ended notes are never emitted in a burst.
 class PhraseScheduler{
  constructor(block,bpm,offset=0){this.events=block.events.map((e,id)=>({id,midi:e.midi,start:e.start*60/bpm,end:e.end*60/bpm})).filter(e=>e.end>offset);this.cursor=0;}
  take(elapsed,ahead=.2){const due=[];while(this.cursor<this.events.length&&this.events[this.cursor].start<=elapsed+ahead){const e=this.events[this.cursor++];if(e.end>elapsed)due.push({...e,start:Math.max(e.start,elapsed)});}return due;}
 }
 function builtinScores(){return [
  textScore('1 1 5 5 6 6 5:2 | 4 4 3 3 2 2 1:2 | 5 5 4 4 3 3 2:2 | 5 5 4 4 3 3 2:2 | 1 1 5 5 6 6 5:2 | 4 4 3 3 2 2 1:2','Twinkle, Twinkle, Little Star'),
  textScore('3 2 1 2 3 3 3:2 | 2 2 2:2 3 5 5:2 | 3 2 1 2 3 3 3 3 | 2 2 3 2 1:4','Mary Had a Little Lamb'),
  textScore('1 2 3 1 | 1 2 3 1 | 3 4 5:2 | 3 4 5:2 | 5:0.5 6:0.5 5:0.5 4:0.5 3 1 | 5:0.5 6:0.5 5:0.5 4:0.5 3 1 | 1 5 1:2 | 1 5 1:2','Frère Jacques')
 ];}
 const api={SCALE,score,sequential,textScore,midiScores,phrases,PhraseGame,PhraseScheduler,builtinScores};if(typeof module!=='undefined')module.exports=api;else root.DonutGame=api;
})(globalThis);
