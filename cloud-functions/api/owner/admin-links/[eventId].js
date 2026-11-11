import { getStore } from "@edgeone/pages-blob";
import { randomBytes, createHash } from "node:crypto";
import { json, readJson, validEventId } from "../../../_lib/http.js";
import { requireOwner } from "../../../_lib/auth.js";

const STORE = "io-invitation-media";
const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function onRequestPatch({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!["rotate", "revoke"].includes(body?.action)) return json({ error: "Aksi harus rotate atau revoke." }, 400);
  try {
    const db = getStore(STORE);
    const key = `auth/admin-links/${eventId}.json`;
    const current = await db.get(key, { type: "json", consistency: "strong" });
    if (!current) return json({ error: "Tautan Admin belum dibuat." }, 404);
    if (body.action === "revoke") {
      current.revoked = true;
      current.revokedAt = new Date().toISOString();
      await db.setJSON(key, current);
      return json({ ok: true, revoked: true });
    }
    const token = randomBytes(32).toString("base64url");
    const now = new Date().toISOString();
    await db.setJSON(key, { eventId, tokenHash: digest(token), revoked: false, createdAt: current.createdAt || now, rotatedAt: now });
    return json({ ok: true, eventId, token, rotatedAt: now });
  } catch {
    return json({ error: "Gagal memperbarui tautan Admin." }, 503);
  }
}
