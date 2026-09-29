'use strict';
// Artistic sound mappings; labels are participant reports, never diagnoses.
const stateDefs={none:['未标记',[]],confusion:['困惑',[60,61]],focus:['专注',[72]],relax:['放松',[48,55,60]],stress:['压力',[48,48,48]]};
const statePatterns=new GazePatterns();
let reportedState='none',stateSoundEnabled=true,patternSoundEnabled=false,stateNextSound=0,stateLastPattern='unknown',stateVoices=[];
const statePanel=document.createElement('section');
statePanel.className='panel';
statePanel.innerHTML='<h2>感受与眼动</h2><p>自动显示眼动模式；感受由你标记，可共存的感受在本版中先选最明显的一种。</p><p data-pattern>信号不足</p><label>我的当前感受 <select id="reportedState">'+Object.entries(stateDefs).map(([id,[name]])=>`<option value="${id}">${name}</option>`).join('')+'</select></label><p>快捷键 1 困惑 · 2 专注 · 3 放松 · 4 压力 · 0 清除。标记 30 秒后自动过期。</p><label><input id="stateSound" type="checkbox" checked>感受声部</label> <label><input id="patternSound" type="checkbox">眼动模式声部</label><p>持续停留不等于专注，频繁切换不等于困惑；放松和压力不会由当前眼动数据自动判断。声音是创作约定。</p>';
document.querySelector('aside').prepend(statePanel);
let stateExpires=0;
function setReportedState(id){
  reportedState=id;stateExpires=performance.now()+30000;stateNextSound=0;
  document.querySelector('#reportedState').value=id;
  log('self_report',{state:id,origin:'participant',expiresAfterMs:30000});
  toast(id==='none'?'已清除感受标记':`自述：${stateDefs[id][0]}（30 秒）`);
}
document.querySelector('#reportedState').onchange=e=>setReportedState(e.target.value);
document.querySelector('#stateSound').onchange=e=>{stateSoundEnabled=e.target.checked;stopStateSound();};
document.querySelector('#patternSound').onchange=e=>{patternSoundEnabled=e.target.checked;stopStateSound();};
document.addEventListener('keydown',e=>{if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const id={0:'none',1:'confusion',2:'focus',3:'relax',4:'stress'}[e.key];if(id)setReportedState(id);});
function stopStateSound(){for(const v of stateVoices){try{v.osc.stop();}catch{}v.osc.disconnect();v.gain.disconnect();}stateVoices=[];}
function playStateMotif(notes,kind){
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
  stateDisplay=`眼动：${observation.label} · 停留 ${observation.seconds.toFixed(1)}s · 5秒切换 ${observation.switches} 次 ｜ 自述：${stateDefs[reportedState][0]}`;
  statePanel.querySelector('[data-pattern]').textContent=stateDisplay;
  document.querySelectorAll('[data-state-overlay]').forEach(el=>el.textContent=stateDisplay+' ｜ 1困惑 2专注 3放松 4压力 0清除');
  if(observation.kind!==stateLastPattern){log('gaze_pattern',{kind:observation.kind,ruleVersion:'1',source});stateLastPattern=observation.kind;}
  if(!valid||!audioEnabled||!['look','after'].includes(phase)||document.hidden){stopStateSound();return;}
  if(now<stateNextSound)return;
  if(stateSoundEnabled&&reportedState!=='none'){playStateMotif(stateDefs[reportedState][1],reportedState);stateNextSound=now+8000;}
  else if(patternSoundEnabled&&['anchor','explore'].includes(observation.kind)){playStateMotif(observation.kind==='anchor'?[79]:[72,76,79],observation.kind);stateNextSound=now+8000;}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopStateSound();statePatterns.reset();}});
