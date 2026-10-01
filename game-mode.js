'use strict';
// This module owns only opt-in phrase play; the existing free instrument is kept.
const gameToggle=document.createElement('button');gameToggle.id='gameToggle';gameToggle.textContent='Game Mode';gameToggle.setAttribute('aria-pressed','false');$('gazeArtToggle').after(gameToggle);
const gamePanel=document.createElement('section');gamePanel.id='gamePanel';gamePanel.hidden=true;
gamePanel.innerHTML=`<div class="game-controls"><select id="gameSong" aria-label="Game melody"></select><label>Music BPM <input id="gameBpm" type="number" min="40" max="140" value="96"></label><button id="gameStart">Start gaze play</button><button id="gameListen">Listen to full song</button><button id="gamePause" disabled>Pause</button><button id="gameExit">Return to free play</button></div><div class="game-controls"><label>Start lead-in <select id="gamePrep"><option value="350">0.35 seconds</option><option value="1000">1 second</option><option value="2000">2 seconds</option></select></label><label>Hold gaze <select id="gameDwell"><option value="400">0.4 seconds</option><option value="600">0.6 seconds</option><option value="900">0.9 seconds</option><option value="1200">1.2 seconds</option></select></label><label><input id="gameBacking" type="checkbox" checked> Full arrangement</label><label class="game-upload">Upload MIDI / score <input id="gameUpload" type="file" accept=".mid,.midi,.txt,.json"></label><select id="gameTrack" aria-label="MIDI melody track" hidden></select><button id="gameTemplate">Score template</button></div><p id="gameStatus" role="status">One donut plays a whole phrase. The music waits for you.</p><div id="gamePhrase"></div><small id="gameImportInfo">Gold: hold to start · Yellow glow: playing · NEXT: hold early → READY: joins at the boundary. Stay on the next donut; no need to leave and re-enter. Built-ins are original synthesized arrangements. Uploads remain melody-only and local.</small>`;
dash.querySelector('.score-heading').after(gamePanel);
const gameCanvas=document.createElement('canvas');gameCanvas.id='gameCanvas';gameCanvas.setAttribute('aria-label','Phrase targets: dwell to launch, then listen to a complete musical phrase');gameCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';gameCanvas.hidden=true;fit.append(gameCanvas);
const gameStyle=document.createElement('style');gameStyle.textContent='#gameToggle{display:none;width:100%;font-size:11px;margin-top:5px;padding:6px}.controller-mode #gameToggle{display:block}.game-mode .score-card{grid-template-rows:auto auto minmax(0,1fr) 24px}.game-mode #gamePanel{display:block}#gamePanel{padding:8px 10px;background:#f1f6f1;border:1px solid #c5d9cc;border-radius:10px}#gamePanel[hidden]{display:none!important}.game-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px}.game-controls button,.game-controls select,.game-controls label{font-size:11px;padding:4px}.game-controls select{width:auto;max-width:260px}.game-controls label{margin:0}.game-controls input[type=number]{width:58px;padding:3px}.game-upload input{max-width:180px;font-size:10px}#gameStatus{font-size:12px;margin:5px 0}#gamePhrase{display:flex;gap:5px;overflow:hidden;height:24px;align-items:center}#gamePhrase span{padding:2px 6px;border-radius:5px;background:#fff;font-size:11px;white-space:nowrap}#gamePhrase span.current{background:#397f6c;color:#fff}#gameImportInfo{font-size:10px;display:block;line-height:1.3}.game-mode #startDuet{display:none}@media(max-height:700px){#gameImportInfo{display:none}#gamePanel{padding:5px}.game-controls{margin-bottom:2px}}';document.head.append(gameStyle);

const gameSongs=DonutGame.builtinScores();
let gameEnabled=false,gameSession=null,gameSaved=null,gameImported=[],gamePlayer=null,gameNextJob=null,gameOutcome=null,gameScheduler=null,gameLastPaint=0,gameAudioCount=0,gameAudioSeen=new Set(),gameRun=0;
function gameModeActive(){return gameEnabled;}
for(const s of gameSongs)$('gameSong').add(new Option(s.title,String($('gameSong').options.length)));
function gameSelected(){return gameSongs[Number($('gameSong').value)];}
function gameNow(){return instrument.ctx?instrument.ctx.currentTime*1000:0;}
function gameSilence(){gamePlayer?.stop();gameNextJob=null;midiOut.panic();}
// Keep viewport coordinates: a layout resize must not strand a stationary mouse.
let gamePointer=null;
window.addEventListener('pointermove',e=>{gamePointer={x:e.clientX,y:e.clientY};},{capture:true});
document.addEventListener('pointerleave',()=>{gamePointer=null;});
function gameMousePoint(){const r=fit.getBoundingClientRect(),p=gamePointer;if(!p||p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom)return {x:null,y:null};return {x:(p.x-r.left)/r.width,y:(p.y-r.top)/r.height};}
function gameJob(block,startAt,offset=0){return {block,startAt,scheduler:new DonutGame.PhraseScheduler({events:DonutMix.events(gameSession.score,block)},gameSession.bpm,offset)};}
$('gameBacking').onchange=()=>gamePlayer?.setBacking($('gameBacking').checked);
function gameStatus(text){if($('gameStatus').textContent!==text)$('gameStatus').textContent=text;}
function stopGameForEdit(){gameRun++;gameSilence();gameSession=null;gameScheduler=null;gameOutcome=null;$('gamePause').disabled=true;$('lastNote').textContent='Phrase play ready';gameStatus(`${DonutGame.phrases(gameSelected()).length} phrases · one gaze launches a whole phrase. Press Start gaze play.`);}
function gameExit(){stopGameForEdit();gameEnabled=false;gameGlowLevels.fill(0);gameCanvas.hidden=true;gamePanel.hidden=true;document.body.classList.remove('game-mode');gameToggle.setAttribute('aria-pressed','false');gameToggle.textContent='Game Mode';dwell.reset();if(gameSaved){$('lastNote').textContent=gameSaved.lastNote;audioEnabled=gameSaved.audio;setPhase(gameSaved.phase);$('audioButton').textContent=audioEnabled?'Ⅱ Pause sound':'▶ Resume playing';$('audioState').textContent=audioEnabled?'Sound on · Space to pause':'Sound paused';gameSaved=null;}}
function enterGame(){if(researchRunning()||calibrating||cognitiveEvidence.capture||recording){toast('Finish recording, research or reference capture before entering Game Mode.');return;}gameSaved={audio:audioEnabled,phase,lastNote:$('lastNote').textContent};gameEnabled=true;stopBacking();stateSoundscapes.stop(true);stopStateSound();instrument.stop();dwell.reset();gamePanel.hidden=false;document.body.classList.add('game-mode');gameToggle.setAttribute('aria-pressed','true');gameToggle.textContent='Game Mode · phrase play';cognitiveEvidence.invalidate('Game visuals and task changed; capture a new reference after free play resumes');stopGameForEdit();}
gameToggle.onclick=()=>gameEnabled?gameExit():enterGame();$('gameExit').onclick=gameExit;
$('gameSong').onchange=()=>{stopGameForEdit();$('gameBpm').value=Math.max(40,Math.min(140,gameSelected().bpm));};
for(const id of ['gameBpm','gamePrep','gameDwell'])$(id).onchange=stopGameForEdit;
async function startPhraseGame(automatic){
 if(!gameEnabled)return;if(source==='replay'&&!automatic){gameStatus('Use live Neon or Mouse simulation for gaze play.');return;}
 const s=gameSelected(),bpm=Number($('gameBpm').value);if(!Number.isFinite(bpm)||bpm<40||bpm>140){gameStatus('Choose 40–140 BPM. Gaze speed is independent of music speed.');return;}
 const run=++gameRun;gameSilence();gameSession=null;gameScheduler=null;
 if(!document.body.classList.contains('controller-mode'))await toggleController(true);
 try{await instrument.start();}catch(e){gameStatus('Audio could not start: '+e.message);return;}if(!gameEnabled||run!==gameRun)return;
 if(!gamePlayer)gamePlayer=new DonutMix.Player(instrument.ctx,instrument.master);gamePlayer.setBacking($('gameBacking').checked);
 audioEnabled=true;audioStarted=true;$('audioButton').textContent='Ⅱ Pause sound';$('audioState').textContent=automatic?'Sound on · automatic preview, not gaze play':'Sound on · phrase play';setPhase('look');
 gameSession=new DonutGame.PhraseGame();gameSession.start(s,bpm,gameNow(),{prepMs:Number($('gamePrep').value),dwellMs:Number($('gameDwell').value),automatic});gameSession.source=source;gameOutcome=gameSession.view(gameNow());gameAudioCount=0;gameAudioSeen.clear();$('gamePause').disabled=false;$('gamePause').textContent='Pause';$('lastNote').textContent='Ready · 0/'+gameSession.blocks.length+' phrases completed';
}
$('gameStart').onclick=()=>startPhraseGame(false);$('gameListen').onclick=()=>startPhraseGame(true);
function pauseGame(reason){if(!gameSession||gameSession.done||gameSession.pausedAt!==null)return;gameSession.pause(gameNow());gameSilence();gameScheduler=null;$('gamePause').textContent='Resume';gameStatus('Paused · '+reason);}
$('gamePause').onclick=async()=>{
 if(!gameSession)return;if(gameSession.pausedAt===null){pauseGame('press Resume when ready');return;}
 const resumed=gameSession;if(source!==resumed.source&&!resumed.automatic){gameStatus('Input source changed. Press Start gaze play to restart.');return;}
 if(!document.body.classList.contains('controller-mode'))await toggleController(true);
 try{await instrument.start();}catch(e){gameStatus(e.message);return;}if(!gameEnabled||gameSession!==resumed||resumed.pausedAt===null)return;
 audioEnabled=true;resumed.resume(gameNow());if(resumed.phase==='playing'){gameScheduler=gameJob(resumed.blocks[resumed.index],resumed.playStart,(gameNow()-resumed.playStart)/1000);if(resumed.queued&&resumed.blocks[resumed.index+1])gameNextJob=gameJob(resumed.blocks[resumed.index+1],resumed.playStart+resumed.blocks[resumed.index].beats*60000/resumed.bpm);}
 $('gamePause').textContent='Pause';$('audioButton').textContent='Ⅱ Pause sound';$('audioState').textContent=resumed.automatic?'Sound on · automatic preview, not gaze play':'Sound on · phrase play';
};
function schedulePhraseAudio(){
 if(!gameEnabled||!gameSession||gameSession.done||gameSession.pausedAt!==null||!gameScheduler||document.hidden||!audioEnabled||instrument.ctx?.state!=='running')return;
 for(const job of [gameScheduler,gameNextJob]){if(!job)continue;const elapsed=(gameNow()-job.startAt)/1000;
  for(const e of job.scheduler.take(elapsed)){const at=Math.max(instrument.ctx.currentTime+.005,job.startAt/1000+e.start),end=job.startAt/1000+e.end,duration=end-at;if(duration<=0)continue;
   if(localSoundEnabled())gamePlayer.play(e,at,duration);
   if(e.kind==='lead'){midiOut.note(e.midi,0,duration*920,(at-instrument.ctx.currentTime)*1000);gameAudioSeen.add(job.block.index+':'+e.id);gameAudioCount=gameAudioSeen.size;}
  }
 }
}
setInterval(schedulePhraseAudio,25);
function addGameScore(s){stopGameForEdit();if(gameSongs.length>12){gameSongs.pop();$('gameSong').remove($('gameSong').options.length-1);}gameSongs.push(s);$('gameSong').add(new Option(s.title,String(gameSongs.length-1)));$('gameSong').value=String(gameSongs.length-1);$('gameBpm').value=Math.max(40,Math.min(140,gameSelected().bpm));gameStatus(`Loaded ${s.events.length} notes in ${DonutGame.phrases(s).length} phrases. One donut launches a whole phrase, not a single pitch.`);}
$('gameUpload').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>2*1024*1024){gameStatus('Maximum upload size: 2 MB.');return;}try{if(/\.midi?$/i.test(f.name)){gameImported=DonutGame.midiScores(await f.arrayBuffer());$('gameTrack').replaceChildren(new Option('Choose a MIDI melody track',''));gameImported.forEach((t,i)=>$('gameTrack').add(new Option(t.title+(t.error?' · unavailable':` · ${DonutGame.phrases(t.score).length} phrases`),String(i))));$('gameTrack').hidden=false;gameStatus('Select a monophonic melody track. Notes are grouped into roughly eight-beat phrases; more than eight pitches are now supported.');}else if(/\.(txt|json)$/i.test(f.name)){addGameScore(DonutGame.textScore(await f.text(),f.name));$('gameTrack').hidden=true;}else throw Error('Upload .mid, .midi, .txt or .json.');}catch(error){gameStatus('Upload not loaded: '+error.message);}};
$('gameTrack').onchange=()=>{if($('gameTrack').value==='')return;const t=gameImported[Number($('gameTrack').value)];if(t.error){gameStatus(t.error);return;}addGameScore(t.score);};
$('gameTemplate').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['1 1 5 5 6 6 5:2 | 4 4 3 3 2 2 1:2'],{type:'text/plain'}));a.download='donut-phrases.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
const gameGlowLevels=Array(8).fill(0);
const gameReducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let gameGlowTime=0;
function paintGame(out){
 const w=fit.clientWidth,h=fit.clientHeight,dpr=Math.min(devicePixelRatio||1,2);gameCanvas.hidden=!gameEnabled;if(!gameEnabled||!w||!h)return;
 if(gameCanvas.width!==Math.round(w*dpr)||gameCanvas.height!==Math.round(h*dpr)){gameCanvas.width=Math.round(w*dpr);gameCanvas.height=Math.round(h*dpr);}const c=gameCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const glowNow=performance.now(),glowStep=1-Math.exp(-Math.min(100,glowNow-gameGlowTime)/160);gameGlowTime=glowNow;
 c.save();c.beginPath();c.rect(0,0,w,h);for(const x of [0,.85*w])for(const y of [0,.78*h])c.rect(x,y,.15*w,.22*h);c.clip('evenodd');
 for(let i=0;i<8;i++){
  const z=ZONES[i],x=z.x*w,y=z.y*h,r=z.r*w*.86,target=out&&!out.done&&out.block.zone===i,next=out?.next?.zone===i&&!target;
  const sounding=target&&out.phase==='playing';
  gameGlowLevels[i]=gameReducedMotion.matches?Number(sounding):gameGlowLevels[i]+(Number(sounding)-gameGlowLevels[i])*glowStep;
  if(gameGlowLevels[i]>.005){
   // A soft annular halo leaves the donut and the four tracking markers readable.
   const breath=gameReducedMotion.matches||gameSession?.pausedAt!==null?1:.94+.06*Math.sin(glowNow/650);
   c.save();c.globalAlpha=gameGlowLevels[i]*breath;
   const halo=c.createRadialGradient(x,y,r*.86,x,y,r*1.48);
   halo.addColorStop(0,'rgba(255,232,143,0)');halo.addColorStop(.25,'rgba(255,229,126,.5)');halo.addColorStop(.43,'rgba(255,232,143,.8)');halo.addColorStop(1,'rgba(255,239,170,0)');
   c.fillStyle=halo;c.beginPath();c.arc(x,y,r*1.48,0,Math.PI*2);c.fill();
   c.shadowColor='rgba(255,222,106,.85)';c.shadowBlur=r*.24;c.strokeStyle='#ffeaa0';c.lineWidth=Math.max(3,r*.085);c.beginPath();c.arc(x,y,r*1.08,0,Math.PI*2);c.stroke();c.restore();
  }
  if(target){const playing=out.phase==='playing',color=playing?'#dcae38':'#dfa32b';c.fillStyle=playing?'rgba(255,233,153,.12)':'rgba(255,202,82,.3)';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.lineWidth=6;c.beginPath();c.arc(x,y,r,-Math.PI/2,-Math.PI/2+2*Math.PI*(playing?out.remaining:out.dwell));c.stroke();
   c.font=`600 ${Math.max(12,w*.019)}px system-ui`;c.textAlign='center';c.fillStyle='#fffaf0';c.fillRect(x-r*.8,y-r-27,r*1.6,24);c.fillStyle='#355b50';c.fillText(out.block.title,x,y-r-9);
  }else if(next){c.strokeStyle=out.queued?'#3b9d7e':'#85b9a7';c.lineWidth=2;c.setLineDash(out.queued?[]:[5,5]);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.setLineDash([]);if(out.phase==='playing'){c.lineWidth=5;c.beginPath();c.arc(x,y,r,-Math.PI/2,-Math.PI/2+2*Math.PI*(out.queued?1:out.dwell));c.stroke();}c.fillStyle='#355b50';c.textAlign='center';c.font=`600 ${Math.max(12,w*.018)}px system-ui`;c.fillText(out.queued?'READY':'NEXT',x,y-r-9);}
 }c.restore();
}
function tickGame(frameNow){
 requestAnimationFrame(tickGame);if(!gameEnabled||frameNow-gameLastPaint<30)return;gameLastPaint=frameNow;
 if(gameSession&&!gameSession.done&&gameSession.pausedAt===null){
  const fresh=sample&&performance.now()-sampleReceived<500,located=!!(fresh&&sample.worn&&sample.surfaceValid&&Number.isFinite(sample.x)&&Number.isFinite(sample.y));
  if(!document.body.classList.contains('controller-mode')||document.hidden||!audioEnabled||instrument.ctx?.state!=='running'||!gameSession.automatic&&source!==gameSession.source)pauseGame('restore the console and audio, then Resume');
  else{
   gameOutcome=gameSession.update(gameNow(),located?zoneAt(sample.x,sample.y):-1,located);const o=gameOutcome;
   if(o.queue)gameNextJob=gameJob(o.queue.block,o.queue.startAt);
   if(o.launch){gameScheduler=gameNextJob?.block.index===o.launch.index?gameNextJob:gameJob(o.launch,gameSession.playStart);gameNextJob=null;onGazeArtNote(o.launch.zone);onCognitiveNote();log('game_phrase',{index:gameSession.index,source,automatic:gameSession.automatic});schedulePhraseAudio();}
   const label=gameSession.automatic?'Listening preview · automatic':'Gaze play';
   if(o.done){gameScheduler=null;gameNextJob=null;$('gamePause').disabled=true;gameStatus(`${label} finished · ${gameSession.completed}/${gameSession.blocks.length} complete phrases · ${gameAudioCount} melody notes.`);}
   else if(o.phase==='playing')gameStatus(`${label} · ${o.block.title} playing · ${o.next?(o.queued?'NEXT READY — joins at the boundary':`NEXT: donut ${o.next.zone+1} · hold early ${Math.round(o.dwell*100)}%`):'Finale · enjoy the ending'}`);
   else if(o.prepareLeft>0)gameStatus(`${label} · get ready for ${o.block.title}/${gameSession.blocks.length} · ${Math.ceil(o.prepareLeft/1000)} s to settle`);
   else if(gameSession.automatic)gameStatus('Listening preview · starting next phrase');
   else if(!located)gameStatus(source==='live'&&['Disconnected','Not connected'].includes(connectionState)?`Pair Neon to continue · ${o.block.title} is saved`:`Waiting for gaze / markers · ${o.block.title} is saved · resumes automatically when tracking returns`);
   else gameStatus(`Waiting for you · look at ${o.block.title}/${gameSession.blocks.length} (donut ${o.block.zone+1}) · hold ${(gameSession.dwellMs/1000).toFixed(1)} s · no time limit`);
   $('lastNote').textContent=`${gameSession.completed}/${gameSession.blocks.length} phrases completed · ${gameAudioCount} melody notes`;
  }
 }
 const blocks=gameSession?.blocks||DonutGame.phrases(gameSelected()),index=gameSession?.index||0;
 const signature=`${$('gameSong').value}:${index}:${gameSession?.done}`;if($('gamePhrase').dataset.signature!==signature){$('gamePhrase').dataset.signature=signature;$('gamePhrase').replaceChildren(...blocks.slice(index,index+8).map((p,i)=>{const e=document.createElement('span');e.textContent=`${p.title} · donut ${p.zone+1} · ${p.beats} beats`;e.title=p.reason;e.className=i===0?'current':'';return e;}));}
 paintGame(gameOutcome);
}
requestAnimationFrame(tickGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame('tab hidden');});window.addEventListener('pagehide',()=>{if(gameEnabled)gameSilence();});
