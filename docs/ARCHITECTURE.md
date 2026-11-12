# IO Invitation Studio — arsitektur platform

## Domain dan deployment

Domain production yang pernah digunakan: `https://io-invitation-studio.edgeone.dev`. Pastikan DNS, routing, TLS, dan deployment terbaru diuji langsung sebelum menyatakan perubahan aktif.

## Model peran dan akses

1. **Owner** — login dengan secret EdgeOne `IO_ADMIN_API_TOKEN`; mengelola event, akses Admin, desain, media, dan publikasi.
2. **Admin acara** — membuka `/admin.html?event={eventId}`; akses hanya ke Guest Manager event tersebut.
3. **Guest** — membuka undangan publik melalui `/guest.html?event={eventId}` atau link personal dengan `guestId`.

**Batas keamanan Admin saat ini:** event ID dipakai sebagai identifier sekaligus kunci akses Admin. Siapa pun yang mengetahui ID event dapat mengelola daftar tamu selama akses Admin aktif. Owner dapat mengatur masa berlaku, mengaktifkan kembali, atau mencabut akses, tetapi model ini tidak setara dengan secret token atau autentikasi akun. Jangan membagikan URL Admin secara publik.

Owner menggunakan sesi cookie HttpOnly. Guest personal link baru memakai UUID acak; link legacy dengan token hash tetap diverifikasi melalui Authorization Bearer header.

## API utama

- `POST /api/auth/owner-login` — autentikasi Owner.
- `GET /api/owner/events` — daftar event Owner.
- `POST /api/owner/admin-links` dan `PATCH /api/owner/admin-links/{eventId}` — akses Admin.
- `GET/POST /api/admin/guests` — daftar dan tambah tamu.
- `PATCH/DELETE /api/admin/guests/{guestId}` — ubah, cabut/pulihkan link, atau hapus tamu.
- `GET /api/guest/resolve` — validasi link tamu personal.
- `GET /api/invitation/{eventId}` — hanya membaca undangan published.
- `GET /api/media?key=...` — menyajikan media yang direferensikan undangan published, termasuk audio.
- `GET/POST /api/guestbook?eventId=...` — buku tamu publik dan RSVP per event.

## Draft, publikasi, dan media

Draft tersimpan di `events/{eventId}/draft.json` dan hanya dibaca melalui endpoint Owner. Halaman publik membaca `events/{eventId}/invitation.json` dengan status `published`; perubahan draft tidak boleh terlihat sebelum diterbitkan.

Media publik harus tercantum pada `media` di undangan published. Endpoint media memvalidasi event, status published, dan referensi media sebelum mengirim file. Format yang didukung: JPG, JPEG, PNG, WEBP, MP4, WebM, MP3, M4A, AAC, OGG, WAV, dan audio WebM.

## Konten undangan

Konten tersimpan mencakup keluarga, rekening hadiah, galeri, cerita, URL Maps, patokan lokasi, URL promosi, dan akun WhatsApp/TikTok/Instagram. Jadwal pernikahan ditampilkan terpisah; countdown mengacu ke akad jika tersedia, jika tidak ke resepsi. RSVP dan ucapan publik menyimpan nama, status hadir/tidak hadir, pesan, serta waktu kirim.

## Verifikasi sebelum produksi

1. Login Owner dan isolasi endpoint Owner.
2. Uji link Admin aktif, kedaluwarsa, dicabut, dan dipulihkan.
3. Uji CRUD tamu, revoke guest link, dan link legacy.
4. Uji upload serta pemutaran audio, gambar, dan video.
5. Simpan draft dan pastikan tamu tetap melihat versi published lama.
6. Terbitkan versi baru dan pastikan halaman tamu menampilkan versi terbaru.
7. Uji peta, alamat, patokan lokasi, rekening, RSVP, buku tamu publik, serta footer sosial.
8. Uji backup/restore dan isolasi data antar-event.

`npm run check` memeriksa sintaks JavaScript dan pemeriksaan skrip halaman tamu. Itu bukan pengujian integrasi Blob Storage, keamanan runtime, atau bukti deployment EdgeOne.
