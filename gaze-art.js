/* Decorative gaze history only: never a fixation detector or sound trigger. */
(function(root){
 class GazeArt {
  constructor(random=Math.random){this.random=random;this.clear();}
  clear(){this.points=[];this.particles=[];this.ripples=[];this.last=null;}
  update(now,s,valid,reduced=false){
   if(!valid||!s||![s.x,s.y].every(Number.isFinite)||s.x<0||s.x>1||s.y<0||s.y>1){this.clear();return;}
   if(this.last&&now-this.last.time>500)this.clear();
   const moved=!this.last||Math.hypot(s.x-this.last.x,s.y-this.last.y)>.002;
   if(moved&&!reduced){this.points.push({x:s.x,y:s.y,time:now});for(let i=0;i<3;i++)this.particles.push({x:s.x,y:s.y,vx:(this.random()-.5)*.045,vy:(this.random()-.5)*.045,time:now});}
   this.last={x:s.x,y:s.y,time:now};this.points=this.points.filter(p=>now-p.time<650).slice(-70);this.particles=this.particles.filter(p=>now-p.time<700).slice(-160);this.ripples=this.ripples.filter(p=>now-p.time<850).slice(-8);
   if(reduced){this.points=[];this.particles=[];this.ripples=[];}
  }
  hit(now,zone){if(this.last&&now-this.last.time<500)this.ripples.push({time:now,zone});}
 }
 if(typeof module!=='undefined')module.exports={GazeArt};else root.GazeArt=GazeArt;
})(globalThis);
