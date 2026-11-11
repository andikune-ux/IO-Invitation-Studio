# Owner and Admin access model

## Roles and permissions

- **Owner** authenticates with the server-side EdgeOne secret `IO_ADMIN_API_TOKEN`. Owner manages events, design, templates, media, domains, publication, and platform settings.
- **Admin** has no username or password. Owner issues one secret URL scoped to one event. Admin can only manage that event's guest list: add guests, rename guests, delete guests, and issue/rotate personal invitation links.
- **Guest** has no login. Guest opens a personal invitation URL; the server validates the guest token before showing the recipient name.

Admin cannot access Owner endpoints and cannot edit invitation design, upload media, or publish main invitation content. Upload and publish APIs require an Owner session.

## Admin link security

- Owner creates event metadata through `POST /api/owner/admins`.
- Owner issues a link through `POST /api/owner/admin-links`.
- Server generates 32 cryptographically random bytes; only a SHA-256 digest is stored at `auth/admin-links/{eventId}.json`.
- Admin URL opens `/admin.html?event={eventId}#admin={secret}`. The page reads the token from the URL fragment, removes it from browser history, and sends it only as an Authorization Bearer header to guest-management endpoints.
- Token is scoped to a single event and cannot call Owner APIs.
- Owner can rotate or revoke the link using `PATCH /api/owner/admin-links/{eventId}` with `{ "action": "rotate" }` or `{ "action": "revoke" }`.
- Rotation invalidates the previous link; revocation disables the current link.
- When a legacy event receives its first link, the old password account and Admin sessions for that event are deleted. The old password login endpoint returns HTTP 410.
- Anyone who holds an Admin link can manage that event's guest list. Share it only with the event manager.

## Guest link security

- Admin creates a guest using `POST /api/admin/guests`.
- Server generates a random guest ID and a separate random token. Only the token hash is stored.
- Personal URL format: `/guest.html?event={eventId}&guestId={guestId}#invite={secret}`.
- The Guest page sends the token to `GET /api/guest/resolve` using an Authorization Bearer header. The token fragment is removed from the address bar immediately.
- Admin can reissue a guest link through `PATCH /api/admin/guests/{guestId}` with `{ "eventId": "...", "action": "rotate-link" }`. This invalidates the previous link.
- Deleting a guest also invalidates their link because the guest record is deleted.

## Owner Dashboard

Open `/owner.html` and sign in with the Owner API token. Current features:
- Create event and issue its Admin link.
- Search and list events.
- Rename, archive, and reactivate events.
- Rotate and revoke Admin links.
- Monitor invitation publication status.

## Admin Guest Manager

The Admin page is `/admin.html`. It supports:
- Add guest names.
- Search the guest list.
- Rename or delete a guest.
- Issue/copy a fresh personalized invitation link.

The Admin page is marked noindex and uses a no-referrer policy. Do not add third-party scripts or analytics to this page without reviewing their access to page context.

## API endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/auth/owner-login` | Public + Owner secret | Create Owner session |
| POST | `/api/owner/admins` | Owner | Create event metadata |
| GET | `/api/owner/events` | Owner | List event metadata |
| PATCH | `/api/owner/events/{eventId}` | Owner | Rename/archive/reactivate |
| POST | `/api/owner/admin-links` | Owner | Issue Admin link |
| PATCH | `/api/owner/admin-links/{eventId}` | Owner | Rotate/revoke Admin link |
| GET/POST | `/api/admin/guests` | Event Admin link | List/add guests |
| PATCH/DELETE | `/api/admin/guests/{guestId}` | Event Admin link | Rename/reissue link/delete guest |
| GET | `/api/guest/resolve` | Guest token | Validate personal guest link |
| POST | `/api/admin/upload-url` | Owner | Create media upload URL |
| POST | `/api/admin/publish` | Owner | Publish invitation |
| POST | `/api/auth/admin-login` | Retired | Returns HTTP 410 |

## Deployment checks

1. Enable Node.js Cloud Functions for `cloud-functions/`.
2. Configure `IO_ADMIN_API_TOKEN` as an EdgeOne server-side secret.
3. Confirm Blob namespace `io-invitation-media` is available.
4. Deploy the latest `main` commit.
5. Test Owner login, event creation, Admin link issue/rotation/revoke, guest CRUD, guest link resolve, Owner-only media upload and publication, and cross-event access isolation.

`npm run check` validates JavaScript syntax only. It does not exercise live Blob Storage, authorization isolation, upload behavior, or production deployment.

## Migration

Existing events may contain legacy Admin password records. When Owner issues an Admin link for such an event, the old password record and event-scoped Admin sessions are deleted. The Admin link is displayed only once at issue/rotation time because the server stores only its hash. If lost, rotate it in Owner Dashboard and share the new URL.