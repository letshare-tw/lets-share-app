/* C09-DEV-002 stage 1: original sharing page, authenticated location lookup and photo preview.
   NO server-side draft metadata or photo upload until protected APIs are deployed. */
(function(){
 'use strict';
 const URL='https://wxvauoeykusmbxdtwgxo.supabase.co';
 const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
 const SESSION_KEY='lx_supabase_auth_v066g';
 const originalHome=window.home;
 if(typeof originalHome==='function'){
  window.home=function(){
   return originalHome().replace(
    '<button class="secondary wide" onclick="go(\'share\')">我要分享衣物</button>',
    '<button class="primary wide" onclick="go(\'share\')" style="background:#078b58;color:#fff;border:0;border-radius:999px;font-weight:800">我要分享衣物 &gt;</button>'
   );
  };
 }
 const original=window.share;
 if(typeof original!=='function')return;
 const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
 function session(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
 async function get(path){const token=session()?.token;if(!token)throw Error('請先登入會員');const response=await fetch(URL+'/rest/v1/'+path,{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)throw Error('讀取資料失敗（HTTP '+response.status+'）');return response.json()}
 window.share=function(){
   let html=original();
   html=html.replace('請準備至少 2 件衣物，選擇集貨點','請準備至少 2 件衣物');
   html=html.replace('同意分享條款','確認取件地點').replace('衣物交付後不退還；不合格衣物授權依法轉贈或回收','預設會員住址，也可選擇已核定集貨點');
   html=html.replace(/<label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1\.6"><input id="agree"[\s\S]*?<\/label>/,'<p class="muted" style="font-size:13px">分享服務條款於開通服務時確認；如條款有重大更新，須重新取得同意。正式分享功能尚未開放。</p>');
   html=html.replace('預約送件或聯絡樂享職人','放置分享袋並拍攝位置').replace('由系統安排後續物流（本版模擬）','照片供日後受派騎手辨識取件位置');
   html=html.replace(/<label>舊版模擬集貨點（目前不送出）<\/label><select id="point" class="field">[\s\S]*?<\/select>/,
    '<label>取件地點</label><select id="lx-pickup-kind" class="field" onchange="lxC09ChangePickup()"><option value="home">會員住址（預設）</option><option value="point">核定集貨點</option></select><div id="lx-pickup-address" class="muted" aria-live="polite">正在讀取會員住址…</div><select id="lx-approved-points" class="field" style="display:none" aria-label="已核定集貨點"></select><label>分享袋放置位置說明</label><textarea id="lx-placement-note" class="field" maxlength="300" placeholder="例如：一樓大門右側指定置物架"></textarea><button id="lx-placement-camera-button" type="button" class="primary wide" onclick="document.getElementById(\'lx-placement-photos\')?.click()" style="margin-top:14px;background:#078b58;color:#fff;border:0;border-radius:999px">📷 拍攝分享放置點</button><input id="lx-placement-photos" type="file" accept="image/*" capture="environment" onchange="lxC09PreviewPhotos(this)" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" aria-label="拍攝分享放置點"><div id="lx-photo-preview" class="muted">目前尚未選取照片。測試階段只在本機預覽，尚未上傳。</div>');
   // Remove the legacy per-share consent checkbox regardless of the label's inline style.
   html=html.replace(/<label\b[^>]*>\s*<input\b[^>]*\bid="agree"[^>]*>[\s\S]*?<\/label>/i,'<p class="muted" style="font-size:13px">分享條款於開通服務時確認，正式提交時由後端驗證同意紀錄。</p>');
   // Remove any remaining legacy consent checkbox block if the HTML attribute order changes.
   html=html.replace(/<label\b[^>]*>[\s\S]{0,350}?<input\b[^>]*\bid="agree"[^>]*>[\s\S]{0,500}?<\/label>/i,'');
   html=html.replace('正式提交時至少 1 張，最多 3 張','正式提交時 1 張');
   // Use one prominent camera button instead of the browser's default file picker.
   html=html.replace(/<label>分享袋放置位置照片（正式提交時 1 張）<\/label><input id="lx-placement-photos"([^>]*)>/,
    '<button id="lx-placement-camera-button" type="button" class="primary wide" onclick="document.getElementById(\'lx-placement-photos\')?.click()" style="margin-top:14px;background:#078b58;color:white;border:0;border-radius:999px">📷 拍攝分享放置點</button><input id="lx-placement-photos"$1 style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" aria-label="拍攝分享放置點">');

   html=html.replace('前往會員中心建立 Supabase 分享草稿','建立／取得 Supabase 草稿（地點及照片尚未送出）');
   // C09 swipe-confirm UI preview only. No submission API is invoked.
   html += '<section style="max-width:520px;margin:24px auto;padding:18px;border:1px solid #dce9e1;border-radius:18px;background:#f8fbf9"><strong style="display:block;margin-bottom:10px;color:#08784c">正式分享｜滑動確認（介面預覽）</strong><div id="lx-c09-swipe-track" style="position:relative;height:68px;border-radius:40px;background:#078b58;touch-action:pan-y;overflow:hidden"><span id="lx-c09-swipe-label" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;padding-left:38px">向右滑動確認分享　››</span><div id="lx-c09-swipe-knob" role="slider" tabindex="0" aria-label="向右滑動確認分享（測試介面）" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="position:absolute;left:5px;top:5px;width:58px;height:58px;border-radius:50%;background:white;color:#078b58;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;touch-action:none;cursor:grab">›</div></div><p id="lx-c09-swipe-message" style="font-size:12px;color:#587363;text-align:center;margin:10px 0 0">僅展示滑動效果，不會送出分享申請或派單。</p><button type="button" id="lx-c09-swipe-reset" onclick="lxC09ResetSwipe()" style="display:none;margin:12px auto 0;padding:8px 16px;border:1px solid #078b58;border-radius:20px;background:white;color:#078b58">重新體驗</button></section>';
   setTimeout(window.lxC09InitSwipe,0);
   setTimeout(window.lxC09LoadLocations,0);
   return html;
 };
 window.lxC09ResetSwipe=function(){const t=document.getElementById('lx-c09-swipe-track'),k=document.getElementById('lx-c09-swipe-knob'),l=document.getElementById('lx-c09-swipe-label'),m=document.getElementById('lx-c09-swipe-message'),b=document.getElementById('lx-c09-swipe-reset');if(!t||!k)return;t.dataset.done='';k.style.left='5px';k.textContent='›';k.setAttribute('aria-valuenow','0');l.textContent='向右滑動確認分享　››';m.textContent='僅展示滑動效果，不會送出分享申請或派單。';if(b)b.style.display='none'};
 window.lxC09InitSwipe=function(){const t=document.getElementById('lx-c09-swipe-track'),k=document.getElementById('lx-c09-swipe-knob'),l=document.getElementById('lx-c09-swipe-label'),m=document.getElementById('lx-c09-swipe-message'),b=document.getElementById('lx-c09-swipe-reset');if(!t||!k||k.dataset.ready)return;k.dataset.ready='1';let active=false,start=0,base=0,pos=0;const max=()=>Math.max(0,t.clientWidth-k.offsetWidth-10);function move(v,smooth){pos=Math.max(0,Math.min(max(),v));k.style.transition=smooth?'left .2s ease':'none';k.style.left=(5+pos)+'px';k.setAttribute('aria-valuenow',String(Math.round(pos/Math.max(1,max())*100)))}function finish(){t.dataset.done='1';move(max(),true);k.textContent='✓';l.textContent='✓ 滑動確認成功';m.textContent='介面測試成功；正式提交功能尚未開放。';if(b)b.style.display='block';if(navigator.vibrate)navigator.vibrate(35)}k.addEventListener('pointerdown',e=>{if(t.dataset.done)return;active=true;start=e.clientX;base=pos;k.setPointerCapture(e.pointerId)});k.addEventListener('pointermove',e=>{if(active)move(base+e.clientX-start,false)});k.addEventListener('pointerup',()=>{if(!active)return;active=false;if(pos>=max()*.82)finish();else move(0,true)});k.addEventListener('pointercancel',()=>{active=false;move(0,true)});k.addEventListener('keydown',e=>{if(t.dataset.done)return;if(e.key==='ArrowRight'){e.preventDefault();move(pos+max()*.2,true)}else if(e.key==='ArrowLeft'){e.preventDefault();move(pos-max()*.2,true)}else if(e.key==='Enter'&&pos>=max()*.82){e.preventDefault();finish()}})};
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
 window.lxC09PreviewPhotos=function(input){const out=document.getElementById('lx-photo-preview');if(!out)return;const files=[...(input.files||[])];const camera=document.getElementById('lx-placement-camera-button');if(!files.length)return;out.replaceChildren();if(files.length>1){out.textContent='每次只能選擇 1 張照片，請重新選擇。';input.value='';return}for(const f of files){if(!f.type.startsWith('image/')){out.textContent='僅接受圖片檔';input.value='';return}if(camera)camera.style.display='none';const img=document.createElement('img');img.alt='分享袋位置預覽';img.style.cssText='width:min(100%,320px);aspect-ratio:1/1;height:auto;object-fit:cover;object-position:center;border-radius:14px;display:block;margin:0 auto';const u=window.URL.createObjectURL(f);img.onload=()=>window.URL.revokeObjectURL(u);img.src=u;const card=document.createElement('div');card.style.cssText='display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 12px;border:1px solid #dce9e1;border-radius:16px;background:#f8fbf9;margin-top:12px;text-align:center';card.appendChild(img);const info=document.createElement('div');info.style.cssText='display:flex;flex-direction:column;align-items:center;gap:10px;width:100%';const status=document.createElement('strong');status.textContent='✓ 已拍攝 1 張';status.style.cssText='color:#087d4f;font-size:15px';info.appendChild(status);const retry=document.createElement('button');retry.type='button';retry.textContent='↻ 重新拍攝';retry.style.cssText='padding:8px 14px;border-radius:999px;border:1px solid #078b58;background:white;color:#078b58;font-weight:700;font-size:14px';retry.onclick=()=>{input.click()};info.appendChild(retry);card.appendChild(info);out.appendChild(card)}const note=document.createElement('p');note.textContent='僅本機預覽，尚未上傳至 Supabase。';out.appendChild(note)};
})();
