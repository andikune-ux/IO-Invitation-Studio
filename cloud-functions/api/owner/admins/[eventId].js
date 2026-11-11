import { getStore } from "@edgeone/pages-blob";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { json, readJson, validEventId } from "../../../_lib/http.js";
import { requireOwner } from "../../../_lib/auth.js";

const scrypt = promisify(scryptCallback);

async function revokeEventSessions(store, eventId) {
  const { blobs } = await store.list({ prefix: "auth/sessions/", consistency: "strong" });
  await Promise.all(blobs.map(async ({ key }) => {
    const session = await store.get(key, { type: "json", consistency: "strong" }).catch(() => null);
    if (session?.role === "admin" && session.eventId === eventId) await store.delete(key);
  }));
}

export async function onRequestPatch({ request, params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = params?.eventId;
  if (!validEventId(eventId)) return json({ error: "ID acara tidak valid." }, 400);
  const body = await readJson(request);
  if (!body || (typeof body.disabled !== "boolean" && body.password === undefined)) {
    return json({ error: "Kirim status disabled atau password baru." }, 400);
  }
  if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256)) {
    return json({ error: "Password baru wajib 12–256 karakter." }, 400);
  }
  const store = getStore("io-invitation-media");
  try {
    const key = `auth/admins/${eventId}.json`;
    const account = await store.get(key, { type: "json", consistency: "strong" });
    if (!account) return json({ error: "Akun Admin tidak ditemukan." }, 404);
    if (typeof body.disabled === "boolean") account.disabled = body.disabled;
    if (body.password !== undefined) {
      account.salt = randomBytes(16).toString("hex");
      account.passwordHash = (await scrypt(body.password, account.salt, 64)).toString("hex");
      account.passwordChangedAt = new Date().toISOString();
    }
    await store.setJSON(key, account);
    if (body.disabled === true || body.password !== undefined) await revokeEventSessions(store, eventId);
    return json({ ok: true, admin: { eventId, username: account.username, displayName: account.displayName, disabled: Boolean(account.disabled) } });
  } catch {
    return json({ error: "Gagal memperbarui akun Admin." }, 503);
  }
}
