import { getStore } from "@edgeone/pages-blob";
import { json, readJson, validEventId } from "../../../_lib/http.js";
import { requireOwner } from "../../../_lib/auth.js";

const STORE = "io-invitation-media";

export async function onRequestPatch({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!["rotate", "revoke", "restore"].includes(body?.action)) return json({ error: "Aksi harus rotate, revoke, atau restore." }, 400);
  const durationMonths = Number(body?.durationMonths ?? 12);
  if (["rotate", "restore"].includes(body?.action) && ![1, 3, 6, 9, 12].includes(durationMonths)) return json({ error: "Masa berlaku harus 1, 3, 6, 9, atau 12 bulan." }, 400);
  try {
    const db = getStore(STORE);
    const key = `auth/admin-links/${eventId}.json`;
    const current = await db.get(key, { type: "json", consistency: "strong" });
    if (!current) return json({ error: "Tautan Admin belum dibuat." }, 404);
    if (body.action === "revoke") {
      current.revoked = true;
      current.revokedAt = new Date().toISOString();
      await db.setJSON(key, current);
      return json({ ok: true, revoked: true, revokedAt: current.revokedAt });
    }
    const now = new Date();
    const day = now.getUTCDate(); now.setUTCDate(1); now.setUTCMonth(now.getUTCMonth() + durationMonths);
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate(); now.setUTCDate(Math.min(day, lastDay));
    const expiresAt = now.toISOString();
    const rotatedAt = new Date().toISOString();
    await db.setJSON(key, { eventId, revoked: false, durationMonths, createdAt: current.createdAt || rotatedAt, rotatedAt, updatedAt: rotatedAt, expiresAt });
    return json({ ok: true, eventId, revoked: false, durationMonths, expiresAt, rotatedAt });
  } catch {
    return json({ error: "Gagal memperbarui tautan Admin." }, 503);
  }
}
