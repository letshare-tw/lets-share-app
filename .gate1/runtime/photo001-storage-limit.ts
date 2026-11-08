// PHOTO-001 isolated local Supabase Storage API boundary tests. Never touches remote projects.
import {admin,check} from './context.ts';
const bucket='photo001-limit-test';
const storage=admin.storage;
const create=await storage.createBucket(bucket,{public:false,fileSizeLimit:300000,allowedMimeTypes:['image/webp']});
check('PHOTO001 local bucket 300000-byte WebP limit created',!create.error,create.error);
try{
 const make=(size:number)=>{const bytes=new Uint8Array(size);bytes.set([82,73,70,70,0,0,0,0,87,69,66,80],0);return bytes;};
 const good=await storage.from(bucket).upload('boundary-300000.webp',make(300000),{contentType:'image/webp',upsert:false});
 check('PHOTO001 exact 300000 bytes accepted by real Storage API',!good.error,good.error);
 const info=await storage.from(bucket).info('boundary-300000.webp');
 check('PHOTO001 accepted boundary object exists',!info.error,info.error);
 const oversized=await storage.from(bucket).upload('reject-300001.webp',make(300001),{contentType:'image/webp',upsert:false});
 check('PHOTO001 300001 bytes rejected by real Storage API',!!oversized.error);
 const forbidden=await storage.from(bucket).upload('reject-jpeg.jpg',make(120),{contentType:'image/jpeg',upsert:false});
 check('PHOTO001 JPEG bypass rejected by real Storage API',!!forbidden.error);
 const missing=await storage.from(bucket).info('reject-300001.webp');
 check('PHOTO001 oversized object not persisted',!!missing.error);
 console.log('PASS PHOTO001 local Storage hard cap 300000 bytes, 300001 bytes rejected, MIME bypass rejected');
}finally{
 const deleted=await storage.emptyBucket(bucket);
 check('PHOTO001 local bucket emptied',!deleted.error,deleted.error);
 const removed=await storage.deleteBucket(bucket);
 check('PHOTO001 local bucket removed',!removed.error,removed.error);
}
