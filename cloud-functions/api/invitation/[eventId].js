import { getStore } from "@edgeone/pages-blob";
import { recordOperationalError } from "../../_lib/monitoring.js";
import { json, validEventId } from "../../_lib/http.js";
import { getGuestAccessExpiry } from "../../_lib/guest-expiry.js";
import { requireOwner } from "../../_lib/auth.js";

export async function onRequestGet({ request, params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "Undangan tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta || meta.status === "archived") return json({ error: "Undangan tidak tersedia." }, 404);
    const invitation = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" });
    if (!invitation || invitation.status !== "published" || !invitation.title) return json({ error: "Undangan belum diterbitkan Owner." }, 404);
    const guestExpiry = getGuestAccessExpiry(invitation, meta);
    if (guestExpiry && Date.parse(guestExpiry.expiresAt) <= Date.now()) {
      const owner = await requireOwner(request);
      if (!owner.ok) return json({ error: "Masa aktif undangan tamu telah berakhir pada " + guestExpiry.expiresAt + ". Hubungi Owner untuk perpanjangan.", expiresAt: guestExpiry.expiresAt, reason: "event_date_plus_one_month" }, 410);
    }
    const mediaUrls = {};
    for (const [kind, key] of Object.entries(invitation.media || {})) {
      mediaUrls[kind] = key && !String(key).includes(":") ? `/api/media?key=${encodeURIComponent(key)}` : null;
    }
    return json({ ...invitation, status: "published", guestAccessExpiresAt: guestExpiry?.expiresAt || null, mediaUrls }, 200);
  } catch (error) {
    await recordOperationalError(request, "/api/invitation/:eventId", error, 503);
    return json({ error: "Penyimpanan belum siap." }, 503);
  }
}
