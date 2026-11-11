import { getStore } from "@edgeone/pages-blob";
import { randomBytes, createHash } from "node:crypto";
import { json, readJson, validEventId } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

const STORE = "io-invitation-media";
const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function onRequestPost({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  const eventId = body?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  try {
    const db = getStore(STORE);
    const meta = await db.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    const token = randomBytes(32).toString("base64url");
    const now = new Date().toISOString();
    await db.setJSON(`auth/admin-links/${eventId}.json`, {
      eventId, tokenHash: digest(token), revoked: false, createdAt: now, rotatedAt: now
    });
    return json({ ok: true, eventId, token, createdAt: now }, 201);
  } catch {
    return json({ error: "Gagal membuat tautan Admin." }, 503);
  }
}
