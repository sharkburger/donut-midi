'use strict';
const editor=document.querySelector('#code-editor'),message=document.querySelector('#editor-status'),connection=document.querySelector('#connection-status');
const bridge=new NeonP5();let frame=null,baseTemplate='',matURL='',activeCode='',running=false;
let physicalTemplate='',markerURL='',markerRects='',defaultImageURL='';
const draftKey='p5-neon-draft-v1';
function save(){try{localStorage.setItem(draftKey,editor.value);}catch{}window.NeonSketches?.capture();}
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
 frame.srcdoc=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${location.origin}; style-src 'unsafe-inline'; img-src data: blob:; connect-src data:;"><style>body{margin:0;font:12px system-ui;background:white}canvas{display:block}button{padding:9px;margin:8px}</style></head><body><script src="${scriptURL('../vendor/p5.min.js')}"></script><script src="${scriptURL('p5.neon.js')}"></script><script src="${scriptURL('p5.neon-effects.js')}?v=scream-1"></script><script src="${scriptURL('preview-runtime.js')}?v=scream-1"></script></body></html>`;
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
(async()=>{try{const [template,mat,physical,markers,defaultImage]=await Promise.all([fetch('template.js?v=workshop-2'),fetch('../monitor-mat.svg'),fetch('physical-template.js?v=physical-1'),fetch('../markers.svg'),fetch('assets/donut-eye.png')]);if(!template.ok||!mat.ok||!physical.ok||!markers.ok||!defaultImage.ok)throw Error('Template assets could not load.');defaultImageURL='data:image/png;base64,'+btoa(Array.from(new Uint8Array(await defaultImage.arrayBuffer()),b=>String.fromCharCode(b)).join(''));baseTemplate=await template.text();physicalTemplate=await physical.text();const markerText=await markers.text();markerURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(markerText)));const xml=new DOMParser().parseFromString(markerText,'image/svg+xml');markerRects=[...xml.querySelectorAll('rect[fill=black]')].map(r=>new XMLSerializer().serializeToString(r)).join('');matURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(await mat.text())));let draft;try{draft=localStorage.getItem(draftKey);}catch{}editor.value=window.NeonSketches.initialize(draft||physicalTemplate);run();if(draft)document.querySelector('#template-help').textContent='Your current sketch is restored. Use Save sketch to keep a named version, or My sketches to reopen earlier work.';}catch(error){message.textContent=error.message;}})();

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

/* JavaScript syntax colors over the existing accessible textarea. No code execution. */
(function(root){
 'use strict';
 const keywords=new Set('async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield'.split(' '));
 const constants=new Set(['true','false','null','undefined','NaN','Infinity']);
 const builtins=new Set('Array ArrayBuffer AudioContext Boolean Date Error Float32Array JSON Map Math Number Object Promise RegExp Set String URL Uint8Array p5 NeonP5 NeonEffects console document window globalThis performance'.split(' '));
 const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function highlight(code){
  // Sticky matching ensures every character, including unfinished edits, is preserved.
  const token=/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\[\s\S]|[^"\\\n])*(?:"|(?=\n|$))|'(?:\\[\s\S]|[^'\\\n])*(?:'|(?=\n|$))|`(?:\\[\s\S]|[^`\\])*`?|(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?n?)|[A-Za-z_$][\w$]*|[{}[\]();,.?:]|[+\-*/%=!<>&|~^]+|\s+|[^]/gy;
  let html='',match;
  while((match=token.exec(code))){
   const value=match[0],next=code.slice(token.lastIndex),previous=code.slice(0,match.index).trimEnd().slice(-1);
   let type='';
   if(value.startsWith('//')||value.startsWith('/*'))type='comment';
   else if(/^["'`]/.test(value))type='string';
   else if(/^(?:\d|\.\d)/.test(value))type='number';
   else if(constants.has(value))type='constant';
   else if(keywords.has(value))type='keyword';
   else if(builtins.has(value))type='builtin';
   else if(/^[A-Za-z_$]/.test(value)){if(/^\s*\(/.test(next))type='function';else if(previous==='.'||/^\s*:/.test(next))type='property';}
   else if(/^[+\-*/%=!<>&|~^]+$/.test(value))type='operator';
   const safe=escape(value);html+=type?`<span class="syntax-${type}">${safe}</span>`:safe;
  }
  return html;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={highlight};return;}
 const editor=document.querySelector('#code-editor');if(!editor)return;
 const shell=document.createElement('div');shell.className='syntax-editor';
 const preview=document.createElement('pre');preview.className='syntax-preview';preview.setAttribute('aria-hidden','true');
 const code=document.createElement('code');preview.append(code);editor.before(shell);shell.append(preview,editor);
 editor.wrap='off';editor.setAttribute('autocapitalize','off');editor.setAttribute('autocorrect','off');
 let pending=false;
 function syncScroll(){preview.scrollTop=editor.scrollTop;preview.scrollLeft=editor.scrollLeft;}
 function render(){pending=false;code.innerHTML=highlight(editor.value)+'\n';syncScroll();}
 function schedule(){if(!pending){pending=true;requestAnimationFrame(render);}}
 editor.addEventListener('input',schedule);editor.addEventListener('scroll',syncScroll);
 // Templates, image replacement and layout editing assign .value without input events.
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 Object.defineProperty(editor,'value',{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);schedule();}});
 render();
})(globalThis);
/* Named sketches and personal templates. Storage writes are transactional. */
(function(root){
 'use strict';
 const KEY='donut-midi-sketch-library-v1';
 class SketchStore{
  constructor(storage,{id=()=>crypto.randomUUID(),now=()=>new Date().toISOString()}={}){
   this.storage=storage;this.id=id;this.now=now;const raw=storage.getItem(KEY);this.serialized=raw;
   this.state=raw?JSON.parse(raw):{version:1,activeId:null,sketches:[]};
   if(this.state.version!==1||!Array.isArray(this.state.sketches)||this.state.sketches.some(s=>!s||typeof s.id!=='string'||typeof s.code!=='string'||typeof s.title!=='string'))throw Error('The saved sketch library could not be read. Its stored data has been preserved.');
  }
  commit(next){if(this.storage.getItem(KEY)!==this.serialized)throw Error('This library changed in another tab. Download your current code before reloading.');const serialized=JSON.stringify(next);this.storage.setItem(KEY,serialized);this.serialized=serialized;this.state=next;return this.current();}
  clone(){return JSON.parse(JSON.stringify(this.state));}
  current(){return this.state.sketches.find(s=>s.id===this.state.activeId)||null;}
  make(code,title){const time=this.now();return {id:this.id(),title,code,includeTemplate:false,isTemplate:false,savedCode:null,savedTitle:null,savedAt:null,createdAt:time,updatedAt:time};}
  create(code='',title='Untitled sketch'){const next=this.clone(),record=this.make(code,title);next.sketches.push(record);next.activeId=record.id;return this.commit(next);}
  initialize(code){if(this.current())return this.current();if(this.state.sketches.length)return this.open(this.state.sketches[0].id);return this.create(code,'Recovered sketch');}
  capture(code,title,includeTemplate){const old=this.current();if(!old)throw Error('Create or open a sketch first.');if(old.code===code&&old.title===title&&old.includeTemplate===includeTemplate)return old;
   const next=this.clone(),record=next.sketches.find(s=>s.id===next.activeId);Object.assign(record,{code,title,includeTemplate,updatedAt:this.now()});return this.commit(next);
  }
  save(){const next=this.clone(),record=next.sketches.find(s=>s.id===next.activeId);if(!record)throw Error('No sketch is open.');if(!record.title.trim())throw Error('Give your sketch a name before saving.');Object.assign(record,{title:record.title.trim(),savedTitle:record.title.trim(),savedCode:record.code,isTemplate:record.includeTemplate,savedAt:this.now(),updatedAt:this.now()});return this.commit(next);}
  open(id){if(!this.state.sketches.some(s=>s.id===id))throw Error('This sketch is no longer available.');const next=this.clone();next.activeId=id;return this.commit(next);}
  templates(){return this.state.sketches.filter(s=>s.isTemplate&&typeof s.savedCode==='string');}
  fromTemplate(id){const record=this.templates().find(s=>s.id===id);if(!record)throw Error('Save this sketch as a template first.');return this.create(record.savedCode,record.savedTitle+' copy');}
  dirty(s=this.current()){return !!s&&(s.savedCode===null||s.code!==s.savedCode||s.title!==s.savedTitle||s.includeTemplate!==s.isTemplate);}
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={SketchStore,KEY};return;}
 let store=null,ready=false,editTimer=null;
 const name=document.querySelector('#sketch-name'),include=document.querySelector('#save-as-template'),status=document.querySelector('#sketch-save-status'),dialog=document.querySelector('#sketch-library-dialog'),list=document.querySelector('#saved-sketch-list');
 const editor=document.querySelector('#code-editor');
 function error(e){status.textContent='Not saved: '+(e.name==='QuotaExceededError'?'Browser storage is full. Download your code or library backup.':e.message);status.dataset.state='error';}
 function paintStatus(){const s=store.current();status.dataset.state=store.dirty(s)?'draft':'saved';status.textContent=store.dirty(s)?'Draft kept in this browser · click Save sketch':'Saved in this browser'+(s.isTemplate?' · in My templates':'');}
 function capture(){if(!ready)return;clearTimeout(editTimer);store.capture(editor.value,name.value,include.checked);paintStatus();}
 function safeCapture(){try{capture();}catch(e){error(e);}}
 function show(record){editor.value=record.code;name.value=record.title;include.checked=record.includeTemplate;paintStatus();if(typeof refreshUserTemplates==='function')refreshUserTemplates();}
 function act(action){try{capture();if(typeof backupDraft==='function')backupDraft();const record=action();show(record);run();}catch(e){error(e);}}
 function renderList(){
  list.replaceChildren();const records=[...store.state.sketches].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  for(const s of records){const row=document.createElement('article'),title=document.createElement('strong'),detail=document.createElement('p'),open=document.createElement('button');title.textContent=s.title||'Untitled sketch';detail.textContent=(store.dirty(s)?'Unsaved draft':'Saved')+(s.isTemplate?' · My template':'')+' · '+new Date(s.updatedAt).toLocaleString();open.textContent='Open';open.setAttribute('aria-label','Open '+(s.title||'Untitled sketch'));open.onclick=()=>{act(()=>store.open(s.id));if(store.current()?.id===s.id)dialog.close();};row.append(title,detail,open);list.append(row);}
 }
 root.NeonSketches={
  initialize(code){try{store=new SketchStore(localStorage);const record=store.initialize(code);ready=true;for(const id of ['new-sketch','save-sketch','my-sketches'])document.getElementById(id).disabled=false;show(record);return record.code;}catch(e){error(e);return code;}},
  capture:safeCapture,
  templates(){return store?.templates()||[];},
  fromTemplate(id){act(()=>store.fromTemplate(id));},
  beginFromCode(code,title){act(()=>store.create(code,title));}
 };
 editor.addEventListener('input',()=>{if(!ready)return;clearTimeout(editTimer);editTimer=setTimeout(safeCapture,250);status.textContent='Keeping draft…';});
 name.addEventListener('input',safeCapture);include.addEventListener('change',safeCapture);
 document.querySelector('#new-sketch').onclick=()=>{act(()=>store.create());editor.focus();};
 document.querySelector('#save-sketch').onclick=()=>{try{capture();store.save();show(store.current());}catch(e){error(e);}};
 document.querySelector('#my-sketches').onclick=()=>{try{capture();renderList();dialog.showModal();}catch(e){error(e);}};
 document.querySelector('#close-sketch-library').onclick=()=>dialog.close();
 document.querySelector('#backup-sketches').onclick=()=>{try{
  capture();const blob=new Blob([JSON.stringify(store.state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='donut-midi-sketch-library.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){error(e);}};
 window.addEventListener('pagehide',safeCapture);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)safeCapture();});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();document.querySelector('#save-sketch').click();}});
})(globalThis);
