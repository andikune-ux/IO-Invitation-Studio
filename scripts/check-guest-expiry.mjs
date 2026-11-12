import assert from "node:assert/strict";
import { extendGuestAccess, getGuestAccessExpiry, isGuestAccessExpired } from "../cloud-functions/_lib/guest-expiry.js";

const november = getGuestAccessExpiry({ date: "2026-11-12" });
assert.equal(november.expiresAt, "2026-12-11T17:00:00.000Z", "H+1 bulan harus jatuh pada tengah malam WIB tanggal 12 Desember");
assert.equal(november.eventDate, "2026-11-12");
assert.equal(getGuestAccessExpiry({ akadDate: "2026-01-31T10:00:00+07:00" }).expiresAt, "2026-02-27T17:00:00.000Z", "Tanggal akhir bulan harus dijepit ke hari terakhir bulan berikutnya");
assert.equal(getGuestAccessExpiry({ akadDate: "invalid", date: "2026-11-12" }).eventDate, "2026-11-12", "Tanggal utama invalid harus memakai fallback");
assert.equal(getGuestAccessExpiry({}).expiresAt, undefined, "Tanpa tanggal acara, sistem tidak boleh menebak tanggal kedaluwarsa");
assert.equal(isGuestAccessExpired({ date: "2026-11-12" }, {}, Date.parse("2026-12-12T00:00:00+07:00")), true);
assert.equal(isGuestAccessExpired({ date: "2026-11-12" }, {}, Date.parse("2026-12-11T23:59:59+07:00")), false);
const extended = extendGuestAccess({}, { date: "2026-11-12" }, 1, Date.parse("2026-12-15T10:00:00+07:00"));
assert.equal(extended, "2027-01-14T17:00:00.000Z", "Perpanjangan setelah kedaluwarsa dihitung dari waktu sekarang");
const override = getGuestAccessExpiry({ date: "2026-11-12" }, { guestAccessExpiresAt: "2027-02-01T17:00:00.000Z" });
assert.equal(override.source, "owner_extension", "Tanggal perpanjangan Owner harus mengesampingkan tanggal otomatis");
console.log("Guest expiry checks passed.");
