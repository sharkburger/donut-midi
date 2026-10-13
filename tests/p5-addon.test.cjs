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

test('p5 controls mount without depending on an undeclared global canvas',()=>{
  class P5 {}
  P5.prototype.registerMethod=()=>{};
  class NeonP5 {
    dispose(){}
    useMouse(){}
    connect(){}
    on(){return ()=>{};}
  }
  const body={children:[],appendChild(element){this.children.push(element);}};
  const document={body,querySelector(){return null;},createElement(){return {
    style:{},children:[],append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},
    setAttribute(){},addEventListener(){},remove(){}
  };}};
  const window={p5:P5,NeonP5,document};
  vm.runInNewContext(source,{window,Set,Error,AbortController});
  const sketch=new P5();
  const tracker=sketch.createNeonTracker();
  const controls=sketch.createNeonControls(tracker);
  assert.equal(body.children[0],controls.element);
  assert.equal(controls.element.className,'p5-neon-controls');
});
