import {admin,member,RUN,check,writeReport,installFixtureRunner} from './context.ts';
const phase=Deno.args[0];
if(phase==='prepare'){
 const password=crypto.randomUUID()+'aA9!';
 const created=await admin.auth.admin.createUser({email:'gate1-admin@example.invalid',password,email_confirm:true,app_metadata:{gate1_admin:true}});
 check('local Auth admin created',!created.error&&!!created.data.user,created.error);
 const c=member();const login=await c.auth.signInWithPassword({email:'gate1-admin@example.invalid',password});
 check('local admin real password login',!login.error&&!!login.data.session,login.error);
 const privateState={adminId:created.data.user!.id,adminToken:login.data.session!.access_token,proof:crypto.randomUUID()+crypto.randomUUID(),createUntil:new Date(Date.now()+20*60000).toISOString(),cleanupUntil:new Date(Date.now()+40*60000).toISOString()};
 await Deno.writeTextFile('.gate1/local-stack/runtime.private.json',JSON.stringify(privateState));
 const {invoke,redirects}=await installFixtureRunner();
 const outsiderPassword=crypto.randomUUID()+'aA9!';
 const outsider=await admin.auth.admin.createUser({email:'gate1-outsider@example.invalid',password:outsiderPassword,email_confirm:true});
 check('synthetic non-admin created',!outsider.error&&!!outsider.data.user,outsider.error);
 const outsiderClient=member();const outsiderLogin=await outsiderClient.auth.signInWithPassword({email:'gate1-outsider@example.invalid',password:outsiderPassword});
 check('real JWT not on admin allowlist rejected',(await invoke('status',{}, {authorization:'Bearer '+outsiderLogin.data.session!.access_token})).status===422);
 const outsiderLogout=await outsiderClient.auth.signOut({scope:'global'});check('outsider session revoked',!outsiderLogout.error);
 const outsiderDelete=await admin.auth.admin.deleteUser(outsider.data.user!.id);check('outsider fixture removed',!outsiderDelete.error);
 check('original handler rejects GET',(await invoke('status',{}, {},undefined,'GET')).status===405);
 check('missing JWT rejected',(await invoke('status',{}, {authorization:''})).status===422);
 check('forged JWT rejected',(await invoke('status',{}, {authorization:'Bearer forged.jwt.value'})).status===422);
 check('wrong proof rejected',(await invoke('status',{}, {'x-dev01b-proof':'wrong'})).status===422);
 check('wrong run rejected',(await invoke('status',{run_id:'wrong'})).status===422);
 check('malformed JSON rejected',(await invoke('status',{}, {},'{')).status===422);
 check('oversized JSON rejected',(await invoke('status',{}, {},'x'.repeat(2049))).status===422);
 check('unknown action rejected',(await invoke('unknown')).status===400);
 const createdFixtures=await invoke('create');check('original create success',createdFixtures.status===200,createdFixtures);
 check('original create retry does not create more users',(await invoke('create')).status===422);
 const uploadedA=await invoke('upload',{role:'a'});check('original upload A authenticated success',uploadedA.status===200,uploadedA);
 const uploadedB=await invoke('upload',{role:'b'});check('original upload B authenticated success',uploadedB.status===200,uploadedB);
 check('original duplicate upload rejected',(await invoke('upload',{role:'a'})).status===422);
 const cross=await invoke('cross-rls');check('original cross RLS endpoint denies reads and writes',cross.status===200&&cross.body.cross_read==='denied'&&cross.body.cross_write==='denied',cross);
 const status=await invoke('status');check('original status observes both actual photos',status.status===200&&status.body.fixtures.length===2&&status.body.fixtures.every((x:{photo_exists:boolean})=>x.photo_exists),status);
 check('cleanup refuses live database drafts',(await invoke('cleanup')).status===422);
 check('refused cleanup preserves photos',(await invoke('status')).body.fixtures.every((x:{photo_exists:boolean})=>x.photo_exists));
 const manifest={run:RUN,a:status.body.fixtures.find((x:{role:string})=>x.role==='a'),b:status.body.fixtures.find((x:{role:string})=>x.role==='b')};
 await Deno.writeTextFile('.gate1-artifacts/local-fixture-manifest.json',JSON.stringify(manifest,null,2));
 check('source hardcoded origin retargeted to loopback',redirects()>10,{retargeted_requests:redirects()});
 check('remote project net permission denied',(await Deno.permissions.query({name:'net',host:'rfwqcrvxyjhtmafnbuyy.supabase.co:443'})).state==='denied');
 await writeReport('original-edge-fixtures',{scope:'Original index.ts handler; real loopback Auth, Storage, PostgREST; no deployed remote Edge runtime'});
}else if(phase==='cleanup'){
 const {invoke,state}=await installFixtureRunner();
 const manifest=JSON.parse(await Deno.readTextFile('.gate1-artifacts/local-fixture-manifest.json'));
 const unknown=manifest.a.id+'/'+manifest.a.request_id+'/9999999999999-unknown.png';
 const extra=await admin.storage.from('share-placement-photos').upload(unknown,new Uint8Array([1,2,3]),{contentType:'image/png'});
 check('unknown-object safety fixture created locally',!extra.error,extra.error);
 const refused=await invoke('cleanup');check('original cleanup refuses unknown Storage object',refused.status===422,refused);
 for(const name of [manifest.a.photo_path,manifest.b.photo_path,unknown]){
  const exists=await admin.storage.from('share-placement-photos').info(name);check('refused cleanup preserves object '+name,!exists.error&&!!exists.data,exists.error);
 }
 const extraRemoved=await admin.storage.from('share-placement-photos').remove([unknown]);check('operator removes only known injected object',!extraRemoved.error,extraRemoved.error);
 const cleaned=await invoke('cleanup');check('original cleanup endpoint succeeds after SQL draft cleanup',cleaned.status===200&&cleaned.body.clean===true,cleaned);
 const ledger=await admin.rpc('dev01b_v5_ledger',{p_run:RUN});check('durable manifest readable after Auth deletion',!ledger.error,ledger.error);
 // The original cleanup never deletes DB drafts. The SQL operator cleaned
 // them, so it must reconcile their durable resource entries explicitly.
 const owner=crypto.randomUUID();const claimed=await admin.rpc('dev01b_v5_claim',{p_run:RUN,p_owner:owner,p_cleanup:true});check('operator cleanup lease acquired',!claimed.error,claimed.error);
 for(const r of ledger.data.resources.filter((x:{kind:string})=>x.kind==='draft')){
  const uid=r.resource_key.slice('pending:'.length);
  const absent=await admin.from('lx_share_requests').select('id').eq('sharer_user_id',uid);check('draft absence verified before ledger transition '+r.role,!absent.error&&absent.data.length===0);
  const e=await admin.rpc('dev01b_v5_event',{p_run:RUN,p_owner:owner,p_fence:claimed.data,p_operation:crypto.randomUUID(),p_event:'deleted',p_kind:'draft',p_role:r.role,p_key:r.resource_key,p_state:'deleted'});check('operator draft ledger reconciled '+r.role,!e.error,e.error);
 }
 const release=await admin.rpc('dev01b_v5_release',{p_run:RUN,p_owner:owner,p_fence:claimed.data});check('operator lease released',!release.error,release.error);
 const final=await admin.rpc('dev01b_v5_ledger',{p_run:RUN});check('all recorded resources deleted',!final.error&&final.data.resources.length===7&&final.data.resources.every((x:{state:string})=>x.state==='deleted'),final.error);
 const logout=await admin.auth.admin.signOut(state.adminToken,'global');check('admin session globally signed out',!logout.error,logout.error);
 const deleted=await admin.auth.admin.deleteUser(state.adminId);check('test-only admin deleted',!deleted.error,deleted.error);
 await writeReport('original-edge-cleanup');
}else throw new Error('Unknown phase');
