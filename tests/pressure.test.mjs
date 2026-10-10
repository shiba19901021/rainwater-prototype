import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine as loadBaseEngine} from '../debug/engine-loader.mjs';
// P0 routing regressions retain their original zero-stock starting conditions.
function loadEngine(...args){
 const a=loadBaseEngine(...args),create=a.createSimulation,reset=a.resetWater;
 a.createSimulation=(key)=>create(key,{initialState:'empty'});
 a.resetWater=s=>reset(s,{initialState:'empty'});return a;
}

test('a full downstream river slows land drainage and retains unaccepted water',()=>{
 const a=loadEngine(), dry=a.createSimulation('A'), full=a.createSimulation('A');
 dry.cells[5].surface=full.cells[5].surface=12;
 full.cells[6].surface=300;
 a.step(dry,0);a.step(full,0);
 assert.ok(full.cells[5].lastFlow<dry.cells[5].lastFlow);
 assert.ok(full.cells[5].surface>dry.cells[5].surface);
});

test('a full downstream land cell slows the preceding land cell',()=>{
 const a=loadEngine(), dry=a.createSimulation('A'), full=a.createSimulation('A');
 dry.cells[3].surface=full.cells[3].surface=12;full.cells[4].surface=30;
 a.step(dry,0);a.step(full,0);
 assert.ok(full.cells[3].lastFlow<dry.cells[3].lastFlow);
});

test('blocked detention release stays in the facility',()=>{
 const a=loadEngine(), s=a.createSimulation('D');
 a.B.riverSpillFraction=0; // Isolate blocked release from valid overbank arrivals.
 s.cells[17].storage=20;s.cells[18].surface=300;
 a.step(s,0);
 assert.equal(s.cells[17].storage,20);
 assert.equal(s.cells[17].lastFlow,0);
});

test('intentional storage alone is not harmful flooding',()=>{
 const a=loadEngine(),s=a.createSimulation('D');
 for(const c of s.cells)c.storage=a.capacity(c);
 a.step(s,0);
 assert.ok(s.stats.intentionalStorage>0);
 assert.equal(s.stats.harmfulFlooding,0);
 assert.equal(s.stats.harmfulPonding,0);
});

test('free water beyond a basin safety threshold remains harmful',()=>{
 const a=loadEngine(),s=a.createSimulation('D');
 const c=s.cells[17];c.storage=a.capacity(c);c.surface=50;s.cells[18].surface=300;
 a.step(s,0);
 assert.ok(s.stats.harmfulFlooding>0);
 assert.ok(s.stats.facilityOverflowFlooding>0);
});

test('all senders share a receiving budget and are allocated fairly',()=>{
 const a=loadEngine(),s=a.createSimulation('A');a.B.riverDischargeLimit=500;
 s.cells[6].surface=1000;s.cells[18].surface=190;
 s.cells[17].surface=s.cells[19].surface=50;
 const room=a.B.riverCapacity*a.B.riverReceivingCapacityMultiplier-190;
 a.step(s,0);
 assert.ok(s.cells[18].lastIncoming<=room+1e-9);
 assert.ok(s.cells[18].lastIncoming>0);
 assert.ok(Math.abs(s.cells[17].lastFlow-s.cells[19].lastFlow)<1e-9);
});

test('reversing cell iteration does not alter water or transfers',()=>{
 const a=loadEngine(),forward=a.createSimulation('C'),reverse=a.createSimulation('C');
 for(const s of [forward,reverse])for(const c of s.cells){c.surface=(c.id%11)*3;c.storage=a.capacity(c)*.5;c.soil=c.type==='river'?0:10;}
 reverse.cells.reverse();
 for(let i=0;i<20;i++){a.step(forward,.72);a.step(reverse,.72);}
 const reversed=new Map(reverse.cells.map(c=>[c.id,c]));
 for(const c of forward.cells)for(const key of ['surface','storage','soil','lastFlow','lastSpill'])assert.ok(Math.abs(c[key]-reversed.get(c.id)[key])<1e-9);
});

test('incoming water cannot cascade across two river segments in one tick',()=>{
 const a=loadEngine(),s=a.createSimulation('blank');s.cells[6].surface=20;
 a.step(s,0);assert.ok(s.cells[18].surface>0);assert.equal(s.cells[30].surface,0);
});

test('arriving water within basin capacity is stored without an artificial flood or same-tick cascade',()=>{
 const a=loadEngine(),s=a.createSimulation('C');s.cells[16].surface=30;
 a.step(s,0);
 assert.ok(s.cells[17].storage>0);assert.equal(s.cells[17].surface,0);
 assert.equal(s.cells[17].lastFlow,0);assert.equal(s.cells[17].lastInfiltration,0);
 assert.equal(s.cells[18].surface,0);
});

test('long rain, stopping rain, and saturated storage conserve finite nonnegative water',()=>{
 const a=loadEngine();
 for(const key of ['A','B','C','D']){
  const s=a.createSimulation(key);
  for(let i=0;i<600;i++){
   a.step(s,i<200?.72:0);
   assert.ok(Math.abs(s.totals.rain-a.waterInventory(s)-s.totals.outflow)<1e-6);
   for(const c of s.cells){
    assert.ok(Number.isFinite(c.surface)&&c.surface>=-1e-9);
    assert.ok(c.storage>=-1e-9&&c.storage<=a.capacity(c)+1e-9);
    assert.ok(c.soil>=-1e-9&&c.soil<=a.B.soilCapacity+1e-9);
   }
  }
  assert.equal(s.stats.harmfulFlooding,0);
 }
});

test('replacing and removing a full reservoir preserves water',()=>{
 const a=loadEngine(),s=a.createSimulation('D');s.cells[17].storage=a.capacity(s.cells[17]);
 const before=a.waterInventory(s);
 assert.equal(a.placeFacility(s,17,'sunken'),true);
 assert.ok(Math.abs(a.waterInventory(s)-before)<1e-9);
 assert.equal(a.placeFacility(s,17,'empty'),true);
 assert.ok(Math.abs(a.waterInventory(s)-before)<1e-9);
 assert.equal(a.placeFacility(s,6,'forest'),false);
});

test('storage capacities and infiltration settings have not been strengthened',()=>{
 const old=loadEngine(new URL('../debug/prototype-before-pressure.html',import.meta.url)),a=loadEngine();
 assert.equal(a.B.detentionPerLevel,old.B.detentionPerLevel);
 assert.equal(a.B.infiltrationPerLevel,old.B.infiltrationPerLevel);
 for(const key of ['soilCapacity','soilDryingPerTick','saturatedInfiltrationFraction','storageReleasePerTick','reservoirReleasePerTick','pondingThreshold','floodingThreshold','lowlandThresholdMultiplier','riverCapacity','riverDischargeLimit','riverFlowFraction','riverSpillFraction'])assert.equal(a.B[key],old.B[key]);
 assert.equal(JSON.stringify(a.weatherConfig),JSON.stringify(old.weatherConfig));
 for(const key of Object.keys(old.F))for(const field of ['detention','infiltration','runoff'])assert.equal(a.F[key][field],old.F[key][field]);
});

test('terrain and main flow directions are unchanged and descend without cycles',()=>{
 const a=loadEngine(),old=loadEngine(new URL('../debug/prototype-before-pressure.html',import.meta.url));
 assert.equal(JSON.stringify(a.mapData),JSON.stringify(old.mapData));
 for(const c of a.mapData){let next=c;const seen=new Set();while(next.flowTo!==null){assert.ok(!seen.has(next.id));seen.add(next.id);const target=a.mapData[next.flowTo];assert.ok(target.elevation<next.elevation);next=target;}}
});

test('reset clears pressure diagnostics and invalid rain is rejected',()=>{
 const a=loadEngine(),s=a.createSimulation('A');a.step(s,.72);
 assert.throws(()=>a.step(s,-1));assert.throws(()=>a.step(s,NaN));
 a.resetWater(s);assert.equal(a.waterInventory(s),0);assert.equal(s.tick,0);
 assert.equal(s.stats.harmfulFlooding,0);assert.equal(s.stats.intentionalStorage,0);
 assert.ok(s.cells.every(c=>c.lastBlocked===0&&c.lastIncoming===0));
});

test('river high water is distinct from actual overbank transfer',()=>{
 const a=loadEngine(),s=a.createSimulation();const c=s.cells[6];
 c.surface=a.B.riverCapacity+1;assert.equal(a.status(c),'高水位');
 c.lastSpill=1;assert.equal(a.status(c),'溢岸');
});
