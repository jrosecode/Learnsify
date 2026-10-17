import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args=process.argv.slice(2);const value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null};
const name=value('--name');const slug=value('--slug')||name?.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
if(!name||!slug){console.error('Usage: node scripts/package-store.mjs --name "Final Name" [--slug final-name]');process.exit(1)}
const root=process.cwd(),stage=path.join(root,'.store-build',slug),output=path.join(root,'store','packages',`${slug}.zip`);
await rm(path.join(root,'.store-build'),{recursive:true,force:true});await mkdir(stage,{recursive:true});await cp(path.join(root,'extension'),stage,{recursive:true});
const manifestPath=path.join(stage,'manifest.json');const manifest=JSON.parse(await readFile(manifestPath,'utf8'));manifest.name=name;manifest.action.default_title=`Open ${name}`;manifest.description=`Capture clicks and screenshots across browser tabs, then turn them into clear step-by-step guides.`;await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await mkdir(path.dirname(output),{recursive:true});await rm(output,{force:true});const zipped=spawnSync('zip',['-qr',output,'.'],{cwd:stage,encoding:'utf8'});if(zipped.status!==0){console.error(zipped.stderr);process.exit(zipped.status||1)}
console.log(JSON.stringify({name,slug,version:manifest.version,output},null,2));
