'use strict';
const stateSoundscapes=new StateSoundscapes();
const midiOut=new MidiOutput(),backingGate=new StableChoice(8000);
let midiAccess=null,loopNext=0,loopBeat=0,loopVoices=[],loopKind=null;
const musicPanel=document.createElement('section');musicPanel.className='panel music-panel';
musicPanel.innerHTML=`<h3>Donut MIDI · Instruments & accompaniment</h3>
<label>Melody instrument <select id="melodyTone"><option value="piano">Synth piano</option><option value="guitar">Plucked guitar</option><option value="synth">Synthesizer</option></select></label>
<label>Accompaniment <select id="backingMode"><option value="off">Off</option><option value="manual" selected>Follow my self-report (held manually)</option><option value="artistic">Follow creative gaze curve (stable 8 s)</option></select></label>
<label>Accompaniment instrument <select id="backingTone"><option value="soundscape" selected>Continuous state soundscapes</option><option value="guitar">Strummed guitar (musical loop)</option><option value="synth">Synth chords</option><option value="piano">Piano arpeggio</option></select></label>
<label>Soundscape volume <input id="soundscapeVolume" type="range" min="0" max="0.8" step="0.01" value="0.38"></label><p>Relaxed: synthesized birds & breeze · Focused: gentle rain · Stressed: low wind · Confused: swirling water. Textures crossfade over 2 s. These are creative associations, not diagnostic sounds. Soundscapes play in the browser, not through MIDI.</p><label>Tempo BPM <input id="tempo" type="number" min="40" max="160" value="84"></label>
<div><button id="focusLoop">▶ Rain · focused</button><button id="relaxLoop">Birds · relaxed</button><button id="stressLoop">Wind · stressed</button><button id="confusionLoop">Water · confused</button><button id="panicMusic">■ Stop all sound</button></div><p id="loopStatus" role="status">Choose a soundscape to begin. Manual selection is not machine recognition.</p>
<details><summary>Connect a MIDI synth / GarageBand</summary><button id="enableMidi">Enable MIDI output</button><select id="midiPorts" aria-label="MIDI output port"><option value="">No MIDI output</option></select><p id="midiStatus">Requires Web MIDI support and permission. On Mac, enable the IAC Driver in Audio MIDI Setup and select a software instrument in GarageBand. Configure channels and instruments in your DAW: melody uses channel 1; accompaniment uses channel 2.</p><label><input id="localSound" type="checkbox" checked> Also play browser audio</label></details><p>Piano and guitar are synthesized. Uploaded clips override the selected melody instrument. Accompaniment is not driven by a validated cognitive classifier.</p>`;
studio.querySelector('.studio-heading').after(musicPanel);
$('melodyTone').onchange=()=>{instrument.tone=$('melodyTone').value;midiOut.program({piano:0,guitar:24,synth:89}[instrument.tone],0);};
$('soundscapeVolume').oninput=()=>stateSoundscapes.setVolume($('soundscapeVolume').value);
$('backingTone').onchange=()=>{stopBacking();if($('backingTone').value==='soundscape')return;midiOut.program({piano:0,guitar:24,synth:89}[$('backingTone').value],1);};
$('backingMode').onchange=()=>{stopBacking();backingGate.reset();};
$('tempo').onchange=()=>{$('tempo').value=clamp(Number($('tempo').value)||84,40,160);stopBacking();};
function startFocusBacking(){ $('backingMode').value='manual';setReportedState('focus');stopBacking(); }
async function selectLoop(id){if(typeof researchRunning==='function'&&researchRunning()){toast('End the research session first.');return;}if(!audioEnabled)await toggleAudio();else await instrument.start();setPhase('look');$('backingMode').value='manual';setReportedState(id);if($('backingTone').value!=='soundscape')stopBacking();}
$('focusLoop').onclick=()=>selectLoop('focus');$('relaxLoop').onclick=()=>selectLoop('relax');$('stressLoop').onclick=()=>selectLoop('stress');$('confusionLoop').onclick=()=>selectLoop('confusion');
$('panicMusic').onclick=()=>{audioEnabled=false;stateSoundscapes.stop(true);instrument.stop();stopStateSound();$('backingMode').value='off';$('audioState').textContent='Sound paused';$('audioButton').textContent='▶ Resume playing';};
function backingActive(){return $('backingMode').value!=='off';}
function localSoundEnabled(){return $('localSound').checked;}
function stopBacking(){stateSoundscapes.stop();for(const v of loopVoices)instrument.release(v);loopVoices=[];loopNext=0;loopBeat=0;loopKind=null;midiOut.panic();}
function loopEligible(){return !(typeof gameModeActive==='function'&&gameModeActive())&&audioEnabled&&instrument.ctx?.state==='running'&&!document.hidden&&!calibrating&&['look','after'].includes(phase)&&!(typeof researchRunning==='function'&&researchRunning())&&(source!=='live'||sample&&sample.worn&&($('backingTone').value==='soundscape'||sample.surfaceValid)&&performance.now()-sampleReceived<500)&&(source!=='replay'||replayPlaying);}
function tickBacking(){
 const mode=$('backingMode').value;if(mode==='off'||!loopEligible()){if(loopNext||loopVoices.length||stateSoundscapes.layer)stopBacking();backingGate.reset();$('loopStatus').textContent=mode==='off'?'AccompanimentOff':'Accompaniment idle: enable sound, use valid input and select Look or Aftertaste';return;}
 const raw=mode==='manual'?(reportedState==='none'?null:reportedState):(regionCurve.value===null?null:regionKeys[Math.floor(regionCurve.value)]);
 const kind=mode==='manual'?raw:backingGate.update(raw,performance.now());
 if(kind===null){if(loopNext||stateSoundscapes.layer)stopBacking();$('loopStatus').textContent='Choose a feeling or wait for 8 s of stable creative mapping';return;}
 if($('backingTone').value==='soundscape'){
  if(!localSoundEnabled()||!$('stateSound').checked){stateSoundscapes.stop();$('loopStatus').textContent='State soundscapes muted';return;}
  stateSoundscapes.set(kind,instrument.ctx,instrument.master);stateSoundscapes.tick();
  $('loopStatus').textContent=soundscapeNames[kind]+' · '+(mode==='manual'?'Self-report':'Creative mapping, not classification');return;
 }
 if(kind!==loopKind){stopBacking();loopKind=kind;}
 $('loopStatus').textContent=`${stateDefs[kind][0]}Accompaniment · ${mode==='manual'?'Manually selected':'Creative mapping, not cognitive classification'} · ${$('tempo').value} BPM`;
 const c=instrument.ctx,beatSeconds=60/clamp(Number($('tempo').value)||84,40,160);if(!loopNext||loopNext<c.currentTime-.15)loopNext=c.currentTime+.04;
 loopVoices=loopVoices.filter(v=>!v.ended&&!v.released);
 while(loopNext<c.currentTime+.12){
  const chords=kind==='focus'?[[48,52,55],[45,48,52],[41,45,48],[43,47,50]]:kind==='relax'?[[48,55,60],[41,48,57]]:kind==='stress'?[[48,55,58]]:[[48,49,55]];
  const chord=chords[Math.floor(loopBeat/4)%chords.length],tone=$('backingTone').value;
  const played=tone==='piano'?[chord[loopBeat%3]+12]:chord;
  if(kind!=='relax'||loopBeat%2===0)played.forEach((note,i)=>{const at=loopNext+(tone==='guitar'?i*.035:0);const v=instrument.voice(note,false,tone,at,.35);if(v)loopVoices.push(v);midiOut.note(note,1,Math.min(1600,beatSeconds*900),(at-c.currentTime)*1000);});
  loopBeat++;loopNext+=beatSeconds;
 }
}
setInterval(tickBacking,30);
$('enableMidi').onclick=async()=>{try{if(!navigator.requestMIDIAccess)throw Error('This browser does not support Web MIDI. Use a browser with Web MIDI support.');midiAccess=await navigator.requestMIDIAccess({sysex:false});refreshMidi();midiAccess.onstatechange=refreshMidi;}catch(e){$('midiStatus').textContent=e.message;}};
function refreshMidi(){const selected=midiOut.port?.id||'';$('midiPorts').replaceChildren(new Option('No MIDI output',''));for(const port of midiAccess.outputs.values())if(port.state!=='disconnected')$('midiPorts').add(new Option(port.name||port.id,port.id));$('midiPorts').value=selected;if(!$('midiPorts').value)midiOut.select(null);$('midiStatus').textContent=$('midiPorts').options.length>1?'Select an output port and load an instrument in the receiving software.':'No MIDI outputs found. Enable IAC or connect a MIDI device.';}
$('midiPorts').onchange=()=>{midiOut.select(midiAccess.outputs.get($('midiPorts').value)||null);$('melodyTone').onchange();$('backingTone').onchange();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stateSoundscapes.stop(true);stopBacking();midiOut.panic();}});window.addEventListener('pagehide',()=>{stateSoundscapes.stop(true);midiOut.panic();});
