'use strict';
const neon = new NeonP5(); let live=false, canvas=null, started=false;
 const nativeMouse=neon.useMouse.bind(neon);
 neon.useMouse=c=>{canvas=c;if(!live)nativeMouse(c);};
 const report=(type,text)=>parent.postMessage({type,text},'*');
 window.addEventListener('error',e=>report('error',e.message));
 window.addEventListener('unhandledrejection',e=>report('error',String(e.reason)));
 console.log=(...args)=>report('log',args.map(String).join(' '));
 addEventListener('message',e=>{if(e.source!==parent)return;const d=e.data;
 if(d.type==='start'&&!started){started=true;live=d.live;if(live)neon.mode='live';try{new Function('neon','MAT_URL',d.code)(neon,d.mat);report('running','Preview running');}catch(err){report('error',err.message);}}
 if(d.type==='input'){if(live===d.live)return;live=d.live;neon.disconnect();if(live)neon.mode='live';else if(canvas)nativeMouse(canvas);}
 if(d.type==='sample'&&live)neon.accept(d.sample,d.age);
 if(d.type==='lost'){neon.disconnect();if(live)neon.mode='live';}
 });
 addEventListener('load',()=>report('ready','ready'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)neon.resetDwell();});
