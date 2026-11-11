(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const OWNER_DOMAIN = 'undangandigital-iODigitalInvitation.edgeone.dev';
  const CATEGORY_LABELS = {
    pernikahan: 'UndanganPernikahan',
    lamaran: 'UndanganLamaran',
    aqiqah: 'UndanganAqiqah',
    khitanan: 'UndanganKhitanan',
    keagamaan: 'UndanganKeagamaan',
    'ulang-tahun': 'UndanganUlangTahun',
    lainnya: 'UndanganLainnya'
  };
  const DB_NAME = 'io-invitation-media-demo';
  const LEGACY_KEY = 'io-invitation-demo-v1';
  const fields = ['event-title', 'person-one', 'person-two', 'opening-text', 'event-date', 'event-location', 'closing-text', 'media-url'];
  const selectedEvent = new URLSearchParams(location.search).get('event') || '';
  const validEventId = /^[a-z0-9][a-z0-9-]{2,63}$/.test(selectedEvent);
  const eventId = validEventId ? selectedEvent : '';
  const draftKey = 'io-invitation-draft:' + (eventId || 'demo');
  let mediaKeys = { cover: null, video: null };
  let objectUrls = [];

  const toast = (message) => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  };
  const slugify = (value) => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  const readFields = () => Object.fromEntries(fields.map((id) => [id, $('#' + id)?.value || '']));
  const readLocalDraft = () => {
    try {
      const current = localStorage.getItem(draftKey);
      if (current) return JSON.parse(current);
      if (!eventId) return JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
    } catch {}
    return {};
  };
  const saveLocalDraft = (draft) => {
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); }
    catch { toast('Penyimpanan lokal penuh atau tidak tersedia.'); }
  };

  const showView = (name) => {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'view-' + name));
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    const titles = { overview: 'Ringkasan', events: 'Acara', links: 'Generator Link', editor: 'Editor Undangan', settings: 'Pengaturan' };
    const title = $('#page-title');
    if (title) title.textContent = titles[name] || 'Ringkasan';
  };
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.go)));

  const linkForm = $('#link-form');
  if (linkForm) {
    linkForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const owner = slugify($('#host-owner').value);
      const guest = slugify($('#guest-name').value);
      const category = CATEGORY_LABELS[$('#event-category').value] || CATEGORY_LABELS.lainnya;
      if (!owner || !guest) return toast('Nama penyelenggara dan tamu wajib diisi.');
      const adminId = (owner + '-' + slugify(category)).slice(0, 120).replace(/-+$/g, '');
      const guestHost = (guest + '-' + adminId).slice(0, 180).replace(/-+$/g, '');
      $('#owner-url').textContent = OWNER_DOMAIN;
      $('#admin-url').textContent = adminId + '.' + OWNER_DOMAIN;
      $('#guest-url').textContent = guestHost + '.' + OWNER_DOMAIN;
    });
  }
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = $('#' + button.dataset.copy);
      if (!target) return;
      try { await navigator.clipboard.writeText(target.textContent); toast('Link berhasil disalin.'); }
      catch { toast('Clipboard tidak tersedia di browser ini.'); }
    });
  });

  const openDB = () => new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB tidak tersedia.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('media')) request.result.createObjectStore('media');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const putMedia = async (key, file) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media', 'readwrite');
      transaction.objectStore('media').put(file, key);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
  };
  const getMedia = async (key) => {
    if (!key) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media').objectStore('media').get(key);
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  };
  const updatePreview = () => {
    const values = readFields();
    const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
    setText('#preview-title', values['event-title'] || 'Nama acara');
    setText('#preview-names', [values['person-one'], values['person-two']].filter(Boolean).join(' & ') || 'Nama pasangan');
    setText('#preview-opening', values['opening-text']);
    setText('#preview-date', values['event-date'] ? new Date(values['event-date']).toLocaleString('id-ID') : 'Tanggal acara');
    setText('#preview-location', values['event-location'] || 'Lokasi acara');
    setText('#preview-closing', values['closing-text']);
  };
  const showMedia = (kind, file) => {
    const box = $('#' + kind + '-preview');
    if (!box || !file) return;
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    box.replaceChildren();
    const element = document.createElement(kind === 'cover' ? 'img' : 'video');
    element.src = url;
    if (kind === 'cover') element.alt = 'Preview foto sampul';
    else { element.controls = true; element.playsInline = true; }
    box.append(element);
    if (kind === 'cover') {
      const hero = $('#preview-cover');
      if (hero) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = 'Foto sampul undangan';
        hero.replaceChildren(image);
      }
    }
  };

  const form = $('#invitation-form');
  if (form) {
    fields.forEach((id) => {
      const input = $('#' + id);
      if (input) input.addEventListener('input', updatePreview);
    });

    const handleMedia = async (kind, file) => {
      if (!file) return;
      const valid = kind === 'cover'
        ? /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 8 * 1024 * 1024
        : /^video\/(mp4|webm)$/.test(file.type) && file.size <= 25 * 1024 * 1024;
      if (!valid) {
        toast(kind === 'cover' ? 'Foto harus JPG/PNG/WEBP dan maksimal 8 MB.' : 'Video harus MP4/WebM dan maksimal 25 MB.');
        const input = $('#' + kind + '-upload');
        if (input) input.value = '';
        return;
      }
      const key = (eventId || 'demo') + ':' + kind;
      try {
        await putMedia(key, file);
        mediaKeys[kind] = key;
        showMedia(kind, file);
        const saved = readLocalDraft();
        saveLocalDraft({ ...saved, ...readFields(), mediaKeys, savedAt: new Date().toISOString() });
        toast((kind === 'cover' ? 'Foto' : 'Video') + ' siap digunakan.');
      } catch (error) {
        toast('Media tidak bisa disimpan di browser: ' + (error.message || 'penyimpanan tidak tersedia.'));
      }
    };

    const coverInput = $('#cover-upload');
    const videoInput = $('#video-upload');
    if (coverInput) coverInput.addEventListener('change', (event) => handleMedia('cover', event.target.files[0]));
    if (videoInput) videoInput.addEventListener('change', (event) => handleMedia('video', event.target.files[0]));

    document.querySelectorAll('.upload-box').forEach((box) => {
      const input = box.querySelector('input[type="file"]');
      if (!input) return;
      box.addEventListener('dragover', (event) => { event.preventDefault(); box.classList.add('drag-over'); });
      box.addEventListener('dragleave', (event) => {
        if (!box.contains(event.relatedTarget)) box.classList.remove('drag-over');
      });
      box.addEventListener('drop', (event) => {
        event.preventDefault();
        box.classList.remove('drag-over');
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        try {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch { toast('Drag-and-drop tidak didukung browser ini. Gunakan tombol pilih file.'); }
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const localDraft = { ...readFields(), mediaKeys, savedAt: new Date().toISOString() };
      saveLocalDraft(localDraft);
      if (!eventId) {
        toast('Draft lokal tersimpan. Buka editor dari tombol Edit undangan pada acara di Owner Dashboard untuk sinkronisasi cloud.');
        return;
      }
      const submitButton = $('button[type="submit"]', form);
      if (submitButton) submitButton.disabled = true;
      try {
        const response = await fetch('/api/owner/events/' + encodeURIComponent(eventId) + '/draft', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: localDraft['event-title'],
            personOne: localDraft['person-one'],
            personTwo: localDraft['person-two'],
            opening: localDraft['opening-text'],
            date: localDraft['event-date'],
            location: localDraft['event-location'],
            closing: localDraft['closing-text'],
            mediaUrl: localDraft['media-url']
          })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Server menolak penyimpanan draft (' + response.status + ').');
        toast('Draft acara berhasil disimpan ke cloud.');
      } catch (error) {
        toast('Draft lokal tersimpan, tetapi cloud gagal: ' + error.message);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    const resetButton = $('#reset-editor');
    if (resetButton) resetButton.addEventListener('click', () => {
      if (!confirm('Hapus draft lokal untuk acara ini dan muat ulang editor?')) return;
      localStorage.removeItem(draftKey);
      location.reload();
    });

    const saved = readLocalDraft();
    fields.forEach((id) => {
      const input = $('#' + id);
      if (input && saved[id] !== undefined) input.value = saved[id];
    });
    mediaKeys = saved.mediaKeys || mediaKeys;

    const cloudEventInput = $('#cloud-event-id');
    const guestPreviewLink = $('#guest-preview-link');
    const accessRequired = $('#editor-access-required');
    const editorWorkspace = $('#editor-workspace');
    const editorEventName = $('#editor-event-name');
    const editorEventId = $('#editor-event-id');
    if (eventId) {
      if (cloudEventInput) cloudEventInput.value = eventId;
      if (guestPreviewLink) guestPreviewLink.href = './guest.html?event=' + encodeURIComponent(eventId);
      const cloudStatus = $('#cloud-status');
      if (cloudStatus) cloudStatus.textContent = 'Menghubungkan editor ke acara ' + eventId + '…';

      const loadCloudContent = async () => {
        const authRequest = fetch('/api/auth/me', { credentials: 'same-origin' });
        const eventsRequest = fetch('/api/owner/events', { credentials: 'same-origin' });
        const draftRequest = fetch('/api/owner/events/' + encodeURIComponent(eventId) + '/draft', { credentials: 'same-origin' });
        const invitationRequest = fetch('/api/invitation/' + encodeURIComponent(eventId), { credentials: 'same-origin' });
        const [authResponse, eventsResponse, draftResponse, invitationResponse] = await Promise.all([authRequest, eventsRequest, draftRequest, invitationRequest]);
        const auth = authResponse.ok ? await authResponse.json() : null;
        if (!auth?.authenticated || auth.user?.role !== 'owner') throw new Error('Sesi Owner tidak aktif. Login melalui Owner Dashboard, lalu pilih Edit undangan kembali.');
        if (!eventsResponse.ok) throw new Error('Daftar acara Owner tidak dapat dibaca (' + eventsResponse.status + ').');
        const eventsData = await eventsResponse.json();
        const eventRecord = (eventsData.events || []).find(item => item.eventId === eventId);
        if (!eventRecord) throw new Error('Acara tidak ditemukan atau akses Owner tidak tersedia. Kembali ke dashboard dan pilih acara yang benar.');
        const canonicalTitle = eventRecord.title || eventId;
        if (editorEventName) editorEventName.textContent = canonicalTitle;
        if (editorEventId) editorEventId.textContent = eventId;
        const titleInput = $('#event-title');
        if (titleInput) titleInput.value = canonicalTitle;
        updatePreview();
        const draftResult = draftResponse.ok ? await draftResponse.json() : null;
        const invitation = invitationResponse.ok ? await invitationResponse.json() : null;

        if (draftResponse.status === 401 || draftResponse.status === 403) {
          throw new Error('Sesi Owner tidak aktif. Login melalui Owner Dashboard, lalu buka kembali editor acara ini.');
        }
        if (!draftResponse.ok && draftResponse.status !== 404) {
          throw new Error('Gagal membaca draft cloud (' + draftResponse.status + ').');
        }
        if (!invitationResponse.ok && invitationResponse.status !== 404) {
          throw new Error('Gagal membaca undangan terbit (' + invitationResponse.status + ').');
        }

        const content = draftResult?.draft || invitation;
        if (content) {
          const values = {
            'person-one': content.personOne,
            'person-two': content.personTwo,
            'opening-text': content.opening,
            'event-date': content.date,
            'event-location': content.location,
            'closing-text': content.closing,
            'media-url': content.mediaUrl
          };
          Object.entries(values).forEach(([id, value]) => {
            const input = $('#' + id);
            if (input && value !== undefined && value !== null) input.value = value;
          });
          if (titleInput) titleInput.value = canonicalTitle;
          updatePreview();
        }

        if (invitation?.mediaUrls?.cover) {
          const image = document.createElement('img');
          image.src = invitation.mediaUrls.cover;
          image.alt = 'Foto sampul yang sedang diterbitkan';
          const hero = $('#preview-cover');
          if (hero) hero.replaceChildren(image);
        }
        if (invitation?.mediaUrls?.video) {
          const video = document.createElement('video');
          video.src = invitation.mediaUrls.video;
          video.controls = true;
          video.playsInline = true;
          const preview = $('#video-preview');
          if (preview) preview.replaceChildren(video);
        }
        if (accessRequired) accessRequired.hidden = true;
        if (editorWorkspace) editorWorkspace.hidden = false;
        if (cloudStatus) cloudStatus.textContent = draftResult?.draft
          ? 'Terhubung. Draft cloud berhasil dimuat untuk acara ' + eventId + '.'
          : invitation
            ? 'Terhubung. Konten undangan terbit berhasil dimuat untuk acara ' + eventId + '.'
            : 'Terhubung. Belum ada draft atau undangan terbit; silakan mulai mengisi editor.';
        toast('Editor terhubung ke acara ' + eventId + '.');
      };

      loadCloudContent().catch((error) => {
        if (accessRequired) { accessRequired.hidden = false; accessRequired.querySelector('p').textContent = error.message || 'Editor tidak dapat dibuka.'; }
        if (editorWorkspace) editorWorkspace.hidden = true;
        if (cloudStatus) {
          cloudStatus.textContent = error.message || 'Editor gagal terhubung ke cloud.';
          cloudStatus.style.color = '#b42318';
        }
        toast(error.message || 'Editor gagal terhubung ke cloud.');
      });
    } else {
      if (cloudEventInput) cloudEventInput.value = '';
      if (accessRequired) { accessRequired.hidden = false; accessRequired.querySelector('p').textContent = 'Buka Owner Dashboard, login sebagai Owner, lalu tekan tombol Edit undangan pada acara yang ingin dikelola.'; }
      if (editorWorkspace) editorWorkspace.hidden = true;
    }

    updatePreview();
    Promise.all([getMedia(mediaKeys.cover), getMedia(mediaKeys.video)])
      .then(([cover, video]) => {
        if (cover) showMedia('cover', cover);
        if (video) showMedia('video', video);
      }).catch(() => {});
    if (guestPreviewLink) guestPreviewLink.href = './guest.html?event=' + encodeURIComponent(eventId || 'demo');
  }

  if (linkForm) linkForm.dispatchEvent(new Event('submit', { cancelable: true }));
  window.addEventListener('pagehide', () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
})();