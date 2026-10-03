'use strict';
const chooser=document.querySelector('#template'),info=document.querySelector('#effect-info'),templateCache=new Map();
let previousDraft=null;
for(const group of [...new Set(NeonTemplates.map(t=>t.group))]){const optgroup=document.createElement('optgroup');optgroup.label=group;for(const t of NeonTemplates.filter(t=>t.group===group)){const o=new Option(t.title,t.id);optgroup.append(o);}chooser.append(optgroup);}chooser.value='physical';
function selectedTemplate(){return NeonTemplates.find(t=>t.id===chooser.value);}
function showTemplateInfo(){const t=selectedTemplate();info.replaceChildren();for(const [tag,text] of [['strong',t.title],['p',t.description],['p','Input: '+t.needs],['small','Try: '+t.tune]]){const e=document.createElement(tag);e.textContent=text;info.append(e);}document.querySelector('#asset-picker').hidden=t.id!=='asset';}
chooser.onchange=showTemplateInfo;showTemplateInfo();
function syncTemplateControls(){
 const id=editor.value.match(/\/\/ @neon-template: ([a-z]+)/)?.[1]||(editor.value.includes('// DONUT_LAYOUT_START')?'physical':null);
 if(id&&NeonTemplates.some(t=>t.id===id)){chooser.value=id;showTemplateInfo();}
 const physical=editor.value.includes('// DONUT_LAYOUT_START');document.querySelector('#edit-layout').hidden=!physical;document.querySelector('#print-layout').hidden=!physical;
}
function backupDraft(){previousDraft=editor.value;document.querySelector('#restore-draft').hidden=false;}
document.querySelector('#restore-draft').onclick=()=>{if(previousDraft===null)return;const current=editor.value;editor.value=previousDraft;previousDraft=current;run();message.textContent='Previous draft restored. Click Enable sound again if the sketch uses audio.';};
document.querySelector('#load-template').onclick=async()=>{
 const button=document.querySelector('#load-template'),t=selectedTemplate();button.disabled=true;
 try{
  let code=templateCache.get(t.file);if(!code){const response=await fetch(t.file+'?v=catalog-1');if(!response.ok)throw Error('Template could not load');code=await response.text();templateCache.set(t.file,code);}
  backupDraft();if(t.id==='paint')code=code.replace('const PLAY_NOTES = true;','const PLAY_NOTES = false;');
  // This comment also selects the marker-only mat in the preview.
  if(t.file.startsWith('templates/')&&!code.includes('// @neon-template:'))code='// @neon-template: '+t.id+'\n'+code;
  editor.value=code;run();document.querySelector('#template-help').textContent='Loaded '+t.title+'. Edit code and Run. Restore previous draft undoes this load; Download project ZIP keeps a portable copy.';
 }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
};
function matName(){return editor.value.includes('// DONUT_LAYOUT_START')||editor.value.includes('// @neon-template:')?'markers.svg':'monitor-mat.svg';}
function projectCode(remote=true){const mat=remote?'https://sharkburger.github.io/donut-midi/'+matName():'./'+matName();return '// Requires p5.js, connector-client.js, p5.neon.js and p5.neon-effects.js.\n// Mouse input is enabled in setup. Live input: call neon.connect({code, port}) from a button on an allowed origin.\nconst neon = new NeonP5();\nconst MAT_URL = '+JSON.stringify(mat)+';\n'+editor.value;}
document.querySelector('#copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(projectCode());message.textContent='Project code copied, including neon and MAT_URL. Load the four dependencies listed in the integration guide.';}catch{message.textContent='Clipboard blocked. Use Download project ZIP or Download sketch.js instead.';}};
function downloadProjectFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
document.querySelector('#download').onclick=()=>downloadProjectFile(new Blob([projectCode()],{type:'text/javascript'}),'sketch.js');
document.querySelector('#asset-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){message.textContent='Choose a PNG, JPEG or WebP up to 2 MB.';return;}
 if(!/^ *const ASSET_URL = .*$/m.test(editor.value)){message.textContent='Load Dwell → reveal your image before replacing its asset.';return;}
 const reader=new FileReader();reader.onload=()=>{backupDraft();editor.value=editor.value.replace(/^ *const ASSET_URL = .*$/m,()=> 'const ASSET_URL = '+JSON.stringify(reader.result)+';');run();};reader.onerror=()=>message.textContent='Image could not be read.';reader.readAsDataURL(file);
};
document.querySelector('#export-project').onclick=async()=>{
 const button=document.querySelector('#export-project');button.disabled=true;message.textContent='Packaging your sketch and libraries…';
 try{
  const paths={'p5.min.js':'../vendor/p5.min.js','p5-LICENSE.txt':'../vendor/p5-LICENSE.txt','connector-client.js':'../connector-client.js','p5.neon.js':'p5.neon.js','p5.neon-effects.js':'p5.neon-effects.js','LICENSE':'LICENSE',[matName()]:'../'+matName()};
  const files=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([name,path])=>{const r=await fetch(path);if(!r.ok)throw Error('Could not package '+name);return [name,await r.arrayBuffer()];})));
  files['sketch.js']=projectCode(false);
  files['index.html']='<!doctype html><html><head><meta charset="utf-8"><title>My eye-driven p5 sketch</title><style>body{margin:0;font:14px system-ui;background:#f6f2e9}canvas{display:block}#pairing{position:fixed;right:8px;top:8px;z-index:10;max-width:45%;background:#f6f2e9;padding:8px}input,button{padding:8px}</style></head><body><div id="pairing"><details><summary>Live Neon connection (allowed origins only)</summary><input id="code" type="password" placeholder="Pairing code"><input id="port" type="number" placeholder="Connector port"><button id="connect">Connect Neon</button><p id="status">Mouse works immediately. Live needs the Donut MIDI origin or connector fallback.</p></details></div><script src="p5.min.js"></script><script src="connector-client.js"></script><script src="p5.neon.js"></script><script src="p5.neon-effects.js"></script><script src="sketch.js"></script><script>document.querySelector("#connect").onclick=async()=>{try{await neon.connect({code:document.querySelector("#code").value,port:Number(document.querySelector("#port").value)});}catch(e){document.querySelector("#status").textContent=e.message;}};neon.on("status",s=>document.querySelector("#status").textContent=s);neon.on("error",s=>document.querySelector("#status").textContent=s);</script></body></html>';
  files['README.txt']='Eye-driven p5 starter\n\nRun: python3 -m http.server 8080\nOpen http://localhost:8080 and use the mouse. Enable sound if the sketch has a sound button.\n\nEdit sketch.js; replace image data or use your own local asset URL. The editor exports the current code, not necessarily the selected catalog item. No pairing credentials or participant data are included.\n\nLive Neon: the current connector permits https://sharkburger.github.io and its own loopback origin. This arbitrary localhost server and the official p5 Web Editor are NOT enabled for live access by default. Use the built-in Workshop Editor for live testing; custom-host integration needs explicit connector origin support. Do not disable browser security or embed pairing tokens in public code.\n\nDependencies: p5.js 1.11.11, p5.neon.js, p5.neon-effects.js; connector-client.js for live input.\n\nGaze coordinates map the original four-AprilTag surface, not the desktop. Eye poses are native 3D data drawn as illustrations, not camera video. Mouse eye/pupil/blink demos are synthetic. BlinkGate is an experimental aperture threshold heuristic with an open-eye reference, not the official Pupil Labs blink detector. Missing data does not trigger an event. No mental-state classifier.\n';
  if(editor.value.includes('// DONUT_LAYOUT_START'))files['physical-mat.svg']=DonutLayout.svg(DonutLayout.read(editor.value),markerRects);
  downloadProjectFile(NeonProjectZip.zip(files),'neon-workshop-project.zip');message.textContent='Project ZIP ready: sketch, p5, Neon libraries, mat and README. No pairing credentials included.';
 }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
};
