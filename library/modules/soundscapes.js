/* Procedural browser soundscapes: no recordings and no MIDI state notes. */
(function(root){
 const names={relax:'Birdsong & soft breeze',focus:'Steady gentle rain',stress:'Low wind & slow swells',confusion:'Swirling water texture'};
 class StateSoundscapes{
  constructor(random=Math.random){this.random=random;this.layer=null;this.retiring=new Set();this.volume=.38;this.buffer=null;}
  noise(c){if(this.buffer?.context===c)return this.buffer.value;const b=c.createBuffer(1,c.sampleRate*4,c.sampleRate),a=b.getChannelData(0);let brown=0;for(let i=0;i<a.length;i++){brown=(brown+.02*(this.random()*2-1))/1.02;a[i]=brown*3.5;}this.buffer={context:c,value:b};return b;}
  set(kind,c,destination){if(!names[kind]){this.stop();return;}if(this.layer?.kind===kind&&this.layer.c===c)return;this.stop();
   const out=c.createGain();out.gain.setValueAtTime(0,c.currentTime);out.gain.linearRampToValueAtTime(this.volume,c.currentTime+2);out.connect(destination);
   const g={kind,c,out,nodes:new Set([out]),sources:new Set(),nextBird:c.currentTime+.3,disposed:false};this.layer=g;
   const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise(c);source.loop=true;filter.type=kind==='confusion'?'bandpass':'lowpass';filter.frequency.value={relax:700,focus:6500,stress:380,confusion:1200}[kind];filter.Q.value=kind==='confusion'?1.4:.5;gain.gain.value={relax:.1,focus:.48,stress:.55,confusion:.4}[kind];source.connect(filter);filter.connect(gain);gain.connect(out);
   [source,filter,gain].forEach(n=>g.nodes.add(n));g.sources.add(source);source.onended=()=>this.dispose(g);source.start();
   const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value={relax:.09,focus:.04,stress:.16,confusion:.23}[kind];depth.gain.value=kind==='confusion'?700:kind==='stress'?160:30;lfo.connect(depth);depth.connect(filter.frequency);[lfo,depth].forEach(n=>g.nodes.add(n));g.sources.add(lfo);lfo.start();
  }
  chirp(g){const c=g.c,at=c.currentTime+.02,osc=c.createOscillator(),gain=c.createGain(),base=1700+this.random()*1200;osc.type='sine';osc.frequency.setValueAtTime(base,at);osc.frequency.exponentialRampToValueAtTime(base*1.65,at+.07);osc.frequency.exponentialRampToValueAtTime(base*.85,at+.18);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.09,at+.02);gain.gain.linearRampToValueAtTime(0,at+.22);osc.connect(gain);gain.connect(g.out);g.nodes.add(osc);g.nodes.add(gain);g.sources.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();g.nodes.delete(osc);g.nodes.delete(gain);g.sources.delete(osc);};osc.start(at);osc.stop(at+.23);}
  tick(){const g=this.layer;if(g?.kind==='relax'&&g.c.currentTime>=g.nextBird){this.chirp(g);g.nextBird=g.c.currentTime+.7+this.random()*2.6;}}
  setVolume(value){this.volume=Math.max(0,Math.min(.8,Number(value)||0));const g=this.layer;if(g){g.out.gain.cancelScheduledValues(g.c.currentTime);g.out.gain.setTargetAtTime(this.volume,g.c.currentTime,.1);}}
  dispose(g){if(g.disposed)return;g.disposed=true;for(const n of g.nodes)n.disconnect();g.nodes.clear();g.sources.clear();this.retiring.delete(g);}
  stop(immediate=false){const g=this.layer;this.layer=null;if(g){this.retiring.add(g);const t=g.c.currentTime,d=immediate?0:2;g.out.gain.cancelScheduledValues(t);g.out.gain.setTargetAtTime(0,t,immediate?.005:.35);for(const s of g.sources){try{s.stop(t+d+.05);}catch{}}}
   if(immediate)for(const old of this.retiring){old.out.gain.cancelScheduledValues(old.c.currentTime);old.out.gain.setValueAtTime(0,old.c.currentTime);for(const s of old.sources){try{s.stop();}catch{}}this.dispose(old);}
  }
 }
 if(typeof module!=='undefined')module.exports={StateSoundscapes,names};else Object.assign(root,{StateSoundscapes,soundscapeNames:names});
})(globalThis);
