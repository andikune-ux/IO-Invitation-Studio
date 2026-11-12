import { getStore } from "@edgeone/pages-blob";
import { json } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";
import { getGuestAccessExpiry } from "../../_lib/guest-expiry.js";

const STORE_NAME = "io-invitation-media";

export async function onRequestGet({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  try {
    const store = getStore(STORE_NAME);
    const { blobs } = await store.list({ prefix: "events/", consistency: "strong" });
    const ids = [...new Set(blobs.map(({ key }) => key.match(/^events\/([a-z0-9-]+)\/meta\.json$/)?.[1]).filter(Boolean))];
    const events = await Promise.all(ids.map(async (eventId) => {
      const [meta, admin, adminLink, invitation] = await Promise.all([
        store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" }),
        store.get(`auth/admins/${eventId}.json`, { type: "json", consistency: "strong" }),
        store.get(`auth/admin-links/${eventId}.json`, { type: "json", consistency: "strong" }),
        store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" })
      ]);
      if (!meta) return null;
      return {
        eventId,
        title: meta.title || eventId,
        category: meta.category || null,
        religion: meta.religion || null,
        status: meta.status || "draft",
        createdAt: meta.createdAt || null,
        updatedAt: meta.updatedAt || null,
        published: invitation?.status === "published",
        publishedAt: invitation?.publishedAt || null,
        guestAccess: (() => {
          const expiry = getGuestAccessExpiry(invitation || {}, meta);
          const now = Date.now();
          const status = invitation?.status !== "published" ? "not_published" : !expiry ? "date_missing" : Date.parse(expiry.expiresAt) <= now ? "expired" : "active";
          const reason = status === "not_published" ? "Undangan belum dipublikasikan." : status === "date_missing" ? "Tanggal acara belum tersedia; masa aktif otomatis belum dapat dihitung." : status === "expired" ? "Masa aktif berakhir satu bulan kalender setelah tanggal acara." : null;
          return { status, expiresAt: expiry?.expiresAt || null, eventDate: expiry?.eventDate || null, source: expiry?.source || null, reason, evaluatedAt: new Date(now).toISOString() };
        })(),
        admin: admin ? { legacy: true, username: admin.username, displayName: admin.displayName, disabled: Boolean(admin.disabled) } : null,
        adminLink: adminLink ? { revoked: Boolean(adminLink.revoked), active: !adminLink.revoked && (!adminLink.expiresAt || (Number.isFinite(Date.parse(adminLink.expiresAt)) && Date.parse(adminLink.expiresAt) > Date.now())), expired: Boolean(adminLink.expiresAt && (!Number.isFinite(Date.parse(adminLink.expiresAt)) || Date.parse(adminLink.expiresAt) <= Date.now())), durationMonths: adminLink.durationMonths || null, expiresAt: adminLink.expiresAt || null, createdAt: adminLink.createdAt || null } : null
      };
    }));
    events.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
    return json({ ok: true, events: events.filter(Boolean) });
  } catch {
    return json({ error: "Gagal membaca daftar acara dari Blob Storage." }, 503);
  }
}
