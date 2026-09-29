'use strict';
const evidence=document.createElement('section');evidence.className='pattern-evidence';
evidence.innerHTML=`<h3>这条曲线为什么变化？</h3><p>下面是当前输入的连续走势。缺失时留空；不是四种心理状态的概率。</p><canvas id="metricTraces" aria-label="最近30秒 AOI 停留时间、五秒切换次数及相对瞳孔变化"></canvas><p id="mappingEvidence"></p><div id="regionEvidence"></div><p>“持续停留 ≥ 2 秒”只描述同一区域的注视；“5 秒内直接切换 ≥ 4 次”只描述扫描活动。中间离开 AOI 的切换不计入。它们并不能单独证明专注、困惑、放松或压力。</p>`;
const timelineSection=$('stateChart').parentElement;
const timelinePair=document.createElement('div');timelinePair.className='timeline-pair';timelineSection.replaceWith(timelinePair);timelinePair.append(timelineSection,evidence);
const evidenceStyle=document.createElement('style');evidenceStyle.textContent='.timeline-pair{display:grid;grid-template-columns:minmax(300px,1.2fr) minmax(240px,1fr);gap:18px;min-width:0}.studio-grid{grid-template-columns:minmax(200px,.6fr) minmax(0,2fr)}.pattern-evidence{min-width:0}.pattern-evidence p{font-size:12px;line-height:1.6}.pattern-evidence canvas{width:100%;height:180px}.region-evidence{padding:8px;border:1px solid #d8d0c2;border-radius:8px;margin:6px 0}.region-evidence.active{border:2px solid #722e77}.region-evidence canvas{height:42px;display:block}.region-evidence strong{font-size:12px}.region-evidence p{margin:3px 0}.studio-docked .timeline-pair{grid-template-columns:1fr}@media(max-width:1150px){.timeline-pair{grid-template-columns:1fr}}';document.head.append(evidenceStyle);
const evidenceCards=regionNames.map((name,i)=>{const card=document.createElement('div');card.className='region-evidence';const title=document.createElement('strong');title.textContent=name+'声区 · '+i+' ≤ 分值 < '+(i+1);const detail=document.createElement('p');const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',name+'声区与实际映射曲线');card.append(title,detail,canvas);$('regionEvidence').append(card);return {card,detail,canvas};});
const evidenceHistory=[];let evidenceTick=0,evidenceSource=null;
function resetEvidence(){evidenceHistory.length=0;evidenceTick=0;}
function drawEvidenceLine(canvas,now,history,key,min,max,band=null){
 const w=Math.max(180,canvas.clientWidth),h=band===null?180:42,dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const y=v=>h-5-(v-min)/(max-min)*(h-10),x=t=>(t-(now-30000))/30000*w;
 if(band!==null){c.fillStyle=regionColors[band];c.globalAlpha=.5;c.fillRect(0,y(band+1),w,y(band)-y(band+1));c.globalAlpha=1;}
 c.strokeStyle='#513e59';c.lineWidth=1.6;c.beginPath();let pen=false;
 for(const row of history){const v=row[key];if(!Number.isFinite(v)){pen=false;continue;}const px=x(row.time),py=y(clamp(v,min,max));if(pen)c.lineTo(px,py);else c.moveTo(px,py);pen=true;}c.stroke();return {c,w,h};
}
function updateEvidence(now,observation,valid,mode,value,target){
 const inputKey=source+':'+mode+':'+studioDemo;if(evidenceSource!==inputKey){resetEvidence();evidenceSource=inputKey;}
 if(now-evidenceTick<150)return;evidenceTick=now;
 const fresh=sample&&now-sampleReceived<500&&sample.worn,pv=fresh?pupil(sample):null;
 evidenceHistory.push({time:now,seconds:valid&&!studioDemo?observation.seconds:null,switches:valid&&!studioDemo?observation.switches:null,pupil:!studioDemo&&pv!==null&&baselineReady?delta:null,score:value});
 while(evidenceHistory.length&&now-evidenceHistory[0].time>30000)evidenceHistory.shift();
 const canvas=$('metricTraces'),w=Math.max(180,canvas.clientWidth),h=180,dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 [['seconds','AOI 停留 / 秒',0,5],['switches','直接切换 / 次（5 秒）',0,8],['pupil','瞳孔 Δ / mm',-1.5,1.5]].forEach(([key,label,min,max],i)=>{
   const top=i*60;const last=evidenceHistory.at(-1)[key];c.fillStyle='#51483e';c.font='11px system-ui';c.fillText(label+'：'+(last===null?'缺少有效输入':last.toFixed(key==='switches'?0:2)),2,top+12);
   c.strokeStyle='#ddd5c9';c.beginPath();c.moveTo(0,top+55);c.lineTo(w,top+55);c.stroke();c.strokeStyle=['#617849','#397b9d','#a56633'][i];c.beginPath();let pen=false;
   for(const row of evidenceHistory){if(row[key]===null){pen=false;continue;}const x=(row.time-(now-30000))/30000*w,y=top+54-(clamp(row[key],min,max)-min)/(max-min)*34;if(pen)c.lineTo(x,y);else c.moveTo(x,y);pen=true;}c.stroke();
 });
 const explanation=studioDemo?'合成演示：正弦曲线，无真人认知依据。':mode==='report'?'自述：按 1–4 选择感受；不由眼动推断。':mode==='pupil'?'目标分值 = 限幅(1.5 + 2 × 相对瞳孔变化/mm)。需要个人参考值；光线等也会改变瞳孔。':'目标分值 = 限幅(0.5 + 0.65 × 5秒直接切换次数 − 0.1 × 停留秒数[最多3秒])。';
 $('mappingEvidence').textContent=explanation+' 分值限制在 0–3.99；平滑后的曲线进入新声区并单次声区音稳定 0.6 秒触发；持续伴奏的自动切换另需稳定 8 秒。当前目标：'+(target===null?'—':target.toFixed(2))+'；曲线：'+(value===null?'—':value.toFixed(2))+'。';
 evidenceCards.forEach(({card,detail,canvas},i)=>{card.classList.toggle('active',value!==null&&Math.floor(value)===i);detail.textContent=mode==='pupil'?['Δ < −0.25 mm','−0.25 ≤ Δ < 0.25 mm','0.25 ≤ Δ < 0.75 mm','Δ ≥ 0.75 mm'][i]+' → 目标声区（创作阈值）':mode==='report'?'由参与者选择此感受；没有自动眼动判据':['例如：5 秒无直接切换，分值 0.2–0.5；不是放松判据','例如：5 秒直接切换 2 次，分值 1.5–1.8；不是专注判据','例如：5 秒直接切换 3 次，分值 2.15–2.45；不是压力判据','例如：5 秒直接切换 ≥ 5 次，分值 ≥ 3.45；不是困惑判据'][i];drawEvidenceLine(canvas,now,evidenceHistory,'score',0,4,i);});
}
