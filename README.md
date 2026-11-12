# IO Invitation Studio

Platform undangan digital multi-acara dengan tiga peran: Owner, Admin acara, dan Tamu.

## Model akses

- **Owner** login menggunakan secret server-side `IO_ADMIN_API_TOKEN` dan mengelola acara, desain, media, publikasi, serta akses Admin.
- **Admin acara** menggunakan link `/admin.html?event={eventId}`. Akses dibatasi pada satu event dan dikendalikan Owner melalui masa berlaku, aktivasi, dan pencabutan.
- **Tamu** membuka undangan terbit dan link personal melalui `/guest.html?event={eventId}&guestId={guestId}`. ID tamu berupa UUID acak dan dapat dicabut dari Guest Manager. Akses publik undangan dan media terkait otomatis berakhir pada tengah malam WIB di tanggal yang sama satu bulan kalender setelah tanggal acara (akad, tanggal acara, atau resepsi sebagai fallback). Owner tetap dapat mengakses dan mengedit data; Owner dapat memperpanjang masa aktif tanpa mengganti URL.

**Catatan keamanan Admin:** event ID adalah identifier sekaligus kunci akses Admin pada model saat ini. Siapa pun yang mengetahui ID event dapat mengakses Guest Manager selama akses Admin aktif. Owner harus membatasi distribusi URL dan segera mencabut akses bila bocor. Masa berlaku bukan pengganti autentikasi berbasis secret.

## Fitur undangan

- Editor konten dan tema sesuai kategori acara.
- Foto utama, foto sampul, galeri, video, musik latar, dan efek suara.
- Musik diputar setelah tamu menekan tombol Buka Undangan. Browser tetap dapat menolak playback jika gesture tidak dianggap valid atau file gagal dimuat.
- Jadwal akad dan resepsi; countdown pernikahan mengacu ke akad bila tersedia, jika tidak ke resepsi.
- Pratinjau Google Maps, alamat, dan patokan lokasi.
- Rekening hadiah dengan logo/ikon bank dan tombol salin nomor rekening.
- RSVP Hadir/Tidak Hadir dan buku tamu publik untuk ucapan.
- Footer promosi dan ikon WhatsApp, TikTok, Instagram; URL promosi dan akun sosial dapat diisi Owner.

## Penyimpanan dan publikasi

- Static UI: HTML/CSS/JavaScript.
- Backend: EdgeOne Node.js Cloud Functions pada `cloud-functions/`.
- Blob namespace: `io-invitation-media`.
- Secret Owner: `IO_ADMIN_API_TOKEN` (server-side only).
- Endpoint publik hanya membaca `invitation.json` berstatus `published`; draft tidak ditampilkan ke tamu.
- Media publik hanya dapat diambil bila direferensikan oleh undangan terbit.
- RSVP dan buku tamu disimpan per event di Blob Storage.

## Pengembangan dan deployment

`npm run check` memeriksa sintaks JavaScript dan skrip pemeriksaan Guest page. Ini bukan pengujian integrasi Blob Storage, keamanan runtime, atau bukti bahwa deployment EdgeOne Production sudah selesai.

Sebelum produksi, uji Owner login, Admin revoke/expiry, guest link revoke, upload semua media termasuk audio, publish, draft isolation, RSVP, guestbook, backup/restore, dan isolasi antar-event.
