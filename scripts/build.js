import { rm, mkdir, cp } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true}); await cp('src','dist',{recursive:true}); console.log('Built dist/');
const {build}=await import('esbuild');
await mkdir('dist/vendor',{recursive:true});
await build({entryPoints:['node_modules/@supabase/supabase-js/dist/index.mjs'],bundle:true,format:'esm',platform:'browser',outfile:'dist/vendor/supabase.js',minify:true});
await build({entryPoints:['node_modules/fflate/esm/browser.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/vendor/fflate.js',minify:true});
// Build the downloadable extension from the same source revision as the website.
const {readdir,readFile,writeFile}=await import('node:fs/promises');
const {zipSync}=await import('fflate');
async function extensionFiles(directory,prefix=''){
 const files={};
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const relative=prefix+entry.name;
  if(entry.isDirectory())Object.assign(files,await extensionFiles(directory+'/'+entry.name,relative+'/'));
  else files[relative]=new Uint8Array(await readFile(directory+'/'+entry.name));
 }
 return files;
}
await mkdir('dist/downloads',{recursive:true});
await writeFile('dist/downloads/pathira-extension.zip',zipSync(await extensionFiles('extension')));
