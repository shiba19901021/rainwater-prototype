import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadEngine} from '../debug/engine-loader.mjs';
import {runBalanceCase,balanceCases} from '../debug/pollution-balance-experiments.mjs';
const clean=v=>JSON.parse(JSON.stringify(v));
const engine=()=>loadEngine(undefined,{pollutionEnabled:true});
test('1B.2 changes exactly three balance values; all engine rules and other settings are unchanged',()=>{
 const a=loadEngine(new URL('../checkpoints/prototype-1b2-before-1c1/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true}),old=loadEngine(new URL('../checkpoints/prototype-1b1-before-1b2/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true});
 const current=clean(a.B),prior=clean(old.B);
 for(const key of ['wetlandPurificationRate','wetlandPurificationCapacity','treatmentCapacityPerStep']){delete current.pollution[key];delete prior.pollution[key];}
 assert.deepEqual(current,prior);assert.deepEqual(clean(a.S),clean(old.S));assert.deepEqual(clean(a.weatherConfig),clean(old.weatherConfig));
 assert.deepEqual(clean(a.mapData),clean(old.mapData));assert.deepEqual(clean(a.roundConfig),clean(old.roundConfig));
 for(const key of Object.keys(a.F)){
  const x=clean(a.F[key]),y=clean(old.F[key]);delete x.purificationCapacityPerStep;delete y.purificationCapacityPerStep;delete x.treatmentCapacityPerStep;delete y.treatmentCapacityPerStep;
  assert.deepEqual(x,y);
 }
 const currentHtml=readFileSync(new URL('../checkpoints/prototype-1b2-before-1c1/water-resilience-p0.html',import.meta.url),'utf8'),oldHtml=readFileSync(new URL('../checkpoints/prototype-1b1-before-1b2/water-resilience-p0.html',import.meta.url),'utf8');
 const rules=text=>text.slice(text.indexOf('// data/map.js'),text.indexOf('// ui/renderer.js'));
 assert.ok(rules(currentHtml).length>10000);assert.equal(rules(currentHtml),rules(oldHtml));
 assert.equal(a.F.treatment.detention,0);assert.equal(a.F.treatment.waterDemand,undefined);
 assert.equal(a.capacity({facility:'wetland'}),13);
});
test('A-J distinguish land-intensive natural stacking from finite centralized treatment',()=>{
 const data=Object.fromEntries(Object.keys(balanceCases).map(k=>[k,runBalanceCase(k,{history:false}).result]));
 const {A,B,C,D,E,F,G,H,I,J}=data;
 assert.ok(B.wetlandShare>.25&&B.wetlandShare<.35);
 assert.ok(C.wetlandShare>B.wetlandShare+.15);assert.ok(D.wetlandShare>C.wetlandShare+.2&&D.wetlandShare<.8);
 assert.ok(E.treatmentShare>.8&&E.treatmentShare<.95);assert.ok(E.maxUtilizationPercent>100);
 assert.equal(F.treatmentShare,1);assert.equal(F.outletPollutionMass,0);
 assert.ok(G.outletPollutionMass<E.outletPollutionMass*.6);assert.ok(G.treatmentShare+G.wetlandShare>.9);
 assert.ok(H.treatmentShare<.4&&H.maxUtilizationPercent>250);
 assert.ok(I.treatmentShare>H.treatmentShare+.3&&I.treatmentShare<1);assert.ok(I.maxOverloadPerStep>0);
 assert.ok(J.wetlandShare>.65&&J.wetlandShare<.8);assert.ok(J.outletPollutionMass>100);assert.equal(J.finalQuality,'嚴重污染');
 assert.equal(A.finalQuality,B.finalQuality);assert.equal(A.finalQuality,D.finalQuality);
 for(const r of Object.values(data)){
  assert.ok(r.maxWaterError<1e-7&&r.maxPollutionError<1e-7);
  assert.ok(Math.abs(r.pollutionGenerated-r.industry*.12*240)<1e-8);
  if(r.plantCount){assert.ok(r.plants.every(p=>p.treated<=r.treatmentCap*240+1e-8));assert.equal(r.firstOverload,r.maxOverloadPerStep>1e-9?.5:null);}
  assert.ok(r.wetlands.every(w=>w.total<=r.wetlandCap*240+1e-8));
 }
});
test('10 factories approach capacity, 12/15/30 overload without changing source production',()=>{
 const a=runBalanceCase('density',{layout:{industry:10,plants:1,wetlands:0},history:false}).result;
 assert.ok(a.maxUtilizationPercent>=95&&a.maxUtilizationPercent<100);assert.equal(a.firstOverload,null);
 for(const industry of [12,15,30]){
  const r=runBalanceCase('density',{layout:{industry,plants:1,wetlands:0},history:false}).result;
  assert.equal(r.firstOverload,.5);assert.ok(r.maxOverloadPerStep>0);
 }
});
test('four separate wetland scopes attenuate a moving parcel geometrically without a global budget',()=>{
 const a=engine(),s=a.createSimulation('blank');a.P.wetlandPurificationCapacity=100;
 // Row 3 is a fixed road, so the third scope must be below that gap.
 for(const id of [17,29,53,65])a.placeFacility(s,id,'wetland');
 assert.equal(s.cells.filter(c=>c.facility==='wetland').length,4);
 s.cells[6].pollutionLoad=100;s.pollution.totals.pollutionGenerated=100;
 const remaining=[];
 for(let i=0;i<5;i++){
  s.flowTrace=[{from:6+i*12,to:18+i*12,amount:1}];a.transportPollution(s,new Float64Array(120).fill(1));a.purifyPollution(s);
  if(i!==2)remaining.push(s.cells[18+i*12].pollutionLoad);
  assert.ok(Math.abs(s.cells[18+i*12].pollutionLoad-100*.7**remaining.length)<1e-10);assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
  const before=s.pollution.totals.pollutionPurified;a.purifyPollution(s);assert.equal(s.pollution.totals.pollutionPurified,before);
 }
 assert.ok(s.pollution.totals.pollutionPurified>75);assert.ok(remaining[1]<remaining[0]*.8);
});
test('P1/P2/P6/P7 without governance remain bit-identical to 1B.1',()=>{
 const a=engine(),old=loadEngine(new URL('../checkpoints/prototype-1b1-before-1b2/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true});
 for(const key of ['P1','P2','P6','P7']){
  const s=a.createSimulation(key),p=old.createSimulation(key);
  for(let i=0;i<180;i++){
   const rain=i<80?0:i<120?.24:.72;a.step(s,rain);old.step(p,rain);
   assert.deepEqual(clean(s),clean(p));
  }
 }
});


