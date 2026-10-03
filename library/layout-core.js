/* One layout for the preview, AOIs and printed physical mat. */
(function(root){
 const colors=['#d9ad67','#705448','#d48799','#8b9d69','#9584b2','#dfc76c','#bc8957','#e7d7b2'];
 const defaults=()=>({widthCm:60,physical:false,donuts:['Original','Chocolate','Strawberry','Matcha','Blueberry','Lemon','Caramel','Vanilla'].map((name,i)=>({id:'donut-'+(i+1),name,x:[.185,.395,.605,.815][i%4],y:i<4?.32:.65,r:.07,note:[60,62,64,65,67,69,71,72][i],color:colors[i]}))});
 function validate(value){
  const v=JSON.parse(JSON.stringify(value));
  if(!Number.isFinite(v.widthCm)||v.widthCm<30||v.widthCm>120)throw Error('Mat width must be 30–120 cm. Height is always width × 2/3.');
  if(typeof v.physical!=='boolean'||!Array.isArray(v.donuts)||v.donuts.length!==8)throw Error('Use eight donuts and a physical true/false setting.');
  const ids=new Set();
  for(const d of v.donuts){
   if(typeof d.id!=='string'||!d.id||ids.has(d.id))throw Error('Each donut needs a unique ID.');ids.add(d.id);
   if(typeof d.name!=='string'||!d.name.trim()||d.name.length>40)throw Error('Use a name of 1–40 characters.');
   if(![d.x,d.y,d.r].every(Number.isFinite)||d.r<.025||d.r>.12||d.x-d.r<.025||d.x+d.r>.975||d.y-d.r*1.5<.20||d.y+d.r*1.5>.80)throw Error(d.name+': keep the whole donut inside the central area, away from the four markers.');
   if(!Number.isInteger(d.note)||d.note<36||d.note>96)throw Error(d.name+': MIDI note must be an integer from 36 to 96.');
   if(!/^#[0-9a-f]{6}$/i.test(d.color))throw Error('Use a six-digit hex color.');
  }
  for(let i=0;i<v.donuts.length;i++)for(let j=i+1;j<v.donuts.length;j++){
   const a=v.donuts[i],b=v.donuts[j];
   if(Math.abs(a.x-b.x)<a.r+b.r&&Math.abs(a.y-b.y)<(a.r+b.r)*1.5)throw Error(a.name+' and '+b.name+': their trigger areas overlap. Move them apart.');
  }
  return v;
 }
 const pattern=/\/\/ DONUT_LAYOUT_START\s*const DONUT_LAYOUT = ([\s\S]*?);\s*\/\/ DONUT_LAYOUT_END/;
 function read(code){const m=code.match(pattern);if(!m)throw Error('Load the Physical donuts template first. Your existing sketch is preserved until you choose Load template.');return validate(JSON.parse(m[1]));}
 function write(code,value){read(code);return code.replace(pattern,()=>block(value));}
 function block(value){return '// DONUT_LAYOUT_START\nconst DONUT_LAYOUT = '+JSON.stringify(validate(value),null,2)+';\n// DONUT_LAYOUT_END';}
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function svg(value,markers){
  const v=validate(value),w=v.widthCm*10,h=w*2/3;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="white"/>${markers}<g font-family="Arial,sans-serif" text-anchor="middle" fill="#342e28"><text x="600" y="90" font-size="25">DONUT MIDI · PHYSICAL SCORE</text><text x="600" y="125" font-size="15">${v.widthCm} × ${(v.widthCm*2/3).toFixed(1)} cm · Print at 100% / actual size</text>`;
  for(const [i,d] of v.donuts.entries()){
   const x=d.x*1200,y=d.y*800,r=d.r*1200;
   out+=`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#888" stroke-width="2"/><path d="M ${x-8} ${y} h 16 M ${x} ${y-8} v 16" stroke="#888"/><text x="${x}" y="${y-8}" font-size="15">${i+1} · ${esc(d.name)}</text><text x="${x}" y="${y+20}" font-size="13">MIDI ${d.note}</text>`;
  }
  // The bar is exactly 10 cm at the requested output size.
  const bar=1200*10/v.widthCm;
  out+=`<path d="M ${600-bar/2} 716 v 12 m 0 -6 h ${bar} m 0 -6 v 12" fill="none" stroke="black" stroke-width="2"/><text x="600" y="750" font-size="14">Check this line = 10 cm · Keep tags flat, visible and in this orientation</text></g></svg>`;return out;
 }
 const api={defaults,validate,read,write,block,svg};if(typeof module!=='undefined')module.exports=api;else root.DonutLayout=api;
})(typeof window!=='undefined'?window:globalThis);
