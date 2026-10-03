// @neon-template: asset
// Dwell to reveal an image
// Editor supplies neon + MAT_URL. Copy project code includes the setup declarations.
// Load p5.js, p5.neon.js and p5.neon-effects.js before this sketch.
const COLOR = '#008d95'; // Try your own palette.
new p5(p => {
 let mat;
 const ASSET_URL = ''; // Use Replace image in the editor, or set your own asset URL in a standalone project.
 let artwork=null,revealed=false;
 const HOLD_MS=600;
 p.preload = () => { mat = p.loadImage(MAT_URL); };
 p.setup = () => {
  NeonEffects.canvas(p, neon);
  neon.setRegions([{id:'reveal',x:.3,y:.28,width:.4,height:.4,dwellMs:HOLD_MS}]);
  if(ASSET_URL)p.loadImage(ASSET_URL,img=>artwork=img,()=>console.log('Image could not load'));
  neon.on('dwell',()=>revealed=!revealed);
 };
 p.draw = () => {
  const gaze = neon.update(), g = NeonEffects.inside(gaze);
  NeonEffects.begin(p, mat, neon.mode === 'live' ? 'LIVE NEON · Dwell to reveal an image' : 'MOUSE SIMULATION · Dwell to reveal an image');
  NeonEffects.clip(p,()=>{
   NeonEffects.boxes(p,neon);
   if(revealed){if(artwork){const w=p.width*.34,h=p.height*.30,k=Math.min(w/artwork.width,h/artwork.height);p.image(artwork,p.width*.5-artwork.width*k/2,p.height*.48-artwork.height*k/2,artwork.width*k,artwork.height*k);}else{p.noStroke();p.fill('#e8ae48');p.circle(p.width*.5,p.height*.48,90);p.fill('#342e28');p.textAlign(p.CENTER);p.text('Your image here',p.width*.5,p.height*.49);}}
   NeonEffects.dot(p,g,COLOR);
  });
  NeonEffects.label(p,'Hold to toggle · leave and return · replace the image above');
 };
 p.windowResized = () => NeonEffects.resize(p);
});
