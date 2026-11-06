/* C09-DEV-003: member-owned draft save / restore. Formal submission stays disabled. */
(function(){
'use strict';
const API='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION_KEY='lx_supabase_auth_v066g';
const original=window.share;
if(typeof original!=='function')return;
let generation=0;
function credentials(){
 const user=window.__lxRealAuth?.user;
 let session;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 if(!user?.id||!session?.token)throw Error('請先登入會員，才能儲存或讀取草稿');
 return {id:user.id,token:session.token};
}
function check(id){if(window.__lxRealAuth?.user?.id!==id)throw Error('登入帳號已切換，請重新進入分享頁')}
async function request(path,options={}){
 const {id,token}=credentials();
 const response=await fetch(API+path,{...options,cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,...(options.headers||{})}});
 check(id);
 if(!response.ok){let detail='';try{const j=await response.json();detail=j.message||j.error||''}catch{}throw Error((detail||'伺服器處理失敗')+'（HTTP '+response.status+'）')}
 if(response.status===204)return null;
 const type=response.headers.get('content-type')||'';
 return type.includes('json')?response.json():response.text();
}
function status(message,error=false){const el=document.getElementById('lx-c09-draft-status');if(el){el.textContent=message;el.style.color=error?'#b42318':'#08784c'}}
function address(){return document.getElementById('lx-pickup-address')?.dataset.address||''}
async function draftId(){
 const id=await request('/rest/v1/rpc/lx_create_share_draft',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw Error('草稿編號無效');
 return id;
}
async function loadPhoto(path){
 const {id,token}=credentials();
 const response=await fetch(API+'/storage/v1/object/authenticated/share-placement-photos/'+path.split('/').map(encodeURIComponent).join('/'),{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});
 check(id);if(!response.ok)throw Error('照片讀取失敗（HTTP '+response.status+'）');
 const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('照片格式不正確');
 window.lxC09RenderPhoto(new File([blob],'已儲存的放置位置.jpg',{type:blob.type}));
}
window.lxC09SaveDraft=async function(){
 const btn=document.getElementById('lx-c09-save-draft');if(btn)btn.disabled=true;
 try{
  const {id}=credentials();
  const count=Number(document.getElementById('count')?.value);
  if(!Number.isInteger(count)||count<2||count>1000)throw Error('衣物件數請填寫 2～1000 件');
  const kind=document.getElementById('lx-pickup-kind')?.value==='point'?'collection_point':'home';
  const point=kind==='collection_point'?document.getElementById('lx-approved-points')?.value:null;
  if(kind==='home'&&!address())throw Error('尚未設定會員住址，請先到會員基本資料填寫');
  if(kind==='collection_point'&&!point)throw Error('請選擇已核定的集貨點');
  const note=(document.getElementById('lx-placement-note')?.value||'').trim();
  if(note.length>300)throw Error('放置說明最多 300 字');
  status('正在儲存草稿…');
  const requestId=await draftId();
  let photoPath=null;
  const existing=await request('/rest/v1/lx_share_draft_details?select=placement_photo_path&request_id=eq.'+encodeURIComponent(requestId));
  photoPath=existing?.[0]?.placement_photo_path||null;
  const photo=window.lxC09PlacementPhoto?.();
  if(photo){
   if(photo.size>8*1024*1024)throw Error('照片超過 8MB，請重新拍攝');
   if(!['image/jpeg','image/png','image/webp'].includes(photo.type))throw Error('照片格式不支援');
   const ext=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg';
   const path=id+'/'+requestId+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+ext;
   const {token}=credentials();
   const res=await fetch(API+'/storage/v1/object/share-placement-photos/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':photo.type,'x-upsert':'false'},body:photo});
   check(id);
   if(!res.ok){let detail='';try{detail=(await res.json()).message||''}catch{}throw Error('照片上傳失敗：'+(detail||'HTTP '+res.status))}
   photoPath=path;
  }
  const payload={request_id:requestId,user_id:id,clothing_count:count,pickup_kind:kind,pickup_address_snapshot:kind==='home'?address():document.getElementById('lx-approved-points')?.selectedOptions?.[0]?.textContent||null,collection_point_id:point||null,placement_note:note||null,placement_photo_path:photoPath,updated_at:new Date().toISOString()};
  await request('/rest/v1/lx_share_draft_details?on_conflict=request_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
  status('✓ 草稿已儲存至 Supabase'+(photoPath?'（含照片）':'（尚未拍照）')+'。未正式提交，也不會派單。');
 }catch(e){status('儲存失敗：'+(e.message||String(e)),true)}
 finally{if(btn)btn.disabled=false}
};
window.lxC09RestoreDraft=async function(){
 const stamp=++generation;
 try{
  const {id}=credentials();
  const rows=await request('/rest/v1/lx_share_draft_details?select=request_id,clothing_count,pickup_kind,pickup_address_snapshot,collection_point_id,placement_note,placement_photo_path&user_id=eq.'+encodeURIComponent(id)+'&order=updated_at.desc&limit=1');
  if(stamp!==generation||!document.getElementById('lx-c09-save-draft'))return;
  if(!rows?.length){status('尚無已儲存的詳細草稿。可先填寫資料再儲存。');return}
  const d=rows[0];
  const count=document.getElementById('count'),kind=document.getElementById('lx-pickup-kind'),note=document.getElementById('lx-placement-note'),points=document.getElementById('lx-approved-points');
  if(count)count.value=d.clothing_count;
  if(kind)kind.value=d.pickup_kind==='collection_point'?'point':'home';
  if(note)note.value=d.placement_note||'';
  if(points&&d.collection_point_id)points.value=d.collection_point_id;
  window.lxC09ChangePickup?.();
  if(d.placement_photo_path){try{await loadPhoto(d.placement_photo_path)}catch(e){status('草稿資料已讀取，但'+e.message,true);return}}
  status('✓ 已從 Supabase 恢復上次儲存的草稿'+(d.placement_photo_path?'與照片':'')+'。');
 }catch(e){status('草稿讀取：'+(e.message||String(e)),true)}
};
window.share=function(){
 const html=original();
 const old='<button class="primary wide" style="margin-top:17px" onclick="createBag()">建立／取得 Supabase 草稿（地點及照片尚未送出）</button>';
 const replacement='<button id="lx-c09-save-draft" type="button" class="primary wide" style="margin-top:17px;background:#078b58;color:white" onclick="lxC09SaveDraft()">儲存分享草稿（含照片）</button><p id="lx-c09-draft-status" role="status" aria-live="polite" style="font-size:13px;margin:10px 0;color:#587363">正在檢查已儲存的草稿…</p>';
 const result=html.replace(old,replacement);
 setTimeout(()=>window.lxC09RestoreDraft(),450);
 return result;
};
})();