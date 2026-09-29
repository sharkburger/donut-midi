'use strict';
const {clamp,ZONES,zoneAt,pupil,Dwell,parseRecording}=DonutCore;
const $=id=>document.getElementById(id);
const VERSION='0.1.0';
const phaseNames={prepare:'01 / 准备',look:'02 / 观看',taste:'03 / 品尝',after:'04 / 余味',end:'05 / 结束'};
const phaseHints={prepare:'取得个人参考值，然后开始观看。',look:'在一个甜甜圈区域停留，演奏一个音。',taste:'暂停选音，延续最后一音；放回食物后切换到余味。',after:'再次演奏，听听同一旋律的变化。',end:'本轮已结束。重新摆盘，开始下一首。'};
let source='simulate',phase='prepare',consumed=[false,false,false],baseline=4,baselineReady=true;
let sample=null,sampleReceived=0,smoothed=4,delta=0,lastFrame=performance.now(),lastPupilAt=0;
let pointer={x:null,y:null},audioStarted=false,audioEnabled=false,ws=null,connectionState='未连接';
let consumedButtons=[],lastZone=-1,lastNoteZone=-1,noteCount=0,pulses=[],trace=[];
let calibrating=null,recording=null,lastRecording=null,lastRecordSample=0,eventCount=0;
let replay=null,replayIndex=0,replayPlaying=false,replayTime=0,replayTick=0,lastUITick=0;
let config={dwell:500,body:true,mapping:'brightness',strength:.6,volume:.35,notes:[60,64,67],preset:'body'};
const dwell=new Dwell();
let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function snapshot(){return {phase,consumed:[...consumed],baseline,baselineReady,config:structuredClone(config),source};}
function log(type,payload={}){if(recording)recording.events.push({t:performance.now()-recording.start,type,...payload});}
function mark(){eventCount++;log('marker',{number:eventCount});toast(recording?`已记录时刻 #${eventCount}`:'尚未开启记录；此标记不会保存。');}
class Instrument{
  constructor(){this.ctx=null;this.voices=[];this.hold=null;}
  async start(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();this.master.gain.value=config.volume*.32;
      const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-15;compressor.ratio.value=8;
      this.master.connect(compressor);compressor.connect(this.ctx.destination);
    }
    await this.ctx.resume();
  }
  voice(midi,held=false){
    if(!this.ctx||!audioEnabled)return null;
    const c=this.ctx,t=c.currentTime,osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain();
    const lfo=c.createOscillator(),depth=c.createGain();
    osc.type='triangle';osc.frequency.value=440*2**((midi-69)/12);filter.type='lowpass';filter.frequency.value=1400;
    lfo.frequency.value=5;depth.gain.value=0;lfo.connect(depth);depth.connect(osc.detune);
    osc.connect(filter);filter.connect(gain);gain.connect(this.master);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.40,t+.04);
    osc.start();lfo.start();
    if(!held){gain.gain.exponentialRampToValueAtTime(.001,t+2.5);osc.stop(t+2.6);lfo.stop(t+2.6);}
    const v={osc,filter,gain,lfo,depth,held,ended:false};this.voices.push(v);
    osc.onended=()=>{v.ended=true;osc.disconnect();lfo.disconnect();filter.disconnect();gain.disconnect();depth.disconnect();this.voices=this.voices.filter(x=>x!==v);};
    return v;
  }
  release(v){if(!v||v.ended||v.released)return;v.released=true;const t=this.ctx.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.12);try{v.osc.stop(t+.8);v.lfo.stop(t+.8);}catch{}}
  stop(){for(const v of this.voices)this.release(v);this.hold=null;}
  sustain(midi){this.stop();this.hold=this.voice(midi,true);}
  update(amount){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(audioEnabled?config.volume*.32:0,t,.1);
    for(const v of this.voices){v.filter.frequency.setTargetAtTime(config.mapping==='brightness'?1400*2**(amount*2):1400,t,.12);v.depth.gain.setTargetAtTime(config.mapping==='vibrato'?clamp(Math.abs(amount)*30,0,35):0,t,.12);}
  }
}
const instrument=new Instrument();
async function toggleAudio(){
  try{await instrument.start();audioStarted=true;audioEnabled=!audioEnabled;if(!audioEnabled){instrument.stop();dwell.reset();}else if(phase==='prepare')setPhase('look');else if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustain(config.notes[lastNoteZone]);
  $('audioButton').textContent=audioEnabled?'Ⅱ 暂停声音':'▶ 继续演奏';$('audioState').textContent=audioEnabled?'声音已开启 · 空格暂停':'声音已暂停';log('audio',{enabled:audioEnabled});}catch(e){toast('声音无法启动：'+e.message);}
}
function setPhase(value,fromReplay=false){
  if(!phaseNames[value])return;phase=value;dwell.reset();
  $('phaseLabel').textContent=phaseNames[phase];$('phaseHint').textContent=phaseHints[phase];
  document.querySelectorAll('[data-phase]').forEach(b=>b.classList.toggle('active',b.dataset.phase===phase));
  if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustain(config.notes[lastNoteZone]);
  else if(['prepare','end'].includes(phase)||instrument.hold)instrument.stop();
  if(!fromReplay)log('phase',{phase});
}
function setConsumed(i,value,fromReplay=false){
  consumed[i]=value;const b=consumedButtons[i];if(b){b.textContent=value?'已吃完 · 撤销':'吃完了 −';b.setAttribute('aria-pressed',String(value));}
  if(value&&lastNoteZone===i)instrument.stop();dwell.reset();if(!fromReplay)log('consumed',{zone:i,value});
}
function resetFood(){for(let i=0;i<3;i++)setConsumed(i,false);lastNoteZone=-1;setPhase('prepare');toast('已重新摆盘；新参与者请重新采集参考值。');}
function receive(s){sample=s;sampleReceived=performance.now();}
function disconnect(){if(ws){ws.onclose=null;ws.close();ws=null;}connectionState='未连接';}
function switchSource(value){
  if(typeof statePatterns!=='undefined')statePatterns.reset();
  if(recording)stopRecording();disconnect();source=value;sample=null;sampleReceived=0;lastPupilAt=0;pointer={x:null,y:null};calibrating=null;
  baseline=4;baselineReady=source==='simulate';smoothed=4;delta=0;trace=[];replayPlaying=false;instrument.stop();dwell.reset();setPhase('prepare');
  $('source').value=source;$('simControls').hidden=source!=='simulate';$('liveControls').hidden=source!=='live';$('replayControls').hidden=source!=='replay';
  $('sourceBadge').textContent={simulate:'● 鼠标模拟',replay:'● 数据回放',live:'● Neon 实时'}[source];
  $('calibrate').disabled=source==='replay';$('calibrationInfo').textContent=source==='live'?'等待实时数据；采集个人参考值后启用身体调制。':'采集期间保持观看位置、照明和滑块不变。';
  if(source==='replay'&&!replay)loadDemo();updateReplayButton();
}
function connect(){
  disconnect();const url=$('wsUrl').value.trim();
  if(!/^ws:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)){toast('第一版仅接受本机 ws://127.0.0.1:端口 桥接。');return;}
  connectionState='连接中';$('connectionInfo').textContent='正在连接本机桥接…';
  ws=new WebSocket(url);
  ws.onopen=()=>{connectionState='已连接，等待数据';$('connectionInfo').textContent='桥接已连接。等待 Neon 和桌垫标记。';};
  ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='status'){$('connectionInfo').textContent=m.message;return;}
    if(m.type==='sample'&&m.source==='neon'&&typeof m.worn==='boolean'&&typeof m.surfaceValid==='boolean'&&['x','y','pupilLeft','pupilRight'].every(k=>m[k]===null||Number.isFinite(m[k]))){receive(m);connectionState='正在接收';}
  }catch{}};
  ws.onerror=()=>{$('connectionInfo').textContent='连接失败。请确认桥接已启动，并检查端口。';};
  ws.onclose=()=>{connectionState='连接已断开';sample=null;instrument.stop();$('connectionInfo').textContent='桥接已断开；可重新连接。';};
}
function startCalibration(){
  if(source==='replay')return;
  if(recording){toast('请先停止记录，再重新采集参考值。');return;}
  if(!sample||pupil(sample)===null||performance.now()-sampleReceived>500){toast('还没有有效瞳孔输入。请检查佩戴和 Compute eye state。');return;}
  setPhase('prepare');calibrating={start:performance.now(),values:[],last:0};baselineReady=false;toast('开始 15 秒参考值采集，请保持观看位置与照明稳定。');
}
function updateCalibration(now){
  if(!calibrating)return;
  if(now-calibrating.last>=50){const p=sample&&now-sampleReceived<500?pupil(sample):null;if(p!==null)calibrating.values.push(p);calibrating.last=now;}
  const left=Math.max(0,15-(now-calibrating.start)/1000);$('calibrationInfo').textContent=`采集中：还剩 ${left.toFixed(0)} 秒 · ${calibrating.values.length} 个有效样本`;
  if(left<=0){const values=calibrating.values.sort((a,b)=>a-b);calibrating=null;if(values.length<150){baselineReady=false;$('calibrationInfo').textContent='有效数据不足，请检查输入后重试。';toast('参考值采集失败，没有启用身体调制。');return;}
    baseline=values[Math.floor(values.length/2)];smoothed=baseline;delta=0;baselineReady=true;$('calibrationInfo').textContent=`参考值 ${baseline.toFixed(2)} mm · 可开始观看。`;toast('参考值已就绪。');}
}
function recordStart(){
  if(recording){stopRecording();return;}
  if(!$('recordConsent').checked){toast('请先说明记录用途并勾选已获得同意。');return;}
  if(source==='replay'){toast('回放不生成新的参与者记录；请切换模拟或实时模式。');return;}
  if(calibrating){toast('请等待参考值采集完成。');return;}
  recording={schema:'donut-song/1',appVersion:VERSION,createdAt:new Date().toISOString(),source,start:performance.now(),initial:snapshot(),samples:[],events:[],notes:'Browser sampled stream ~30 Hz, not full-rate research data. No video/audio. Replay re-sonifies with current mapping.'};
  lastRecordSample=0;eventCount=0;$('record').textContent='■ 停止记录';$('recordBadge').textContent='● 记录中';$('recordBadge').classList.add('recording');$('export').disabled=true;log('start',snapshot());
}
function stopRecording(){if(!recording)return;log('stop');recording.durationMs=performance.now()-recording.start;delete recording.start;lastRecording=recording;recording=null;$('record').textContent='● 开始记录';$('recordBadge').textContent='记录已停止';$('recordBadge').classList.remove('recording');$('export').disabled=false;$('recordInfo').textContent=`已保留 ${lastRecording.samples.length} 个样本、${lastRecording.events.length} 个事件。导出后保存；刷新页面会清空。`;}
function exportRecording(){if(!lastRecording)return;const blob=new Blob([JSON.stringify(lastRecording)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`donut-song-${lastRecording.source}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function loadDemo(){const samples=[];for(let t=0;t<=30000;t+=33.3333){const zone=Math.floor(t/1800)%3;const gap=t%1800>1400;const v=4+.38*Math.sin(t/3100)+.1*Math.sin(t/900);samples.push({t,x:gap?.5:ZONES[zone].x,y:gap?.84:.43,pupilLeft:v,pupilRight:v+.02,worn:true,surfaceValid:true,phase:t<12000?'look':t<19000?'taste':'after',consumed:[t>25000,false,false],baseline:4,baselineReady:true});}replay={schema:'donut-song/1',source:'synthetic-demo',samples};restartReplay();$('replayInfo').textContent='30 秒合成示例，非真人数据。使用当前映射重新配乐。';}
function restartReplay(){replayTime=0;replayIndex=0;replayPlaying=false;sample=null;instrument.stop();lastNoteZone=-1;for(let i=0;i<3;i++)setConsumed(i,false,true);dwell.reset();setPhase('prepare',true);$('replayProgress').value=0;updateReplayButton();}
function updateReplayButton(){$('playReplay').textContent=replayPlaying?'Ⅱ 暂停回放':'▶ 播放';}
function tickReplay(now){if(!replayPlaying||!replay)return;replayTime+=Math.min(now-replayTick,100);replayTick=now;
  while(replayIndex<replay.samples.length&&replay.samples[replayIndex].t<=replayTime){const s=replay.samples[replayIndex++];receive(s);baseline=s.baseline;baselineReady=s.baselineReady!==false;
    if(s.phase!==phase)setPhase(s.phase,true);s.consumed.forEach((v,i)=>{if(v!==consumed[i])setConsumed(i,v,true);});}
  const duration=replay.samples[replay.samples.length-1].t;$('replayProgress').value=duration?replayTime/duration:1;
  if(replayIndex>=replay.samples.length){replayPlaying=false;sample=null;setPhase('end',true);updateReplayButton();toast('回放结束；修改映射后可以再听一次。');}
}
function settingsChanged(){
  config={dwell:+$('dwell').value,body:$('bodyEnabled').checked,mapping:$('mapping').value,strength:+$('strength').value/100,volume:+$('volume').value/100,notes:ZONES.map(z=>+$('note'+z.id).value),preset:$('preset').value};
  $('dwellValue').textContent=config.dwell+' ms';$('dwellStatus').textContent=`停留 ${config.dwell} ms 触发一次`;$('strengthValue').textContent=Math.round(config.strength*100)+'%';$('volumeValue').textContent=Math.round(config.volume*100)+'%';
  dwell.reset();if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustain(config.notes[lastNoteZone]);log('mapping',{config:structuredClone(config)});
}
function trigger(zone){lastNoteZone=zone;noteCount++;instrument.voice(config.notes[zone]);pulses.push({zone,time:performance.now()});$('lastNote').textContent=`${ZONES[zone].name} · ${noteLabel(config.notes[zone])} · 第 ${noteCount} 音`;log('note',{zone,midi:config.notes[zone],delta,config:structuredClone(config)});}
function noteLabel(midi){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);}
function update(now){
  const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
  if(source==='simulate')receive({x:pointer.x,y:pointer.y,pupilLeft:+$('simPupil').value,pupilRight:+$('simPupil').value,worn:true,surfaceValid:pointer.x!==null,source:'simulate'});
  if(source==='replay')tickReplay(now);
  const fresh=sample&&now-sampleReceived<500&&(source!=='replay'||replayPlaying);const pv=fresh?pupil(sample):null;
  if(pv!==null){smoothed+=(pv-smoothed)*(1-Math.exp(-dt/.35));lastPupilAt=now;}
  else if(now-lastPupilAt>250)smoothed+=(baseline-smoothed)*(1-Math.exp(-dt/.4));
  delta=baselineReady?smoothed-baseline:0;
  const amount=config.body&&baselineReady?clamp(delta,-1,1)*config.strength:0;
  instrument.update(amount);updateCalibration(now);
  const enabled=fresh&&sample.worn&&sample.surfaceValid&&['look','after'].includes(phase)&&audioEnabled&&!calibrating;
  const zone=enabled?zoneAt(sample.x,sample.y,lastZone):-1;lastZone=zone;
  if(typeof updateStates==='function')updateStates(now,zone,!!(fresh&&sample.worn&&sample.surfaceValid)&&['look','after'].includes(phase));
  if(dwell.update(consumed[zone]?-1:zone,now,config.dwell,enabled))trigger(zone);
  if(fresh&&sample.surfaceValid&&sample.y>.86&&sample.y<.95&&phase!=='taste'&&instrument.voices.length)instrument.stop();
  // Stale or unworn live input must never leave a held sound playing indefinitely.
  if(source==='live'&&(!fresh||!sample.worn))instrument.stop();
  if(recording&&now-lastRecordSample>=33){lastRecordSample=now;const s=fresh?sample:{x:null,y:null,pupilLeft:null,pupilRight:null,worn:false,surfaceValid:false};recording.samples.push({t:now-recording.start,x:s.x,y:s.y,pupilLeft:s.pupilLeft,pupilRight:s.pupilRight,worn:s.worn,surfaceValid:s.surfaceValid,deviceTimestamp:s.deviceTimestamp??null,sceneGaze:s.sceneGaze??null,markerCount:s.markerCount??null,baseline,baselineReady,smoothed,delta,phase,consumed:[...consumed]});if(now-recording.start>=3600000){stopRecording();toast('已达到一小时记录上限，请导出。');}}
  if(now-lastUITick>100){lastUITick=now;trace.push(pv!==null?delta:null);if(trace.length>180)trace.shift();$('pupilDelta').innerHTML=pv!==null&&baselineReady?`${delta>=0?'+':''}${delta.toFixed(2)} <small>mm</small>`:'— <small>mm</small>';
    $('baselineLabel').textContent=baselineReady?`${source==='simulate'||replay?.source==='synthetic-demo'&&source==='replay'?'模拟':'个人'}参考值 ${baseline.toFixed(2)} mm`:'尚未取得参考值';$('bodyStatus').textContent=!config.body?'身体调制关闭':!baselineReady?'等待参考值':pv===null?'输入无效 · 回归中性':'身体调制开启';
    $('inputHealth').textContent=source==='simulate'?'模拟输入':source==='replay'?(replayPlaying?'回放中':'回放暂停'):!fresh?'等待设备数据':!sample.worn?'眼镜未佩戴':!sample.surfaceValid?'桌垫标记不可用':pv===null?'注视可用 · 无瞳孔':'注视与瞳孔可用';
    $('diagnostics').textContent=`来源：${source}；连接：${connectionState}；标记：${sample?.markerCount??'—'}/4；有效瞳孔：${pv===null?'否':'是'}；参考值：${baselineReady?'就绪':'待采集'}。`;
    if(recording)$('recordInfo').textContent=`正在记录 ${((now-recording.start)/1000).toFixed(0)} 秒 · ${recording.samples.length} 样本 · ${recording.events.length} 事件；关闭页面前停止并导出。`;
  }
  pulses=pulses.filter(p=>now-p.time<1800);
}
// WORKSHOP: change the mapping in Instrument.update(), notes above, or this drawing.
new p5(p=>{
  let host;
  p.setup=()=>{host=$('canvasHost');const c=p.createCanvas(host.clientWidth,host.clientWidth/1.5);c.parent(host);p.pixelDensity(Math.min(window.devicePixelRatio,2));p.textFont('Helvetica Neue, PingFang SC, sans-serif');
    c.elt.addEventListener('pointermove',e=>{const r=c.elt.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};});c.elt.addEventListener('pointerleave',()=>pointer={x:null,y:null});
    ZONES.forEach(z=>{const b=document.createElement('button');b.className='food-button';b.style.left=(z.x*100)+'%';b.textContent='吃完了 −';b.setAttribute('aria-label',`${z.name}吃完了，退出声部`);b.setAttribute('aria-pressed','false');b.onclick=()=>setConsumed(z.id,!consumed[z.id]);host.append(b);consumedButtons.push(b);});
    new ResizeObserver(()=>{p.resizeCanvas(host.clientWidth,host.clientWidth/1.5);}).observe(host);
  };
  p.draw=()=>{const now=performance.now();update(now);p.background('#f9f6ef');const w=p.width,h=p.height;
    p.stroke('#eee8de');p.strokeWeight(1);for(let x=25;x<w;x+=28)for(let y=25;y<h;y+=28)p.point(x,y);
    p.noStroke();p.fill('#998b7b');p.textAlign(p.CENTER);p.textSize(Math.max(8,w*.012));p.text('LOOK TO PLAY  /  凝视，让乐谱发声',w/2,h*.10);
    ZONES.forEach(z=>{const x=z.x*w,y=z.y*h,r=w*.095,id=z.id;
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
      }else{p.noFill();p.stroke('#cfc3b2');p.strokeWeight(1);p.circle(0,0,r*1.8);p.circle(0,0,r*.65);p.noStroke();p.fill('#9c8d7e');p.textSize(w*.013);p.text('余音',0,5);}
      p.noStroke();p.fill('#45382e');p.textSize(Math.max(10,w*.017));p.text(z.name,0,r*1.75);p.fill('#9a8b7c');p.textSize(Math.max(8,w*.011));p.text(`${String(id+1).padStart(2,'0')}  /  ${noteLabel(config.notes[id])}`,0,r*2.04);p.pop();
    });
    p.noFill();p.stroke('#ded5c7');p.rect(w*.2,h*.86,w*.6,h*.09,20);p.noStroke();p.fill('#9c8f7f');p.textSize(Math.max(9,w*.013));p.text('休止区  /  REST',w*.5,h*.915);
    const s=sample;const fresh=performance.now()-sampleReceived<500&&(source!=='replay'||replayPlaying);
    if(s&&fresh&&s.surfaceValid&&s.worn&&Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1){p.stroke('#c6613b');p.strokeWeight(1);p.noFill();p.circle(s.x*w,s.y*h,17);p.noStroke();p.fill('#c6613b');p.circle(s.x*w,s.y*h,4);}
  };
});
new p5(p=>{p.setup=()=>{const host=$('traceHost');p.createCanvas(host.clientWidth,64).parent(host);p.pixelDensity(1);new ResizeObserver(()=>p.resizeCanvas(host.clientWidth,64)).observe(host);};p.draw=()=>{p.clear();p.stroke('#c8ccbb');p.line(0,32,p.width,32);p.stroke('#778870');p.noFill();let drawing=false;trace.forEach((v,i)=>{if(v===null){if(drawing)p.endShape();drawing=false;}else{if(!drawing){p.beginShape();drawing=true;}p.vertex(i/(180-1)*p.width,32-clamp(v,-1,1)*25);}});if(drawing)p.endShape();};});
ZONES.forEach(z=>{const l=document.createElement('label');l.textContent=['原味','巧克力','草莓'][z.id];const s=document.createElement('select');s.id='note'+z.id;s.setAttribute('aria-label',z.name+'音高');for(const midi of [48,50,52,55,57,60,62,64,67,69,72]){const o=document.createElement('option');o.value=midi;o.textContent=noteLabel(midi);o.selected=midi===z.note;s.append(o);}l.append(s);$('noteControls').append(l);s.onchange=()=>{$('preset').value='custom';settingsChanged();};});
$('audioButton').onclick=toggleAudio;$('source').onchange=e=>switchSource(e.target.value);$('connect').onclick=connect;$('calibrate').onclick=startCalibration;$('mark').onclick=mark;$('record').onclick=recordStart;$('export').onclick=exportRecording;$('resetFood').onclick=resetFood;
$('recordConsent').onchange=()=>{if(!$('recordConsent').checked&&recording)stopRecording();};
$('simPupil').oninput=()=>{$('simPupilValue').textContent=(+$('simPupil').value).toFixed(2)+' mm';};
for(const id of ['dwell','bodyEnabled','mapping','strength','volume'])$(id).oninput=()=>{if(id!=='volume')$('preset').value='custom';settingsChanged();};
$('preset').onchange=()=>{if($('preset').value!=='custom'){$('bodyEnabled').checked=$('preset').value==='body';$('mapping').value='brightness';$('strength').value=60;}settingsChanged();};
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(source==='replay'&&replayPlaying){toast('回放中的阶段来自记录；暂停后可手动体验。');return;}setPhase(b.dataset.phase);});
$('projector').onclick=()=>{document.body.classList.toggle('projection');$('projector').textContent=document.body.classList.contains('projection')?'返回创作台 ↙':'投影视图 ↗';};
$('demoReplay').onclick=loadDemo;$('restartReplay').onclick=restartReplay;
$('playReplay').onclick=async()=>{if(!replay)loadDemo();if(replayIndex>=replay.samples.length)restartReplay();if(!audioEnabled)await toggleAudio();replayPlaying=!replayPlaying;replayTick=performance.now();if(!replayPlaying){instrument.stop();dwell.reset();}else if(phase==='taste'&&lastNoteZone>=0&&!consumed[lastNoteZone])instrument.sustain(config.notes[lastNoteZone]);updateReplayButton();};
$('replayFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100*1024*1024)throw Error('文件超过 100 MB。');const data=parseRecording(JSON.parse(await file.text()));replay=data;restartReplay();$('replayInfo').textContent=`已加载 ${file.name}（来源：${data.source||'未知'}）。使用当前映射重新配乐。`;toast('记录已载入。');}catch(err){toast(err.message);}e.target.value='';};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();toggleAudio();}if(e.key.toLowerCase()==='m')mark();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){instrument.stop();dwell.reset();if(replayPlaying){replayPlaying=false;updateReplayButton();}sample=null;pointer={x:null,y:null};}});
window.addEventListener('beforeunload',e=>{if(recording||lastRecording){e.preventDefault();e.returnValue='';}});
// Read-only state for workshop diagnostics and automated smoke checks.
window.donutDebug=()=>({source,phase,consumed:[...consumed],baseline,baselineReady,delta,noteCount,config:structuredClone(config),recording:!!recording,replayPlaying,voiceCount:instrument.voices.length});

// Keep the score and audio in the same visible document; hidden tabs pause playback.
const screenScoreButton=document.createElement('button');
screenScoreButton.textContent='屏幕桌垫 · 眼动演奏';
screenScoreButton.style.cssText='position:fixed;bottom:12px;left:12px;z-index:100;padding:12px';
document.body.append(screenScoreButton);
screenScoreButton.onclick=()=>{
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:200;background:#ddd;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML='<img src="monitor-mat.svg" alt="甜甜圈眼动乐谱" style="max-width:100%;max-height:100%;width:auto;height:auto"><div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:13px;background:white;padding:3px 10px;color:black" aria-live="polite"></div><button style="position:absolute;bottom:4px;right:4px">返回控制台</button><button style="position:absolute;bottom:4px;left:4px">全屏演奏</button>';
  const status=overlay.querySelector('div');
  const timer=setInterval(()=>{const fresh=sample&&performance.now()-sampleReceived<500;status.textContent=!fresh?'等待眼动数据':`标记 ${sample.markerCount??0}/4 · ${!sample.worn?'未佩戴':!sample.surfaceValid?'尚未定位':lastZone<0?'请看甜甜圈':ZONES[lastZone].name} · 已触发 ${noteCount} 音`;},200);
  overlay.querySelectorAll('button')[0].onclick=()=>{clearInterval(timer);overlay.remove();};
  overlay.querySelectorAll('button')[1].onclick=()=>overlay.requestFullscreen();
  document.body.append(overlay);
  const stateCaption=document.createElement('p');stateCaption.dataset.stateOverlay='';stateCaption.style.cssText='position:absolute;bottom:42px;left:50%;transform:translateX(-50%);background:white;font-size:12px;white-space:nowrap;color:black';overlay.append(stateCaption);
};
