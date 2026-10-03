/* Resizable workshop panes; pointer capture keeps drags alive over the preview iframe. */
(() => {
 const grid=document.querySelector('.editor-grid'),handle=document.querySelector('#editor-divider'),slot=document.querySelector('#preview-slot');
 const storageKey='p5-neon-editor-split-v1',narrow=matchMedia('(max-width:850px)');
 let ratio=.4,dragging=false,pointerId=null;
 try{const saved=Number(localStorage.getItem(storageKey));if(saved>=.15&&saved<=.8)ratio=saved;}catch{}
 function limits(){const width=Math.max(1,grid.getBoundingClientRect().width-18);return {width,min:Math.max(.15,240/width),max:Math.min(.8,1-280/width)};}
 function render(){
  if(narrow.matches){end();return;}
  const {width,min,max}=limits(),shown=Math.max(min,Math.min(max,ratio));
  grid.style.setProperty('--editor-width',`${width*shown}px`);
  handle.setAttribute('aria-valuemin',String(Math.round(min*100)));
  handle.setAttribute('aria-valuemax',String(Math.round(max*100)));
  handle.setAttribute('aria-valuenow',String(Math.round(shown*100)));
  handle.setAttribute('aria-valuetext',`${Math.round(shown*100)}% code, ${Math.round((1-shown)*100)}% preview`);
 }
 function save(){try{localStorage.setItem(storageKey,String(ratio));}catch{}}
 function set(value){const {min,max}=limits();ratio=Math.max(min,Math.min(max,value));render();}
 function end(){if(!dragging)return;dragging=false;document.body.classList.remove('resizing-editor');if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);pointerId=null;save();}
 handle.addEventListener('pointerdown',event=>{if(event.button!==0||narrow.matches)return;event.preventDefault();dragging=true;pointerId=event.pointerId;handle.setPointerCapture(pointerId);handle.focus({preventScroll:true});document.body.classList.add('resizing-editor');});
 handle.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==pointerId)return;set((event.clientX-grid.getBoundingClientRect().left-9)/limits().width);});
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);window.addEventListener('blur',end);
 handle.addEventListener('dblclick',()=>{set(.5);save();});
 handle.addEventListener('keydown',event=>{
  const step=event.shiftKey?.1:.02;
  if(event.key==='ArrowLeft')set(ratio-step);else if(event.key==='ArrowRight')set(ratio+step);
  else if(event.key==='Home')set(0);else if(event.key==='End')set(1);else if(event.key==='Enter')set(.5);else return;
  event.preventDefault();save();
 });
 new ResizeObserver(render).observe(grid);narrow.addEventListener('change',render);
 // Remove the old 420px ceiling: grow the whole 3:2 surface with its available width.
 new ResizeObserver(entries=>{
  const width=entries[0].contentRect.width;
  if(width>0){const height=Math.ceil(width/1.5+64);slot.style.height=`${height+2}px`;grid.style.setProperty('--preview-height',`${height}px`);}
 }).observe(slot);
 render();
})();
