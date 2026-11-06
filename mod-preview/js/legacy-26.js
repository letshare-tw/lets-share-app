/* C09 test loop: after successful demo swipe, start a fresh UI-only test. */
(function(){
'use strict';
const original=window.share;
if(typeof original!=='function')return;
window.lxC09NewTest=function(){
 window.lxC09SkipNextRestore=true;
 window.lxC09ResetSwipe?.();
 window.lxC09ClearPhoto?.();
 const count=document.getElementById('count');
 if(count)count.value='2';
 const kind=document.getElementById('lx-pickup-kind');
 if(kind)kind.value='home';
 window.lxC09ChangePickup?.();
 const status=document.getElementById('lx-c09-draft-status');
 if(status){status.dataset.saved='0';status.textContent='新一輪測試已開始；請重新拍照並儲存草稿。'}
 const track=document.getElementById('lx-c09-swipe-track');
 if(track)track.dataset.done='';
 window.lxC09UpdateSwipeLock?.();
 const camera=document.getElementById('lx-placement-camera-button');
 if(camera)camera.scrollIntoView({behavior:'smooth',block:'center'});
 const btn=document.getElementById('lx-c09-new-test');
 if(btn)btn.hidden=true;
};
window.share=function(){
 const html=original();
 setTimeout(()=>{
  const track=document.getElementById('lx-c09-swipe-track');
  if(!track||document.getElementById('lx-c09-new-test'))return;
  const button=document.createElement('button');
  button.id='lx-c09-new-test';button.type='button';button.hidden=true;
  button.textContent='✓ 完成本次測試・開始下一次分享';
  button.style.cssText='display:block;width:100%;padding:15px;margin:14px 0;border-radius:999px;background:#078b58;color:white;border:0;font-weight:700;font-size:16px';
  button.onclick=window.lxC09NewTest;
  track.closest('section')?.appendChild(button);
  const update=()=>{button.hidden=track.dataset.done!=='1';button.style.display=button.hidden?'none':'block'};
  new MutationObserver(update).observe(track,{attributes:true,attributeFilter:['data-done']});
  update();
 },700);
 return html;
};
})();