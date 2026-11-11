import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../../_lib/http.js";

export async function onRequestGet({ params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "Undangan tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const invitation = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" });
    if (!invitation || invitation.status !== "published") return json({ error: "Undangan belum diterbitkan." }, 404);
    return json({
      ...invitation,
      mediaUrls: {
        cover: invitation.media?.cover ? `/api/media?key=${encodeURIComponent(invitation.media.cover)}` : null,
        video: invitation.media?.video ? `/api/media?key=${encodeURIComponent(invitation.media.video)}` : null
      }
    }, 200);
  } catch {
    return json({ error: "Penyimpanan belum siap." }, 503);
  }
}
