import {createClient} from 'npm:@supabase/supabase-js@2.95.0';
export const records:{name:string;status:'PASS';detail?:unknown}[]=[];
export function check(name:string,pass:unknown,detail?:unknown):asserts pass{
 if(pass!==true)throw new Error('FAIL '+name+' '+JSON.stringify(detail));
 records.push({name,status:'PASS',detail});console.log('PASS '+name);
}
const status=JSON.parse(await Deno.readTextFile('.gate1/local-stack/status.private.json'));
export const url=String(status.API_URL??'');
if(new URL(url).hostname!=='127.0.0.1'&&new URL(url).hostname!=='localhost')throw new Error('STOP: API must be loopback');
if(!status.ANON_KEY||!status.SERVICE_ROLE_KEY)throw new Error('Missing ephemeral local-only API credentials');
const options={auth:{autoRefreshToken:false,persistSession:false}};
export const admin=createClient(url,status.SERVICE_ROLE_KEY,options);
export const member=()=>createClient(url,status.ANON_KEY,options);
export const RUN='dev01b-v5-0123456789abcdef';
export async function writeReport(name:string,extra:Record<string,unknown>={}){
 await Deno.writeTextFile('.gate1-artifacts/'+name+'.json',JSON.stringify({tests:records,...extra},null,2));
}
export async function installFixtureRunner(){
 const state=JSON.parse(await Deno.readTextFile('.gate1/local-stack/runtime.private.json'));
 for(const [key,value] of Object.entries({DEV01B_ADMIN_UID:state.adminId,DEV01B_PROOF:state.proof,DEV01B_CREATE_UNTIL:state.createUntil,DEV01B_CLEANUP_UNTIL:state.cleanupUntil,DEV01B_RUN_ID:RUN,SUPABASE_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY,SUPABASE_ANON_KEY:status.ANON_KEY}))Deno.env.set(key,String(value));
 const native=globalThis.fetch;let redirects=0;
 globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
  const original=input instanceof Request?input.url:String(input);
  const target=new URL(original);
  if(target.origin==='https://rfwqcrvxyjhtmafnbuyy.supabase.co'){target.protocol=new URL(url).protocol;target.host=new URL(url).host;redirects++;}
  if(!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('STOP: non-loopback fetch forbidden');
  return native(input instanceof Request?new Request(target,input):target,init);
 }) as typeof fetch;
 let handler:((r:Request)=>Promise<Response>)|undefined;
 const serve=Deno.serve;
 Object.defineProperty(Deno,'serve',{configurable:true,value:(h:(r:Request)=>Promise<Response>)=>{handler=h;return {};}});
 try{await import('../dev01b/index.ts');}finally{Object.defineProperty(Deno,'serve',{configurable:true,value:serve});}
 if(!handler)throw new Error('Original index.ts did not register a handler');
 const invoke=async(action:string,extra:Record<string,unknown>={},headers:Record<string,string>={},raw?:string,method='POST')=>{
  const r=await handler!(new Request('http://127.0.0.1/fixture-test',{method,headers:{authorization:'Bearer '+state.adminToken,'x-dev01b-proof':state.proof,...headers},body:method==='POST'?(raw??JSON.stringify({run_id:RUN,action,...extra})):undefined}));
  return {status:r.status,body:await r.json()};
 };
 return {invoke,state,redirects:()=>redirects};
}
