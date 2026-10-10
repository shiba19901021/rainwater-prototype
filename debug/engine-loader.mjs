import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export function loadEngine(file=new URL('../water-resilience-p0.html',import.meta.url),{pollutionEnabled=false,cityResilienceEnabled=false}={}) {
  const html=readFileSync(file,'utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  const context=vm.createContext({});
  vm.runInContext(script.slice(script.indexOf('// config/facilities.js'),script.indexOf('// ui/renderer.js'))+
    ';globalThis.api={createSimulation,step,placeFacility,waterInventory,resetWater,capacity,status,thresholds,mapData,F,B,weatherConfig,continuousWeather,scheduledWeather,...(typeof S!=="undefined"?{S,supplyMassError,refreshSupply,intakeCapacity,intakeRiver,droughtRecoveryWeather,hydrologyStep}:{}),...(typeof initializeNormalWater!=="undefined"?{initializeNormalWater}:{}),...(typeof P!=="undefined"?{P,initPollution,pollutionConcentration,pollutionColor,pollutionStatus,intakeQualityFactor,pollutionRiverFor,transportPollution,purifyPollution,processWastewater,pollutionMassError,updatePollutionStats}:{}),...(typeof roundConfig!=="undefined"?{roundConfig,generateWeatherStory,weatherAtRoundTick,createRound,startRound,pauseRound,endRound,advanceRound,playRoundFrame}:{})};',context);
  vm.runInContext(script.includes('function cityNeeds(')?'globalThis.api.cityNeeds=cityNeeds;':'',context);
  vm.runInContext(script.includes('function updateCityResilience(')?'Object.assign(globalThis.api,{CR,facilityPressure,initCityResilience,updateCityResilience});':'',context);
  // Existing flood/supply diagnostics retain the original module-off baseline.
  // Production enables pollution by default; 1B tests opt in explicitly here.
  const create=context.api.createSimulation;
  context.api.createSimulation=(scenario,options={})=>create(scenario,{pollutionEnabled,cityResilienceEnabled,...options});
  return context.api;
}
