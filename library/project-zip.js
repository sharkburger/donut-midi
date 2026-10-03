/* Minimal uncompressed ZIP writer. Local project files only; no credentials. */
(function(root){
 const enc=new TextEncoder();
 function crc32(a){let c=0xffffffff;for(const v of a){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
 function zip(files){const locals=[],central=[];let offset=0;
  for(const [name,value] of Object.entries(files)){
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..'))throw Error('Invalid archive path');
   const n=enc.encode(name),data=typeof value==='string'?enc.encode(value):new Uint8Array(value),crc=crc32(data);
   const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);h.set(n,30);locals.push(h,data);
   const c=new Uint8Array(46+n.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);c.set(n,46);central.push(c);offset+=h.length+data.length;
  }
  const size=central.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...locals,...central,end],{type:'application/zip'});
 }
 if(typeof module!=='undefined')module.exports={zip,crc32};else root.NeonProjectZip={zip};
})(typeof window!=='undefined'?window:globalThis);
