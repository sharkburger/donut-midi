/* Latest-sample polling; credentials never go to the remote website server. */
(function(root){
 class NeonConnectorClient{
  constructor({fetch:fetcher=globalThis.fetch.bind(globalThis),clock=()=>performance.now(),sample:receive,status=()=>{},lost=()=>{},metadata=()=>{}}){this.fetcher=fetcher;this.clock=clock;this.receive=receive;this.status=status;this.lost=lost;this.metadata=metadata;this.credentials=null;this.generation=0;this.abort=null;this.timer=null;}
  stop(){this.credentials=null;this.generation++;this.abort?.abort();clearTimeout(this.timer);this.abort=null;this.timer=null;}
  async request(path,body){
   if(!['devices','devices/scan','devices/select','devices/forget'].includes(path))throw Error('Unsupported connector request.');
   const auth=this.credentials,generation=this.generation;if(!auth)throw Error('Pair this computer first.');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const res=await this.fetcher(`http://127.0.0.1:${auth.port}/${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+auth.token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:controller.signal,targetAddressSpace:'loopback'});
    const data=await res.json();if(generation!==this.generation)throw Error('Connection changed. Retry with the current pairing.');
    if(!res.ok)throw Error(data.error||`Connector request failed (${res.status}).`);return data;
   }finally{clearTimeout(timer);}
  }
  async start(token,port=8766){
   this.stop();
   if(!/^[A-Za-z0-9_-]{32,128}$/.test(token))throw Error('Paste the pairing code shown by your connector.');
   if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use a local port from 1024 to 65535.');
   this.credentials={token,port};
   const generation=this.generation;let sequence=-1;let first=true;
   const poll=async()=>{
    if(generation!==this.generation)return;
    const controller=new AbortController();this.abort=controller;
    const timeout=setTimeout(()=>controller.abort(),2500);const sent=this.clock();
    try{
     const res=await this.fetcher(`http://127.0.0.1:${port}/${first?'health':'sample?since='+sequence}`,{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit',signal:controller.signal,targetAddressSpace:'loopback'});
     if(!res.ok)throw Error(res.status===401?'Pairing code expired or incorrect. Reopen the link from the connector.':`Connector request failed (${res.status}).`);
     const data=await res.json();if(generation!==this.generation)return;
     if(data.connector!=='donut-midi')throw Error('This is not a Donut MIDI connector.');
     this.status(data.status,first);this.metadata(data,first);
     if(!first&&data.sample&&data.sequence!==sequence){
      sequence=data.sequence;
      const age=data.sampleAgeMs,elapsed=this.clock()-sent,s=data.sample;
      if(Number.isFinite(age)&&age>=0&&age+elapsed<500&&s.source==='neon'&&typeof s.worn==='boolean'&&typeof s.surfaceValid==='boolean'&&['x','y','pupilLeft','pupilRight'].every(k=>s[k]===null||Number.isFinite(s[k]))){this.receive(s,age+elapsed);}
     }
     first=false;this.timer=setTimeout(poll,33);
    }catch(e){if(generation!==this.generation)return;this.stop();this.lost(e.name==='AbortError'?'Connector timed out. Check that it is still running.':e.message);}
    finally{clearTimeout(timeout);}
   };
   await poll();
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={NeonConnectorClient};else root.NeonConnectorClient=NeonConnectorClient;
})(globalThis);
