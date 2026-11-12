import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../../_lib/http.js";
import { requireEventAdmin } from "../../../_lib/auth.js";

const STORE = "io-invitation-media";

export async function onRequestPatch({ request, params }) {
  const body = await readJson(request);
  const eventId = body?.eventId;
  const guestId = params?.guestId;
  if (!validEventId(eventId) || typeof guestId !== "string" || !/^[0-9a-f-]{36}$/i.test(guestId)) return json({ error: "ID acara atau tamu tidak valid." }, 400);
  const auth = await requireEventAdmin(request, eventId);
  if (!auth.ok) return auth.response;
  try {
    const db = getStore(STORE), key = `events/${eventId}/guests/${guestId}.json`;
    const guest = await db.get(key, { type: "json", consistency: "strong" });
    if (!guest) return json({ error: "Tamu tidak ditemukan." }, 404);

    if (body?.action === "revoke-link" || body?.action === "restore-link") {
      guest.linkActive = body.action === "restore-link";
      guest.linkRevokedAt = guest.linkActive ? null : new Date().toISOString();
      guest.updatedAt = new Date().toISOString();
      await db.setJSON(key, guest);
      return json({ ok: true, guestId, linkActive: guest.linkActive });
    }

    // Backward compatibility: old links with a previously issued token remain
    // valid until explicitly revoked, deleted, or expired.
    const name = safeText(body?.name, 100);
    if (!name) return json({ error: "Nama tamu tidak boleh kosong." }, 400);
    guest.name = name;
    guest.updatedAt = new Date().toISOString();
    await db.setJSON(key, guest);
    return json({ ok: true, guest: { guestId, name, rsvp: guest.rsvp || "pending", linkActive: guest.linkActive !== false } });
  } catch { return json({ error: "Gagal memperbarui tamu." }, 503); }
}

export async function onRequestDelete({ request, params }) {
  const url = new URL(request.url), eventId = url.searchParams.get("eventId") || "";
  const guestId = params?.guestId;
  if (!validEventId(eventId) || typeof guestId !== "string" || !/^[0-9a-f-]{36}$/i.test(guestId)) return json({ error: "ID acara atau tamu tidak valid." }, 400);
  const auth = await requireEventAdmin(request, eventId);
  if (!auth.ok) return auth.response;
  try {
    const db = getStore(STORE), key = `events/${eventId}/guests/${guestId}.json`;
    const guest = await db.get(key, { type: "json", consistency: "strong" });
    if (!guest) return json({ error: "Tamu tidak ditemukan." }, 404);
    await db.delete(key);
    return json({ ok: true });
  } catch { return json({ error: "Gagal menghapus tamu." }, 503); }
}
