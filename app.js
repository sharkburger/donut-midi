'use strict';
const {clamp,ZONES,zoneAt,pupil,Dwell,parseRecording}=DonutCore;
const $=id=>document.getElementById(id);
const VERSION='0.4.0';
const phaseNames={prepare:'01 / Prepare',look:'02 / Look',taste:'03 / Taste',after:'04 / Aftertaste',end:'05 / End'};
const phaseHints={prepare:'Capture a personal baseline, then start looking.',look:'Hold your gaze on a donut to play a note.',taste:'Note selection pauses; the last note sustains. Put the food back, then select Aftertaste.',after:'Play again and hear how the same melody changes.',end:'Session ended. Reset the score to play again.'};
let source='simulate',phase='prepare',consumed=ZONES.map(()=>false),baseline=4,baselineReady=true;
let sample=null,sampleReceived=0,smoothed=4,delta=0,lastFrame=performance.now(),lastPupilAt=0;
let pointer={x:null,y:null},audioStarted=false,audioEnabled=false,ws=null,connectionState='Not connected';
let consumedButtons=[],lastZone=-1,lastNoteZone=-1,noteCount=0,pulses=[],trace=[];
let calibrating=null,recording=null,lastRecording=null,lastRecordSample=0,eventCount=0;
let replay=null,replayIndex=0,replayPlaying=false,replayTime=0,replayTick=0,lastUITick=0;
let config={dwell:500,body:true,mapping:'brightness',strength:.6,volume:.35,notes:ZONES.map(z=>z.note),preset:'body'};
const dwell=new Dwell();
let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function snapshot(){return {phase,consumed:[...consumed],baseline,baselineReady,config:structuredClone(config),source};}
function log(type,payload={}){if(recording)recording.events.push({t:performance.now()-recording.start,type,...payload});}
function mark(){eventCount++;log('marker',{number:eventCount});toast(recording?`Moment recorded #${eventCount}`:'Recording is off; this marker will not be saved.');}
class Instrument{
  constructor(){this.ctx=null;this.voices=[];this.hold=null;this.samples=new Map();this.loads=new Map();}
  async start(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();this.master.gain.value=config.volume*.32;
      const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-15;compressor.ratio.value=8;
      this.master.connect(compressor);compressor.connect(this.ctx.destination);
    }
    await this.ctx.resume();
  }
  voice(midi,held=false,tone=this.tone||'piano',when=null,level=1){
    if(!this.ctx||!audioEnabled)return null;
    if(tone==='guitar')return this.pluck(midi,held,when,level);
    const c=this.ctx,t=when??c.currentTime,osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain();
    const lfo=c.createOscillator(),depth=c.createGain();
    osc.type=tone==='synth'?'sawtooth':'triangle';osc.frequency.value=440*2**((midi-69)/12);filter.type='lowpass';filter.frequency.value=1400;
    lfo.frequency.value=5;depth.gain.value=0;lfo.connect(depth);depth.connect(osc.detune);
    osc.connect(filter);filter.connect(gain);gain.connect(this.master);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.40*level,t+(tone==='synth'?.12:.008));
    osc.start(t);lfo.start(t);
    const duration=tone==='guitar'?1.1:tone==='synth'?3:2.5;if(!held){gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.stop(t+duration+.1);lfo.stop(t+duration+.1);}
    const v={osc,filter,gain,lfo,depth,held,ended:false,tone};this.voices.push(v);
    osc.onended=()=>{v.ended=true;osc.disconnect();lfo.disconnect();filter.disconnect();gain.disconnect();depth.disconnect();this.voices=this.voices.filter(x=>x!==v);};
    return v;
  }
  pluck(midi,held=false,when=null,level=1){
    const c=this.ctx,t=when??c.currentTime,freq=440*2**((midi-69)/12),period=Math.max(2,Math.round(c.sampleRate/freq));
    const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*2.2),c.sampleRate),data=buffer.getChannelData(0),ring=new Float32Array(period);
    for(let i=0;i<period;i++)ring[i]=Math.random()*2-1;
    for(let i=0;i<data.length;i++){const j=i%period;data[i]=ring[j];ring[j]=.496*(ring[j]+ring[(j+1)%period]);}
    const osc=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();osc.buffer=buffer;osc.loop=held;filter.type='lowpass';filter.frequency.value=4000;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.6*level,t+.005);osc.connect(filter);filter.connect(gain);gain.connect(this.master);
    const v={osc,filter,gain,lfo:null,depth:null,held,ended:false,tone:'guitar'};this.voices.push(v);
    osc.onended=()=>{v.ended=true;osc.disconnect();filter.disconnect();gain.disconnect();this.voices=this.voices.filter(x=>x!==v);};osc.start(t);return v;
  }
  async loadSample(zone,file){
    if(file.size>25*1024*1024)throw Error('Each audio file must be 25 MB or smaller. Trim it first.');
    const version=(this.loads.get(zone)||0)+1;this.loads.set(zone,version);
    await this.start();const buffer=await this.ctx.decodeAudioData(await file.arrayBuffer());
    if(this.loads.get(zone)!==version)return false;
    if(buffer.duration>60)throw Error('Clips must be 60 s or shorter; 1–8 s is recommended.');
    const bytes=b=>b.length*b.numberOfChannels*4;
    const total=[...this.samples].reduce((n,[id,s])=>n+(id===zone?0:bytes(s.buffer)),bytes(buffer));
    if(total>120*1024*1024)throw Error('Decoded audio exceeds 120 MB across eight tracks. Use shorter clips.');
    this.samples.set(zone,{buffer,name:file.name});return true;
  }
  clearSample(zone){this.loads.set(zone,(this.loads.get(zone)||0)+1);this.samples.delete(zone);}
  playZone(zone,held=false){
    if(typeof researchToneOverride==='function'&&researchToneOverride())return this.voice(config.notes[zone],held,'piano');
    const clip=this.samples.get(zone);if(!clip)return this.voice(config.notes[zone],held);
    if(!this.ctx||!audioEnabled)return null;
    for(const old of this.voices)if(old.zone===zone)this.release(old);
    const c=this.ctx,t=c.currentTime,osc=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();
    osc.buffer=clip.buffer;osc.loop=held;filter.type='lowpass';filter.frequency.value=18000;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.65,t+.015);
    osc.connect(filter);filter.connect(gain);gain.connect(this.master);
    const v={osc,gain,filter,lfo:null,depth:null,zone,held,ended:false,sample:true};this.voices.push(v);
    osc.onended=()=>{v.ended=true;osc.disconnect();gain.disconnect();filter.disconnect();this.voices=this.voices.filter(x=>x!==v);};
    if(!held){const end=t+clip.buffer.duration;gain.gain.setValueAtTime(.65,Math.max(t+.015,end-.03));gain.gain.linearRampToValueAtTime(0,Math.max(t+.016,end));}
    osc.start();return v;
  }
  sustainZone(zone){this.stop();this.hold=this.playZone(zone,true);}
  release(v){if(!v||v.ended||v.released)return;v.released=true;const t=this.ctx.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.12);try{v.osc.stop(t+.8);v.lfo?.stop(t+.8);}catch{}}
  stop(){for(const v of this.voices)this.release(v);this.hold=null;if(typeof stopBacking==='function')stopBacking();if(typeof midiOut!=='undefined')midiOut.panic();}
  sustain(midi){this.stop();this.hold=this.voice(midi,true);}
  update(amount){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(audioEnabled&&(typeof localSoundEnabled!=='function'||localSoundEnabled())?config.volume*.32:0,t,.1);
    for(const v of this.voices){v.filter.frequency.setTargetAtTime(config.mapping==='brightness'?(v.sample?18000:1400)*2**(amount*2):(v.sample?18000:1400),t,.12);v.depth?.gain.setTargetAtTime(config.mapping==='vibrato'?clamp(Math.abs(amount)*30,0,35):0,t,.12);}
  }
}
const instrument=new Instrument();
async function toggleAudio(){
  try{await instrument.start();audioStarted=true;audioEnabled=!audioEnabled;if(!audioEnabled){instrument.stop();if(typeof stopStateSound==='function')stopStateSound();dwell.reset();}else if(phase==='prepare')setPhase('look');else if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustainZone(lastNoteZone);
  $('audioButton').textContent=audioEnabled?'Ⅱ Pause sound':'▶ Resume playing';$('audioState').textContent=audioEnabled?'Sound on · Space to pause':'Sound paused';log('audio',{enabled:audioEnabled});}catch(e){toast('Could not start audio: '+e.message);}
}
function setPhase(value,fromReplay=false){
  if(!phaseNames[value])return;phase=value;dwell.reset();
  $('phaseLabel').textContent=phaseNames[phase];$('phaseHint').textContent=phaseHints[phase];
  document.querySelectorAll('[data-phase]').forEach(b=>b.classList.toggle('active',b.dataset.phase===phase));
  if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustainZone(lastNoteZone);
  else if(['prepare','end'].includes(phase)||instrument.hold)instrument.stop();
  if(!fromReplay)log('phase',{phase});
}
function setConsumed(i,value,fromReplay=false){
  consumed[i]=value;const b=consumedButtons[i];if(b){b.textContent=value?'Eaten · undo':'Eaten −';b.setAttribute('aria-pressed',String(value));}
  if(value&&lastNoteZone===i)instrument.stop();dwell.reset();if(!fromReplay)log('consumed',{zone:i,value});
}
function resetFood(){for(let i=0;i<ZONES.length;i++)setConsumed(i,false);lastNoteZone=-1;setPhase('prepare');toast('Score reset. Capture a new baseline for a new participant.');}
function receive(s){sample=s;sampleReceived=performance.now();if(typeof captureResearchSample==='function')captureResearchSample(s,sampleReceived);}
function disconnect(){if(typeof stopNeonPackage==='function')stopNeonPackage();if(ws){ws.onclose=null;ws.close();ws=null;}connectionState='Not connected';}
function switchSource(value){
  if(typeof statePatterns!=='undefined')statePatterns.reset();
  if(recording)stopRecording();disconnect();source=value;sample=null;sampleReceived=0;lastPupilAt=0;pointer={x:null,y:null};calibrating=null;
  baseline=4;baselineReady=source==='simulate';smoothed=4;delta=0;trace=[];replayPlaying=false;instrument.stop();dwell.reset();setPhase('prepare');
  $('source').value=source;$('simControls').hidden=source!=='simulate';$('liveControls').hidden=source!=='live';$('replayControls').hidden=source!=='replay';
  $('sourceBadge').textContent={simulate:'● Mouse simulation',replay:'● Data replay',live:'● Live Neon'}[source];
  $('calibrate').disabled=source==='replay';$('calibrationInfo').textContent=source==='live'?'Waiting for live data. Body modulation requires a personal baseline.':'Keep viewing position, lighting and the slider unchanged during calibration.';
  if(source==='replay'&&!replay)loadDemo();updateReplayButton();
}
function connect(){
  disconnect();const url=$('wsUrl').value.trim();
  if(!/^ws:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)){toast('Use a loopback bridge address: ws://127.0.0.1:port.');return;}
  connectionState='Connecting';$('connectionInfo').textContent='Connecting to the local bridge…';
  ws=new WebSocket(url);
  ws.onopen=()=>{connectionState='Connected; awaiting data';$('connectionInfo').textContent='Bridge connected. Waiting for Neon and mat markers.';};
  ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='status'){$('connectionInfo').textContent=m.message;return;}
    if(m.type==='sample'&&m.source==='neon'&&typeof m.worn==='boolean'&&typeof m.surfaceValid==='boolean'&&['x','y','pupilLeft','pupilRight'].every(k=>m[k]===null||Number.isFinite(m[k]))){receive(m);connectionState='Receiving';}
  }catch{}};
  ws.onerror=()=>{$('connectionInfo').textContent='Connection failed. Check that the bridge is running and the port is correct.';};
  ws.onclose=()=>{connectionState='Disconnected';sample=null;instrument.stop();$('connectionInfo').textContent='Bridge disconnected. You can reconnect.';};
}
function startCalibration(){
  if(source==='replay')return;
  if(recording){toast('Stop recording before capturing another baseline.');return;}
  if(!sample||pupil(sample)===null||performance.now()-sampleReceived>500){toast('No valid pupil input. Check fit and enable Compute eye state in Companion.');return;}
  setPhase('prepare');calibrating={start:performance.now(),values:[],last:0};baselineReady=false;toast('Capturing a 15 s baseline. Keep viewing position and lighting stable.');
}
function updateCalibration(now){
  if(!calibrating)return;
  if(now-calibrating.last>=50){const p=sample&&now-sampleReceived<500?pupil(sample):null;if(p!==null)calibrating.values.push(p);calibrating.last=now;}
  const left=Math.max(0,15-(now-calibrating.start)/1000);$('calibrationInfo').textContent=`Capturing: ${left.toFixed(0)} s · ${calibrating.values.length} valid samples`;
  if(left<=0){const values=calibrating.values.sort((a,b)=>a-b);calibrating=null;if(values.length<150){baselineReady=false;$('calibrationInfo').textContent='Not enough valid data. Check the input and retry.';toast('Baseline capture failed. Body modulation remains off.');return;}
    baseline=values[Math.floor(values.length/2)];smoothed=baseline;delta=0;baselineReady=true;$('calibrationInfo').textContent=` baseline ${baseline.toFixed(2)} mm · Ready to look and play.`;toast('Baseline ready.');}
}
function recordStart(){
  if(recording){stopRecording();return;}
  if(!$('recordConsent').checked){toast('Explain the recording purpose and confirm consent first.');return;}
  if(source==='replay'){toast('Replay does not create new participant recordings. Select mouse or live mode.');return;}
  if(calibrating){toast('Wait for baseline capture to finish.');return;}
  recording={schema:'donut-song/1',appVersion:VERSION,createdAt:new Date().toISOString(),source,start:performance.now(),initial:snapshot(),samples:[],events:[],notes:'Browser sampled stream ~30 Hz, not full-rate research data. No video/audio. Replay re-sonifies with current mapping.'};
  lastRecordSample=0;eventCount=0;$('record').textContent='■ Stop recording';$('recordBadge').textContent='● Recording';$('recordBadge').classList.add('recording');$('export').disabled=true;log('start',snapshot());
}
function stopRecording(){if(!recording)return;log('stop');recording.durationMs=performance.now()-recording.start;delete recording.start;lastRecording=recording;recording=null;$('record').textContent='● Start recording';$('recordBadge').textContent='Recording stopped';$('recordBadge').classList.remove('recording');$('export').disabled=false;$('recordInfo').textContent=`Saved ${lastRecording.samples.length} samples and ${lastRecording.events.length} events in memory. Export to keep them; refreshing clears them.`;}
function exportRecording(){if(!lastRecording)return;const blob=new Blob([JSON.stringify(lastRecording)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`donut-song-${lastRecording.source}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function loadDemo(){const samples=[];for(let t=0;t<=30000;t+=33.3333){const zone=Math.floor(t/1800)%ZONES.length;const gap=t%1800>1400;const v=4+.38*Math.sin(t/3100)+.1*Math.sin(t/900);samples.push({t,x:gap?.5:ZONES[zone].x,y:gap?.84:ZONES[zone].y,pupilLeft:v,pupilRight:v+.02,worn:true,surfaceValid:true,phase:t<12000?'look':t<19000?'taste':'after',consumed:ZONES.map((z,i)=>i===0&&t>25000),baseline:4,baselineReady:true});}replay={schema:'donut-song/1',source:'synthetic-demo',samples};restartReplay();$('replayInfo').textContent='30 s synthetic example, not human data. Uses the current sound mapping.';}
function restartReplay(){replayTime=0;replayIndex=0;replayPlaying=false;sample=null;instrument.stop();lastNoteZone=-1;for(let i=0;i<ZONES.length;i++)setConsumed(i,false,true);dwell.reset();setPhase('prepare',true);$('replayProgress').value=0;updateReplayButton();}
function updateReplayButton(){$('playReplay').textContent=replayPlaying?'Ⅱ Pause replay':'▶ Play';}
function tickReplay(now){if(!replayPlaying||!replay)return;replayTime+=Math.min(now-replayTick,100);replayTick=now;
  while(replayIndex<replay.samples.length&&replay.samples[replayIndex].t<=replayTime){const s=replay.samples[replayIndex++];receive(s);baseline=s.baseline;baselineReady=s.baselineReady!==false;
    if(s.phase!==phase)setPhase(s.phase,true);s.consumed.forEach((v,i)=>{if(v!==consumed[i])setConsumed(i,v,true);});}
  const duration=replay.samples[replay.samples.length-1].t;$('replayProgress').value=duration?replayTime/duration:1;
  if(replayIndex>=replay.samples.length){replayPlaying=false;sample=null;setPhase('end',true);updateReplayButton();toast('Replay ended. Change the mapping and listen again.');}
}
function settingsChanged(){
  config={dwell:+$('dwell').value,body:$('bodyEnabled').checked,mapping:$('mapping').value,strength:+$('strength').value/100,volume:+$('volume').value/100,notes:ZONES.map(z=>+$('note'+z.id).value),preset:$('preset').value};
  $('dwellValue').textContent=config.dwell+' ms';$('dwellStatus').textContent=`Dwell ${config.dwell} ms to trigger a note`;$('strengthValue').textContent=Math.round(config.strength*100)+'%';$('volumeValue').textContent=Math.round(config.volume*100)+'%';
  dwell.reset();if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustainZone(lastNoteZone);log('mapping',{config:structuredClone(config)});
}
function trigger(zone){if(typeof onGazeArtNote==='function')onGazeArtNote(zone);if(typeof onCognitiveNote==='function')onCognitiveNote();if(typeof onResearchNote==='function')onResearchNote(zone);if(typeof midiOut!=='undefined')midiOut.note(config.notes[zone],0,350);lastNoteZone=zone;noteCount++;instrument.playZone(zone);pulses.push({zone,time:performance.now()});$('lastNote').textContent=`${ZONES[zone].name} · ${noteLabel(config.notes[zone])} · Note ${noteCount}`;log('note',{zone,midi:config.notes[zone],delta,config:structuredClone(config),audio:instrument.samples.get(zone)?.name||'synth'});}
function noteLabel(midi){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);}
function update(now){
  const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
  if(source==='simulate'&&typeof gameModeActive==='function'&&gameModeActive())pointer=gameMousePoint();
  if(source==='simulate')receive({x:pointer.x,y:pointer.y,pupilLeft:+$('simPupil').value,pupilRight:+$('simPupil').value,worn:true,surfaceValid:pointer.x!==null,source:'simulate'});
  if(source==='replay')tickReplay(now);
  const fresh=sample&&now-sampleReceived<500&&(source!=='replay'||replayPlaying);const pv=fresh?pupil(sample):null;
  if(pv!==null){smoothed+=(pv-smoothed)*(1-Math.exp(-dt/.35));lastPupilAt=now;}
  else if(now-lastPupilAt>250)smoothed+=(baseline-smoothed)*(1-Math.exp(-dt/.4));
  delta=baselineReady?smoothed-baseline:0;
  const gameOn=typeof gameModeActive==='function'&&gameModeActive();
  const amount=!gameOn&&config.body&&baselineReady?clamp(delta,-1,1)*config.strength:0;
  instrument.update(amount);updateCalibration(now);
  const enabled=!gameOn&&fresh&&sample.worn&&sample.surfaceValid&&['look','after'].includes(phase)&&audioEnabled&&!calibrating;
  const zone=enabled?zoneAt(sample.x,sample.y,lastZone):-1;lastZone=zone;
  if(typeof updateStates==='function')updateStates(now,zone,!!(fresh&&sample.worn&&sample.surfaceValid)&&['look','after'].includes(phase));
  if(dwell.update(consumed[zone]?-1:zone,now,config.dwell,enabled))trigger(zone);
  if(!gameOn&&fresh&&sample.surfaceValid&&sample.y>.86&&sample.y<.95&&phase!=='taste'&&instrument.voices.length)instrument.stop();
  // Stale or unworn live input must never leave a held sound playing indefinitely.
  if(!gameOn&&source==='live'&&(!fresh||!sample.worn))instrument.stop();
  if(recording&&now-lastRecordSample>=33){lastRecordSample=now;const s=fresh?sample:{x:null,y:null,pupilLeft:null,pupilRight:null,worn:false,surfaceValid:false};recording.samples.push({t:now-recording.start,x:s.x,y:s.y,pupilLeft:s.pupilLeft,pupilRight:s.pupilRight,worn:s.worn,surfaceValid:s.surfaceValid,deviceTimestamp:s.deviceTimestamp??null,sceneGaze:s.sceneGaze??null,markerCount:s.markerCount??null,baseline,baselineReady,smoothed,delta,phase,consumed:[...consumed]});if(now-recording.start>=3600000){stopRecording();toast('One-hour recording limit reached. Please export.');}}
  if(now-lastUITick>100){lastUITick=now;trace.push(pv!==null?delta:null);if(trace.length>180)trace.shift();$('pupilDelta').innerHTML=pv!==null&&baselineReady?`${delta>=0?'+':''}${delta.toFixed(2)} <small>mm</small>`:'— <small>mm</small>';
    $('baselineLabel').textContent=baselineReady?`${source==='simulate'||replay?.source==='synthetic-demo'&&source==='replay'?'Simulated':'Personal'} baseline ${baseline.toFixed(2)} mm`:'No baseline yet';$('bodyStatus').textContent=!config.body?'Body modulation off':!baselineReady?'Waiting for baseline':pv===null?'Invalid input · neutral sound':'Body modulation on';
    $('inputHealth').textContent=source==='simulate'?'Simulated input':source==='replay'?(replayPlaying?'Replaying':'Replay paused'):!fresh?'Waiting for device data':!sample.worn?'Glasses not worn':!sample.surfaceValid?'Mat markers unavailable':pv===null?'Gaze available · no pupil data':'Gaze and pupil available';
    $('diagnostics').textContent=`Source: ${source}; Connection: ${connectionState}; Markers: ${sample?.markerCount??'—'}/4; Valid pupil: ${pv===null?'No':'Yes'}; Baseline: ${baselineReady?'Ready':'Not captured'}.`;
    if(recording)$('recordInfo').textContent=`Recording ${((now-recording.start)/1000).toFixed(0)} s · ${recording.samples.length} samples · ${recording.events.length} events. Stop and export before closing.`;
  }
  pulses=pulses.filter(p=>now-p.time<1800);
}
// WORKSHOP: change the mapping in Instrument.update(), notes above, or this drawing.
new p5(p=>{
  let host;
  p.setup=()=>{host=$('canvasHost');const c=p.createCanvas(host.clientWidth,host.clientWidth/1.5);c.parent(host);p.pixelDensity(Math.min(window.devicePixelRatio,2));p.textFont('Helvetica Neue, PingFang SC, sans-serif');
    c.elt.addEventListener('pointermove',e=>{const r=c.elt.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};});c.elt.addEventListener('pointerleave',()=>pointer={x:null,y:null});
    ZONES.forEach(z=>{const b=document.createElement('button');b.className='food-button';b.style.left=(z.x*100)+'%';b.style.top=((z.y+.155)*100)+'%';b.style.bottom='auto';b.textContent='Eaten −';b.setAttribute('aria-label',`${z.name} eaten; remove this voice`);b.setAttribute('aria-pressed','false');b.onclick=()=>setConsumed(z.id,!consumed[z.id]);host.append(b);consumedButtons.push(b);});
    new ResizeObserver(()=>{p.resizeCanvas(host.clientWidth,host.clientWidth/1.5);}).observe(host);
  };
  p.draw=()=>{const now=performance.now();update(now);p.background('#f9f6ef');const w=p.width,h=p.height;
    p.stroke('#eee8de');p.strokeWeight(1);for(let x=25;x<w;x+=28)for(let y=25;y<h;y+=28)p.point(x,y);
    p.noStroke();p.fill('#998b7b');p.textAlign(p.CENTER);p.textSize(Math.max(8,w*.012));p.text('LOOK TO PLAY  /  DWELL TO PLAY A NOTE',w/2,h*.10);
    ZONES.forEach(z=>{const x=z.x*w,y=z.y*h,r=w*z.r*.78,id=z.id;
      p.push();p.translate(x,y);
      p.noFill();p.stroke('#e4dacc');p.strokeWeight(1);p.circle(0,0,r*2.65);
      if(dwell.zone===id){p.stroke('#cb643e');p.strokeWeight(3);p.arc(0,0,r*2.65,r*2.65,-p.HALF_PI,-p.HALF_PI+p.TWO_PI*Math.max(.001,dwell.progress));}
      for(const pulse of pulses.filter(a=>a.zone===id)){const t=(now-pulse.time)/1800;p.stroke(204,100,62,110*(1-t));p.strokeWeight(1);p.circle(0,0,r*(2.7+t*.6));}
      if(!consumed[id]){
        p.noStroke();p.fill(90,60,30,15);p.ellipse(3,r*.15,r*2.1,r*1.9);p.fill('#c89557');p.circle(0,0,r*2);p.fill(z.color);p.beginShape();for(let a=0;a<p.TWO_PI;a+=.07){const rr=r*(.88+.035*Math.sin(a*9+id));p.vertex(Math.cos(a)*rr,Math.sin(a)*rr);}p.endShape(p.CLOSE);
        const colours=['#f7e9c3','#e6b368','#9b614d','#fcf0dd'];
        for(let i=0;i<30;i++){const a=i*2.399+id,rr=r*(.49+((i*17)%29)/65);p.push();p.translate(Math.cos(a)*rr,Math.sin(a)*rr);p.rotate(a+.5);p.stroke(colours[i%4]);p.strokeWeight(Math.max(1.5,w*.0035));p.line(-r*.035,0,r*.035,0);p.pop();}
        p.noStroke();p.fill('#ae7847');p.circle(0,1,r*.70);p.fill('#f9f6ef');p.circle(0,-1,r*.58);
        if(config.body&&baselineReady){p.noFill();p.stroke(255,255,255,90);p.strokeWeight(1);p.circle(0,0,r*(1.45+clamp(delta,-1,1)*.13));}
      }else{p.noFill();p.stroke('#cfc3b2');p.strokeWeight(1);p.circle(0,0,r*1.8);p.circle(0,0,r*.65);p.noStroke();p.fill('#9c8d7e');p.textSize(w*.013);p.text('Resonance',0,5);}
      p.noStroke();p.fill('#45382e');p.textSize(Math.max(10,w*.017));p.text(z.name,0,r*1.75);p.fill('#9a8b7c');p.textSize(Math.max(8,w*.011));p.text(`${String(id+1).padStart(2,'0')}  /  ${noteLabel(config.notes[id])}`,0,r*2.04);p.pop();
    });
    p.noFill();p.stroke('#ded5c7');p.rect(w*.2,h*.86,w*.6,h*.09,20);p.noStroke();p.fill('#9c8f7f');p.textSize(Math.max(9,w*.013));p.text('Rest area  /  REST',w*.5,h*.915);
    const s=sample;const fresh=performance.now()-sampleReceived<500&&(source!=='replay'||replayPlaying);
    if(s&&fresh&&s.surfaceValid&&s.worn&&Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1){p.stroke('#c6613b');p.strokeWeight(1);p.noFill();p.circle(s.x*w,s.y*h,17);p.noStroke();p.fill('#c6613b');p.circle(s.x*w,s.y*h,4);}
  };
});
new p5(p=>{p.setup=()=>{const host=$('traceHost');p.createCanvas(host.clientWidth,64).parent(host);p.pixelDensity(1);new ResizeObserver(()=>p.resizeCanvas(host.clientWidth,64)).observe(host);};p.draw=()=>{p.clear();p.stroke('#c8ccbb');p.line(0,32,p.width,32);p.stroke('#778870');p.noFill();let drawing=false;trace.forEach((v,i)=>{if(v===null){if(drawing)p.endShape();drawing=false;}else{if(!drawing){p.beginShape();drawing=true;}p.vertex(i/(180-1)*p.width,32-clamp(v,-1,1)*25);}});if(drawing)p.endShape();};});
ZONES.forEach(z=>{const l=document.createElement('label');l.textContent=z.name;const s=document.createElement('select');s.id='note'+z.id;s.setAttribute('aria-label',z.name+' pitch');for(const midi of [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72]){const o=document.createElement('option');o.value=midi;o.textContent=noteLabel(midi);o.selected=midi===z.note;s.append(o);}l.append(s);$('noteControls').append(l);s.onchange=()=>{$('preset').value='custom';settingsChanged();};});
$('audioButton').onclick=toggleAudio;$('source').onchange=e=>switchSource(e.target.value);$('connect').onclick=connect;$('calibrate').onclick=startCalibration;$('mark').onclick=mark;$('record').onclick=recordStart;$('export').onclick=exportRecording;$('resetFood').onclick=resetFood;
$('recordConsent').onchange=()=>{if(!$('recordConsent').checked&&recording)stopRecording();};
$('simPupil').oninput=()=>{$('simPupilValue').textContent=(+$('simPupil').value).toFixed(2)+' mm';};
for(const id of ['dwell','bodyEnabled','mapping','strength','volume'])$(id).oninput=()=>{if(id!=='volume')$('preset').value='custom';settingsChanged();};
$('preset').onchange=()=>{if($('preset').value!=='custom'){$('bodyEnabled').checked=$('preset').value==='body';$('mapping').value='brightness';$('strength').value=60;}settingsChanged();};
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(source==='replay'&&replayPlaying){toast('Replay stages follow the recording. Pause to change stages manually.');return;}setPhase(b.dataset.phase);});
$('projector').onclick=()=>{document.body.classList.toggle('projection');$('projector').textContent=document.body.classList.contains('projection')?'Back to controls ↙':'Projector view ↗';};
$('demoReplay').onclick=loadDemo;$('restartReplay').onclick=restartReplay;
$('playReplay').onclick=async()=>{if(!replay)loadDemo();if(replayIndex>=replay.samples.length)restartReplay();if(!audioEnabled)await toggleAudio();replayPlaying=!replayPlaying;replayTick=performance.now();if(!replayPlaying){instrument.stop();dwell.reset();}else if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustainZone(lastNoteZone);updateReplayButton();};
$('replayFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100*1024*1024)throw Error('File exceeds 100 MB.');const data=parseRecording(JSON.parse(await file.text()));replay=data;restartReplay();$('replayInfo').textContent=`Loaded ${file.name} (source: ${data.source||'Unknown'}). Rescoring with the current mapping.`;toast('Recording loaded.');}catch(err){toast(err.message);}e.target.value='';};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();toggleAudio();}if(e.key.toLowerCase()==='m')mark();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){instrument.stop();dwell.reset();if(replayPlaying){replayPlaying=false;updateReplayButton();}sample=null;pointer={x:null,y:null};}});
window.addEventListener('beforeunload',e=>{if(recording||lastRecording){e.preventDefault();e.returnValue='';}});
// Read-only state for workshop diagnostics and automated smoke checks.
window.donutDebug=()=>({source,phase,consumed:[...consumed],baseline,baselineReady,delta,noteCount,config:structuredClone(config),recording:!!recording,replayPlaying,voiceCount:instrument.voices.length});

// Keep the score and audio in the same visible document; hidden tabs pause playback.
const screenScoreButton=document.createElement('button');
screenScoreButton.textContent='Screen mat · gaze performance';
screenScoreButton.style.cssText='position:fixed;bottom:12px;left:12px;z-index:100;padding:12px';
document.body.append(screenScoreButton);
screenScoreButton.onclick=()=>{
  if(document.getElementById('screenScoreOverlay'))return;
  const overlay=document.createElement('div');overlay.id='screenScoreOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:200;background:#ddd;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML='<img src="monitor-mat.svg?v=connector-1" alt="Donut gaze score" style="max-width:100%;max-height:100%;width:auto;height:auto"><div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:13px;background:white;padding:3px 10px;color:black" aria-live="polite"></div><button style="position:absolute;bottom:4px;right:4px">Back to controls</button><button style="position:absolute;bottom:4px;left:4px">Full screen</button>';
  const status=overlay.querySelector('div');
  const gazeDot=document.createElement('span');
  gazeDot.style.cssText='position:absolute;width:18px;height:18px;border:3px solid #007c91;border-radius:50%;background:#ffffff99;transform:translate(-50%,-50%);pointer-events:none;display:none;box-shadow:0 0 0 2px white';
  overlay.append(gazeDot);
  const timer=setInterval(()=>{
    const fresh=sample&&performance.now()-sampleReceived<500;
    const mapped=fresh&&sample.worn&&sample.surfaceValid&&Number.isFinite(sample.x)&&Number.isFinite(sample.y);
    gazeDot.style.display=mapped&&sample.x>=0&&sample.x<=1&&sample.y>=0&&sample.y<=1?'block':'none';
    if(mapped){const r=overlay.querySelector('img').getBoundingClientRect(),o=overlay.getBoundingClientRect();gazeDot.style.left=(r.left-o.left+sample.x*r.width)+'px';gazeDot.style.top=(r.top-o.top+sample.y*r.height)+'px';}
    let reason=!fresh?'Waiting for gaze data':!sample.worn?'Not worn':!sample.surfaceValid?'Mat not located: keep all four markers in the scene camera':!audioEnabled?'Sound off: click Enable sound':calibrating?'Capturing baseline':!['look','after'].includes(phase)?'Select a playing stage':lastZone<0?'Gaze outside AOIs: look at a donut':consumed[lastZone]?'This donut is marked eaten. Return to controls to reset.':dwell.fired?'Played: look away, then back to repeat':`Dwell ${Math.round(dwell.progress*100)}%`;
    status.textContent=`Markers ${fresh?sample.markerCount??0:0}/4 · ${reason} · AOI notes: ${noteCount}`;
  },100);
  const studioPanel=document.querySelector('.studio');
  const studioHome=studioPanel?document.createComment('studio home'):null;
  if(studioPanel)studioPanel.before(studioHome);
  overlay.querySelectorAll('button')[0].onclick=()=>{clearInterval(timer);if(studioPanel&&studioHome){studioHome.replaceWith(studioPanel);studioPanel.classList.remove('studio-docked');overlay.style.gap='';}overlay.remove();};
  overlay.querySelectorAll('button')[1].onclick=()=>overlay.requestFullscreen();
  document.body.append(overlay);
  const audioControl=document.createElement('button');audioControl.textContent=audioEnabled?'Pause sound':'Enable sound';audioControl.style.cssText='position:absolute;bottom:4px;left:280px';overlay.append(audioControl);
  audioControl.onclick=async()=>{await toggleAudio();if(audioEnabled&&!calibrating)setPhase('look');audioControl.textContent=audioEnabled?'Pause sound':'Enable sound';};
  if(studioPanel){const toggle=document.createElement('button');toggle.id='screenStudioToggle';toggle.textContent='Show eyes & curves';toggle.style.cssText='position:absolute;bottom:4px;left:120px';overlay.append(toggle);toggle.onclick=()=>{const docked=studioPanel.parentElement===overlay;if(docked){studioHome.after(studioPanel);studioPanel.classList.remove('studio-docked');overlay.querySelector('img').style.maxWidth='100%';toggle.textContent='Show eyes & curves';}else{overlay.append(studioPanel);studioPanel.classList.add('studio-docked');overlay.querySelector('img').style.maxWidth='56%';toggle.textContent='Mat only';}};}
  const stateCaption=document.createElement('p');stateCaption.dataset.stateOverlay='';stateCaption.style.cssText='position:absolute;bottom:42px;left:50%;transform:translateX(-50%);background:white;font-size:12px;white-space:nowrap;color:black';overlay.append(stateCaption);
};
