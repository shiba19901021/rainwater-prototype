import {loadEngine} from './engine-loader.mjs';
import {runCase,rainScenarios} from './pressure-experiments.mjs';
const probes=[
 {name:'small-speed',values:{landFlowFraction:.65,runoffSpeedPerLevel:.01,landFlowLimit:4.8}},
 {name:'no-speed',values:{landFlowFraction:.67,runoffSpeedPerLevel:0,landFlowLimit:4.8}},
 {name:'small-speed-fast-low',values:{landFlowFraction:.65,runoffSpeedPerLevel:.01,landFlowLimit:4.8,lowlandFlowMultiplier:.72}},
];
for(const probe of probes){
 const a=loadEngine();Object.assign(a.B,probe.values);const result={};
 for(const name of ['normal','strong','extreme'])result[name]=Object.fromEntries(['A','B','C','D','ordinary'].map(k=>{
  const s=runCase(a,k,rainScenarios[name]).summary;
  return[k,{first:s.firstHarmfulFlooding,f:s.maxHarmfulFlooding,nl:s.maxNonLowlandHarmfulFlooding,free:+s.maxFreeSurface.toFixed(1),river:+s.riverPeak.toFixed(2),peak:s.riverPeakTime,over:s.firstRiverOver,common:s.maxCommonUrbanFlooding,integral:s.harmfulFloodCellSeconds}];
 }));
 console.log(JSON.stringify({name:probe.name,config:probe.values,results:result}));
}
const a=loadEngine();Object.assign(a.B,probes[0].values);
for(const duration of [20,24,28,32,40]){
 const schedule={name:'duration',schedule:[{weather:'storm',ticks:duration},{weather:'sunny',ticks:200}]};
 console.log(JSON.stringify({duration,results:Object.fromEntries(['A','B','C','D'].map(k=>{const s=runCase(a,k,schedule).summary;return[k,{f:s.maxHarmfulFlooding,nl:s.maxNonLowlandHarmfulFlooding,free:+s.maxFreeSurface.toFixed(1),river:+s.riverPeak.toFixed(1),peak:s.riverPeakTime,integral:s.harmfulFloodCellSeconds}];}))}));
}
