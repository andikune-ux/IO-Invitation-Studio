import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../../../_lib/http.js";
import { requireOwner } from "../../../../_lib/auth.js";

const clean = (value, depth = 0) => {
  if (depth > 5) return null;
  if (typeof value === "string") return value.slice(0, 4000);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 30).map(item => clean(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([key, item]) => [
      String(key).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60),
      clean(item, depth + 1)
    ]));
  }
  return null;
};

export async function onRequestGet({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    const draft = await store.get(`events/${eventId}/draft.json`, { type: "json", consistency: "strong" });
    return json({ ok: true, draft: draft || null });
  } catch {
    return json({ error: "Gagal membaca draft acara." }, 503);
  }
}

export async function onRequestPut({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "Data draft tidak valid." }, 400);
  const store = getStore("io-invitation-media");
  try {
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    if (meta.status === "archived") return json({ error: "Aktifkan acara sebelum mengubah draft." }, 403);
    const draft = {
      eventId,
      category: meta.category || null,
      title: safeText(body.title, 100),
      theme: safeText(body.theme, 40),
      personOne: safeText(body.personOne, 100),
      personTwo: safeText(body.personTwo, 100),
      opening: safeText(body.opening, 500),
      date: safeText(body.date, 40),
      akadDate: safeText(body.akadDate, 40),
      receptionDate: safeText(body.receptionDate, 40),
      location: safeText(body.location, 250),
      closing: safeText(body.closing, 2000),
      mediaUrl: safeText(body.mediaUrl, 500),
      content: clean(body.content || {}),
      media: clean(body.media || {}),
      updatedAt: new Date().toISOString()
    };
    if (!draft.title) return json({ error: "Nama acara wajib diisi." }, 400);
    await store.setJSON(`events/${eventId}/draft.json`, draft);
    return json({ ok: true, draft });
  } catch {
    return json({ error: "Gagal menyimpan draft ke Blob Storage." }, 503);
  }
}
