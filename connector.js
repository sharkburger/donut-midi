'use strict';
const connectorPanel=document.createElement('section');connectorPanel.className='panel connector-panel';
connectorPanel.innerHTML=`<h2>Connect your Neon</h2><p>1. <a href="https://sharkburger.github.io/donut-midi/downloads/Donut-MIDI-Neon.dmg"><b>Download for Mac (.dmg)</b></a>. Open the disk image, drag <b>Donut MIDI Neon</b> to Applications, then open the app. It starts Terminal automatically; no scripts to find. <a href="https://sharkburger.github.io/donut-midi/downloads/donut-midi-connector.zip">Windows / source ZIP</a>.</p><p>First launch: Python 3.11–3.14 and internet are required. This app is not Apple-notarized. If blocked, use System Settings → Privacy &amp; Security → Open Anyway. Allow the app to control Terminal when prompted.</p><p>2. Connect Neon to Companion. Keep the phone and computer on the same Wi-Fi. The connector opens this website with a fresh pairing code.</p><label class="field">Pairing code<input id="pairCode" type="password" autocomplete="off" spellcheck="false" placeholder="Paste the code from the connector"></label><label class="field">Connector port<input id="pairPort" type="number" min="1024" max="65535" value="8766"></label><div class="button-row"><button id="pairConnect">Connect local Neon</button><button id="pairDisconnect">Disconnect</button></div><p id="pairStatus" role="status">Not paired. No local network request is made until you click Connect.</p><p>Allow local-network access if your browser asks. If the connection is blocked, use the local fallback link printed by the connector. <a href="connector-guide.html" target="_blank" rel="noopener">Setup &amp; troubleshooting ↗</a></p><p>Gaze data travels from Companion through this computer to your browser. It is not sent to GitHub. Recording remains off until you explicitly start it.</p>`;
document.querySelector('.intro').after(connectorPanel);
let neonPackageActive=false;
const neonPackageClient=new NeonConnectorClient({
 sample:(s,age)=>{if(source!=='live')return;receive(s);sampleReceived-=age;connectionState='Receiving via local connector';$('pairStatus').textContent=`Live Neon · ${s.worn?'glasses worn':'glasses not worn'} · ${s.markerCount??0}/4 markers · ${s.surfaceValid?'mat located':'mat not located'}`;},
 status:(message,first)=>{connectionState='Connector connected';$('connectionInfo').textContent=message;$('pairStatus').textContent=message;if(first){neonPackageActive=true;toast('Connector paired. Enable sound, then open the screen mat.');}},
 lost:message=>{neonPackageActive=false;sample=null;sampleReceived=0;if(typeof gameModeActive!=='function'||!gameModeActive())instrument.stop();dwell.reset();connectionState='Disconnected';$('pairStatus').textContent=message+' If the browser blocks local access, open the local fallback link from the connector.';$('connectionInfo').textContent=message;}
});
window.donutNeonConnector=neonPackageClient;
function stopNeonPackage(){if(window.donutNeonConnector){window.donutNeonConnector.stop();neonPackageActive=false;}}
async function connectNeonPackage(){
 if(typeof researchRunning==='function'&&researchRunning()){toast('End the research session before changing the connection.');return;}
 const token=$('pairCode').value.trim(),port=Number($('pairPort').value);
 if(!/^[A-Za-z0-9_-]{32,128}$/.test(token)){connectorPanel.scrollIntoView({behavior:'smooth'});$('pairCode').focus();toast('Start the connector and paste its pairing code first.');return;}
 if(source!=='live')switchSource('live');else disconnect();
 studioDemo=false;$('studioDemo').textContent='Start synthetic eye demo';resetStudio();
 $('pairStatus').textContent='Connecting to this computer…';
 try{await neonPackageClient.start(token,port);}catch(e){$('pairStatus').textContent=e.message;}
}
$('pairConnect').onclick=connectNeonPackage;
$('pairDisconnect').onclick=()=>{disconnect();sample=null;sampleReceived=0;instrument.stop();dwell.reset();$('pairStatus').textContent='Disconnected. The connector can be closed on your computer.';};
const pairFragment=new URLSearchParams(location.hash.slice(1));
if(pairFragment.has('pair')){
 const code=pairFragment.get('pair'),port=pairFragment.get('port');
 if(/^[A-Za-z0-9_-]{32,128}$/.test(code))$('pairCode').value=code;
 if(/^\d{4,5}$/.test(port||''))$('pairPort').value=port;
 history.replaceState(null,'',location.pathname+location.search);
 $('pairStatus').textContent='Pairing code received. Click Connect local Neon to allow this page to read your gaze.';
}
if(publicWebsite){$('connect').onclick=connectNeonPackage;$('connectEyes').onclick=connectNeonPackage;}
