import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine} from '../debug/engine-loader.mjs';
import {makeCity,runOpeningCases} from '../debug/opening-experiments.mjs';
const cases=runOpeningCases();
const [s1,s2,s3,s4,s5]=cases;

test('normal opening has full supply, finite baseline stocks, and no harmful water',()=>{
 const a=loadEngine();
 for(const key of ['ordinary','A','B','C','D','W2','W3','W6','blank']){
  const s=a.createSimulation(key);
  assert.equal(s.tick,0);assert.equal(s.supply.municipalSupplyLevel,1);
  assert.equal(s.supply.droughtStress,0);assert.equal(s.stats.harmfulPonding+s.stats.harmfulFlooding,0);
  for(const c of s.cells){
   assert.equal(c.surface,c.type==='river'?a.S.initialRiverLevel:0);
   assert.equal(c.soil,c.type==='river'?0:a.B.soilCapacity*a.S.initialSoilMoisture);
   assert.equal(c.storage,c.facility==='reservoir'?a.capacity(c)*.5:0);
  }
  assert.equal(s.totals.initialWater,a.waterInventory(s));assert.ok(Math.abs(a.supplyMassError(s))<1e-8);
 }
});
test('S1 sunny opening maintains normal external supply through the 25-second grace',()=>{
 assert.equal(s1.result.firstSupplyDecay,25.5);assert.ok(s1.result.firstShortage>30);
 for(const row of s1.rows.filter(r=>r.time<=25)){assert.equal(row.municipal,1);assert.equal(row.shortage,0);}
 assert.ok(s1.rows.find(r=>r.time===25).stress>0);
});
test('S2 actual reservoirs start half full, stay unused while supply suffices, and delay shortage',()=>{
 assert.equal(s2.result.initialReserve,180);assert.equal(s1.result.initialReserve,0);
 for(const row of s2.rows.filter(r=>r.time<s2.result.firstBackupUse)){assert.equal(row.backup,0);assert.equal(row.reserve,180);}
 assert.ok(s2.result.firstShortage>=s1.result.firstShortage+20);
 assert.ok(s2.result.firstBackupUse>=s2.result.firstSupplyDecay);
});
test('S3 effective light rain after short dryness lowers stress without shortage',()=>{
 assert.equal(s3.result.firstShortage,null);assert.equal(s3.result.firstSupplyDecay,null);
 assert.equal(s3.result.finalStress,0);assert.equal(s3.result.finalSupply,1);
 const after=s3.rows.filter(r=>r.time>25);
 assert.ok(after[0].stress>0,'stress is relieved gradually, not reset by rain');
 assert.ok(after.at(-1).river>after[0].river,'river replenishes under rain');
});
test('S4 long drought eventually exhausts finite backup and creates severe shortage',()=>{
 assert.ok(s4.result.firstSupplyDecay<s4.result.firstBackupUse);
 assert.ok(s4.result.firstBackupUse<s4.result.firstShortage);
 assert.ok(s4.result.firstSevere);assert.equal(s4.result.finalReserve,0);assert.equal(s4.result.finalSupply,0);
});
test('S5 150-second W6 expresses shortage, replenishment, recovery, full ponds and later flooding',()=>{
 const r=s5.result;
 assert.ok(r.firstSupplyDecay<r.firstShortage);assert.ok(r.firstShortage<r.recovery);
 assert.ok(r.storageRefill<r.fullStorage);assert.ok(r.recovery<r.firstFlood);
 assert.ok(r.fullStorage<r.firstFlood);
});
test('all S1-S5 steps conserve initial, rain and external water with finite nonnegative stocks',()=>{
 for(const c of cases)assert.ok(c.result.maxMassError<1e-7);
 const a=loadEngine(),s=makeCity(a,true);
 for(let i=0;i<800;i++){
  a.step(s,i<300?0:i<500?.72:0);
  assert.ok(Math.abs(a.supplyMassError(s))<1e-7);
  for(const c of s.cells){assert.ok(c.surface>=-1e-9);assert.ok(c.storage>=-1e-9&&c.storage<=a.capacity(c)+1e-9);assert.ok(c.soil>=-1e-9&&c.soil<=a.B.soilCapacity+1e-9);}
 }
});
test('opening fill ratio is configurable and reset never duplicates water or grants nonexistent storage',()=>{
 for(const ratio of [.4,.5,.6]){
  const a=loadEngine();a.S.initialReservoirFillRatio=ratio;
  const s=a.createSimulation('W3');assert.equal(s.supply.reserve,360*ratio);
  a.step(s,0);a.resetWater(s);a.resetWater(s);
  assert.equal(s.supply.reserve,360*ratio);assert.equal(s.supply.droughtStress,0);
  assert.ok(Math.abs(a.supplyMassError(s))<1e-8);
  a.placeFacility(s,17,'residential');a.resetWater(s);assert.equal(s.cells[17].storage,0);
  a.placeFacility(s,17,'reservoir');a.resetWater(s);assert.equal(s.cells[17].storage,45*ratio);
  assert.equal(s.supply.reserve,360*ratio);
 }
});
test('normal-start flood routing is unchanged once effective rain releases the opening reserve',()=>{
 const a=loadEngine(),old=loadEngine(new URL('../debug/prototype-before-drought-buffer.html',import.meta.url));
 for(const city of ['A','B','C','D']){
  const s=a.createSimulation(city),prior=old.createSimulation(city);
  prior.cells=JSON.parse(JSON.stringify(s.cells));
  for(let i=0;i<180;i++){
   const rain=i<60?.72:0;a.hydrologyStep(s,rain);old.hydrologyStep(prior,rain);
   assert.equal(JSON.stringify(s.cells.map(c=>[c.surface,c.storage,c.soil])),JSON.stringify(prior.cells.map(c=>[c.surface,c.storage,c.soil])));
   assert.equal(s.stats.harmfulFlooding,prior.stats.harmfulFlooding);
  }
 }
});
test('W6 opening stocks, drought stress and withdrawal are identical at all four playback speeds',()=>{
 const a=loadEngine();let baseline;
 for(const speed of [1,2,3,4]){
  const s=a.createSimulation('W6'),r=a.createRound(150,'compound');a.startRound(r);
  while(r.state!=='finished')a.playRoundFrame(r,s,16,speed);
  const snapshot=JSON.stringify(s);baseline??=snapshot;assert.equal(snapshot,baseline);
 }
});
