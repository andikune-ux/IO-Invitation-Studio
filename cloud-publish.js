(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const status = (message, isError = false) => {
    const node = $('#cloud-status');
    if (node) { node.textContent = message; node.style.color = isError ? '#b42318' : ''; }
  };
  const button = $('#publish-cloud');
  if (!button) return;
  let ownerReady = false;
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(data => {
      ownerReady = Boolean(data.authenticated && data.user?.role === 'owner');
      button.disabled = !ownerReady;
      status(ownerReady ? 'Sesi Owner aktif. Editor dan publikasi tersedia.' : 'Login sebagai Owner terlebih dahulu melalui Owner Dashboard.', !ownerReady);
    })
    .catch(() => { button.disabled = true; status('Tidak dapat memverifikasi sesi Owner.', true); });
  async function requestUpload(file, kind, eventId) {
    const ticket = await fetch('/api/admin/upload-url', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, kind, contentType: file.type, size: file.size })
    });
    const ticketData = await ticket.json();
    if (!ticket.ok) throw new Error(ticketData.error || 'Gagal meminta URL upload.');
    status('Mengunggah ' + kind + '…');
    const uploaded = await fetch(ticketData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploaded.ok) throw new Error('Upload ' + kind + ' gagal (' + uploaded.status + ').');
    return ticketData.key;
  }
  button.addEventListener('click', async () => {
    if (!ownerReady) return status('Login Owner diperlukan.', true);
    const eventId = ($('#cloud-event-id').value || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId)) return status('ID acara wajib 3–64 karakter: huruf kecil, angka, dan tanda hubung.', true);
    const cover = $('#cover-upload').files[0] || null, video = $('#video-upload').files[0] || null;
    button.disabled = true;
    try {
      const media = {};
      if (cover) media.cover = await requestUpload(cover, 'cover', eventId);
      if (video) media.video = await requestUpload(video, 'video', eventId);
      const value = id => ($('#' + id).value || '').trim();
      status('Menerbitkan konten undangan…');
      const response = await fetch('/api/admin/publish', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, invitation: {
          title: value('event-title'), personOne: value('person-one'), personTwo: value('person-two'),
          opening: value('opening-text'), date: value('event-date'), location: value('event-location'), closing: value('closing-text')
        }, media })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Publikasi gagal.');
      const link = $('#cloud-guest-link');
      link.href = './guest.html?event=' + encodeURIComponent(eventId);
      link.hidden = false;
      status('Berhasil diterbitkan. Link Tamu siap: ' + location.origin + link.getAttribute('href'));
    } catch (error) { status(error.message || 'Publikasi gagal. Periksa konfigurasi backend.', true); }
    finally { button.disabled = !ownerReady; }
  });
})();