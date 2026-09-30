'use strict';
const editor=document.querySelector('#code-editor'),message=document.querySelector('#editor-status'),connection=document.querySelector('#connection-status');
const bridge=new NeonP5();let frame=null,baseTemplate='',matURL='',activeCode='',running=false;
const draftKey='p5-neon-draft-v1';
function save(){try{localStorage.setItem(draftKey,editor.value);}catch{}}
function send(value){frame?.contentWindow?.postMessage(value,'*');} // Opaque sandbox has no target origin; source is checked on receipt.
bridge.on('sample',sample=>{if(running)send({type:'sample',sample,age:Math.max(0,performance.now()-bridge.received)});});
bridge.on('status',text=>{connection.textContent=text;send({type:'input',live:true});});
bridge.on('error',text=>{connection.textContent=text;send({type:'lost'});});
const scriptURL=name=>new URL(name,location.href).href;
function stop(){running=false;frame?.remove();frame=null;message.textContent='Stopped · draft preserved';}
function run(){
 save();stop();activeCode=editor.value;message.textContent='Starting preview…';frame=document.createElement('iframe');frame.title='Editable p5 sketch preview';frame.sandbox='allow-scripts';
 frame.srcdoc=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${location.origin}; style-src 'unsafe-inline'; img-src data: blob:; connect-src data:;"><style>body{margin:0;font:12px system-ui;background:white}canvas{display:block}button{padding:9px;margin:8px}</style></head><body><script src="${scriptURL('../vendor/p5.min.js')}"></script><script src="${scriptURL('p5.neon.js')}"></script><script src="${scriptURL('preview-runtime.js')}"></script></body></html>`;
 document.querySelector('#preview-slot').replaceChildren(frame);
}
window.addEventListener('message',e=>{
 if(!frame||e.source!==frame.contentWindow)return;
 const data=e.data;if(data?.type==='ready'){send({type:'start',code:activeCode,mat:matURL,live:bridge.mode==='live'});}
 else if(data?.type==='running'){running=true;message.textContent='Preview running';}
 else if(data?.type==='error'){message.textContent='Sketch error: '+String(data.text).slice(0,300);}
 else if(data?.type==='log'){message.textContent=String(data.text).slice(0,180);}
});
document.querySelector('#run').onclick=run;document.querySelector('#stop').onclick=stop;
document.querySelector('#load-template').onclick=()=>{if(editor.value!==activeCode&&!confirm('Replace the current draft with the selected template? Download first if you want to keep it.'))return;editor.value=baseTemplate.replace('const PLAY_NOTES = false;',`const PLAY_NOTES = ${document.querySelector('#template').value==='music'};`);run();};
editor.addEventListener('input',save);
document.querySelector('#download').onclick=()=>{
 const prelude="// Standalone: load p5.js and p5.neon.js before this file.\nconst neon = new NeonP5();\nconst MAT_URL = '../monitor-mat.svg';\n";
 const url=URL.createObjectURL(new Blob([prelude+editor.value],{type:'text/javascript'}));const a=document.createElement('a');a.href=url;a.download='sketch.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelector('#editor-connect').onclick=async()=>{connection.textContent='Connecting…';send({type:'lost'});try{await bridge.connect({code:document.querySelector('#editor-pair').value.trim(),port:Number(document.querySelector('#editor-port').value)});}catch(error){connection.textContent=error.message;}};
document.querySelector('#editor-mouse').onclick=()=>{bridge.disconnect();send({type:'input',live:false});connection.textContent='Mouse simulation';};
window.addEventListener('pagehide',()=>bridge.dispose());
(async()=>{try{const [template,mat]=await Promise.all([fetch('template.js'),fetch('../monitor-mat.svg')]);if(!template.ok||!mat.ok)throw Error('Template assets could not load.');baseTemplate=await template.text();matURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(await mat.text())));let draft;try{draft=localStorage.getItem(draftKey);}catch{}editor.value=draft||baseTemplate;run();}catch(error){message.textContent=error.message;}})();
