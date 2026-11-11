(() => {
'use strict';
const $=s=>document.querySelector(s), eventId=new URLSearchParams(location.search).get('event')||'';
const validId=/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId), draftKey='io-invitation-draft:'+eventId;
const DB='io-invitation-media-demo', MAX_IMAGE=8*1024*1024, MAX_VIDEO=25*1024*1024;
const CATEGORY={
 'Pernikahan':{one:'Nama lengkap mempelai pria',two:'Nama lengkap mempelai wanita',family:[['groomFather','Nama ayah mempelai pria'],['groomMother','Nama ibu mempelai pria'],['brideFather','Nama ayah mempelai wanita'],['brideMother','Nama ibu mempelai wanita']],profiles:true,story:true},
 'Lamaran':{one:'Nama lengkap calon pria',two:'Nama lengkap calon wanita',family:[['groomFather','Nama ayah calon pria'],['groomMother','Nama ibu calon pria'],['brideFather','Nama ayah calon wanita'],['brideMother','Nama ibu calon wanita']],profiles:true,story:true},
 'Pertunangan':{one:'Nama lengkap calon pria',two:'Nama lengkap calon wanita',family:[['groomFather','Nama ayah calon pria'],['groomMother','Nama ibu calon pria'],['brideFather','Nama ayah calon wanita'],['brideMother','Nama ibu calon wanita']],profiles:true,story:true},
 'Khitanan / Sunatan':{one:'Nama lengkap anak',two:'Nama panggilan anak (opsional)',family:[['father','Nama ayah'],['mother','Nama ibu']],child:true},
 'Aqiqah':{one:'Nama lengkap anak',two:'Nama panggilan anak (opsional)',family:[['father','Nama ayah'],['mother','Nama ibu']],child:true},
 'Kelahiran Bayi':{one:'Nama lengkap bayi',two:'Nama panggilan bayi (opsional)',family:[['father','Nama ayah'],['mother','Nama ibu']],child:true},
 'Ulang Tahun':{one:'Nama yang berulang tahun',two:'Usia / tema (opsional)',family:[['host','Nama orang tua / penyelenggara']],},
 'Wisuda':{one:'Nama wisudawan / wisudawati',two:'Gelar / jenjang (opsional)',family:[['family','Nama keluarga / penyelenggara']]},
 'Kelulusan':{one:'Nama yang lulus',two:'Jenjang / sekolah (opsional)',family:[['family','Nama keluarga / penyelenggara']]},
 'Syukuran':{one:'Nama keluarga / penyelenggara',two:'Keterangan acara (opsional)',family:[['family','Nama keluarga (opsional)']]},
 'Tasyakuran':{one:'Nama keluarga / penyelenggara',two:'Keterangan acara (opsional)',family:[['family','Nama keluarga (opsional)']]},
 'Keagamaan':{one:'Nama penyelenggara',two:'Nama kegiatan (opsional)',family:[['host','Nama keluarga / penyelenggara']]},
 'Spiritual':{one:'Nama penyelenggara',two:'Nama kegiatan (opsional)',family:[['host','Nama keluarga / penyelenggara']]},
 'Pengajian':{one:'Nama penyelenggara',two:'Nama kegiatan (opsional)',family:[['host','Nama keluarga / penyelenggara']]},
 'Peresmian':{one:'Nama tempat / usaha',two:'Nama pemilik / penyelenggara (opsional)',family:[['host','Nama penyelenggara']]},
 'Gathering':{one:'Nama komunitas / perusahaan',two:'Nama kegiatan (opsional)',family:[['host','Nama penyelenggara']]},
 'Reuni':{one:'Nama sekolah / angkatan',two:'Tema reuni (opsional)',family:[['host','Nama panitia']]},
 'Seminar / Workshop':{one:'Nama kegiatan',two:'Nama penyelenggara (opsional)',family:[['host','Narasumber / penyelenggara']]},
 'Konferensi':{one:'Nama konferensi',two:'Nama penyelenggara (opsional)',family:[['host','Narasumber / penyelenggara']]},
 'Acara Keluarga':{one:'Nama keluarga / tuan rumah',two:'Nama kegiatan (opsional)',family:[['host','Nama penyelenggara']]},
 'Memorial / Peringatan':{one:'Nama yang diperingati',two:'Keterangan acara (opsional)',family:[['host','Nama keluarga / penyelenggara']]},
 'Lain-lain':{one:'Nama / judul utama undangan',two:'Keterangan tambahan (opsional)',family:[['host','Nama keluarga / pihak penyelenggara (opsional)']] }
};
const BANKS=[
'BCA','Bank Mandiri','BRI','BNI','BTN','Bank Syariah Indonesia','Bank Muamalat','CIMB Niaga','Danamon','PermataBank','Maybank Indonesia','OCBC Indonesia','PaninBank','Bank Mega','SMBC Indonesia','Bank Sinarmas','KB Bank','Bank Jasa Jakarta','Bank Mestika Dharma','Bank Ina Perdana','Bank Victoria International','Bank Artha Graha Internasional','Bank Maspion','Bank Ganesha','Bank Oke Indonesia','Bank Sahabat Sampoerna','Bank Bumi Arta','QNB Indonesia','Bank Woori Saudara','JTrust Bank','Bank Mayapada','Bank Capital Indonesia','MNC Bank','Bank Nationalnobu','Bank SBI Indonesia','Bank Resona Perdania','Bank CTBC Indonesia','Bank of India Indonesia','Bank Amar Indonesia','Hibank Indonesia','Bank Jago','SeaBank','blu by BCA Digital','Bank Neo Commerce (neobank)','Allo Bank','Superbank','LINE Bank (Hana Bank)','Bank Raya','Bank Saqu','Krom Bank','Bank Aladin Syariah','Bank Nano Syariah','BTPN Syariah','Bank Mega Syariah','BCA Syariah','Bank Victoria Syariah','Panin Dubai Syariah','HSBC Indonesia','DBS Indonesia','UOB Indonesia','Standard Chartered','Citibank Indonesia','MUFG Bank','Mizuho Bank','ICBC Indonesia','China Construction Bank Indonesia','Bank of China','ANZ Indonesia','Shinhan Bank Indonesia','Hana Bank','Bangkok Bank','Deutsche Bank','JPMorgan Chase Bank','Bank of America','BNP Paribas Indonesia','Bank Aceh Syariah','Bank DKI','Bank BJB','BJB Syariah','Bank Jateng','Bank Jatim','Bank DIY','Bank Banten','Bank Sumut','Bank Nagari','Bank Riau Kepri Syariah','Bank Sumsel Babel','Bank Lampung','Bank Jambi','Bank Bengkulu','Bank Kalbar','Bank Kalteng','Bank Kalsel','Bank Kaltimtara','Bank Sulselbar','Bank SulutGo','Bank Sulteng','Bank Sultra','Bank NTB Syariah','Bank NTT','Bank Maluku Malut','Bank Papua','Bank Syariah lainnya','Bank daerah lainnya'
];
let category='Lain-lain', mediaKeys={}, objectUrls=[], categoryContent={};
const toast=m=>{const n=$('#toast');if(!n)return;n.textContent=m;n.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove('show'),2800)};
const readContent=()=>{
 const family={};document.querySelectorAll('[data-family-key]').forEach(n=>family[n.dataset.familyKey]=n.value.trim());
 const content={family,bankAccounts:[],featuredCount:Number($('#gallery-count')?.value||0),stories:[],mapUrl:$('#map-url')?.value.trim()||'',categoryData:{...categoryContent}};
 document.querySelectorAll('.bank-account').forEach(box=>{const bank=box.querySelector('[data-bank]').value,holder=box.querySelector('[data-holder]').value.trim(),number=box.querySelector('[data-number]').value.trim(),manualBank=box.querySelector('[data-manual-bank]')?.value.trim()||'';if(bank||holder||number||manualBank)content.bankAccounts.push({bank,manualBank,holder,number})});
 for(let i=1;i<=3;i++){const text=$('#story-text-'+i)?.value.trim()||'';if(text||mediaKeys['story-'+i])content.stories.push({index:i,text})}
 content.categoryData[category]={family:{...family},personOne:$('#person-one')?.value||'',personTwo:$('#person-two')?.value||'',stories:content.stories,bankAccounts:content.bankAccounts,featuredCount:content.featuredCount,mapUrl:content.mapUrl};
 return content;
};
const openDB=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const putMedia=async(key,file)=>{const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('media','readwrite');t.objectStore('media').put(file,key);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)}})};
const getMedia=async key=>{if(!key)return null;const db=await openDB();return new Promise((resolve,reject)=>{const q=db.transaction('media').objectStore('media').get(key);q.onsuccess=()=>{db.close();resolve(q.result||null)};q.onerror=()=>{db.close();reject(q.error)}})};
const renderFamilies=(data={})=>{const cfg=CATEGORY[category]||CATEGORY['Lain-lain'],wrap=$('#family-fields');wrap.replaceChildren();cfg.family.forEach(([key,label])=>{const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.maxLength=120;input.dataset.familyKey=key;input.value=data[key]||'';l.append(input);wrap.append(l)});$('#person-one-label').firstChild.textContent=cfg.one;$('#person-two-label').firstChild.textContent=cfg.two;$('#family-heading').textContent=category==='Pernikahan'||category==='Lamaran'||category==='Pertunangan'?'Data orang tua kedua calon mempelai':cfg.child?'Data orang tua anak':'Data keluarga / penyelenggara';$('#family-help').textContent=category==='Pernikahan'?'Isi nama ayah dan ibu dari masing-masing mempelai.':category==='Lamaran'||category==='Pertunangan'?'Isi nama ayah dan ibu dari masing-masing calon mempelai.':cfg.child?'Isi nama ayah dan ibu anak.':'Isi nama keluarga atau pihak penyelenggara jika diperlukan.';$('#profile-photo-section').hidden=!cfg.profiles&&!cfg.child;$('#groom-photo-title').textContent=cfg.child?'Foto anak':'Foto pria';$('#groom-upload').dataset.mediaKind=cfg.child?'child':'groom';$('#bride-photo-title').textContent='Foto wanita';$('#bride-upload').closest('.upload-box').hidden=!cfg.profiles;$('#story-section').hidden=!cfg.story;$('#story-upload-list').replaceChildren();if(cfg.story){for(let i=1;i<=3;i++){const box=document.createElement('div');box.className='story-editor';box.innerHTML='<strong>Sesi '+i+'</strong><p class="field-help">'+(['Pertama kali bertemu','Perjalanan hubungan','Komitmen menuju pernikahan'][i-1])+'</p><label>Foto sesi '+i+'<input type="file" id="story-upload-'+i+'" data-media-kind="story-'+i+'" accept="image/jpeg,image/png,image/webp"></label><div class="media-preview" id="story-'+i+'-preview"></div><label>Kronologi cerita<textarea id="story-text-'+i+'" rows="3" maxlength="1500" placeholder="Ceritakan perjalanan pada sesi ini…"></textarea></label>';$('#story-upload-list').append(box)}}};
const galleryRender=(count=0)=>{const wrap=$('#gallery-upload-list');wrap.replaceChildren();for(let i=1;i<=count;i++){const box=document.createElement('div');box.className='upload-box';box.innerHTML='<strong>Foto unggulan '+i+'</strong><p>JPG/PNG/WEBP — maks. 8 MB.</p><input type="file" data-media-kind="gallery-'+i+'" accept="image/jpeg,image/png,image/webp"><div class="media-preview" id="gallery-'+i+'-preview"></div>';wrap.append(box)}};
const addBank=(data={})=>{const wrap=$('#bank-account-list');if(wrap.children.length>=2)return toast('Maksimal dua rekening.');const box=document.createElement('div');box.className='bank-account upload-box';const listId='bank-options-'+(wrap.children.length+1);const options=[...BANKS,'Bank lainnya (isi manual)'].map(n=>'<option value="'+n.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></option>').join('');box.innerHTML='<div class="bank-picker"><span class="bank-mark" data-bank-mark>🏦</span><label>Cari / pilih bank<input data-bank list="'+listId+'" autocomplete="off" placeholder="Ketik nama bank"></label><datalist id="'+listId+'">'+options+'</datalist></div><label class="manual-bank" hidden>Nama bank<input data-manual-bank maxlength="100" placeholder="Masukkan nama bank"></label><label>Nama pemilik rekening<input data-holder maxlength="120" placeholder="Nama sesuai rekening"></label><label>Nomor rekening<input data-number inputmode="numeric" maxlength="40" placeholder="Nomor rekening"></label><button type="button" class="secondary-button remove-bank">Hapus rekening</button>';const bankInput=box.querySelector('[data-bank]'),manual=box.querySelector('[data-manual-bank]'),mark=box.querySelector('[data-bank-mark]');bankInput.value=data.bank||'';box.querySelector('[data-holder]').value=data.holder||'';box.querySelector('[data-number]').value=data.number||'';manual.value=data.manualBank||'';const update=()=>{const custom=bankInput.value==='Bank lainnya (isi manual)'||bankInput.value==='__other';box.querySelector('.manual-bank').hidden=!custom;const name=custom?(manual.value||'Bank'):bankInput.value;mark.textContent=name.split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'🏦'};bankInput.addEventListener('input',update);manual.addEventListener('input',update);box.querySelector('.remove-bank').addEventListener('click',()=>box.remove());wrap.append(box);update()};
const renderMedia=(kind,url)=>{const previewKind=kind==='child'?'groom':kind;const box=$('#'+previewKind+'-preview');if(!box||!url)return;const el=document.createElement(kind==='video'?'video':'img');el.src=url;el.alt=kind+' undangan';if(kind==='video'){el.controls=true;el.playsInline=true}box.replaceChildren(el);if(kind==='hero'||kind==='cover'){const hero=$('#preview-cover'),img=document.createElement('img');img.src=url;img.alt='Foto pembuka undangan';hero.replaceChildren(img)}};
const preview=()=>{const val=id=>$('#'+id)?.value||'';$('#preview-title').textContent=val('event-title')||'Nama acara';$('#preview-names').textContent=[val('person-one'),val('person-two')].filter(Boolean).join(' & ');$('#preview-opening').textContent=val('opening-text');$('#preview-date').textContent=val('event-date')?new Date(val('event-date')).toLocaleString('id-ID'):'Tanggal acara';$('#preview-location').textContent=val('event-location');$('#preview-closing').textContent=val('closing-text');$('#preview-category').textContent=category.toUpperCase()};
const fields=['event-title','person-one','person-two','opening-text','event-date','event-location','closing-text','media-url','map-url'];
const saved=(()=>{try{return JSON.parse(localStorage.getItem(draftKey)||'{}')}catch{return {}}})();
const savedContent=saved.content||{};
const handleUpload=async(input)=>{const kind=input.dataset.mediaKind,file=input.files?.[0];if(!file)return;const video=kind==='video',valid=video?/^video\/(mp4|webm)$/.test(file.type)&&file.size<=MAX_VIDEO:/^image\/(jpeg|png|webp)$/.test(file.type)&&file.size<=MAX_IMAGE;if(!valid){toast(video?'Video harus MP4/WebM maksimal 25 MB.':'Foto harus JPG/PNG/WEBP maksimal 8 MB.');input.value='';return}try{const key=eventId+':'+kind;await putMedia(key,file);mediaKeys[kind]=key;const url=URL.createObjectURL(file);objectUrls.push(url);renderMedia(kind,url);saveLocal();toast('Media '+kind+' tersimpan di perangkat dan siap diunggah.')}catch(e){toast('Gagal menyimpan media: '+e.message)}};
function saveLocal(){const draft={...Object.fromEntries(fields.map(id=>[id,$('#'+id)?.value||''])),content:readContent(),mediaKeys,savedAt:new Date().toISOString()};localStorage.setItem(draftKey,JSON.stringify(draft));return draft}
async function saveCloud(){
  const draft=saveLocal(),cloudMedia={...mediaKeys};
  const categoryResponse=await fetch('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({category})});
  const categoryResult=await categoryResponse.json().catch(()=>({}));if(!categoryResponse.ok)throw new Error(categoryResult.error||'Kategori acara gagal diperbarui.');
  for(const [kind,key] of Object.entries(cloudMedia)){
   if(typeof key!=='string'||!key.startsWith(eventId+':'))continue;
   const file=await getMedia(key);if(!file)throw new Error('File '+kind+' tidak ditemukan di perangkat. Pilih ulang media tersebut.');
   const ticket=await fetch('/api/admin/upload-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,kind,contentType:file.type,size:file.size})});
   const uploadInfo=await ticket.json().catch(()=>({}));if(!ticket.ok)throw new Error(uploadInfo.error||'Izin upload '+kind+' gagal.');
   const sent=await fetch(uploadInfo.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!sent.ok)throw new Error('Upload '+kind+' gagal ('+sent.status+').');
   cloudMedia[kind]=uploadInfo.key;
  }
  const res=await fetch('/api/owner/events/'+encodeURIComponent(eventId)+'/draft',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#event-title').value,personOne:$('#person-one').value,personTwo:$('#person-two').value,opening:$('#opening-text').value,date:$('#event-date').value,location:$('#event-location').value,closing:$('#closing-text').value,mediaUrl:$('#media-url').value,content:draft.content,media:cloudMedia})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Gagal menyimpan draft cloud');
  mediaKeys=cloudMedia;saveLocal();toast('Draft tersimpan di cloud dan link tamu sudah dapat dibuka.');
}
window.IOEditor={eventId,get mediaKeys(){return mediaKeys},set mediaKeys(v){mediaKeys=v},readContent,saveLocal,toast};
const form=$('#invitation-form');
if(form){
 const categoryNode=$('#editor-event-category');
 const init=async()=>{
  if(!validId){$('#editor-access-required').hidden=false;$('#editor-workspace').hidden=true;return}
  const [authR,eventsR,draftR,invR]=await Promise.all([fetch('/api/auth/me',{credentials:'same-origin'}),fetch('/api/owner/events',{credentials:'same-origin'}),fetch('/api/owner/events/'+encodeURIComponent(eventId)+'/draft',{credentials:'same-origin'}),fetch('/api/invitation/'+encodeURIComponent(eventId))]);
  const auth=await authR.json().catch(()=>null);if(!auth?.authenticated||auth.user?.role!=='owner')throw Error('Login Owner diperlukan. Buka Owner Dashboard lalu masuk kembali.');
  if(!eventsR.ok)throw Error('Daftar acara tidak dapat dibaca.');const ev=(await eventsR.json()).events.find(x=>x.eventId===eventId);if(!ev)throw Error('Acara tidak ditemukan.');
  category=ev.category||'Lain-lain';
  if(category==='Lain-lain'&&/(kawinan|pernikahan|wedding)/i.test(eventId))category='Pernikahan';
  $('#event-category').value=category;$('#editor-event-name').textContent=ev.title||eventId;$('#editor-event-id').textContent=eventId;categoryNode.textContent=category+(ev.religion?' · '+ev.religion:'');$('#event-title').value=ev.title||eventId;$('#cloud-event-id').value=eventId;
  const draftData=draftR.ok?(await draftR.json()).draft:null,inv=invR.ok?await invR.json():null,src=draftData||inv||saved;
  categoryContent={...(src.content?.categoryData||{})};
  const sourceCategory=src.category||category;
  if(sourceCategory!==category)categoryContent[sourceCategory]={family:src.content?.family||{},personOne:src.personOne||'',personTwo:src.personTwo||'',stories:src.content?.stories||[],bankAccounts:src.content?.bankAccounts||[],featuredCount:src.content?.featuredCount||0,mapUrl:src.content?.mapUrl||''};
  const activeContent=sourceCategory===category?(src.content||{}):(categoryContent[category]||{});
  renderFamilies(activeContent.family||{});$('#gallery-count').value=String(activeContent.featuredCount||0);galleryRender(Number($('#gallery-count').value));
  fields.forEach(id=>{const map={'event-title':'title','opening-text':'opening','event-date':'date','event-location':'location','closing-text':'closing','media-url':'mediaUrl','map-url':'mapUrl'};if(src[map[id]||id]!==undefined&&src[map[id]||id]!==null&&id!=='map-url')$('#'+id).value=src[map[id]||id]});
  if(sourceCategory===category||!src.category){if(src.personOne!==undefined)$('#person-one').value=src.personOne;if(src.personTwo!==undefined)$('#person-two').value=src.personTwo}else{$('#person-one').value=activeContent.personOne||'';$('#person-two').value=activeContent.personTwo||''}
  $('#map-url').value=activeContent.mapUrl||'';
  (activeContent.bankAccounts||[]).slice(0,2).forEach(addBank);
  if(activeContent.stories){activeContent.stories.forEach(st=>{const el=$('#story-text-'+st.index);if(el)el.value=st.text||''})}
  mediaKeys={...(inv?.media||{}),...(draftData?.media||{}),...(saved.mediaKeys||{})};
  if(inv?.mediaUrls){for(const kind of Object.keys(inv.mediaUrls))if(inv.mediaUrls[kind])renderMedia(kind,inv.mediaUrls[kind])}
  for(const [kind,key] of Object.entries(mediaKeys)){if(typeof key==='string'&&key.startsWith(eventId+':')){try{const file=await getMedia(key);if(file){const url=URL.createObjectURL(file);objectUrls.push(url);renderMedia(kind,url)}}catch{}}}
  if(draftData?.media){for(const [kind,key] of Object.entries(draftData.media))if(key&&!inv?.mediaUrls?.[kind]){}}
  $('#editor-access-required').hidden=true;$('#editor-workspace').hidden=false;$('#guest-preview-link').href='./guest.html?event='+encodeURIComponent(eventId);$('#cloud-guest-link').href='./guest.html?event='+encodeURIComponent(eventId);preview();
 };
 form.addEventListener('input',preview);form.addEventListener('change',e=>{if(e.target.matches('[data-media-kind]'))handleUpload(e.target);if(e.target.id==='gallery-count')galleryRender(Number(e.target.value));if(e.target.id==='event-category'){
  const previous=category;categoryContent[previous]={...(categoryContent[previous]||{}),family:Object.fromEntries([...document.querySelectorAll('[data-family-key]')].map(n=>[n.dataset.familyKey,n.value])),personOne:$('#person-one').value,personTwo:$('#person-two').value};
  category=e.target.value;const next=categoryContent[category]||{};renderFamilies(next.family||{});$('#person-one').value=next.personOne||'';$('#person-two').value=next.personTwo||'';categoryNode.textContent=category;preview();
 }});
 $('#add-bank-account').addEventListener('click',()=>addBank());
 form.addEventListener('submit',async e=>{e.preventDefault();try{await saveCloud()}catch(err){saveLocal();toast('Draft lokal tersimpan. Cloud gagal: '+err.message)}});
 $('#reset-editor').addEventListener('click',()=>{if(confirm('Hapus draft lokal untuk acara ini dan muat ulang editor?')){localStorage.removeItem(draftKey);location.reload()}});
 $('#guest-preview-link').href='./guest.html?event='+encodeURIComponent(eventId);
 init().catch(e=>{const p=$('#editor-access-required p');p.textContent=e.message;$('#editor-access-required').hidden=false;$('#editor-workspace').hidden=true;toast(e.message)});
}
window.addEventListener('pagehide',()=>objectUrls.forEach(URL.revokeObjectURL));
})();