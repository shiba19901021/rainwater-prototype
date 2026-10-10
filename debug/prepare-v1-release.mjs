import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadEngine} from './engine-loader.mjs';
const root=new URL('../',import.meta.url);
const digest=text=>createHash('sha256').update(text).digest('hex');
function walk(dir='') {return readdirSync(new URL(dir,root)).flatMap(name=>{const path=dir+name,s=statSync(new URL(path,root));return s.isDirectory()?walk(path+'/'):[{path,bytes:s.size,sha256:digest(readFileSync(new URL(path,root)))}];});}
const files=walk().filter(f=>!f.path.startsWith('release/'));
const included=files.filter(f=>!f.path.includes('/')||/^tests\/[^/]+\.mjs$/.test(f.path)||/^debug\/[^/]+\.(mjs|md)$/.test(f.path)||/^debug\/ui-p1c2-[^/]+\.jpg$/.test(f.path)||['debug/ui-p1c2-checks.json','debug/v1-release-test-results.txt','debug/prototype-before-pressure.html','debug/prototype-before-drought-buffer.html'].includes(f.path)||/^checkpoints\/(prototype-0\.5|prototype-1a6-before-1b|prototype-1b-before-1b1|prototype-1b1-before-1b2|prototype-1b2-before-1c1|prototype-1c1-before-1c2)\/water-resilience-p0\.html$/.test(f.path));
const releaseFiles=readdirSync(new URL('../release/',import.meta.url)).map(name=>'release/'+name);
const manifest=[...new Set([...included.map(f=>f.path),...releaseFiles,'release/V1-UPLOAD-MANIFEST.txt'])].sort();
writeFileSync(new URL('../release/V1-UPLOAD-MANIFEST.txt',import.meta.url),manifest.join('\n')+'\n');
const e=loadEngine(undefined,{pollutionEnabled:true,cityResilienceEnabled:true});
const snapshot={release:'V1.0 Core Simulation',date:'2026-10-10',source:'water-resilience-p0.html',sourceSha256:files.find(f=>f.path==='water-resilience-p0.html').sha256,facilityConfig:e.F,balanceConfig:e.B,weatherConfig:e.weatherConfig,roundConfig:e.roundConfig};
writeFileSync(new URL('../release/V1-CONFIG-SNAPSHOT.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
writeFileSync(new URL('../release/V1-FILE-INVENTORY.json',import.meta.url),JSON.stringify({date:snapshot.date,files},null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),uploadFiles:manifest.length,sourceSha256:snapshot.sourceSha256}));
