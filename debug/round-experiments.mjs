import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadEngine} from './engine-loader.mjs';
const a=loadEngine(),results=[];
for(const mode of Object.keys(a.roundConfig.modes))for(const speed of [1,2,3,4]){
 const r=a.createRound(mode==='compound'?150:120,mode),s=a.createSimulation(mode==='compound'?'W6':'A');a.startRound(r);
 let wallMs=0,firstShortage=null,recovered=null,firstFlood=null,maxFlood=0,massError=0;
 while(r.state==='running'){
  a.playRoundFrame(r,s,16,speed);wallMs+=16;
  const seconds=r.tick*a.B.timestepSeconds;
  if(s.supply.shortage>1e-8)firstShortage??=seconds;
  if(firstShortage&&seconds>60&&s.supply.status==='充足'&&s.supply.shortage<1e-8)recovered??=seconds;
  if(s.stats.harmfulFlooding)firstFlood??=seconds;
  maxFlood=Math.max(maxFlood,s.stats.harmfulFlooding);massError=Math.max(massError,Math.abs(a.supplyMassError(s)));
 }
 const state={tick:s.tick,cells:s.cells,totals:s.totals,supply:s.supply,stats:s.stats};
 results.push({mode,speed,ticks:r.tick,simulatedSeconds:r.tick*a.B.timestepSeconds,wallSeconds:wallMs/1000,
  stateSHA256:createHash('sha256').update(JSON.stringify(state)).digest('hex'),firstShortage,recovered,firstFlood,maxFlood,massError});
}
const stories={};
for(const mode of Object.keys(a.roundConfig.modes))stories[mode]=[60,90,120,150,180,210,240].map(seconds=>({seconds,blocks:a.generateWeatherStory(seconds,mode)}));
writeFileSync(new URL('./round-results.json',import.meta.url),JSON.stringify({results,stories},null,2));
console.log(JSON.stringify(results,null,2));
