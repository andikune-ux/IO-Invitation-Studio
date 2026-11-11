(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const loginView = $('#login-view'), appView = $('#app-view'), loginForm = $('#owner-login-form');
  let authenticated = false;
  const toast = (message) => { const node=$('#toast'); node.textContent=message; node.classList.add('show'); setTimeout(()=>node.classList.remove('show'),2400); };
  const setStatus = (selector, message, error=false) => { const node=$(selector); node.textContent=message||''; node.classList.toggle('error',error); };
  async function api(path, options={}) {
    const response = await fetch(path, { credentials:'same-origin', ...options, headers:{ ...(options.body?{'Content-Type':'application/json'}:{}), ...(options.headers||{}) } });
    const data = await response.json().catch(()=>({error:'Respons server tidak valid.'}));
    if (!response.ok) throw new Error(data.error || 'Permintaan gagal ('+response.status+').');
    return data;
  }
  $('#toggle-owner-token').addEventListener('click', () => {
    const input = $('#owner-token');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    const button = $('#toggle-owner-token');
    button.textContent = visible ? 'Sembunyikan' : 'Tampilkan';
    button.setAttribute('aria-label', visible ? 'Sembunyikan token' : 'Tampilkan token');
    button.setAttribute('aria-pressed', String(visible));
  });
  function showApp() { authenticated=true; loginView.hidden=true; appView.hidden=false; $('#logout').hidden=false; loadEvents(); }
  function hideApp() { authenticated=false; loginView.hidden=false; appView.hidden=true; $('#logout').hidden=true; $('#owner-token').value=''; }
  async function checkSession() {
    try { const data=await api('/api/auth/me'); if(data.authenticated && data.user?.role==='owner') showApp(); }
    catch { /* Keep login form visible when the session endpoint is unavailable. */ }
  }
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button=$('button[type="submit"]',loginForm); button.disabled=true; setStatus('#login-status','Memverifikasi akses Owner…');
    try {
      await api('/api/auth/owner-login',{method:'POST',headers:{Authorization:'Bearer '+$('#owner-token').value}});
      $('#owner-token').value=''; showApp(); setStatus('#login-status','');
    } catch(error) { setStatus('#login-status',error.message,true); }
    finally { button.disabled=false; }
  });
  $('#logout').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'});}finally{hideApp();}});
  function makePassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-';const bytes=new Uint8Array(20);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('');}
  $('#generate-password').addEventListener('click',()=>{$('#new-password').value=makePassword();$('#new-password').type='text';});
  $('#create-event-form').addEventListener('submit',async(event)=>{
    event.preventDefault();const button=$('button[type="submit"]',event.currentTarget);button.disabled=true;$('#created-credentials').hidden=true;setStatus('#create-status','Membuat acara dan akun Admin…');
    const payload={eventId:$('#new-event-id').value.trim().toLowerCase(),eventTitle:$('#new-title').value.trim(),username:$('#new-username').value.trim().toLowerCase(),displayName:$('#new-display').value.trim(),password:$('#new-password').value};
    try{
      await api('/api/owner/admins',{method:'POST',body:JSON.stringify(payload)});
      $('#created-event').textContent=payload.eventId;$('#created-user').textContent=payload.username;$('#created-pass').textContent=payload.password;$('#created-credentials').hidden=false;
      $('#new-password').value='';$('#new-password').type='password';setStatus('#create-status','Acara dan akun Admin berhasil dibuat. Simpan kredensial sekarang.');
      event.currentTarget.reset();await loadEvents();
    }catch(error){setStatus('#create-status',error.message,true);}
    finally{button.disabled=false;}
  });
  $('#hide-credentials').addEventListener('click',()=>{$('#created-pass').textContent='';$('#created-credentials').hidden=true;});
  document.addEventListener('click',async(event)=>{const button=event.target.closest('[data-copy]');if(!button)return;const text=$('#'+button.dataset.copy).textContent;try{await navigator.clipboard.writeText(text);toast('Berhasil disalin.');}catch{toast('Clipboard tidak tersedia.');}});
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function loadEvents(){
    if(!authenticated)return;const list=$('#events-list');list.innerHTML='<div class="empty">Memuat acara…</div>';setStatus('#events-status','');
    try{
      const {events=[]}=await api('/api/owner/events');
      $('#total-events').textContent=events.length;$('#active-admins').textContent=events.filter(e=>e.admin&&!e.admin.disabled).length;$('#published-events').textContent=events.filter(e=>e.published).length;
      if(!events.length){list.innerHTML='<div class="empty">Belum ada acara. Buat acara pertama melalui formulir di atas.</div>';return;}
      list.innerHTML=events.map(e=>'<article class="event-card" data-event="'+escapeHtml(e.eventId)+'"><div><div class="event-title">'+escapeHtml(e.title)+'</div><div class="event-meta">ID: '+escapeHtml(e.eventId)+' · Dibuat: '+escapeHtml(e.createdAt?new Date(e.createdAt).toLocaleDateString('id-ID'):'—')+'</div><div class="event-badges"><span class="badge '+(e.published?'good':'warn')+'">'+(e.published?'Sudah terbit':'Belum terbit')+'</span><span class="badge">'+(e.status==='archived'?'Diarsipkan':'Aktif')+'</span><span class="badge '+(e.admin&&!e.admin.disabled?'good':'warn')+'">'+(e.admin?(e.admin.disabled?'Admin dinonaktifkan':'Admin: '+escapeHtml(e.admin.username)):'Belum ada Admin')+'</span></div></div><div class="event-actions"><button data-action="rename">Ubah nama</button><button data-action="archive">'+(e.status==='archived'?'Aktifkan':'Arsipkan')+'</button>'+(e.admin?'<button data-action="toggle-admin">'+(e.admin.disabled?'Aktifkan Admin':'Nonaktifkan Admin')+'</button><button data-action="reset-password">Reset password</button>':'')+'</div></article>').join('');
    }catch(error){list.innerHTML='<div class="empty">Tidak dapat memuat data acara.</div>';setStatus('#events-status',error.message,true);}
  }
  $('#refresh-events').addEventListener('click',loadEvents);
  $('#events-list').addEventListener('click',async(event)=>{
    const button=event.target.closest('button[data-action]');if(!button)return;const card=button.closest('[data-event]');const eventId=card.dataset.event;const action=button.dataset.action;button.disabled=true;
    try{
      if(action==='rename'){const title=prompt('Nama acara baru:',card.querySelector('.event-title').textContent);if(title===null)return;if(!title.trim())throw new Error('Nama acara tidak boleh kosong.');await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({title:title.trim()})});}
      if(action==='archive'){const archiving=button.textContent.trim()==='Arsipkan';if(!confirm(archiving?'Arsipkan acara ini? Acara tidak dihapus.':'Aktifkan kembali acara ini?'))return;await api('/api/owner/events/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({status:archiving?'archived':'draft'})});}
      if(action==='toggle-admin'){const disabling=button.textContent.trim()==='Nonaktifkan Admin';if(!confirm(disabling?'Nonaktifkan akses Admin acara ini? Sesi Admin aktif akan dicabut.':'Aktifkan kembali akun Admin ini?'))return;await api('/api/owner/admins/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({disabled:disabling})});}
      if(action==='reset-password'){const password=makePassword();if(!confirm('Buat password baru otomatis dan cabut semua sesi Admin? Password baru akan ditampilkan satu kali setelah berhasil.'))return;await api('/api/owner/admins/'+encodeURIComponent(eventId),{method:'PATCH',body:JSON.stringify({password})});$('#created-event').textContent=eventId;$('#created-user').textContent=card.querySelector('.badge:nth-child(3)')?.textContent.replace('Admin: ','')||'Admin';$('#created-pass').textContent=password;$('#created-credentials').hidden=false;$('#created-credentials').scrollIntoView({behavior:'smooth',block:'center'});}
      await loadEvents();toast('Perubahan berhasil disimpan.');
    }catch(error){setStatus('#events-status',error.message,true);}
    finally{button.disabled=false;}
  });
  checkSession();
})();
