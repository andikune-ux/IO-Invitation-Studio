# Owner and Admin access model

## Roles and permissions

- **Owner** authenticates with the server-side EdgeOne secret `IO_ADMIN_API_TOKEN`. Owner manages events, design, templates, media, publication, and Admin access.
- **Admin** opens `/admin.html?event={eventId}` and manages the guest list for that event.
- **Guest** opens a published invitation and may submit RSVP plus a public message.

## Admin access: current limitation

The current implementation uses the event ID as the Admin access identifier and credential. Anyone who knows or obtains the event ID can access that event's Guest Manager while its Admin access record is active. Owner can activate, extend, expire, or revoke access, but expiry/revocation do not prevent access before revocation by someone who already knows the ID.

Treat Admin URLs and event IDs as confidential. This is a deliberate simplified access model requested for the product; it is not equivalent to a random secret token or individual Admin authentication.

## Owner session

- `POST /api/auth/owner-login` validates the Bearer secret from `IO_ADMIN_API_TOKEN`.
- A successful login creates an HttpOnly, Secure, SameSite=Strict session cookie.
- Owner endpoints require the Owner session.

## Guest links

- New guest links use `/guest.html?event={eventId}&guestId={guestId}`, where `guestId` is a random UUID.
- Guest records can be deactivated or restored by Admin. Deleting a guest removes the record and invalidates the link.
- Legacy guest links with a stored token hash continue to require their Bearer token. The resolver extracts the token using the standard Bearer whitespace pattern.
- RSVP submissions for a personal link validate the guest record and legacy token where one exists.

## Public invitation and guestbook

- `GET /api/invitation/{eventId}` serves only `invitation.json` with status `published`. Draft content is never selected for the public page.
- `GET /api/media?key=...` only serves media keys referenced by the published invitation.
- `GET /api/guestbook?eventId=...` returns up to 100 newest public guestbook entries.
- `POST /api/guestbook` accepts event ID, optional guest ID, name, RSVP status (`hadir` or `tidak_hadir`), and message. A personal guest ID updates its RSVP status in the Admin guest list.
- Public guestbook content is rendered as text, not HTML. Review moderation and anti-spam requirements before high-traffic production use.

## Upload and publish

Only Owner can upload media and publish the main invitation. Accepted audio types include MP3, M4A, AAC, OGG, WAV, and WebM audio (stored with a distinct `.weba` extension). Published media is checked against the published invitation's media references.

## Deployment checks

1. Configure `IO_ADMIN_API_TOKEN` as a server-side secret in the active EdgeOne environment.
2. Confirm Blob namespace `io-invitation-media`.
3. Deploy latest repository commit.
4. Test Owner login, Admin access expiry/revoke, guest CRUD, legacy guest links, audio delivery, published-vs-draft isolation, RSVP, guestbook, map preview, and cross-event isolation.
5. Confirm the live Production domain after deployment.

`npm run check` validates syntax and guest script integrity only; it does not prove live Blob Storage, authorization isolation, or production deployment.
