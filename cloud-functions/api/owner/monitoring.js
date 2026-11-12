import { getStore } from "@edgeone/pages-blob";
import { json } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

export async function onRequestGet({ request }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  try {
    const store = getStore("io-invitation-media");
    const { blobs = [] } = await store.list({ prefix: "monitoring/errors/", consistency: "strong" });
    const latest = blobs.slice().sort((a, b) => String(b.key).localeCompare(String(a.key))).slice(0, 50);
    const logs = await Promise.all(latest.map(({ key }) => store.get(key, { type: "json", consistency: "strong" }).catch(() => null)));
    return json({ ok: true, logs: logs.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  } catch {
    return json({ error: "Log operasional belum dapat dibaca." }, 503);
  }
}
