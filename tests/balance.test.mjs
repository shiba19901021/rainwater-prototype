import test from 'node:test';
import assert from 'node:assert/strict';
import {runAll} from '../debug/pressure-experiments.mjs';
const results=runAll();

test('ordinary rainfall produces no harmful flooding in A-D or the ordinary city',()=>{
 for(const run of Object.values(results.normal)){
  assert.equal(run.summary.maxHarmfulFlooding,0);
  assert.equal(run.summary.firstRiverOver,null);
 }
});

test('strong rainfall overloads multiple non-lowland cells while lowland floods first',()=>{
 const run=results.strong.A,s=run.summary;
 assert.ok(s.maxNonLowlandHarmfulFlooding>=5);
 assert.ok(s.maxHarmfulFlooding<90);
 const first=run.cells.filter(c=>c.firstFlood===s.firstHarmfulFlooding);
 assert.ok(first.length>0&&first.every(c=>c.lowland));
});

test('lowland retains deeper water and recovers more slowly in both storm scales',()=>{
 for(const name of ['strong','extreme'])for(const key of ['A','B','C','D']){
  const comparison=results[name][key].summary.lowlandComparison;
  assert.ok(comparison.lowland.averageMaximumFreeWater>comparison.nonLowland.averageMaximumFreeWater);
  assert.ok(comparison.lowland.retreatSeconds>comparison.nonLowland.retreatSeconds);
 }
});

test('strong rainfall shows significant protection without enlarging facility capacities',()=>{
 const baseline=results.strong.A.summary;
 for(const [key,reduction]of [['B',.30],['C',.20],['D',.25]]){
  const s=results.strong[key].summary;
  assert.ok(s.maxHarmfulFlooding<=baseline.maxHarmfulFlooding*(1-reduction));
  assert.ok(s.maxCommonUrbanFlooding<baseline.maxCommonUrbanFlooding);
  assert.ok(s.maxFreeSurface<baseline.maxFreeSurface);
  assert.ok(s.riverPeak<baseline.riverPeak);
 }
 assert.ok(results.strong.C.summary.riverPeakTime>baseline.riverPeakTime);
 assert.ok(results.strong.D.summary.riverPeakTime>baseline.riverPeakTime);
});

test('extreme rain fills detention and weakens protection without granting immunity',()=>{
 const baseline=results.extreme.A.summary;
 for(const key of ['B','C','D']){
  const s=results.extreme[key].summary;
  assert.ok(s.maxHarmfulFlooding>results.strong[key].summary.maxHarmfulFlooding);
  assert.ok(s.maxHarmfulFlooding<baseline.maxHarmfulFlooding);
  assert.ok(s.maxFreeSurface<baseline.maxFreeSurface);
  assert.ok(s.harmfulFloodCellSeconds<baseline.harmfulFloodCellSeconds);
 }
 for(const[key,type]of [['C','sunken'],['D','reservoir']])assert.equal(results.extreme[key].summary.saturation[type].storage99.count,8);
 assert.equal(results.extreme.B.summary.saturation.forest.soil85.count,16);
});

test('rain stopping clears harmful surface impacts and all experiment steps conserve water',()=>{
 for(const cases of Object.values(results))for(const run of Object.values(cases)){
  assert.equal(run.summary.end.harmfulPonding,0);assert.equal(run.summary.end.harmfulFlooding,0);
  assert.notEqual(run.summary.retreatSeconds,null);
  assert.ok(run.summary.conservationError<1e-6);
 }
});
