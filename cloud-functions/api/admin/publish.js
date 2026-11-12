import { getStore } from "@edgeone/pages-blob";
import { json, readJson, safeText, validEventId } from "../../_lib/http.js";
import { requireOwner } from "../../_lib/auth.js";

const MEDIA_KINDS = ["cover", "hero", "groom", "bride", "child", "video", "opening-sfx", "background-music", ...Array.from({ length: 6 }, (_, i) => "gallery-" + (i + 1)), ...Array.from({ length: 3 }, (_, i) => "story-" + (i + 1))];
const cleanText = (value, max = 1500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const cleanContent = (input) => {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const family = {};
  if (source.family && typeof source.family === "object" && !Array.isArray(source.family)) {
    for (const [key, value] of Object.entries(source.family).slice(0, 20)) {
      if (/^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/.test(key)) family[key] = cleanText(value, 120);
    }
  }
  const bankAccounts = Array.isArray(source.bankAccounts) ? source.bankAccounts.slice(0, 2).map(account => ({
    bank: cleanText(account?.bank, 120),
    manualBank: cleanText(account?.manualBank, 120),
    holder: cleanText(account?.holder, 120),
    number: cleanText(account?.number, 40)
  })) : [];
  const stories = Array.isArray(source.stories) ? source.stories.slice(0, 3).map((story, index) => ({
    index: Number.isInteger(story?.index) && story.index >= 1 && story.index <= 3 ? story.index : index + 1,
    text: cleanText(story?.text, 1500)
  })) : [];
  const featuredCount = Number.isInteger(source.featuredCount) ? Math.min(6, Math.max(0, source.featuredCount)) : 0;
  const categoryData = {};
  if (source.categoryData && typeof source.categoryData === "object" && !Array.isArray(source.categoryData)) {
    for (const [category, entry] of Object.entries(source.categoryData).slice(0, 25)) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const entryFamily = {};
      if (entry.family && typeof entry.family === "object" && !Array.isArray(entry.family)) {
        for (const [key, value] of Object.entries(entry.family).slice(0, 20)) {
          if (/^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/.test(key)) entryFamily[key] = cleanText(value, 120);
        }
      }
      categoryData[cleanText(category, 80)] = {
        family: entryFamily,
        personOne: cleanText(entry.personOne, 120),
        personTwo: cleanText(entry.personTwo, 120),
        stories: Array.isArray(entry.stories) ? entry.stories.slice(0, 3).map((story, index) => ({ index: index + 1, text: cleanText(story?.text, 1500) })) : [],
        bankAccounts: Array.isArray(entry.bankAccounts) ? entry.bankAccounts.slice(0, 2).map(account => ({ bank: cleanText(account?.bank, 120), manualBank: cleanText(account?.manualBank, 120), holder: cleanText(account?.holder, 120), number: cleanText(account?.number, 40) })) : [],
        featuredCount: Number.isInteger(entry.featuredCount) ? Math.min(6, Math.max(0, entry.featuredCount)) : 0,
        mapUrl: cleanText(entry.mapUrl, 1000),
        storyEnabled: entry.storyEnabled !== false
      };
    }
  }
  const socials = { whatsapp: cleanText(source.socials?.whatsapp, 100), tiktok: cleanText(source.socials?.tiktok, 100), instagram: cleanText(source.socials?.instagram, 100) };
  for (const [key, entry] of Object.entries(categoryData)) {
    entry.locationLandmark = cleanText(source.categoryData?.[key]?.locationLandmark, 300);
    entry.promoUrl = cleanText(source.categoryData?.[key]?.promoUrl, 1000);
    entry.socials = { whatsapp: cleanText(source.categoryData?.[key]?.socials?.whatsapp, 100), tiktok: cleanText(source.categoryData?.[key]?.socials?.tiktok, 100), instagram: cleanText(source.categoryData?.[key]?.socials?.instagram, 100) };
  }
  const allowedTimeZones = new Set(["Asia/Jakarta","Asia/Makassar","Asia/Jayapura"]);
  const timeZone = allowedTimeZones.has(source.timeZone) ? source.timeZone : "Asia/Jakarta";
  for (const [key, entry] of Object.entries(categoryData)) entry.timeZone = allowedTimeZones.has(source.categoryData?.[key]?.timeZone) ? source.categoryData[key].timeZone : timeZone;
  return { family, bankAccounts, stories, storyEnabled: source.storyEnabled !== false, featuredCount, mapUrl: cleanText(source.mapUrl, 1000), locationLandmark: cleanText(source.locationLandmark, 300), promoUrl: cleanText(source.promoUrl, 1000), socials, timeZone, categoryData };
};
const validMediaKey = (key, eventId, kind) => typeof key === "string" &&
  key.startsWith(`events/${eventId}/media/${kind}-`) &&
  /^events\/[a-z0-9][a-z0-9-]{2,63}\/media\/[a-z0-9-]+\.(jpg|jpeg|png|webp|mp4|webm|mp3|m4a|aac|ogg|wav|weba)$/.test(key);

export async function onRequestPost({ request }) {
  const body = await readJson(request);
  if (!body || !validEventId(body.eventId) || !body.invitation || typeof body.invitation !== "object") {
    return json({ error: "Data publikasi tidak lengkap atau eventId tidak valid." }, 400);
  }
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const eventId = body.eventId;
  const mediaInput = body.media || {};
  const media = {};
  for (const kind of MEDIA_KINDS) {
    const key = mediaInput[kind];
    if (key) {
      if (!validMediaKey(key, eventId, kind)) return json({ error: "Referensi media " + kind + " tidak valid." }, 400);
      media[kind] = key;
    }
  }
  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, { type: "json", consistency: "strong" });
    if (!meta) return json({ error: "Acara tidak ditemukan." }, 404);
    if (meta.status === "archived") return json({ error: "Aktifkan acara sebelum menerbitkan undangan." }, 403);
    const previous = await store.get(`events/${eventId}/invitation.json`, { type: "json", consistency: "strong" }).catch(() => null);
    const finalMedia = {};
    for (const kind of MEDIA_KINDS) {
      const key = media[kind] || previous?.media?.[kind] || null;
      if (!key) { finalMedia[kind] = null; continue; }
      if (!validMediaKey(key, eventId, kind)) return json({ error: "Media tersimpan tidak valid." }, 400);
      const ext = key.split(".").pop();
      const isVideo = kind === "video", isAudio = kind === "opening-sfx" || kind === "background-music";
      if (isVideo ? !["mp4", "webm"].includes(ext) : isAudio ? !["mp3", "m4a", "aac", "ogg", "wav", "weba"].includes(ext) : !["jpg", "jpeg", "png", "webp"].includes(ext)) {
        return json({ error: "Ekstensi file tidak sesuai jenis media." }, 400);
      }
      const uploaded = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
      if (!uploaded) return json({ error: "File " + kind + " belum selesai diunggah." }, 400);
      const max = isVideo ? 25 * 1024 * 1024 : isAudio ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
      if (uploaded.byteLength > max) return json({ error: "Ukuran file " + kind + " melebihi batas." }, 413);
      finalMedia[kind] = key;
    }
    const inv = body.invitation;
    const invitation = {
      eventId,
      title: safeText(inv.title, 100),
      theme: safeText(inv.theme, 40),
      category: meta.category || null,
      religion: meta.religion || null,
      personOne: safeText(inv.personOne, 100),
      personTwo: safeText(inv.personTwo, 100),
      opening: safeText(inv.opening, 500),
      date: safeText(inv.date, 40),
      akadDate: safeText(inv.akadDate, 40),
      receptionDate: safeText(inv.receptionDate, 40),
      location: safeText(inv.location, 250),
      closing: safeText(inv.closing, 2000),
      mediaUrl: safeText(inv.mediaUrl, 500),
      content: cleanContent(body.content),
      media: finalMedia,
      publishedAt: new Date().toISOString(),
      status: "published"
    };
    if (!invitation.title) return json({ error: "Nama acara wajib diisi." }, 400);
    if (invitation.mediaUrl) {
      try {
        const mediaLink = new URL(invitation.mediaUrl);
        if (!["http:", "https:"].includes(mediaLink.protocol)) throw new Error();
      } catch { return json({ error: "URL musik atau video harus menggunakan tautan HTTP/HTTPS yang valid." }, 400); }
    }
    if (invitation.content.mapUrl) {
      try {
        const map = new URL(invitation.content.mapUrl);
        if (!["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"].includes(map.hostname)) throw new Error();
      } catch { return json({ error: "URL Google Maps tidak valid." }, 400); }
    }
    await store.setJSON(`events/${eventId}/invitation.json`, invitation);
    return json({ ok: true, eventId, publishedAt: invitation.publishedAt });
  } catch {
    return json({ error: "Gagal memverifikasi media atau menyimpan undangan ke Blob Storage." }, 503);
  }
}
