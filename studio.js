'use strict';
const publicWebsite=!['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const studio=document.createElement('section');studio.className='studio';
studio.innerHTML=`<div class="studio-heading"><div><small>BODY / SCORE</small><h2>眼睛与声音时间线</h2></div><div><button id="startDuet">▶ 开始双声部演奏</button><button id="connectEyes">连接真实眼睛</button><button id="studioDemo">开启合成演示</button></div></div>
<div class="studio-grid"><section><h3>双眼三维姿态</h3><p id="eyeStatus">等待 Neon 三维眼球数据</p><div id="eyeScene"></div><p id="eyeNumbers"></p><small>Neon 原生中心与光轴；眼球球体半径 12 mm 为示意值。不是眼睛视频或 pye3d 拟合结果。拖动可旋转视角。</small></section>
<section><h3>曲线进入声区 → 触发声音</h3><label>曲线来源 <select id="curveSource"><option value="report">我的感受标记</option><option value="activity">眼动活动的创作映射</option><option value="pupil">相对瞳孔变化的创作映射</option></select></label><label><input type="checkbox" id="curveSound" checked>进入声区发声</label><p id="curveStatus">等待有效输入</p><canvas id="stateChart" aria-label="最近30秒的声区曲线和声音事件"></canvas><p>纵轴从下到上：放松 → 专注 → 压力 → 困惑。这是四个声音区域，不是认知强度排名。</p><small>进入区域并稳定 0.6 秒触发一次，冷却 1.5 秒。自动模式不识别心理状态；自述由 1–4 键标记，0 清除。缺失数据时曲线断开。</small></section></div>`;
document.querySelector('.workspace').before(studio);
const dockStyle=document.createElement('style');dockStyle.textContent='.studio.studio-docked{width:42%;max-height:88vh;overflow:auto;margin:0;padding:14px;box-sizing:border-box}.studio-docked .studio-grid{grid-template-columns:1fr;gap:12px}.studio-docked #eyeScene{height:120px}.studio-docked h2{font-size:18px;margin:3px 0 10px}.studio-docked h3{font-size:15px;margin:4px 0}.studio-docked small{display:none}.studio-docked p{font-size:12px;margin:5px 0}.studio-docked #eyeNumbers{min-height:0}.studio-docked label{font-size:12px}.studio-docked select{max-width:200px}';document.head.append(dockStyle);
const studioStyle=document.createElement('style');studioStyle.textContent=`.studio{margin:24px 0;padding:24px;background:#f2efe7;border:1px solid #d8d0c2;border-radius:20px}.studio-heading{display:flex;justify-content:space-between;align-items:center}.studio h2{margin:8px 0 22px}.studio h3{margin:0 0 12px}.studio-grid{display:grid;grid-template-columns:minmax(280px,1fr) minmax(420px,2fr);gap:26px}.studio small{color:#675f54;line-height:1.6}.studio label{display:inline-flex;gap:8px;align-items:center;margin-right:12px}.studio canvas{max-width:100%}#eyeScene{height:240px;background:#202a32;border-radius:14px;overflow:hidden}#stateChart{width:100%;height:280px}#eyeNumbers{min-height:40px;font-size:13px}@media(max-width:850px){.studio-grid{grid-template-columns:1fr}}`;document.head.append(studioStyle);
const regionCurve=new RegionCurve(),curvePoints=[],soundPoints=[];
const regionKeys=['relax','focus','stress','confusion'],regionNames=['放松','专注','压力','困惑'],regionColors=['#b4c6a5','#a8c6d9','#e4bc84','#c9acd0'];
let studioDemo=false,studioLastPoint=0,studioLastNote=noteCount,studioLastSource=source,studioLastMode='report',eyeDemoTime=0;
function resetStudio(){regionCurve.reset();curvePoints.length=0;soundPoints.length=0;studioLastPoint=0;stopStateSound();if(typeof resetEvidence==='function')resetEvidence();}
function connectRealEyes(){if(publicWebsite){toast('真实眼动请使用本地完整版；公开版连接器正在准备中。');return;}studioDemo=false;$('studioDemo').textContent='开启合成演示';resetStudio();if(source!=='live')switchSource('live');connect();}
$('connectEyes').onclick=connectRealEyes;
async function startDuet(){
  if(calibrating){toast('请等待瞳孔参考值采集完成，再开始演奏。');return;}
  studioDemo=false;$('studioDemo').textContent='开启合成演示';
  if(publicWebsite){if(source!=='simulate')switchSource('simulate');}
  else {if(source!=='live')switchSource('live');if(!ws||ws.readyState>1)connect();}
  if(!audioEnabled)await toggleAudio();
  else {try{await instrument.start();}catch(e){toast('声音无法启动：'+e.message);return;}}
  if(!audioEnabled||instrument.ctx?.state!=='running')return;
  setPhase('look');
  $('curveSource').value='report';
  setReportedState('focus');
  if(typeof startFocusBacking==='function')startFocusBacking();
  patternSoundEnabled=true;$('patternSound').checked=true;
  $('curveSound').checked=true;resetStudio();
  if(publicWebsite){$('canvasHost').scrollIntoView({behavior:'smooth',block:'center'});toast('鼠标停留甜甜圈即可弹奏；专注伴奏为手动选择，非自动识别。');return;}
  screenScoreButton.click();
  if(!studio.classList.contains('studio-docked'))$('screenStudioToggle')?.click();
  toast('双声部已开启：注视甜甜圈触发音符，手动专注声部持续伴奏（非自动识别）。');
}
$('startDuet').onclick=startDuet;
function performanceHint(now,mode){
  if(!audioEnabled||instrument.ctx?.state!=='running')return '请点击「开始双声部演奏」解锁声音';
  if(calibrating)return '正在采集瞳孔参考值';
  if(!['look','after'].includes(phase))return '当前阶段不演奏，请点击「开始双声部演奏」';
  if(!studioDemo){
    if(!sample||now-sampleReceived>=500)return '等待新鲜眼动数据，请检查手机连接';
    if(!sample.worn)return '设备尚未报告已佩戴';
    if(!sample.surfaceValid)return `桌垫尚未定位（标记 ${sample.markerCount??0}/4），请让四角进入眼镜场景画面`;
    if(mode==='report'&&reportedState==='none')return '请用 1–4 标记感受，或选择眼动活动';
    if(mode==='pupil'&&!baselineReady)return '请先采集 15 秒瞳孔参考值';
    if(mode==='pupil'&&pupil(sample)===null)return '等待有效瞳孔直径';
  }
  return '注视甜甜圈约半秒；移开再看可重奏。声区稳定 0.6 秒后发声';
}
$('studioDemo').onclick=async()=>{studioDemo=!studioDemo;resetStudio();$('studioDemo').textContent=studioDemo?'关闭合成演示':'开启合成演示';if(studioDemo&&!audioEnabled)await toggleAudio();};
$('curveSource').onchange=resetStudio;
$('curveSound').onchange=()=>{regionCurve.reset();stopStateSound();};
function updateStudio(now,observation,valid){
  const mode=$('curveSource').value;if(source!==studioLastSource||mode!==studioLastMode){resetStudio();studioLastSource=source;studioLastMode=mode;}
  let target=null,origin='';
  if(studioDemo){target=1.999+1.85*Math.sin(now/3400);origin='合成演示 · 非真人数据';}
  else if(mode==='report'){target=reportedState==='none'?null:regionKeys.indexOf(reportedState)+.5;origin='自述感受（手动保持）';}
  else if(mode==='activity'){target=valid?clamp(.5+observation.switches*.65-Math.min(observation.seconds,3)*.1,0,3.99):null;origin='眼动活动 → 声区 · 创作映射，非状态识别';}
  else {const pv=sample&&pupil(sample);target=valid&&baselineReady&&pv!==null?clamp(1.5+delta*2,0,3.99):null;origin='瞳孔变化 → 声区 · 非状态识别';}
  const running=(studioDemo||valid)&&audioEnabled&&['look','after'].includes(phase)&&!calibrating&&!document.hidden;
  const out=regionCurve.update(now,target,running);
  if(!running||out.value===null)stopStateSound();
  const allowSound=$('curveSound').checked&&(mode==='report'?stateSoundEnabled:patternSoundEnabled||studioDemo);
  if(out.hit&&allowSound&&!(typeof backingActive==='function'&&backingActive())){playStateMotif(stateDefs[out.hit][1],out.hit);const event={time:now,label:stateDefs[out.hit][0],value:out.value};soundPoints.push(event);log('region_sound',{region:out.hit,value:out.value,origin:studioDemo?'synthetic-demo':mode,ruleVersion:'curve-1'});}
  if(noteCount!==studioLastNote){studioLastNote=noteCount;soundPoints.push({time:now,label:noteLabel(config.notes[lastNoteZone]),value:null});}
  if(now-studioLastPoint>100){studioLastPoint=now;curvePoints.push({time:now,value:out.value});if(recording)log('curve_sample',{value:out.value,origin:studioDemo?'synthetic-demo':mode});}
  while(curvePoints.length&&now-curvePoints[0].time>30000)curvePoints.shift();while(soundPoints.length&&now-soundPoints[0].time>30000)soundPoints.shift();
  $('curveStatus').textContent=origin+(out.value===null?'':` ｜ 当前声区：${regionNames[Math.floor(out.value)]}`)+' ｜ '+performanceHint(now,mode)+(allowSound?'':' ｜ 声区声音关闭');
  if(typeof updateEvidence==='function')updateEvidence(now,observation,valid,mode,out.value,target);
  drawStateChart(now);eyeDemoTime=now;
}
function drawStateChart(now){
 const canvas=$('stateChart'),w=Math.max(canvas.clientWidth,360),h=280,dpr=window.devicePixelRatio||1;if(canvas.width!==Math.round(w*dpr)){canvas.width=Math.round(w*dpr);canvas.height=h*dpr;}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const l=56,r=w-14,t=15,b=220,x=time=>l+(time-(now-30000))/30000*(r-l),y=value=>b-value/4*(b-t);
 c.font='12px system-ui';for(let i=0;i<4;i++){c.fillStyle=regionColors[i];c.globalAlpha=.42;c.fillRect(l,y(i+1),r-l,(b-t)/4);c.globalAlpha=1;c.fillStyle='#4a4039';c.fillText(regionNames[i],3,y(i+.5)+4);}
 c.strokeStyle='#3a3530';c.lineWidth=1;c.beginPath();c.moveTo(l,t);c.lineTo(l,b);c.lineTo(r,b);c.stroke();for(let s=0;s<=30;s+=5){const px=l+s/30*(r-l);c.fillText(s===30?'现在':`${s-30}s`,px-10,239);}c.fillText('声音时间线（秒）· 点标记表示声音触发',l,272);
 c.strokeStyle='#513e59';c.lineWidth=2.5;c.beginPath();let pen=false;for(const p of curvePoints){if(p.value===null){pen=false;continue;}if(pen)c.lineTo(x(p.time),y(p.value));else c.moveTo(x(p.time),y(p.value));pen=true;}c.stroke();
 for(const p of soundPoints){const px=x(p.time),py=p.value===null?b:y(p.value);c.fillStyle=p.value===null?'#876b3f':'#722e77';c.beginPath();c.arc(px,py,4,0,Math.PI*2);c.fill();c.fillText(p.label,Math.min(px+4,r-25),p.value===null?255:py-7);}
}
function validEye(eye){return eye&&Array.isArray(eye.center)&&eye.center.length===3&&eye.center.every(Number.isFinite)&&Array.isArray(eye.direction)&&eye.direction.length===3&&eye.direction.every(Number.isFinite)&&Math.hypot(...eye.direction)>.0001;}
new p5(p=>{p.setup=()=>{const host=$('eyeScene');p.createCanvas(host.clientWidth,host.clientHeight,p.WEBGL).parent(host);p.pixelDensity(1);p.camera(0,0,230,0,0,0,0,1,0);new ResizeObserver(()=>p.resizeCanvas(host.clientWidth,host.clientHeight)).observe(host);};p.draw=()=>{
 const halfHeight=p.height<180?40:75,halfWidth=halfHeight*p.width/p.height;p.background('#202a32');p.ortho(-halfWidth,halfWidth,-halfHeight,halfHeight,0,1000);p.orbitControl();p.ambientLight(130);p.directionalLight(255,245,225,-.3,-.3,-1);
 const fresh=source==='live'&&sample&&sample.worn&&performance.now()-sampleReceived<500;let eyes=fresh?sample.eyes:null;
 if(studioDemo)eyes={left:{center:[-31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)},right:{center:[31,0,0],direction:[.25*Math.sin(eyeDemoTime/1200),.15*Math.cos(eyeDemoTime/1400),1],pupilDiameter:4+Math.sin(eyeDemoTime/1000)}};
 const available=['left','right'].filter(side=>validEye(eyes?.[side]));$('eyeStatus').textContent=studioDemo?'合成演示 · 非真人眼球':available.length?`Neon 原生三维数据 · ${available.length}/2 眼`:'等待 Neon 三维眼球数据（不会用注视点替代）';
 if(!available.length){$('eyeNumbers').textContent='需要桥接传来眼球中心与光轴。缺少数据时不绘制活动眼球。';return;}
 const origin=[0,1,2].map(i=>available.reduce((s,side)=>s+eyes[side].center[i],0)/available.length);
 $('eyeNumbers').textContent=available.map(side=>`${side==='left'?'左':'右'}眼瞳孔 ${Number.isFinite(eyes[side].pupilDiameter)?eyes[side].pupilDiameter.toFixed(2)+' mm':'未提供'}`).join(' · ');
 for(const side of available){const eye=eyes[side],len=Math.hypot(...eye.direction),n=eye.direction.map(v=>v/len),axis=[-n[1],n[0],0];p.push();p.translate(...eye.center.map((v,i)=>(v-origin[i])*1.6));const angle=Math.acos(clamp(n[2],-1,1));if(Math.hypot(...axis)>.0001)p.rotate(angle,axis);else if(n[2]<0)p.rotateY(Math.PI);p.noStroke();p.ambientMaterial(220,225,226);p.sphere(19.2,24,16);p.translate(0,0,19.25);p.fill('#6d9e9e');p.circle(0,0,17);if(Number.isFinite(eye.pupilDiameter)&&eye.pupilDiameter>0){p.translate(0,0,.15);p.fill('#101a21');p.circle(0,0,eye.pupilDiameter*1.6);}p.stroke('#ebbf7a');p.line(0,0,0,0,0,24);p.pop();}
 };});
if(new URLSearchParams(location.search).get('neon')==='1')connectRealEyes();
