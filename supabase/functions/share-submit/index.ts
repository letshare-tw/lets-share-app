// DEPLOY-03 production-candidate Edge Function. NOT DEPLOYED.
// Required server secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Deploy only after a separately approved security review and staged rollout.
import {createClient} from 'npm:@supabase/supabase-js@2.95.0';
import {submissionHandler} from '../../../.gate1/runtime/edge-submit-handler.ts';
const url=Deno.env.get('SUPABASE_URL');
const anon=Deno.env.get('SUPABASE_ANON_KEY');
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!anon||!secret)throw Error('Missing server-side Supabase configuration');
const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const handle=submissionHandler(auth,service);
const origins=(Deno.env.get('C09_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
Deno.serve(async request=>{
 const origin=request.headers.get('origin');
 if(origin&&!origins.includes(origin))return Response.json({error:'origin_not_allowed'},{status:403});
 const cors=origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type, apikey'}});
 const response=await handle(request);
 const headers=new Headers(response.headers);for(const [k,v] of Object.entries(cors))headers.set(k,v);
 return new Response(response.body,{status:response.status,headers});
});
