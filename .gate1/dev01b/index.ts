// DEV-01B V5 test-only fixture runner. REVIEW ONLY; NOT DEPLOYED.
// Fixed target. One run, two users, one photo per user. No arbitrary SQL or deletion.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const PROJECT='rfwqcrvxyjhtmafnbuyy';
const URL=`https://${PROJECT}.supabase.co`;
const BUCKET='share-placement-photos';
const ADMIN_UID=Deno.env.get('DEV01B_ADMIN_UID')??'';
const PROOF=Deno.env.get('DEV01B_PROOF')??'';
const CREATE_UNTIL=Date.parse(Deno.env.get('DEV01B_CREATE_UNTIL')??'');
const CLEANUP_UNTIL=Date.parse(Deno.env.get('DEV01B_CLEANUP_UNTIL')??'');
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')??'';
const RUN=Deno.env.get('DEV01B_RUN_ID')??'';
type Lease={owner:string;fence:number;assertLive:()=>void};
// Distributed lock is held by database ledger; no per-isolate lock is trusted.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const admin=createClient(URL,KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const pub=createClient(URL,ANON,{auth:{autoRefreshToken:false,persistSession:false}});
function ct(a:string,b:string){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let n=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)n|=(x[i]??0)^(y[i]??0);return n===0;}
function fail(message:string):never{throw new Error(message);}
function config(){if(!UUID.test(ADMIN_UID)||PROOF.length<40||!/^dev01b-v5-[a-f0-9]{16}$/.test(RUN)||!Number.isFinite(CREATE_UNTIL)||!Number.isFinite(CLEANUP_UNTIL)||CLEANUP_UNTIL<=CREATE_UNTIL||!KEY||!ANON)fail('bad_configuration');}
function email(role:'a'|'b'){return `${RUN}-${role}@example.invalid`;}
function pass(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
async function requireCaller(req:Request){const token=(req.headers.get('authorization')??'').match(/^Bearer (.+)$/)?.[1];if(!token)fail('unauthorized');const {data,error}=await pub.auth.getUser(token);if(error||data.user?.id!==ADMIN_UID)fail('unauthorized');if(!ct(req.headers.get('x-dev01b-proof')??'',PROOF))fail('forbidden');}
type Role='a'|'b';
type Fixture={role:Role;id:string;requestId?:string;photoPath?:string};
// Trusted registry is stored in admin-only app_metadata. No caller-supplied path or UID is ever accepted.
async function find(role:Role):Promise<Fixture|null>{for(let page=1;page<=30;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});if(error)throw error;const u=data.users.find(x=>x.email===email(role)&&x.app_metadata?.dev01b_run===RUN&&x.app_metadata?.dev01b_role===role);if(u){const m=u.app_metadata;return {role,id:u.id,requestId:typeof m.dev01b_request==='string'?m.dev01b_request:undefined,photoPath:typeof m.dev01b_photo==='string'?m.dev01b_photo:undefined};}if(data.users.length<100)return null;}fail('auth_scan_limit');}
async function update(f:Fixture,delta:Record<string,unknown>){const {data,error}=await admin.auth.admin.getUserById(f.id);if(error||!data.user)fail('missing_user');const m=data.user.app_metadata??{};if(m.dev01b_run!==RUN||m.dev01b_role!==f.role)fail('ownership_mismatch');const result=await admin.auth.admin.updateUserById(f.id,{app_metadata:{...m,...delta}});if(result.error)throw result.error;}
type LedgerResource={run_id:string;kind:string;role:Role;resource_key:string;state:string};
async function ledger(){const {data,error}=await admin.rpc('dev01b_v5_ledger',{p_run:RUN});if(error||!data?.run)fail('ledger_unavailable');return data as {run:{lease_owner:string|null;phase:string};resources:LedgerResource[]};}
async function event(lease:Lease,kind:string,role:Role,key:string,state:string){const {error}=await admin.rpc('dev01b_v5_event',{p_run:RUN,p_owner:lease.owner,p_fence:lease.fence,p_operation:crypto.randomUUID(),p_event:state,p_kind:kind,p_role:role,p_key:key,p_state:state});if(error)fail('ledger_event_failed');}
async function withLease<T>(cleanup:boolean,fn:(lease:Lease)=>Promise<T>):Promise<T>{
 const owner=crypto.randomUUID();
 const {data,error}=await admin.rpc('dev01b_v5_claim',{p_run:RUN,p_owner:owner,p_cleanup:cleanup});
 if(error||typeof data!=='number'||!Number.isSafeInteger(data)||data<1)fail('lease_claim_failed');
 let alive=true;
 const lease:Lease={owner,fence:data,assertLive:()=>{if(!alive)fail('lease_lost_stop_external_calls');}};
 // Renew asynchronously; loss of connectivity makes all subsequent operations fail closed.
 const ac=new AbortController();
 const renew=async()=>{while(!ac.signal.aborted){
  try{await new Promise<void>(resolve=>{const id=setTimeout(resolve,20000);ac.signal.addEventListener('abort',()=>{clearTimeout(id);resolve();},{once:true});});
   if(ac.signal.aborted)break;
   const r=await admin.rpc('dev01b_v5_renew',{p_run:RUN,p_owner:owner,p_fence:data});
   if(r.error||!r.data){alive=false;break;}
  }catch{alive=false;break;}
 }};
 const worker=renew();
 try{return await fn(lease);}finally{
  ac.abort();await worker;
  const {error:e}=await admin.rpc('dev01b_v5_release',{p_run:RUN,p_owner:owner,p_fence:data});
  if(e)console.error('CRITICAL_LEASE_RELEASE_FAILED');
 }
}
async function assertFresh(lease:Lease){
 lease.assertLive();
 const r=await admin.rpc('dev01b_v5_renew',{p_run:RUN,p_owner:lease.owner,p_fence:lease.fence});
 if(r.error||!r.data)fail('lease_not_current');
}
async function reconcileManifest(){const l=await ledger();for(const r of l.resources){if(r.state==='uncertain'||r.state==='intent'||r.state==='delete_pending')fail('unreconciled_resource_manual_review');}return l;}
async function member(password:string){const c=createClient(URL,ANON,{auth:{autoRefreshToken:false,persistSession:false}});const {error}=await c.auth.signInWithPassword({email:password.split(':',1)[0],password:password.slice(password.indexOf(':')+1)});if(error)throw error;return c;}
async function create(lease:Lease){if(await find('a')||await find('b'))fail('run_exists_or_partial');const created:Fixture[]=[];try{const out:Fixture[]=[];for(const role of ['a','b'] as const){const password=pass();await event(lease,'auth_user',role,email(role),'intent');await assertFresh(lease);const {data,error}=await admin.auth.admin.createUser({email:email(role),password,email_confirm:true,app_metadata:{dev01b_run:RUN,dev01b_role:role,dev01b_fixture:true}});if(error||!data.user){
 const check=await find(role).catch(()=>null);
 if(check){console.error('AUTH_CREATE_AMBIGUOUS_FOUND',role);fail('auth_create_uncertain_found_manual_reconcile');}
 fail('auth_create_uncertain_manual_reconcile_no_retry');
 }const f:Fixture={role,id:data.user.id};created.push(f);await event(lease,'auth_user',role,email(role),'present');const profile=await admin.from('profiles').update({registration_completed_at:new Date().toISOString(),home_address:'DEVTEST ONLY 台南市測試區虛構路100號'}).eq('id',f.id).select('id').single();if(profile.error||!profile.data)fail('profile_bootstrap_failed');const c=await member(`${email(role)}:${password}`);await event(lease,'draft',role,`pending:${f.id}`,'intent');
await assertFresh(lease);const d=await c.rpc('lx_create_share_draft');if(d.error||typeof d.data!=='string'||!UUID.test(d.data))fail('draft_creation_failed');f.requestId=d.data;// Draft key stays stable across intent/present; request UUID is saved in Auth metadata.
await event(lease,'draft',role,`pending:${f.id}`,'present');await update(f,{dev01b_request:f.requestId});out.push(f);{const out=await c.auth.signOut({scope:'global'});if(out.error)fail('session_global_revoke_unverified');}}return {run_id:RUN,users:out};}catch(e){ // Never silently delete partial fixtures; manifest allows recovery.
  console.error('partial_creation_requires_cleanup',created.map(x=>x.role));throw e;
}}
// Image is a fixed 1x1 PNG; no user-provided bytes, MIME, path, or request ID.
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSQG8AAAAASUVORK5CYII=';
async function upload(role:Role,lease:Lease){const f=await find(role);if(!f?.requestId||f.photoPath)fail('missing_or_already_uploaded');const {data,error}=await admin.auth.admin.getUserById(f.id);if(error||!data.user)fail('user_missing');
// A fresh one-time password is set through Admin API; login as real member, not service role.
const password=pass();const reset=await admin.auth.admin.updateUserById(f.id,{password});if(reset.error)throw reset.error;
const c=await member(`${email(role)}:${password}`);
const bytes=Uint8Array.from(atob(PNG),x=>x.charCodeAt(0));const path=`${f.id}/${f.requestId}/${Date.now()}-${crypto.randomUUID().slice(0,8)}.png`;
// Durable pre-upload intent: a deterministic path registered BEFORE writing Storage bytes.
await event(lease,'storage_photo',role,path,'intent');await update(f,{dev01b_photo:path,dev01b_photo_state:'pending'});
try{await assertFresh(lease);const up=await c.storage.from(BUCKET).upload(path,bytes,{contentType:'image/png',upsert:false});if(up.error)throw up.error;
// State transition is recoverable: pending path remains recorded if this fails.
await event(lease,'storage_photo',role,path,'present');await update(f,{dev01b_photo_state:'uploaded'});
const detail=await c.from('lx_share_draft_details').upsert({request_id:f.requestId,user_id:f.id,clothing_count:2,pickup_kind:'home',pickup_address_snapshot:'DEVTEST ONLY 台南市測試區虛構路100號',placement_photo_path:path},{onConflict:'request_id'});if(detail.error)throw detail.error;
return {run_id:RUN,role,request_id:f.requestId,path,upload_context:'authenticated',rls_insert:'passed'};
}finally{{const out=await c.auth.signOut({scope:'global'});if(out.error)fail('session_global_revoke_unverified');}}}
async function crossRls(lease:Lease){const a=await find('a'),b=await find('b');if(!a?.photoPath||!b)fail('fixtures_incomplete');const password=pass();const r=await admin.auth.admin.updateUserById(b.id,{password});if(r.error)throw r.error;const c=await member(`${email('b')}:${password}`);try{const {data,error}=await c.storage.from(BUCKET).download(a.photoPath);if(!error&&data)fail('cross_user_read_allowed');const p=`${a.id}/${a.requestId}/9999999999999-cross.png`;const bytes=Uint8Array.from(atob(PNG),x=>x.charCodeAt(0));await event(lease,'cross_rls_probe','b',p,'intent');await assertFresh(lease);const denied=await c.storage.from(BUCKET).upload(p,bytes,{contentType:'image/png',upsert:false});if(!denied.error){await event(lease,'cross_rls_probe','b',p,'uncertain');console.error('CRITICAL_CROSS_USER_WRITE_REGISTERED',p);fail('cross_user_write_allowed');}
const check=await admin.storage.from(BUCKET).info(p);if(!check.error&&check.data){await event(lease,'cross_rls_probe','b',p,'uncertain');fail('cross_user_object_exists');}await event(lease,'cross_rls_probe','b',p,'deleted');
return {cross_read:'denied',cross_write:'denied'};}finally{{const out=await c.auth.signOut({scope:'global'});if(out.error)fail('session_global_revoke_unverified');}}}
async function status(){const fixtures=await Promise.all((['a','b'] as const).map(find));const checks=[];for(const f of fixtures){if(!f){checks.push({role:null,exists:false});continue;}let exists=false;if(f.photoPath){const x=await admin.storage.from(BUCKET).info(f.photoPath);exists=!x.error&&!!x.data;}checks.push({role:f.role,id:f.id,request_id:f.requestId,photo_path:f.photoPath,photo_exists:exists});}return {run_id:RUN,fixtures:checks};}
// Enumerate ALL pages; never treat a truncated first page as proof of absence.
// Maximum pages are a safety stop, not a silent pagination cutoff.
async function listAll(prefix:string){
 const result:{name:string;id?:string|null}[]=[];const seen=new Set<string>();
 for(let offset=0;offset<10000;offset+=100){
  const {data,error}=await admin.storage.from(BUCKET).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
  if(error)throw error;
  const batch=data??[];
  for(const item of batch){if(seen.has(item.name))fail('storage_duplicate_page_or_race');seen.add(item.name);result.push(item);}
  if(batch.length<100)return result;
 }
 fail('storage_enumeration_limit_manual_review');
}
async function inspectFixtureStorage(f:Fixture){
 if(!f.requestId||!UUID.test(f.requestId))fail('missing_request_for_storage_scan');
 const root=await listAll(f.id);
 if(root.some(x=>x.name!==f.requestId))fail('unknown_user_storage_prefix');
 const files=await listAll(`${f.id}/${f.requestId}`);
 const expected=f.photoPath?.split('/').at(-1);
 if(files.some(x=>!expected||x.name!==expected||!x.id))fail('unknown_or_nested_storage_object');
 if(files.length>1)fail('extra_storage_objects');
 return files;
}
async function reconcileKnownStorage(lease:Lease,resources:LedgerResource[],f:Fixture){
 const rows=resources.filter(x=>x.role===f.role&&x.kind==='storage_photo');
 if(rows.length>1)fail('multiple_storage_resources');
 const row=rows[0];
 if(row&&row.state!=='deleted'){
  if(!row.resource_key.startsWith(`${f.id}/${f.requestId}/`))fail('ledger_storage_ownership_mismatch');
  if(f.photoPath&&f.photoPath!==row.resource_key)fail('auth_ledger_storage_mismatch');
  // An uncertain upload may have succeeded: resolve by listing the exact path.
  const files=await inspectFixtureStorage({...f,photoPath:row.resource_key});
  if(files.length===0){await event(lease,'storage_photo',f.role,row.resource_key,'deleted');}
  else if(row.state==='intent'||row.state==='uncertain'||row.state==='delete_pending'){
   // No blind retry: observed existing object is now recorded before cleanup.
   await event(lease,'storage_photo',f.role,row.resource_key,'present');
  }
 }
}
async function cleanup(lease:Lease){const manifest=await ledger();if(!manifest.run)fail('ledger_run_missing');const fixtures=(await Promise.all((['a','b'] as const).map(find))).filter((x):x is Fixture=>!!x);for(const f of fixtures){await reconcileKnownStorage(lease,manifest.resources,f);const photo=manifest.resources.find(r=>r.kind==='storage_photo'&&r.role===f.role);if(f.photoPath&&(!photo||photo.resource_key!==f.photoPath))fail('manifest_photo_mismatch');if(photo&&!f.photoPath&&photo.state!=='deleted')fail('ledger_photo_missing_in_auth_metadata');}if(!fixtures.length){if(manifest.resources.length)fail('auth_missing_requires_independent_storage_and_draft_audit');return {run_id:RUN,clean:true,users:0,verification:'no_ledger_resources_only'};}
// DB rows must be absent BEFORE cleanup; never delete requests or bags from this function.
for(const f of fixtures){if(!f.requestId)fail('missing_manifest_request_manual_review');for(const table of ['lx_share_bags','lx_share_requests'] as const){const col=table==='lx_share_bags'?'share_request_id':'id';const q=await admin.from(table).select('id',{count:'exact',head:true}).eq(col,f.requestId);if(q.error||q.count!==0)fail('database_fixture_not_clean');}
// Recursive prefix enumeration: userId/requestId; unexpected files stop deletion.
const inside=await inspectFixtureStorage(f);
if(inside.length>0&&!f.photoPath)fail('unregistered_storage_object');
if(f.photoPath){const before=await admin.storage.from(BUCKET).info(f.photoPath);if(!before.error&&before.data){await event(lease,'storage_photo',f.role,f.photoPath,'delete_pending');await assertFresh(lease);const del=await admin.storage.from(BUCKET).remove([f.photoPath]);if(del.error)throw del.error;}const check=await admin.storage.from(BUCKET).info(f.photoPath);if(!check.error&&check.data)fail('photo_delete_unverified');await event(lease,'storage_photo',f.role,f.photoPath,'deleted');}
const after=await inspectFixtureStorage(f);if(after.length>0)fail('storage_still_present');}
for(const f of fixtures){await event(lease,'auth_user',f.role,email(f.role),'delete_pending');await assertFresh(lease);const del=await admin.auth.admin.deleteUser(f.id);if(del.error)fail('auth_delete_uncertain_check_user_before_retry');const verify=await admin.auth.admin.getUserById(f.id);if(!verify.error&&verify.data.user)fail('auth_delete_unverified');if(verify.error&&verify.error.status!==404)fail('auth_delete_verification_unavailable');await event(lease,'auth_user',f.role,email(f.role),'deleted');}
return {run_id:RUN,clean:true,deleted_users:fixtures.map(x=>x.id)};}
Deno.serve(async(req:Request)=>{try{
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 config();await requireCaller(req);
 const raw=await req.text();if(raw.length>2048)fail('body_too_large');
 const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body)||body.run_id!==RUN)fail('bad_body');
 const action=body.action;
 if(action==='status')return json(await status());
 if(Date.now()>CLEANUP_UNTIL)return json({status:'retired',recovery:'separately_authorized_manual_cleanup'},410);
 if(action==='cleanup')return json(await withLease(true,cleanup));
 if(Date.now()>CREATE_UNTIL)return json({status:'creation_expired',cleanup_available:true},410);
 if(action==='create')return json(await withLease(false,create));
 if(action==='upload'&&(body.role==='a'||body.role==='b'))return json(await withLease(false,lease=>upload(body.role,lease)));
 if(action==='cross-rls')return json(await withLease(false,crossRls));
 return json({error:'invalid_action'},400);
}catch(e){console.error('dev01b_failure',e instanceof Error?e.message:'unknown');return json({error:'operation_failed_check_server_logs'},422);}});
