(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const loginView = $('#login-view'), appView = $('#app-view'), loginForm = $('#owner-login-form');
  let authenticated = false, cachedEvents = [];
  const toast = (message) => { const node=$('#toast'); node.textContent=message; node.classList.add('show'); setTimeout(()=>node.classList.remove('show'),2400); };
  const setStatus = (selector, message, error=false) => { const node=$(selector); node.textContent=message||''; node.classList.toggle('error',error); };
  async function api(path, options={}) {
    const response = await fetch(path, { credentials:'same-origin', ...options, headers:{ ...(options.body?{'Content-Type':'application/json'}:{}), ...(options.headers||{}) } });
    const data = await response.json().catch(()=>({error:'Respons server tidak valid.'}));
    if (!response.ok) throw new Error(data.error || 'Permintaan gagal ('+response.status+').');
    return data;
  }
  $('#toggle-owner-token').addEventListener('click', () => {
    const input = $('#owner-token'), visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; $('#toggle-owner-token').textContent = visible ? 'Tutup' : 'Lihat';
  });
  function showApp() { authenticated=true; loginView.hidden=true; appView.hidden=false; $('#logout').hidden=false; loadEvents(); }
  function hideApp() { authenticated=false; loginView.hidden=false; appView.hidden=true; $('#logout').hidden=true; $('#owner-token').value=''; }
  async function checkSession() { try { const data=await api('/api/auth/me'); if(data.authenticated && data.user?.role==='owner') showApp(); } catch {} }
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); const button=$('button[type="submit"]',loginForm); button.disabled=true; setStatus('#login-status','Memverifikasi akses Owner…');
    try { await api('/api/auth/owner-login',{method:'POST',headers:{Authorization:'Bearer '+$('#owner-token').value}}); $('#owner-token').value=''; showApp(); setStatus('#login-status',''); }
    catch(error) { setStatus('#login-status',error.message,true); } finally { button.disabled=false; }
  });
  $('#logout').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'});}finally{hideApp();}});
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function makeAdminUrl(eventId,token){return location.origin+'/admin.html?event='+encodeURIComponent(eventId)+'#admin='+encodeURIComponent(token);}
  function revealLink(url){$('#created-link').textContent=url;$('#created-credentials').hidden=false;$('#created-credentials').scrollIntoView({behavior:'smooth',block:'center'});}
  const RELIGION_CATEGORIES=new Set(["Pernikahan","Lamaran","Pertunangan","Keagamaan","Spiritual","Pengajian","Syukuran","Tasyakuran"]);
  const categorySelect=$('#new-category'),religionField=$('#religion-field'),religionSelect=$('#new-religion');
  function syncReligionField(){
    const visible=RELIGION_CATEGORIES.has(categorySelect.value);
    religionField.hidden=!visible;
    if(!visible)religionSelect.value='';
    religionSelect.required=false;
  }
  categorySelect.addEventListener('change',syncReligionField);
  syncReligionField();
  $('#create-event-form').addEventListener('submit',async(event)=>{
    event.preventDefault();const button=$('button[type="submit"]',event.currentTarget);button.disabled=true;$('#created-credentials').hidden=true;setStatus('#create-status','Menyimpan event dan membuat akses Admin…');
    const payload={eventId:$('#new-event-id').value.trim().toLowerCase(),eventTitle:$('#new-title').value.trim(),category:$('#new-category').value,religion:$('#new-religion').value||null,durationMonths:Number($('#default-link-duration').value)};
    try{
      await api('/api/owner/admins',{method:'POST',body:JSON.stringify(payload)});
      const access=await api('/api/owner/admin-links',{method:'POST',body:JSON.stringify({eventId:payload.eventId,durationMonths:payload.durationMonths})});
      revealLink(makeAdminUrl(payload.eventId,access.token));
      setStatus('#create-status','Event berhasil dibuat. Link Admin siap dibagikan.');
      event.currentTarget.reset();await loadEvents();
    }catch(error){setStatus('#create-status',error.message+' Jika event sudah tersimpan, buat/rotasi link dari daftar acara.',true);await loadEvents();}
    finally{button.disabled=false;}
  });
  $('#hide-credentials').addEventListener('click',()=>{$('#created-link').textContent='';$('#created-credentials').hidden=true;});
  document.addEventListener('click',async(event)=>{const button=event.target.closest('[data-copy]');if(!button)return;const text=$('#'+button.dataset.copy).textContent;try{await navigator.clipboard.writeText(text);toast('Link berhasil disalin.');}catch{toast('Clipboard tidak tersedia.');}});

  function crc32(bytes){
    let crc=0xffffffff;
    for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
  }
  function zipStore(files){
    const encoder=new TextEncoder(),local=[],central=[];let offset=0;
    const date=new Date(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(Math.floor(date.getSeconds()/2));
    const dosDate=((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
    const u16=n=>new Uint8Array([n&255,(n>>>8)&255]),u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
    const join=parts=>{const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
    for(const file of files){
      const name=encoder.encode(file.name),data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data),crc=crc32(data);
      const header=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]);
      local.push(header,data);
      central.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
      offset+=header.length+data.length;
    }
    const centralBytes=join(central),localBytes=join(local);
    return new Blob([localBytes,centralBytes,u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(localBytes.length),u16(0)],{type:"application/zip"});
  }
  async function exportEventZip(eventId,button){
    const original=button.textContent;button.disabled=true;button.textContent="Menyiapkan ZIP…";
    try{
      const event=cachedEvents.find(item=>item.eventId===eventId);
      if(!event)throw new Error("Data acara tidak ditemukan. Refresh daftar acara.");
      const files=[{name:"event.json",data:new TextEncoder().encode(JSON.stringify(event,null,2))}];
      const draftResponse=await fetch("/api/owner/events/"+encodeURIComponent(eventId)+"/draft",{credentials:"same-origin"});
      if(draftResponse.ok){
        const draftResult=await draftResponse.json();
        if(draftResult?.draft)files.push({name:"draft.json",data:new TextEncoder().encode(JSON.stringify(draftResult.draft,null,2))});
      }else if(draftResponse.status!==404){
        throw new Error("Draft cloud tidak dapat dibaca ("+draftResponse.status+"). Backup dibatalkan agar data tidak terlewat.");
      }
      let invitation=null;
      try{
        const response=await fetch("/api/invitation/"+encodeURIComponent(eventId),{credentials:"same-origin"});
        if(response.ok)invitation=await response.json();
      }catch{}
      if(invitation){
        files.push({name:"invitation.json",data:new TextEncoder().encode(JSON.stringify(invitation,null,2))});
        for(const kind of ["cover","video"]){
          const url=invitation.mediaUrls?.[kind];if(!url)continue;
          const mediaResponse=await fetch(url,{credentials:"same-origin"});
          if(!mediaResponse.ok)continue;
          const blob=await mediaResponse.blob(),ext=(blob.type.split("/")[1]|| (kind==="cover"?"jpg":"mp4")).replace("jpeg","jpg");
          files.push({name:"media/"+kind+"."+ext,data:new Uint8Array(await blob.arrayBuffer())});
        }
      }
      const readme="IO Invitation Studio — Event Backup\nEvent ID: "+eventId+"\nDibuat: "+new Date().toISOString()+"\n\nIsi: metadata event, data undangan terbit (jika tersedia), dan media publik yang direferensikan undangan.\nFile ini adalah backup data acara, bukan source code aplikasi atau konfigurasi rahasia.";
      files.push({name:"README.txt",data:new TextEncoder().encode(readme)});
      const blob=zipStore(files),url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="io-event-"+eventId+"-backup.zip";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast("Backup ZIP berhasil dibuat.");
    }catch(error){setStatus("#events-status",error.message||"Gagal membuat backup ZIP.",true);}
    finally{button.disabled=false;button.textContent=original;}
  }

  function renderEvents(){
    const query=($('#event-search').value||'').trim().toLowerCase();
    const filter=$('#event-filter')?.value||'all';
    const events=cachedEvents.filter(e=>{
      const matchesQuery=(e.title+' '+e.eventId+' '+(e.category||'')+' '+(e.religion||'')).toLowerCase().includes(query);
      const matchesFilter=filter==='all'||(filter==='published'?Boolean(e.published):filter==='archived'?e.status==='archived':!e.published&&e.status!=='archived');
      return matchesQuery&&matchesFilter;
    });
    $('#event-count').textContent=events.length+' event';
    if(!events.length){$('#events-list').innerHTML='<div class="empty"><span>✧</span>'+(cachedEvents.length?'Tidak ada acara yang cocok.':'Belum ada acara. Buat event pertama di atas.')+'</div>';return;}
    $('#events-list').innerHTML=events.map(e=>'<article class="event-card" data-event="'+escapeHtml(e.eventId)+'"><div><div class="event-title">'+escapeHtml(e.title)+'</div><div class="event-meta">ID: '+escapeHtml(e.eventId)+' · Dibuat: '+escapeHtml(e.createdAt?new Date(e.createdAt).toLocaleDateString('id-ID'):'—')+' · Diperbarui: '+escapeHtml(e.updatedAt?new Date(e.updatedAt).toLocaleString('id-ID'):'—')+'</div><div class="event-badges"><span class="badge category-badge">'+escapeHtml(e.category||'Kategori belum ditentukan')+'</span>'+(e.religion?'<span class="badge religion-badge">'+escapeHtml(e.religion)+'</span>':'')+'<span class="badge '+(e.published?'good':'warn')+'">'+(e.published?'Undangan terbit':'Draft')+'</span><span class="badge">'+(e.status==='archived'?'Diarsipkan':'Aktif')+'</span><span class="badge '+(e.adminLink?.active?'good':'warn')+'">'+(e.adminLink?.active?'Admin link aktif':(e.adminLink?.expired?'Link kedaluwarsa':'Admin link belum aktif'))+'</span>'+(e.adminLink?.expiresAt?'<span class="badge expiry-badge">Berlaku sampai '+escapeHtml(new Date(e.adminLink.expiresAt).toLocaleDateString('id-ID'))+'</span>':'')+(e.admin?' <span class="badge warn">Akun Admin lama</span>':'')+'</div></div><div class="event-actions"><label class="link-duration-control"><span>Masa berlaku link</span><select data-duration aria-label="Masa berlaku link Admin">'+[1,3,6,9,12].map(n=>'<option value="'+n+'"'+(Number(e.adminLink?.durationMonths||12)===n?' selected':'')+'>'+n+' bulan</option>').join('')+'</select></label><button data-action="rename">Ubah nama</button><button data-action="archive">'+(e.status==='archived'?'Aktifkan':'Arsipkan')+'</button><button data-action="'+(e.adminLink?.active?'rotate':'create-link')+'">'+(e.adminLink?.active?'Rotasi link':'Buat link Admin')+'</button>'+'<button data-action="edit">Edit undangan</button><button data-action="export">Backup ZIP</button>'+(e.adminLink?.active?'<button class="danger" data-action="revoke">Cabut link</button>':'')+'</div></article>').join('');
  }
  async function loadEvents(){
    if(!authenticated)return;const list=$('#events-list');list.innerHTML='<div class="empty"><span>✧</span>Memuat acara…</div>';setStatus('#events-status','');
    try{const {events=[]}=await api('/api/owner/events');cachedEvents=events;$('#total-events').textContent=events.length;$('#active-admins').textContent=events.filter(e=>e.adminLink?.active).length;$('#published-events').textContent=events.filter(e=>e.published).length;$('#draft-events').textContent=events.filter(e=>!e.published&&e.status!=='archived').length;renderEvents();}
    catch(error){list.innerHTML='<div class="empty">Tidak dapat memuat data acara.</div>';setStatus('#events-status',error.message,true);}
  }
  $('#event-search').addEventListener('input',renderEvents);
  $('#event-filter').addEventListener('change',renderEvents);
  $('#refresh-events').addEventListener('click',loadEvents);
  $('#events-list').addEventListener('click',async(event)=>{
    const button=event.target.closest('button[data-action]');if(!button)return;const card=button.closest('[data-event]');const eventId=card.dataset.event;const action=button.dataset.action;button.disabled=true;
    try{
      if(action==='edit'){location.href='./index.html?event='+encodeURIComponent(eventId);return;}
      if(action==='export'){await exportEventZip(eventId,button);return;}
      if(action==='rename'){const current=card.querySelector('.event-title').textContent;const title=prompt('Nama acara baru:',current);if(title===null)return;if(!title.trim())throw new Error('Nama acara tidak boleh kosong.');await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({title:title.trim()})});}
      if(action==='archive'){const archiving=button.textContent.trim()==='Arsipkan';if(!confirm(archiving?'Arsipkan acara ini? Acara tidak dihapus.':'Aktifkan kembali acara ini?'))return;await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({status:archiving?'archived':'draft'})});}
      if(action==='create-link'||action==='rotate'){if(action==='rotate'&&!confirm('Rotasi link Admin? Link lama langsung tidak berlaku.'))return;const result=action==='create-link'?await api('/api/owner/admin-links',{method:'POST',body:JSON.stringify({eventId,durationMonths:Number(card.querySelector('[data-duration]').value)})}):await api('/api/owner/admin-links/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({action:'rotate',durationMonths:Number(card.querySelector('[data-duration]').value)})});revealLink(makeAdminUrl(eventId,result.token));toast('Tautan Admin baru berhasil dibuat.');}
      if(action==='revoke'){if(!confirm('Cabut akses Admin? Pemegang link tidak bisa mengelola acara ini lagi.'))return;await api('/api/owner/admin-links/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({action:'revoke'})});toast('Akses Admin dicabut.');}
      await loadEvents();
    }catch(error){setStatus('#events-status',error.message,true);}finally{button.disabled=false;}
  });
  checkSession();
})();