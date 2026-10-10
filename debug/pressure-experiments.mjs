import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './engine-loader.mjs';

export const rainScenarios={
 normal:{name:'Scenario 1 一般降雨',schedule:[{weather:'light',ticks:20},{weather:'heavy',ticks:40},{weather:'sunny',ticks:240}]},
 strong:{name:'Scenario 2 強豪雨',schedule:[{weather:'storm',ticks:32},{weather:'sunny',ticks:360}]},
 extreme:{name:'Scenario 3 長時間極端豪雨',schedule:[{weather:'storm',ticks:16},{weather:'sunny',ticks:12},{weather:'storm',ticks:40},{weather:'sunny',ticks:12},{weather:'storm',ticks:60},{weather:'sunny',ticks:720}]},
};
export function greenCell(c){return c.buildable&&[1,4,6,8].includes(c.y)&&[0,3,5,7,9,11].includes(c.x);}
export function runCase(a,key,scenario){
 const s=a.createSimulation(key==='B'?'A':key,{initialState:'empty'});
 if(key==='B')for(const c of s.cells)if(greenCell(c))c.facility=[5,7].includes(c.x)?'park':'forest';
 const dt=a.B.timestepSeconds,rows=[],cells=s.cells.filter(c=>c.type!=='river').map(c=>({id:c.id,x:c.x+1,y:c.y+1,facility:c.facility,lowland:c.lowland,capacity:a.capacity(c),maxStorage:0,maxSurface:0,soil85:null,soil99:null,storage99:null,firstFlood:null,lastHarmfulTime:null}));
 const byId=new Map(cells.map(c=>[c.id,c]));
 const summary={case:key,scenario:scenario.name,firstHarmfulPonding:null,firstHarmfulFlooding:null,maxHarmfulPonding:0,maxHarmfulFlooding:0,maxHarmfulAffected:0,maxNonLowlandHarmfulFlooding:0,maxUrbanFlooding:0,maxCommonUrbanFlooding:0,maxFreeSurface:0,maxIntentionalStorage:0,firstRiverOver:null,riverPeak:0,riverPeakTime:null,outletPeak:0,outletPeakTime:null,floodPeakTime:null,harmfulFloodCellSeconds:0,commonUrbanFloodCellSeconds:0,totalBlocked:0,conservationError:0,lastRainTime:0};
 const footprint=new Set(),nonLowFootprint=new Set();
 let tick=0;
 for(const phase of scenario.schedule)for(let i=0;i<phase.ticks;i++){
  const rain=a.weatherConfig[phase.weather].intensity;a.step(s,rain);tick++;
  const t=tick*dt,st=s.stats,riverMax=Math.max(...st.river);
  if(rain>0)summary.lastRainTime=t;
  const common=s.cells.filter(c=>c.type!=='river'&&!greenCell(c)&&['residential','industrial','road'].includes(c.facility)&&a.status(c)==='淹水').length;
  const row={tick,time:t,weather:phase.weather,harmfulPonding:st.harmfulPonding,harmfulFlooding:st.harmfulFlooding,nonLowlandHarmfulFlooding:st.nonLowlandHarmfulFlooding,urbanFlooding:st.urbanFlooding,facilityOverflowFlooding:st.facilityOverflowFlooding,commonUrbanFlooding:common,freeSurface:st.freeSurface,intentionalStorage:st.intentionalStorage,riverMax,outlet:st.outlet,spill:st.riverSpill,blocked:st.blockedDrainage,wet:st.wet};
  rows.push(row);
  if(st.harmfulPonding+st.harmfulFlooding>0)summary.firstHarmfulPonding??=t;
  if(st.harmfulFlooding>0)summary.firstHarmfulFlooding??=t;
  if(riverMax>a.B.riverCapacity)summary.firstRiverOver??=t;
  for(const [field,value]of Object.entries({maxHarmfulPonding:st.harmfulPonding,maxHarmfulFlooding:st.harmfulFlooding,maxHarmfulAffected:st.harmfulPonding+st.harmfulFlooding,maxNonLowlandHarmfulFlooding:st.nonLowlandHarmfulFlooding,maxUrbanFlooding:st.urbanFlooding,maxCommonUrbanFlooding:common,maxFreeSurface:st.freeSurface,maxIntentionalStorage:st.intentionalStorage,riverPeak:riverMax,outletPeak:st.outlet})){
   if(value>summary[field]){summary[field]=value;if(field==='riverPeak')summary.riverPeakTime=t;if(field==='outletPeak')summary.outletPeakTime=t;if(field==='maxHarmfulFlooding')summary.floodPeakTime=t;}
  }
  summary.harmfulFloodCellSeconds+=st.harmfulFlooding*dt;summary.commonUrbanFloodCellSeconds+=common*dt;summary.totalBlocked+=st.blockedDrainage;
  const error=Math.abs(s.totals.rain-a.waterInventory(s)-s.totals.outflow);summary.conservationError=Math.max(summary.conservationError,error);
  for(const c of s.cells.filter(c=>c.type!=='river')){
   const rec=byId.get(c.id);rec.maxStorage=Math.max(rec.maxStorage,c.storage);rec.maxSurface=Math.max(rec.maxSurface,c.surface);
   if(c.soil/a.B.soilCapacity>=.85)rec.soil85??=t;if(c.soil/a.B.soilCapacity>=.99)rec.soil99??=t;
   if(rec.capacity&&c.storage/rec.capacity>=.99)rec.storage99??=t;
   if(['積水','淹水'].includes(a.status(c)))rec.lastHarmfulTime=t;
   if(a.status(c)==='淹水'){rec.firstFlood??=t;footprint.add(c.id);if(!c.lowland)nonLowFootprint.add(c.id);}
  }
 }
 const afterRain=rows.filter(r=>r.time>summary.lastRainTime);
 const lastAffected=afterRain.findLast(r=>r.harmfulPonding+r.harmfulFlooding>0);
 summary.retreatSeconds=lastAffected?(lastAffected===afterRain.at(-1)?null:lastAffected.time+dt-summary.lastRainTime):0;
 const lastFlood=afterRain.findLast(r=>r.harmfulFlooding>0);
 summary.floodRetreatSeconds=lastFlood?(lastFlood===afterRain.at(-1)?null:lastFlood.time+dt-summary.lastRainTime):0;
 summary.end=rows.at(-1);summary.floodFootprint=[...footprint];summary.nonLowlandFloodFootprint=[...nonLowFootprint];
 const nonLowTimes=cells.filter(c=>!c.lowland&&c.firstFlood!==null).map(c=>c.firstFlood);
 summary.firstNonLowlandHarmfulFlooding=nonLowTimes.length?Math.min(...nonLowTimes):null;
 summary.lowlandComparison=Object.fromEntries([true,false].map(low=>{
  const cs=cells.filter(c=>c.lowland===low),times=cs.map(c=>c.lastHarmfulTime).filter(v=>v!==null&&v>summary.lastRainTime);
  return [low?'lowland':'nonLowland',{averageMaximumFreeWater:cs.reduce((n,c)=>n+c.maxSurface,0)/cs.length,retreatSeconds:times.length?Math.max(...times)+dt-summary.lastRainTime:0}];
 }));
 summary.facilityCounts=Object.fromEntries(Object.keys(a.F).map(f=>[f,cells.filter(c=>c.facility===f).length]));
 summary.saturation=Object.fromEntries(Object.keys(a.F).filter(f=>cells.some(c=>c.facility===f&&(c.capacity||a.F[f].infiltration))).map(f=>{
  const records=cells.filter(c=>c.facility===f);const span=k=>{const values=records.map(c=>c[k]).filter(v=>v!==null);return {count:values.length,first:values.length?Math.min(...values):null,last:values.length?Math.max(...values):null};};
  return [f,{count:records.length,storage99:span('storage99'),soil85:span('soil85'),soil99:span('soil99'),maxStorage:Math.max(...records.map(c=>c.maxStorage)),capacity:records[0].capacity}];
 }));
 return {summary,cells,rows};
}

export function runAll(overrides={}){
 const a=loadEngine();Object.assign(a.B,overrides);
 return Object.fromEntries(Object.entries(rainScenarios).map(([name,scenario])=>[name,Object.fromEntries(['A','B','C','D','ordinary'].map(key=>[key,runCase(a,key,scenario)]))]));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const results=runAll();
 writeFileSync(new URL('./pressure-results.json',import.meta.url),JSON.stringify({config:loadEngine().B,scenarios:rainScenarios,results},null,2));
 const fields=['time','weather','harmfulPonding','harmfulFlooding','nonLowlandHarmfulFlooding','urbanFlooding','facilityOverflowFlooding','commonUrbanFlooding','freeSurface','intentionalStorage','riverMax','outlet','blocked','wet'];
 writeFileSync(new URL('./pressure-history.csv',import.meta.url),'scenario,case,'+fields.join(',')+'\n'+Object.entries(results).flatMap(([name,cases])=>Object.entries(cases).flatMap(([key,r])=>r.rows.map(row=>[name,key,...fields.map(f=>row[f])].join(',')))).join('\n')+'\n');
 console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([name,cases])=>[name,Object.fromEntries(Object.entries(cases).map(([k,r])=>[k,r.summary]))])),null,2));
}
