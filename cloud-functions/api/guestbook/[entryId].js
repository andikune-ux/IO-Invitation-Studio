import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../_lib/http.js";
import { requireEventAdmin } from "../../_lib/auth.js";

const STORE = "io-invitation-media";
const validEntryId = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function onRequestPatch({ request, params }) {
  const entryId = params?.entryId;
  const body = await readJson(request) || {};
  const eventId = body.eventId || "";
  if (!validEventId(eventId) || !validEntryId(entryId)) return json({ error: "ID acara atau komentar tidak valid." }, 400);
  const auth = await requireEventAdmin(request, eventId);
  if (!auth.ok) return auth.response;
  const action = body.action || "reply";
  if (!["reply", "delete-reply"].includes(action)) return json({ error: "Aksi balasan tidak valid." }, 400);
  const db = getStore(STORE), key = `events/${eventId}/guestbook/${entryId}.json`;
  try {
    const entry = await db.get(key, { type: "json", consistency: "strong" });
    if (!entry || entry.eventId !== eventId) return json({ error: "Komentar tamu tidak ditemukan." }, 404);
    if (action === "delete-reply") {
      delete entry.reply;
      delete entry.repliedAt;
      delete entry.repliedBy;
    } else {
      const reply = safeText(body.reply, 1000);
      if (!reply) return json({ error: "Balasan tidak boleh kosong." }, 400);
      entry.reply = reply;
      entry.repliedAt = new Date().toISOString();
      entry.repliedBy = "Admin acara";
    }
    entry.updatedAt = new Date().toISOString();
    await db.setJSON(key, entry);
    return json({ ok: true, entry: { id: entry.id, name: entry.name, reply: entry.reply || null, repliedAt: entry.repliedAt || null } });
  } catch {
    return json({ error: "Balasan gagal disimpan. Silakan coba lagi." }, 503);
  }
}
