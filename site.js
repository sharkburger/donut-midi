'use strict';
let pending;
const output=document.getElementById('mini-output');
function selectRing(button){document.querySelectorAll('[data-note]').forEach(b=>b.classList.toggle('selected',b===button));output.textContent=button.dataset.note+' · 已选音（无声示意）';}
document.querySelectorAll('[data-note]').forEach(button=>{button.addEventListener('pointerenter',()=>{clearTimeout(pending);pending=setTimeout(()=>selectRing(button),500);});button.addEventListener('pointerleave',()=>clearTimeout(pending));button.addEventListener('click',()=>selectRing(button));});
