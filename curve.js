(function(root){
  // Four artistic regions, not a psychological intensity scale.
  const bands=['relax','focus','stress','confusion'];
  class RegionCurve{
    constructor(){this.reset();}
    reset(){this.value=null;this.last=null;this.candidate=null;this.since=0;this.entered=null;this.lastHit=-Infinity;}
    update(time,target,enabled=true){
      if(!enabled||!Number.isFinite(target)){this.value=null;this.last=null;this.candidate=null;this.entered=null;return {value:null,hit:null};}
      if(this.last!==null&&time-this.last>500){this.value=null;this.candidate=null;this.entered=null;}
      const dt=this.last===null?0:Math.max(0,time-this.last);this.last=time;
      this.value=this.value===null?target:this.value+(target-this.value)*(1-Math.exp(-dt/450));
      this.value=Math.max(0,Math.min(3.999,this.value));
      let band=Math.floor(this.value);
      if(this.candidate!==null&&this.value>this.candidate-.08&&this.value<this.candidate+1.08)band=this.candidate;
      if(band!==this.candidate){this.candidate=band;this.since=time;}
      let hit=null;
      if(time-this.since>=600&&band!==this.entered&&time-this.lastHit>=1500){this.entered=band;this.lastHit=time;hit=bands[band];}
      return {value:this.value,hit};
    }
  }
  if(typeof module!=='undefined')module.exports={RegionCurve,bands};else root.RegionCurve=RegionCurve;
})(typeof window!=='undefined'?window:globalThis);
