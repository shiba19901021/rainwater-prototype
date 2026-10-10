import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
export const functionEngine=()=>loadEngine(undefined,{pollutionEnabled:true,cityResilienceEnabled:true});
export function runPhysicalFunctionCase(key,{duration=150,mode='compound',tailSeconds=180,tailRain=.12}={}){
 const a=functionEngine(),s=a.createSimulation(key),r=a.createRound(duration,mode),history=[];
 const result={case:key,duration,mode,tailRain,minimum:{housing:1,jobs:1,publicService:1},minimumCityFunctionRatio:1,firstDecline:null,pressureCleared:null,recovery80:null,recovery95:null,fullRecovery:null,maxWaterError:0,maxPollutionError:0,maxFlooding:0};
 let hadPressure=false,lastPressure=null;
 for(let i=0;i<(duration+tailSeconds)/a.B.timestepSeconds;i++){
  if(r.state!=='finished')a.advanceRound(r,s);else a.step(s,tailRain); // Diagnostic recovery tail only, never changes formal weather stories.
  const t=s.tick*a.B.timestepSeconds,city=a.cityNeeds(s),active=s.cells.some(c=>a.CR.affectedFacilities.includes(c.facility)&&c.pressureActive);
  for(const k of Object.keys(result.minimum))result.minimum[k]=Math.min(result.minimum[k],city.ratios[k]);
  result.minimumCityFunctionRatio=Math.min(result.minimumCityFunctionRatio,city.cityFunctionRatio);
  if(city.cityFunctionRatio<1-1e-9)result.firstDecline??=t;
  if(active){hadPressure=true;lastPressure=t;result.pressureCleared=result.recovery80=result.recovery95=result.fullRecovery=null;}
  else if(hadPressure){result.pressureCleared??=t;if(city.cityFunctionRatio>=.8-1e-9)result.recovery80??=t;if(city.cityFunctionRatio>=.95-1e-9)result.recovery95??=t;if(city.cityFunctionRatio>=1-1e-9)result.fullRecovery??=t;}
  result.maxWaterError=Math.max(result.maxWaterError,Math.abs(a.supplyMassError(s)));result.maxPollutionError=Math.max(result.maxPollutionError,Math.abs(a.pollutionMassError(s)));result.maxFlooding=Math.max(result.maxFlooding,s.stats.harmfulFlooding);
  history.push({time:t,ratios:city.ratios,nominal:city.nominal,effective:city.effective,status:city.status,active,multiplier:s.resilience.recoveryMultiplier,shortage:s.supply.shortage/demand(s),flooded:s.stats.harmfulFlooding});
 }
 result.lastPressure=lastPressure;result.finalCity=a.cityNeeds(s);return {result,history};
}
function demand(s){return Math.max(1e-12,s.supply.demand);}
// Isolated read-only observer controls. Inputs are held at known pressure levels;
// these do not claim to be hydrological simulations or mass-ledger experiments.
export function runControlledFunctionCase(key){
 const a=functionEngine(),s=a.createSimulation(key==='FUNC-E2'?'FUNC-E2':key==='FUNC-D'?'FUNC-D':'CITY-C');
 for(const c of s.cells)c.surface=0;
 a.initCityResilience(s);const damaged=s.cells.filter(c=>c.facility===(key==='FUNC-B'?'residential':'industrial')).slice(0,3);
 if(key==='FUNC-F')damaged.push(...s.cells.filter(c=>c.facility==='publicService').slice(0,2));
 const history=[];let firstRecovery=null,fullFacilityRecovery=null;
 for(let tick=0;tick<180;tick++){
  for(const c of s.cells){c.surface=0;c.waterShortage=0;}
  if(tick<20&&key!=='FUNC-A'){
   if(key==='FUNC-D')for(const c of s.cells)c.waterShortage=.7;
   else for(const c of damaged)c.surface=a.thresholds(c).flooding*2;
  }
  a.updateCityResilience(s);const time=(tick+1)*a.B.timestepSeconds,city=a.cityNeeds(s);
  if(tick>=20&&key!=='FUNC-A')firstRecovery??=time;
  if(key!=='FUNC-A'&&tick>=20&&s.cells.every(c=>!a.CR.affectedFacilities.includes(c.facility)||c.currentFunctionFactor===1))fullFacilityRecovery??=time;
  history.push({time,ratios:city.ratios,effective:city.effective,status:city.status,multiplier:s.resilience.recoveryMultiplier,factors:Object.fromEntries(s.cells.filter(c=>a.CR.affectedFacilities.includes(c.facility)).map(c=>[c.id,{type:c.facility,factor:c.currentFunctionFactor,state:c.damageState,progress:c.recoveryProgress}]))});
 }
 return {case:key,kind:'controlled pressure observer',pressureRemovedAt:10,firstRecovery,fullFacilityRecovery,minRatios:Object.fromEntries(['housing','jobs','publicService'].map(k=>[k,Math.min(...history.map(h=>h.ratios[k]))])),history};
}
if(process.argv[1]?.endsWith('function-experiments.mjs')){
 const controlled=['FUNC-A','FUNC-B','FUNC-C','FUNC-D','FUNC-E1','FUNC-E2','FUNC-F'].map(runControlledFunctionCase);
 const physical=['FUNC-G','FUNC-H'].map(key=>runPhysicalFunctionCase(key));
 const physicalNormal=runPhysicalFunctionCase('FUNC-A',{duration:60,mode:'dry',tailSeconds:0});
 const physicalDrought=runPhysicalFunctionCase('FUNC-D',{duration:120,mode:'dry',tailRain:.24});
 const extended=[180,240].flatMap(duration=>['FUNC-G','FUNC-H'].map(key=>runPhysicalFunctionCase(key,{duration})));
 writeFileSync(new URL('./function-results.json',import.meta.url),JSON.stringify({controlled,physical,physicalNormal,physicalDrought,extended},null,2));
 console.table(controlled.map(r=>({case:r.case,housing:r.minRatios.housing,jobs:r.minRatios.jobs,public:r.minRatios.publicService,full:r.fullFacilityRecovery})));
 console.table(physical.map(r=>({...r.result,minimum:JSON.stringify(r.result.minimum),finalCity:undefined})));
}
