import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
export function runWetlandCase(key,{rate,cap,detention=13,treatmentCap,file,industrialCount=12,ticks=240,rain=.24}={}){
 const a=loadEngine(file,{pollutionEnabled:true});
 if('wetlandPurificationRate' in a.P){if(rate!==undefined)a.P.wetlandPurificationRate=rate;a.P.wetlandDetentionCapacity=detention;}
 if(cap!==undefined)a.P.wetlandPurificationCapacity=cap;
 if(treatmentCap!==undefined)a.P.treatmentCapacityPerStep=treatmentCap;
 const s=a.createSimulation('blank');
 for(const c of s.cells.filter(c=>c.buildable&&c.y<3).sort((x,y)=>x.id-y.id).slice(0,industrialCount))a.placeFacility(s,c.id,'industrial');
 if(['B','C','E'].includes(key))a.placeFacility(s,53,'wetland');
 if(key==='C')a.placeFacility(s,77,'wetland');
 if(['D','E'].includes(key))a.placeFacility(s,113,'treatment');
 const result={case:'WET-'+key,industrialCount,rate:a.P.wetlandPurificationRate??null,cap:a.P.wetlandPurificationCapacity,detention:a.capacity({facility:'wetland'}),peakConcentration:0,peakDownstreamConcentration:0,maxWaterError:0,maxPollutionError:0,maxHarmfulFlood:0,maxStorage:0},rows=[];
 for(let i=0;i<ticks;i++){
  a.step(s,rain);const lower=s.cells.find(c=>c.type==='river'&&c.y===9);
  result.peakConcentration=Math.max(result.peakConcentration,s.pollution.stats.concentration);
  result.peakDownstreamConcentration=Math.max(result.peakDownstreamConcentration,a.pollutionConcentration(lower));
  result.maxWaterError=Math.max(result.maxWaterError,Math.abs(a.supplyMassError(s)));
  result.maxPollutionError=Math.max(result.maxPollutionError,Math.abs(a.pollutionMassError(s)));
  result.maxHarmfulFlood=Math.max(result.maxHarmfulFlood,s.stats.harmfulFlooding);
  result.maxStorage=Math.max(result.maxStorage,s.cells.filter(c=>c.facility==='wetland').reduce((n,c)=>n+c.storage,0));
  rows.push({time:s.tick/2,outletLoad:lower.pollutionLoad,outletConcentration:a.pollutionConcentration(lower),purified:s.pollution.totals.pollutionPurified,wetlands:s.cells.filter(c=>c.facility==='wetland').map(c=>({id:c.id,last:c.lastPurified,total:c.totalPurified,storage:c.storage}))});
 }
 const t=s.pollution.totals;
 Object.assign(result,{pollutionGenerated:t.pollutionGenerated,pollutionTreated:t.pollutionTreated,pollutionPurifiedByWetland:t.pollutionPurified,pollutionDischarged:t.pollutionDischarged,outletPollutionMass:t.pollutionOutflow,finalRiverPollution:s.pollution.stats.pollutionInRiver,finalDownstreamConcentration:a.pollutionConcentration(s.cells.find(c=>c.type==='river'&&c.y===9)),quality:s.pollution.stats.status,wetlandShare:t.pollutionPurified/t.pollutionGenerated,treatmentShare:t.pollutionTreated/t.pollutionGenerated,wetlands:rows.at(-1).wetlands});
 return {result,rows};
}
if(process.argv[1]?.endsWith('wetland-experiments.mjs')){
 const cases=Object.fromEntries(['A','B','C','D','E'].map(k=>[k,runWetlandCase(k)]));
 const prior=Object.fromEntries(['B','C'].map(k=>[k,runWetlandCase(k,{file:new URL('../checkpoints/prototype-1b-before-1b1/water-resilience-p0.html',import.meta.url)})]));
 const sweep=[];
 for(const rate of [.2,.25,.3])for(const cap of [.5,.75,1]){
  const one=runWetlandCase('B',{rate,cap}).result,two=runWetlandCase('C',{rate,cap}).result;
  const stress=runWetlandCase('B',{rate,cap,industrialCount:30}).result;
  sweep.push({rate,cap,oneShare:one.wetlandShare,twoShare:two.wetlandShare,stressShare:stress.wetlandShare,stressOutflow:stress.outletPollutionMass});
 }
 const detentionSweep=[9,12,13,14].map(detention=>runWetlandCase('C',{detention,rain:.6}).result);
 const data={cases,prior,sweep,detentionSweep};
 writeFileSync(new URL('./wetland-results.json',import.meta.url),JSON.stringify(data,null,2));
 writeFileSync(new URL('./wetland-summary.json',import.meta.url),JSON.stringify({...data,cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,v.result])),prior:Object.fromEntries(Object.entries(prior).map(([k,v])=>[k,v.result]))},null,2));
 console.log(JSON.stringify({cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,v.result])),sweep,detentionSweep},null,2));
}
