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
  function makeAdminUrl(eventId,token){return location.origin+'/index.html?event='+encodeURIComponent(eventId)+'#admin='+encodeURIComponent(token);}
  function revealLink(url){$('#created-link').textContent=url;$('#created-credentials').hidden=false;$('#created-credentials').scrollIntoView({behavior:'smooth',block:'center'});}
  $('#create-event-form').addEventListener('submit',async(event)=>{
    event.preventDefault();const button=$('button[type="submit"]',event.currentTarget);button.disabled=true;$('#created-credentials').hidden=true;setStatus('#create-status','Menyimpan event dan membuat akses Admin…');
    const payload={eventId:$('#new-event-id').value.trim().toLowerCase(),eventTitle:$('#new-title').value.trim()};
    try{
      await api('/api/owner/admins',{method:'POST',body:JSON.stringify(payload)});
      const access=await api('/api/owner/admin-links',{method:'POST',body:JSON.stringify({eventId:payload.eventId})});
      revealLink(makeAdminUrl(payload.eventId,access.token));
      setStatus('#create-status','Event berhasil dibuat. Link Admin siap dibagikan.');
      event.currentTarget.reset();await loadEvents();
    }catch(error){setStatus('#create-status',error.message+' Jika event sudah tersimpan, buat/rotasi link dari daftar acara.',true);await loadEvents();}
    finally{button.disabled=false;}
  });
  $('#hide-credentials').addEventListener('click',()=>{$('#created-link').textContent='';$('#created-credentials').hidden=true;});
  document.addEventListener('click',async(event)=>{const button=event.target.closest('[data-copy]');if(!button)return;const text=$('#'+button.dataset.copy).textContent;try{await navigator.clipboard.writeText(text);toast('Link berhasil disalin.');}catch{toast('Clipboard tidak tersedia.');}});
  function renderEvents(){
    const query=($('#event-search').value||'').trim().toLowerCase();
    const events=cachedEvents.filter(e=>(e.title+' '+e.eventId).toLowerCase().includes(query));
    $('#event-count').textContent=events.length+' event';
    if(!events.length){$('#events-list').innerHTML='<div class="empty"><span>✧</span>'+(cachedEvents.length?'Tidak ada acara yang cocok.':'Belum ada acara. Buat event pertama di atas.')+'</div>';return;}
    $('#events-list').innerHTML=events.map(e=>'<article class="event-card" data-event="'+escapeHtml(e.eventId)+'"><div><div class="event-title">'+escapeHtml(e.title)+'</div><div class="event-meta">ID: '+escapeHtml(e.eventId)+' · Dibuat: '+escapeHtml(e.createdAt?new Date(e.createdAt).toLocaleDateString('id-ID'):'—')+'</div><div class="event-badges"><span class="badge '+(e.published?'good':'warn')+'">'+(e.published?'Undangan terbit':'Draft')+'</span><span class="badge">'+(e.status==='archived'?'Diarsipkan':'Aktif')+'</span><span class="badge '+(e.adminLink?.active?'good':'warn')+'">'+(e.adminLink?.active?'Admin link aktif':'Admin link belum aktif')+'</span>'+(e.admin?' <span class="badge warn">Akun Admin lama</span>':'')+'</div></div><div class="event-actions"><button data-action="rename">Ubah nama</button><button data-action="archive">'+(e.status==='archived'?'Aktifkan':'Arsipkan')+'</button><button data-action="'+(e.adminLink?.active?'rotate':'create-link')+'">'+(e.adminLink?.active?'Rotasi link':'Buat link Admin')+'</button>'+(e.adminLink?.active?'<button class="danger" data-action="revoke">Cabut link</button>':'')+'</div></article>').join('');
  }
  async function loadEvents(){
    if(!authenticated)return;const list=$('#events-list');list.innerHTML='<div class="empty"><span>✧</span>Memuat acara…</div>';setStatus('#events-status','');
    try{const {events=[]}=await api('/api/owner/events');cachedEvents=events;$('#total-events').textContent=events.length;$('#active-admins').textContent=events.filter(e=>e.adminLink?.active).length;$('#published-events').textContent=events.filter(e=>e.published).length;renderEvents();}
    catch(error){list.innerHTML='<div class="empty">Tidak dapat memuat data acara.</div>';setStatus('#events-status',error.message,true);}
  }
  $('#event-search').addEventListener('input',renderEvents);
  $('#refresh-events').addEventListener('click',loadEvents);
  $('#events-list').addEventListener('click',async(event)=>{
    const button=event.target.closest('button[data-action]');if(!button)return;const card=button.closest('[data-event]');const eventId=card.dataset.event;const action=button.dataset.action;button.disabled=true;
    try{
      if(action==='rename'){const current=card.querySelector('.event-title').textContent;const title=prompt('Nama acara baru:',current);if(title===null)return;if(!title.trim())throw new Error('Nama acara tidak boleh kosong.');await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({title:title.trim()})});}
      if(action==='archive'){const archiving=button.textContent.trim()==='Arsipkan';if(!confirm(archiving?'Arsipkan acara ini? Acara tidak dihapus.':'Aktifkan kembali acara ini?'))return;await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({status:archiving?'archived':'draft'})});}
      if(action==='create-link'||action==='rotate'){if(action==='rotate'&&!confirm('Rotasi link Admin? Link lama langsung tidak berlaku.'))return;const result=action==='create-link'?await api('/api/owner/admin-links',{method:'POST',body:JSON.stringify({eventId})}):await api('/api/owner/admin-links/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({action:'rotate'})});revealLink(makeAdminUrl(eventId,result.token));toast('Tautan Admin baru berhasil dibuat.');}
      if(action==='revoke'){if(!confirm('Cabut akses Admin? Pemegang link tidak bisa mengelola acara ini lagi.'))return;await api('/api/owner/admin-links/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({action:'revoke'})});toast('Akses Admin dicabut.');}
      await loadEvents();
    }catch(error){setStatus('#events-status',error.message,true);}finally{button.disabled=false;}
  });
  checkSession();
})();