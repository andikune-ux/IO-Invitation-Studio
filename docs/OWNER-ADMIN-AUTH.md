# Owner and per-event Admin access

## Roles

- **Owner** signs in with the server-side EdgeOne secret `IO_ADMIN_API_TOKEN` and manages every event.
- **Admin** receives one secret, event-scoped access URL from Owner. No username, password, or Admin login form is used.
- **Guest** opens the published public invitation and may submit RSVP when that feature is enabled.

## Admin link security

- Owner creates an event with `POST /api/owner/admins`, then provisions access with `POST /api/owner/admin-links`.
- The server generates 32 cryptographically random bytes and returns the URL token once.
- Only a SHA-256 digest is stored at `auth/admin-links/{eventId}.json`.
- Admin access is sent as an Authorization Bearer header to event-scoped upload and publish endpoints. The browser reads the secret from the URL fragment and removes the fragment from browser history immediately.
- The token is scoped to one event. It cannot call Owner endpoints.
- Owner can rotate or revoke access with `PATCH /api/owner/admin-links/{eventId}` and `{ "action": "rotate" }` or `{ "action": "revoke" }`.
- Rotation invalidates the previous token. Revocation disables the current token.
- When an event is migrated by creating its first Admin link, the legacy password account and its Admin sessions are deleted.
- Do not forward Admin URLs to anyone except the event manager. Anyone holding the link can manage that event's invitation content and media.

## Owner Dashboard

Open `/owner.html` and sign in with the Owner API token. The dashboard supports:
- Create an event and issue a secure Admin link.
- List and search events.
- Rename, archive, and reactivate events.
- Create, rotate, and revoke event-scoped Admin links.
- Monitor publication state.

The Admin URL opens `/index.html?event={eventId}#admin={secret}`. The fragment is not sent in the initial HTTP request; the page reads it into memory and removes it from the visible URL. Do not add third-party scripts or analytics to the Admin editor without reviewing their access to page context.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/owner-login` | Exchange Owner secret for a protected Owner session |
| POST | `/api/owner/admins` | Create event metadata |
| GET | `/api/owner/events` | List events and access-link status |
| PATCH | `/api/owner/events/{eventId}` | Rename or archive/reactivate an event |
| POST | `/api/owner/admin-links` | Create an event-scoped Admin link |
| PATCH | `/api/owner/admin-links/{eventId}` | Rotate or revoke an Admin link |
| POST | `/api/auth/admin-login` | Retired; returns HTTP 410 |
| POST | `/api/admin/upload-url` | Admin-link-only media upload ticket |
| POST | `/api/admin/publish` | Admin-link-only invitation publication |

## Deployment checks

1. Ensure Cloud Functions are enabled for the `cloud-functions/` directory.
2. Configure `IO_ADMIN_API_TOKEN` as an EdgeOne server-side secret.
3. Confirm Blob Storage namespace `io-invitation-media` is available.
4. Deploy the latest main commit.
5. Verify Owner login, event creation, one-time Admin link issuance, upload, publish, link rotation, and revocation in a test event.

The repository's `npm run check` checks JavaScript syntax only. It does not verify live Blob Storage, token isolation, upload behavior, or production deployment.

## Migration notes

Existing events may still have a legacy password account. Their current dashboard will show that legacy record until Owner creates an Admin link for that event. Creating the link removes the legacy password record and revokes its sessions. The new secret link must be saved and shared at issuance time; it cannot be recovered from storage because only its digest is retained.
