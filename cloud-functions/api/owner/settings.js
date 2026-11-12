import { getStore } from "@edgeone/pages-blob";
import { json, readJson } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

const STORE = "io-invitation-media";
const KEY = "settings/owner-dashboard.json";
const DEFAULTS = { active: "#20a477", expired: "#d94c5c", pending: "#d59a36", archived: "#9299aa" };
const HEX = /^#[0-9a-fA-F]{6}$/;

export async function onRequestGet({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  try {
    const store = getStore(STORE);
    const settings = await store.get(KEY, { type: "json", consistency: "strong" }) || {};
    const statusColors = Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, HEX.test(settings.statusColors?.[key] || "") ? settings.statusColors[key] : value]));
    return json({ ok: true, settings: { statusColors } });
  } catch {
    return json({ error: "Pengaturan Owner tidak dapat dibaca." }, 503);
  }
}

export async function onRequestPut({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body || !body.statusColors || typeof body.statusColors !== "object" || Array.isArray(body.statusColors)) return json({ error: "Palet warna tidak valid." }, 400);
  const statusColors = {};
  for (const key of Object.keys(DEFAULTS)) {
    const value = body.statusColors[key];
    if (typeof value !== "string" || !HEX.test(value)) return json({ error: "Warna " + key + " harus berupa HEX enam digit." }, 400);
    statusColors[key] = value.toLowerCase();
  }
  try {
    const store = getStore(STORE);
    const settings = { statusColors, updatedAt: new Date().toISOString() };
    await store.setJSON(KEY, settings);
    return json({ ok: true, settings });
  } catch {
    return json({ error: "Pengaturan warna gagal disimpan." }, 503);
  }
}
