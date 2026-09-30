const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('studio.js','utf8');
const logic=src.slice(src.indexOf('function validEye('),src.indexOf('eyeCanvasView=NeonEyeCanvas.mount'));
function status(extra,state='ready'){const element={};const ctx={source:'live',sampleReceived:0,performance:{now:()=>100},studioDemo:false,sample:{worn:true},$:()=>element,...extra};vm.createContext(ctx);vm.runInContext(logic+`;eyeRendererState=${JSON.stringify(state)};refreshEyeStatus();`,ctx);return element.textContent;}
test('live gaze without poses is distinguished from 3D rendering failure',()=>{assert.match(status({}),/Live gaze received.*3D eye pose missing/);const pose={center:[1,2,3],direction:[0,0,1]};const message=status({sample:{worn:true,eyes:{left:pose,right:pose}}},'failed');assert.match(message,/Native Neon 3D data · 2\/2 eyes/);assert.match(message,/switching to compatible/);});
test('stale or disconnected input never reports native eye data',()=>{assert.match(status({performance:{now:()=>900}}),/Waiting for fresh/);assert.match(status({source:'simulate'}),/No live Neon input/);});
