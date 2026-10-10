// Isolated parameter probes; never writes to the prototype or changes storage capacity.
import {loadEngine} from './engine-loader.mjs';
import {runCase,rainScenarios} from './pressure-experiments.mjs';
const candidates=[
 {name:'current',values:{}},
 {name:'flow60',values:{landFlowFraction:.60,runoffSpeedPerLevel:.035,landFlowLimit:4.8}},
 {name:'flow62-river55',values:{landFlowFraction:.62,runoffSpeedPerLevel:.03,landFlowLimit:5,riverPressureStartFraction:.55}},
 {name:'flow60-river40',values:{landFlowFraction:.60,runoffSpeedPerLevel:.035,landFlowLimit:4.8,riverPressureStartFraction:.40}},
 {name:'flow62-river40',values:{landFlowFraction:.62,runoffSpeedPerLevel:.03,landFlowLimit:5,riverPressureStartFraction:.40}},
];
for(const candidate of candidates){
 const a=loadEngine();Object.assign(a.B,candidate.values);
 const compact={};
 for(const name of ['normal','strong','extreme'])compact[name]=Object.fromEntries(['A','B','C','D','ordinary'].map(k=>{
  const s=runCase(a,k,rainScenarios[name]).summary;
  return[k,{first:s.firstHarmfulFlooding,f:s.maxHarmfulFlooding,nl:s.maxNonLowlandHarmfulFlooding,free:+s.maxFreeSurface.toFixed(1),river:+s.riverPeak.toFixed(1),peak:s.riverPeakTime,over:s.firstRiverOver,common:s.maxCommonUrbanFlooding,integral:s.harmfulFloodCellSeconds}];
 }));
 console.log(JSON.stringify({name:candidate.name,config:candidate.values,results:compact}));
}
