(function(root){
 class MidiOutput{
  constructor(clock=()=>performance.now()){this.clock=clock;this.port=null;}
  select(port){this.panic();this.port=port;}
  send(bytes,time){try{if(this.port&&this.port.state!=='disconnected')this.port.send(bytes,time);}catch{this.port=null;}}
  note(note,channel=0,duration=350,delay=0){if(!Number.isInteger(note)||note<0||note>127||!Number.isInteger(channel)||channel<0||channel>15)return;const t=this.clock()+Math.max(0,delay);this.send([0x90|channel,note,80],t);this.send([0x80|channel,note,0],t+Math.max(30,duration));}
  program(program,channel=0){this.send([0xC0|channel,program]);}
  panic(){if(!this.port)return;try{this.port.clear?.();}catch{}for(const c of [0,1]){this.send([0xB0|c,123,0]);this.send([0xB0|c,120,0]);}}
 }
 class StableChoice{
  constructor(delay=8000){this.delay=delay;this.reset();}
  reset(){this.candidate=null;this.since=0;this.value=null;}
  update(value,time){if(value===null){this.reset();return null;}if(value!==this.candidate){this.candidate=value;this.since=time;}if(time-this.since>=this.delay)this.value=value;return this.value;}
 }
 if(typeof module!=='undefined')module.exports={MidiOutput,StableChoice};else Object.assign(root,{MidiOutput,StableChoice});
})(typeof window!=='undefined'?window:globalThis);
