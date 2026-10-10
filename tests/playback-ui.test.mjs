import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadEngine} from '../debug/engine-loader.mjs';

const html=readFileSync(new URL('../water-resilience-p0.html',import.meta.url),'utf8');
const app=html.slice(html.indexOf('// ui/app.js'));
const playHandler=app.match(/\$\('play'\)\.addEventListener\('click',\(\)=>\{[^\n]*\}\);/)[0];
const animation=app.slice(app.indexOf('let previous=performance.now();'),app.indexOf("loadScenario('ordinary');updateTool();requestAnimationFrame(animate);"));

function harness(){
 const a=loadEngine(),listeners={},queue=[];
 const context=vm.createContext({...a,round:a.createRound(),sim:a.createSimulation('A'),speed:1,
  performance:{now:()=>context.clock},clock:100,draw:()=>{},
  $:id=>({addEventListener:(event,handler)=>{listeners[id+':'+event]=handler;}}),
  document:{addEventListener:(event,handler)=>{listeners[event]=handler;}},
  requestAnimationFrame:callback=>queue.push(callback)});
 vm.runInContext(animation+'\n'+playHandler,context);
 return {context,listeners,queue,frame:time=>vm.runInContext(`animate(${time})`,context)};
}

for(const trigger of ['initial load','start click','resume click','visibility change']){
 test(`animation survives an older frame timestamp after ${trigger}`,()=>{
  const h=harness();
  if(trigger==='start click'||trigger==='resume click'){
   h.context.clock=105;
   if(trigger==='resume click')h.context.round.state='paused';
   h.listeners['play:click']();
  }else if(trigger==='visibility change'){
   h.context.startRound(h.context.round);h.context.clock=105;h.listeners.visibilitychange();
  }
  // rAF timestamps denote the start of the frame, earlier than performance.now()
  // sampled by initialization or an input event within that same frame.
  assert.doesNotThrow(()=>h.frame(95));
  assert.equal(h.queue.length,1,'the animation must request its next frame');
  assert.equal(h.context.round.tick,0,'stale frame time cannot advance water');
  if(trigger==='initial load'){h.context.clock=110;h.listeners['play:click']();}
  h.queue.shift()(700);
  assert.ok(h.context.round.tick>0,'the started simulation really advances');
  assert.equal(h.queue.length,1,'the animation loop remains alive');
 });
}
