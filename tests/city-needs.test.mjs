import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {loadEngine} from '../debug/engine-loader.mjs';
import {runBalanceCase,balanceCases} from '../debug/pollution-balance-experiments.mjs';
const engine=()=>loadEngine(undefined,{pollutionEnabled:true});
const clean=v=>JSON.parse(JSON.stringify(v));
test('city targets are configurable, rounded, and preserve the 8/8/3/2 example',()=>{
 const a=engine(),s=a.createSimulation('blank',{targetHouseholds:8});
 assert.deepEqual(clean(a.cityNeeds(s).needs),{housing:8,jobs:8,publicService:3,leisure:2});
 a.resetWater(s);assert.equal(a.cityNeeds(s).targetHouseholds,8);
 assert.throws(()=>a.createSimulation('blank',{targetHouseholds:0}));
 a.B.cityNeeds.jobsTargetRatio=1.5;assert.equal(a.cityNeeds(s).needs.jobs,12);
});
test('CITY-A/F fail living needs while B/C/D/E meet them exactly without disaster gating',()=>{
 const a=engine();for(const key of ['CITY-A','CITY-B','CITY-C','CITY-D','CITY-E','CITY-F']){
  const s=a.createSimulation(key),city=a.cityNeeds(s);assert.equal(city.complete,!['CITY-A','CITY-F'].includes(key));
  assert.equal(city.status,city.complete?'良好':'嚴重失能');
  if(city.complete)assert.deepEqual(clean(city.provided),clean(city.needs));
  for(const c of s.cells){c.waterShortage=1;c.surface=1000;}
  assert.deepEqual(clean(a.cityNeeds(s)),clean(city));
 }
});
test('placing, replacing and removing updates needs immediately; overbuilding cannot cover other shortages',()=>{
 const a=engine(),s=a.createSimulation('blank',{targetHouseholds:1});
 for(const [id,key] of [[0,'residential'],[2,'commercial'],[3,'publicService'],[4,'generalPark']])assert.equal(a.placeFacility(s,id,key),true);
 assert.equal(a.cityNeeds(s).complete,true);assert.equal(a.F.generalPark,a.F.park);
 a.placeFacility(s,4,'empty');assert.equal(a.cityNeeds(s).status,'受壓');
 a.placeFacility(s,3,'residential');assert.equal(a.cityNeeds(s).status,'不足');
 for(const c of s.cells.filter(c=>c.buildable))a.placeFacility(s,c.id,'residential');
 assert.equal(a.cityNeeds(s).provided.housing,90);assert.equal(a.cityNeeds(s).ratios.housing,1);assert.equal(a.cityNeeds(s).status,'嚴重失能');
});
test('default living footprint is 25-35 percent and all function fields are centralized',()=>{
 const a=engine();for(const k of ['CITY-B','CITY-C','CITY-D','CITY-E']){
  const s=a.createSimulation(k),n=s.cells.filter(c=>c.buildable&&c.facility!=='empty').length;
  assert.ok(n/90>=.25&&n/90<=.35);assert.equal(n,k==='CITY-C'?25:31);
 }
 for(const f of Object.values(a.F))for(const k of ['housing','jobs','publicService','leisure'])assert.ok(Number.isFinite(f[k]));
 assert.equal(a.F.commercial.jobs,1);assert.equal(a.F.industrial.jobs,2);assert.equal(a.F.agriculture.jobs,1);
 for(const k of ['forest','reservoir','intake','treatment'])assert.equal(a.F[k].housing+a.F[k].jobs+a.F[k].publicService+a.F[k].leisure,0);
});
test('new sources use actual supply and the existing wastewater ledger, including drought and storms',()=>{
 const a=engine();for(const key of ['CITY-C','CITY-D','CITY-E']){
  const s=a.createSimulation(key),load=s.cells.reduce((n,c)=>n+(a.F[c.facility]?.pollutionLoad||0),0)*a.P.pollutionLoadPerUnit;
  for(let i=0;i<480;i++){a.step(s,i<240?0:.72);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);assert.ok(Math.abs(a.pollutionMassError(s))<1e-7);}
  assert.ok(Math.abs(s.pollution.totals.pollutionGenerated-load*480)<1e-8);assert.equal(a.cityNeeds(s).status,'良好');
 }
});
test('old configuration and complete water/pollution trajectories match 1B.2 exactly',()=>{
 const a=engine(),old=loadEngine(new URL('../checkpoints/prototype-1b2-before-1c1/water-resilience-p0.html',import.meta.url),{pollutionEnabled:true});
 const b=clean(a.B);delete b.cityNeeds;delete b.cityResilience;assert.deepEqual(b,clean(old.B));
 for(const key of Object.keys(old.F))for(const field of Object.keys(old.F[key]))assert.deepEqual(clean(a.F[key][field]),clean(old.F[key][field]));
 assert.deepEqual(clean(a.mapData),clean(old.mapData));assert.deepEqual(clean(a.weatherConfig),clean(old.weatherConfig));
 for(const key of ['A','B','C','D','W1','W2','W3','W4','W5','W6','P1','P2','P3','P4','P5','P6','P7','P8']){
  const s=a.createSimulation(key),p=old.createSimulation(key);for(let i=0;i<320;i++){const rain=i<160?0:i<200?.12:i<260?.38:.72;a.step(s,rain);old.step(p,rain);assert.deepEqual(clean(s),clean(p));}
 }
});
test('new cities produce identical fixed-timestep results at 1x,2x,3x,4x and pause/resume',()=>{
 const a=engine();for(const key of ['CITY-C','CITY-D','CITY-E']){
  const results=[];for(const speed of [1,2,3,4]){
   const s=a.createSimulation(key),r=a.createRound(120,'compound');a.startRound(r);
   a.playRoundFrame(r,s,250,speed);a.pauseRound(r);const tick=s.tick;a.playRoundFrame(r,s,5000,speed);assert.equal(s.tick,tick);a.startRound(r);
   while(r.state!=='finished')a.playRoundFrame(r,s,37,speed);
   results.push(JSON.stringify(s));
  }assert.ok(results.every(r=>r===results[0]));
 }
});
test('1B.2 A-J control results are unchanged by city needs',()=>{
 const file=new URL('../checkpoints/prototype-1b2-before-1c1/water-resilience-p0.html',import.meta.url);
 for(const key of Object.keys(balanceCases))assert.deepEqual(clean(runBalanceCase(key,{history:false}).result),clean(runBalanceCase(key,{file,history:false}).result));
});
test('zero-pollution new consumers still return actual wastewater and conserve transported pollution',()=>{
 const a=engine(),s=a.createSimulation('CITY-E');a.F.commercial.pollutionLoad=0;
 for(let i=0;i<200;i++){a.step(s,.12);assert.ok(Math.abs(a.supplyMassError(s))<1e-7);assert.ok(Math.abs(a.pollutionMassError(s))<1e-7);}
});
test('living needs are refreshed by render rather than only map initialization',()=>{
 const html=readFileSync(new URL('../water-resilience-p0.html',import.meta.url),'utf8');
 const init=html.slice(html.indexOf('function initMap('),html.indexOf('function soilVisual('));
 const render=html.slice(html.indexOf('function render('),html.indexOf('function renderDetail('));
 assert.ok(render.includes('cityNeeds(s)'));assert.ok(!init.includes('cityNeeds(s)'));
});


