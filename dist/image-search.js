let indexPromise;
export function showImageSearch({openModal,movies,movieUrl,esc,onResults}){
 openModal(`<section class="image-search-panel" aria-labelledby="image-search-title"><header class="image-search-header"><h2 id="image-search-title"><span class="image-search-icon" aria-hidden="true"></span>以图搜图</h2></header><div class="image-search-body"><p id="image-search-type-label">内容类型选择：</p><div class="image-search-types" role="group" aria-labelledby="image-search-type-label">${[['long','长视频'],['short','短视频']].map(([value,label],i)=>`<button type="button" data-image-type="${value}" aria-pressed="${!i}">${label}<span class="image-search-check" aria-hidden="true"></span></button>`).join('')}</div><label class="image-search-upload"><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择用于搜索的图片"><span class="image-search-upload-symbol" aria-hidden="true"></span><span><strong>点击选择图片</strong></span><span class="image-search-hint">支持 JPG、PNG、WebP，最大 10MB</span><span class="image-search-loading" role="status" aria-live="polite" hidden><span class="image-search-spinner" aria-hidden="true"></span><span>正在匹配相似影片，请稍后</span></span></label><div class="image-search-preview" hidden><img alt="用于搜索的图片"><span class="image-search-filename"></span><button type="button" class="image-search-remove">移除图片</button></div><p class="image-search-status" role="status" aria-live="polite"></p><div class="image-search-results"></div></div></section>`);
 const panel=document.querySelector('.image-search-panel'),input=panel.querySelector('input'),status=panel.querySelector('.image-search-status'),results=panel.querySelector('.image-search-results'),preview=panel.querySelector('.image-search-preview'),upload=panel.querySelector('.image-search-upload');
 let generation=0,selectedType='long',selectedFile=null;
 panel.closest('dialog').addEventListener('close',()=>{generation++;},{once:true});
 function setLoading(loading){
  panel.toggleAttribute('data-loading',loading);
  panel.setAttribute('aria-busy',String(loading));
  upload.querySelector('.image-search-loading').hidden=!loading;
  input.disabled=loading;
  panel.querySelectorAll('[data-image-type]').forEach(button=>button.disabled=loading);
 }

 panel.querySelectorAll('[data-image-type]').forEach(button=>button.addEventListener('click',()=>{
  selectedType=button.dataset.imageType;
  panel.querySelectorAll('[data-image-type]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  if(selectedFile)search(selectedFile);
 }));
 input.addEventListener('change',()=>{if(input.files[0])search(input.files[0]);input.value='';});
 let dragDepth=0;
 upload.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;upload.classList.add('is-dragging');});
 upload.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
 upload.addEventListener('dragleave',()=>{if(--dragDepth<=0)upload.classList.remove('is-dragging');});
 upload.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;upload.classList.remove('is-dragging');if(!input.disabled&&e.dataTransfer.files[0])search(e.dataTransfer.files[0]);});
 panel.querySelector('.image-search-remove').addEventListener('click',()=>{generation++;selectedFile=null;preview.hidden=true;preview.querySelector('img').removeAttribute('src');results.innerHTML='';status.textContent='';setLoading(false);input.focus();});
 async function search(file){
  const token=++generation;
  selectedFile=null;setLoading(false);
  results.innerHTML='';preview.hidden=true;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status.textContent='请选择不超过 10 MB 的 JPG、PNG 或 WebP 图片';input.value='';return;}
  selectedFile=file;
  status.textContent='';setLoading(true);
  let bitmap;
  try{
   bitmap=await createImageBitmap(file);
   const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,8,8);
   const rgba=ctx.getImageData(0,0,8,8).data,pixels=Array.from(rgba).filter((_,i)=>i%4!==3);
   if(!indexPromise)indexPromise=fetch('/image-search-index.json').then(r=>{if(!r.ok)throw Error('index');return r.json()}).catch(e=>{indexPromise=null;throw e});
   const index=await indexPromise;if(token!==generation||!panel.isConnected)return;
   const byId=new Map(movies.map(m=>[m.id,m]));
   const matches=index.filter(row=>{const m=byId.get(row.id);return m&&(selectedType==='long'?m.category!=='短剧':m.category==='短剧');}).map(row=>({movie:byId.get(row.id),distance:row.pixels.reduce((sum,v,i)=>sum+(v-pixels[i])**2,0)})).sort((a,b)=>a.distance-b.distance).slice(0,56);
   const thumb=document.createElement('canvas');thumb.width=180;thumb.height=Math.max(1,Math.round(180*bitmap.height/bitmap.width));if(thumb.height>360){thumb.width=Math.max(1,Math.round(360*bitmap.width/bitmap.height));thumb.height=360;}thumb.getContext('2d').drawImage(bitmap,0,0,thumb.width,thumb.height);preview.querySelector('img').src=thumb.toDataURL();preview.hidden=false;preview.querySelector('.image-search-filename').textContent=file.name;
   const large=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
   large.width=Math.max(1,Math.round(bitmap.width*scale));large.height=Math.max(1,Math.round(bitmap.height*scale));
   large.getContext('2d').drawImage(bitmap,0,0,large.width,large.height);
   panel.closest('dialog').close();
   onResults({ids:[...new Set(matches.map(({movie})=>movie.id))],preview:thumb.toDataURL(),large:large.toDataURL(),name:file.name,type:selectedType});
  }catch{if(token===generation&&panel.isConnected)status.textContent='图片读取或搜索失败，请重新选择图片重试';}
  finally{bitmap?.close();if(token===generation)setLoading(false);}
 }
}
