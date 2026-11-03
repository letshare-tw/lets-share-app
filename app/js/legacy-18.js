
/* V0.6.6o: planned legal operator profile. Read-only, no browser persistence, no Supabase writes. */
(function(){
 const planned=[
  ['營運主體設立狀態','規劃成立新公司｜尚未完成設立'],
  ['公司法定名稱','待公司名稱核定'],
  ['統一編號','待公司登記完成'],
  ['公司登記地址','待確認'],
  ['客服電子郵件','待正式建立與核准'],
  ['客服電話／聯絡方式','待正式建立與核准'],
  ['個資權利行使窗口','待指定'],
  ['正式生效日','尚未設定']
 ];
 window.lxOperatorCard=function(){
  if(!window.__lxRealAuth?.user)return '';
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<section class="card" style="padding:16px;margin:14px 0;border:1px solid #b7d8c4;background:#f8fbf8">
  <b>🏢 營運主體資料規劃｜V0.6.6o</b>
  <p class="muted" style="font-size:12px;line-height:1.85">正式決策 A：未來另設新公司作為「樂享家 Let's Share」平台營運主體。此處為開發規劃預覽，非公司登記證明、非即時後台資料，也不代表已開始正式營運。</p>
  <div style="display:grid;gap:8px">${planned.map(([k,v])=>`<div style="padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #e3eae5"><div style="font-size:12px;color:#687c70">${esc(k)}</div><div style="font-size:14px;font-weight:600;margin-top:4px">${esc(v)}</div></div>`).join('')}</div>
  <p style="font-size:12px;line-height:1.85;color:#6e5a32;margin:12px 0 0">🔒 正式會員服務條款與個資告知將分別引用經核准的公司資料與文件版本。資料核定及法律審閱前，不發布正式文件、不建立正式同意紀錄、不變更註冊完成狀態。</p>
  </section>`;
 };
})();
