import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../../../../_lib/http.js";
import { requireOwner } from "../../../../_lib/auth.js";

export async function onRequestDelete({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const store = getStore("io-invitation-media");
  try {
    const metaKey = `events/${eventId}/meta.json`;
    const meta = await store.get(metaKey, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);

    // Revoke access first. The event metadata is deleted last so a failed cleanup can be retried.
    await Promise.all([
      store.delete(`auth/admin-links/${eventId}.json`).catch(() => {}),
      store.delete(`auth/admins/${eventId}.json`).catch(() => {})
    ]);
    const { blobs: sessions = [] } = await store.list({ prefix: "auth/sessions/", consistency: "strong" }).catch(() => ({ blobs: [] }));
    await Promise.all(sessions.map(async ({ key }) => {
      const session = await store.get(key, { type: "json", consistency: "strong" }).catch(() => null);
      if (session?.role === "admin" && session.eventId === eventId) await store.delete(key);
    }));

    // Delete only this event's records, guests/RSVP and media objects.
    const { blobs = [] } = await store.list({ prefix: `events/${eventId}/`, consistency: "strong" });
    const eventKeys = blobs.map(({ key }) => key).filter(key => key.startsWith(`events/${eventId}/`) && key !== metaKey);
    await Promise.all(eventKeys.map(key => store.delete(key)));
    await store.delete(metaKey);
    return json({ ok: true, eventId, deletedRecords: eventKeys.length + 1 });
  } catch {
    return json({ error: "Penghapusan acara belum selesai. Silakan coba lagi atau periksa Blob Storage." }, 503);
  }
}
