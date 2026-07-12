import { describe, expect, it } from "vitest";
import {
	formatWithTimezone,
	isValidTimeZone,
	listTimeZones,
	nowInTimezone,
} from "../src/timezone";
import { Temporal } from "../src/shared/lib/datetime";

describe("listTimeZones", () => {
	it("returns a non-empty array of IANA timezone strings", () => {
		const zones = listTimeZones();
		expect(zones.length).toBeGreaterThan(0);
		expect(zones).toContain("America/New_York");
		expect(zones).toContain("Asia/Tokyo");
		expect(zones).toContain("Europe/London");
		expect(zones).toContain("Europe/Berlin");
		expect(zones).toContain("Asia/Tokyo"); // Japan
	});
});

describe("isValidTimeZone", () => {
	it.each([
		["UTC"],
		["America/New_York"],
		["Asia/Kolkata"],
		["Europe/London"],
	])("accepts valid timezone %s", (tz) => {
		expect(isValidTimeZone(tz)).toBe(true);
	});

	it.each([[""], ["Invalid/Zone"], ["not-a-timezone"], ["UTC+5"]])(
		"rejects invalid or empty value %s",
		(tz) => {
			expect(isValidTimeZone(tz)).toBe(false);
		},
	);
});

describe("nowInTimezone", () => {
	it("returns a ZonedDateTime in the requested timezone", () => {
		const zdt = nowInTimezone("UTC");
		expect(zdt.timeZoneId).toBe("UTC");
	});

	it("falls back to system timezone for empty string", () => {
		const system = Temporal.Now.timeZoneId();
		const zdt = nowInTimezone("");
		expect(zdt.timeZoneId).toBe(system);
	});

	it("falls back to system timezone for invalid timezone", () => {
		const system = Temporal.Now.timeZoneId();
		const zdt = nowInTimezone("Bad/Zone");
		expect(zdt.timeZoneId).toBe(system);
	});
});

describe("formatWithTimezone", () => {
	const epoch = new Date("2024-01-02T08:30:45.678Z");

	it("formats with UTC timezone", () => {
		const result = formatWithTimezone(
			"YYYY-MM-DD[T]HH:mm:ss.SSSZ",
			"UTC",
			epoch,
		);
		expect(result).toBe("2024-01-02T08:30:45.678+00:00");
	});

	it("formats in Asia/Kolkata (+05:30)", () => {
		const result = formatWithTimezone(
			"YYYY-MM-DD[T]HH:mm:ss.SSSZ",
			"Asia/Kolkata",
			epoch,
		);
		expect(result).toBe("2024-01-02T14:00:45.678+05:30");
	});

	it("formats in America/New_York (-05:00 in January)", () => {
		const result = formatWithTimezone(
			"YYYY-MM-DD[T]HH:mm:ss.SSSZ",
			"America/New_York",
			epoch,
		);
		expect(result).toBe("2024-01-02T03:30:45.678-05:00");
	});

	it("normalises clock format MM → mm", () => {
		const result = formatWithTimezone("HH:MM", "UTC", epoch);
		expect(result).toBe("08:30");
	});

	it("falls back to system timezone for empty string", () => {
		// Just verify it doesn't throw and returns a non-empty string
		const result = formatWithTimezone("HH:mm", "", epoch);
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("falls back to system timezone for invalid timezone", () => {
		const result = formatWithTimezone("HH:mm", "Not/Real", epoch);
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("formats the current time when date is omitted", () => {
		const result = formatWithTimezone("YYYY", "UTC");
		expect(result).toMatch(/^\d{4}$/);
	});

	it("renders the Z token as the selected zone's offset", () => {
		const result = formatWithTimezone("Z", "Asia/Kolkata", epoch);
		expect(result).toBe("+05:30");
	});
});
