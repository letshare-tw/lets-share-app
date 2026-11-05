/* LEGAL-DEV-001C: test-only registration. */
(function(){
'use strict';
const URL='https://wxvauoeykusmbxdtwgxo.supabase.co', KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let docs=[],owner=null,busy=false,done=null;
const uid=()=>window.__lxRealAuth?.user?.id||null;
function say(s){const el=document.getElementById('lx-dev-result');if(el)el.textContent=s;}
function redraw(){if(typeof page!=='undefined'&&page==='me'&&typeof render==='function')render();}
async function rpc(name,body){
 const id=uid();let session;try{session=JSON.parse(sessionStorage.getItem('lx_supabase_auth_v066g')||'null')}catch{}
 if(!id||!session?.token)throw Error('請先登入 Google 會員');
 const headers={apikey:KEY,Authorization:'Bearer '+session.token};
 const a=await fetch(URL+'/auth/v1/user',{headers,cache:'no-store'}),u=await a.json().catch(()=>({}));
 if(!a.ok||u.id!==id)throw Error('登入憑證失效或會員不一致，請重新登入');
 const r=await fetch(URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const d=await r.json().catch(()=>null);
 if(!r.ok)throw Error(d?.message||'後端拒絕操作（HTTP '+r.status+'）');
 if(uid()!==id)throw Error('帳號已切換，請重新登入');return d;
}
function documentCard(d){return `<div style="padding:12px;border:1px solid #d2e3d8;border-radius:12px;margin:10px 0"><b>${esc(d.title)}</b><div class="muted">版本 ${esc(d.version)}｜僅供開發測試</div><details style="margin:9px 0"><summary>展開閱讀完整草案</summary><div style="white-space:pre-wrap;line-height:1.75;font-size:13px;margin-top:8px">${esc(d.content)}</div></details><label style="display:flex;gap:9px;align-items:flex-start;font-size:13px"><input type="checkbox" id="lx-dev-${esc(d.document_code)}" style="width:auto;flex:none;margin-top:4px"><span>我已閱讀並確認此份測試草案（非正式法律同意）</span></label></div>`;}
window.lxDevRegistrationCard=function(){if(!uid())return '';const ready=owner===uid()&&docs.length===2;return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #80b99a"><b>🌱 測試會員註冊｜LEGAL-DEV-001C</b><p class="muted" style="font-size:12px">僅核准測試帳號使用；不等於正式法律同意、真實手機驗證或職人／騎手資格。</p>${done===uid()?'<p>✅ 後端已確認測試註冊完成。可前往「我的分享衣物」建立草稿。</p>':ready?docs.map(documentCard).join('')+'<button type="button" id="lx-dev-submit" onclick="lxDevRegisterSubmit()">確認兩份草案並完成測試註冊</button>':'<button type="button" onclick="lxDevLoadDocuments()">讀取 Supabase 測試文件</button>'}<p id="lx-dev-result" role="status" aria-live="polite" style="font-size:13px">${ready?'請分別閱讀並勾選兩份文件。':'文件僅供符合資格的測試帳號讀取。'}</p></section>`;};
window.lxDevLoadDocuments=async function(){if(busy)return;busy=true;docs=[];owner=null;say('讀取中…');try{const id=uid(),data=await rpc('lx_get_dev_registration_documents',{});if(!Array.isArray(data)||data.length!==2||!['member_terms','privacy_notice'].every(k=>data.some(d=>d.document_code===k&&d.version&&d.content)))throw Error('文件不完整，暫停註冊');owner=id;docs=data;redraw();}catch(e){say('無法讀取：'+e.message)}finally{busy=false}};
window.lxDevRegisterSubmit=async function(){if(busy||owner!==uid()||docs.length!==2)return;if(!['member_terms','privacy_notice'].every(k=>document.getElementById('lx-dev-'+k)?.checked)){say('請分別勾選兩份文件。');return;}busy=true;const btn=document.getElementById('lx-dev-submit');if(btn)btn.disabled=true;say('後端處理中…');try{const id=uid(),t=docs.find(d=>d.document_code==='member_terms'),p=docs.find(d=>d.document_code==='privacy_notice');const result=await rpc('lx_complete_dev_registration',{p_member_terms_version:t.version,p_privacy_notice_version:p.version,p_member_terms_agreed:true,p_privacy_notice_acknowledged:true});if(result!==true)throw Error('後端未確認完成');done=id;docs=[];owner=null;redraw();}catch(e){say('註冊未完成：'+e.message)}finally{busy=false;if(btn)btn.disabled=false}};
window.lxOnboardCard=function(){const u=window.__lxRealAuth?.user;if(!u)return '';const p=window.__lxProfile||{},ok=p.id===u.id&&!!String(p.display_name||'').trim()&&!!String(p.full_name||'').trim();return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #afd7bf;background:#f8fcf9"><b>🧭 一般會員註冊｜測試流程</b><p class="muted">正式會員註冊尚未開放。測試帳號可使用下方受控註冊。</p><p>✅ Google 帳號已登入</p><p>${ok?'✅':'⬜'} 會員基本資料（暱稱、姓名）</p><p>⬜ 正式手機 OTP（測試例外不等於真實驗證）</p><p>⬜ 正式法律文件（尚未發布）</p><p class="muted">分享者、職人、騎手須另行申請資格。</p></section>`+window.lxDevRegistrationCard();};
window.lxOnboardJump=function(target){const ids={profile:'lx-profile-save',otp:'lx-otp-send',consent:'lx-dev-result'};const e=document.getElementById(ids[target]);if(e)(e.closest('section.card')||e).scrollIntoView({behavior:'smooth',block:'center'});else alert('此區塊尚未載入');};
})();
