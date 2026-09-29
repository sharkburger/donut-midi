/* Pure interaction logic shared by the browser and tests. */
(function(root){
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const ZONES = [
  {
    "id": 0,
    "x": 0.185,
    "y": 0.32,
    "r": 0.083,
    "name": "Original",
    "note": 60,
    "color": "#dfaf68"
  },
  {
    "id": 1,
    "x": 0.395,
    "y": 0.32,
    "r": 0.083,
    "name": "Chocolate",
    "note": 62,
    "color": "#715047"
  },
  {
    "id": 2,
    "x": 0.605,
    "y": 0.32,
    "r": 0.083,
    "name": "Strawberry",
    "note": 64,
    "color": "#dc8b96"
  },
  {
    "id": 3,
    "x": 0.815,
    "y": 0.32,
    "r": 0.083,
    "name": "Matcha",
    "note": 65,
    "color": "#8b9d69"
  },
  {
    "id": 4,
    "x": 0.185,
    "y": 0.65,
    "r": 0.083,
    "name": "Blueberry",
    "note": 67,
    "color": "#9181ae"
  },
  {
    "id": 5,
    "x": 0.395,
    "y": 0.65,
    "r": 0.083,
    "name": "Lemon",
    "note": 69,
    "color": "#ddc56b"
  },
  {
    "id": 6,
    "x": 0.605,
    "y": 0.65,
    "r": 0.083,
    "name": "Caramel",
    "note": 71,
    "color": "#bc8254"
  },
  {
    "id": 7,
    "x": 0.815,
    "y": 0.65,
    "r": 0.083,
    "name": "Vanilla",
    "note": 72,
    "color": "#e8d6b1"
  }
];
  function zoneAt(x,y,previous=-1){
    if(!finite(x)||!finite(y)||x<0||x>1||y<0||y>1)return -1;
    // Positions use a 1.5:1 mat; distance measured in horizontal units.
    const hit=z=>Math.hypot(x-z.x,(y-z.y)/1.5)<z.r+(z.id===previous?.014:0);
    const zone=ZONES.find(hit);return zone?zone.id:-1;
  }
  function pupil(s){
    if(!s||!s.worn)return null;
    const values=[s.pupilLeft,s.pupilRight].filter(x=>finite(x)&&x>=1&&x<=9);
    return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  }
  class Dwell {
    constructor(){this.reset()}
    reset(){this.zone=-1;this.since=0;this.fired=false;this.progress=0;}
    update(zone,time,threshold,enabled){
      if(!enabled||zone<0){this.reset();return false;}
      if(zone!==this.zone){this.zone=zone;this.since=time;this.fired=false;}
      this.progress=clamp((time-this.since)/threshold,0,1);
      if(this.progress>=1&&!this.fired){this.fired=true;return true;}return false;
    }
  }
  function validSample(s){return !!s&&finite(s.t)&&typeof s.worn==='boolean'&&typeof s.surfaceValid==='boolean'&&[s.x,s.y,s.pupilLeft,s.pupilRight].every(v=>v===null||finite(v));}
  function parseRecording(data){
    if(!data||data.schema!=='donut-song/1'||!Array.isArray(data.samples)||!data.samples.length)throw Error('Choose a Donut MIDI / Donut Song JSON export containing samples.');
    if(data.samples.length>108000)throw Error('File exceeds the one-hour replay limit.');
    if(data.samples.some(s=>Array.isArray(s.consumed)&&s.consumed.length!==ZONES.length))throw Error('This recording uses another mat layout. Replay it with the matching older version.');
    let prev=-1;
    for(const s of data.samples){
      if(!validSample(s)||s.t<prev||s.t<0||s.t>3600000||!['prepare','look','taste','after','end'].includes(s.phase)||!Array.isArray(s.consumed)||s.consumed.length!==ZONES.length||!s.consumed.every(v=>typeof v==='boolean')||!finite(s.baseline)||s.baseline<1||s.baseline>9)throw Error('Invalid replay data or timestamp order.');
      prev=s.t;
    }
    return data;
  }
  const api={finite,clamp,ZONES,zoneAt,pupil,Dwell,parseRecording};
  if(typeof module!=='undefined')module.exports=api; else root.DonutCore=api;
})(typeof window!=='undefined'?window:globalThis);
