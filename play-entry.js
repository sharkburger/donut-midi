'use strict';
const entrySource=new URLSearchParams(location.search).get('source');
if(['simulate','live','replay'].includes(entrySource))switchSource(entrySource);
document.querySelectorAll('[data-entry]').forEach(button=>button.addEventListener('click',()=>{switchSource(button.dataset.entry);$('source').focus();$('source').scrollIntoView({block:'center',behavior:'smooth'});}));
const localPage=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);
if(!localPage){$('connect').disabled=true;$('connectionInfo').innerHTML='实时连接需本机 HTTP 页面，公开 HTTPS 或 file:// 来源不受桥接支持。<a href="get-started.html#neon">查看本地启动步骤 →</a>';}
