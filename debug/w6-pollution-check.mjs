import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {loadEngine} from './engine-loader.mjs';
const a=loadEngine(undefined,{pollutionEnabled:true}),s=a.createSimulation('W6'),r=a.createRound(150,'compound');
const result={firstShortage:null,recovered:null,firstFloodAfterRecovery:null,maxFlood:0,maxWaterError:0,maxPollutionError:0};
while(r.state!=='finished'){
 a.advanceRound(r,s);const t=r.tick*a.B.timestepSeconds;
 if(s.supply.shortage>1e-8)result.firstShortage??=t;
 if(result.firstShortage&&t>60&&s.supply.status==='充足'&&s.supply.shortage<1e-8)result.recovered??=t;
 if(result.recovered&&s.stats.harmfulFlooding>0)result.firstFloodAfterRecovery??=t;
 result.maxFlood=Math.max(result.maxFlood,s.stats.harmfulFlooding);
 result.maxWaterError=Math.max(result.maxWaterError,Math.abs(a.supplyMassError(s)));
 result.maxPollutionError=Math.max(result.maxPollutionError,Math.abs(a.pollutionMassError(s)));
}
assert.ok(result.firstShortage<result.recovered&&result.recovered<result.firstFloodAfterRecovery);
assert.ok(result.firstShortage&&result.recovered&&result.firstFloodAfterRecovery);
assert.ok(result.maxWaterError<1e-7&&result.maxPollutionError<1e-7);
writeFileSync(new URL('./w6-pollution-results.json',import.meta.url),JSON.stringify(result,null,2));
console.log(result);
