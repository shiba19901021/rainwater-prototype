import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
import {rainScenarios,runCase} from './pressure-experiments.mjs';
export function runWaterCase(key){
 const a=loadEngine(),s=a.createSimulation(key),rows=[];
 const result={case:key,demand:s.supply.demand,firstShortage:null,firstCritical:null,storageEmpty:null,intakeStopped:null,recovered:null,floodAfterRecovery:null,maxMassError:0,initialStorage:s.supply.reserve,initialRiver:s.stats.river.reduce((n,v)=>n+v,0),municipalUsed:0,riverUsed:0,reservoirUsed:0};
 for(let i=0;i<530;i++){
  const weather=key==='W6'?a.scheduledWeather(i,a.droughtRecoveryWeather).key:'sunny';
  a.step(s,a.weatherConfig[weather].intensity);
  const u=s.supply,t=(i+1)*a.B.timestepSeconds;
  if(u.shortage>1e-8)result.firstShortage??=t;
  if(u.status==='危急')result.firstCritical??=t;
  if(result.initialStorage>0&&u.reserve<.001)result.storageEmpty??=t;
  if(['W4','W5','W6'].includes(key)&&s.cells.filter(c=>c.facility==='intake').every(c=>c.intakeBlocked))result.intakeStopped??=t;
  if(key==='W6'&&i>=180&&u.status==='充足'&&u.shortage<1e-8)result.recovered??=t;
  if(result.recovered&&s.stats.harmfulFlooding>0)result.floodAfterRecovery??=t;
  result.maxMassError=Math.max(result.maxMassError,Math.abs(a.supplyMassError(s)));
  result.municipalUsed+=u.municipal;result.riverUsed+=u.river;result.reservoirUsed+=u.reservoir;
  rows.push({case:key,tick:s.tick,time:t,weather,...u,riverWater:s.stats.river.reduce((n,v)=>n+v,0),flooding:s.stats.harmfulFlooding,massError:a.supplyMassError(s)});
 }
 result.finalStatus=s.supply.status;result.finalStorage=s.supply.reserve;result.finalRiver=s.stats.river.reduce((n,v)=>n+v,0);
 return {result,rows};
}
export function compareFlood(){
 const old=loadEngine(new URL('../checkpoints/prototype-0.5/water-resilience-p0.html',import.meta.url)),current=loadEngine();
 return Object.entries(rainScenarios).flatMap(([scenario,config])=>['A','B','C','D'].map(city=>{
  const before=runCase(old,city,config).summary,after=runCase(current,city,config).summary;
  return {scenario,city,beforePeak:before.maxHarmfulFlooding,afterPeak:after.maxHarmfulFlooding,beforeRiver:before.riverPeak,afterRiver:after.riverPeak,beforeExposure:before.harmfulFloodCellSeconds,afterExposure:after.harmfulFloodCellSeconds,massError:after.conservationError};
 }));
}
if(process.argv[1]?.endsWith('supply-experiments.mjs')){
 const runs=['W1','W2','W3','W4','W5','W6'].map(runWaterCase),flood=compareFlood();
 writeFileSync(new URL('./supply-results.json',import.meta.url),JSON.stringify({water:runs.map(r=>r.result),flood},null,2));
 const rows=runs.flatMap(r=>r.rows),keys=Object.keys(rows[0]);
 writeFileSync(new URL('./supply-history.csv',import.meta.url),keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n'));
 console.log(JSON.stringify({water:runs.map(r=>r.result),flood},null,2));
}
