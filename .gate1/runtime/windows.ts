import {check,writeReport,installFixtureRunner} from './context.ts';
const phase=Deno.args[0];
if(phase==='retired'){
 let handler:((r:Request)=>Response)|undefined;const serve=Deno.serve;
 Object.defineProperty(Deno,'serve',{configurable:true,value:(h:(r:Request)=>Response)=>{handler=h;return {};}});
 try{await import('../dev01b/retired.ts');}finally{Object.defineProperty(Deno,'serve',{configurable:true,value:serve});}
 if(!handler)throw new Error('Retired source did not register handler');
 const response=(handler as (r:Request)=>Response)(new Request('http://127.0.0.1/retired'));
 check('original retired handler is unconditional 410',response.status===410&&(await response.json()).status==='retired');
 await writeReport('original-retired');
}else{
 const path='.gate1/local-stack/runtime.private.json';const original=await Deno.readTextFile(path);const state=JSON.parse(original);
 state.createUntil=new Date(Date.now()-120000).toISOString();
 state.cleanupUntil=new Date(Date.now()+(phase==='cleanup'?-60000:120000)).toISOString();
 try{
  await Deno.writeTextFile(path,JSON.stringify(state));
  const {invoke}=await installFixtureRunner();
  const create=await invoke('create');
  check('expired '+phase+' window rejects creation',create.status===410,create);
  if(phase==='cleanup')check('expired cleanup refuses destructive action',(await invoke('cleanup')).status===410);
  else check('creation expiry still permits read-only status',(await invoke('status')).status===200);
  await writeReport('original-window-'+phase);
 }finally{await Deno.writeTextFile(path,original);}
}
