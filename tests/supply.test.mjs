import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadEngine} from '../debug/engine-loader.mjs';
import {runWaterCase,compareFlood} from '../debug/supply-experiments.mjs';

test('P0 routing remains identical except the explicitly bounded opening-reserve guard',()=>{
 const old=loadEngine(new URL('../checkpoints/prototype-0.5/water-resilience-p0.html',import.meta.url)),a=loadEngine();
 for(const key of Object.keys(old.B))assert.equal(a.B[key],old.B[key]);
 assert.equal(JSON.stringify(a.mapData),JSON.stringify(old.mapData));
 const extract=(h,name)=>h.slice(h.indexOf('function '+name+'(s,rainfallIntensity)'),h.indexOf('// ui/renderer.js')).trim();
 const before=readFileSync(new URL('../checkpoints/prototype-0.5/water-resilience-p0.html',import.meta.url),'utf8');
 const current=readFileSync(new URL('../water-resilience-p0.html',import.meta.url),'utf8');
 const oldStep=extract(before,'step');
 const start=current.indexOf('function hydrologyStep(s,rainfallIntensity)');
 const newStep=current.slice(start,current.indexOf('// engine/city-water.js')).trim().replace('function hydrologyStep(','function step(')
  .replace(/      \/\/ Opening supply stock[\s\S]*?const protectedStock=[^\n]*;\r?\n/,'')
  .replace('Math.max(0,c.storage-protectedStock)','c.storage');
 const withoutTrace=newStep.replace(/      if\(s.flowTrace&&accepted>0\)s.flowTrace.push\([^\n]*\);\r?\n/,'');
 assert.equal(withoutTrace,oldStep);
});
test('demand is distinct from runoff and persists through no-rain and industrial shortage',()=>{
 const a=loadEngine(),s=a.createSimulation('A');
 const demand=s.supply.demand;a.F.industrial.runoff=0;a.F.residential.runoff=0;
 for(let i=0;i<240;i++)a.step(s,0);
 assert.equal(s.supply.demand,demand);assert.ok(s.supply.shortage>0);
 assert.ok(s.cells.some(c=>c.facility==='industrial'&&c.waterShortage>=a.S.severeShortage));
});
test('municipal supply declines continuously, recovers with rain and imported water is accounted',()=>{
 const a=loadEngine(),s=a.createSimulation('A');let last=1;
 for(let i=0;i<80;i++){a.step(s,0);assert.ok(s.supply.municipalSupplyLevel<=last);assert.ok(last-s.supply.municipalSupplyLevel<=a.S.municipalDroughtDecay+1e-12);last=s.supply.municipalSupplyLevel;}
 a.step(s,.38);assert.ok(s.supply.municipalSupplyLevel>last);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);
});
test('full external supply never consumes reservoir backup',()=>{
 const a=loadEngine(),s=a.createSimulation('W3');a.step(s,.38);
 assert.equal(s.supply.reservoir,0);assert.equal(s.supply.shortage,0);
});
test('trace rain accumulates drought more slowly; effective light rain relieves it',()=>{
 const a=loadEngine(),light=a.createSimulation('W2'),dry=a.createSimulation('W2');
 for(let i=0;i<400;i++){a.step(light,.06);a.step(dry,0);}
 assert.ok(light.supply.dryTicks>0);assert.ok(light.supply.shortage>0);
 assert.ok(light.supply.droughtStress<dry.supply.droughtStress);
 assert.equal(dry.supply.municipalSupplyLevel,0);
 const l=a.createSimulation('W2'),d=a.createSimulation('W2');
 for(let i=0;i<20;i++){a.step(l,.12);a.step(d,0);}
 assert.ok(l.supply.droughtStress<d.supply.droughtStress);
});
test('intake is legal only on buildable adjacent land',()=>{
 const a=loadEngine(),s=a.createSimulation('A');
 assert.equal(a.placeFacility(s,0,'intake'),false);assert.equal(a.placeFacility(s,6,'intake'),false);
 assert.equal(a.placeFacility(s,5,'intake'),true);assert.equal(a.placeFacility(s,7,'intake'),true);
});
test('shared river intakes withdraw real water fairly and preserve safe minimum',()=>{
 const a=loadEngine(),s=a.createSimulation('A',{initialState:'empty'});a.B.riverFlowFraction=0;
 a.placeFacility(s,5,'intake');a.placeFacility(s,7,'intake');s.cells[6].surface=8;
 s.supply.municipalSupplyLevel=0;a.step(s,0);
 assert.ok(s.supply.river>0);assert.equal(s.cells[5].lastIntake,s.cells[7].lastIntake);
 assert.ok(s.cells[6].surface>=a.S.riverMinimumIntakeLevel);assert.ok(Math.abs(a.supplyMassError(s)-8)<1e-7); // Explicit test seed, outside the rainfall ledger.
 const low=a.createSimulation('A',{initialState:'empty'});a.placeFacility(low,5,'intake');low.cells[6].surface=4;low.supply.municipalSupplyLevel=0;a.step(low,0);
 assert.equal(low.supply.river,0);assert.equal(low.cells[5].intakeBlocked,true);
});
test('no intake means river water is never used by the city',()=>{
 const a=loadEngine(),s=a.createSimulation('W2');for(let i=0;i<100;i++){a.step(s,0);assert.equal(s.supply.river,0);}
});
test('source priority is configurable and backup draws only the remaining deficit',()=>{
 const a=loadEngine(),s=a.createSimulation('W5');a.S.sourcePriority=['reservoir','municipal','river'];
 a.step(s,0);assert.ok(s.supply.reservoir>0);assert.equal(s.supply.river,0);
 assert.ok(s.supply.served<=s.supply.demand+1e-10);
});
test('W1-W5 demonstrate lower demand, finite storage, actual intake and combined backup',()=>{
 const runs=Object.fromEntries(['W1','W2','W3','W4','W5'].map(k=>[k,runWaterCase(k).result]));
 assert.ok(runs.W1.firstShortage>runs.W2.firstShortage);
 assert.ok(runs.W3.firstShortage>runs.W2.firstShortage*1.2);
 // Fixed finite baseflow may leave the map before the new grace period ends.
 assert.ok(runs.W4.firstShortage>=runs.W2.firstShortage);
 assert.ok(runs.W5.firstShortage>=runs.W3.firstShortage);
 for(const r of Object.values(runs)){assert.equal(r.finalStatus,'危急');assert.ok(r.maxMassError<1e-7);}
 assert.ok(runs.W3.storageEmpty);assert.ok(runs.W5.storageEmpty);
});
test('W6 recovers after drought, refills storage and later encounters flooding',()=>{
 const {result,rows}=runWaterCase('W6');assert.ok(result.firstShortage<result.recovered);
 assert.ok(result.recovered<result.floodAfterRecovery);
 assert.ok(rows.some(r=>r.time>result.storageEmpty&&r.reserve>300));
 assert.ok(result.maxMassError<1e-7);
});
test('all 12 flood regressions preserve peak flooded footprint and conserve water',()=>{
 for(const r of compareFlood()){assert.equal(r.afterPeak,r.beforePeak);assert.ok(r.massError<1e-7);assert.ok(Math.abs(r.afterRiver-r.beforeRiver)<.01);}
});
test('reset clears supply pressure and both ledgers; replacing a full basin preserves water',()=>{
 const a=loadEngine(),s=a.createSimulation('W3');const water=a.waterInventory(s);
 assert.ok(a.placeFacility(s,17,'residential'));assert.equal(a.waterInventory(s),water);
 a.resetWater(s);assert.equal(a.waterInventory(s),s.totals.initialWater);assert.equal(s.supply.municipalSupplyLevel,1);
 assert.equal(s.totals.cityUse,0);assert.equal(s.totals.municipalInput,0);assert.equal(a.supplyMassError(s),0);
});
