import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadEngine} from '../debug/engine-loader.mjs';
const a=loadEngine();
function play(duration,mode,speed,frameMs=16,city='A'){
 const r=a.createRound(duration,mode),s=a.createSimulation(city);
 a.startRound(r);let wall=0;
 while(r.state==='running'){a.playRoundFrame(r,s,frameMs,speed);wall+=frameMs;}
 return {r,s,wall,snapshot:JSON.stringify({tick:s.tick,cells:s.cells,totals:s.totals,supply:s.supply,stats:s.stats})};
}
test('all duration boundaries and 30-second stories are deterministic and valid',()=>{
 assert.equal(a.createRound().durationSeconds,120);
 for(const mode of Object.keys(a.roundConfig.modes))for(let duration=60;duration<=240;duration+=30){
  const r=a.createRound(duration,mode);
  assert.equal(r.story.length,duration/30);
  assert.equal(r.story.at(-1).endSeconds,duration);
  assert.equal(JSON.stringify(r.story),JSON.stringify(a.generateWeatherStory(duration,mode)));
  if(mode!=='compound')assert.equal(r.story.filter(b=>b.major).length,1);
 }
 for(const duration of [0,59,61,119,241,270,NaN])assert.throws(()=>a.createRound(duration));
 assert.throws(()=>a.createRound(120,'unknown'));
});
test('120-second ordinary story has setup, trend, one pressure and recovery',()=>{
 for(const mode of ['auto','wet','dry']){
  const r=a.createRound(120,mode);
  assert.deepEqual(Array.from(r.story,b=>b.phase),['穩定','趨勢累積','主要壓力',mode==='dry'?'持續乾燥／備援':'恢復／轉折']);
 }
});
test('240-second stories add stability/recovery instead of prolonging pressure',()=>{
 for(const mode of ['auto','wet','dry']){
  const short=a.createRound(120,mode),long=a.createRound(240,mode);
  const pressure=r=>r.story.filter(b=>b.major).reduce((n,b)=>n+b.endSeconds-b.startSeconds,0);
  assert.equal(pressure(short),30);assert.equal(pressure(long),30);
  assert.ok(long.story.filter(b=>b.phase==='穩定').length>short.story.filter(b=>b.phase==='穩定').length);
  assert.ok(long.story.filter(b=>b.phase===(mode==='dry'?'持續乾燥／備援':'恢復／轉折')).length>short.story.filter(b=>b.phase===(mode==='dry'?'持續乾燥／備援':'恢復／轉折')).length);
 }
});
test('rain changes smoothly across block boundaries and automatic never introduces a drought sequence',()=>{
 for(const mode of Object.keys(a.roundConfig.modes))for(let duration=60;duration<=240;duration+=30){
  const r=a.createRound(duration,mode);let previous=a.weatherAtRoundTick(r,0).intensity;
  for(let t=1;t<=duration/a.B.timestepSeconds;t++){
   const rain=a.weatherAtRoundTick(r,t).intensity;
   assert.ok(rain>=0&&rain<=a.weatherConfig.storm.intensity);
   assert.ok(Math.abs(rain-previous)<.06);previous=rain;
   if(mode==='auto')assert.ok(rain>=a.S.recoveryRainThreshold);
  }
 }
});
test('1x/2x/3x/4x finish with exactly equal state for every duration and mode',()=>{
 for(const mode of Object.keys(a.roundConfig.modes))for(let duration=60;duration<=240;duration+=30){
  const baseline=play(duration,mode,1);
  assert.equal(baseline.r.tick,duration/a.B.timestepSeconds);
  for(const speed of [2,3,4]){
   const run=play(duration,mode,speed);
   assert.equal(run.snapshot,baseline.snapshot);
   assert.equal(run.r.endReason,'time');assert.equal(run.r.accumulator,0);
   assert.ok(Math.abs(run.wall-duration*1000/speed)<17);
  }
 }
});
test('irregular frame cadence, pausing and changing speeds preserve the planned result',()=>{
 const baseline=play(120,'compound',1,16,'W6'),r=a.createRound(120,'compound'),s=a.createSimulation('W6');
 a.startRound(r);let frames=0;
 while(r.state==='running'){
  if(frames===20){a.pauseRound(r);const frozen=JSON.stringify(s);a.playRoundFrame(r,s,10000,4);assert.equal(JSON.stringify(s),frozen);a.startRound(r);}
  a.playRoundFrame(r,s,[7,33,19,250,1000][frames%5],[1,2,3,4][frames%4]);frames++;
 }
 assert.equal(JSON.stringify({tick:s.tick,cells:s.cells,totals:s.totals,supply:s.supply,stats:s.stats}),baseline.snapshot);
});
test('early end freezes state, large frames never overshoot, and a finished round cannot resume',()=>{
 const r=a.createRound(60,'wet'),s=a.createSimulation();a.startRound(r);a.playRoundFrame(r,s,15000,2);
 a.endRound(r);const frozen=JSON.stringify(s);assert.equal(a.startRound(r),false);
 assert.equal(a.advanceRound(r,s),false);assert.equal(a.playRoundFrame(r,s,100000,4),0);assert.equal(JSON.stringify(s),frozen);
 const r2=a.createRound(60,'wet'),s2=a.createSimulation();a.startRound(r2);a.playRoundFrame(r2,s2,1000000,4);
 assert.equal(r2.tick,120);assert.equal(s2.tick,120);assert.equal(r2.endReason,'time');
});
test('single stepping and automatic playback consume the same fixed ticks',()=>{
 const baseline=play(90,'dry',4),r=a.createRound(90,'dry'),s=a.createSimulation('A');
 while(r.state!=='finished')a.advanceRound(r,s);
 assert.equal(JSON.stringify({tick:s.tick,cells:s.cells,totals:s.totals,supply:s.supply,stats:s.stats}),baseline.snapshot);
});
test('1A.6 preserves facility, terrain, flood and intake balancing values',()=>{
 const old=loadEngine(new URL('../debug/prototype-before-drought-buffer.html',import.meta.url));
 for(const key of Object.keys(old.F))assert.equal(JSON.stringify(Object.fromEntries(Object.keys(old.F[key]).map(field=>[field,a.F[key][field]]))),JSON.stringify(old.F[key]));
 assert.equal(JSON.stringify(a.mapData),JSON.stringify(old.mapData));
 assert.equal(JSON.stringify(a.weatherConfig),JSON.stringify(old.weatherConfig));
 for(const key of Object.keys(old.B).filter(k=>k!=='waterSupply'))assert.equal(a.B[key],old.B[key]);
 for(const key of ['demandPerUnit','municipalSupply','reservoirSupplyRate','maxIntakePerStep','riverMinimumIntakeLevel','riverIntakeRamp'])assert.equal(a.S[key],old.S[key]);
});
test('compound W6 story expresses real shortage, recovery and later flood without resetting water',()=>{
 const r=a.createRound(150,'compound'),s=a.createSimulation('W6');let short=null,recovered=null,flood=null;
 while(r.state!=='finished'){
  a.advanceRound(r,s);const t=r.tick*a.B.timestepSeconds;
  if(s.supply.shortage>1e-8)short??=t;
  if(short&&t>60&&s.supply.status==='充足'&&s.supply.shortage<1e-8)recovered??=t;
  if(recovered&&s.stats.harmfulFlooding>0)flood??=t;
  assert.ok(Math.abs(a.supplyMassError(s))<1e-7);
 }
 assert.ok(short&&recovered&&flood);assert.ok(short<recovered&&recovered<flood);
});

