// CI-only submission adapter contract. No deployment entrypoint or env reads.
import type {SupabaseClient} from 'npm:@supabase/supabase-js@2.95.0';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function submissionHandler(auth:SupabaseClient,service:SupabaseClient){
 return async(req:Request):Promise<Response>=>{
  if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
  const token=(req.headers.get('authorization')??'').match(/^Bearer (.+)$/)?.[1];
  if(!token)return reply(401,{error:'unauthorized'});
  const identity=await auth.auth.getUser(token);
  if(identity.error||!identity.data.user)return reply(401,{error:'unauthorized'});
  let body;try{const text=await req.text();if(text.length>2048)return reply(413,{error:'body_too_large'});body=JSON.parse(text);}catch{return reply(400,{error:'bad_json'});}
  const fields=['request_id','agreement_version','transfer_agreed','no_return_agreed','recycling_agreed'];
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(x=>!fields.includes(x))||!uuid.test(body.request_id??'')||typeof body.agreement_version!=='string'||body.agreement_version.length>150||!body.agreement_version)return reply(400,{error:'invalid_input'});
  if(body.transfer_agreed!==true||body.no_return_agreed!==true||body.recycling_agreed!==true)return reply(400,{error:'explicit_consent_required'});
  const uid=identity.data.user.id;
  const state=await service.from('lx_share_submission_settings').select('submission_enabled,agreement_version').eq('id',1).single();
  if(state.error)return reply(503,{error:'unavailable'});
  if(!state.data.submission_enabled)return reply(409,{error:'submission_closed'});
  if(state.data.agreement_version!==body.agreement_version)return reply(409,{error:'agreement_version_changed'});
  const owned=async()=>await service.from('lx_share_requests').select('id,status,transfer_agreement_version').eq('id',body.request_id).eq('sharer_user_id',uid).maybeSingle();
  const current=await owned();
  if(current.error)return reply(503,{error:'unavailable'});
  if(!current.data)return reply(404,{error:'not_found'});
  const receipt=async()=>{
   const r=await owned();
   if(r.error||r.data?.status!=='submitted'||r.data.transfer_agreement_version!==body.agreement_version)return null;
   const bag=await service.from('lx_share_bags').select('id,bag_code,pickup_deadline_at').eq('share_request_id',body.request_id).maybeSingle();
   return bag.error||!bag.data?null:{request_id:body.request_id,bag_id:bag.data.id,bag_code:bag.data.bag_code,pickup_deadline_at:bag.data.pickup_deadline_at};
  };
  if(current.data.status==='submitted'){const r=await receipt();return r?reply(200,{...r,replayed:true}):reply(409,{error:'conflict'});}
  if(current.data.status!=='draft')return reply(409,{error:'not_draft'});
  const result=await service.rpc('lx_edge_submit_share_request',{p_user:uid,p_request:body.request_id,p_version:body.agreement_version,p_transfer:true,p_no_return:true,p_recycling:true});
  if(result.error){console.error('DEPLOY03_RPC_FAILURE',JSON.stringify({code:result.error.code??'unknown',httpStatus:result.status??null}));const replay=await receipt();if(replay)return reply(200,{...replay,replayed:true});return reply(result.error.code==='P0001'||result.error.code==='P0002'?422:503,{error:'request_rejected'});}
  const r=await receipt();return r?reply(200,{...r,replayed:false}):reply(503,{error:'receipt_unavailable'});
 };
}
