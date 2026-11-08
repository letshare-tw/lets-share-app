// Real Chromium UI interaction; mocked HTTP boundaries, not a live Auth/Storage/Edge integration test.
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const calls=[];
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith('http://127.0.0.1:8765/'))return route.continue();
  calls.push({url,method:req.method()});
  if(url.includes('/rpc/lx_get_my_home_address'))return route.fulfill({json:{address_text:'臺南市測試路 123 號'}});
  if(url.includes('/lx_approved_collection_points'))return route.fulfill({json:[]});
  if(url.includes('/rpc/lx_create_share_draft'))return route.fulfill({json:'11111111-1111-4111-8111-111111111111'});
  if(url.includes('/storage/v1/object/'))return route.fulfill({json:{Key:'ok'}});
  if(url.includes('/lx_share_draft_details'))return route.fulfill({json:[{request_id:'11111111-1111-4111-8111-111111111111'}]});
  if(url.includes('/rpc/lx_share_submission_preflight'))return route.fulfill({json:{ready:false,reason:'正式分享協議尚未發布'}});
  throw Error('Unexpected network request '+url);
 });
 await page.addInitScript(()=>{
  const payload=btoa(JSON.stringify({sub:'22222222-2222-4222-8222-222222222222'}));
  sessionStorage.setItem('lx_supabase_auth_v066g',JSON.stringify({token:'a.'+payload+'.c'}));
 });
 await page.goto('http://127.0.0.1:8765/c09-v5.html');
 await page.locator('#photo').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSQG8AAAAASUVORK5CYII=','base64')});
 await page.locator('#placed').check();
 await page.locator('#save').click();
 await page.waitForTimeout(200);
 const message=await page.locator('#status').innerText();
 if(!message.includes('安全鎖定')&&!message.includes('尚未設定測試專案金鑰'))throw Error('Expected safe disabled configuration, got '+message);
 if(calls.length)throw Error('Disabled UI unexpectedly called network');
 if(await page.locator('#submit').isEnabled())throw Error('Submit must be disabled');
 console.log('PASS Chromium browser opens C09 V5');
 console.log('PASS upload form cannot write to remote with unset test key');
 console.log('PASS privileged submit stays disabled');
 console.log('PASS zero external network requests');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
