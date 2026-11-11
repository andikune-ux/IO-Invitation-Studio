(() => {
'use strict';
const $=s=>document.querySelector(s),button=$('#publish-cloud');
if(!button)return;
const status=(message,error=false)=>{const n=$('#cloud-status');if(n){n.textContent=message;n.style.color=error?'#b42318':''}};
let ownerReady=false;
fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.json()).then(d=>{ownerReady=Boolean(d.authenticated&&d.user?.role==='owner');button.disabled=!ownerReady;status(ownerReady?'Sesi Owner aktif. Editor dan publikasi tersedia.':'Login sebagai Owner terlebih dahulu melalui Owner Dashboard.',!ownerReady)}).catch(()=>{button.disabled=true;status('Tidak dapat memverifikasi sesi Owner.',true)});
const dbOpen=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('io-invitation-media-demo',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const getFile=async key=>{const db=await dbOpen();return new Promise((resolve,reject)=>{const q=db.transaction('media').objectStore('media').get(key);q.onsuccess=()=>{db.close();resolve(q.result||null)};q.onerror=()=>{db.close();reject(q.error)}})};
async function upload(file,kind,eventId){const ticket=await fetch('/api/admin/upload-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,kind,contentType:file.type,size:file.size})});const t=await ticket.json().catch(()=>({}));if(!ticket.ok)throw Error(t.error||'Tidak bisa meminta izin upload '+kind);status('Mengunggah '+kind+'…');const sent=await fetch(t.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!sent.ok)throw Error('Upload '+kind+' gagal ('+sent.status+').');return t.key}
const value=id=>($('#'+id)?.value||'').trim();
button.addEventListener('click',async()=>{
 if(!ownerReady)return status('Login Owner diperlukan.',true);
 const eventId=value('cloud-event-id').toLowerCase();if(!/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId))return status('ID acara tidak valid.',true);
 button.disabled=true;
 try{
  const editor=window.IOEditor;if(!editor)throw Error('Editor belum siap.');
  const keys={...editor.mediaKeys},media={};
  for(const [kind,key] of Object.entries(keys)){
   if(!key)continue;
   if(key.startsWith(eventId+':')){const file=await getFile(key);if(!file)throw Error('File '+kind+' tidak ditemukan di penyimpanan perangkat. Pilih ulang fotonya.');media[kind]=await upload(file,kind,eventId)}
  }
  if(!media.hero&&!keys.hero)throw Error('Foto Utama wajib diunggah sebelum undangan diterbitkan.');
  const content=editor.readContent();
  status('Menerbitkan seluruh konten undangan…');
  const response=await fetch('/api/admin/publish',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,invitation:{title:value('event-title'),personOne:value('person-one'),personTwo:value('person-two'),opening:value('opening-text'),date:value('event-date'),location:value('event-location'),closing:value('closing-text'),mediaUrl:value('media-url')},content,media})});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Publikasi gagal.');
  const link=$('#cloud-guest-link');link.href='./guest.html?event='+encodeURIComponent(eventId);link.hidden=false;
  editor.mediaKeys={...keys,...media};editor.saveLocal();
  status('Undangan berhasil diterbitkan. Foto Utama, Foto Sampul, Video, dan konten lainnya telah diproses. Link tamu: '+location.origin+link.getAttribute('href'));
 }catch(e){status(e.message||'Publikasi gagal. Periksa konfigurasi backend.',true)}
 finally{button.disabled=!ownerReady}
});
})();