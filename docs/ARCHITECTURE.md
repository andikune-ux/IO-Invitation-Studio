# IO Invitation Studio — arsitektur platform

## Domain platform

Domain Owner yang dipilih untuk target akhir:

`undangandigital-iODigitalInvitation.edgeone.dev`

Deployment yang sebelumnya diverifikasi dari percakapan menggunakan alamat project EdgeOne:

`io-invitation-studio.edgeone.dev`

Jangan menganggap domain target dan seluruh subdomain sudah aktif sebelum DNS, routing, dan TLS diuji langsung.

## Pola hostname target

- Owner: `undangandigital-iODigitalInvitation.edgeone.dev`
- Admin: `{slug-penyelenggara}-{kategori}.{OWNER_DOMAIN}`
- Tamu: `{slug-tamu}-{slug-penyelenggara}-{kategori}.{OWNER_DOMAIN}`

Hostname Admin/Tamu memerlukan registry hostname eksplisit. Jangan menebak role dari jumlah titik atau memecah nama hanya berdasarkan tanda hubung karena nama bisa bertabrakan.

Registry target: `hostname` unik, `role`, `event_id`, `guest_id` (nullable), `status`, dan `expires_at`.

## Model peran

1. **Owner** — login dengan secret EdgeOne `IO_ADMIN_API_TOKEN`; mengelola event, akses Admin, desain, media, domain, publikasi, dan pengaturan platform.
2. **Admin acara** — tidak memiliki akun/password. Owner menerbitkan URL rahasia dengan token acak 256-bit yang hanya berlaku untuk satu event. Admin dapat mengelola konten dan media event itu melalui editor.
3. **Guest** — tanpa login; membuka undangan publik dan mengirim RSVP bila fitur tersedia.

Admin token dikirim melalui Authorization Bearer header. Token dibaca dari URL fragment oleh editor dan fragmen dihapus dari address bar. Backend hanya menyimpan SHA-256 token digest. Owner dapat merotasi atau mencabut token; rotasi membuat token lama tidak berlaku. Endpoint Admin menolak token yang tidak valid, dicabut, atau milik event lain. Token Admin tidak dapat mengakses endpoint Owner.

Saat event lama pertama kali diberi Admin link, akun/password Admin lama dan sesi Admin lama untuk event tersebut dihapus. Endpoint login password lama mengembalikan HTTP 410.

## Cloud Functions dan Blob Storage

Namespace Blob: `io-invitation-media`.

- `POST /api/auth/owner-login` — Owner secret ke sesi Owner HttpOnly.
- `POST /api/owner/admins` — membuat metadata event.
- `GET /api/owner/events` — daftar event dan status publikasi/link.
- `PATCH /api/owner/events/{eventId}` — ubah nama atau arsipkan/aktifkan event.
- `POST /api/owner/admin-links` — buat Admin link event.
- `PATCH /api/owner/admin-links/{eventId}` — rotasi atau cabut Admin link.
- `POST /api/admin/upload-url` — Admin link meminta URL upload sementara.
- `POST /api/admin/publish` — Admin link menerbitkan konten undangan.
- `GET /api/invitation/{eventId}` — mengambil undangan yang telah diterbitkan.
- `GET /api/media?key=...` — menyajikan media yang direferensikan oleh undangan published.

Foto dibatasi 8 MB dan video 25 MB. Endpoint media mem-proxy Blob melalui Cloud Functions; uji kuota dan egress sebelum acara dengan trafik tinggi.

## Owner Control Center

`/owner.html` adalah ruang kendali Owner dengan desain soft-neumorphism dan iOS-inspired liquid glass. Fungsi yang sudah diimplementasikan pada tahap ini:
- Login Owner dan sesi terlindungi.
- Ringkasan jumlah event, Admin link aktif, dan undangan terbit.
- Buat event dan terbitkan Admin link satu kali.
- Cari dan daftar event.
- Ubah nama, arsipkan, aktifkan kembali.
- Rotasi dan cabut Admin link.

Fitur lanjutan seperti Template Studio, Media Library, Guest Manager/RSVP, Analytics, Distribution Center, Domain Manager, Finance, Backup/Restore, audit log, dan pengaturan sistem masih menjadi roadmap. Jangan menampilkan kontrol yang belum memiliki backend sebagai fitur aktif.

## Batasan dan verifikasi deployment

Sebelum produksi:
1. Pastikan Cloud Functions aktif pada project EdgeOne yang terhubung ke repository ini.
2. Konfigurasikan `IO_ADMIN_API_TOKEN` sebagai secret server-side.
3. Pastikan Blob Storage namespace tersedia.
4. Uji login Owner, create event, issuance link, upload foto/video, publish, link rotation, revoke, serta isolasi akses antar-event.
5. Uji domain target, wildcard DNS, routing, dan sertifikat TLS.

GitHub Actions `npm run check` hanya memeriksa sintaks JavaScript; bukan pengujian integrasi Blob, keamanan runtime, atau deployment EdgeOne.