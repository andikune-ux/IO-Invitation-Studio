(() => {
  const OWNER_DOMAIN = 'undangandigital-iODigitalInvitation.edgeone.dev';
  const CATEGORY_LABELS = {pernikahan:'UndanganPernikahan',lamaran:'UndanganLamaran',aqiqah:'UndanganAqiqah',khitanan:'UndanganKhitanan',keagamaan:'UndanganKeagamaan','ulang-tahun':'UndanganUlangTahun',lainnya:'UndanganLainnya'};
  const $ = (selector) => document.querySelector(selector);
  const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');
  const toast = (message) => { const node=$('#toast'); node.textContent=message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove('show'),2100); };
  const showView = (name) => { document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); const title={overview:'Ringkasan',events:'Acara',links:'Generator Link',settings:'Pengaturan'}; $('#page-title').textContent=title[name]||'Ringkasan'; };
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.go)));
  $('#link-form').addEventListener('submit',(event)=>{ event.preventDefault(); const admin=slugify($('#host-owner').value); const guest=slugify($('#guest-name').value); const category=CATEGORY_LABELS[$('#event-category').value]||CATEGORY_LABELS.lainnya; if(!admin||!guest){toast('Nama penyelenggara dan tamu wajib diisi.');return;} const eventIdentity=`${admin}-${category.toLowerCase()}`; $('#owner-url').textContent=OWNER_DOMAIN; $('#admin-url').textContent=`${eventIdentity}.${OWNER_DOMAIN}`; $('#guest-url').textContent=`${guest}-${eventIdentity}.${OWNER_DOMAIN}`; });
  document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const text=$(`#${button.dataset.copy}`).textContent; try{await navigator.clipboard.writeText(text);toast('Link berhasil disalin.');}catch{toast('Clipboard tidak tersedia di browser ini.');}}));
  $('#link-form').dispatchEvent(new Event('submit',{cancelable:true}));
})();