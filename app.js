(() => {
  'use strict';
  const OWNER_DOMAIN = 'undangandigital-iODigitalInvitation.edgeone.dev';
  const CATEGORY_LABELS = {pernikahan:'UndanganPernikahan',lamaran:'UndanganLamaran',aqiqah:'UndanganAqiqah',khitanan:'UndanganKhitanan',keagamaan:'UndanganKeagamaan','ulang-tahun':'UndanganUlangTahun',lainnya:'UndanganLainnya'};
  const $ = (s) => document.querySelector(s);
  const KEY = 'io-invitation-demo-v1';
  const DB = 'io-invitation-media-demo';
  const slugify = (v) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');
  const toast = (message) => { const n=$('#toast'); if(!n)return; n.textContent=message; n.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>n.classList.remove('show'),2200); };
  const showView = (name) => { document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); const t={overview:'Ringkasan',events:'Acara',links:'Generator Link',editor:'Editor Undangan',settings:'Pengaturan'}; const p=$('#page-title'); if(p)p.textContent=t[name]||'Ringkasan'; };
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
  const linkForm=$('#link-form');
  if(linkForm) linkForm.addEventListener('submit',(e)=>{e.preventDefault();const admin=slugify($('#host-owner').value),guest=slugify($('#guest-name').value),cat=CATEGORY_LABELS[$('#event-category').value]||CATEGORY_LABELS.lainnya;if(!admin||!guest){toast('Nama penyelenggara dan tamu wajib diisi.');return;}const id=(admin+'-'+slugify(cat)).slice(0,120).replace(/-+$/,'');const guestHost=(guest+'-'+id).slice(0,180).replace(/-+$/,'');$('#owner-url').textContent=OWNER_DOMAIN;$('#admin-url').textContent=id+'.'+OWNER_DOMAIN;$('#guest-url').textContent=guestHost+'.'+OWNER_DOMAIN;});
  document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#'+b.dataset.copy).textContent);toast('Link berhasil disalin.');}catch{toast('Clipboard tidak tersedia di browser ini.');}}));
  const openDB=()=>new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('media');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const putMedia=async(key,file)=>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').put(file,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});};
  const getMedia=async(key)=>{if(!key)return null;const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('media').objectStore('media').get(key);req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>reject(req.error);});};
  const fields=['event-title','person-one','person-two','opening-text','event-date','event-location','closing-text','media-url'];
  const readFields=()=>Object.fromEntries(fields.map(id=>[id,$('#'+id)?.value||'']));
  const data=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}};
  let mediaKeys={cover:null,video:null}, objectUrls=[];
  const showMedia=(kind,file)=>{const box=$('#'+kind+'-preview');if(!box)return;box.replaceChildren();if(!file)return;const url=URL.createObjectURL(file);objectUrls.push(url);const el=document.createElement(kind==='cover'?'img':'video');el.src=url;if(kind==='cover')el.alt='Preview foto sampul';else{el.controls=true;el.playsInline=true;}box.append(el);if(kind==='cover'){const hero=$('#preview-cover');hero.replaceChildren(el.cloneNode());}};
  const updatePreview=()=>{const v=readFields();$('#preview-title').textContent=v['event-title']||'Nama acara';$('#preview-names').textContent=[v['person-one'],v['person-two']].filter(Boolean).join(' & ')||'Nama pasangan';$('#preview-opening').textContent=v['opening-text'];$('#preview-date').textContent=v['event-date']?new Date(v['event-date']).toLocaleString('id-ID'):'Tanggal acara';$('#preview-location').textContent=v['event-location']||'Lokasi acara';$('#preview-closing').textContent=v['closing-text'];};
  const form=$('#invitation-form');
  if(form){
    fields.forEach(id=>$('#'+id).addEventListener('input',updatePreview));
    $('#cover-upload').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>8*1024*1024){toast('Foto harus JPG/PNG/WEBP dan maksimal 8 MB.');e.target.value='';return;}try{mediaKeys.cover='cover';await putMedia('cover',f);showMedia('cover',f);}catch{toast('Browser tidak mendukung penyimpanan media lokal.');}});
    document.querySelectorAll('.upload-box').forEach(box=>{
      const input=box.querySelector('input[type="file"]');if(!input)return;
      box.addEventListener('dragover',event=>{event.preventDefault();box.classList.add('drag-over');});
      box.addEventListener('dragleave',event=>{if(!box.contains(event.relatedTarget))box.classList.remove('drag-over');});
      box.addEventListener('drop',event=>{
        event.preventDefault();box.classList.remove('drag-over');
        const file=event.dataTransfer?.files?.[0];if(!file)return;
        try{const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
        catch{toast('Drag-and-drop tidak didukung browser ini. Gunakan tombol pilih file.');}
      });
    });
    $('#video-upload').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(!/^video\/(mp4|webm)$/.test(f.type)||f.size>25*1024*1024){toast('Video harus MP4/WebM dan maksimal 25 MB.');e.target.value='';return;}try{mediaKeys.video='video';await putMedia('video',f);showMedia('video',f);}catch{toast('Browser tidak mendukung penyimpanan media lokal.');}});
    form.addEventListener('submit',async e=>{
      e.preventDefault();const localDraft={...readFields(),mediaKeys,savedAt:new Date().toISOString()};
      localStorage.setItem(KEY,JSON.stringify(localDraft));
      const eventId=($('#cloud-event-id').value||'').trim().toLowerCase();
      if(!/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId)){toast('Draft lokal tersimpan. Pilih ID acara untuk menyimpan ke cloud.');return;}
      const payload={title:localDraft['event-title'],personOne:localDraft['person-one'],personTwo:localDraft['person-two'],opening:localDraft['opening-text'],date:localDraft['event-date'],location:localDraft['event-location'],closing:localDraft['closing-text'],mediaUrl:localDraft['media-url']};
      try{const response=await fetch('/api/owner/events/'+encodeURIComponent(eventId)+'/draft',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Gagal menyimpan draft cloud.');toast('Draft acara tersimpan di cloud.');}
      catch(error){toast('Draft lokal tersimpan, cloud gagal: '+error.message);}
    });
    $('#reset-editor').addEventListener('click',()=>{if(!confirm('Reset seluruh draft demo di browser ini?'))return;localStorage.removeItem(KEY);location.reload();});
    const saved=data();fields.forEach(id=>{if(saved[id]!==undefined)$('#'+id).value=saved[id];});mediaKeys=saved.mediaKeys||mediaKeys;
    const selectedEvent=new URLSearchParams(location.search).get('event');
    if(selectedEvent && /^[a-z0-9][a-z0-9-]{2,63}$/.test(selectedEvent)){
      $('#cloud-event-id').value=selectedEvent;
      const link=$('#guest-preview-link');if(link)link.href='./guest.html?event='+encodeURIComponent(selectedEvent);
      Promise.all([
        fetch('/api/owner/events/'+encodeURIComponent(selectedEvent)+'/draft',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch('/api/invitation/'+encodeURIComponent(selectedEvent),{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null)
      ]).then(([draftResult,invitation])=>{
        const content=draftResult?.draft||invitation;
        if(content){
          const values={'event-title':content.title,'person-one':content.personOne,'person-two':content.personTwo,'opening-text':content.opening,'event-date':content.date,'event-location':content.location,'closing-text':content.closing,'media-url':content.mediaUrl};
          Object.entries(values).forEach(([id,value])=>{if(value!==undefined&&value!==null)$('#'+id).value=value;});
          updatePreview();
          toast(draftResult?.draft?'Draft cloud berhasil dimuat.':'Konten undangan terbit berhasil dimuat.');
        }
        if(invitation?.mediaUrls?.cover){const img=document.createElement('img');img.src=invitation.mediaUrls.cover;img.alt='Foto sampul yang sedang diterbitkan';$('#preview-cover').replaceChildren(img);}
        if(invitation?.mediaUrls?.video){const video=document.createElement('video');video.src=invitation.mediaUrls.video;video.controls=true;video.playsInline=true;$('#video-preview').replaceChildren(video);}
      });
    }
    updatePreview();
        if(invitation.mediaUrls?.cover){const img=document.createElement('img');img.src=invitation.mediaUrls.cover;img.alt='Foto sampul yang sedang diterbitkan';$('#preview-cover').replaceChildren(img);}
        if(invitation.mediaUrls?.video){const video=document.createElement('video');video.src=invitation.mediaUrls.video;video.controls=true;video.playsInline=true;$('#video-preview').replaceChildren(video);}
        toast('Konten undangan cloud berhasil dimuat untuk diedit.');
      }).catch(()=>toast('Konten cloud belum dapat dimuat. Draft lokal tetap tersedia.'));
    }
    updatePreview();
    Promise.all([getMedia(mediaKeys.cover),getMedia(mediaKeys.video)]).then(([cover,video])=>{if(cover)showMedia('cover',cover);if(video)showMedia('video',video);}).catch(()=>{});
    const guestLink=$('#guest-preview-link');if(guestLink)guestLink.href='./guest.html?event='+(selectedEvent||'demo');
  }
  if(linkForm)linkForm.dispatchEvent(new Event('submit',{cancelable:true}));
})();