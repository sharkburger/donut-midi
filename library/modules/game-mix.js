/* Original synthetic arrangements of the built-in melodies. No remote audio. */
(function(root){
 const chords=[[48,52,55],[50,53,57],[52,55,59],[53,57,60],[55,59,62],[45,48,52]];
 function events(song,block){
  const out=block.events.map(e=>({...e,kind:'lead',style:song.style||'chill'}));
  if(!song.style)return out;
  const add=(kind,midi,start,end)=>{start=Math.max(start,block.start);end=Math.min(end,block.end);if(end>start)out.push({kind,midi,start:start-block.start,end:end-block.start,style:song.style});};
  for(let bar=Math.floor(block.start/4);bar*4<block.end;bar++){
   const chord=chords[song.chords[bar%song.chords.length]],a=bar*4;
   for(const n of chord)add('pad',n+12,a,a+4);
   for(let beat=0;beat<4;beat++){
    const t=a+beat;add('bass',chord[beat%2?2:0]-12,t,t+.72);
    if(song.style==='electro'||beat===0||beat===2)add('kick',36,t,t+.32);
    if(beat===1||beat===3)add('snare',38,t,t+.23);
    add('hat',42,t+.5,t+.62);
    if(song.style!=='chill')add('hat',42,t,t+.08);
   }
   if(song.style==='pop')add('kick',36,a+3.5,a+3.78);
   if(bar%4===3){add('snare',38,a+3.5,a+3.64);add('hat',42,a+3.75,a+3.88);}
  }
  return out.sort((a,b)=>a.start-b.start);
 }
 class Player{
  constructor(ctx,destination){this.ctx=ctx;this.active=new Set();this.lead=ctx.createGain();this.backing=ctx.createGain();this.lead.connect(destination);this.backing.connect(destination);this.backing.gain.value=.8;
   this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=731;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647)*2-1;}
  }
  setBacking(enabled){this.backing.gain.setTargetAtTime(enabled?.8:0,this.ctx.currentTime,.04);}
  play(e,at,duration){
   const c=this.ctx,d=Math.max(.025,duration),gain=c.createGain(),filter=c.createBiquadFilter(),nodes=[gain,filter],sources=[];
   const tone=(wave,freq,level=1,detune=0)=>{const osc=c.createOscillator(),g=c.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,at);osc.detune.value=detune;g.gain.value=level;osc.connect(g);g.connect(filter);nodes.push(osc,g);sources.push(osc);return osc;};
   const hz=440*2**((e.midi-69)/12);let peak=.24,attack=.012,release=.06,end=at+d;
   filter.type='lowpass';filter.frequency.value=2600;
   if(e.kind==='kick'){const osc=tone('sine',135);osc.frequency.exponentialRampToValueAtTime(45,at+.12);peak=.42;attack=.004;release=d*.85;}
   else if(e.kind==='snare'||e.kind==='hat'){
    const noise=c.createBufferSource();noise.buffer=this.noise;noise.connect(filter);sources.push(noise);nodes.push(noise);filter.type=e.kind==='hat'?'highpass':'bandpass';filter.frequency.value=e.kind==='hat'?7000:1900;peak=e.kind==='hat'?.09:.22;attack=.002;release=d*.9;
   }else if(e.kind==='pad'){tone('triangle',hz,.55,-5);tone('sawtooth',hz,.22,5);filter.frequency.value=950;peak=.12;attack=Math.min(.12,d*.2);release=Math.min(.18,d*.3);}
   else if(e.kind==='bass'){tone('sine',hz,.85);tone('triangle',hz,.22);filter.frequency.value=700;peak=.34;attack=.01;release=Math.min(.12,d*.3);}
   else {tone(e.style==='electro'?'square':'triangle',hz,.7);tone('sine',hz*2,.2);filter.frequency.value=e.style==='electro'?1800:2800;peak=.34;release=Math.min(.07,d*.22);}
   gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(peak,at+Math.min(attack,d*.2));gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*.55),Math.max(at+attack,end-release));gain.gain.exponentialRampToValueAtTime(.0001,end);
   filter.connect(gain);gain.connect(e.kind==='lead'?this.lead:this.backing);
   const voice={gain,sources,nodes};this.active.add(voice);sources[0].onended=()=>{for(const n of nodes)n.disconnect();this.active.delete(voice);};for(const source of sources){source.start(at);source.stop(end+.01);}return voice;
  }
  stop(){const now=this.ctx.currentTime;for(const v of this.active){v.gain.gain.cancelScheduledValues(now);v.gain.gain.setTargetAtTime(0,now,.012);for(const s of v.sources)try{s.stop(now+.06);}catch{}}}
 }
 const api={events,Player};if(typeof module!=='undefined')module.exports=api;else root.DonutMix=api;
})(globalThis);
