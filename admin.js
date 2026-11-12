(() => {
'use strict';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),eventId=(params.get('event')||'').toLowerCase();
$('#event-id').textContent=eventId||'—';
const headers={'Content-Type':'application/json'};
const status=(id,msg,error=false)=>{const n=$('#'+id);n.textContent=msg||'';n.classList.toggle('error',error)};
const toast=msg=>{const n=$('#toast');n.textContent=msg;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2400)};
const valid=/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId);
if(!valid){status('list-status','ID acara tidak valid. Buka link Admin dari dashboard Owner.',true);$('#guest-form').hidden=true;return;}
let guests=[],issuedLinks={};
const api=async(url,options={})=>{const r=await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});const d=await r.json().catch(()=>({error:'Respons server tidak valid.'}));if(!r.ok)throw new Error(d.error||'Permintaan gagal.');return d};
const PUBLIC_ORIGIN='https://io-invitation-studio.edgeone.dev';
const inviteUrl=g=>PUBLIC_ORIGIN+'/api/preview/'+encodeURIComponent(eventId)+'?guestId='+encodeURIComponent(g.guestId);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function copyLink(url){if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);return;}const el=document.createElement('textarea');el.value=url;el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw new Error('Tidak bisa menyalin otomatis. Tekan dan tahan link untuk menyalin.');}
async function shareLink(url,name){const shareData={title:'Undangan untuk '+name,text:'Dengan hormat, kami mengundang Anda. Silakan buka undangan berikut:',url};if(navigator.share){await navigator.share(shareData);return;}window.open('https://wa.me/?text='+encodeURIComponent(shareData.text+' '+url),'_blank','noopener');}
function linkTools(url,name,key){return '<div class="link-tools"><input readonly aria-label="Link undangan" value="'+esc(url)+'"><button type="button" data-link-action="copy" data-key="'+esc(key)+'">Salin</button><button type="button" data-link-action="share" data-key="'+esc(key)+'">Bagikan</button></div>';}
function showCreated(g,url){const box=$('#created-link');box.hidden=false;box.innerHTML='<div class="generated-title">Link undangan siap dibagikan <span>✓</span></div><b>'+esc(g.name)+'</b>'+linkTools(url,g.name,'created');box.dataset.url=url;box.dataset.name=g.name;}
function render(){const q=$('#search').value.trim().toLowerCase(),rows=guests.filter(g=>g.name.toLowerCase().includes(q));$('#guest-total').textContent=guests.length;if(!rows.length){$('#guest-list').innerHTML='<div class="empty">'+(guests.length?'Nama tamu tidak ditemukan.':'Belum ada tamu. Buat link undangan pertama di atas.')+'</div>';return;}$('#guest-list').innerHTML=rows.map(g=>'<article class="guest-row" data-id="'+esc(g.guestId)+'"><div class="guest-info"><b>'+esc(g.name)+'</b><small>Ditambahkan '+(g.createdAt?new Date(g.createdAt).toLocaleDateString('id-ID'):'—')+' · RSVP: '+(g.rsvp==='hadir'?'Hadir':g.rsvp==='tidak_hadir'?'Tidak Hadir':'Belum konfirmasi')+'</small></div><div class="guest-actions"><button class="make-link" type="button" data-action="generate">Salin link</button><button class="minor" type="button" data-action="'+(g.linkActive===false?'restore-link':'revoke-link')+'">'+(g.linkActive===false?'Pulihkan akses':'Cabut akses')+'</button><button class="minor" type="button" data-action="edit">Ubah</button><button class="minor delete" type="button" data-action="delete">Hapus</button></div>'+(issuedLinks[g.guestId]?'<div class="row-generated">'+linkTools(issuedLinks[g.guestId],g.name,g.guestId)+'</div>':'')+'</article>').join('');}
async function load(){try{status('list-status','Memuat daftar tamu…');const d=await api('/api/admin/guests?eventId='+encodeURIComponent(eventId),{headers:{}});guests=d.guests||[];render();status('list-status','');}catch(e){status('list-status',e.message,true);}}
async function generateFor(g){if(g.legacyTokenRequired){await api('/api/admin/guests/'+encodeURIComponent(g.guestId),{method:'PATCH',body:JSON.stringify({eventId,action:'migrate-link'})});g.legacyTokenRequired=false;}const url=inviteUrl(g);issuedLinks[g.guestId]=url;render();try{await copyLink(url);toast('Link permanen disalin. Link tidak berubah saat aplikasi diperbarui.');}catch(e){toast('Link siap digunakan. Tekan tombol Salin.');}return url;}
$('#guest-form').addEventListener('submit',async e=>{e.preventDefault();const button=$('#generate-button');button.disabled=true;status('form-status','Membuat link undangan…');try{const first=$('#guest-name').value.trim(),partner=$('#partner-name').value.trim(),name=partner?first+' & '+partner:first;if(!first)throw new Error('Nama tamu wajib diisi.');const d=await api('/api/admin/guests',{method:'POST',body:JSON.stringify({eventId,name})});const url=inviteUrl({...d.guest,token:d.token});await load();showCreated(d.guest,url);$('#guest-name').value='';$('#partner-name').value='';status('form-status','');try{await copyLink(url);toast('Link undangan dibuat dan disalin.');}catch{toast('Link undangan berhasil dibuat.');}}catch(err){status('form-status',err.message,true);}finally{button.disabled=false;}});
$('#search').addEventListener('input',render);$('#refresh').addEventListener('click',load);
document.addEventListener('click',async e=>{
 const linkBtn=e.target.closest('[data-link-action]');if(linkBtn){const key=linkBtn.dataset.key,url=key==='created'?$('#created-link').dataset.url:issuedLinks[key],g=key==='created'?{name:$('#created-link').dataset.name}:guests.find(x=>x.guestId===key);if(!url||!g)return;try{if(linkBtn.dataset.linkAction==='copy'){await copyLink(url);toast('Link berhasil disalin.');}else{await shareLink(url,g.name);}}catch(err){if(err.name!=='AbortError')toast(err.message||'Gagal membagikan link.');}return;}
 const b=e.target.closest('button[data-action]');if(!b)return;const row=b.closest('[data-id]'),id=row.dataset.id,g=guests.find(x=>x.guestId===id);if(!g)return;b.disabled=true;try{if(b.dataset.action==='generate'){await generateFor(g);return;}if(b.dataset.action==='revoke-link'||b.dataset.action==='restore-link'){const action=b.dataset.action;if(action==='revoke-link'&&!confirm('Cabut akses link undangan untuk '+g.name+'? Link lama akan berhenti berfungsi.'))return;await api('/api/admin/guests/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({eventId,action})});delete issuedLinks[id];toast(action==='revoke-link'?'Akses link berhasil dicabut.':'Akses link dipulihkan.');await load();return;}if(b.dataset.action==='edit'){const name=prompt('Nama tamu dan pasangan:',g.name);if(name===null)return;if(!name.trim())throw new Error('Nama tidak boleh kosong.');await api('/api/admin/guests/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({eventId,name:name.trim()})});delete issuedLinks[id];toast('Nama tamu diperbarui.');}if(b.dataset.action==='delete'){if(!confirm('Hapus tamu '+g.name+'? Link undangannya juga tidak berlaku lagi.'))return;await api('/api/admin/guests/'+encodeURIComponent(id)+'?eventId='+encodeURIComponent(eventId),{method:'DELETE'});delete issuedLinks[id];toast('Tamu dihapus.');}await load();}catch(err){status('list-status',err.message,true);}finally{b.disabled=false;}
});

let guestbookEntries=[];
function renderAdminGuestbook(){
 const host=$('#admin-guestbook-list');if(!host)return;
 $('#guestbook-admin-total').textContent=guestbookEntries.length;
 if(!guestbookEntries.length){host.innerHTML='<div class="empty">Belum ada komentar atau ucapan dari tamu.</div>';return;}
 host.innerHTML=guestbookEntries.map(entry=>'<article class="admin-guestbook-card" data-entry-id="'+esc(entry.id)+'"><div class="admin-guestbook-head"><div><b>'+esc(entry.name||'Tamu')+'</b><small>'+esc(entry.createdAt?new Date(entry.createdAt).toLocaleString('id-ID'):'Waktu tidak tersedia')+'</small></div><span class="guestbook-status '+(entry.rsvp==='tidak_hadir'?'absent':'')+'">'+(entry.rsvp==='tidak_hadir'?'Tidak Hadir':'Hadir')+'</span></div>'+(entry.message?'<p class="admin-guest-message">'+esc(entry.message)+'</p>':'<p class="admin-guest-message muted">Tamu tidak menulis pesan.</p>')+(entry.reply?'<div class="admin-existing-reply"><small>Balasan Admin · '+esc(entry.repliedAt?new Date(entry.repliedAt).toLocaleString('id-ID'):'')+'</small><p>'+esc(entry.reply)+'</p></div>':'')+'<form class="admin-reply-form"><label for="reply-'+esc(entry.id)+'">'+(entry.reply?'Ubah balasan':'Balas komentar')+'</label><textarea id="reply-'+esc(entry.id)+'" name="reply" maxlength="1000" required placeholder="Tulis balasan yang akan dilihat tamu…">'+esc(entry.reply||'')+'</textarea><div class="admin-reply-actions"><button type="submit" class="make-link">'+(entry.reply?'Simpan perubahan':'Kirim balasan')+'</button>'+(entry.reply?'<button type="button" class="minor delete" data-reply-action="delete">Hapus balasan</button>':'')+'</div></form></article>').join('');
}
async function loadAdminGuestbook(){
 const host=$('#admin-guestbook-list');if(!host)return;
 try{const d=await api('/api/guestbook?eventId='+encodeURIComponent(eventId),{headers:{}});guestbookEntries=d.entries||[];renderAdminGuestbook();status('guestbook-admin-status','');}
 catch(e){status('guestbook-admin-status',e.message,true);if(!guestbookEntries.length)host.innerHTML='<div class="empty">Komentar belum dapat dimuat.</div>';}
}
const guestbookHost=$('#admin-guestbook-list');
if(guestbookHost){
 $('#guestbook-refresh').addEventListener('click',loadAdminGuestbook);
 guestbookHost.addEventListener('submit',async e=>{
  const form=e.target.closest('.admin-reply-form');if(!form)return;e.preventDefault();
  const card=form.closest('[data-entry-id]'),id=card.dataset.entryId,button=form.querySelector('button[type=submit]');
  button.disabled=true;status('guestbook-admin-status','Menyimpan balasan…');
  try{await api('/api/guestbook/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({eventId,reply:form.elements.reply.value.trim()})});toast('Balasan berhasil dikirim ke undangan tamu.');await loadAdminGuestbook();}
  catch(err){status('guestbook-admin-status',err.message,true);}finally{button.disabled=false;}
 });
 guestbookHost.addEventListener('click',async e=>{
  const button=e.target.closest('[data-reply-action="delete"]');if(!button)return;
  const card=button.closest('[data-entry-id]');if(!confirm('Hapus balasan Admin untuk komentar ini?'))return;
  button.disabled=true;try{await api('/api/guestbook/'+encodeURIComponent(card.dataset.entryId),{method:'PATCH',body:JSON.stringify({eventId,action:'delete-reply'})});toast('Balasan dihapus.');await loadAdminGuestbook();}
  catch(err){status('guestbook-admin-status',err.message,true);}finally{button.disabled=false;}
 });
 loadAdminGuestbook();window.addEventListener("focus",loadAdminGuestbook);document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadAdminGuestbook()});setInterval(loadAdminGuestbook,30000);
}

load();
})();