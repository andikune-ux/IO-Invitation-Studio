# IO Invitation Studio

Platform undangan digital multi-acara dengan pemisahan tiga peran: Owner, Admin acara, dan Tamu.

## Model akses

- **Owner** login melalui secret `IO_ADMIN_API_TOKEN` dan memiliki kendali penuh atas event, desain, template, media, domain, publikasi, dan pengaturan platform.
- **Admin acara** tidak memiliki username/password. Owner menerbitkan link rahasia khusus event. Admin hanya dapat mengelola daftar tamu: tambah, ubah nama, hapus, dan menerbitkan ulang link undangan personal.
- **Tamu** membuka undangan publik melalui link personal tanpa login.

Admin link memakai token acak 256-bit. Backend menyimpan hash token, membatasi token pada satu event, dan mendukung rotasi serta pencabutan. Token Admin tidak memiliki izin untuk mengedit desain, upload media, atau menerbitkan konten utama undangan.

## Domain

Domain Owner target: `undangandigital-iODigitalInvitation.edgeone.dev`.

Contoh hostname Admin/Tamu yang direncanakan masih berupa format target. Wildcard DNS, routing, dan TLS harus diuji sebelum hostname tersebut dianggap aktif.

## Owner Control Center

Buka `/owner.html` untuk login Owner. Saat ini tersedia:
- Ringkasan event, Admin link aktif, dan undangan terbit.
- Buat event dan terbitkan link Admin.
- Cari event, ubah nama, arsipkan/aktifkan.
- Rotasi dan cabut link Admin.

## Admin Guest Manager

Owner memberikan link ke `/admin.html?event={eventId}#admin={secret}`. Halaman Admin hanya menyediakan manajemen daftar tamu dan link personal. Token disimpan sebagai hash di Blob Storage dan fragmen URL dihapus dari address bar setelah dibaca.

Link tamu personal berbentuk `/guest.html?event={eventId}&guestId={guestId}#invite={secret}`. Guest token divalidasi server-side sebelum nama penerima ditampilkan.

## Pengembangan dan deployment

- Static UI: HTML/CSS/JavaScript.
- Backend: EdgeOne Node.js Cloud Functions pada direktori `cloud-functions/`.
- Blob namespace: `io-invitation-media`.
- Secret Owner: `IO_ADMIN_API_TOKEN` (server-side only).
- `npm run check` memeriksa sintaks JavaScript, bukan integrasi live atau deployment EdgeOne.

Lihat `docs/ARCHITECTURE.md` dan `docs/OWNER-ADMIN-AUTH.md` untuk detail endpoint, batasan, dan daftar uji deployment.