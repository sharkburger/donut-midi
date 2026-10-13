const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(require.resolve('../library/p5.neon-addon.js'),'utf8');

test('p5 1.x installs a sketch method and disposes its trackers on remove',()=>{
  const removals=[];
  class P5 {}
  P5.prototype.registerMethod=(name,fn)=>{assert.equal(name,'remove');removals.push(fn);};
  class NeonP5 { constructor(){this.disposed=0;} dispose(){this.disposed++;} }
  vm.runInNewContext(source,{window:{p5:P5,NeonP5},Set,Error});
  const a=new P5(),b=new P5(),trackerA=a.createNeonTracker(),trackerB=b.createNeonTracker();
  assert.notEqual(trackerA,trackerB);
  removals[0].call(a);
  assert.equal(trackerA.disposed,1);assert.equal(trackerB.disposed,0);
});

test('p5 2 registers a native addon method and sketch-removal lifecycle',()=>{
  let addon;
  class P5 {}
  P5.registerAddon=fn=>{addon=fn;};
  class NeonP5 { constructor(){this.disposed=0;} dispose(){this.disposed++;} }
  vm.runInNewContext(source,{window:{p5:P5,NeonP5},Set,Error});
  const prototype={},lifecycles={};addon(P5,prototype,lifecycles);
  const sketch={...prototype},tracker=sketch.createNeonTracker();
  lifecycles.remove.call(sketch);
  assert.equal(tracker.disposed,1);
});
