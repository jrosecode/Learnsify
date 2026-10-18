import { rm, mkdir, cp } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true}); await cp('src','dist',{recursive:true}); console.log('Built dist/');
const {build}=await import('esbuild');
await mkdir('dist/vendor',{recursive:true});
await build({entryPoints:['node_modules/@supabase/supabase-js/dist/index.mjs'],bundle:true,format:'esm',platform:'browser',outfile:'dist/vendor/supabase.js',minify:true});
