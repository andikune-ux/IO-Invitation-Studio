import { randomUUID } from "node:crypto";
import { getStore } from "@edgeone/pages-blob";
import { json, readJson, validEventId } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

const IMAGE_KINDS = new Set(["cover", "hero", "groom", "bride", "child", ...Array.from({ length: 6 }, (_, i) => "gallery-" + (i + 1)), ...Array.from({ length: 3 }, (_, i) => "story-" + (i + 1))]);
const AUDIO_KINDS = new Set(["opening-sfx", "background-music"]);
const TYPES = {
  "image/jpeg": { ext: "jpg", max: 8 * 1024 * 1024, kind: "image" },
  "image/png": { ext: "png", max: 8 * 1024 * 1024, kind: "image" },
  "image/webp": { ext: "webp", max: 8 * 1024 * 1024, kind: "image" },
  "video/mp4": { ext: "mp4", max: 25 * 1024 * 1024, kind: "video" },
  "video/webm": { ext: "webm", max: 25 * 1024 * 1024, kind: "video" },
  "audio/mpeg": { ext: "mp3", max: 15 * 1024 * 1024, kind: "audio" },
  "audio/mp4": { ext: "m4a", max: 15 * 1024 * 1024, kind: "audio" },
  "audio/aac": { ext: "aac", max: 15 * 1024 * 1024, kind: "audio" },
  "audio/ogg": { ext: "ogg", max: 15 * 1024 * 1024, kind: "audio" },
  "audio/wav": { ext: "wav", max: 15 * 1024 * 1024, kind: "audio" },
  "audio/webm": { ext: "webm", max: 15 * 1024 * 1024, kind: "audio" }
};

export async function onRequestPost({ request }) {
  const body = await readJson(request);
  if (!body || !validEventId(body.eventId)) return json({ error: "eventId tidak valid." }, 400);
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const type = TYPES[body.contentType];
  if (!type) return json({ error: "Format file tidak didukung." }, 415);
  if (!Number.isInteger(body.size) || body.size < 1 || body.size > type.max) {
    return json({ error: `Ukuran file melewati batas ${Math.floor(type.max / 1024 / 1024)} MB.` }, 413);
  }
  const kind = type.kind === "video" ? (body.kind === "video" ? "video" : null) : body.kind;
  if (type.kind === "image" && !IMAGE_KINDS.has(kind)) return json({ error: "Jenis foto tidak valid." }, 400);
  if (type.kind === "video" && kind !== "video") return json({ error: "Jenis media tidak sesuai." }, 400);
  if (type.kind === "audio" && !AUDIO_KINDS.has(kind)) return json({ error: "Jenis audio tidak valid." }, 400);
  const key = `events/${body.eventId}/media/${kind}-${randomUUID()}.${type.ext}`;
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${body.eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    if (meta.status === "archived") return json({ error: "Aktifkan acara sebelum mengunggah media." }, 403);
    const signed = await store.createUploadUrl(key, { expireSeconds: 300, contentType: body.contentType });
    return json({ uploadUrl: signed.url, key, expiresAt: signed.expiresAt, contentType: body.contentType });
  } catch {
    return json({ error: "Storage Blob belum tersedia pada deployment ini." }, 503);
  }
}
