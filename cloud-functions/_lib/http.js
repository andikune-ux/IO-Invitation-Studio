export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export const readJson = async (request) => {
  try { return await request.json(); } catch { return null; }
};

export const validEventId = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,63}$/.test(value);

export const requireAdmin = (request, env) => {
  const expected = env?.IO_ADMIN_API_TOKEN;
  const supplied = request.headers.get("Authorization") || "";
  if (!expected) return { ok: false, status: 503, error: "Admin API belum dikonfigurasi: IO_ADMIN_API_TOKEN belum diatur." };
  if (supplied !== `Bearer ${expected}`) return { ok: false, status: 401, error: "Akses Admin tidak valid." };
  return { ok: true };
};

export const safeText = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
