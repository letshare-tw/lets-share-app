
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const panel=$('lx-connect-panel'),toggle=$('lx-connect-toggle'),out=$('lx-connect-result');
 function setOpen(open){panel.style.display=open?'block':'none';toggle.setAttribute('aria-expanded',String(open));}
 toggle.addEventListener('click',()=>setOpen(panel.style.display!=='block'));
 $('lx-connect-close').addEventListener('click',()=>setOpen(false));
 $('lx-connect-test').addEventListener('click',async()=>{
  const raw=$('lx-sb-url').value.trim(),key=$('lx-sb-key').value.trim();
  let u;
  try{u=new URL(raw);}catch{out.textContent='❌ 專案網址格式不正確。';return;}
  if(u.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(u.hostname) || u.username || u.password || u.port || u.pathname!=='/' && u.pathname!==''){
   out.textContent='❌ 請輸入 Supabase 官方專案網址，例如 https://xxxxx.supabase.co';return;
  }
  if(!key || /service_role|sb_secret_/i.test(key)){
   out.textContent='❌ 請只使用公開 publishable／anon key，禁止輸入管理金鑰。';return;
  }
  out.textContent='連線中…';
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),12000);
  try{
   const response=await fetch(u.origin+'/auth/v1/health',{method:'GET',headers:{apikey:key},signal:ctrl.signal,cache:'no-store'});
   if(response.ok){out.textContent='✅ 已成功連到 Supabase Auth 服務（HTTP '+response.status+'）。\n這只代表網路連通；會員登入、資料表權限及 RLS 尚未驗證。';}
   else{out.textContent='⚠️ 伺服器有回應（HTTP '+response.status+'），但連線測試未通過。請檢查 URL、公開金鑰與專案狀態。';}
  }catch(e){out.textContent='❌ 連線失敗：'+(e.name==='AbortError'?'逾時（12 秒）':'瀏覽器無法連線；可能是網路、CORS、網址或本機檔案限制')+'。';}
  finally{clearTimeout(timeout);}
 });
})();
