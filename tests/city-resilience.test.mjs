import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine} from '../debug/engine-loader.mjs';
import {functionEngine,runControlledFunctionCase,runPhysicalFunctionCase} from '../debug/function-experiments.mjs';
const clean=v=>JSON.parse(JSON.stringify(v));
const fields=['currentFunctionFactor','damageState','recoveryProgress','recoveryStartFactor','floodFunctionFactor','waterFunctionFactor','pressureActive'];
function physical(s){const r=clean(s);delete r.resilience;for(const c of r.cells)for(const k of fields)delete c[k];return r;}
test('resilience disabled preserves complete 1C.1 states and every previously approved parameter',()=>{
 const a=loadEngine(undefined,{pollutionEnabled:true}),old=loadEngine(new URL('../checkpoints/prototype-1c1-before-1c2/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true});
 const b=clean(a.B);delete b.cityResilience;assert.deepEqual(b,clean(old.B));assert.deepEqual(clean(a.F),clean(old.F));
 for(const key of ['A','B','C','D','W1','W2','W3','W4','W5','W6','P1','P2','P3','P4','P5','P6','P7','P8','CITY-A','CITY-B','CITY-C','CITY-D','CITY-E','CITY-F']){
  const s=a.createSimulation(key),p=old.createSimulation(key);for(let i=0;i<200;i++){const rain=i<80?0:i<120?.12:i<160?.38:.72;a.step(s,rain);old.step(p,rain);assert.deepEqual(clean(s),clean(p));assert.deepEqual(clean(a.cityNeeds(s)),clean(old.cityNeeds(p)));}
 }
});
test('enabled observer never changes water, pollutant, supply, demand or routing state',()=>{
 const on=functionEngine(),off=loadEngine(undefined,{pollutionEnabled:true});
 for(const key of ['A','B','C','D','W6','P1','P2','P3','P4','P5','P6','P7','P8','CITY-A','CITY-B','CITY-C','CITY-D','CITY-E','CITY-F','FUNC-G','FUNC-H']){
  const s=on.createSimulation(key),p=off.createSimulation(key);
  for(let i=0;i<240;i++){const rain=i<140?0:i<200?.72:.12;on.step(s,rain);off.step(p,rain);assert.deepEqual(physical(s),clean(p));assert.ok(Math.abs(on.supplyMassError(s))<1e-7);assert.ok(Math.abs(on.pollutionMassError(s))<1e-7);}
 }
});
test('free harmful water uses existing lowland thresholds; intentional storage and leisure remain unaffected',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-B'),c=s.cells.find(c=>c.facility==='residential'),t=a.thresholds(c);
 for(const [surface,expected] of [[0,1],[t.ponding,.75],[t.flooding,.4],[t.flooding*1.5,0]]){c.surface=surface;c.storage=100;assert.equal(a.facilityPressure(c).floodFactor,expected);}
 const low=s.cells.find(c=>c.lowland&&c.buildable);a.placeFacility(s,low.id,'residential');low.surface=t.ponding*.8;assert.equal(a.facilityPressure(low).floodFactor,.75);
 for(const key of ['park','generalPark','sunken','wetland','reservoir','forest']){a.placeFacility(s,low.id,key);low.storage=a.capacity(low);low.surface=100;assert.equal(a.facilityPressure(low).factor,1);}
 assert.equal(a.cityNeeds(s).effective.leisure,a.cityNeeds(s).nominal.leisure);
});
test('water sensitivity is continuous, industry/agriculture are stronger and public services remain more resilient',()=>{
 const a=functionEngine(),factors={};for(const type of a.CR.affectedFacilities){factors[type]=[0,.2,.5,.7,1].map(shortage=>a.facilityPressure({facility:type,surface:0,lowland:false,waterShortage:shortage}).waterFactor);assert.equal(factors[type][0],1);assert.ok(factors[type].every((v,i)=>i===0||v<=factors[type][i-1]));}
 assert.ok(factors.publicService[4]>factors.residential[4]);assert.ok(factors.residential[4]>0);assert.equal(factors.industrial[4],0);assert.equal(factors.agriculture[4],0);
 assert.ok(factors.agriculture[3]<factors.commercial[3]);
});
test('compound losses use min, and pollution has no direct damage path',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-B'),c=s.cells.find(c=>c.facility==='residential');c.surface=a.thresholds(c).flooding;c.waterShortage=.7;
 const p=a.facilityPressure(c);assert.equal(p.factor,Math.min(p.floodFactor,p.waterFactor));assert.equal(p.factor,.4);
 c.pollutionLoad=100000;assert.deepEqual(a.facilityPressure(c),p);
});
test('recovery is delayed, stops under ongoing pressure, and a new hazard interrupts it',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-C'),c=s.cells.find(c=>c.facility==='industrial');c.surface=100;a.updateCityResilience(s);assert.equal(c.currentFunctionFactor,0);
 for(let i=0;i<100;i++)a.updateCityResilience(s);assert.equal(c.currentFunctionFactor,0);
 c.surface=a.thresholds(c).ponding;a.updateCityResilience(s);assert.equal(c.currentFunctionFactor,0,'easing but active pressure must not recover');
 c.surface=0;a.updateCityResilience(s);assert.ok(c.currentFunctionFactor>0&&c.currentFunctionFactor<.1);assert.equal(c.damageState,'恢復中');
 for(let i=0;i<10;i++)a.updateCityResilience(s);const recovered=c.currentFunctionFactor;c.waterShortage=1;a.updateCityResilience(s);assert.ok(c.currentFunctionFactor<recovered);assert.equal(c.currentFunctionFactor,0);
 c.waterShortage=0;for(let i=0;i<120;i++)a.updateCityResilience(s);assert.equal(c.currentFunctionFactor,1);assert.equal(c.damageState,'正常');assert.equal(c.recoveryProgress,1);
});
test('effective public services determine a capped synchronous bonus, including their own damage and recovery',()=>{
 const e1=runControlledFunctionCase('FUNC-E1'),e2=runControlledFunctionCase('FUNC-E2'),f=runControlledFunctionCase('FUNC-F');
 assert.equal(e1.fullFacilityRecovery,50);assert.equal(e2.fullFacilityRecovery,63.5);assert.ok(e1.fullFacilityRecovery<e2.fullFacilityRecovery);
 assert.equal(e1.history[0].multiplier,1.5);assert.equal(e2.history[0].multiplier,1.125);assert.equal(f.history[0].multiplier,1.25);assert.ok(f.history.at(-1).multiplier>f.history[0].multiplier);
 const a=functionEngine(),s=a.createSimulation('CITY-B');for(const c of s.cells.filter(c=>c.buildable&&c.facility==='empty'))a.placeFacility(s,c.id,'publicService');a.updateCityResilience(s);assert.equal(s.resilience.recoveryMultiplier,1.5);
});
test('status uses unrounded capped minimum ratios at stable configured boundaries',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-B');
 for(const [factor,status] of [[1,'良好'],[.9,'良好'],[.899,'受壓'],[.7,'受壓'],[.699,'不足'],[.4,'不足'],[.399,'嚴重失能']]){
  for(const c of s.cells)if(c.facility==='residential')c.currentFunctionFactor=factor;
  assert.equal(a.cityNeeds(s).status,status);assert.equal(a.cityNeeds(s).nominal.housing,12);
 }
});
test('FUNC A-D controls isolate housing, jobs and differential drought losses without permanent destruction',()=>{
 const A=runControlledFunctionCase('FUNC-A'),B=runControlledFunctionCase('FUNC-B'),C=runControlledFunctionCase('FUNC-C'),D=runControlledFunctionCase('FUNC-D');
 assert.deepEqual(A.minRatios,{housing:1,jobs:1,publicService:1});assert.equal(B.minRatios.housing,.75);assert.equal(B.minRatios.jobs,1);assert.equal(C.minRatios.jobs,.5);assert.equal(C.minRatios.housing,1);
 assert.ok(D.minRatios.jobs<D.minRatios.housing);assert.ok(D.minRatios.publicService>D.minRatios.housing);
 for(const r of [B,C,D])assert.ok(r.fullFacilityRecovery>r.pressureRemovedAt);
});
test('physical G/H share nominal functions and demand; resilience reduces loss depth and recovery duration',()=>{
 const g=runPhysicalFunctionCase('FUNC-G'),h=runPhysicalFunctionCase('FUNC-H');
 assert.deepEqual(clean(g.result.finalCity.nominal),clean(h.result.finalCity.nominal));
 assert.ok(g.result.minimum.housing>h.result.minimum.housing+.4);assert.ok(g.result.minimum.jobs>h.result.minimum.jobs+.5);
 assert.ok(g.result.firstDecline>h.result.firstDecline);assert.ok(g.result.fullRecovery<h.result.fullRecovery);
 for(const r of [g,h]){assert.ok(r.result.maxWaterError<1e-7);assert.ok(r.result.maxPollutionError<1e-7);assert.equal(r.result.finalCity.status,'良好');}
});
test('full city function and physical state are identical at all speeds and do not recover while paused',()=>{
 const a=functionEngine(),out=[];for(const speed of [1,2,3,4]){
  const s=a.createSimulation('FUNC-C'),r=a.createRound(120,'wet');a.startRound(r);a.playRoundFrame(r,s,250,speed);a.pauseRound(r);const snapshot=JSON.stringify(s);a.playRoundFrame(r,s,100000,speed);assert.equal(JSON.stringify(s),snapshot);a.startRound(r);
  while(r.state!=='finished')a.playRoundFrame(r,s,37,speed);out.push(JSON.stringify(s));
 }assert.ok(out.every(s=>s===out[0]));
});
test('replacement and water reset clear old interruption without changing physical replacement semantics',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-C'),c=s.cells.find(c=>c.facility==='industrial');c.surface=30;a.updateCityResilience(s);assert.equal(c.currentFunctionFactor,0);
 const before=a.waterInventory(s);a.placeFacility(s,c.id,'wetland');assert.equal(a.waterInventory(s),before);assert.equal(c.currentFunctionFactor,1);
 a.resetWater(s);assert.ok(s.cells.every(c=>c.damageState==='正常'));
 const fixture=a.createSimulation('FUNC-C');assert.ok(a.cityNeeds(fixture).effective.jobs<12);a.resetWater(fixture);assert.ok(a.cityNeeds(fixture).effective.jobs<12);assert.ok(Math.abs(a.supplyMassError(fixture))<1e-7);
});
test('clicking the same facility during recovery never provides an instant repair',()=>{
 const a=functionEngine(),s=a.createSimulation('CITY-C'),c=s.cells.find(c=>c.facility==='industrial');c.surface=100;a.updateCityResilience(s);c.surface=0;a.updateCityResilience(s);
 const before=c.currentFunctionFactor;a.placeFacility(s,c.id,'industrial');assert.equal(c.currentFunctionFactor,before);assert.equal(c.damageState,'恢復中');
});
test('a real dry round progressively reduces mixed-city functions; rain restores supply before function recovers',()=>{
 const normal=runPhysicalFunctionCase('FUNC-A',{duration:60,mode:'dry',tailSeconds:0}),dry=runPhysicalFunctionCase('FUNC-D',{duration:120,mode:'dry',tailRain:.24});
 assert.equal(normal.result.minimumCityFunctionRatio,1);assert.ok(dry.result.minimumCityFunctionRatio<.4);assert.ok(dry.result.firstDecline>25);
 assert.ok(dry.result.fullRecovery>dry.result.pressureCleared);assert.equal(dry.result.finalCity.status,'良好');
});
test('teaching recovery durations match light/moderate/severe ranges and the service cap',()=>{
 for(const service of [false,true])for(const [severity,baseSeconds] of [['light',15],['moderate',36],['severe',60]]){
  const a=functionEngine(),s=a.createSimulation('CITY-B'),c=s.cells.find(c=>c.facility==='residential');
  if(!service)for(const p of s.cells.filter(c=>c.facility==='publicService'))a.placeFacility(s,p.id,'empty');
  const t=a.thresholds(c);c.surface=severity==='light'?t.ponding:severity==='moderate'?t.flooding:t.flooding*2;a.updateCityResilience(s);c.surface=0;
  let ticks=0;while(c.currentFunctionFactor<1&&ticks<200){a.updateCityResilience(s);ticks++;}
  assert.equal(ticks*a.B.timestepSeconds,baseSeconds/(service?1.5:1));
 }
});
