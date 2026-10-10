import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const files=['city-resilience.test.mjs','city-needs.test.mjs','pressure.test.mjs','balance.test.mjs','supply.test.mjs','round.test.mjs','playback-ui.test.mjs','opening.test.mjs','pollution.test.mjs','wetland.test.mjs','pollution-balance.test.mjs'].map(name=>fileURLToPath(new URL('./tests/'+name,import.meta.url)));
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;


