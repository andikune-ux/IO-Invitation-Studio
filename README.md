# IO Invitation Studio

Platform undangan digital multi-acara dengan tiga peran: Owner, Admin acara, dan Tamu.

## Prinsip domain

- Domain Owner tetap: `undangandigital-iODigitalInvitation.edgeone.dev`.
- Hostname Admin dan Tamu direncanakan sebagai subdomain satu tingkat di bawah domain Owner.
- Hostname Admin mengandung slug penyelenggara dan kategori acara.
- Hostname Tamu mengandung slug tamu serta identitas acara.

Contoh hostname (format target, belum aktif):

- Owner: `undangandigital-iODigitalInvitation.edgeone.dev`
- Admin: `andik-ara-undanganpernikahan.undangandigital-iODigitalInvitation.edgeone.dev`
- Tamu: `budi-wati-andik-ara-undanganpernikahan.undangandigital-iODigitalInvitation.edgeone.dev`

## Status

Tahap fondasi. Routing hostname, autentikasi, database, media storage, DNS wildcard, TLS, dan deployment produksi belum diimplementasikan.

## Pengembangan

Aplikasi akan dibangun bertahap dengan pemisahan dashboard Owner, dashboard Admin, halaman Tamu, dan lapisan resolver hostname.
