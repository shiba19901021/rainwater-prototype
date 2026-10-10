import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync('water-resilience-p0.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const engine=script.slice(script.indexOf('// config/facilities.js'),script.indexOf('// ui/renderer.js'));
const context=vm.createContext({});
vm.runInContext(engine+';globalThis.api={createSimulation,step,placeFacility,waterInventory,resetWater,capacity,status,mapData,F,B,weatherConfig};',context);
const a=context.api;
const results={};
for(const key of ['ordinary','A','B','C','D']){
 const s=a.createSimulation(key);for(let i=0;i<16;i++)a.step(s,.72);
 results[key]={ponding:s.stats.ponding,flooding:s.stats.flooding,outlet:s.stats.outlet};
}
const e=a.createSimulation('E');const stages=[];
for(const [rain,ticks] of [[.72,16],[0,12],[.72,40],[0,12],[.72,60]]){
 for(let i=0;i<ticks;i++)a.step(e,rain);
 if(rain)stages.push({flooding:e.stats.flooding,wet:e.stats.wet});
}
const s=a.createSimulation('D');for(let i=0;i<400;i++)a.step(s,.72);
const before=a.waterInventory(s);a.placeFacility(s,17,'empty');
const replacementError=a.waterInventory(s)-before;
const conservationError=s.totals.rain-a.waterInventory(s)-s.totals.outflow;
const wetBefore=a.waterInventory(s);for(let i=0;i<1000;i++)a.step(s,0);
assert.deepEqual(Object.values(results).map(r=>[r.ponding,r.flooding]),[[13,8],[16,12],[1,0],[16,12],[16,10]]);
assert.deepEqual(stages.map(r=>r.flooding),[0,11,15]);
assert.ok(Math.abs(replacementError)<1e-9);
assert.ok(Math.abs(conservationError)<1e-6);
assert.ok(a.waterInventory(s)<wetBefore);
for(const c of a.mapData){
 const visited=new Set();let next=c;
 while(next.flowTo!==null){assert.ok(!visited.has(next.id));visited.add(next.id);const target=a.mapData[next.flowTo];assert.ok(target.elevation<next.elevation);next=target;}
}
const delay=a.createSimulation('blank');delay.cells[6].surface=20;a.step(delay,0);
assert.ok(delay.cells[18].surface>0);assert.equal(delay.cells[30].surface,0);
assert.equal(a.placeFacility(delay,6,'forest'),false);
assert.throws(()=>a.step(delay,-1));
a.resetWater(delay);assert.equal(a.waterInventory(delay),0);assert.equal(delay.tick,0);
console.log(JSON.stringify({results,stages,replacementError,conservationError,wetBefore,wetAfter:a.waterInventory(s),riverSpill:s.stats.riverSpill},null,2));
