import { getStore } from "@edgeone/pages-blob";
import { json } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

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
        status: meta.status || "draft",
        createdAt: meta.createdAt || null,
        updatedAt: meta.updatedAt || null,
        published: invitation?.status === "published",
        publishedAt: invitation?.publishedAt || null,
        admin: admin ? { legacy: true, username: admin.username, displayName: admin.displayName, disabled: Boolean(admin.disabled) } : null,
        adminLink: adminLink ? { active: !adminLink.revoked, createdAt: adminLink.createdAt || null } : null
      };
    }));
    events.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
    return json({ ok: true, events: events.filter(Boolean) });
  } catch {
    return json({ error: "Gagal membaca daftar acara dari Blob Storage." }, 503);
  }
}
