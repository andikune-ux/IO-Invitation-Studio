import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../../_lib/http.js";
import { requireOwner } from "../../../_lib/auth.js";

export async function onRequestPatch({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!body || (body.title === undefined && body.status === undefined && body.category === undefined && body.religion === undefined)) return json({ error: "Tidak ada perubahan yang dikirim." }, 400);
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
    if (body.category !== undefined || body.religion !== undefined) {
      const allowedCategories = new Set(["Pernikahan","Lamaran","Pertunangan","Khitanan / Sunatan","Aqiqah","Kelahiran Bayi","Ulang Tahun","Wisuda","Kelulusan","Syukuran","Tasyakuran","Keagamaan","Spiritual","Pengajian","Peresmian","Gathering","Reuni","Seminar / Workshop","Konferensi","Acara Keluarga","Memorial / Peringatan","Lain-lain"]);
      const allowedReligions = new Set(["Islam","Kristen (Protestan)","Katolik","Hindu","Buddha","Konghucu","Kepercayaan terhadap Tuhan Yang Maha Esa","Spiritual / Non-denominasi","Lainnya","Tidak ingin mencantumkan"]);
      const religionCategories = new Set(["Pernikahan","Lamaran","Pertunangan","Keagamaan","Spiritual","Pengajian","Syukuran","Tasyakuran"]);
      const category = body.category !== undefined ? body.category : meta.category;
      const religion = body.religion !== undefined ? body.religion : meta.religion;
      if (!allowedCategories.has(category)) return json({ error: "Kategori acara tidak valid." }, 400);
      if (religion != null && religion !== "" && !allowedReligions.has(religion)) return json({ error: "Agama atau kepercayaan tidak valid." }, 400);
      meta.category = category;
      meta.religion = religionCategories.has(category) && religion ? religion : null;
    }
    if (body.status !== undefined) {
      if (!["draft", "archived"].includes(body.status)) return json({ error: "Status hanya boleh draft atau archived." }, 400);
      meta.status = body.status;
    }
    meta.updatedAt = new Date().toISOString();
    await store.setJSON(key, meta);
    return json({ ok: true, event: { eventId, title: meta.title, category: meta.category || null, religion: meta.religion || null, status: meta.status, updatedAt: meta.updatedAt } });
  } catch {
    return json({ error: "Gagal memperbarui acara." }, 503);
  }
}
