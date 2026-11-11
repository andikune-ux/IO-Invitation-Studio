import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../../_lib/http.js";
import { requireOwner } from "../../../_lib/auth.js";

export async function onRequestPatch({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!body || (body.title === undefined && body.status === undefined)) return json({ error: "Tidak ada perubahan yang dikirim." }, 400);
  const store = getStore("io-invitation-media");
  try {
    const key = `events/${eventId}/meta.json`;
    const meta = await store.get(key, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    if (body.title !== undefined) {
      const title = safeText(body.title, 100);
      if (!title) return json({ error: "Nama acara wajib diisi." }, 400);
      meta.title = title;
    }
    if (body.status !== undefined) {
      if (!["draft", "archived"].includes(body.status)) return json({ error: "Status hanya boleh draft atau archived." }, 400);
      meta.status = body.status;
    }
    meta.updatedAt = new Date().toISOString();
    await store.setJSON(key, meta);
    return json({ ok: true, event: { eventId, title: meta.title, status: meta.status, updatedAt: meta.updatedAt } });
  } catch {
    return json({ error: "Gagal memperbarui acara." }, 503);
  }
}
