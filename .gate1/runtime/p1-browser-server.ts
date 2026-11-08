// Isolated local browser E2E gateway: real Auth/Storage/PostgREST + Deno submissionHandler.
import {admin,member,url,check,writeReport} from './context.ts';
import {submissionHandler} from './submit.ts';
const status=JSON.parse(await Deno.readTextFile('.gate1/local-stack/status.private.json'));
const version='P1_LOCAL_BROWSER_ONLY';
const email='p1-browser-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomUUID()+'Aa1!';
const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
check('browser fixture real Auth user',!created.error&&!!created.data.user,created.error);
const uid=created.data.user!.id,client=member();
const login=await client.auth.signInWithPassword({email,password});
check('browser fixture real Auth JWT',!login.error&&!!login.data.session,login.error);
const approved=await admin.from('profiles').update({registration_completed_at:new Date().toISOString()}).eq('id',uid);
check('browser fixture registration',!approved.error,approved.error);
const published=new Date(Date.now()-60000).toISOString();
const agreement=await admin.from('lx_share_agreement_versions').insert({version,content:'P1 LOCAL BROWSER ONLY SYNTHETIC AGREEMENT '.repeat(6),published_at:published});
check('browser fixture agreement',!agreement.error,agreement.error);
const setting=await admin.from('lx_share_submission_settings').update({submission_enabled:true,agreement_version:version,agreement_published_at:published}).eq('id',1);
check('browser fixture submit enabled',!setting.error,setting.error);
const activated=await client.rpc('lx_activate_share_service',{p_agreement_version:version,p_explicit_agreement:true});
check('browser fixture service activation',!activated.error,activated.error);
const point=await admin.from('lx_approved_collection_points').insert({name:'P1 LOCAL TEST POINT',address_text:'臺南市本機測試路123號',enabled:true,approved_at:published}).select('id').single();
check('browser fixture approved collection point',!point.error&&!!point.data,point.error);
const handler=submissionHandler(member(),admin);
let requestId='',photoPath='',bagId='',completed=false;
const hostname='127.0.0.1',port=8765;
const mime=(p:string)=>p.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
const server=Deno.serve({hostname,port,onListen:()=>console.log('P1_BROWSER_READY')},async req=>{
 const u=new URL(req.url);
 if(u.pathname==='/__fixture')return Response.json({token:login.data.session!.access_token,key:status.ANON_KEY,uid,version});
 if(u.pathname==='/__verify'&&req.method==='POST'){
  const body=await req.json();
  requestId=body.request_id;photoPath=body.photo_path;
  const reqRow=await admin.from('lx_share_requests').select('status').eq('id',requestId).single();
  const detail=await admin.from('lx_share_draft_details').select('*').eq('request_id',requestId).single();
  const bag=await admin.from('lx_share_bags').select('*').eq('share_request_id',requestId).single();
  const obj=await admin.storage.from('share-placement-photos').info(photoPath);
  check('browser submitted real request',!reqRow.error&&reqRow.data.status==='submitted',reqRow.error);
  check('browser stored real draft details',!detail.error&&detail.data.user_id===uid&&detail.data.clothing_count===2,detail.error);
  check('browser uploaded actual Storage photo',!obj.error,obj.error);
  check('browser created one actual bag',!bag.error&&!!bag.data,bag.error);
  check('browser 48h deadline exact',Date.parse(bag.data.pickup_deadline_at)-Date.parse(bag.data.declared_at)===172800000);
  bagId=bag.data.id;completed=true;
  return Response.json({pass:true});
 }
 if(u.pathname==='/submit')return handler(req);
 if(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/storage/v1/')||u.pathname.startsWith('/auth/v1/')){
  const target=new URL(url);target.pathname=u.pathname;target.search=u.search;
  const headers=new Headers(req.headers);headers.delete('host');
  return fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body,duplex:'half'} as RequestInit);
 }
 const path=u.pathname==='/c09-v5.js'?'app/c09-v5.js':'app/c09-v5.html';
 if(!['/c09-v5.js','/c09-v5.html','/'].includes(u.pathname))return new Response('Not found',{status:404});
 return new Response(await Deno.readFile(path),{headers:{'Content-Type':mime(path)}});
});
try{
 for(let i=0;i<240&&!completed;i++)await new Promise(r=>setTimeout(r,1000));
 check('browser finished before timeout',completed);
}finally{
 if(photoPath){const x=await admin.storage.from('share-placement-photos').remove([photoPath]);check('browser photo cleanup',!x.error,x.error);}
 if(requestId){if(bagId){const x=await admin.from('lx_share_bags').delete().eq('id',bagId);check('browser bag cleanup',!x.error,x.error);}const x=await admin.from('lx_share_requests').delete().eq('id',requestId);check('browser draft cleanup',!x.error,x.error);}
 if(point.data?.id){const x=await admin.from('lx_approved_collection_points').delete().eq('id',point.data.id);check('browser collection point cleanup',!x.error,x.error);}
 const closed=await admin.from('lx_share_submission_settings').update({submission_enabled:false,agreement_version:null,agreement_published_at:null}).eq('id',1);check('browser gate closed after test',!closed.error,closed.error);
 const gone=await admin.from('lx_share_agreement_versions').delete().eq('version',version);check('browser agreement cleanup',!gone.error,gone.error);
 const removed=await admin.auth.admin.deleteUser(uid);check('browser Auth cleanup',!removed.error,removed.error);
 await server.shutdown();
 await writeReport('p1-browser-e2e',{completed,scope:'Actual Chromium + loopback Supabase Auth/PostgREST/Storage and local Deno submissionHandler'});
}
if(!completed)Deno.exit(1);
