import { formatDateTime, normalizeClockFormat, parseDateTimeStrict } from "./format-tokens";
import { Temporal, type ZonedDateTime } from "./temporal";

const CLOCK_EMOJI_BY_HOUR: Record<number, string> = {
	1: "🕐",
	2: "🕑",
	3: "🕒",
	4: "🕓",
	5: "🕔",
	6: "🕕",
	7: "🕖",
	8: "🕗",
	9: "🕘",
	10: "🕙",
	11: "🕚",
	12: "🕛",
};

export function now(utc: boolean): ZonedDateTime {
	return Temporal.Now.zonedDateTimeISO(utc ? "UTC" : undefined);
}
export function formatClock(zdt: ZonedDateTime, format: string): string {
	return formatDateTime(zdt, normalizeClockFormat(format));
}
export function clockEmoji(zdt: ZonedDateTime): string {
	return CLOCK_EMOJI_BY_HOUR[zdt.hour % 12 || 12] ?? "⏰";
}
export function formatTimestamp(zdt: ZonedDateTime, format: string): string {
	return formatDateTime(zdt, format);
}
export { parseDateTimeStrict as parseTimestampStrict };
export function isWithinMinutes(
	past: ZonedDateTime,
	current: ZonedDateTime,
	minutes: number,
): boolean {
	return Temporal.ZonedDateTime.compare(past.add({ minutes }), current) > 0;
}
