import { describe, expect, it } from "vitest";
import {
	Temporal,
	clockEmoji,
	formatClock,
	formatDateTime,
	formatDurationHoursMinutes,
	formatDurationTemplate,
	parseDateTimeStrict,
	normalizeClockFormat,
} from "../src/shared/lib/datetime";

const known = Temporal.ZonedDateTime.from("2024-01-02T13:04:05.678+05:30[+05:30]");

describe("date-time format tokens", () => {
	it("formats every supported token", () => {
		expect(formatDateTime(known, "YYYY MM DD HH H hh h mm ss SSS A a Z [ok]")).toBe(
			"2024 01 02 13 13 01 1 04 05 678 PM pm +05:30 ok",
		);
	});

	it("round-trips the timestamp default", () => {
		const format = "YYYY-MM-DD[T]HH:mm:ss.SSSZ";
		const parsed = parseDateTimeStrict(formatDateTime(known, format), format);
		expect(parsed?.epochNanoseconds).toBe(known.epochNanoseconds);
	});

	it("round-trips the clock default on the current local date", () => {
		const local = Temporal.Now.zonedDateTimeISO().with({ hour: 9, minute: 5, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
		const parsed = parseDateTimeStrict(formatDateTime(local, "hh:mm A"), "hh:mm A");
		expect(parsed?.epochNanoseconds).toBe(local.epochNanoseconds);
	});

	it.each([
		["2024/01/02", "YYYY-MM-DD"],
		["9:05", "HH:mm"],
		["09:05x", "HH:mm"],
		["", "HH:mm"],
	])("strictly rejects %s", (text, format) => {
		expect(parseDateTimeStrict(text, format)).toBeUndefined();
	});

	it("parses and preserves an explicit offset", () => {
		const format = "YYYY-MM-DD[T]HH:mm:ss.SSSZ";
		const parsed = parseDateTimeStrict("2024-01-02T03:04:05.678+05:30", format);
		expect(parsed?.epochNanoseconds).toBe(
			Temporal.Instant.from("2024-01-01T21:34:05.678Z").epochNanoseconds,
		);
		expect(parsed && formatDateTime(parsed, format)).toBe("2024-01-02T03:04:05.678+05:30");
	});

	it("parses a no-offset timestamp as a local wall time", () => {
		const parsed = parseDateTimeStrict("2024-01-02 03:04", "YYYY-MM-DD HH:mm");
		const expected = Temporal.ZonedDateTime.from({
			timeZone: Temporal.Now.timeZoneId(), year: 2024, month: 1, day: 2, hour: 3, minute: 4,
		});
		expect(parsed?.epochNanoseconds).toBe(expected.epochNanoseconds);
	});
});

describe("clock compatibility", () => {
	it.each([[0, "🕛"], [1, "🕐"], [12, "🕛"], [13, "🕐"], [23, "🕚"]])(
		"formats hour %i", (hour, emoji) => {
			expect(clockEmoji(known.with({ hour }))).toBe(emoji);
		},
	);
	it("rewrites issue #23 clock formats only", () => {
		expect(normalizeClockFormat("HH:MM")).toBe("HH:mm");
		expect(normalizeClockFormat("hh:MM A")).toBe("hh:mm A");
		expect(normalizeClockFormat("YYYY-MM-DD")).toBe("YYYY-MM-DD");
		expect(formatClock(known, "HH:MM")).toBe("13:04");
	});
});

describe("duration formatting", () => {
	it.each([[3661, "1h 1m"], [59, "1m"], [0, "0m"], [7325, "2h 2m"]])(
		"formats %i seconds", (seconds, expected) => {
			expect(formatDurationHoursMinutes(seconds)).toBe(expected);
		},
	);

	it("formats status-bar duration templates", () => {
		expect(
			formatDurationTemplate(
				90_061,
				"{days}d {hoursPart}h {minutesPart}m {secondsPart}s / {minutes} minutes",
			),
		).toBe("1d 1h 1m 1s / 1501 minutes");
	});

	it("preserves the legacy less-than-one-minute display", () => {
		expect(formatDurationTemplate(42, "⌛ {minutes} m")).toBe("⌛ <1 m");
	});

	it("leaves unknown template tokens untouched", () => {
		expect(formatDurationTemplate(60, "{minutes} {unknown}")).toBe("1 {unknown}");
	});
});
