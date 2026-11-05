/* C09-DEV-002 stage 1: original sharing page, authenticated location lookup and photo preview.
   NO server-side draft metadata or photo upload until protected APIs are deployed. */
(function(){
 'use strict';
 const URL='https://wxvauoeykusmbxdtwgxo.supabase.co';
 const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
 const SESSION_KEY='lx_supabase_auth_v066g';
 const original=window.share;
 if(typeof original!=='function')return;
 const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
 function session(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
 async function get(path){const token=session()?.token;if(!token)throw Error('請先登入會員');const response=await fetch(URL+'/rest/v1/'+path,{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)throw Error('讀取資料失敗（HTTP '+response.status+'）');return response.json()}
 window.share=function(){
   let html=original();
   html=html.replace('請準備至少 2 件衣物，選擇集貨點','請準備至少 2 件衣物，確認取件地點');
   html=html.replace('預約送件或聯絡樂享職人','放置分享袋並拍攝位置').replace('由系統安排後續物流（本版模擬）','照片供日後受派騎手辨識取件位置');
   html=html.replace(/<label>舊版模擬集貨點（目前不送出）<\/label><select id="point" class="field">[\s\S]*?<\/select>/,
    '<label>取件地點</label><select id="lx-pickup-kind" class="field" onchange="lxC09ChangePickup()"><option value="home">會員住址（預設）</option><option value="point">核定集貨點</option></select><div id="lx-pickup-address" class="muted" aria-live="polite">正在讀取會員住址…</div><select id="lx-approved-points" class="field" style="display:none" aria-label="已核定集貨點"></select><label>分享袋放置位置說明</label><textarea id="lx-placement-note" class="field" maxlength="300" placeholder="例如：一樓大門右側指定置物架"></textarea><label>分享袋放置位置照片（正式提交時至少 1 張，最多 3 張）</label><input id="lx-placement-photos" type="file" accept="image/*" capture="environment" multiple onchange="lxC09PreviewPhotos(this)"><div id="lx-photo-preview" class="muted">目前尚未選取照片。測試階段只在本機預覽，尚未上傳。</div>');
   html=html.replace('前往會員中心建立 Supabase 分享草稿','建立／取得 Supabase 草稿（地點及照片尚未送出）');
   setTimeout(window.lxC09LoadLocations,0);
   return html;
 };
 window.lxC09ChangePickup=function(){const isPoint=document.getElementById('lx-pickup-kind')?.value==='point';const p=document.getElementById('lx-approved-points'),a=document.getElementById('lx-pickup-address');if(p)p.style.display=isPoint?'block':'none';if(a)a.style.display=isPoint?'none':'block'};
 window.lxC09LoadLocations=async function(){
  const a=document.getElementById('lx-pickup-address'),p=document.getElementById('lx-approved-points');if(!a||!p)return;
  try{
   const [profiles,points]=await Promise.all([get('profiles?select=home_address&limit=1'),get('lx_approved_collection_points?select=id,name,address_text&enabled=eq.true&approved_at=not.is.null&order=name.asc')]);
   const address=profiles?.[0]?.home_address;
   a.textContent=address?'會員住址：'+address:'尚未設定會員住址；請先至會員基本資料填寫。';
   p.innerHTML='';
   if(!points?.length){const o=document.createElement('option');o.value='';o.textContent='目前沒有已核定且啟用的集貨點';p.appendChild(o)}
   else points.forEach(item=>{const o=document.createElement('option');o.value=item.id;o.textContent=item.name+'｜'+item.address_text;p.appendChild(o)});
  }catch(e){a.textContent=e.message;p.innerHTML='<option value="">無法讀取核定集貨點</option>'}
 };
 window.lxC09PreviewPhotos=function(input){const out=document.getElementById('lx-photo-preview');if(!out)return;const files=[...(input.files||[])];out.replaceChildren();if(files.length>3){out.textContent='最多只能選擇 3 張照片，請重新選擇。';input.value='';return}if(!files.length){out.textContent='尚未選取照片';return}for(const f of files){if(!f.type.startsWith('image/')){out.textContent='僅接受圖片檔';input.value='';return}const img=document.createElement('img');img.alt='分享袋位置預覽';img.style.cssText='width:31%;margin:1%;border-radius:8px;vertical-align:top';const u=URL.createObjectURL(f);img.onload=()=>URL.revokeObjectURL(u);img.src=u;out.appendChild(img)}const note=document.createElement('p');note.textContent='僅本機預覽，尚未上傳至 Supabase。';out.appendChild(note)};
})();
