import { randomUUID } from "node:crypto";
import { getStore } from "@edgeone/pages-blob";
import { json, readJson, requireAdmin, validEventId } from "../../_lib/http.js";

const TYPES = {
  "image/jpeg": { ext: "jpg", max: 8 * 1024 * 1024 },
  "image/png": { ext: "png", max: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", max: 8 * 1024 * 1024 },
  "video/mp4": { ext: "mp4", max: 25 * 1024 * 1024 },
  "video/webm": { ext: "webm", max: 25 * 1024 * 1024 }
};

export async function onRequestPost({ request, env }) {
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const body = await readJson(request);
  if (!body || !validEventId(body.eventId)) return json({ error: "eventId tidak valid." }, 400);
  const type = TYPES[body.contentType];
  if (!type) return json({ error: "Format file tidak didukung." }, 415);
  if (!Number.isInteger(body.size) || body.size < 1 || body.size > type.max) {
    return json({ error: `Ukuran file melewati batas ${Math.floor(type.max / 1024 / 1024)} MB.` }, 413);
  }
  const kind = body.kind === "video" ? "video" : body.kind === "cover" ? "cover" : null;
  if (!kind || (kind === "cover" && !body.contentType.startsWith("image/")) || (kind === "video" && !body.contentType.startsWith("video/"))) {
    return json({ error: "Jenis media tidak sesuai." }, 400);
  }
  const key = `events/${body.eventId}/media/${kind}-${randomUUID()}.${type.ext}`;
  try {
    const store = getStore("io-invitation-media");
    const signed = await store.createUploadUrl(key, { expireSeconds: 300, contentType: body.contentType });
    return json({ uploadUrl: signed.url, key, expiresAt: signed.expiresAt, contentType: body.contentType });
  } catch {
    return json({ error: "Storage Blob belum tersedia pada deployment ini." }, 503);
  }
}
