import { getStore } from "@edgeone/pages-blob";
import { recordOperationalError } from "../../_lib/monitoring.js";
import { json, readJson, validEventId } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

const STORE = "io-invitation-media";

export async function onRequestPost({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  const eventId = body?.eventId;
  const durationMonths = Number(body?.durationMonths ?? 12);
  if (![1, 3, 6, 9, 12].includes(durationMonths)) return json({ error: "Masa berlaku harus 1, 3, 6, 9, atau 12 bulan." }, 400);
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  try {
    const db = getStore(STORE);
    const meta = await db.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    const existing = await db.get(`auth/admin-links/${eventId}.json`, { type: "json", consistency: "strong" });
    if (existing && !existing.revoked && (!existing.expiresAt || (Number.isFinite(Date.parse(existing.expiresAt)) && Date.parse(existing.expiresAt) > Date.now()))) return json({ error: "Tautan Admin aktif sudah ada. Gunakan rotasi link." }, 409);
    const now = new Date();
    const day = now.getUTCDate(); now.setUTCDate(1); now.setUTCMonth(now.getUTCMonth() + durationMonths);
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate(); now.setUTCDate(Math.min(day, lastDay));
    const expiresAt = now.toISOString();
    const nowIso = new Date().toISOString();
    await db.setJSON(`auth/admin-links/${eventId}.json`, {
      eventId, revoked: false, durationMonths, createdAt: nowIso, updatedAt: nowIso, expiresAt
    });
    // Remove the legacy password account when its event is migrated to link access.
    await db.delete(`auth/admins/${eventId}.json`).catch(() => {});
    const { blobs = [] } = await db.list({ prefix: "auth/sessions/", consistency: "strong" }).catch(() => ({ blobs: [] }));
    await Promise.all(blobs.map(async ({ key }) => {
      const session = await db.get(key, { type: "json", consistency: "strong" }).catch(() => null);
      if (session?.role === "admin" && session.eventId === eventId) await db.delete(key).catch(() => {});
    }));
    return json({ ok: true, eventId, durationMonths, expiresAt, createdAt: nowIso }, 201);
  } catch (error) {
    await recordOperationalError(request, "/api/owner/admin-links POST", error, 503);
    return json({ error: "Gagal membuat tautan Admin." }, 503);
  }
}
