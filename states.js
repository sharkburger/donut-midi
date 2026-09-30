'use strict';
// Artistic sound mappings; labels are participant reports, never diagnoses.
const stateDefs={none:['Not reported',[]],confusion:['Confused',[60,61]],focus:['Focused',[72]],relax:['Relaxed',[48,55,60]],stress:['Stressed',[48,48,48]]};
const statePatterns=new GazePatterns();
let reportedState='none',stateSoundEnabled=true,patternSoundEnabled=false,stateNextSound=0,stateLastPattern='unknown',stateVoices=[];
const statePanel=document.createElement('section');
statePanel.className='panel';
statePanel.innerHTML='<h2>Self-report & gaze</h2><p>Gaze patterns are displayed automatically. Report your feelings yourself; if several coexist, choose the most salient for this version.</p><p data-pattern>Insufficient signal</p><label>My current feeling <select id="reportedState">'+Object.entries(stateDefs).map(([id,[name]])=>`<option value="${id}">${name}</option>`).join('')+'</select></label><p>Keys: 1 confused · 2 focused · 3 relaxed · 4 stressed · 0 clear. Your report stays until changed; it is not automatic detection.</p><label><input id="stateSound" type="checkbox" checked>Self-report voice</label> <label><input id="patternSound" type="checkbox">Gaze-pattern voice</label><p>Sustained dwell does not prove focus; frequent transitions do not prove confusion. Current gaze data does not automatically identify relaxation or stress. Sounds are creative choices.</p>';
document.querySelector('aside').prepend(statePanel);
let stateExpires=0;
function setReportedState(id){
  reportedState=id;stateExpires=Infinity;stateNextSound=0;
  document.querySelector('#reportedState').value=id;
  log('self_report',{state:id,origin:'participant',expiresAfterMs:30000});
  toast(id==='none'?'Self-report cleared':`Self-report: ${stateDefs[id][0]} (held until changed)`);
}
document.querySelector('#reportedState').onchange=e=>setReportedState(e.target.value);
document.querySelector('#stateSound').onchange=e=>{stateSoundEnabled=e.target.checked;stopStateSound();};
document.querySelector('#patternSound').onchange=e=>{patternSoundEnabled=e.target.checked;stopStateSound();};
document.addEventListener('keydown',e=>{if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const id={0:'none',1:'confusion',2:'focus',3:'relax',4:'stress'}[e.key];if(id)setReportedState(id);});
function stopStateSound(){for(const v of stateVoices){try{v.osc.stop();}catch{}v.osc.disconnect();v.gain.disconnect();}stateVoices=[];}
function playStateMotif(notes,kind){
  if(document.getElementById('backingTone')?.value==='soundscape')return;
  if(!instrument.ctx||instrument.ctx.state!=='running')return;
  const c=instrument.ctx,base=c.currentTime;
  notes.forEach((note,i)=>{const osc=c.createOscillator(),gain=c.createGain();const at=base+(kind==='relax'?0:i*.2),duration=kind==='relax'?2:kind==='focus'?1.3:.3;
    osc.type='sine';osc.frequency.value=440*2**((note-69)/12);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.09,at+.03);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    osc.connect(gain);gain.connect(instrument.master);const v={osc,gain};stateVoices.push(v);osc.onended=()=>{osc.disconnect();gain.disconnect();stateVoices=stateVoices.filter(x=>x!==v);};osc.start(at);osc.stop(at+duration+.05);
  });
}
let stateDisplay='';
function updateStates(now,zone,valid){
  const observation=statePatterns.update(now,zone,valid);
  if(reportedState!=='none'&&now>=stateExpires){reportedState='none';document.querySelector('#reportedState').value='none';log('self_report_expired');stopStateSound();}
  stateDisplay=`Gaze: ${observation.label} · Dwell ${observation.seconds.toFixed(1)}s · Transitions / 5 s: ${observation.switches}  |  Self-report: ${stateDefs[reportedState][0]}`;
  statePanel.querySelector('[data-pattern]').textContent=stateDisplay;
  document.querySelectorAll('[data-state-overlay]').forEach(el=>el.textContent=stateDisplay+'  |  1 confused 2 focused 3 relaxed 4 stressed 0 clear');
  if(observation.kind!==stateLastPattern){log('gaze_pattern',{kind:observation.kind,ruleVersion:'1',source});stateLastPattern=observation.kind;}
  if(typeof updateStudio==='function'){updateStudio(now,observation,valid);return;}
  if(!valid||!audioEnabled||!['look','after'].includes(phase)||document.hidden){stopStateSound();return;}
  if(now<stateNextSound)return;
  if(stateSoundEnabled&&reportedState!=='none'){playStateMotif(stateDefs[reportedState][1],reportedState);stateNextSound=now+8000;}
  else if(patternSoundEnabled&&['anchor','explore'].includes(observation.kind)){playStateMotif(observation.kind==='anchor'?[79]:[72,76,79],observation.kind);stateNextSound=now+8000;}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopStateSound();statePatterns.reset();}});
