export const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  }
});

export const readJson = async (request) => {
  try { return await request.json(); } catch { return null; }
};

export const validEventId = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,63}$/.test(value);

export const safeText = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
