import {loadEngine} from './engine-loader.mjs';
import {runCase,rainScenarios} from './pressure-experiments.mjs';
const base={landFlowFraction:.65,runoffSpeedPerLevel:.01,landFlowLimit:4.8,lowlandFlowMultiplier:.72};
for(const extra of [{riverReceivingCapacityMultiplier:1.5},{riverReceivingCapacityMultiplier:1.7},{riverPressureStartFraction:.75},{landReceivingCapacity:22}]){
 const a=loadEngine();Object.assign(a.B,base,extra);const results={};
 for(const name of ['strong','extreme'])results[name]=Object.fromEntries(['A','B','C','D'].map(k=>{
  const s=runCase(a,k,rainScenarios[name]).summary;
  return[k,{f:s.maxHarmfulFlooding,nl:s.maxNonLowlandHarmfulFlooding,free:+s.maxFreeSurface.toFixed(2),river:+s.riverPeak.toFixed(2),peak:s.riverPeakTime,over:s.firstRiverOver,integral:s.harmfulFloodCellSeconds}];
 }));
 console.log(JSON.stringify({config:extra,results}));
}
