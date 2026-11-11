import { getStore } from "@edgeone/pages-blob";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { json, validEventId } from "./http.js";

const scrypt = promisify(scryptCallback);
const STORE_NAME = "io-invitation-media";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = "io_session";

const store = () => getStore(STORE_NAME);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
};
const cookieValue = (request, name) => {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ""; }
    }
  }
  return "";
};
const ALLOWED_ORIGINS = new Set([
  "https://io-invitation-studio.edgeone.dev"
]);

const originAllowed = (request) => {
  const originHeader = request.headers.get("Origin");
  if (!originHeader) return true;

  try {
    const origin = new URL(originHeader).origin;
    if (ALLOWED_ORIGINS.has(origin)) return true;

    const parsed = new URL(originHeader);
    const isLocal = parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    if (isLocal) return true;

    // Also accept exact same-origin requests in local/test deployments.
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
};
const sessionCookie = (token, maxAge = SESSION_TTL_SECONDS) =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const clearCookie = () => `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export const createSession = async (identity) => {
  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const session = { ...identity, createdAt: now, expiresAt: now + SESSION_TTL_SECONDS };
  await store().setJSON(`auth/sessions/${digest(token)}.json`, session);
  return { token, session };
};

export const getSession = async (request) => {
  const token = cookieValue(request, COOKIE_NAME);
  if (!token || token.length > 200) return null;
  const key = `auth/sessions/${digest(token)}.json`;
  const session = await store().get(key, { type: "json", consistency: "strong" });
  if (!session || !Number.isInteger(session.expiresAt) || session.expiresAt <= Math.floor(Date.now() / 1000)) {
    if (session) await store().delete(key).catch(() => {});
    return null;
  }
  return { ...session, sessionKey: key };
};

export const requireEventAdmin = async (request, eventId) => {
  if (!originAllowed(request)) return { ok: false, response: json({ error: "Origin tidak diizinkan." }, 403) };
  const session = await getSession(request);
  if (!session || session.role !== "admin" || session.eventId !== eventId) {
    return { ok: false, response: json({ error: "Sesi Admin tidak valid atau tidak memiliki akses ke acara ini." }, 401) };
  }
  const meta = await store().get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
  if (!meta || meta.status === "archived") {
    return { ok: false, response: json({ error: "Acara ini diarsipkan atau tidak tersedia untuk dikelola." }, 403) };
  }
  return { ok: true, session };
};

export const requireOwner = async (request) => {
  if (!originAllowed(request)) return { ok: false, response: json({ error: "Origin tidak diizinkan." }, 403) };
  const session = await getSession(request);
  if (!session || session.role !== "owner") {
    return { ok: false, response: json({ error: "Login Owner diperlukan." }, 401) };
  }
  return { ok: true, session };
};

export async function ownerLogin(request, env) {
  if (!originAllowed(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  const expected = env?.IO_ADMIN_API_TOKEN || "";
  const supplied = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected) return json({ error: "IO_ADMIN_API_TOKEN belum dikonfigurasi." }, 503);
  if (!safeEqual(supplied, expected)) return json({ error: "Kredensial Owner tidak valid." }, 401);
  const { token, session } = await createSession({ role: "owner", username: "owner" });
  return json({ ok: true, user: { role: session.role, username: session.username } }, 200, {
    "Set-Cookie": sessionCookie(token)
  });
}

export async function adminLogin(request, body) {
  if (!originAllowed(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  const { eventId, username, password } = body || {};
  if (!validEventId(eventId) || typeof username !== "string" || typeof password !== "string" || password.length > 256) {
    return json({ error: "ID acara, username, atau password tidak valid." }, 400);
  }
  const meta = await store().get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
  if (!meta || meta.status === "archived") return json({ error: "Acara ini diarsipkan atau tidak tersedia untuk login." }, 403);
  const account = await store().get(`auth/admins/${eventId}.json`, { type: "json", consistency: "strong" });
  if (!account || account.disabled || account.username !== username.trim().toLowerCase()) {
    return json({ error: "Username atau password tidak cocok." }, 401);
  }
  const derived = await scrypt(password, account.salt, 64);
  if (!safeEqual(derived.toString("hex"), account.passwordHash)) {
    return json({ error: "Username atau password tidak cocok." }, 401);
  }
  const { token, session } = await createSession({ role: "admin", eventId, username: account.username });
  return json({ ok: true, user: { role: session.role, eventId, username: session.username } }, 200, {
    "Set-Cookie": sessionCookie(token)
  });
}

export async function createEventAdmin(request, body) {
  if (!originAllowed(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const { eventId, eventTitle, username, password, displayName } = body || {};
  const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (!validEventId(eventId) || !normalizedUsername || !/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) {
    return json({ error: "ID acara atau username Admin tidak valid." }, 400);
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    return json({ error: "Password Admin wajib 12–256 karakter." }, 400);
  }
  const db = store();
  const accountKey = `auth/admins/${eventId}.json`;
  const existing = await db.get(accountKey, { type: "json", consistency: "strong" });
  if (existing) return json({ error: "Akun Admin untuk acara ini sudah ada." }, 409);
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await scrypt(password, salt, 64)).toString("hex");
  const now = new Date().toISOString();
  await db.setJSON(`events/${eventId}/meta.json`, {
    eventId,
    title: typeof eventTitle === "string" ? eventTitle.trim().slice(0, 100) : "",
    status: "draft",
    createdAt: now
  });
  await db.setJSON(accountKey, {
    eventId,
    username: normalizedUsername,
    displayName: typeof displayName === "string" ? displayName.trim().slice(0, 80) : normalizedUsername,
    salt,
    passwordHash,
    disabled: false,
    createdAt: now
  });
  return json({ ok: true, eventId, username: normalizedUsername, message: "Akun Admin berhasil dibuat." }, 201);
}

export async function sessionInfo(request) {
  const session = await getSession(request);
  if (!session) return json({ authenticated: false }, 200);
  return json({
    authenticated: true,
    user: { role: session.role, eventId: session.eventId || null, username: session.username }
  });
}

export async function logout(request) {
  const session = await getSession(request);
  if (session?.sessionKey) await store().delete(session.sessionKey).catch(() => {});
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}
