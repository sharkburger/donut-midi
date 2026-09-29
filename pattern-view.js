'use strict';
const evidence=document.createElement('section');evidence.className='pattern-evidence';
evidence.innerHTML=`<h3>Why does this curve change?</h3><p>Continuous traces of the current input. Missing data leaves gaps. These are not mental-state probabilities.</p><canvas id="metricTraces" aria-label="Last 30 seconds: AOI dwell, transitions per five seconds, and pupil change"></canvas><p id="mappingEvidence"></p><div id="regionEvidence"></div><p>Dwell ≥ 2 s describes staying in one AOI. At least four direct transitions in 5 s describes scanning; exits between AOIs are excluded. Neither proves focus, confusion, relaxation or stress.</p>`;
const timelineSection=$('stateChart').parentElement;
const timelinePair=document.createElement('div');timelinePair.className='timeline-pair';timelineSection.replaceWith(timelinePair);timelinePair.append(timelineSection,evidence);
const evidenceStyle=document.createElement('style');evidenceStyle.textContent='.timeline-pair{display:grid;grid-template-columns:minmax(300px,1.2fr) minmax(240px,1fr);gap:18px;min-width:0}.studio-grid{grid-template-columns:minmax(200px,.6fr) minmax(0,2fr)}.pattern-evidence{min-width:0}.pattern-evidence p{font-size:12px;line-height:1.6}.pattern-evidence canvas{width:100%;height:180px}.region-evidence{padding:8px;border:1px solid #d8d0c2;border-radius:8px;margin:6px 0}.region-evidence.active{border:2px solid #722e77}.region-evidence canvas{height:42px;display:block}.region-evidence strong{font-size:12px}.region-evidence p{margin:3px 0}.studio-docked .timeline-pair{grid-template-columns:1fr}@media(max-width:1150px){.timeline-pair{grid-template-columns:1fr}}';document.head.append(evidenceStyle);
const evidenceCards=regionNames.map((name,i)=>{const card=document.createElement('div');card.className='region-evidence';const title=document.createElement('strong');title.textContent=name+' region · '+i+' ≤ score < '+(i+1);const detail=document.createElement('p');const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',name+' region and actual mapped curve');card.append(title,detail,canvas);$('regionEvidence').append(card);return {card,detail,canvas};});
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
 [['seconds','AOI dwell / s',0,5],['switches','Direct transitions / 5 s',0,8],['pupil','Pupil Δ / mm',-1.5,1.5]].forEach(([key,label,min,max],i)=>{
   const top=i*60;const last=evidenceHistory.at(-1)[key];c.fillStyle='#51483e';c.font='11px system-ui';c.fillText(label+': '+(last===null?'No valid input':last.toFixed(key==='switches'?0:2)),2,top+12);
   c.strokeStyle='#ddd5c9';c.beginPath();c.moveTo(0,top+55);c.lineTo(w,top+55);c.stroke();c.strokeStyle=['#617849','#397b9d','#a56633'][i];c.beginPath();let pen=false;
   for(const row of evidenceHistory){if(row[key]===null){pen=false;continue;}const x=(row.time-(now-30000))/30000*w,y=top+54-(clamp(row[key],min,max)-min)/(max-min)*34;if(pen)c.lineTo(x,y);else c.moveTo(x,y);pen=true;}c.stroke();
 });
 const explanation=studioDemo?'Synthetic sine-wave demo; no human cognitive evidence.':mode==='report'?'Self-report: keys 1–4 select a feeling; not inferred from gaze.':mode==='pupil'?'Target = clamp(1.5 + 2 × pupil change/mm). Requires a personal baseline; lighting also affects pupil size.':'Target = clamp(0.5 + 0.65 × direct transitions/5 s − 0.1 × dwell seconds [capped at 3 s]).';
 $('mappingEvidence').textContent=explanation+' Score range: 0–3.99. Single tones require 0.6 s in a new region; automatic accompaniment changes require 8 s. Current target: '+(target===null?'—':target.toFixed(2))+'; curve: '+(value===null?'—':value.toFixed(2))+'.';
 evidenceCards.forEach(({card,detail,canvas},i)=>{card.classList.toggle('active',value!==null&&Math.floor(value)===i);detail.textContent=mode==='pupil'?['Δ < −0.25 mm','−0.25 ≤ Δ < 0.25 mm','0.25 ≤ Δ < 0.75 mm','Δ ≥ 0.75 mm'][i]+' → target region (creative threshold)':mode==='report'?'Participant-selected feeling; no automatic gaze criterion':['Example: 0 transitions/5 s → score 0.2–0.5; not evidence of relaxation','Example: 2 transitions/5 s → score 1.5–1.8; not evidence of focus','Example: 3 transitions/5 s → score 2.15–2.45; not evidence of stress','Example: ≥ 5 transitions/5 s → score ≥ 3.45; not evidence of confusion'][i];drawEvidenceLine(canvas,now,evidenceHistory,'score',0,4,i);});
}
