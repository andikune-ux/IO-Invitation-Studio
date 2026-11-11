(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const status = (message, isError = false) => {
    const node = $('#cloud-status');
    if (node) { node.textContent = message; node.style.color = isError ? '#b42318' : ''; }
  };
  const publishButton = $('#publish-cloud');
  if (!publishButton) return;
  const params = new URLSearchParams(location.search);
  const eventId = (params.get('event') || '').trim().toLowerCase();
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const accessToken = hash.get('admin') || '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const eventInput = $('#cloud-event-id');
  if (eventInput && eventId) eventInput.value = eventId;
  const valid = /^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId);
  if (!valid || accessToken.length < 40) {
    publishButton.disabled = true;
    status('Tautan Admin tidak lengkap atau tidak valid. Minta Owner menerbitkan link baru.', true);
    return;
  }
  const authHeaders = { Authorization: 'Bearer ' + accessToken };
  status('Akses Admin siap untuk acara ' + eventId + '.');
  async function requestUpload(file, kind) {
    const ticket = await fetch('/api/admin/upload-url', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ eventId, kind, contentType: file.type, size: file.size })
    });
    const ticketData = await ticket.json();
    if (!ticket.ok) throw new Error(ticketData.error || 'Gagal meminta URL upload.');
    status('Mengunggah ' + kind + '…');
    const uploaded = await fetch(ticketData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploaded.ok) throw new Error('Upload ' + kind + ' gagal (' + uploaded.status + ').');
    return ticketData.key;
  }
  publishButton.addEventListener('click', async () => {
    const coverFile = $('#cover-upload').files[0] || null;
    const videoFile = $('#video-upload').files[0] || null;
    publishButton.disabled = true;
    try {
      const media = {};
      if (coverFile) media.cover = await requestUpload(coverFile, 'cover');
      if (videoFile) media.video = await requestUpload(videoFile, 'video');
      const value = id => ($('#' + id).value || '').trim();
      status('Menerbitkan konten undangan…');
      const response = await fetch('/api/admin/publish', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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
    } catch (error) {
      status(error.message || 'Publikasi gagal. Periksa konfigurasi backend.', true);
    } finally { publishButton.disabled = false; }
  });
})();