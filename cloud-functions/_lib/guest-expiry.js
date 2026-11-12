// Guest invitation access expiry is derived from the event date, independently
// from the Admin-link expiry. Calendar cut-off is midnight Asia/Jakarta (WIB).
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function eventCalendarDate(invitation = {}) {
  const candidates = [invitation.akadDate, invitation.date, invitation.receptionDate];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) continue;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day) {
      return { year, month, day, value: match[0] };
    }
  }
  return null;
}

function addCalendarMonths(year, month, day, count) {
  const index = year * 12 + (month - 1) + count;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index % 12 + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return { year: targetYear, month: targetMonth, day: Math.min(day, lastDay) };
}

function wibMidnight(date) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day) - WIB_OFFSET_MS).toISOString();
}

export function getGuestAccessExpiry(invitation = {}, meta = {}) {
  if (typeof meta.guestAccessExpiresAt === "string" && Number.isFinite(Date.parse(meta.guestAccessExpiresAt))) {
    return {
      expiresAt: new Date(meta.guestAccessExpiresAt).toISOString(),
      source: "owner_extension",
      eventDate: eventCalendarDate(invitation)?.value || null
    };
  }
  const eventDate = eventCalendarDate(invitation);
  if (!eventDate) return null;
  const expiryDate = addCalendarMonths(eventDate.year, eventDate.month, eventDate.day, 1);
  return { expiresAt: wibMidnight(expiryDate), source: "event_date", eventDate: eventDate.value };
}

export function isGuestAccessExpired(invitation = {}, meta = {}, now = Date.now()) {
  const expiry = getGuestAccessExpiry(invitation, meta);
  return Boolean(expiry && Date.parse(expiry.expiresAt) <= now);
}

export function extendGuestAccess(meta = {}, invitation = {}, months = 1, now = Date.now()) {
  const current = getGuestAccessExpiry(invitation, meta);
  const currentTime = current ? Date.parse(current.expiresAt) : NaN;
  const base = Number.isFinite(currentTime) && currentTime > now ? currentTime : now;
  const local = new Date(base + WIB_OFFSET_MS);
  const next = addCalendarMonths(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), months);
  return wibMidnight(next);
}
