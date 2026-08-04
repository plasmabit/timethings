import { formatDateTime, normalizeClockFormat } from "./shared/lib/datetime/format-tokens";
import { Temporal, type ZonedDateTime } from "./shared/lib/datetime/temporal";
import { DEFAULT_MODIFIED_KEY_FORMAT } from "./shared/config";

const timeZoneValidity = new Map<string, boolean>();

export function listTimeZones(): string[] {
	return Intl.supportedValuesOf("timeZone");
}

export function isValidTimeZone(tz: string): boolean {
	if (!tz) return false;
	const cached = timeZoneValidity.get(tz);
	if (cached !== undefined) return cached;

	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		timeZoneValidity.set(tz, true);
		return true;
	} catch {
		timeZoneValidity.set(tz, false);
		return false;
	}
}

export function nowInTimezone(timeZone: string, useUtc = false, date = new Date()): ZonedDateTime {
	const tz = resolveTimeZone(timeZone, useUtc);
	return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(tz);
}

export function formatWithTimezone(
	formatTokens: string,
	timeZone: string,
	date?: Date,
	useUtc = false,
): string {
	const zdt = nowInTimezone(timeZone, useUtc, date);
	return formatDateTime(zdt, normalizeClockFormat(formatTokens));
}

export function formatFrontmatterTimestamp(
	zdt: ZonedDateTime,
	customFormat: string,
	useIso: boolean,
): string {
	return formatDateTime(zdt, useIso ? DEFAULT_MODIFIED_KEY_FORMAT : customFormat);
}

function resolveTimeZone(timeZone: string, useUtc: boolean): string {
	if (useUtc) return "UTC";
	return isValidTimeZone(timeZone) ? timeZone : Temporal.Now.timeZoneId();
}
