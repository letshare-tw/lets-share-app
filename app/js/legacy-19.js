
(function(){
 'use strict';
 const PROJECT='https://wxvauoeykusmbxdtwgxo.supabase.co';
 const AUTH_STORE='lx_supabase_auth_v066g';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let checkId=0;
 const previous=window.lxHQSystem;
 if(typeof previous!=='function')return;
 window.lxHQSystem=function(){
  previous();
  const container=document.querySelector('#lx-s7-status');
  if(container)return;
  const cards=[...document.querySelectorAll('.card')];
  const company=cards.find(e=>e.textContent.includes('公司資料管理（Admin 專屬）'));
  if(!company)return;
  const box=document.createElement('div');box.id='lx-s7-status';box.style.cssText='padding:13px;margin:12px 0;border:1px solid #b7d8c4;border-radius:12px;background:#f6fbf7;font-size:14px;line-height:1.7';
  box.textContent='🔐 正在向 Supabase 查詢登入者的總部角色…';
  company.insertBefore(box,company.firstChild);
  const current=++checkId;
  (async()=>{
   const u=window.__lxRealAuth?.user;
   if(!u?.id){box.textContent='🔒 尚未登入 Supabase，無法驗證 Admin。';return;}
   let saved;try{saved=JSON.parse(sessionStorage.getItem(AUTH_STORE)||'null')}catch{}
   const key=document.getElementById('lx-auth-key')?.value?.trim();
   if(!saved?.token||!key||!/^(sb_publishable_|eyJ)/.test(key)){box.textContent='🔒 找不到有效登入憑證或公開金鑰，請重新登入。';return;}
   const headers={apikey:key,Authorization:'Bearer '+saved.token,Accept:'application/json'};
   try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
    let r;try{r=await fetch(PROJECT+'/rest/v1/rpc/lx_my_staff_roles',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:ctl.signal})}finally{clearTimeout(timer)}
    const rows=await r.json().catch(()=>null);
    if(current!==checkId||window.__lxRealAuth?.user?.id!==u.id)return;
    if(!r.ok)throw Error('HTTP '+r.status+(rows?.message?'：'+rows.message:''));
    const result=Array.isArray(rows)?rows:(Array.isArray(rows?.roles)?rows.roles:null);
    if(!result)throw Error('RPC 回傳格式異常，請確認函式輸出');
    const allowed=['admin','operations','pricing','finance','support'];
    const roles=[...new Set(result.filter(x=>typeof x==='string'||(x&&typeof x==='object'&&x.active!==false)).map(x=>typeof x==='string'?x:x.role).filter(x=>allowed.includes(x)))];
    const admin=roles.includes('admin');
    box.innerHTML='<b>'+(admin?'✅ 後端回傳 Admin 角色':'🔒 尚未確認 Admin 角色')+'</b><div>登入帳號：'+esc(u.email||'')+'</div><div>啟用角色：'+esc(roles.join('、')||'無')+'</div><div style="font-size:12px;color:#7b6231;margin-top:7px">'+(admin?'此結果來自已登入使用者的後端 RPC；正式資料修改仍須後端 RLS／可信任 API 逐項驗權。':'公司資料編輯維持鎖定。')+'</div>';
    if(admin){
     const note=[...company.querySelectorAll('p')].find(p=>p.textContent.includes('目前尚未完成後端 Admin 驗證'));
     if(note)note.textContent='🔐 已通過後端 Admin 角色查詢。公司資料僅供檢視，編輯功能仍未開放。';
     const detail=document.createElement('div');
     detail.id='lx-admin-company-detail';
     detail.style.cssText='margin-top:12px;padding:12px;border:1px solid #d5e8db;border-radius:10px;background:#fff;overflow-wrap:anywhere';
     detail.textContent='🏢 正在讀取後端公司資料…';
     box.appendChild(detail);
     try{
      const ctrl2=new AbortController(),tm2=setTimeout(()=>ctrl2.abort(),12000);
      let response;
      try{response=await fetch(PROJECT+'/rest/v1/rpc/lx_admin_company_overview_v2',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:ctrl2.signal})}
      finally{clearTimeout(tm2)}
      const payload=await response.json().catch(()=>null);
      if(current!==checkId||window.__lxRealAuth?.user?.id!==u.id||!detail.isConnected)return;
      if(!response.ok)throw Error('HTTP '+response.status+(payload?.message?'：'+payload.message:''));
      const records=Array.isArray(payload)?payload:(payload&&typeof payload==='object'?[payload]:[]);
      if(!records.length){detail.textContent='目前沒有可讀取的公司資料。';return;}
      const record=records[0];
      const fields=[['公司名稱','legal_name'],['統一編號','tax_id'],['登記地址','registered_address'],['資料狀態','record_status']];
      detail.innerHTML='<strong>🏢 公司資料（後端唯讀）</strong>'+
       (record.record_status==='development_test'?'<p style="color:#9b5b13;font-weight:700;margin:6px 0">⚠️ 開發測試資料｜非正式公司資訊</p>':'')+
       fields.map(([label,key])=>'<div style="padding:5px 0;border-bottom:1px solid #edf1ed"><b>'+esc(label)+'：</b>'+esc(record[key]??'未填寫')+'</div>').join('')+
       '<p style="font-size:12px;color:#66776d;margin:9px 0 0">資料來自登入者憑證呼叫 Supabase RPC；目前不提供修改。</p>';
     }catch(err){
      if(current!==checkId||!detail.isConnected)return;
      detail.textContent='⚠️ 公司資料讀取失敗（'+String(err.message||err)+'）。請確認 RPC 已授權 authenticated，並檢查後端權限設定。';
     }
    }
   }catch(e){if(current!==checkId)return;box.textContent='⚠️ 無法從後端確認角色（'+String(e.message||e)+'）。可能是 RLS 或 API 權限尚未設定；所有管理操作繼續鎖定。';}
  })();
 };
})();
