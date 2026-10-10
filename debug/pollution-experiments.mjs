import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
import {rainScenarios,greenCell} from './pressure-experiments.mjs';
export function runPollutionCase(key,{rain=.24,ticks=240,removePlant=false,removeWetland=false,development=false,qualityProbe=false}={}){
 const a=loadEngine(undefined,{pollutionEnabled:true}),s=a.createSimulation(development?'P3':key),rows=[];
 if(removePlant)for(const c of s.cells.filter(c=>c.facility==='treatment'))a.placeFacility(s,c.id,'empty');
 if(removeWetland)for(const c of s.cells.filter(c=>c.facility==='wetland'))a.placeFacility(s,c.id,'empty');
 const result={case:key,rain,ticks,firstPollution:null,firstSevere:null,firstShortage:null,plantOverload:null,firstUpper:null,firstLower:null,firstIntake:null,firstQualityBlocked:null,maxConcentration:0,maxFlood:0,maxWaterError:0,maxPollutionError:0};
 if(qualityProbe)s.supply.municipalSupplyLevel=.4; // Controlled partial supply to expose quality-driven actual intake.
 for(let i=0;i<ticks;i++){
  if(development&&i===60)for(const c of s.cells)if(c.buildable&&c.facility==='empty')a.placeFacility(s,c.id,'industrial');
  a.step(s,rain);const p=s.pollution,st=p.stats,t=s.tick*a.B.timestepSeconds;
  if(st.status==='污染'||st.status==='嚴重污染')result.firstPollution??=t;
  if(st.status==='嚴重污染')result.firstSevere??=t;
  if(s.supply.shortage>1e-8)result.firstShortage??=t;
  if(s.cells.some(c=>c.treatmentStatus==='超量'))result.plantOverload??=t;
  if(s.cells.find(c=>c.type==='river'&&c.y===0).pollutionLoad>1e-8)result.firstUpper??=t;
  if(s.cells.find(c=>c.type==='river'&&c.y===9).pollutionLoad>1e-8)result.firstLower??=t;
  if(s.supply.river>1e-8)result.firstIntake??=t;
  if(s.cells.some(c=>c.facility==='intake'&&c.intakeQualityBlocked))result.firstQualityBlocked??=t;
  result.maxConcentration=Math.max(result.maxConcentration,st.concentration);result.maxFlood=Math.max(result.maxFlood,s.stats.harmfulFlooding);
  result.maxWaterError=Math.max(result.maxWaterError,Math.abs(a.supplyMassError(s)));result.maxPollutionError=Math.max(result.maxPollutionError,Math.abs(a.pollutionMassError(s)));
  rows.push({time:t,generated:st.generated,treated:st.treated,untreated:st.untreated,riverLoad:st.pollutionInRiver,concentration:st.concentration,quality:st.status,reuse:s.supply.reuse,shortage:s.supply.shortage,riverIntake:s.supply.river,riverWater:s.stats.river.reduce((n,v)=>n+v,0),segments:s.cells.filter(c=>c.type==='river').map(c=>({y:c.y,water:c.surface,load:c.pollutionLoad,concentration:a.pollutionConcentration(c),intakeFactor:a.intakeQualityFactor(c)}))});
 }
 Object.assign(result,{finalQuality:s.pollution.stats.status,finalConcentration:s.pollution.stats.concentration,finalRiverPollution:s.pollution.stats.pollutionInRiver,pollutionGenerated:s.pollution.totals.pollutionGenerated,pollutionTreated:s.pollution.totals.pollutionTreated,pollutionDischarged:s.pollution.totals.pollutionDischarged,pollutionPurified:s.pollution.totals.pollutionPurified,pollutionOutflow:s.pollution.totals.pollutionOutflow,reuseProduced:s.pollution.totals.reuseProduced,reuseUsed:s.pollution.totals.reuseConsumed,municipalUsed:s.totals.municipalInput,riverUsed:s.supply.river,finalShortage:s.supply.shortage,finalReuseStock:s.pollution.reuseWater});
 return {result,rows};
}
export function compareEnabledFlood(){
 const data=[];
 for(const [name,scenario] of Object.entries(rainScenarios))for(const city of ['A','B','C','D']){
  const a=loadEngine(undefined,{pollutionEnabled:true}),baseline=a.createSimulation(city==='B'?'A':city,{initialState:'empty',pollutionEnabled:false}),enabled=a.createSimulation(city==='B'?'A':city,{initialState:'empty'});
  if(city==='B')for(const s of [baseline,enabled])for(const c of s.cells)if(greenCell(c))c.facility=[5,7].includes(c.x)?'park':'forest';
  let before=0,after=0,maxError=0,maxPollutionError=0;
  for(const phase of scenario.schedule)for(let i=0;i<phase.ticks;i++){
   const rain=a.weatherConfig[phase.weather].intensity;a.step(baseline,rain);a.step(enabled,rain);
   before=Math.max(before,baseline.stats.harmfulFlooding);after=Math.max(after,enabled.stats.harmfulFlooding);
   maxError=Math.max(maxError,Math.abs(a.supplyMassError(enabled)));maxPollutionError=Math.max(maxPollutionError,Math.abs(a.pollutionMassError(enabled)));
  }
  data.push({scenario:name,city,moduleOffPeak:before,moduleOnPeak:after,maxWaterError:maxError,maxPollutionError});
 }
 return data;
}
export function runPollutionCases(){return {
 P1:runPollutionCase('P1'),P2:runPollutionCase('P2'),P3:runPollutionCase('P3'),P4:runPollutionCase('P4',{development:true}),
 P5:{withWetland:runPollutionCase('P5'),withoutWetland:runPollutionCase('P5',{removeWetland:true})},
 P6:runPollutionCase('P6',{rain:.38,ticks:100,qualityProbe:true}),
 P7:{dry:runPollutionCase('P7',{rain:0}),rain:runPollutionCase('P7',{rain:.38})},
 P8:{withReuse:runPollutionCase('P8',{rain:0,ticks:480}),withoutReuse:runPollutionCase('P8',{rain:0,ticks:480,removePlant:true})}
};}
if(process.argv[1]?.endsWith('pollution-experiments.mjs')){
 const cases=runPollutionCases(),flood=compareEnabledFlood();
 writeFileSync(new URL('./pollution-results.json',import.meta.url),JSON.stringify({cases,flood},null,2));
 const summaries=Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,v.result||Object.fromEntries(Object.entries(v).map(([name,run])=>[name,run.result]))]));
 console.log(JSON.stringify({cases:summaries,flood},null,2));
}
