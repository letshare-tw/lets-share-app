const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const fixture=await (await fetch('http://127.0.0.1:8765/__fixture')).json();
  const page=await browser.newPage();
  page.on('pageerror',e=>console.error('BROWSER_JS_ERROR',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER_CONSOLE_ERROR',m.text());});
  let photoPath='';
  const uploads=[];
  page.on('request',r=>{
   if(!r.url().includes('/storage/v1/object/share-placement-photos/'))return;
   photoPath=decodeURIComponent(r.url().split('/storage/v1/object/share-placement-photos/')[1]);
   const bytes=r.postDataBuffer();
   if(!bytes)throw Error('Storage request missing body');
   uploads.push({bytes:bytes.length,contentType:r.headers()['content-type'],path:photoPath});
  });
  await page.addInitScript(f=>{
   globalThis.__P1_LOCAL_TEST_CONFIG__={base:'http://127.0.0.1:8765',key:f.key,submitEndpoint:'http://127.0.0.1:8765/submit'};
   sessionStorage.setItem('lx_supabase_auth_v066g',JSON.stringify({token:f.token}));
  },fixture);
  await page.goto('http://127.0.0.1:8765/c09-v5.html');
  await page.waitForFunction(()=>document.querySelector('#identity')?.textContent?.includes('已登入'),null,{timeout:10000}).catch(async e=>{console.error('IDENTITY_DEBUG',await page.locator('#identity').innerText(),'STATUS_DEBUG',await page.locator('#status').innerText());throw e;});
  await page.locator('input[name="kind"][value="collection_point"]').check();
  await page.waitForFunction(()=>document.querySelector('#pointSelect')?.options.length>1,null,{timeout:12000}).catch(async e=>{console.error('POINTS_DEBUG',await page.locator('#status').innerText(),await page.locator('#pointSelect').innerHTML());throw e;});
  await page.locator('#pointSelect').selectOption({index:1});
  // Generate actual decodable images inside Chromium (not a hand-written invalid PNG).
  const formats=[
   {mime:'image/png',width:2400,height:1600},
   {mime:'image/jpeg',width:1800,height:2600},
   {mime:'image/webp',width:900,height:700},
  ];
  for(const f of formats){
   const input=await page.evaluate(async ({mime,width,height})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    const image=ctx.createImageData(width,height);
    for(let i=0;i<image.data.length;i+=4){
     const p=i/4,x=p%width,y=Math.floor(p/width);
     image.data[i]=(x*17+y*7)%256;
     image.data[i+1]=(x*3+y*19)%256;
     image.data[i+2]=(x*11+y*13)%256;
     image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,0.92));
    if(!blob||blob.type!==mime)throw Error('Browser cannot generate '+mime);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    return {mime:blob.type,base64:btoa(Array.from(bytes, b=>String.fromCharCode(b)).join(''))};
   },f);
   const original=Buffer.from(input.base64,'base64');
   await page.locator('#photo').setInputFiles({name:'sample.'+f.mime.split('/')[1],mimeType:f.mime,buffer:original});
   const result=await page.evaluate(async()=>{
    const compressed=await globalThis.__P1_COMPRESS_PHOTO__(document.querySelector('#photo').files[0]);
    const bitmap=await createImageBitmap(compressed);
    const value={mime:compressed.type,size:compressed.size,width:bitmap.width,height:bitmap.height};
    bitmap.close();return value;
   });
   if(result.mime!=='image/webp'||result.size>300000||Math.max(result.width,result.height)>1280||result.size===0)throw Error('Compression contract failed '+JSON.stringify({source:f,result}));
   console.log('PASS real Chromium compress '+f.mime+' '+f.width+'x'+f.height+' -> '+result.size+' bytes '+result.width+'x'+result.height+' WebP');
  }
  // Last selected image is the WebP case. Check actual outgoing Storage bytes below.
  await page.locator('#placed').check();
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('草稿已儲存'),null,{timeout:20000}).catch(async e=>{console.error('SAVE_DEBUG',await page.locator('#status').innerText());throw e;});
  if(uploads.length!==1||uploads[0].bytes>300000||uploads[0].contentType!=='image/webp'||!uploads[0].path.endsWith('.webp'))throw Error('Real Storage upload violates 300 KB WebP policy: '+JSON.stringify(uploads));
  console.log('PASS actual Storage upload: '+JSON.stringify(uploads));
  console.log('PASS browser created actual draft, uploaded photo and saved details');
  await page.locator('#preflight').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('提交前檢查通過'),null,{timeout:20000}).catch(async e=>{console.error('PREFLIGHT_DEBUG',await page.locator('#status').innerText());throw e;});
  console.log('PASS browser real RPC preflight and published agreement');
  for(const id of ['transfer','noReturn','recycling'])await page.locator('#'+id).check();
  await page.locator('#submit').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('正式申報成功'),null,{timeout:20000}).catch(async e=>{console.error('SUBMIT_DEBUG',await page.locator('#status').innerText());throw e;});
  console.log('PASS browser real JWT -> trusted Deno submit handler -> DB transaction');
  const message=await page.locator('#status').innerText();
  const saved=await page.locator('#status').innerText();
  const details={request_id:photoPath.split('/')[1],photo_path:photoPath};
  if(!details.request_id||!details.photo_path)throw Error('No actual upload captured');
  const r=await fetch('http://127.0.0.1:8765/__verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)});
  if(!r.ok||!(await r.json()).pass)throw Error('DB verification failed');
  console.log('PASS DB verifies submitted request, Storage photo, one bag, exact 48 hours');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
