# Owner and per-event Admin authentication

This feature replaces the shared global Admin bearer token on event upload and publish endpoints with server-side sessions.

## Security model

- Owner login: `POST /api/auth/owner-login`, authenticated with the existing EdgeOne secret `IO_ADMIN_API_TOKEN` in an Authorization Bearer header.
- Owner provisions one Admin account per event: `POST /api/owner/admins`.
- Admin login: `POST /api/auth/admin-login`, using event ID, username, and password.
- Sessions are random opaque tokens in Secure, HttpOnly, SameSite=Strict cookies. Only SHA-256 token digests are stored.
- Admin passwords are stored as scrypt hashes with unique random salts.
- Upload URL and publish endpoints require an Admin session matching the requested event ID.
- Sessions expire after 8 hours. `POST /api/auth/logout` revokes the current session.

## Owner Dashboard

- Open `/owner.html` to sign in to the Owner workspace.
- The dashboard lists events from the `io-invitation-media` Blob namespace and shows publication and Admin status.
- Owner can create an event with its first Admin, rename an event, archive/reactivate it, disable/reactivate its Admin, and reset the Admin password.
- New and reset passwords are shown once in the browser. Copy and deliver them securely; the server stores only scrypt password hashes.
- Disabling an Admin or resetting its password revokes all existing sessions for that event.
- Archived events are not deleted and their Admin credentials are not automatically disabled.

## Provision the first event Admin

Use a trusted terminal. Do not put the Owner token in frontend source code, a GitHub commit, or a shared chat.

1. Login as Owner and save the returned cookie:

```sh
curl -i -c owner-cookie.txt -X POST \
  -H "Authorization: Bearer $IO_ADMIN_API_TOKEN" \
  https://YOUR_DEPLOYED_HOST/api/auth/owner-login
```

2. Create an event and its Admin account:

```sh
curl -i -b owner-cookie.txt -X POST \
  -H "Content-Type: application/json" \
  --data '{"eventId":"andik-ara-pernikahan","eventTitle":"Andik & Ara","username":"andikadmin","password":"GantiDenganPasswordPanjang12Karakter","displayName":"Admin Andik & Ara"}' \
  https://YOUR_DEPLOYED_HOST/api/owner/admins
```

3. Admin logs in from the Invitation Studio editor using the event ID, username, and password. The browser receives the session cookie automatically.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/owner-login` | Exchange Owner secret for an Owner session |
| POST | `/api/owner/admins` | Create an event and its first Admin |
| GET | `/api/owner/events` | List events and safe Admin status fields |
| PATCH | `/api/owner/events/{eventId}` | Rename or archive/reactivate an event |
| PATCH | `/api/owner/admins/{eventId}` | Enable/disable Admin or reset password |
| POST | `/api/auth/admin-login` | Create an event-scoped Admin session |
| GET | `/api/auth/me` | Inspect current session |
| POST | `/api/auth/logout` | Revoke current session |
| POST | `/api/admin/upload-url` | Admin-only media upload ticket |
| POST | `/api/admin/publish` | Admin-only publication |

## Deployment and verification

Deploy the branch/PR through the configured EdgeOne workflow, confirm the Cloud Functions routes are active, and verify that `IO_ADMIN_API_TOKEN` remains set as a server-side secret. Do not test with a real invitation until Blob storage is confirmed available.

The repository's `npm run check` validates JavaScript syntax only. It does not exercise live Blob storage, password login, cookies, authorization, or production deployment.

## Current limitations

- This initial implementation supports one Admin account per event; account replacement, password reset, and multi-Admin membership are follow-up work.
- Login rate limiting and audit logging are not implemented yet. Add these before opening public self-service account creation.
- Blob reads for auth records use strong consistency. Blob does not provide transactional compare-and-set in this implementation, so concurrent Owner requests to create the same event should be avoided.
- Cookie sessions are host-only. Cross-subdomain login will need a separately designed shared-domain session strategy if wildcard hostnames are later activated.
