const {test}=require('node:test');
const assert=require('node:assert/strict');
const {NeonMat}=require('../library/p5.neon-surface.js');

test('NeonMat asynchronously loads its reusable image and fits the mat aspect',async()=>{
 const calls=[];const p={width:900,height:600,loadImage:(url,success)=>{const image={url};success(image);return image;},push(){},pop(){},noStroke(){},fill(){},rect(...v){calls.push(['rect',...v]);},image(...v){calls.push(['image',...v]);}};
 const mat=new NeonMat(p,{imageUrl:'/marker-mat.svg',aspect:1.5});assert.equal((await mat.load()).url,'/marker-mat.svg');
 assert.deepEqual(mat.draw(),{x:0,y:0,width:900,height:600});assert.deepEqual(calls[1].slice(1),[{url:'/marker-mat.svg'},0,0,900,600]);
 assert.deepEqual(mat.draw(0,0,600,600),{x:0,y:100,width:600,height:400});
 assert.throws(()=>mat.draw(0,0,0,600));
});

test('blank marker mat asset has the same four AprilTag patterns as the established mat',()=>{
 const fs=require('node:fs');const root=fs.readFileSync('markers.svg','utf8');const copy=fs.readFileSync('library/assets/blank-marker-mat.svg','utf8');
 const black=s=>[...s.matchAll(/<rect x="(\d+)" y="(\d+)" width="15" height="15" fill="black"\/>/g)].map(m=>m[0]);
 assert.deepEqual(black(copy),black(root));assert.match(copy,/width="420mm" height="280mm"/);
});
