import { getStore } from "@edgeone/pages-blob";
import { json, validEventId } from "../_lib/http.js";
import { requireOwner } from "../_lib/auth.js";
import { getGuestAccessExpiry } from "../_lib/guest-expiry.js";

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", wav: "audio/wav", weba: "audio/webm" };

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const match = key.match(/^events\/([a-z0-9][a-z0-9-]{2,63})\/media\/([a-z0-9-]+)\.(jpg|jpeg|png|webp|mp4|webm|mp3|m4a|aac|ogg|wav|weba)$/);
  if (!match || !validEventId(match[1])) return json({ error: "Media tidak ditemukan." }, 404);
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${match[1]}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta || meta.status === "archived") return json({ error: "Media tidak ditemukan." }, 404);
    const [invitation, draft] = await Promise.all([
      store.get(`events/${match[1]}/invitation.json`, { type: "json", consistency: "strong" }),
      store.get(`events/${match[1]}/draft.json`, { type: "json", consistency: "strong" })
    ]);
    const publishedKeys = Object.values(invitation?.status === "published" ? invitation.media || {} : {});
    const expiry = getGuestAccessExpiry(invitation || {}, meta);
    if (invitation?.status === "published" && expiry && Date.parse(expiry.expiresAt) <= Date.now()) {
      const owner = await requireOwner(request);
      if (!owner.ok) return json({ error: "Masa aktif media undangan telah berakhir.", expiresAt: expiry.expiresAt }, 410);
    }
    let allowed = publishedKeys.includes(key);
    if (!allowed && Object.values(draft?.media || {}).includes(key)) {
      const owner = await requireOwner(request);
      allowed = owner.ok;
    }
    if (!allowed) return json({ error: "Media tidak ditemukan." }, 404);
    const content = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
    if (!content) return json({ error: "Media tidak ditemukan." }, 404);
    return new Response(content, {
      headers: {
        "Content-Type": TYPES[match[3]],
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return json({ error: "Media storage belum siap." }, 503);
  }
}
