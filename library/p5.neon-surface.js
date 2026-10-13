/* p5.neon-surface.js 0.3.0 — reusable four-marker surface display. */
(function(root){
  'use strict';
  class NeonMat{
    constructor(p,{imageUrl,aspect=1.5,background='#fffdf8'}={}){
      if(!p)throw Error('Pass the p5 instance (use `this` in global mode).');
      if(!Number.isFinite(aspect)||aspect<=0)throw Error('Surface aspect must be a positive number.');
      this.p=p;this.imageUrl=imageUrl;this.aspect=aspect;this.background=background;this.image=null;
    }
    load(){
      if(!this.imageUrl)throw Error('Provide the reusable marker mat image URL.');
      if(typeof this.p.loadImage!=='function')throw Error('The p5 instance must provide loadImage().');
      this.image=this.p.loadImage(this.imageUrl);return this.image;
    }
    draw(x=0,y=0,w=this.p.width,h=this.p.height){
      if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Mat bounds must have finite coordinates and positive size.');
      const p=this.p,fit=Math.min(w,h*this.aspect),drawW=fit,drawH=fit/this.aspect,left=x+(w-drawW)/2,top=y+(h-drawH)/2;
      p.push();p.noStroke();p.fill(this.background);p.rect(x,y,w,h);
      if(this.image)p.image(this.image,left,top,drawW,drawH);
      p.pop();
      return {x:left,y:top,width:drawW,height:drawH};
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={NeonMat};else root.NeonMat=NeonMat;
})(typeof window!=='undefined'?window:globalThis);
