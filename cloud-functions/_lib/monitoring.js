import { getStore } from "@edgeone/pages-blob";

const STORE = "io-invitation-media";
const safe = (value, max = 240) => String(value || "").replace(/[\r\n\t]/g, " ").replace(/Bearer\s+\S+/gi, "[redacted]").slice(0, max);

export async function recordOperationalError(request, endpoint, error, status = 500) {
  try {
    const store = getStore(STORE);
    const id = globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(16).slice(2));
    const requestId = safe(request?.headers?.get("x-request-id") || request?.headers?.get("cf-ray") || id, 100);
    const record = {
      id,
      requestId,
      endpoint: safe(endpoint, 120),
      status: Number.isInteger(status) ? status : 500,
      message: safe(error?.message || error || "Unknown operational error"),
      createdAt: new Date().toISOString()
    };
    await store.setJSON("monitoring/errors/" + Date.now() + "-" + id + ".json", record);
    const { blobs = [] } = await store.list({ prefix: "monitoring/errors/", consistency: "strong" });
    const obsolete = blobs.slice().sort((a, b) => String(a.key).localeCompare(String(b.key))).slice(0, Math.max(0, blobs.length - 100));
    await Promise.all(obsolete.map(({ key }) => store.delete(key).catch(() => {})));
  } catch {
    // Monitoring must never turn a handled application error into a second failure.
  }
}
