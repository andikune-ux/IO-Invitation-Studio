import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../../_lib/http.js";

export async function onRequestGet({ params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "Undangan tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta || meta.status === "archived") return json({ error: "Undangan tidak tersedia." }, 404);
    const invitation = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" });
    if (!invitation || invitation.status !== "published" || !invitation.title) return json({ error: "Undangan belum diterbitkan Owner." }, 404);
    const mediaUrls = {};
    for (const [kind, key] of Object.entries(invitation.media || {})) {
      mediaUrls[kind] = key && !String(key).includes(":") ? `/api/media?key=${encodeURIComponent(key)}` : null;
    }
    return json({ ...invitation, status: "published", mediaUrls }, 200);
  } catch {
    return json({ error: "Penyimpanan belum siap." }, 503);
  }
}
