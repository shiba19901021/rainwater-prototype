// Development-only diagnostics. Reads the delivered engine; never writes to it.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=readFileSync(path.join(root,'debug/prototype-before-pressure.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const engine=script.slice(script.indexOf('// config/facilities.js'),script.indexOf('// ui/renderer.js'));
const ctx=vm.createContext({});
vm.runInContext(engine+';globalThis.api={createSimulation,step,capacity,status,thresholds,mapData,F,B,weatherConfig,continuousWeather,scheduledWeather,waterInventory};',ctx);
const a=ctx.api;
const dt=a.B.timestepSeconds;
const schedule=Array.from(a.continuousWeather,p=>({...p}));
const ticks=schedule.reduce((n,p)=>n+p.ticks,0);
const time=t=>t*dt;
function run(key,scheduleOverride=schedule,configure=null){
 const s=a.createSimulation(key), history=[], footprints={ponded:new Set(),flooded:new Set(),nonLowFlooded:new Set()};
 if(configure)configure(s);
 const records=s.cells.filter(c=>c.type!=='river').map(c=>({id:c.id,x:c.x+1,y:c.y+1,lowland:c.lowland,facility:c.facility,capacity:a.capacity(c),maxStorage:0,maxSurface:0,firstPond:null,firstFlood:null,firstSoil85:null,firstSoil99:null,firstStorage95:null,firstStorage99:null,totalRain:0,totalUpstream:0,totalInfiltration:0,totalDischarge:0,soilMax:0}));
 const recs=new Map(records.map(r=>[r.id,r]));
 const summary={key,firstPond:null,firstFlood:null,maxPond:0,maxFlood:0,maxAffected:0,maxNonLowFlood:0,maxFloodedBuildings:0,affectedCellSeconds:0,floodCellSeconds:0,maxLandSurface:0,maxCellSurface:0,maxRiverTotal:0,maxRiverCell:0,maxOutlet:0,maxSpill:0,totalSpill:0,maxFacilityStorage:0,maxStorageByType:{},firstRiverOver:null};
 const n=scheduleOverride.reduce((v,p)=>v+p.ticks,0);
 for(let tick=0;tick<n;tick++){
  const weather=a.scheduledWeather(tick,scheduleOverride).key, rain=a.weatherConfig[weather].intensity;
  a.step(s,rain);const t=time(s.tick),land=s.cells.filter(c=>c.type!=='river'),river=s.cells.filter(c=>c.type==='river');
  let lowPond=0,nonLowPond=0,lowFlood=0,nonLowFlood=0;
  const sums={};
  for(const c of land){
   const r=recs.get(c.id);r.maxSurface=Math.max(r.maxSurface,c.surface);r.maxStorage=Math.max(r.maxStorage,c.storage);r.soilMax=Math.max(r.soilMax,c.soil);
   r.totalRain+=rain;r.totalInfiltration+=c.lastInfiltration;r.totalDischarge+=c.lastFlow;
   r.totalUpstream+=s.cells.filter(p=>p.flowTo===c.id).reduce((v,p)=>v+p.lastFlow,0)+s.cells.filter(p=>p.type==='river'&&p.banks.includes(c.id)).reduce((v,p)=>v+p.lastSpill/p.banks.length,0);
   const st=a.status(c);if(st==='積水'){r.firstPond??=t;footprints.ponded.add(c.id);c.lowland?lowPond++:nonLowPond++;}
   if(st==='淹水'){r.firstFlood??=t;footprints.flooded.add(c.id);if(c.lowland)lowFlood++;else{nonLowFlood++;footprints.nonLowFlooded.add(c.id);}}
   if(c.soil/a.B.soilCapacity>=.85)r.firstSoil85??=t;
   if(c.soil/a.B.soilCapacity>=.99)r.firstSoil99??=t;
   if(r.capacity&&c.storage/r.capacity>=.95)r.firstStorage95??=t;
   if(r.capacity&&c.storage/r.capacity>=.99)r.firstStorage99??=t;
   sums[c.facility]=(sums[c.facility]||0)+c.storage;
  }
  const row={tick:s.tick,time:t,weather,pond:s.stats.ponding,flood:s.stats.flooding,lowPond,nonLowPond,lowFlood,nonLowFlood,floodedBuildings:land.filter(c=>['residential','industrial'].includes(c.facility)&&a.status(c)==='淹水').length,landSurface:land.reduce((v,c)=>v+c.surface,0),maxCellSurface:Math.max(...land.map(c=>c.surface)),riverTotal:river.reduce((v,c)=>v+c.surface,0),riverMax:Math.max(...river.map(c=>c.surface)),outlet:s.stats.outlet,spill:s.stats.riverSpill,storage:s.stats.storage,wet:s.stats.wet,rain:s.totals.rain,inventory:a.waterInventory(s),outflow:s.totals.outflow,riverSegments:river.map(c=>c.surface)};
  history.push(row);
  if(row.pond+row.flood>0)summary.firstPond??=t;
  if(row.flood>0)summary.firstFlood??=t;
  if(row.riverMax>a.B.riverCapacity)summary.firstRiverOver??=t;
  summary.affectedCellSeconds+=(row.pond+row.flood)*dt;summary.floodCellSeconds+=row.flood*dt;
  for(const [field,value] of Object.entries({maxPond:row.pond,maxFlood:row.flood,maxAffected:row.pond+row.flood,maxNonLowFlood:nonLowFlood,maxFloodedBuildings:row.floodedBuildings,maxLandSurface:row.landSurface,maxCellSurface:row.maxCellSurface,maxRiverTotal:row.riverTotal,maxRiverCell:row.riverMax,maxOutlet:row.outlet,maxSpill:row.spill,maxFacilityStorage:row.storage})){
   if(value>summary[field]){summary[field]=value;summary[field+'Time']=t;}
  }
  for(const [type,value]of Object.entries(sums))summary.maxStorageByType[type]=Math.max(summary.maxStorageByType[type]||0,value);
  summary.totalSpill+=row.spill;
 }
 summary.totalRain=s.totals.rain;summary.end=history.at(-1);summary.conservationError=s.totals.rain-a.waterInventory(s)-s.totals.outflow;
 summary.footprints=Object.fromEntries(Object.entries(footprints).map(([k,v])=>[k,Array.from(v)]));
 summary.facilityCounts=Object.fromEntries(Object.keys(a.F).map(k=>[k,records.filter(r=>r.facility===k).length]));
 summary.totalCapacity=records.reduce((v,r)=>v+r.capacity,0);
 summary.saturation=Object.fromEntries(Object.keys(a.F).filter(k=>records.some(r=>r.facility===k)).map(k=>{
  const rs=records.filter(r=>r.facility===k);const times=field=>rs.map(r=>r[field]).filter(v=>v!==null);
  return [k,{count:rs.length,soil85First:times('firstSoil85').length?Math.min(...times('firstSoil85')):null,soil85Count:times('firstSoil85').length,soil99First:times('firstSoil99').length?Math.min(...times('firstSoil99')):null,soil99Count:times('firstSoil99').length,storage95First:times('firstStorage95').length?Math.min(...times('firstStorage95')):null,storage95Count:times('firstStorage95').length,storage99First:times('firstStorage99').length?Math.min(...times('firstStorage99')):null,storage99Count:times('firstStorage99').length}];
 }));
 summary.checkpoints=history.filter(r=>[16,28,68,80,140,260].includes(r.tick));
 return {summary,records,history};
}
const runs=Object.fromEntries(['A','B','C','D'].map(k=>[k,run(k)]));
const short=Object.fromEntries(['A','B','C','D'].map(k=>[k,run(k,[{weather:'storm',ticks:16}]).summary]));
const stress=run('A',[{weather:'storm',ticks:400},{weather:'sunny',ticks:1000}]);
const moderate=run('A',schedule,s=>{for(const c of s.cells)if(c.buildable&&[1,4,6,8].includes(c.y)&&[0,3,5,7,9,11].includes(c.x))c.facility=[5,7].includes(c.x)?'park':'forest';});
const metrics=['maxPond','maxFlood','maxAffected','maxFloodedBuildings','affectedCellSeconds','floodCellSeconds','maxLandSurface','maxRiverCell','maxOutlet','totalSpill'];
const relative=Object.fromEntries(['B','C','D'].map(k=>[k,Object.fromEntries(metrics.map(m=>[m,100*(runs[k].summary[m]-runs.A.summary[m])/runs.A.summary[m]]))]));
const symptom={shortAFloodOnlyLowland:short.A.maxFlood>0&&short.A.maxNonLowFlood===0,longAFloodOnlyLowland:runs.A.summary.maxFlood>0&&runs.A.summary.maxNonLowFlood===0,CMaxFloodImprovement:1-runs.C.summary.maxFlood/runs.A.summary.maxFlood,DMaxFloodImprovement:1-runs.D.summary.maxFlood/runs.A.summary.maxFlood};
const result={note:'Seconds are simulated teaching time, not real-world time. Baseline only; no parameters or rules changed.',config:{facilities:a.F,balance:a.B,weather:a.weatherConfig},map:{total:a.mapData.length,river:a.mapData.filter(c=>c.type==='river').length,road:a.mapData.filter(c=>c.type==='road').length,lowland:a.mapData.filter(c=>c.lowland).length,buildable:a.mapData.filter(c=>c.buildable).length},schedule,short,runs,relative,symptom,stress:stress.summary,moderateGreen:moderate.summary};
mkdirSync(path.join(root,'debug'),{recursive:true});
writeFileSync(path.join(root,'debug/balance-results.json'),JSON.stringify(result,null,2));
const fields=['tick','time','weather','pond','flood','lowPond','nonLowPond','lowFlood','nonLowFlood','landSurface','riverTotal','riverMax','outlet','spill','storage','wet'];
writeFileSync(path.join(root,'debug/balance-history.csv'),'case,'+fields.join(',')+'\n'+Object.entries(runs).flatMap(([k,r])=>r.history.map(row=>[k,...fields.map(f=>row[f])].join(','))).join('\n')+'\n');
console.log(JSON.stringify({map:result.map,symptom,short:Object.fromEntries(Object.entries(short).map(([k,r])=>[k,{firstFlood:r.firstFlood,maxFlood:r.maxFlood,maxNonLowFlood:r.maxNonLowFlood}])),summaries:Object.fromEntries(Object.entries(runs).map(([k,r])=>[k,r.summary])),relative,stress:stress.summary},null,2));
// An explicit design target, not an existing engineering correctness criterion.
// Red-capable reproduction: 20% reduction in peak flood footprint for C and D.
if(process.argv.includes('--check-target')){
 const pass=runs.A.summary.maxNonLowFlood>0&&symptom.CMaxFloodImprovement>=.20&&symptom.DMaxFloodImprovement>=.20;
 console.log(pass?'PASS: provisional balance target':'FAIL: fixed-lowland / detention-impact target');
 process.exitCode=pass?0:1;
}
