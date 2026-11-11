import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../../_lib/http.js";

export async function onRequestGet({ params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "Undangan tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const invitation = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" });
    if (!invitation || invitation.status !== "published") return json({ error: "Undangan belum diterbitkan." }, 404);
    const mediaUrls = {};
    for (const [kind, key] of Object.entries(invitation.media || {})) {
      mediaUrls[kind] = key ? `/api/media?key=${encodeURIComponent(key)}` : null;
    }
    return json({ ...invitation, mediaUrls }, 200);
  } catch {
    return json({ error: "Penyimpanan belum siap." }, 503);
  }
}
