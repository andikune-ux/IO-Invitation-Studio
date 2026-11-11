import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../../_lib/http.js";

export async function onRequestGet({ params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "Undangan tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta || meta.status === "archived") return json({ error: "Undangan tidak tersedia." }, 404);
    const published = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" });
    const draft = await store.get(`events/${eventId}/draft.json`, { type: "json", consistency: "strong" });
    const draftIsNewer = Boolean(draft && (!published?.publishedAt || (draft.updatedAt && Date.parse(draft.updatedAt) > Date.parse(published.publishedAt))));
    const invitation = draftIsNewer || published?.status !== "published" ? draft : published;
    if (!invitation || !invitation.title) return json({ error: "Konten undangan belum disimpan Owner." }, 404);
    const mediaUrls = {};
    for (const [kind, key] of Object.entries(invitation.media || {})) {
      mediaUrls[kind] = key && !String(key).includes(":") ? `/api/media?key=${encodeURIComponent(key)}` : null;
    }
    return json({ ...invitation, status: invitation === published ? "published" : "ready", mediaUrls }, 200);
  } catch {
    return json({ error: "Penyimpanan belum siap." }, 503);
  }
}
