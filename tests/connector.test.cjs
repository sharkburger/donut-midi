const test=require('node:test'),assert=require('node:assert/strict');
const {NeonConnectorClient}=require('../connector-client.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token='a'.repeat(43);
const sample={source:'neon',x:.5,y:.5,worn:true,surfaceValid:true,pupilLeft:null,pupilRight:null};
test('authenticated stream forwards fresh samples once and stops after disconnect',async()=>{
 let calls=0,received=0,status=0;
 const c=new NeonConnectorClient({fetch:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer '+token);assert.ok(url.startsWith('http://127.0.0.1:8766/'));return {ok:true,json:async()=>({connector:'donut-midi',sequence:1,sample,sampleAgeMs:0,status:'fixture'})};},sample:()=>received++,status:()=>status++});
 await c.start(token);await sleep(110);c.stop();const before=calls;await sleep(60);
 assert.equal(received,1);assert.ok(status>=2);assert.equal(calls,before);
});
test('stale input and wrong credentials cannot produce notes',async()=>{
 let received=0,lost='';
 const c=new NeonConnectorClient({fetch:async()=>({ok:true,json:async()=>({connector:'donut-midi',sequence:1,sample,sampleAgeMs:900})}),sample:()=>received++,lost:s=>lost=s});
 await c.start(token);await sleep(75);c.stop();assert.equal(received,0);
 c.fetcher=async()=>({ok:false,status:401});await c.start(token);assert.match(lost,/expired or incorrect/);assert.equal(received,0);
 await assert.rejects(c.start('wrong'),/pairing code/);await assert.rejects(c.start(token,80),/port/);
});
test('an in-flight response from a previous connection cannot revive the stream',async()=>{
 let resolve,received=0;
 const c=new NeonConnectorClient({fetch:()=>new Promise(r=>resolve=r),sample:()=>received++});
 const pending=c.start(token);c.stop();resolve({ok:true,json:async()=>({connector:'donut-midi',sequence:1,sample,sampleAgeMs:0})});await pending;assert.equal(received,0);assert.equal(c.timer,null);
});

test('starting a duet preserves a paired live stream on public and fallback pages',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const text=fs.readFileSync(require.resolve('../studio.js'),'utf8');
 const code=text.slice(text.indexOf('async function startDuet(){'),text.indexOf("$('startDuet').onclick=startDuet;"));
 for(const publicWebsite of [true,false]){
  let switches=0,connections=0,mat=0;const elements=new Proxy({}, {get:(o,k)=>o[k]??=( {checked:false,value:'',textContent:'',click(){},scrollIntoView(){}} )});
  const context={publicWebsite,neonPackageActive:true,calibrating:false,studioDemo:false,source:'live',audioEnabled:true,ws:null,
   instrument:{start:async()=>{},ctx:{state:'running'}},$:id=>elements[id],switchSource:()=>switches++,connect:()=>connections++,
   setPhase:()=>{},setReportedState:()=>{},startFocusBacking:()=>{},resetStudio:()=>{},toast:()=>{},patternSoundEnabled:false,
   screenScoreButton:{click:()=>mat++},studio:{classList:{contains:()=>true}}};
  vm.createContext(context);vm.runInContext(code,context);await context.startDuet();
  assert.equal(switches,0);assert.equal(connections,0);assert.equal(mat,1);
 }
});
