
/* V0.6.1a: additive diagnostics only; no legacy navigation, photo or storage overrides. */
(function(){
  var errors=[];
  function record(message){
    errors.push(new Date().toLocaleString('zh-TW')+'｜'+String(message));
    if(errors.length>30)errors.shift();
    var badge=document.getElementById('lx-debug-badge');
    if(badge)badge.textContent='⚠️ 錯誤 '+errors.length;
  }
  window.addEventListener('error',function(e){record(e.message||'未知腳本錯誤')});
  window.addEventListener('unhandledrejection',function(e){record(e.reason&&e.reason.message||e.reason||'非同步錯誤')});
  window.lxShowErrors=function(){
    var existing=document.getElementById('lx-debug-panel');
    if(existing){existing.remove();return;}
    var panel=document.createElement('div');panel.id='lx-debug-panel';
    panel.style.cssText='position:fixed;z-index:99999;inset:12% 4% 8%;overflow:auto;background:white;color:#173b2c;border:2px solid #17865c;border-radius:14px;padding:16px;box-shadow:0 8px 40px #0005;font:14px/1.6 sans-serif';
    var title=document.createElement('h3');title.textContent='樂享家｜錯誤診斷（不含個人資料）';panel.appendChild(title);
    var content=document.createElement('pre');content.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';content.textContent=errors.length?errors.join('\n\n'):'目前尚未偵測到 JavaScript 錯誤。若功能不正常，請記錄操作步驟。';panel.appendChild(content);
    var close=document.createElement('button');close.textContent='關閉';close.onclick=function(){panel.remove()};panel.appendChild(close);
    document.body.appendChild(panel);
  };
  function init(){
    if(document.getElementById('lx-debug-badge'))return;
    var b=document.createElement('button');b.id='lx-debug-badge';b.type='button';b.textContent='檢查錯誤';b.onclick=window.lxShowErrors;
    b.style.cssText='position:fixed;right:8px;bottom:76px;z-index:9999;background:#fff;color:#176543;border:1px solid #9acbb0;border-radius:18px;padding:6px 10px;font-size:11px;box-shadow:0 2px 8px #0002';
    document.body.appendChild(b);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
