'use strict';
const midiOut=new MidiOutput(),backingGate=new StableChoice(8000);
let midiAccess=null,loopNext=0,loopBeat=0,loopVoices=[],loopKind=null;
const musicPanel=document.createElement('section');musicPanel.className='panel music-panel';
musicPanel.innerHTML=`<h3>Donut MIDI · 乐器与伴奏</h3>
<label>旋律音色 <select id="melodyTone"><option value="piano">合成钢琴</option><option value="guitar">拨弦吉他</option><option value="synth">合成器</option></select></label>
<label>持续声部 <select id="backingMode"><option value="off">关闭</option><option value="manual" selected>跟随我的感受标记（手动保持）</option><option value="artistic">跟随眼动创作曲线（稳定 8 秒）</option></select></label>
<label>伴奏音色 <select id="backingTone"><option value="guitar">吉他扫弦</option><option value="synth">合成器和弦</option><option value="piano">钢琴分解和弦</option></select></label>
<label>速度 BPM <input id="tempo" type="number" min="40" max="160" value="84"></label>
<div><button id="focusLoop">▶ 专注循环</button><button id="relaxLoop">放松伴奏</button><button id="panicMusic">■ 停止全部声音</button></div><p id="loopStatus" role="status">点击专注循环开始；手动选择不代表机器识别。</p>
<details><summary>连接 MIDI 合成器 / GarageBand</summary><button id="enableMidi">启用 MIDI 输出</button><select id="midiPorts" aria-label="MIDI 输出端口"><option value="">不输出 MIDI</option></select><p id="midiStatus">浏览器需支持 Web MIDI 并获得许可。Mac 可先在“音频 MIDI 设置”启用 IAC 驱动，再在 GarageBand 选择软件乐器轨道。不同 DAW 的 MIDI 通道与音色需要单独设置；这里输出旋律通道 1、伴奏通道 2。</p><label><input id="localSound" type="checkbox" checked> 同时播放浏览器音色</label></details><p>内置钢琴与吉他为程序合成音色；上传音频仍优先于所选旋律音色。持续声部尚未由科学认知分类模型驱动。</p>`;
studio.querySelector('.studio-heading').after(musicPanel);
$('melodyTone').onchange=()=>{instrument.tone=$('melodyTone').value;midiOut.program({piano:0,guitar:24,synth:89}[instrument.tone],0);};
$('backingTone').onchange=()=>{stopBacking();midiOut.program({piano:0,guitar:24,synth:89}[$('backingTone').value],1);};
$('backingMode').onchange=()=>{stopBacking();backingGate.reset();};
$('tempo').onchange=()=>{$('tempo').value=clamp(Number($('tempo').value)||84,40,160);stopBacking();};
function startFocusBacking(){ $('backingMode').value='manual';setReportedState('focus');stopBacking(); }
async function selectLoop(id){if(typeof researchRunning==='function'&&researchRunning()){toast('请先结束研究采集。');return;}if(!audioEnabled)await toggleAudio();else await instrument.start();setPhase('look');$('backingMode').value='manual';setReportedState(id);stopBacking();}
$('focusLoop').onclick=()=>selectLoop('focus');$('relaxLoop').onclick=()=>selectLoop('relax');
$('panicMusic').onclick=()=>{audioEnabled=false;instrument.stop();stopStateSound();$('backingMode').value='off';$('audioState').textContent='声音已暂停';$('audioButton').textContent='▶ 继续演奏';};
function backingActive(){return $('backingMode').value!=='off';}
function localSoundEnabled(){return $('localSound').checked;}
function stopBacking(){for(const v of loopVoices)instrument.release(v);loopVoices=[];loopNext=0;loopBeat=0;loopKind=null;midiOut.panic();}
function loopEligible(){return audioEnabled&&instrument.ctx?.state==='running'&&!document.hidden&&!calibrating&&['look','after'].includes(phase)&&!(typeof researchRunning==='function'&&researchRunning())&&(source!=='live'||sample&&sample.worn&&sample.surfaceValid&&performance.now()-sampleReceived<500)&&(source!=='replay'||replayPlaying);}
function tickBacking(){
 const mode=$('backingMode').value;if(mode==='off'||!loopEligible()){if(loopNext||loopVoices.length)stopBacking();backingGate.reset();$('loopStatus').textContent=mode==='off'?'持续声部关闭':'伴奏待机：需开启声音、有效眼动和观看阶段';return;}
 const raw=mode==='manual'?(reportedState==='none'?null:reportedState):(regionCurve.value===null?null:regionKeys[Math.floor(regionCurve.value)]);
 const kind=mode==='manual'?raw:backingGate.update(raw,performance.now());
 if(kind===null){if(loopNext)stopBacking();$('loopStatus').textContent='等待选择感受或创作曲线稳定 8 秒';return;}
 if(kind!==loopKind){stopBacking();loopKind=kind;}
 $('loopStatus').textContent=`${stateDefs[kind][0]}持续声部 · ${mode==='manual'?'手动选择':'创作映射，非认知识别'} · ${$('tempo').value} BPM`;
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
$('enableMidi').onclick=async()=>{try{if(!navigator.requestMIDIAccess)throw Error('此浏览器不支持 Web MIDI，请用支持它的浏览器打开本地地址。');midiAccess=await navigator.requestMIDIAccess({sysex:false});refreshMidi();midiAccess.onstatechange=refreshMidi;}catch(e){$('midiStatus').textContent=e.message;}};
function refreshMidi(){const selected=midiOut.port?.id||'';$('midiPorts').replaceChildren(new Option('不输出 MIDI',''));for(const port of midiAccess.outputs.values())if(port.state!=='disconnected')$('midiPorts').add(new Option(port.name||port.id,port.id));$('midiPorts').value=selected;if(!$('midiPorts').value)midiOut.select(null);$('midiStatus').textContent=$('midiPorts').options.length>1?'选择输出端口；在接收软件中加载乐器。':'未找到 MIDI 输出。请先启用 IAC 或连接 MIDI 设备。';}
$('midiPorts').onchange=()=>{midiOut.select(midiAccess.outputs.get($('midiPorts').value)||null);$('melodyTone').onchange();$('backingTone').onchange();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopBacking();midiOut.panic();}});window.addEventListener('pagehide',()=>midiOut.panic());
