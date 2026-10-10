import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine} from '../debug/engine-loader.mjs';
import {runWetlandCase} from '../debug/wetland-experiments.mjs';
const engine=()=>loadEngine(undefined,{pollutionEnabled:true});
const seed=(s,id,load)=>{s.cells.find(c=>c.id===id).pollutionLoad+=load;s.pollution.totals.pollutionGenerated+=load;};
const pulse=(a,s,load=6)=>{seed(s,6,load);s.flowTrace=[{from:6,to:18,amount:10}];a.transportPollution(s,Float64Array.from(s.cells.map(c=>30)));};
test('standing pollution is never repeatedly washed; only new accepted flow is eligible',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,17,'wetland');seed(s,18,100);
 for(let i=0;i<5;i++)a.purifyPollution(s);
 assert.equal(s.pollution.totals.pollutionPurified,0);assert.equal(s.cells[18].pollutionLoad,100);
 pulse(a,s);a.purifyPollution(s);assert.ok(Math.abs(s.cells[17].lastPurified-2*a.P.wetlandPurificationRate)<1e-12);
 const first=s.pollution.totals.pollutionPurified;a.purifyPollution(s);assert.equal(s.pollution.totals.pollutionPurified,first);
 s.flowTrace=[];a.transportPollution(s,new Float64Array(120).fill(30));a.purifyPollution(s);
 assert.equal(s.pollution.totals.pollutionPurified,first);
 pulse(a,s);a.purifyPollution(s);assert.ok(s.pollution.totals.pollutionPurified>first);
 assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('rate and absolute capacity both bind, and sewage arrivals share the same tick budget',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,17,'wetland');pulse(a,s,300);a.purifyPollution(s);
 assert.equal(s.cells[17].lastPurified,a.P.wetlandPurificationCapacity);
 seed(s,18,10);s.pollution.incomingLoad[18]=10;s.pollution.incomingTransfers=[{from:null,to:18,load:10}];a.purifyPollution(s);
 assert.equal(s.cells[17].lastPurified,a.P.wetlandPurificationCapacity);
 assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('wetlands on both banks share a parcel once; remote and upstream stock cannot be purified',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,17,'wetland');a.placeFacility(s,19,'wetland');
 seed(s,6,4);const upstream=s.cells[6].pollutionLoad;pulse(a,s,2);a.purifyPollution(s);
 const entering=(upstream+2)/3;assert.ok(Math.abs(s.pollution.totals.pollutionPurified-entering*a.P.wetlandPurificationRate)<1e-12);
 assert.ok(s.cells[6].pollutionLoad>0);assert.equal(s.cells[17].lastPurified,s.cells[19].lastPurified);
 seed(s,114,10);s.pollution.incomingLoad[114]=10;s.pollution.incomingTransfers=[{from:null,to:114,load:10}];a.purifyPollution(s);assert.equal(s.cells[114].pollutionLoad,10);
 assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('local sewage entering the adjacent river is eligible once, even without river transfer',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,5,'wetland');a.placeFacility(s,0,'industrial');
 a.processWastewater(s);a.purifyPollution(s);assert.ok(Math.abs(s.cells[5].lastPurified-.12*a.P.wetlandPurificationRate)<1e-12);
 a.purifyPollution(s);assert.ok(Math.abs(s.pollution.totals.pollutionPurified-.12*a.P.wetlandPurificationRate)<1e-12);
 assert.equal(s.pollution.totals.reuseProduced,0);assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('water moving from a wetland into its adjacent river is internal passage, not another wash',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,17,'wetland');seed(s,17,6);
 s.flowTrace=[{from:17,to:18,amount:10}];a.transportPollution(s,new Float64Array(120).fill(30));a.purifyPollution(s);
 assert.equal(s.pollution.totals.pollutionPurified,0);assert.ok(s.cells[18].pollutionLoad>0);
 assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('12-factory controls distinguish one/two wetlands from the capacity-limited treatment plant',()=>{
 const data=['A','B','C','D','E'].map(k=>runWetlandCase(k).result),[a,b,c,d,e]=data;
 assert.ok(b.wetlandShare>.2&&b.wetlandShare<.4);
 assert.ok(c.wetlandShare>b.wetlandShare&&c.wetlandShare<.6);
 assert.ok(a.outletPollutionMass>b.outletPollutionMass&&b.outletPollutionMass>c.outletPollutionMass);
 assert.ok(d.treatmentShare>.8&&d.treatmentShare<1);assert.equal(e.treatmentShare,d.treatmentShare);
 assert.ok(e.wetlandShare>0);assert.ok(e.finalRiverPollution<d.finalRiverPollution);
 for(const r of data){assert.ok(r.maxWaterError<1e-7&&r.maxPollutionError<1e-7);assert.ok(Math.abs(r.pollutionGenerated-a.pollutionGenerated)<1e-9);}
});
test('only the authorized pollution settings differ; restoring plant capacity preserves unrelated 1B trajectories',()=>{
 const a=engine(),old=loadEngine(new URL('../checkpoints/prototype-1b-before-1b1/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true});
 const clean=v=>JSON.parse(JSON.stringify(v));const current=clean(a.B),prior=clean(old.B);delete current.cityNeeds;delete current.cityResilience;
 for(const key of ['wetlandPurificationRate','wetlandPurificationCapacity','wetlandDetentionCapacity','treatmentCapacityPerStep']){delete current.pollution[key];delete prior.pollution[key];}
 assert.deepEqual(current,prior);
 for(const key of Object.keys(old.F))if(!['wetland','treatment'].includes(key))assert.deepEqual(clean(Object.fromEntries(Object.keys(old.F[key]).map(field=>[field,a.F[key][field]]))),clean(old.F[key]));
 assert.equal(a.capacity({facility:'wetland'}),13);assert.ok(13<a.capacity({facility:'sunken'}));
 a.P.treatmentCapacityPerStep=old.P.treatmentCapacityPerStep;
 for(const city of ['P1','P2','P3','P4','P6','P7','P8']){
  const s=a.createSimulation(city),p=old.createSimulation(city);
  for(let i=0;i<90;i++){
   const rain=i<30?0:i<60?.24:.72;a.step(s,rain);old.step(p,rain);
   assert.deepEqual(clean(s.supply),clean(p.supply));assert.deepEqual(clean(s.pollution.totals),clean(p.pollution.totals));
   assert.deepEqual(clean(s.cells.map(c=>[c.surface,c.storage,c.soil,c.pollutionLoad])),clean(p.cells.map(c=>[c.surface,c.storage,c.soil,c.pollutionLoad])));
  }
 }
});
test('wetland rate, capacity and detention validation; reset clears cumulative purification',()=>{
 for(const [key,value] of [['wetlandPurificationRate',1.1],['wetlandPurificationRate',NaN],['wetlandPurificationCapacity',-1],['wetlandDetentionCapacity',18]]){
  const a=engine();a.P[key]=value;assert.throws(()=>a.createSimulation('blank'));
 }
 const a=engine(),s=a.createSimulation('P5');for(let i=0;i<30;i++)a.step(s,.24);
 assert.ok(s.cells[53].totalPurified>0);a.resetWater(s);assert.equal(s.cells[53].totalPurified,0);assert.equal(s.pollution.totals.pollutionPurified,0);
});
test('wetland-enabled playback remains exactly equal at all four speeds',()=>{
 let reference;
 for(const speed of [1,2,3,4]){
  const a=engine(),s=a.createSimulation('P5'),r=a.createRound(60,'wet');a.startRound(r);
  while(r.state!=='finished')a.playRoundFrame(r,s,137,speed);
  const snapshot=JSON.stringify({cells:s.cells,supply:s.supply,totals:s.pollution.totals});
  reference??=snapshot;assert.equal(snapshot,reference);
 }
});


