import { getStore } from "@edgeone/pages-blob";
import { json, readJson, requireAdmin, safeText, validEventId } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const body = await readJson(request);
  if (!body || !validEventId(body.eventId) || !body.invitation || typeof body.invitation !== "object") {
    return json({ error: "Data publikasi tidak lengkap atau eventId tidak valid." }, 400);
  }
  const media = body.media || {};
  for (const kind of ["cover", "video"]) {
    const key = media[kind];
    if (key && (typeof key !== "string" || !key.startsWith(`events/${body.eventId}/media/`) || key.includes(".."))) {
      return json({ error: "Referensi media tidak valid." }, 400);
    }
  }
  const invitation = {
    eventId: body.eventId,
    title: safeText(body.invitation.title, 100),
    personOne: safeText(body.invitation.personOne, 60),
    personTwo: safeText(body.invitation.personTwo, 60),
    opening: safeText(body.invitation.opening, 500),
    date: safeText(body.invitation.date, 40),
    location: safeText(body.invitation.location, 180),
    closing: safeText(body.invitation.closing, 500),
    media: { cover: media.cover || null, video: media.video || null },
    publishedAt: new Date().toISOString(),
    status: "published"
  };
  if (!invitation.title) return json({ error: "Nama acara wajib diisi." }, 400);
  try {
    const store = getStore("io-invitation-media");
    await store.setJSON(`events/${body.eventId}/invitation.json`, invitation);
    return json({ ok: true, eventId: body.eventId, publishedAt: invitation.publishedAt });
  } catch {
    return json({ error: "Gagal menyimpan undangan ke Blob Storage." }, 503);
  }
}
