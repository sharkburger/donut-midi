'use strict';
const editor=document.querySelector('#code-editor'),message=document.querySelector('#editor-status'),connection=document.querySelector('#connection-status');
const bridge=new NeonP5();let frame=null,baseTemplate='',matURL='',activeCode='',running=false;
let physicalTemplate='',markerURL='',markerRects='',defaultImageURL='';
const draftKey='p5-neon-draft-v1';
function save(){try{localStorage.setItem(draftKey,editor.value);}catch{}}
function send(value){frame?.contentWindow?.postMessage(value,'*');} // Opaque sandbox has no target origin; source is checked on receipt.
bridge.on('sample',sample=>{if(running)send({type:'sample',sample,age:Math.max(0,performance.now()-bridge.received)});});
bridge.on('status',text=>{connection.textContent=text;send({type:'input',live:true});});
bridge.on('error',text=>{connection.textContent=text;send({type:'lost'});});
const scriptURL=name=>new URL(name,location.href).href;
function stop(){running=false;frame?.remove();frame=null;message.textContent='Stopped · draft preserved';}
function run(){
 try{if(editor.value.includes('// DONUT_LAYOUT_START'))DonutLayout.read(editor.value);}catch(e){message.textContent=e.message;return;}
 if(typeof syncTemplateControls==='function')syncTemplateControls();
 save();stop();activeCode=editor.value;message.textContent='Starting preview…';frame=document.createElement('iframe');frame.title='Editable p5 sketch preview';frame.sandbox='allow-scripts';
 frame.srcdoc=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${location.origin}; style-src 'unsafe-inline'; img-src data: blob:; connect-src data:;"><style>body{margin:0;font:12px system-ui;background:white}canvas{display:block}button{padding:9px;margin:8px}</style></head><body><script src="${scriptURL('../vendor/p5.min.js')}"></script><script src="${scriptURL('p5.neon.js')}"></script><script src="${scriptURL('p5.neon-effects.js')}?v=mirror-1"></script><script src="${scriptURL('preview-runtime.js')}?v=mirror-1"></script></body></html>`;
 document.querySelector('#preview-slot').replaceChildren(frame);
}
window.addEventListener('message',e=>{
 if(!frame||e.source!==frame.contentWindow)return;
 const data=e.data;if(data?.type==='ready'){send({type:'start',code:activeCode,image:defaultImageURL,mat:(activeCode.includes('// DONUT_LAYOUT_START')||activeCode.includes('// @neon-template:'))?markerURL:matURL,live:bridge.mode==='live'});}
 else if(data?.type==='running'){running=true;message.textContent='Preview running';}
 else if(data?.type==='error'){message.textContent='Sketch error: '+String(data.text).slice(0,300);}
 else if(data?.type==='log'){message.textContent=String(data.text).slice(0,180);}
});
document.querySelector('#run').onclick=run;document.querySelector('#stop').onclick=stop;
editor.addEventListener('input',save);
document.querySelector('#download').onclick=()=>{
 const prelude="// Standalone: load p5.js and p5.neon.js before this file.\nconst neon = new NeonP5();\nconst MAT_URL = '"+(editor.value.includes('// DONUT_LAYOUT_START')?'../markers.svg':'../monitor-mat.svg')+"';\n";
 const url=URL.createObjectURL(new Blob([prelude+editor.value],{type:'text/javascript'}));const a=document.createElement('a');a.href=url;a.download='sketch.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelector('#editor-connect').onclick=async()=>{connection.textContent='Connecting…';send({type:'lost'});try{await bridge.connect({code:document.querySelector('#editor-pair').value.trim(),port:Number(document.querySelector('#editor-port').value)});}catch(error){connection.textContent=error.message;}};
document.querySelector('#editor-mouse').onclick=()=>{bridge.disconnect();send({type:'input',live:false});connection.textContent='Mouse simulation';};
window.addEventListener('pagehide',()=>bridge.dispose());
(async()=>{try{const [template,mat,physical,markers,defaultImage]=await Promise.all([fetch('template.js?v=workshop-2'),fetch('../monitor-mat.svg'),fetch('physical-template.js?v=physical-1'),fetch('../markers.svg'),fetch('assets/donut-eye.png')]);if(!template.ok||!mat.ok||!physical.ok||!markers.ok||!defaultImage.ok)throw Error('Template assets could not load.');defaultImageURL='data:image/png;base64,'+btoa(Array.from(new Uint8Array(await defaultImage.arrayBuffer()),b=>String.fromCharCode(b)).join(''));baseTemplate=await template.text();physicalTemplate=await physical.text();const markerText=await markers.text();markerURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(markerText)));const xml=new DOMParser().parseFromString(markerText,'image/svg+xml');markerRects=[...xml.querySelectorAll('rect[fill=black]')].map(r=>new XMLSerializer().serializeToString(r)).join('');matURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(await mat.text())));let draft;try{draft=localStorage.getItem(draftKey);}catch{}editor.value=draft||physicalTemplate;run();if(draft)document.querySelector('#template-help').textContent='Your saved draft is preserved. To design a physical mat, select Physical donuts and click Load template. Download your draft first if needed.';}catch(error){message.textContent=error.message;}})();

// Embedded editor receives samples, never credentials, from the existing app.
const embeddedWorkshop=new URLSearchParams(location.search).get('embedded')==='1'&&window.parent!==window;
let sharedLive=false;
if(embeddedWorkshop){
 document.querySelector('header').style.display='none';
 const panel=document.querySelector('.editor-connection');
 panel.replaceChildren(connection);
 connection.textContent='Using the app input. Pair Neon in the main page, or use the mouse in this preview.';
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='donut-workshop-input')return;
  const data=event.data;
  if(sharedLive!==!!data.live){sharedLive=!!data.live;bridge.mode=sharedLive?'live':'disconnected';send({type:'input',live:sharedLive});}
  connection.textContent=sharedLive?'Shared Neon connection · '+String(data.status):'Mouse simulation · use the pointer inside the preview';
  if(sharedLive&&running){
   send({type:'input',live:true});
   if(data.sample&&Number.isFinite(data.age)&&data.age<500)send({type:'sample',sample:data.sample,age:data.age});
   else send({type:'lost'});
  }
 });
}
