# Arsitektur hostname dan akses

## Domain platform

Domain Owner yang dipilih dan harus dipertahankan:

`undangandigital-iODigitalInvitation.edgeone.dev`

## Pola hostname target

Semua hostname Admin dan Tamu menggunakan satu label subdomain di bawah domain platform.

- Owner: `undangandigital-iODigitalInvitation.edgeone.dev`
- Admin: `{slug-penyelenggara}-{kategori}.{OWNER_DOMAIN}`
- Tamu: `{slug-tamu}-{slug-penyelenggara}-{kategori}.{OWNER_DOMAIN}`

Contoh:

- Admin: `andik-ara-undanganpernikahan.undangandigital-iODigitalInvitation.edgeone.dev`
- Tamu: `budi-wati-andik-ara-undanganpernikahan.undangandigital-iODigitalInvitation.edgeone.dev`

## Catatan penting tentang resolusi

Hostname Admin dan Tamu berbagi satu namespace subdomain. Karena itu, aplikasi tidak boleh menebak peran hanya dari jumlah titik atau memecah slug berdasarkan tanda hubung. Nama dapat mengandung beberapa kata dan dapat bertabrakan.

Implementasi produksi harus memakai registry hostname eksplisit di backend/database, misalnya:

- `hostname` (unik, lowercase)
- `role` (`admin` atau `guest`)
- `event_id`
- `guest_id` (nullable untuk Admin)
- `status` dan `expires_at`

Request hostname akan dinormalisasi lalu dicocokkan persis ke registry. Halaman Owner dikenali melalui exact match terhadap domain platform.

## Batasan provider yang wajib diuji

Sebelum pola ini dipakai produksi, verifikasi:

1. Apakah domain project bawaan EdgeOne dapat menerima wildcard DNS untuk subdomain yang dibuat pengguna.
2. Apakah EdgeOne mengizinkan custom wildcard hostname di bawah domain `edgeone.dev` yang dikelola provider.
3. Apakah sertifikat TLS yang tersedia mencakup `*.undangandigital-iODigitalInvitation.edgeone.dev`.
4. Apakah request ke setiap hostname dapat diarahkan ke satu aplikasi dan header Host asli diteruskan.

Jangan menganggap wildcard domain milik provider dapat dikonfigurasi oleh pemilik project. Jika tidak didukung, gunakan custom domain milik Owner atau fallback URL path.

## Keamanan

- Jangan menyimpan password, token, atau data tamu sensitif di frontend.
- Admin harus diverifikasi melalui autentikasi dan izin berdasarkan `event_id`.
- Link tamu harus memakai identifier/token yang tidak mudah ditebak bila memuat informasi privat.
- Data tamu tidak boleh dianggap aman hanya karena hostname sulit ditebak.

## Status saat ini

Dokumen ini menetapkan rancangan. Resolver, backend, database, autentikasi, DNS, TLS, dan deployment produksi belum dibuat atau diverifikasi.


## Editor undangan dan halaman Tamu (implementasi demo)

Branch `feat/admin-media-editor` menambahkan:

- Form editor konten undangan untuk Admin.
- Pemilihan foto JPG/PNG/WEBP hingga 8 MB dan video MP4/WebM hingga 25 MB.
- Preview langsung dan halaman `guest.html`.
- Draft teks menggunakan `localStorage`; file media demo menggunakan IndexedDB pada origin browser yang sama.

**Batasan yang disengaja:** ini belum menjadi sistem publikasi. Data browser tidak otomatis tersedia pada hostname/subdomain lain atau perangkat lain. Jangan menampilkan status "published" dan jangan menganggap upload sudah masuk cloud.

## Tahap backend yang masih wajib

Sebelum fitur dipakai sungguhan, implementasikan dan uji:

1. Identitas/login Admin dan pemeriksaan kepemilikan `event_id` di server.
2. API untuk membuat upload URL sementara (presigned URL) dan membatasi ukuran, MIME type, serta key berdasarkan event.
3. Penyimpanan file di cloud dan metadata file pada database persisten.
4. Endpoint baca publik yang hanya mengembalikan data undangan yang memang dipublikasikan.
5. Registry hostname eksplisit untuk pemetaan Admin/Tamu, status, dan masa berlaku.
6. Pengujian akses lintas perangkat, upload, batas ukuran, izin, dan HTTPS.

Jangan menaruh token rahasia atau kredensial storage di JavaScript frontend. Jangan mengizinkan endpoint upload anonim membuat key arbitrer.

## Backend cloud (fondasi API, belum aktif sebelum deployment)

Branch ini menambahkan Node.js Cloud Functions EdgeOne Makers:
- `POST /api/admin/upload-url`: membuat presigned upload URL 5 menit untuk media acara.
- `POST /api/admin/publish`: menyimpan data undangan berstatus published.
- `GET /api/invitation/{eventId}`: membaca undangan yang sudah diterbitkan.
- `GET /api/media?key=...`: menyajikan media yang direferensikan oleh undangan published.

Penyimpanan memakai namespace Blob `io-invitation-media`. SDK resmi `@edgeone/pages-blob` digunakan dari Node.js Cloud Functions. Dokumentasi runtime/routing: https://pages.edgeone.ai/document/node-functions dan Blob: https://pages.edgeone.ai/document/blob-storage.

### Konfigurasi wajib di EdgeOne sebelum API dapat dipakai
1. Hubungkan project EdgeOne Makers ke repository ini dan pastikan root/build output sesuai project statis.
2. Aktifkan Node.js Cloud Functions untuk direktori `cloud-functions/` (route file-based).
3. Atur environment variable rahasia `IO_ADMIN_API_TOKEN` pada project EdgeOne. Buat token acak panjang di password manager; jangan commit token ke GitHub atau mengirimkannya di chat.
4. Deploy ulang. Jika environment variable belum ada, endpoint Admin sengaja mengembalikan 503.
5. Masukkan token pada panel Publikasi cloud di editor Admin. Token hanya dipakai dalam request saat sesi aktif dan tidak ditulis ke localStorage.

**Batasan keamanan tahap ini:** token adalah token Owner tingkat platform, bukan login multi-Admin dan belum membatasi token ke event tertentu. Jangan membagikannya kepada Admin acara yang belum dipercaya. Sebelum produksi multi-tenant, ganti dengan autentikasi per Admin + otorisasi server-side berdasarkan event_id, rate limit, audit log, dan kebijakan retensi. URL publik undangan hanya mengembalikan record berstatus published.

Blob Free Edition memiliki batas ukuran objek tunggal 25 MB. Foto dibatasi 8 MB dan video 25 MB di API. EdgeOne menyatakan Blob bukan CDN hosting publik; endpoint media di atas mem-proxy objek melalui Cloud Functions, sehingga beban egress/kuota perlu diuji sebelum penggunaan ramai. 

### Status
Kode API dan UI cloud sudah ditambahkan ke branch. Belum ada build, konfigurasi environment, deployment, upload sungguhan, atau pengujian lintas perangkat. Status tersebut tidak boleh dianggap aktif sebelum dites pada project EdgeOne yang benar.
