/* Device choice is separate from pairing with this computer. Credentials stay in the client. */
(() => {
 const panel=document.createElement('section');panel.id='neon-device-panel';
 panel.innerHTML='<h3>Choose my Neon</h3><p>Pair this computer first, then scan and select your Companion phone. This computer remembers its phone ID and Neon module.</p><p id="neon-device-current" role="status">No device selected.</p><label>Available Neon devices<select id="neon-device-list" aria-label="Available Neon devices"><option value="">Scan to find your phone</option></select></label><div class="button-row"><button id="neon-device-scan" disabled>Scan devices</button><button id="neon-device-select" disabled>Use this Neon</button><button id="neon-device-forget" disabled>Forget selection</button></div><p id="neon-device-help">Device selection needs Connector 1.5 or later.</p>';
 connectorPanel.append(panel);
 const badge=document.createElement('span');badge.id='neon-device-badge';badge.textContent='Neon · not selected';badge.title='The selected Companion phone and Neon module';
 document.querySelector('.header-right')?.append(badge);
 const style=document.createElement('style');style.textContent='#neon-device-panel{border-top:1px solid #d8caba;margin-top:18px;padding-top:12px}#neon-device-list{display:block;width:100%;max-width:100%;padding:9px;margin-top:7px}#neon-device-current{overflow-wrap:anywhere;background:#e8f0e9;padding:9px;border-radius:7px}#neon-device-badge{font-size:10px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px;border-radius:8px;background:#e4ece5}';document.head.append(style);
 let supported=false,poll=null,signature='',connectedKey='',wasConnected=false,selectionKey=null,requestBusy=false;
 const els=id=>document.getElementById('neon-device-'+id);
 function activeTest(){return (typeof studyRecorder!=='undefined'&&studyRecorder)||(typeof researchRunning==='function'&&researchRunning());}
 function clearGaze(){
  if(typeof sample!=='undefined')sample=null;
  if(typeof sampleReceived!=='undefined')sampleReceived=0;
  if(typeof dwell!=='undefined')dwell.reset();
  if(typeof gameModeActive==='function'&&gameModeActive()&&typeof pauseGame==='function')pauseGame('Neon device changed or disconnected');
  if(typeof instrument!=='undefined')instrument.stop();
  if(typeof cognitiveEvidence!=='undefined'&&typeof cognitiveEvidence.invalidate==='function')cognitiveEvidence.invalidate('Neon device changed');
 }
 function current(state){
  const s=state?.selected,c=state?.connected,key=s?.id||null;
  if(selectionKey!==null&&selectionKey!==key){
   if(typeof studyRecorder!=='undefined'&&studyRecorder&&typeof studyFinal!=='undefined'&&!studyFinal&&typeof finishStudy==='function')finishStudy('neon_device_changed');
   if(typeof researchRunning==='function'&&researchRunning()&&typeof finishResearch==='function')finishResearch('neon_device_changed');
   clearGaze();
  }else if(wasConnected&&!c)clearGaze();
  selectionKey=key;wasConnected=!!c;connectedKey=c?.id||'';window.neonDeviceLabel=s?`${s.name} · ${s.ip} · Neon ${s.moduleSerial}`:'';
  const text=s?`${c?'Connected':'Locked / waiting'}: ${s.name} · ${s.ip} · phone ${s.phoneId} · Neon ${s.moduleSerial}. ${state.state||''}`:'No device selected. Scan and choose your phone; streaming stays off until selected.';
  if(signature!==text){signature=text;els('current').textContent=text;badge.textContent=s?`${c?'●':'○'} ${s.name} · ${s.moduleSerial}`:'Neon · not selected';badge.title=text;}
  els('forget').disabled=!supported||!s||requestBusy;
 }
 function list(data){
  current(data);const previous=els('list').value;els('list').replaceChildren(new Option(data.scanning?'Scanning…':'Select your Companion phone',''));
  for(const d of data.devices||[])els('list').append(new Option(`${d.name} · ${d.ip} · phone ${d.phoneId} · Neon ${d.moduleSerial}`,d.id));
  const wanted=previous||data.selected?.id;if([...els('list').options].some(o=>o.value===wanted))els('list').value=wanted;
  els('select').disabled=!supported||!els('list').value||requestBusy;
  els('help').textContent=data.error|| (data.scanning?'Scanning local Wi-Fi…':data.devices?.length?'Select your phone and verify its Neon module. This is not an exclusive reservation; other computers can still choose the same device.':'No available Neon found. Attach Neon, open Companion, allow local-network access and check Wi-Fi.');
  clearTimeout(poll);if(data.scanning)poll=setTimeout(refresh,1000);
 }
 async function refresh(){try{list(await neonPackageClient.request('devices'));}catch(e){els('help').textContent=e.message;}}
 async function action(path,body={}){
  if(requestBusy)return;
  if(path!=='devices/scan'&&activeTest()){els('help').textContent='End the participant test or research session before changing devices.';return;}
  requestBusy=true;els('scan').disabled=true;els('select').disabled=true;els('forget').disabled=true;
  try{list(await neonPackageClient.request(path,body));if(path!=='devices/scan')clearGaze();}
  catch(e){els('help').textContent=e.message;}
  finally{requestBusy=false;els('scan').disabled=!supported;els('select').disabled=!supported||!els('list').value;els('forget').disabled=!supported||!selectionKey;}
 }
 els('scan').onclick=()=>action('devices/scan');els('select').onclick=()=>action('devices/select',{id:els('list').value});els('forget').onclick=()=>action('devices/forget');els('list').onchange=()=>els('select').disabled=!supported||!els('list').value||requestBusy;
 window.updateNeonDevicePanel=(data,first)=>{
  supported=data.capabilities?.includes('device-selection-v1')&&!!data.deviceSelection;
  els('scan').disabled=!supported||requestBusy;
  if(!supported){els('help').textContent='This older connector chooses automatically. Close it and reopen the updated Donut MIDI App (1.5+) to select a device safely.';els('select').disabled=true;els('forget').disabled=true;return;}
  current(data.deviceSelection);
  if(first)action('devices/scan');
 };
 window.neonDevicePanelDisconnected=()=>{supported=false;clearTimeout(poll);els('scan').disabled=true;els('select').disabled=true;els('forget').disabled=true;badge.textContent='Neon · connector disconnected';els('current').textContent='Connector disconnected. Pair this computer again to view the selected device.';clearGaze();wasConnected=false;};
})();
