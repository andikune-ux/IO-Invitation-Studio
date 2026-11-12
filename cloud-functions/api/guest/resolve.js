import { getStore } from "@edgeone/pages-blob";
import { createHash, timingSafeEqual } from "node:crypto";
import { json, validEventId } from "../../_lib/http.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a,b) => { const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&timingSafeEqual(x,y); };

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") || "";
  const guestId = url.searchParams.get("guestId") || "";
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "").trim();
  if (!validEventId(eventId) || !/^[0-9a-f-]{36}$/i.test(guestId) || (token && (token.length < 30 || token.length > 200))) {
    return json({ error: "Tautan tamu tidak valid." }, 400);
  }
  try {
    const db = getStore("io-invitation-media");
    const guest = await db.get(`events/${eventId}/guests/${guestId}.json`, { type: "json", consistency: "strong" });
    if (!guest || guest.linkActive === false) return json({ error: "Tautan tamu tidak valid, sudah dicabut, atau tidak tersedia." }, 404);
    if (guest.linkExpiresAt && Date.parse(guest.linkExpiresAt) <= Date.now()) {
      return json({ error: "Masa berlaku tautan undangan telah berakhir." }, 410);
    }
    // Legacy links continue to require and validate their original bearer token.
    // New links use the unguessable UUID guestId as their stable access identifier.
    if (guest.tokenHash && (!token || !equal(guest.tokenHash, digest(token)))) {
      return json({ error: "Token undangan tidak valid." }, 404);
    }
    if (!guest.tokenHash && token) {
      return json({ error: "Tautan undangan tidak valid." }, 404);
    }
    return json({ ok: true, guest: { guestId, name: guest.name } });
  } catch { return json({ error: "Data tamu belum tersedia." }, 503); }
}
