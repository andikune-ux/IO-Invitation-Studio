(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const status = (message, isError = false) => {
    const node = $('#cloud-status');
    if (node) { node.textContent = message; node.style.color = isError ? '#ffb4a8' : ''; }
  };
  const publish = $('#publish-cloud');
  if (!publish) return;
  publish.addEventListener('click', async () => {
    const eventId = ($('#cloud-event-id').value || '').trim().toLowerCase();
    const token = ($('#cloud-admin-token').value || '').trim();
    const coverFile = $('#cover-upload').files[0] || null;
    const videoFile = $('#video-upload').files[0] || null;
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(eventId)) return status('ID acara wajib 3–64 karakter: huruf kecil, angka, dan tanda hubung.', true);
    if (!token) return status('Token Admin wajib diisi.', true);
    publish.disabled = true;
    try {
      const media = {};
      for (const [kind, file] of [['cover', coverFile], ['video', videoFile]]) {
        if (!file) continue;
        status('Meminta izin upload ' + kind + '…');
        const ticket = await fetch('/api/admin/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ eventId, kind, contentType: file.type, size: file.size })
        });
        const ticketData = await ticket.json();
        if (!ticket.ok) throw new Error(ticketData.error || 'Gagal meminta URL upload.');
        status('Mengunggah ' + kind + '…');
        const uploaded = await fetch(ticketData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!uploaded.ok) throw new Error('Upload ' + kind + ' gagal (' + uploaded.status + ').');
        media[kind] = ticketData.key;
      }
      const value = id => ($('#' + id).value || '').trim();
      status('Menerbitkan konten undangan…');
      const response = await fetch('/api/admin/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
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
      status('Berhasil diterbitkan. Link Tamu sudah siap: ' + location.origin + link.getAttribute('href'));
    } catch (error) {
      status(error.message || 'Publikasi gagal. Periksa konfigurasi backend.', true);
    } finally {
      publish.disabled = false;
    }
  });
})();