import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
export const balanceCases={
 A:{industry:12,wetlands:0,plants:0},B:{industry:12,wetlands:1,plants:0},
 C:{industry:12,wetlands:2,plants:0},D:{industry:12,wetlands:4,plants:0},
 E:{industry:12,wetlands:0,plants:1},F:{industry:12,wetlands:0,plants:2},
 G:{industry:12,wetlands:2,plants:1},H:{industry:30,wetlands:0,plants:1},
 I:{industry:30,wetlands:0,plants:2},J:{industry:30,wetlands:4,plants:0}
};
export function runBalanceCase(key,{rate,wetlandCap,treatmentCap,file,ticks=240,rain=.24,layout,history=true}={}){
 const a=loadEngine(file,{pollutionEnabled:true});
 if(rate!==undefined)a.P.wetlandPurificationRate=rate;
 if(wetlandCap!==undefined)a.P.wetlandPurificationCapacity=wetlandCap;
 if(treatmentCap!==undefined)a.P.treatmentCapacityPerStep=treatmentCap;
 const spec=layout||balanceCases[key],s=a.createSimulation('blank');
 const sources=s.cells.filter(c=>c.buildable&&c.y<3).sort((a,b)=>a.id-b.id).slice(0,spec.industry);
 for(const c of sources)a.placeFacility(s,c.id,'industrial');
 for(const id of [53,65,77,89].slice(0,spec.wetlands))a.placeFacility(s,id,'wetland');
 for(const id of [113,115].slice(0,spec.plants))a.placeFacility(s,id,'treatment');
 const result={case:key,industry:sources.length,wetlandCount:spec.wetlands,plantCount:spec.plants,
  rate:a.P.wetlandPurificationRate,wetlandCap:a.P.wetlandPurificationCapacity,treatmentCap:a.P.treatmentCapacityPerStep,
  firstOverload:null,maxUtilizationPercent:0,maxOverloadPerStep:0,cumulativeOverload:0,
  maxWaterError:0,maxPollutionError:0,peakConcentration:0,worstQuality:'良好'};
 const plants=new Map(s.cells.filter(c=>c.facility==='treatment').map(c=>[c.id,{id:c.id,treated:0,firstOverload:null,maxRequested:0,maxUtilizationPercent:0,maxOverload:0}])),rows=[];
 for(let i=0;i<ticks;i++){
  a.step(s,rain);const p=s.pollution,load=s.cells.filter(c=>c.facility==='treatment').reduce((n,c)=>n+c.treatmentRequested,0),cap=spec.plants*a.P.treatmentCapacityPerStep,t=s.tick*a.B.timestepSeconds;
  const overload=spec.plants?Math.max(0,load-cap):0,requested=spec.plants?load/cap*100:0;
  if(overload>1e-9)result.firstOverload??=t;
  result.maxUtilizationPercent=Math.max(result.maxUtilizationPercent,requested);
  result.maxOverloadPerStep=Math.max(result.maxOverloadPerStep,overload);result.cumulativeOverload+=overload;
  result.maxWaterError=Math.max(result.maxWaterError,Math.abs(a.supplyMassError(s)));
  result.maxPollutionError=Math.max(result.maxPollutionError,Math.abs(a.pollutionMassError(s)));
  if(p.stats.concentration>result.peakConcentration){result.peakConcentration=p.stats.concentration;result.worstQuality=p.stats.status;}
  for(const [id,r] of plants){const c=s.cells.find(c=>c.id===id);r.treated+=c.lastTreated;r.maxRequested=Math.max(r.maxRequested,c.treatmentRequested);
   r.maxUtilizationPercent=Math.max(r.maxUtilizationPercent,c.treatmentRequested/a.P.treatmentCapacityPerStep*100);
   r.maxOverload=Math.max(r.maxOverload,c.treatmentRequested-a.P.treatmentCapacityPerStep);
   if(c.treatmentStatus==='超量')r.firstOverload??=t;
  }
  if(history)rows.push({time:t,treated:p.stats.treated,untreated:p.stats.untreated,riverPollution:p.stats.pollutionInRiver,concentration:p.stats.concentration,
   wetlands:s.cells.filter(c=>c.facility==='wetland').map(c=>({id:c.id,total:c.totalPurified,last:c.lastPurified})),
   plants:s.cells.filter(c=>c.facility==='treatment').map(c=>({id:c.id,requested:c.treatmentRequested,treated:c.lastTreated,status:c.treatmentStatus}))});
 }
 const t=s.pollution.totals;
 Object.assign(result,{pollutionGenerated:t.pollutionGenerated,pollutionTreated:t.pollutionTreated,pollutionPurifiedByWetland:t.pollutionPurified,
  pollutionDischarged:t.pollutionDischarged,outletPollutionMass:t.pollutionOutflow,finalRiverPollution:s.pollution.stats.pollutionInRiver,
  finalQuality:s.pollution.stats.status,finalOutletConcentration:a.pollutionConcentration(s.cells.find(c=>c.type==='river'&&c.y===9)),
  treatmentShare:t.pollutionTreated/t.pollutionGenerated,wetlandShare:t.pollutionPurified/t.pollutionGenerated,
  actualCapacityUtilizationPercent:spec.plants?t.pollutionTreated/(ticks*spec.plants*a.P.treatmentCapacityPerStep)*100:null,
  wetlands:s.cells.filter(c=>c.facility==='wetland').map(c=>({id:c.id,total:c.totalPurified,share:c.totalPurified/t.pollutionGenerated})),plants:[...plants.values()],reuseProduced:t.reuseProduced,reuseConsumed:t.reuseConsumed});
 return {result,rows};
}
if(process.argv[1]?.endsWith('pollution-balance-experiments.mjs')){
 const candidate={rate:.3,wetlandCap:1,treatmentCap:1.25};
 const cases=Object.fromEntries(Object.keys(balanceCases).map(k=>[k,runBalanceCase(k,candidate)]));
 const wetlandSweep=[];
 for(const rate of [.25,.3,.35])for(const wetlandCap of [.75,1,1.25]){
  const result={rate,wetlandCap};
  for(const key of ['B','C','D','J']){const r=runBalanceCase(key,{rate,wetlandCap,history:false}).result;result[key]={share:r.wetlandShare,outlet:r.outletPollutionMass};}
  wetlandSweep.push(result);
 }
 const treatmentSweep=[];
 for(const treatmentCap of [1,1.2,1.25,1.4,1.6]){
  const result={treatmentCap};
  for(const key of ['E','F','H','I']){const r=runBalanceCase(key,{treatmentCap,history:false}).result;result[key]={treatedShare:r.treatmentShare,utilization:r.maxUtilizationPercent,overload:r.maxOverloadPerStep};}
  treatmentSweep.push(result);
 }
 const densityProbe=[10,12,15,30].map(industry=>runBalanceCase('density',{...candidate,layout:{industry,plants:1,wetlands:0},history:false}).result);
 const data={candidate,cases,wetlandSweep,treatmentSweep,densityProbe};
 writeFileSync(new URL('./pollution-balance-results.json',import.meta.url),JSON.stringify(data,null,2));
 const summary={...data,cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,v.result]))};
 writeFileSync(new URL('./pollution-balance-summary.json',import.meta.url),JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary,null,2));
}
