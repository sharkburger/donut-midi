'use strict';
const layoutDialog=document.createElement('dialog');layoutDialog.id='layoutDialog';
layoutDialog.innerHTML=`<form method="dialog"><button class="layout-close" aria-label="Close layout designer">×</button></form><h2>Design your physical donut score</h2><p>Drag the circles or enter positions. Numbers match the printed mat. Sounds belong to these positions; moving a real donut alone does not move its sound.</p><div class="layout-settings"><label>Mat width / cm <input id="layoutWidth" type="number" min="30" max="120" step="1"></label><label><input id="layoutPhysical" type="checkbox"> Physical mat mode · hide screen tags</label></div><p>Height = width × 2/3. Keep the four tags in their original positions. Place donut centers on the printed crosses.</p><div id="layoutMap"></div><div class="layout-table"><table><thead><tr><th>#</th><th>Name</th><th>X / %</th><th>Y / %</th><th>Diameter / cm</th><th>MIDI note</th></tr></thead><tbody id="layoutRows"></tbody></table></div><p id="layoutError" role="status"></p><button id="applyLayout">Apply layout & run</button><p>After applying, enable sound again. Download the matching SVG mat from the editor toolbar. Print at actual size; check the 10 cm scale. For large mats use a print shop or tiled printing without resizing.</p>`;
document.body.append(layoutDialog);
let layoutDraft=null;
function layoutMessage(text){document.querySelector('#layoutError').textContent=text;}
function readLayoutFields(){
 const value=JSON.parse(JSON.stringify(layoutDraft));value.widthCm=Number(document.querySelector('#layoutWidth').value);value.physical=document.querySelector('#layoutPhysical').checked;
 for(const [i,d] of value.donuts.entries()){
  const row=document.querySelector('#layoutRows').children[i];d.name=row.querySelector('[data-key=name]').value;
  d.x=Number(row.querySelector('[data-key=x]').value)/100;d.y=Number(row.querySelector('[data-key=y]').value)/100;
  d.r=Number(row.querySelector('[data-key=diameter]').value)/(2*value.widthCm);d.note=Number(row.querySelector('[data-key=note]').value);
 }
 return DonutLayout.validate(value);
}
function layoutDraw(){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1200 800');svg.setAttribute('aria-label','Drag donut positions');svg.style.touchAction='none';
 // The designer never shows scanable tags; only the printed score has them in physical mode.
 for(const [x,y,label] of [[30,30,'0'],[1050,30,'1'],[1050,650,'2'],[30,650,'3']]){const r=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x,y,width:120,height:120,fill:'#ddd'}))r.setAttribute(k,v);svg.append(r);const t=document.createElementNS(ns,'text');t.setAttribute('x',x+60);t.setAttribute('y',y+72);t.textContent='TAG '+label;svg.append(t);}
 for(const [i,d] of layoutDraft.donuts.entries()){
  const g=document.createElementNS(ns,'g'),circle=document.createElementNS(ns,'circle'),text=document.createElementNS(ns,'text');g.dataset.index=i;g.style.cursor='grab';circle.setAttribute('cx',d.x*1200);circle.setAttribute('cy',d.y*800);circle.setAttribute('r',d.r*1200);circle.setAttribute('fill',d.color);text.setAttribute('x',d.x*1200);text.setAttribute('y',d.y*800+5);text.textContent=layoutDraft.interaction==='scream'?'3 s → scream':(i+1)+' · '+d.note;g.append(circle,text);svg.append(g);
 }
 let moving=null;
 svg.onpointerdown=e=>{const g=e.target.closest('[data-index]');if(!g)return;moving=Number(g.dataset.index);svg.setPointerCapture(e.pointerId);};
 svg.onpointermove=e=>{if(moving===null)return;const rect=svg.getBoundingClientRect(),d=layoutDraft.donuts[moving],row=document.querySelector('#layoutRows').children[moving];d.x=+(Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))).toFixed(3);d.y=+(Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))).toFixed(3);row.querySelector('[data-key=x]').value=(d.x*100).toFixed(1);row.querySelector('[data-key=y]').value=(d.y*100).toFixed(1);const g=svg.querySelector(`[data-index="${moving}"]`);g.querySelector('circle').setAttribute('cx',d.x*1200);g.querySelector('circle').setAttribute('cy',d.y*800);g.querySelector('text').setAttribute('x',d.x*1200);g.querySelector('text').setAttribute('y',d.y*800+5);};
 svg.onpointerup=svg.onpointercancel=()=>{moving=null;try{readLayoutFields();layoutMessage('Ready to apply.');}catch(e){layoutMessage(e.message);}};
 document.querySelector('#layoutMap').replaceChildren(svg);
}
function layoutRows(){
 document.querySelector('.layout-table th:last-child').hidden=layoutDraft.interaction==='scream';
 const rows=document.querySelector('#layoutRows');rows.replaceChildren();
 for(const [i,d] of layoutDraft.donuts.entries()){
  const tr=document.createElement('tr'),n=document.createElement('td');n.textContent=i+1;tr.append(n);
  for(const [key,value] of Object.entries({name:d.name,x:+(d.x*100).toFixed(2),y:+(d.y*100).toFixed(2),diameter:+(d.r*2*layoutDraft.widthCm).toFixed(2),note:d.note})){
   const td=document.createElement('td'),input=document.createElement('input');if(key==='note'&&layoutDraft.interaction==='scream')td.hidden=true;input.type=key==='name'?'text':'number';input.value=value;input.dataset.key=key;input.setAttribute('aria-label',`Donut ${i+1} ${key}`);if(key!=='name')input.step=key==='note'?'1':'.1';
   input.onchange=()=>{try{layoutDraft=readLayoutFields();layoutDraw();layoutMessage('Ready to apply.');}catch(e){layoutMessage(e.message);}};td.append(input);tr.append(td);
  }
  rows.append(tr);
 }
}
document.querySelector('#edit-layout').onclick=()=>{try{layoutDraft=DonutLayout.read(editor.value);document.querySelector('#layoutWidth').value=layoutDraft.widthCm;document.querySelector('#layoutPhysical').checked=layoutDraft.physical;layoutRows();layoutDraw();layoutMessage('');layoutDialog.showModal();}catch(e){message.textContent=e.message;}};
document.querySelector('#layoutWidth').onchange=()=>{const width=Number(document.querySelector('#layoutWidth').value);if(!Number.isFinite(width)||width<30||width>120){layoutMessage('Mat width must be 30–120 cm.');return;}try{layoutDraft=DonutLayout.validate({...layoutDraft,widthCm:width});layoutRows();layoutMessage('All physical dimensions scale with the mat.');}catch(e){layoutMessage(e.message);}};
document.querySelector('#applyLayout').onclick=()=>{try{const value=readLayoutFields();editor.value=DonutLayout.write(editor.value,value);run();layoutDialog.close();}catch(e){layoutMessage(e.message);}};
document.querySelector('#print-layout').onclick=()=>{
 try{
  if(editor.value!==activeCode||!running)throw Error('Apply / Run the current layout before downloading its mat.');
  const value=DonutLayout.read(activeCode),svg=DonutLayout.svg(value,markerRects);
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='donut-mat-'+value.widthCm+'cm.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  message.textContent=`Mat exported: ${value.widthCm} × ${(value.widthCm*2/3).toFixed(1)} cm. Print at actual size; check the 10 cm line. Reprint if positions change.`;
 }catch(e){message.textContent=e.message;}
};
