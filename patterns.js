(function(root){
  class GazePatterns {
    constructor(){this.reset();}
    reset(){this.history=[];this.lastTime=null;this.zone=-1;this.since=0;this.switches=[];}
    update(now,zone,valid){
      if(!valid){this.reset();return {label:'Insufficient signal',kind:'unknown',switches:0,seconds:0};}
      if(this.lastTime!==null&&now-this.lastTime>500)this.reset();
      this.lastTime=now;
      if(zone!==this.zone){if(zone>=0&&this.zone>=0)this.switches.push(now);this.zone=zone;this.since=now;}
      this.switches=this.switches.filter(t=>now-t<=5000);
      const seconds=zone>=0?(now-this.since)/1000:0;
      return {label:seconds>=2?'Sustained dwell':this.switches.length>=4?'Frequent transitions':'Observing',kind:seconds>=2?'anchor':this.switches.length>=4?'explore':'observing',switches:this.switches.length,seconds};
    }
  }
  if(typeof module!=='undefined')module.exports={GazePatterns};else root.GazePatterns=GazePatterns;
})(typeof window!=='undefined'?window:globalThis);
