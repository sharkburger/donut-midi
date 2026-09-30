/* Descriptive evidence only. No mental-state classifier or probability. */
(function(root){
 const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null;};
 class CognitiveEvidence {
  constructor(){this.reset();}
  reset(){this.rows=[];this.events=[];this.reference=null;this.capture=null;this.context='live';this.message='Capture a personal reference';}
  invalidate(reason){this.reference=null;this.capture=null;this.message=reason;for(const row of this.rows)row.delta=null;}
  start(now){this.rows=[];this.reference=null;this.capture={start:now,values:[],total:0};this.message='Reference capture: look naturally; do not play';}
  event(now,kind){this.events.push({time:now,kind});if(this.capture)this.invalidate('Reference interrupted by '+kind+'; start again');}
  update(now,input){
   if(input.context!==this.context){this.reset();this.context=input.context;}
   const stable=input.stable&&!input.paused&&input.context==='live';
   if(!stable&&(this.reference||this.capture))this.invalidate('Conditions changed; capture a new reference');
   const left=Number.isFinite(input.left)&&input.left>0?input.left:null,right=Number.isFinite(input.right)&&input.right>0?input.right:null;
   // Require the same binocular measurement for baseline and subsequent comparisons.
   const valid=input.context==='live'&&input.fresh&&input.worn&&left!==null&&right!==null;
   const raw=valid?(left+right)/2:null;
   if(this.capture){const b=this.capture;b.total++;if(stable&&valid)b.values.push(raw);
    if(now-b.start>=30000){if(b.total>=100&&b.values.length/b.total>=.8&&valid){this.reference=median(b.values);this.message='Personal reference ready';}else this.message='Reference failed: insufficient binocular coverage';this.capture=null;}}
   const delta=stable&&valid&&this.reference!==null?(raw/this.reference-1)*100:null;
   this.rows.push({time:now,raw,delta,valid:!!valid,paused:!!input.paused});
   this.rows=this.rows.filter(r=>now-r.time<=30000);this.events=this.events.filter(e=>now-e.time<=30000);
   const quality=this.rows.length?this.rows.filter(r=>r.valid).length/this.rows.length:0;
   const usable=this.rows.filter(r=>r.delta!==null);const span=usable.length?now-usable[0].time:0;
   const summary=stable&&valid&&this.reference!==null&&quality>=.8&&span>=10000?median(usable.map(r=>r.delta)):null;
   return {raw,delta,summary,quality,reference:this.reference,capturing:!!this.capture,remaining:this.capture?Math.max(0,Math.ceil((30000-(now-this.capture.start))/1000)):0,
    notes:this.events.filter(e=>e.kind==='note').length,
    status:input.context!=='live'?'Live Neon required':input.paused?'Paused: tasting / movement / lighting change':!input.stable?'Confirm stable conditions':!input.fresh?'Waiting for fresh data':!input.worn?'Glasses not worn':!valid?'Both pupil measurements required':this.capture?'Capturing reference':this.reference===null?this.message:summary===null?'Gathering valid evidence (at least 10 s)':'Descriptive evidence available'};
  }
 }
 if(typeof module!=='undefined')module.exports={CognitiveEvidence};else root.CognitiveEvidence=CognitiveEvidence;
})(globalThis);
