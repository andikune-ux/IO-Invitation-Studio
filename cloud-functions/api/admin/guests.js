import { getStore } from "@edgeone/pages-blob";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { json, readJson, safeText, validEventId } from "../../_lib/http.js";
import { requireEventAdmin } from "../../_lib/auth.js";

const STORE = "io-invitation-media";
const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") || "";
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const auth = await requireEventAdmin(request, eventId);
  if (!auth.ok) return auth.response;
  try {
    const db = getStore(STORE);
    const { blobs = [] } = await db.list({ prefix: `events/${eventId}/guests/`, consistency: "strong" });
    const guests = await Promise.all(blobs.map(async ({ key }) => {
      const guest = await db.get(key, { type: "json", consistency: "strong" });
      if (!guest) return null;
      return { guestId: guest.guestId, name: guest.name, createdAt: guest.createdAt, rsvp: guest.rsvp || "pending" };
    }));
    return json({ ok: true, guests: guests.filter(Boolean) });
  } catch { return json({ error: "Gagal membaca daftar tamu." }, 503); }
}

export async function onRequestPost({ request }) {
  const body = await readJson(request);
  const eventId = body?.eventId;
  const name = safeText(body?.name, 100);
  if (!validEventId(eventId) || !name) return json({ error: "ID acara dan nama tamu wajib diisi." }, 400);
  const auth = await requireEventAdmin(request, eventId);
  if (!auth.ok) return auth.response;
  try {
    const db = getStore(STORE);
    const guestId = randomUUID();
    const token = randomBytes(24).toString("base64url");
    const createdAt = new Date().toISOString();
    await db.setJSON(`events/${eventId}/guests/${guestId}.json`, {
      guestId, eventId, name, tokenHash: digest(token), rsvp: "pending", createdAt
    });
    return json({ ok: true, guest: { guestId, name, createdAt, rsvp: "pending" }, token }, 201);
  } catch { return json({ error: "Gagal menyimpan tamu." }, 503); }
}
