/* Member profile address editor; only updates the signed-in member's own profile. */
(function(){
'use strict';
const API='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION_KEY='lx_supabase_auth_v066g';
const original=window.lxProfileEditor;
if(typeof original!=='function')return;
function auth(){
 const user=window.__lxRealAuth?.user;
 let session;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 if(!user?.id||!session?.token)throw Error('請先登入會員');
 return {id:user.id,token:session.token};
}
function message(t){const el=document.getElementById('lx-address-feedback');if(el)el.textContent=t}
window.lxProfileEditor=function(){
 const html=original();
 if(!html)return html;
 const card='<div id="lx-address-editor" style="padding:15px;margin:16px 0;border:1px solid #b7d8c4;border-radius:14px;background:#f8fbf9"><b style="color:#08784c">🏠 會員住址／分享取件地址</b><p class="muted" style="font-size:12px">分享衣物時預設使用此地址。僅會員本人可修改。</p><label for="lx-member-home-address">會員住址</label><textarea id="lx-member-home-address" class="field" rows="2" maxlength="250" autocomplete="street-address" placeholder="請填寫完整地址（縣市、區、路段、門牌、樓層）" style="width:100%;box-sizing:border-box"></textarea><label for="lx-member-placement-note">預設放置位置說明（選填）</label><textarea id="lx-member-placement-note" class="field" rows="2" maxlength="300" placeholder="例如：一樓大門右側指定置物架" style="width:100%;box-sizing:border-box"></textarea><button id="lx-address-save" class="primary wide" type="button" onclick="lxSaveMemberAddress()" style="background:#078b58;color:white;border:0;margin-top:12px">儲存會員住址</button><p id="lx-address-feedback" role="status" aria-live="polite" style="font-size:13px;color:#08784c;margin-top:10px">正在讀取會員住址…</p></div>';
 setTimeout(window.lxLoadMemberAddress,0);
 return html.replace('</section>',card+'</section>');
};
window.lxLoadMemberAddress=async function(){
 const field=document.getElementById('lx-member-home-address'),note=document.getElementById('lx-member-placement-note');
 if(!field||!note)return;
 try{
  const {id,token}=auth();
  const response=await fetch(API+'/rest/v1/profiles?select=id,home_address,home_placement_note&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error('讀取失敗（HTTP '+response.status+'）');
  const rows=await response.json();
  if(window.__lxRealAuth?.user?.id!==id||!field.isConnected)return;
  field.value=rows?.[0]?.home_address||'';
  note.value=rows?.[0]?.home_placement_note||'';
  message('可修改後按「儲存會員住址」。');
 }catch(e){message('❌ '+e.message)}
};
window.lxSaveMemberAddress=async function(){
 const button=document.getElementById('lx-address-save');
 if(button?.disabled)return;
 try{
  const {id,token}=auth();
  const address=document.getElementById('lx-member-home-address')?.value.trim()||'';
  const note=document.getElementById('lx-member-placement-note')?.value.trim()||'';
  if(address.length<6||address.length>250)throw Error('請填寫完整會員住址（6～250 字）');
  if(note.length>300)throw Error('放置位置說明最多 300 字');
  if(button)button.disabled=true;message('正在儲存會員住址…');
  const response=await fetch(API+'/rest/v1/profiles?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({home_address:address,home_placement_note:note,updated_at:new Date().toISOString()})});
  const rows=await response.json().catch(()=>null);
  if(!response.ok)throw Error('儲存失敗（HTTP '+response.status+'）：'+(rows?.message||'請檢查會員資料權限'));
  if(window.__lxRealAuth?.user?.id!==id)throw Error('登入身分已切換');
  if(!Array.isArray(rows)||rows.length!==1||rows[0].home_address!==address)throw Error('無法確認資料已成功寫入');
  message('✓ 會員住址已儲存至 Supabase。分享衣物時將預設使用此地址。');
 }catch(e){message('❌ '+e.message)}
 finally{if(button)button.disabled=false}
};
})();
