/* C09: swipe is locked until complete, saved sharing draft with placement photo. */
(function(){
'use strict';
const previousShare=window.share;
if(typeof previousShare!=='function')return;
let generation=0;
window.lxC09SwipeReady=function(){
 const count=Number(document.getElementById('count')?.value);
 const kind=document.getElementById('lx-pickup-kind')?.value;
 const home=document.getElementById('lx-pickup-address')?.dataset.address;
 const point=document.getElementById('lx-approved-points')?.value;
 const photo=window.lxC09PlacementPhoto?.();
 const saved=document.getElementById('lx-c09-draft-status')?.dataset.saved==='1';
 return !!(Number.isInteger(count)&&count>=2&&count<=1000&&(kind==='home'?home:kind==='point'&&point)&&photo&&saved);
};
window.lxC09UpdateSwipeLock=function(){
 const track=document.getElementById('lx-c09-swipe-track'),knob=document.getElementById('lx-c09-swipe-knob'),label=document.getElementById('lx-c09-swipe-label'),message=document.getElementById('lx-c09-swipe-message');
 if(!track||!knob)return;
 const ready=window.lxC09SwipeReady();
 track.dataset.locked=ready?'0':'1';
 track.style.background=ready?'#078b58':'#a5b8ad';
 knob.style.pointerEvents=ready?'auto':'none';
 knob.tabIndex=ready?0:-1;
 knob.setAttribute('aria-disabled',String(!ready));
 if(track.dataset.done)return;
 if(!ready){
  knob.style.left='5px';knob.setAttribute('aria-valuenow','0');
  if(label)label.textContent='請先完成流程並儲存草稿';
  if(message)message.textContent='須完成衣物件數、取件地點、放置位置拍照，並成功儲存草稿，才能滑動。';
 }else{
  if(label)label.textContent='向右滑動確認分享　››';
  if(message)message.textContent='資料已儲存；滑動僅為介面測試，不會正式送出或派單。';
 }
};
window.share=function(){
 const html=previousShare();
 const stamp=++generation;
 setTimeout(()=>{
  if(stamp!==generation)return;
  const el=document.getElementById('lx-c09-draft-status');
  if(!el)return;
  el.dataset.saved='0';
  const observer=new MutationObserver(()=>{
   const txt=el.textContent||'';
   el.dataset.saved=/^✓ (草稿已儲存至 Supabase|已從 Supabase 恢復上次儲存的草稿與照片)/.test(txt)?'1':'0';
   window.lxC09UpdateSwipeLock();
  });
  observer.observe(el,{childList:true,characterData:true,subtree:true});
  const invalidate=()=>{el.dataset.saved='0';window.lxC09UpdateSwipeLock()};
  for(const id of ['count','lx-pickup-kind','lx-approved-points','lx-placement-note']){
   const field=document.getElementById(id);if(field){field.addEventListener('input',invalidate);field.addEventListener('change',invalidate)}
  }
  const preview=document.getElementById('lx-photo-preview');
  if(preview)new MutationObserver(()=>{
   const txt=el.textContent||'';
   // Restoring a saved photo updates the preview AFTER the save status.
   // Do not invalidate an already restored, unchanged server draft.
   if(/^✓ 已從 Supabase 恢復上次儲存的草稿/.test(txt)){el.dataset.saved='1'}
   else if(!/^✓ 草稿已儲存至 Supabase/.test(txt)){el.dataset.saved='0'}
   window.lxC09UpdateSwipeLock();
  }).observe(preview,{childList:true});
  const address=document.getElementById('lx-pickup-address');
  if(address)new MutationObserver(window.lxC09UpdateSwipeLock).observe(address,{attributes:true,attributeFilter:['data-address']});
  const points=document.getElementById('lx-approved-points');
  if(points)new MutationObserver(window.lxC09UpdateSwipeLock).observe(points,{childList:true});
  window.lxC09InitSwipe?.();
  window.lxC09UpdateSwipeLock();
 },600);
 return html;
};
const originalInit=window.lxC09InitSwipe;
window.lxC09InitSwipe=function(){originalInit?.();window.lxC09UpdateSwipeLock()};
})();
