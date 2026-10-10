import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
export function makeCity(a,storage=false){
 const s=a.createSimulation(storage?'W3':'W2');
 for(const c of s.cells)if(c.facility==='industrial')c.facility='residential';
 return a.initializeNormalWater(s);
}
export function diagnose(label,storage,schedule){
 const a=loadEngine(),s=makeCity(a,storage),rows=[],result={case:label,initialReserve:s.supply.reserve,initialRiver:s.stats.river.reduce((n,v)=>n+v,0),initialSoil:s.stats.wet,firstSupplyDecay:null,firstBackupUse:null,firstShortage:null,firstSevere:null,recovery:null,maxMassError:0};
 for(const [seconds,rain] of schedule)for(let i=0;i<seconds/a.B.timestepSeconds;i++){
  a.step(s,rain);const time=s.tick*a.B.timestepSeconds,u=s.supply;
  if(u.municipalSupplyLevel<1-1e-10)result.firstSupplyDecay??=time;
  if(u.reservoir>1e-8)result.firstBackupUse??=time;
  if(u.shortage>1e-8)result.firstShortage??=time;
  if(u.shortage/u.demand>=.5)result.firstSevere??=time;
  if(result.firstShortage&&u.shortage<1e-8)result.recovery??=time;
  result.maxMassError=Math.max(result.maxMassError,Math.abs(a.supplyMassError(s)));
  rows.push({time,rain,stress:u.droughtStress,municipal:u.municipalSupplyLevel,reserve:u.reserve,shortage:u.shortage,backup:u.reservoir,river:s.stats.river.reduce((n,v)=>n+v,0)});
 }
 return {result:{...result,finalReserve:s.supply.reserve,finalStress:s.supply.droughtStress,finalSupply:s.supply.municipalSupplyLevel},rows};
}
export function diagnoseW6(duration=150){
 const a=loadEngine(),s=a.createSimulation('W6'),r=a.createRound(duration,'compound'),rows=[];
 const result={case:'S5 W6',duration,firstSupplyDecay:null,firstBackupUse:null,firstShortage:null,recovery:null,statusRecovery:null,storageRefill:null,fullStorage:null,firstFlood:null,maxMassError:0};let minimum=s.supply.reserve;
 while(r.state!=='finished'){
  a.advanceRound(r,s);const time=r.tick*a.B.timestepSeconds,u=s.supply;
  if(u.municipalSupplyLevel<1-1e-10)result.firstSupplyDecay??=time;
  if(u.reservoir>1e-8)result.firstBackupUse??=time;
  if(u.shortage>1e-8)result.firstShortage??=time;
  if(result.firstShortage&&u.shortage<1e-8)result.recovery??=time;
  if(result.firstShortage&&u.status==='充足')result.statusRecovery??=time;
  if(result.firstShortage&&u.reserve>minimum+.1)result.storageRefill??=time;
  minimum=Math.min(minimum,u.reserve);
  if(u.reserve>=s.cells.filter(c=>c.facility==='reservoir').reduce((n,c)=>n+a.capacity(c),0)-1e-6)result.fullStorage??=time;
  if(result.recovery&&s.stats.harmfulFlooding>0)result.firstFlood??=time;
  result.maxMassError=Math.max(result.maxMassError,Math.abs(a.supplyMassError(s)));
  rows.push({time,rain:a.weatherAtRoundTick(r,Math.max(0,r.tick-1)).intensity,stress:u.droughtStress,municipal:u.municipalSupplyLevel,reserve:u.reserve,shortage:u.shortage,flood:s.stats.harmfulFlooding});
 }
 return {result,rows};
}
export function runOpeningCases(){return [diagnose('S1 無儲水',false,[[180,0]]),diagnose('S2 有儲水',true,[[180,0]]),diagnose('S3 短晴後小雨',true,[[25,0],[60,.12]]),diagnose('S4 長期乾旱',true,[[300,0]]),diagnoseW6()];}
if(process.argv[1]?.endsWith('opening-experiments.mjs')){
 const cases=runOpeningCases();writeFileSync(new URL('./opening-results.json',import.meta.url),JSON.stringify(cases,null,2));console.log(JSON.stringify(cases.map(c=>c.result),null,2));
}
