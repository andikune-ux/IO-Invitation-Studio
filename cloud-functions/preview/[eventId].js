import { getStore } from "@edgeone/pages-blob";
import { validEventId } from "../_lib/http.js";

// Always generate public links from the canonical site origin.
// In the Makers Node runtime, request.url may contain an internal qcloudteo.com
// hostname; using it for redirects or Open Graph assets produces unusable URLs.
const PUBLIC_ORIGIN = "https://io-invitation-studio.edgeone.dev";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

export async function onRequestGet({ request, params }) {
  const eventId = params?.eventId;
  if (!validEventId(eventId)) {
    return new Response("Undangan tidak ditemukan.", { status: 404 });
  }

  try {
    const store = getStore("io-invitation-media");
    const meta = await store.get(`events/${eventId}/meta.json`, {
      type: "json",
      consistency: "strong"
    });
    if (!meta || meta.status === "archived") {
      return new Response("Undangan tidak tersedia.", { status: 404 });
    }

    const published = await store.get(`events/${eventId}/invitation.json`, {
      type: "json",
      consistency: "strong"
    });
    const draft = await store.get(`events/${eventId}/draft.json`, {
      type: "json",
      consistency: "strong"
    });
    const draftIsNewer = Boolean(
      draft && (
        !published?.publishedAt ||
        (draft.updatedAt && Date.parse(draft.updatedAt) > Date.parse(published.publishedAt))
      )
    );
    const data = draftIsNewer || published?.status !== "published" ? draft : published;
    if (!data || !data.title) {
      return new Response("Konten undangan belum disimpan Owner.", { status: 404 });
    }

    const incoming = new URL(request.url);
    const previewUrl = new URL(`/api/preview/${encodeURIComponent(eventId)}`, PUBLIC_ORIGIN);
    const targetUrl = new URL("/guest.html", PUBLIC_ORIGIN);

    // Preserve guest-specific query values. The invitation token is in the URL
    // fragment and is preserved by the client-side redirect below.
    for (const name of ["guestId", "to"]) {
      const value = incoming.searchParams.get(name);
      if (value) {
        previewUrl.searchParams.set(name, value);
        targetUrl.searchParams.set(name, value);
      }
    }

    const target = targetUrl.href;
    const imageKey = data.media?.hero || data.media?.cover;
    const image = imageKey
      ? new URL(`/api/media?key=${encodeURIComponent(imageKey)}`, PUBLIC_ORIGIN).href
      : "";
    const title = escapeHtml(data.title || "Undangan Digital");
    const description = escapeHtml(data.opening || "Anda diundang untuk menghadiri acara kami.");
    const imageTag = image
      ? `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:secure_url" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">`
      : "";

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(previewUrl.href)}">
${imageTag}
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${escapeHtml(previewUrl.href)}">
</head>
<body>
<p>Membuka undangan… <a href="${escapeHtml(target)}">Lanjutkan</a></p>
<script>location.replace(${JSON.stringify(target)} + location.hash)</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response("Undangan belum dapat dimuat.", { status: 503 });
  }
}
