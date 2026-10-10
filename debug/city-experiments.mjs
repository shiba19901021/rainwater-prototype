import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
export function runCity(key,mode){
 const a=loadEngine(undefined,{pollutionEnabled:true}),s=a.createSimulation(key),initial=a.cityNeeds(s);
 const counts={};for(const c of s.cells.filter(c=>c.buildable&&c.facility!=='empty'))counts[c.facility]=(counts[c.facility]||0)+1;
 const buildable=s.cells.filter(c=>c.buildable).length,used=Object.values(counts).reduce((n,c)=>n+c,0),round=mode==='normal'?a.createRound(120,'auto'):null,ticks=round?240:480;
 const r={case:key,mode,durationSeconds:ticks*a.B.timestepSeconds,city:initial,counts,used,free:buildable-used,landPercent:used/buildable*100,demandPerStep:s.supply.demand,firstShortage:null,maxShortage:0,infiltrated:0,maxFlooding:0,maxWaterError:0,maxPollutionError:0,worstQuality:'良好'};
 const quality=['良好','受壓','污染','嚴重污染'];
 for(let i=0;i<ticks;i++){
  if(round)a.advanceRound(round,s);else {const rain=mode==='dry'?0:i<120?.12:i<240?.38:i<360?.72:.12;a.step(s,rain);}
  if(s.supply.shortage>1e-8)r.firstShortage??=s.tick*a.B.timestepSeconds;
  r.maxShortage=Math.max(r.maxShortage,s.supply.shortage/s.supply.demand||0);r.infiltrated+=s.stats.infiltrated;r.maxFlooding=Math.max(r.maxFlooding,s.stats.harmfulFlooding);
  r.maxWaterError=Math.max(r.maxWaterError,Math.abs(a.supplyMassError(s)));r.maxPollutionError=Math.max(r.maxPollutionError,Math.abs(a.pollutionMassError(s)));
  if(quality.indexOf(s.pollution.stats.status)>quality.indexOf(r.worstQuality))r.worstQuality=s.pollution.stats.status;
 }
 r.pollutionGenerated=s.pollution.totals.pollutionGenerated;r.outletPollution=s.pollution.totals.pollutionOutflow;r.finalCity=a.cityNeeds(s);return r;
}
if(process.argv[1]?.endsWith('city-experiments.mjs')){
 const results=['CITY-A','CITY-B','CITY-C','CITY-D','CITY-E','CITY-F'].flatMap(k=>['normal','wet','dry'].map(mode=>runCity(k,mode)));
 writeFileSync(new URL('./city-results.json',import.meta.url),JSON.stringify(results,null,2));
 console.table(results.map(r=>({case:r.case,weather:r.mode,city:r.city.status,land:r.used,demand:r.demandPerStep,pollution:+r.pollutionGenerated.toFixed(2),short:r.firstShortage,infiltrated:+r.infiltrated.toFixed(2),flood:r.maxFlooding,quality:r.worstQuality})));
}
