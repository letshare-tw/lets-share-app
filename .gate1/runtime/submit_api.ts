import {admin,member,check,writeReport} from './context.ts';
import {submissionHandler} from './submit.ts';
const auth=member();const handler=submissionHandler(auth,admin);
const server=Deno.serve({hostname:'127.0.0.1',port:0,onListen:()=>{}},handler);
const endpoint='http://127.0.0.1:'+server.addr.port;
const users:{id:string;token:string;request:string;photo:string;client:ReturnType<typeof member>}[]=[];
const version='DEVTEST_ONLY_LOCAL_API';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSQG8AAAAASUVORK5CYII='),x=>x.charCodeAt(0));
const call=async(token:string,body:unknown,method='POST')=>{
 const r=await fetch(endpoint,{method,headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});
 return {status:r.status,body:await r.json()};
};
let completed=false;
try{
 check('submit HTTP rejects non POST',(await call('',{},'GET')).status===405);
 check('submit HTTP missing JWT denied',(await call('',{})).status===401);
 check('submit HTTP forged JWT denied',(await call('forged.jwt.value',{})).status===401);
 for(const label of ['a','b']){
  const email='gate1-submit-'+label+'@example.invalid',password=crypto.randomUUID()+'aA9!';
  const c=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{gate1_submit:true}});check('real Auth trigger creation '+label,!c.error&&!!c.data.user,c.error);
  const id=c.data.user!.id;const client=member();const login=await client.auth.signInWithPassword({email,password});check('real JWT login '+label,!login.error&&!!login.data.session,login.error);
  const profile=await client.from('profiles').select('*').eq('id',id).single();check('actual Auth trigger leaves registration unapproved '+label,!profile.error&&profile.data.registration_completed_at===null);
  const incomplete=await client.rpc('lx_create_share_draft');check('unapproved real JWT cannot create draft '+label,incomplete.error?.code==='P0001');
  const approved=await admin.from('profiles').update({registration_completed_at:new Date().toISOString()}).eq('id',id);check('only synthetic profile approved '+label,!approved.error);
  const draft=await client.rpc('lx_create_share_draft');check('member draft '+label,!draft.error&&!!draft.data,draft.error);
  const photo=id+'/'+draft.data+'/12345678-api.png';
  users.push({id,token:login.data.session!.access_token,request:draft.data,photo,client});
  const detail=await client.from('lx_share_draft_details').insert({request_id:draft.data,user_id:id,pickup_address_snapshot:'DEVTEST ONLY 合成住家地址',placement_photo_path:photo});check('member detail '+label,!detail.error,detail.error);
 }
 const [a,b]=users;
 const body=(u:typeof a)=>({request_id:u.request,agreement_version:version,transfer_agreed:true,no_return_agreed:true,recycling_agreed:true});
 check('service closed HTTP submission denied',(await call(a.token,body(a))).body.error==='submission_closed');
 check('actor spoofing via extra user_id denied',(await call(a.token,{...body(a),user_id:b.id})).status===400);
 check('explicit checkbox required',(await call(a.token,{...body(a),no_return_agreed:false})).status===400);
 const agreement=await admin.from('lx_share_agreement_versions').insert({version,content:'DEVTEST ONLY NOT LEGAL TERMS. '.repeat(6),published_at:new Date(Date.now()-60000).toISOString()});check('local only synthetic agreement',!agreement.error,agreement.error);
 const enabled=await admin.from('lx_share_submission_settings').update({submission_enabled:true,agreement_version:version,agreement_published_at:new Date(Date.now()-60000).toISOString()}).eq('id',1);check('local only submit fixture enabled',!enabled.error,enabled.error);
 for(const u of users){const r=await u.client.rpc('lx_activate_share_service',{p_agreement_version:version,p_explicit_agreement:true});check('member explicit activation '+u.id,!r.error,r.error);}
 check('cross-member HTTP submit denied',(await call(a.token,body(b))).status===404);
 check('changed agreement HTTP submit denied',(await call(a.token,{...body(a),agreement_version:'wrong'})).status===409);
 const absent=await call(a.token,body(a));check('missing actual Storage photo rejects and leaves draft',absent.status===422,absent);
 const unchanged=await admin.from('lx_share_requests').select('status').eq('id',a.request).single();check('failed HTTP submit preserves draft',!unchanged.error&&unchanged.data.status==='draft');
 const zero=await admin.from('lx_share_bags').select('id');check('failed HTTP submit creates no bag',!zero.error&&zero.data.length===0);
 for(const u of users){const r=await u.client.storage.from('share-placement-photos').upload(u.photo,png,{contentType:'image/png'});check('actual Storage own upload '+u.id,!r.error,r.error);}
 const badMime=await a.client.storage.from('share-placement-photos').upload(a.id+'/'+a.request+'/12345679-mime.png',new TextEncoder().encode('text'),{contentType:'text/plain'});check('Storage API rejects text MIME',!!badMime.error&&badMime.error.message.includes('mime'),badMime.error?.message);
 const over=new Uint8Array(10485761);over.set(png);const oversized=await a.client.storage.from('share-placement-photos').upload(a.id+'/'+a.request+'/12345679-over.png',over,{contentType:'image/png'});check('Storage API rejects over 10MiB',!!oversized.error&&/size|large/i.test(oversized.error.message),oversized.error?.message);
 const cross=await b.client.storage.from('share-placement-photos').download(a.photo);check('Storage API cross read actually denied',!!cross.error&&!cross.data,cross.error?.message);
 const anon=await member().storage.from('share-placement-photos').download(a.photo);check('Storage API anonymous read actually denied',!!anon.error&&!anon.data,anon.error?.message);
 const direct=await a.client.rpc('lx_submit_share_request',{p_request_id:a.request,p_agreement_version:version,p_transfer_agreed:true,p_no_return_agreed:true,p_recycling_agreed:true});check('direct member RPC remains denied while Edge can submit',direct.error?.code==='42501',direct.error);
 const internal=await a.client.rpc('gate1_internal_submit',{p_user:b.id,p_request:b.request,p_version:version,p_transfer:true,p_no_return:true,p_recycling:true});check('member cannot call trusted-subject internal bridge',internal.error?.code==='42501',internal.error);
 const home=await call(a.token,body(a));check('HTTP A submission returns receipt',home.status===200&&!!home.body.bag_id&&home.body.request_id===a.request&&home.body.replayed===false,home);
 const replay=await call(a.token,body(a));check('HTTP replay returns same bag without duplication',replay.status===200&&replay.body.bag_id===home.body.bag_id&&replay.body.replayed===true,replay);
 const concurrent=await Promise.all([call(b.token,body(b)),call(b.token,body(b))]);check('two concurrent HTTP B requests return one receipt',concurrent.every(x=>x.status===200)&&concurrent[0].body.bag_id===concurrent[1].body.bag_id,concurrent);
 const bags=await admin.from('lx_share_bags').select('id,share_request_id,declared_at,pickup_deadline_at,bag_code');check('exactly one bag per member',!bags.error&&bags.data.length===2&&new Set(bags.data.map(x=>x.share_request_id)).size===2,bags.error);
 check('HTTP receipt bags preserve 48 hours and code',bags.data!.every(x=>Date.parse(x.pickup_deadline_at)-Date.parse(x.declared_at)===172800000&&/^LS-\d{6}-\d{6,}$/.test(x.bag_code)));
 completed=true;
}finally{
 for(const u of users){
  const signout=await u.client.auth.signOut({scope:'global'});check('local member global signout '+u.id,!signout.error,signout.error);
  const removed=await admin.storage.from('share-placement-photos').remove([u.photo]);check('Storage API fixture removed '+u.id,!removed.error,removed.error);
  const bag=await admin.from('lx_share_bags').delete().eq('share_request_id',u.request);check('scoped local bag cleanup '+u.id,!bag.error,bag.error);
  const request=await admin.from('lx_share_requests').delete().eq('id',u.request).eq('sharer_user_id',u.id);check('scoped local request cleanup '+u.id,!request.error,request.error);
  const deleted=await admin.auth.admin.deleteUser(u.id);check('local Auth API fixture removed '+u.id,!deleted.error,deleted.error);
 }
 const closed=await admin.from('lx_share_submission_settings').update({submission_enabled:false,agreement_version:null,agreement_published_at:null}).eq('id',1);check('API gate restored closed',!closed.error,closed.error);
 const agreement=await admin.from('lx_share_agreement_versions').delete().eq('version',version);check('local synthetic agreement removed',!agreement.error,agreement.error);
 await server.shutdown();
 await writeReport('submit-http-api',{completed,scope:'Real loopback HTTP Deno handler + actual local Supabase Auth/PostgREST/Storage; not production runtime'});
}
if(!completed)throw new Error('API gate incomplete');
