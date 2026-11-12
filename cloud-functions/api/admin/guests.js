import { getStore } from "@edgeone/pages-blob";
import { randomUUID } from "node:crypto";
import { json, readJson, safeText, validEventId } from "../../_lib/http.js";
import { requireEventAdmin } from "../../_lib/auth.js";

const STORE = "io-invitation-media";

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
      return {
        guestId: guest.guestId,
        name: guest.name,
        createdAt: guest.createdAt,
        rsvp: guest.rsvp || "pending",
        linkActive: guest.linkActive !== false,
        linkExpiresAt: guest.linkExpiresAt || null
      };
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
    const createdAt = new Date().toISOString();
    await db.setJSON(`events/${eventId}/guests/${guestId}.json`, {
      guestId, eventId, name, rsvp: "pending", linkActive: true, createdAt
    });
    // The random UUID guestId is the stable, high-entropy link identifier.
    // No rotating bearer token is needed for newly issued guest links.
    return json({ ok: true, guest: { guestId, name, createdAt, rsvp: "pending", linkActive: true } }, 201);
  } catch { return json({ error: "Gagal menyimpan tamu." }, 503); }
}
