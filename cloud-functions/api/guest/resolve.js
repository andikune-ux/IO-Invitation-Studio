import { getStore } from "@edgeone/pages-blob";
import { createHash, timingSafeEqual } from "node:crypto";
import { json, validEventId } from "../../_lib/http.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a,b) => { const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&timingSafeEqual(x,y); };

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") || "";
  const guestId = url.searchParams.get("guestId") || "";
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!validEventId(eventId) || !/^[0-9a-f-]{36}$/i.test(guestId) || token.length < 30 || token.length > 200) return json({ error: "Tautan tamu tidak valid." }, 400);
  try {
    const db = getStore("io-invitation-media");
    const guest = await db.get(`events/${eventId}/guests/${guestId}.json`, { type: "json", consistency: "strong" });
    if (!guest || !equal(guest.tokenHash, digest(token))) return json({ error: "Tautan tamu tidak valid atau sudah tidak tersedia." }, 404);
    return json({ ok: true, guest: { guestId, name: guest.name } });
  } catch { return json({ error: "Data tamu belum tersedia." }, 503); }
}
