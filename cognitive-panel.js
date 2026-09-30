'use strict';
const cognitiveEvidence=new CognitiveEvidence();
const cognitivePanel=document.createElement('section');cognitivePanel.className='panel';
cognitivePanel.innerHTML=`<h2>What do these lines mean?</h2><p>Horizontal axis: the last 30 seconds. Top: measured binocular pupil diameter (mm). Bottom: change from your personal reference (%). Zero means the reference diameter; below zero means smaller pupils, not relaxation. The strip below the axes marks notes / condition changes. Status text below the graph is not a plotted mental state.</p><p>Eye evidence does not select a soundscape. In Sound, select Birds, Rain, Wind or Water to play a self-reported state. Use the Self-report &amp; sound view to see sound regions; those regions are creative mappings, not psychological measurements.</p><h3>Personal reference</h3><p>Relative pupil change is effort-related evidence, not a diagnosis of effort, focus, stress or confusion. Playing effects are marked, not mathematically removed.</p><label><input type="checkbox" id="evidenceStable">Lighting, viewing distance and sound settings are stable</label><label><input type="checkbox" id="evidencePause">Pause interpretation: tasting, movement or changed conditions</label><button id="evidenceBaseline">Capture 30 s reference</button><p id="evidenceStatus">Live Neon required</p><p id="evidenceQuality"></p><p id="evidenceInterpretation"></p><h3>Inference models</h3><p>Attention: untrained<br>Confusion: untrained<br>Stuck: untrained; guided tasks only<br>Relaxation / stress: self-report only</p><p>No automatic sound is driven by this evidence view. Self-report and creative accompaniment remain separate controls.</p><details><summary>Method & limitations</summary><p>Binocular mean pupil diameter; 30 s personal reference (median, ≥80% valid coverage); change = 100 × (diameter / reference − 1). The summary is a rolling median over up to 30 s, available after 10 s of usable evidence and ≥80% coverage. These are engineering quality rules, not psychological thresholds.</p><p>Missing data leaves gaps. Mouse, replay and synthetic-eye modes cannot establish a live reference. Reconnection, changed conditions or a long data gap requires a new reference. AOI dwell is not an eye-movement fixation. Blinks and microsaccades are not inferred from missing samples.</p><p>Brightness, gaze angle, accommodation, sound responses and performance particle effects remain confounds. Particle effects pause during reference capture and guided research. A stable-conditions checkbox does not measure or remove them. No effort score or calibrated probability is produced.</p><p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6634360/" target="_blank" rel="noopener">Mathôt (2018): pupil responses</a> · <a href="https://doi.org/10.1145/3173574.3173856" target="_blank" rel="noopener">Duchowski et al. (2018): IPA</a> (not implemented) · <a href="https://doi.org/10.1145/3361570.3361577" target="_blank" rel="noopener">Salminen et al. (2019): confusion</a></p></details>`;
panels.signals.prepend(cognitivePanel);
const evidenceChart=document.createElement('canvas');evidenceChart.id='cognitiveChart';evidenceChart.setAttribute('aria-label','Last 30 seconds: pupil diameter in millimeters, relative pupil change in percent, and note events');
const evidenceSummary=document.createElement('div');evidenceSummary.id='evidenceSummary';evidenceSummary.innerHTML='<div class="evidence-reading"><strong id="evidenceMeaning">Waiting for live pupil data</strong><button id="evidenceSetup">Set up reference →</button></div><div id="evidenceReport">Cognitive state: not estimated</div>';
evidenceSummary.querySelector('#evidenceSetup').onclick=async()=>{if(document.body.classList.contains('controller-mode'))await toggleController(false);openDashboardPanel(source==='live'?'signals':'connect');if(source==='live')$('evidenceStable').focus();else $('pairCode').focus();};
const viewSelect=document.createElement('select');viewSelect.id='evidenceView';viewSelect.setAttribute('aria-label','Timeline view');viewSelect.innerHTML='<option value="evidence">Eye evidence</option><option value="sound">Self-report & sound</option>';
curveCard.querySelector('.card-heading h2').textContent='Eyes & state';curveCard.querySelector('.card-heading').append(viewSelect);
curveCard.insertBefore(evidenceChart,$('stateChart'));curveCard.append(evidenceSummary);
function selectEvidenceView(){const on=viewSelect.value==='evidence';curveCard.classList.toggle('evidence-view-active',on);evidenceChart.hidden=!on;evidenceSummary.hidden=!on;$('stateChart').hidden=on;feelingButtons.hidden=on;$('currentFeeling').hidden=on;}
viewSelect.onchange=selectEvidenceView;selectEvidenceView();
const cognitiveStyle=document.createElement('style');cognitiveStyle.textContent='#cognitiveChart{width:100%;height:100%;min-height:0}#evidenceSummary{font-size:10px;line-height:1.4;overflow:auto}.curve-card.evidence-view-active{grid-template-rows:24px minmax(0,1fr) 44px}.evidence-reading{display:flex;align-items:center;justify-content:space-between;gap:4px}#evidenceSetup{font-size:9px;padding:3px 5px;flex-shrink:0}#evidenceReport{color:#796b60;margin-top:3px}#evidenceMeaning{font-weight:550}#evidenceView{font-size:10px;max-width:155px;padding:3px}.curve-card [hidden]{display:none!important}#panel-signals #evidenceStable,#panel-signals #evidencePause{width:auto}#panel-signals label:has(#evidenceStable),#panel-signals label:has(#evidencePause){display:block;margin:10px 0}';document.head.append(cognitiveStyle);
function onCognitiveNote(){cognitiveEvidence.event(performance.now(),'note');}
let evidenceLastTick=null,evidenceLastFresh=null,evidenceDisconnected=false;
$('evidenceBaseline').onclick=()=>{
 if(typeof gameModeActive==='function'&&gameModeActive()){toast('Return to free play before starting a research session or reference capture.');return;}
 if(source!=='live'||studioDemo||!sample||!sample.worn||performance.now()-sampleReceived>=500){toast('Pair live Neon and wear the glasses first.');return;}
 if(!$('evidenceStable').checked||$('evidencePause').checked){toast('Confirm stable conditions and end the pause first.');return;}
 if(typeof researchRunning==='function'&&researchRunning()){toast('Finish the guided session before capturing this reference.');return;}
 // Pause sound feedback and note triggering during the reference; resume explicitly afterward.
 setPhase('prepare');stopBacking();stopStateSound();instrument.stop();$('curveSound').checked=false;
 cognitiveEvidence.start(performance.now());toast('Look naturally for 30 seconds. Sound paused; enable playing afterward.');
};
for(const id of ['evidenceStable','evidencePause'])$(id).onchange=()=>{cognitiveEvidence.invalidate('Conditions changed; capture a new reference');cognitiveEvidence.event(performance.now(),'conditions');};
function drawCognitiveEvidence(now){
 const canvas=evidenceChart,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const dpr=devicePixelRatio||1;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const left=42,right=w-8,top=18,bottom=h-22,half=(bottom-top)/2,x=t=>left+(t-now+30000)/30000*(right-left);
 const rows=cognitiveEvidence.rows;const raw=rows.map(r=>r.raw).filter(Number.isFinite);const delta=rows.map(r=>r.delta).filter(Number.isFinite);
 const rawMin=raw.length?Math.max(0,Math.min(...raw)-.3):2,rawMax=raw.length?Math.max(...raw)+.3:8,range=Math.max(5,...delta.map(Math.abs));
 [['raw','Pupil / mm',rawMin,rawMax,'#397b9d'],['delta','Δ from reference / %',-range,range,'#955e40']].forEach(([key,label,min,max,color],i)=>{
  const a=top+i*half,b=a+half-15,y=v=>b-(v-min)/(max-min)*(b-a);c.fillStyle=color;c.font='10px system-ui';c.fillText(label,left,a-5);if(i===1&&cognitiveEvidence.reference===null){c.fillStyle='#82776b';c.fillText(cognitiveEvidence.capture?'Building your personal reference…':'No personal reference yet',left,a+12,Math.max(10,right-left));return;}c.fillText(max.toFixed(1),1,a+7);c.fillText(min.toFixed(1),1,b);
  c.strokeStyle='#ded7cd';c.beginPath();c.moveTo(left,a);c.lineTo(left,b);c.lineTo(right,b);c.stroke();
  const ref=i===1?(cognitiveEvidence.reference===null?null:0):cognitiveEvidence.reference;if(ref!==null&&ref>=min&&ref<=max){c.setLineDash([3,3]);c.beginPath();c.moveTo(left,y(ref));c.lineTo(right,y(ref));c.stroke();c.setLineDash([]);if(i===1){c.fillStyle='#82776b';c.font='9px system-ui';c.fillText('0% = your reference',left+4,y(ref)-3);}}
  if(i===1&&!delta.length){c.fillStyle='#82776b';c.fillText('Waiting for comparable pupil data',left+5,a+12,Math.max(10,right-left-8));}
  c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();let pen=false,last=null;for(const r of rows){if(r[key]===null){pen=false;continue;}if(last!==null&&r.time-last>600)pen=false;const px=x(r.time),py=y(r[key]);if(pen)c.lineTo(px,py);else c.moveTo(px,py);pen=true;last=r.time;}c.stroke();
 });
 for(const e of cognitiveEvidence.events){c.fillStyle=e.kind==='note'?'#7f6a4d':'#ae4365';c.fillRect(x(e.time),h-18,2,5);}
 c.fillStyle='#71665a';c.font='9px system-ui';c.fillText('−30 s',left,h-2);c.fillText('Notes / condition marks',left+40,h-2);c.fillText('Now',right-21,h-2);
}
setInterval(()=>{
 const now=performance.now(),fresh=!!sample&&now-sampleReceived<500,context=studioDemo?'synthetic':source;
 if(evidenceLastTick!==null&&now-evidenceLastTick>1000){cognitiveEvidence.invalidate('Sampling interrupted; capture a new reference');cognitiveEvidence.rows=[];}
 evidenceLastTick=now;
 if(cognitiveEvidence.capture&&phase!=='prepare')cognitiveEvidence.invalidate('Playing resumed during reference capture; start again');
 if(fresh&&source==='live'){evidenceLastFresh=now;if(evidenceDisconnected){cognitiveEvidence.invalidate('Reconnected; capture a new reference');evidenceDisconnected=false;}}
 else if(evidenceLastFresh!==null&&now-evidenceLastFresh>3000){cognitiveEvidence.invalidate('Connection interrupted; capture a new reference');evidenceDisconnected=true;}
 const out=cognitiveEvidence.update(now,{context,stable:$('evidenceStable').checked,paused:$('evidencePause').checked||document.hidden,fresh,worn:sample?.worn,left:sample?.pupilLeft,right:sample?.pupilRight});
 $('evidenceStatus').textContent=out.status+(out.capturing?' · '+out.remaining+' s remaining':out.reference!==null&&phase==='prepare'?' · Reference ready. Use Play with accompaniment to resume.':'');
 $('evidenceQuality').textContent=`Binocular coverage: ${Math.round(out.quality*100)}% · Reference: ${out.reference===null?'not set':out.reference.toFixed(2)+' mm'} · Window: 30 s`;
 $('evidenceInterpretation').textContent=out.notes?`${out.notes} notes in this window. Intentional playing may influence pupil responses; its effects have not been removed.`:'No notes in this window. Absence of playing does not establish relaxation.';
 const amount=out.summary===null?null:Math.abs(out.summary).toFixed(1);
 $('evidenceMeaning').textContent=out.capturing?`Building reference · ${out.remaining}s left`:out.reference===null?'No personal reference yet':out.summary===null?out.status:Number(amount)===0?'Pupils at reference · rolling median':`Pupils ${amount}% ${out.summary>0?'larger':'smaller'} · rolling median`;
 $('evidenceMeaning').title=out.status+' · Pupil changes are measurements, not cognitive labels.';
 $('evidenceSetup').hidden=out.reference!==null||out.capturing;
 $('evidenceSetup').textContent=source==='live'?'Set up reference →':'Connect Neon →';
 $('evidenceReport').textContent=reportedState==='none'?'Cognitive state: not estimated · no self-report':`Self-report: ${stateDefs[reportedState][0]} · not inferred from this curve`;
 $('evidenceBaseline').disabled=out.capturing;drawCognitiveEvidence(now);
},250);
