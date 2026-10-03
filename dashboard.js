'use strict';
// Move the existing controls, rather than recreate them: audio and live-stream state stay intact.
const originalMain=document.querySelector('main'),oldAside=document.querySelector('.workspace>aside');
const soundSettings=$('source').closest('.panel'),recordSettings=$('record').closest('.panel');
const phaseBar=document.querySelector('.phase-bar'),bodySignal=document.querySelector('.signal-card');
const introAudio=document.querySelector('.intro-action'),publicNotice=document.querySelector('[aria-label="Public edition"]');
const eyes=$('eyeScene').parentElement,curve=$('stateChart').parentElement;
const dash=document.createElement('main');dash.className='dashboard';
dash.innerHTML=`<div class="visuals"><div class="overview"><section class="eye-card dash-card"></section><section class="curve-card dash-card"></section></div><section class="score-card dash-card"><div class="score-heading"><div><span class="eyebrow">THE INSTRUMENT</span><h2>Eight donuts. Your melody.</h2></div><span id="scoreMode">Mouse · dwell to play</span></div><div id="scoreViewport"><div id="scoreFit"></div></div><div class="score-bottom"></div></section></div><aside class="control-rail"><div class="rail-top"><span class="eyebrow">CONTROL ROOM</span><div id="quickAudio"></div><button id="showMarkerMat" aria-pressed="false">Show marker mat</button><button id="fullController">⛶ Open performance console</button></div><nav class="rail-tabs" aria-label="Control panels"></nav><div class="rail-scroll"></div></aside><div class="dashboard-caption">Gaze chooses notes · state voices use self-report or creative mappings, not cognitive diagnosis.</div>`;
originalMain.after(dash);
const eyeCard=dash.querySelector('.eye-card'),curveCard=dash.querySelector('.curve-card');
eyeCard.innerHTML='<div class="card-heading"><h2>Eyes</h2><span>NEON LIVE</span></div>';
eyeCard.append($('eyeScene'),$('eyeStatus'),$('eyeNumbers'));
curveCard.innerHTML='<div class="card-heading"><h2>State & sound</h2><span id="currentFeeling">Not reported</span></div>';
curveCard.append($('stateChart'));
const feelingButtons=document.createElement('div');feelingButtons.className='feeling-buttons';
for(const id of ['relax','focus','stress','confusion']){const button=document.createElement('button');button.textContent=stateDefs[id][0];button.dataset.feeling=id;button.onclick=()=>setReportedState(reportedState===id?'none':id);feelingButtons.append(button);}
curveCard.append(feelingButtons);
const fit=$('scoreFit'),canvasHost=$('canvasHost');fit.append(canvasHost);
const mat=document.createElement('img');mat.src='monitor-mat.svg?v=dashboard-1';mat.alt='Eight-donut score with four AprilTag corners';mat.className='live-mat';mat.hidden=true;
const dot=document.createElement('span');dot.className='live-gaze';dot.hidden=true;fit.append(mat,dot);
dash.querySelector('.score-bottom').append($('lastNote'),$('dwellStatus'));
$('quickAudio').append(introAudio,$('startDuet'));
$('startDuet').textContent='▶ Play with accompaniment';
const panels={};
for(const [key,label] of [['connect','Connect'],['sound','Sound'],['clips','Clips'],['signals','Signals'],['research','Research'],['help','Help']]){
 const b=document.createElement('button');b.textContent=label;b.dataset.panel=key;b.setAttribute('aria-controls','panel-'+key);dash.querySelector('.rail-tabs').append(b);
 const pane=document.createElement('section');pane.id='panel-'+key;pane.className='rail-pane';pane.hidden=true;panels[key]=pane;dash.querySelector('.rail-scroll').append(pane);b.onclick=()=>openDashboardPanel(key);
}
function openDashboardPanel(key){for(const [id,pane] of Object.entries(panels)){pane.hidden=id!==key;const b=dash.querySelector(`[data-panel="${id}"]`);b.classList.toggle('selected',id===key);b.setAttribute('aria-pressed',String(id===key));}dash.querySelector('.rail-scroll').scrollTop=0;}
// Pairing stays at the top, while installation instructions are a secondary disclosure.
const connectHelp=document.createElement('details');connectHelp.innerHTML='<summary>Setup & troubleshooting</summary>';
for(const p of [...connectorPanel.querySelectorAll(':scope > p')])if(p.id!=='pairStatus')connectHelp.append(p);
connectorPanel.querySelector('h2').textContent='Pair your Neon';connectorPanel.append(connectHelp);
$('pairConnect').textContent='Connect';$('pairDisconnect').textContent='Disconnect';
$('pairCode').placeholder='Paste your pairing code here';
const portDetails=document.createElement('details');portDetails.innerHTML='<summary>Port settings</summary>';portDetails.append($('pairPort').closest('label'));connectorPanel.insertBefore(portDetails,connectorPanel.querySelector('.button-row'));
const modeSettings=document.createElement('div');modeSettings.className='panel';modeSettings.append($('source').closest('label'),$('simControls'),$('replayControls'),$('liveControls'));
panels.connect.append(connectorPanel,modeSettings);
panels.sound.append(musicPanel,soundSettings,statePanel,phaseBar,$('resetFood'));
const foodControls=document.createElement('details');foodControls.innerHTML='<summary>Consumed donuts · remove a voice</summary>';
for(const z of ZONES){const b=document.createElement('button');b.textContent=z.name;b.dataset.consumed=z.id;b.onclick=()=>setConsumed(z.id,!consumed[z.id]);foodControls.append(b);}
panels.sound.append(foodControls);
panels.clips.append(samplePanel);
const curveSettings=document.createElement('section');curveSettings.className='panel';curveSettings.innerHTML='<h2>Curve mapping</h2>';
curveSettings.append(...[...curve.children].filter(e=>e.tagName!=='H3'));
panels.signals.append(curveSettings,bodySignal,evidence);
panels.research.append(researchPanel,recordSettings);
if(publicNotice)panels.help.append(publicNotice);
const eyeHelp=document.createElement('section');eyeHelp.className='panel';eyeHelp.innerHTML='<h2>Eye visualization</h2>';eyeHelp.append(...eyes.querySelectorAll('small'));panels.help.append(eyeHelp,$('studioDemo'));
const usage=document.createElement('section');usage.className='panel';usage.innerHTML='<h2>Quick start</h2><p>Pair Neon, enable sound, then look at a donut. All four markers must be visible. Without glasses, select Mouse simulation under Connect.</p><p>Use Open performance console for the marker mat, eyes and state curve together. Press Escape to return. Detailed controls scroll inside this panel; the main instrument stays in place.</p><a href="connector-guide.html" target="_blank" rel="noopener">Connection guide ↗</a>';panels.help.prepend(usage);
// Retain obsolete containers (and their script references) out of view.
originalMain.hidden=true;document.querySelector('header').classList.add('dashboard-header');
const headerActions=document.querySelector('.header-right');$('projector').hidden=true;headerActions.append($('connectEyes'));$('connectEyes').textContent='Pair Neon';$('connectEyes').onclick=()=>{if(document.body.classList.contains('controller-mode'))toggleController(false);openDashboardPanel('connect');$('pairCode').focus();};
screenScoreButton.hidden=true;
let controllerFullscreenRequested=false,showMarkerMat=false;
$('showMarkerMat').onclick=()=>{showMarkerMat=!showMarkerMat;dashboardUpdate();};
async function toggleController(force){
 const enable=force??!document.body.classList.contains('controller-mode');document.body.classList.toggle('controller-mode',enable);$('fullController').textContent=enable?'↙ Return to dashboard':'⛶ Open performance console';
 if(enable){controllerFullscreenRequested=true;try{await document.documentElement.requestFullscreen();}catch{controllerFullscreenRequested=false;}}
 else if(document.fullscreenElement){controllerFullscreenRequested=false;await document.exitFullscreen();}
 dashboardUpdate();requestAnimationFrame(fitScore);
}
$('fullController').onclick=()=>toggleController();
screenScoreButton.onclick=()=>toggleController(true);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&controllerFullscreenRequested){controllerFullscreenRequested=false;document.body.classList.remove('controller-mode');$('fullController').textContent='⛶ Open performance console';}dashboardUpdate();fitScore();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('controller-mode'))toggleController(false);});
function fitScore(){const r=$('scoreViewport').getBoundingClientRect();const w=Math.max(1,Math.min(r.width,r.height*1.5));fit.style.width=w+'px';fit.style.height=w/1.5+'px';}
new ResizeObserver(fitScore).observe($('scoreViewport'));
function dashboardUpdate(){
 const live=source==='live',fresh=sample&&performance.now()-sampleReceived<500;
 const showMat=live||showMarkerMat||document.body.classList.contains('controller-mode');
 mat.hidden=!showMat;canvasHost.style.opacity=showMat?'0':'1';
 $('showMarkerMat').textContent=showMat?'Marker mat visible':'Show marker mat';
 $('showMarkerMat').setAttribute('aria-pressed',String(showMat));
 $('showMarkerMat').disabled=live;
 const valid=live&&fresh&&sample.worn&&sample.surfaceValid&&Number.isFinite(sample.x)&&Number.isFinite(sample.y);
 dot.hidden=!valid||sample.x<0||sample.x>1||sample.y<0||sample.y>1;
 if(!dot.hidden){dot.style.left=sample.x*100+'%';dot.style.top=sample.y*100+'%';}
 $('scoreMode').textContent=live?(!fresh?'Waiting for Neon':!sample.worn?'Glasses not worn':`${sample.markerCount??0}/4 markers · ${sample.surfaceValid?'Mat located':'Show all corners'}`):source==='replay'?'Replay':'Mouse · dwell to play';
 $('currentFeeling').textContent=reportedState==='none'?'Not reported':stateDefs[reportedState][0]+' · self-report';
 for(const b of foodControls.querySelectorAll('button'))b.setAttribute('aria-pressed',String(!!consumed[b.dataset.consumed]));
 for(const b of feelingButtons.children)b.setAttribute('aria-pressed',String(b.dataset.feeling===reportedState));
}
setInterval(dashboardUpdate,150);openDashboardPanel('connect');fitScore();dashboardUpdate();
const dashboardStyle=document.createElement('link');dashboardStyle.rel='stylesheet';dashboardStyle.href='dashboard.css?v=eye-status-1';document.head.append(dashboardStyle);

// Keep the instrument and its authenticated connection alive while editing.
const workshopButton=document.createElement('button');workshopButton.id='openWorkshop';workshopButton.textContent='Workshop Editor';
const performanceButton=document.createElement('button');performanceButton.textContent='Performance Console';performanceButton.onclick=()=>toggleController(true);
headerActions.prepend(performanceButton,workshopButton);
const workshopShell=document.createElement('section');workshopShell.id='workshopShell';workshopShell.hidden=true;
workshopShell.innerHTML='<nav aria-label="Workspace"><b>Donut MIDI · Workshop Editor</b><button id="closeWorkshop">← Return to performance</button></nav><div id="workshopFrame"></div>';
document.body.append(workshopShell);
const workshopStyle=document.createElement('style');workshopStyle.textContent='#workshopShell:not([hidden]){position:fixed;inset:0;z-index:1000;display:grid;grid-template-rows:56px minmax(0,1fr);background:#f4eee5}#workshopShell nav{display:flex;align-items:center;justify-content:space-between;padding:8px 20px;border-bottom:1px solid #ddd}#workshopFrame,#workshopFrame iframe{width:100%;height:100%;border:0;min-height:0}#openWorkshop{background:#007d83;color:white}.dashboard-header .header-right{gap:6px}';document.head.append(workshopStyle);
let workshopFrame=null;
workshopButton.onclick=()=>{
 if(recording||researchRunning()||calibrating||cognitiveEvidence.capture||(typeof studyRecorder!=='undefined'&&studyRecorder)){toast('Finish the current test, recording or reference capture before opening the editor.');return;}
 if(typeof pauseGame==='function')pauseGame('workshop editor');
 if(audioEnabled)toggleAudio();
 instrument.stop();stopBacking();stopStateSound();stateSoundscapes.stop(true);
 workshopShell.hidden=false;dash.inert=true;document.querySelector('header').inert=true;$('closeWorkshop').focus();
 workshopFrame=document.createElement('iframe');workshopFrame.title='Workshop p5 editor';workshopFrame.src='library/editor.html?embedded=1&v=split-1';$('workshopFrame').replaceChildren(workshopFrame);
};
$('closeWorkshop').onclick=()=>{workshopFrame?.remove();workshopFrame=null;workshopShell.hidden=true;dash.inert=false;document.querySelector('header').inert=false;workshopButton.focus();toast('Returned to performance. Resume sound or the game when ready.');};
setInterval(()=>{
 if(!workshopFrame)return;
 workshopFrame.contentWindow?.postMessage({type:'donut-workshop-input',live:source==='live',sample:source==='live'?sample:null,age:Math.max(0,performance.now()-sampleReceived),status:connectionState},location.origin);
},50);
