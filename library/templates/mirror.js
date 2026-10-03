// @neon-template: mirror
// Gaze pixel mirror — inspired by Daniel Rozin's Wooden Mirror (1999).
// https://www.smoothware.com/danny/woodenmirrormov.html
// The editor supplies neon, MAT_URL and DEFAULT_IMAGE_URL. Export includes them.
const ASSET_URL = ''; // Replace image embeds your PNG/JPEG/WebP here. Empty = donut.
const SPEED_MS = 190; // Lower = faster hinge motion.
const RETURN_MS = 650; // How long tiles stay turned after the gaze leaves.
new p5(p => {
 let mat, artwork, density, brush, currentColumns=36, status='';
 const mirror=new NeonEffects.PixelMirror({columns:36,radius:2.4,speedMs:SPEED_MS,returnMs:RETURN_MS});
 p.preload=()=>{
  mat=p.loadImage(MAT_URL);
  artwork=p.loadImage(ASSET_URL||DEFAULT_IMAGE_URL,()=>{},()=>{status='Image could not load · use Replace image';});
 };
 p.setup=()=>{
  NeonEffects.canvas(p,neon);
  p.createSpan('Pixel density').position(12,36);
  p.createSpan('Flip radius').position(150,36);
  density=p.createSlider(16,64,36,1);density.position(8,10);density.style('width','120px');density.attribute('aria-label','Pixel density');
  brush=p.createSlider(1,5,2.4,.2);brush.position(146,10);brush.style('width','110px');brush.attribute('aria-label','Flip radius');
  const reset=p.createButton('Reset tiles');reset.position(272,0);reset.mousePressed(()=>mirror.reset());
  mirror.setImage(artwork);
 };
 p.draw=()=>{
  const gaze=neon.update(),columns=Number(density.value());
  if(columns!==currentColumns){currentColumns=columns;mirror.columns=columns;mirror.setImage(artwork);}
  mirror.radius=Number(brush.value());mirror.update(gaze,p.millis());
  NeonEffects.begin(p,mat,(neon.mode==='live'?'LIVE NEON':'MOUSE SIMULATION')+' · Gaze pixel mirror');
  NeonEffects.clip(p,()=>mirror.draw(p));
  p.push();p.fill('#342e28');p.noStroke();p.textSize(10);p.textAlign(p.CENTER);
  p.text(columns+' columns · flip radius '+mirror.radius.toFixed(1)+' tiles',p.width/2,p.height*.155);
  p.text(status||'Look to flip · look away to restore · replace image above',p.width/2,p.height*.79);p.pop();
 };
 p.windowResized=()=>NeonEffects.resize(p);
});
