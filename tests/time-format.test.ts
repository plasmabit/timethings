import { moment } from "obsidian";
import { describe, expect, it } from "vitest";
import {
	formatMomentAsClock,
	formatMomentAsClockEmoji,
	formatSeconds,
} from "../src/shared/lib/datetime";

describe("formatMomentAsClockEmoji", () => {
	it.each([
		[0, "🕛"],
		[1, "🕐"],
		[12, "🕛"],
		[13, "🕐"],
		[23, "🕚"],
	])("formats hour %i", (hour, emoji) => {
		expect(formatMomentAsClockEmoji(moment({ hour }))).toBe(emoji);
	});
});

describe("formatMomentAsClock", () => {
	const time = moment("2026-07-02T14:37:00");

	it("rewrites HH:MM to minutes for issue #23 compatibility", () => {
		// characterizes current behavior; see issue #23
		expect(formatMomentAsClock(time, "HH:MM")).toBe(time.format("HH:mm"));
	});

	it("rewrites hh:MM A to minutes", () => {
		expect(formatMomentAsClock(time, "hh:MM A")).toBe(time.format("hh:mm A"));
	});

	it.each(["YYYY-MM-DD", "mm:MM", "HH:mm"])("leaves %s unchanged", (format) => {
		expect(formatMomentAsClock(time, format)).toBe(time.format(format));
	});
});

describe("formatSeconds", () => {
	it("formats hours and minutes", () => {
		expect(formatSeconds(3661, "h[h] m[m]")).toBe("1h 1m");
	});

	it("pins durations below one minute", () => {
		expect(formatSeconds(59, "h[h] m[m]")).toBe("1m");
	});

	it("pins zero duration", () => {
		expect(formatSeconds(0, "h[h] m[m]")).toBe("0m");
	});
});

it("preserves the default locale after installing duration formatting", () => {
	expect(moment.locale()).toBe("en");
});
