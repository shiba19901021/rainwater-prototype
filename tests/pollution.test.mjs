import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine} from '../debug/engine-loader.mjs';
import {runPollutionCase} from '../debug/pollution-experiments.mjs';
const engine=()=>loadEngine(undefined,{pollutionEnabled:true});
const seed=(s,id,load)=>{s.cells[id].pollutionLoad+=load;s.pollution.totals.pollutionGenerated+=load;};
const run=(a,s,ticks,rain=0)=>{for(let i=0;i<ticks;i++){a.step(s,rain);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);assert.ok(Math.abs(a.pollutionMassError(s))<1e-7);}return s;};

test('rain-independent generation remains distinct from runoff, demand and actual recovery water',()=>{
 const a=engine(),s=a.createSimulation('P2');a.F.industrial.runoff=0;a.F.industrial.waterDemand=0;
 run(a,s,2);assert.ok(s.pollution.totals.pollutionGenerated>0);assert.equal(s.supply.demand,0);
 assert.equal(s.pollution.totals.wastewaterGenerated,0);assert.equal(s.pollution.totals.reuseProduced,0);
});
test('P1 pollution moves exactly one river segment per tick with physical water',()=>{
 const a=engine(),s=a.createSimulation('blank');seed(s,6,3);a.step(s,0);
 assert.ok(s.cells[18].pollutionLoad>0);assert.equal(s.cells[30].pollutionLoad,0);
 assert.ok(s.cells[6].pollutionLoad>0);assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
});
test('P2 industry generates three times residential load at identical locations',()=>{
 const a=engine(),home=a.createSimulation('P1'),industry=a.createSimulation('P2');
 run(a,home,40,.24);run(a,industry,40,.24);
 assert.ok(Math.abs(industry.pollution.totals.pollutionGenerated/home.pollution.totals.pollutionGenerated-3)<1e-12);
 assert.ok(industry.pollution.stats.concentration>home.pollution.stats.concentration*2);
});
test('P3 finite treatment captures sources proportionally and produces only real treated water',()=>{
 const a=engine(),s=a.createSimulation('P3');a.step(s,0);
 assert.ok(s.pollution.stats.untreated>0);assert.equal(s.pollution.stats.treated,a.P.treatmentCapacityPerStep);
 assert.ok(Math.abs(s.pollution.stats.reuseProduced-s.supply.served*a.P.wastewaterReturnRatio*a.P.reuseRatio*s.pollution.stats.treated/s.pollution.stats.generated)<1e-12);
 assert.equal(s.supply.reuse,0,'water just produced cannot be reused in the same tick');
 a.step(s,0);assert.ok(s.supply.reuse>0);
});
test('P4 production growth takes a normal plant into overload; overflow goes to local river rows',()=>{
 const a=engine(),s=a.createSimulation('P3');
 for(const c of s.cells.filter(c=>c.facility==='industrial').slice(8))a.placeFacility(s,c.id,'empty');
 run(a,s,20,.24);assert.equal(s.cells[113].treatmentStatus,'正常運作');
 for(const c of s.cells)if(c.buildable&&c.facility==='empty')a.placeFacility(s,c.id,'industrial');
 a.step(s,.24);assert.equal(s.cells[113].treatmentStatus,'超量');
 assert.ok(Math.abs(s.pollution.stats.treated-a.P.treatmentCapacityPerStep)<1e-12);
 assert.ok(s.pollution.stats.untreated>0);assert.ok(s.cells.some(c=>c.lastPollutionDischarge>0));
 assert.ok(s.cells.filter(c=>c.type==='river').some(c=>c.pollutionLoad>0));
 assert.ok(Math.abs(a.pollutionMassError(s))<1e-7);
});
test('multiple plants share capacity fairly and near-limit status is separate from flooding',()=>{
 const a=engine(),s=a.createSimulation('P4');a.placeFacility(s,0,'treatment');a.step(s,0);
 assert.ok(Math.abs(s.cells[0].lastTreated-s.cells[113].lastTreated)<1e-12);assert.ok(s.pollution.stats.untreated>0);
 const b=engine(),near=b.createSimulation('P3');b.P.treatmentCapacityPerStep=4;
 b.step(near,0);assert.equal(near.cells[113].treatmentStatus,'接近容量');assert.equal(b.status(near.cells[113]),'正常');
});
test('P5 adjacent wetland has a hard per-step purification cap and leaves excess pollution',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,29,'wetland');seed(s,6,20);
 run(a,s,2);assert.ok(s.cells[29].lastPurified>0);assert.ok(s.cells[29].lastPurified<=a.P.wetlandPurificationCapacity);
 assert.ok(s.cells[30].pollutionLoad>0,'a wetland cannot erase an overloaded pulse');
 assert.ok(a.F.wetland.detention<a.F.sunken.detention);
});
test('wetland placement away from the river does not magically purify all segments',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,24,'wetland');seed(s,30,10);a.step(s,0);
 assert.equal(s.pollution.totals.pollutionPurified,0);
});
test('P6 quality reduces capacity and stops intake even when river water is ample',()=>{
 const a=engine(),s=a.createSimulation('blank'),r=s.cells[6];r.surface=100;
 const clear=a.intakeCapacity(r,s);seed(s,6,5);const polluted=a.intakeCapacity(r,s);
 assert.ok(polluted>0&&polluted<clear);seed(s,6,20);assert.equal(a.intakeCapacity(r,s),0);
 assert.ok(r.surface>a.S.riverMinimumIntakeLevel+a.S.riverIntakeRamp);
});
test('intake transfers its pollution into sewage; neither withdrawal nor overflow deletes mass',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,0,'residential');a.placeFacility(s,5,'intake');
 s.supply.municipalSupplyLevel=0;s.supply.droughtStress=100;seed(s,6,1);
 const water=a.waterInventory(s);s.cells[6].surface=90;s.totals.initialWater+=a.waterInventory(s)-water;
 a.step(s,0);assert.ok(s.supply.river>0);assert.ok(Math.abs(a.pollutionMassError(s))<1e-9);
 const spill=a.createSimulation('blank');const stock=a.waterInventory(spill);spill.cells[6].surface=300;spill.totals.initialWater+=a.waterInventory(spill)-stock;seed(spill,6,30);
 a.step(spill,0);assert.ok(spill.pollution.stats.pollutionOnLand>0);assert.ok(Math.abs(a.pollutionMassError(spill))<1e-9);
});
test('P7 low river water gives higher concentration for the same pollution load',()=>{
 const a=engine(),r=a.createSimulation('blank').cells[6];r.pollutionLoad=3;r.surface=100;const wet=a.pollutionConcentration(r);
 r.surface=5;assert.ok(a.pollutionConcentration(r)>wet*10);
 const dry=a.createSimulation('P7'),rain=a.createSimulation('P7');run(a,dry,180,0);run(a,rain,180,.38);
 assert.ok(dry.pollution.stats.concentration>rain.pollution.stats.concentration);
});
test('P8 real reuse delays drought shortage, reduces discharge and is finite',()=>{
 const a=engine(),withReuse=a.createSimulation('P8'),without=a.createSimulation('P8');a.placeFacility(without,113,'empty');
 let firstA,firstB;
 for(let i=0;i<480;i++){
  a.step(withReuse,0);a.step(without,0);
  if(without.supply.shortage>1e-8)firstA??=without.tick/2;if(withReuse.supply.shortage>1e-8)firstB??=withReuse.tick/2;
  assert.ok(Math.abs(a.supplyMassError(withReuse))<1e-7);assert.ok(Math.abs(a.pollutionMassError(withReuse))<1e-7);
 }
 // Reduced plant capacity also limits real reusable water; delay must remain real.
 assert.ok(firstB>firstA);assert.ok(withReuse.pollution.totals.reuseConsumed>0);
 assert.ok(withReuse.pollution.stats.pollutionInRiver<without.pollution.stats.pollutionInRiver);
 assert.ok(withReuse.supply.shortage>0);assert.ok(withReuse.pollution.reuseWater<1e-8);
});
test('reuse cannot be manufactured from pollution without actual served water',()=>{
 const a=engine(),s=a.createSimulation('P3');s.supply.municipalSupplyLevel=0;s.supply.droughtStress=100;
 run(a,s,40,0);assert.ok(s.pollution.totals.pollutionTreated>0);assert.equal(s.pollution.totals.reuseProduced,0);assert.equal(s.supply.served,0);
});
test('closed recycled-water loop loses water each cycle and stops without new inputs',()=>{
 const a=engine(),s=a.createSimulation('blank');a.placeFacility(s,0,'residential');a.placeFacility(s,113,'treatment');
 s.supply.municipalSupplyLevel=0;s.supply.droughtStress=100;s.pollution.reuseWater=1;s.totals.initialWater+=1;
 run(a,s,800,0);assert.ok(s.totals.cityUse<=1/(1-a.P.reuseRatio*a.P.wastewaterReturnRatio)+1e-9);
 assert.ok(s.pollution.reuseWater<1e-9);assert.ok(s.supply.shortage>0);assert.equal(s.totals.municipalInput,0);
});
test('reuse priority is configurable without changing drought or demand balance',()=>{
 const a=engine(),s=a.createSimulation('P3');a.step(s,0);a.P.sourcePriority=['municipal','river','reservoir','reuse'];a.step(s,0);
 assert.equal(s.supply.reuse,0);assert.ok(s.pollution.reuseWater>0);assert.equal(s.supply.municipalSupplyLevel,1);
});
test('no phantom reuse at opening, reset clears both ledgers, and demolition drains clean tank stock',()=>{
 const a=engine(),s=a.createSimulation('P3');assert.equal(s.pollution.reuseWater,0);run(a,s,20,0);
 a.placeFacility(s,113,'empty');a.step(s,0);assert.equal(s.pollution.reuseWater,0);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);
 a.resetWater(s);assert.equal(s.pollution.reuseWater,0);assert.equal(s.pollution.totals.pollutionGenerated,0);assert.equal(a.pollutionMassError(s),0);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);
});
test('invalid recovery ratios and duplicated source priorities are rejected',()=>{
 for(const key of ['reuseRatio','wastewaterReturnRatio']){const a=engine();a.P[key]=1.1;assert.throws(()=>a.createSimulation('P3'));}
 const a=engine();a.P.sourcePriority=['municipal','municipal','reuse','reservoir'];assert.throws(()=>a.createSimulation('P3'));
});
test('enabled pollution, treatment and reuse remain deterministic at 1x-4x and across pauses',()=>{
 const a=engine();
 for(const [city,mode,time] of [['P4','wet',60],['P8','dry',120],['W6','compound',150]]){
  let baseline;
  for(const speed of [1,2,3,4]){
   const s=a.createSimulation(city),r=a.createRound(time,mode);a.startRound(r);let frames=0;
   while(r.state==='running'){
    if(frames++===5){a.pauseRound(r);const frozen=JSON.stringify(s);a.playRoundFrame(r,s,10000,speed);assert.equal(JSON.stringify(s),frozen);a.startRound(r);}
    a.playRoundFrame(r,s,16,speed);
   }
   const snapshot=JSON.stringify(s);baseline??=snapshot;assert.equal(snapshot,baseline);
   assert.ok(Math.abs(a.supplyMassError(s))<1e-7);assert.ok(Math.abs(a.pollutionMassError(s))<1e-7);
  }
 }
});
test('wetland and shared treatment allocations are independent of cell iteration order',()=>{
 const a=engine(),normal=a.createSimulation('P5'),reversed=a.createSimulation('P5');reversed.cells.reverse();
 run(a,normal,60,.38);run(a,reversed,60,.38);
 const byId=new Map(reversed.cells.map(c=>[c.id,c]));
 for(const c of normal.cells)for(const key of ['surface','storage','pollutionLoad'])assert.ok(Math.abs(c[key]-byId.get(c.id)[key])<1e-9);
});

// Exercise the presets themselves as well as the isolated mechanics.
test('P5 preset actually contains a riverside wetland and reduces downstream pollution',()=>{
 const a=engine(),s=a.createSimulation('P5');assert.equal(s.cells.filter(c=>c.facility==='wetland').length,1);
 const withWetland=runPollutionCase('P5',{ticks:120}),without=runPollutionCase('P5',{ticks:120,removeWetland:true});
 assert.ok(withWetland.result.pollutionPurified>0);
 const lower=run=>run.rows.at(-1).segments.find(c=>c.y===9).load;
 assert.ok(lower(withWetland)<lower(without)*.9);
 assert.ok(lower(withWetland)>0,'one wetland has a finite capacity');
});
test('P6 controlled partial external supply exposes real quality-driven intake stopping',()=>{
 const result=runPollutionCase('P6',{rain:.38,ticks:60,qualityProbe:true});
 assert.ok(result.result.firstIntake<result.result.firstQualityBlocked);
 const atBlock=result.rows.find(r=>r.time===result.result.firstQualityBlocked);
 assert.ok(atBlock.segments.find(c=>c.y===4).water>35);
});
test('production defaults enable pollution, and every P1-P8 preset starts without water shortage',()=>{
 for(let i=1;i<=8;i++){
  const a=engine(),s=a.createSimulation('P'+i);assert.ok(s.pollution.enabled);
  a.step(s,0);assert.equal(s.supply.shortage,0);assert.ok(Math.abs(a.pollutionMassError(s))<1e-8);
 }
});

test('1B with zero new source inputs matches the saved 1A.6 water and supply trajectory exactly',()=>{
 const a=engine(),old=loadEngine(new URL('../checkpoints/prototype-1a6-before-1b/water-resilience-p0.html',import.meta.url));
 a.P.pollutionLoadPerUnit=0;a.P.wastewaterReturnRatio=0;
 for(const city of ['A','C','D','W6']){
  const current=a.createSimulation(city),prior=old.createSimulation(city);
  for(let i=0;i<220;i++){
   const rain=i<110?0:i<160?.38:i<190?.72:0;a.step(current,rain);old.step(prior,rain);
   assert.equal(JSON.stringify(current.cells.map(c=>[c.surface,c.storage,c.soil])),JSON.stringify(prior.cells.map(c=>[c.surface,c.storage,c.soil])));
   for(const key of Object.keys(prior.supply))assert.equal(current.supply[key],prior.supply[key]);
   for(const key of Object.keys(prior.totals))assert.equal(current.totals[key],prior.totals[key]);
  }
 }
});
