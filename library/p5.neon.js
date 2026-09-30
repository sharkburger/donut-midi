/* p5.neon 0.2.0 — MIT. Load connector-client.js first for live Neon input. */
(function(root){
  'use strict';
  class Neon {
    constructor({clock=()=>performance.now(),clientFactory,maxAge=500}={}) {
      this.clock=clock;this.maxAge=maxAge;this.clientFactory=clientFactory;
      this.mode='disconnected';this.sample=null;this.received=-Infinity;
      this.regions=[];this.listeners=new Map();this.active=null;this.entered=0;this.fired=false;
      this.client=null;this.generation=0;this.detach=null;this.simInside=false;
    }
    on(event,fn){if(typeof fn!=='function')throw Error('Listener must be a function.');if(!this.listeners.has(event))this.listeners.set(event,new Set());this.listeners.get(event).add(fn);return ()=>this.listeners.get(event)?.delete(fn);}
    emit(event,value){for(const fn of this.listeners.get(event)||[])fn(value);}
    get gaze(){const s=this.sample;if(!s||this.clock()-this.received>=this.maxAge||!s.worn||!s.surfaceValid||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<0||s.x>1||s.y<0||s.y>1)return null;return {x:s.x,y:s.y};}
    get pupil(){if(!this.gaze)return null;const values=[this.sample.pupilLeft,this.sample.pupilRight].filter(v=>Number.isFinite(v)&&v>0);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
    get progress(){return this.active?Math.min(1,(this.clock()-this.entered)/this.active.dwellMs):0;}
    accept(sample,age=0){if(this.sample&&this.clock()-this.received>=this.maxAge)this.resetDwell();this.sample={...sample};this.received=this.clock()-age;if(!this.gaze)this.resetDwell();this.emit('sample',this.sample);}
    async connect({code,port=8766}={}){
      this.disconnect();const generation=this.generation;
      const Factory=this.clientFactory||((options)=>new root.NeonConnectorClient(options));
      if(!this.clientFactory&&!root.NeonConnectorClient)throw Error('Load connector-client.js before p5.neon.js.');
      this.mode='live';
      this.client=Factory({sample:(s,age)=>{if(generation===this.generation)this.accept(s,age);},status:(message)=>{if(generation===this.generation)this.emit('status',message);},lost:(message)=>{if(generation!==this.generation)return;this.disconnect();this.emit('error',message);}});
      try{await this.client.start(code,Number(port));}catch(error){if(generation===this.generation)this.disconnect();throw error;}
    }
    disconnect(){this.generation++;this.client?.stop();this.client=null;this.detach?.();this.detach=null;this.simInside=false;this.sample=null;this.received=-Infinity;this.mode='disconnected';this.resetDwell();}
    useMouse(canvas){
      this.disconnect();const element=canvas?.elt||canvas;if(!element?.addEventListener)throw Error('Pass a p5 renderer or canvas element.');this.mode='mouse';
      const move=e=>{const r=element.getBoundingClientRect();this.simInside=true;this.accept({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,worn:true,surfaceValid:true,pupilLeft:null,pupilRight:null,source:'mouse'});};
      const leave=()=>{this.simInside=false;this.sample=null;this.resetDwell();};
      const visibility=()=>{if(document.hidden)leave();};
      element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility);
      this.detach=()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);};
    }
    setRegions(regions){
      const ids=new Set();const validated=regions.map(r=>{
        if(!r.id||ids.has(r.id))throw Error('Every AOI needs a unique nonempty id.');ids.add(r.id);
        const dwellMs=r.dwellMs??500;if(!Number.isFinite(dwellMs)||dwellMs<=0)throw Error('dwellMs must be positive.');
        if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0||r.x<0||r.y<0||r.x+r.width>1||r.y+r.height>1)throw Error('AOIs use normalized rectangular bounds within 0–1.');
        return {...r,dwellMs};
      });this.resetDwell();this.regions=validated;return this;
    }
    resetDwell(){const previous=this.active;this.active=null;this.fired=false;this.entered=0;if(previous)this.emit('exit',{region:previous});}
    update(){
      if(this.mode==='mouse'&&this.simInside&&this.sample)this.received=this.clock();
      const gaze=this.gaze;
      const region=gaze?this.regions.find(r=>gaze.x>=r.x&&gaze.x<=r.x+r.width&&gaze.y>=r.y&&gaze.y<=r.y+r.height):null;
      if(region?.id!==this.active?.id){this.resetDwell();if(region){this.active=region;this.entered=this.clock();this.emit('enter',{region,gaze});}}
      if(this.active&&!this.fired&&this.progress>=1){this.fired=true;this.emit('dwell',{region:this.active,gaze});}
      return gaze;
    }
    dispose(){this.disconnect();this.listeners.clear();}
  }
  Neon.VERSION='0.2.0';
  if(typeof module!=='undefined'&&module.exports)module.exports={Neon};else root.NeonP5=Neon;
})(globalThis);
