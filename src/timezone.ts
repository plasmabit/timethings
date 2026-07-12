import {
	formatDateTime,
	normalizeClockFormat,
} from "./shared/lib/datetime/format-tokens";
import { Temporal, type ZonedDateTime } from "./shared/lib/datetime/temporal";

export function listTimeZones(): string[] {
	return Intl.supportedValuesOf("timeZone");
}

export function isValidTimeZone(tz: string): boolean {
	if (!tz) return false;
	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

export function nowInTimezone(timeZone: string): ZonedDateTime {
	const tz = isValidTimeZone(timeZone) ? timeZone : Temporal.Now.timeZoneId();
	return Temporal.Now.zonedDateTimeISO(tz);
}

export function formatWithTimezone(
	formatTokens: string,
	timeZone: string,
	date?: Date,
): string {
	const tz = isValidTimeZone(timeZone) ? timeZone : Temporal.Now.timeZoneId();
	const zdt = date
		? Temporal.Instant.fromEpochMilliseconds(
				date.getTime(),
			).toZonedDateTimeISO(tz)
		: Temporal.Now.zonedDateTimeISO(tz);
	return formatDateTime(zdt, normalizeClockFormat(formatTokens));
}
