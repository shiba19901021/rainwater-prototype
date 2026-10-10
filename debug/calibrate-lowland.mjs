import {loadEngine} from './engine-loader.mjs';
import {runCase,rainScenarios} from './pressure-experiments.mjs';
for(const multiplier of [1,1.2,1.5]){
 const a=loadEngine();a.B.lowlandReceivingMultiplier=multiplier;const results={};
 for(const name of ['normal','strong','extreme'])results[name]=Object.fromEntries(['A','B','C','D','ordinary'].map(k=>{
  const s=runCase(a,k,rainScenarios[name]).summary;
  return[k,{f:s.maxHarmfulFlooding,nl:s.maxNonLowlandHarmfulFlooding,free:+s.maxFreeSurface.toFixed(2),river:+s.riverPeak.toFixed(2),peak:s.riverPeakTime,over:s.firstRiverOver,integral:s.harmfulFloodCellSeconds,low:s.lowlandComparison.lowland.averageMaximumFreeWater,high:s.lowlandComparison.nonLowland.averageMaximumFreeWater}];
 }));
 console.log(JSON.stringify({multiplier,results}));
}
