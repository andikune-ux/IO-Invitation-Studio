import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || !validEventId(body.eventId) || !body.invitation || typeof body.invitation !== "object") {
    return json({ error: "Data publikasi tidak lengkap atau eventId tidak valid." }, 400);
  }
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const media = body.media || {};
  for (const kind of ["cover", "video"]) {
    const key = media[kind];
    if (key && (typeof key !== "string" || !key.startsWith(`events/${body.eventId}/media/`) || key.includes(".."))) {
      return json({ error: "Referensi media tidak valid." }, 400);
    }
  }
  try {
  const store = getStore("io-invitation-media");
  const meta = await store.get(`events/${body.eventId}/meta.json`, { type: "json", consistency: "strong" });
  if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
  if (meta.status === "archived") return json({ error: "Aktifkan acara sebelum menerbitkan undangan." }, 403);
  const previous = await store.get(`events/${body.eventId}/invitation.json`, { type: "json", consistency: "strong" }).catch(() => null);
  for (const [kind, max] of [["cover", 8 * 1024 * 1024], ["video", 25 * 1024 * 1024]]) {
    const key = media[kind];
    if (key) {
      const parts = key.slice(`events/${body.eventId}/media/${kind}-`.length).split(".");
      const extensions = kind === "cover" ? ["jpg", "png", "webp"] : ["mp4", "webm"];
      if (parts.length !== 2 || !/^[a-z0-9-]+$/.test(parts[0]) || !extensions.includes(parts[1])) return json({ error: "Jenis file media tidak sesuai." }, 400);
      const uploaded = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
      if (!uploaded) return json({ error: "File media belum selesai diunggah." }, 400);
      if (uploaded.byteLength > max) return json({ error: "Ukuran file aktual melebihi batas." }, 413);
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
    media: { cover: media.cover || previous?.media?.cover || null, video: media.video || previous?.media?.video || null },
    publishedAt: new Date().toISOString(),
    status: "published"
  };
  if (!invitation.title) return json({ error: "Nama acara wajib diisi." }, 400);
    await store.setJSON(`events/${body.eventId}/invitation.json`, invitation);
    return json({ ok: true, eventId: body.eventId, publishedAt: invitation.publishedAt });
  } catch {
    return json({ error: "Gagal memverifikasi media atau menyimpan undangan ke Blob Storage." }, 503);
  }
}
