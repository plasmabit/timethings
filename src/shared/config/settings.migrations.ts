import {
	DEFAULT_MODIFIED_KEY_FORMAT,
	DEFAULT_SETTINGS,
	normalizeUpdateInterval,
} from "./settings.defaults";
import type { TimeThingsSettings } from "./settings.types";

export interface SettingsMigrationResult {
	settings: TimeThingsSettings;
	didMigrate: boolean;
}

export function migrateSettings(raw: Partial<TimeThingsSettings> | null): SettingsMigrationResult {
	const settings: TimeThingsSettings = { ...DEFAULT_SETTINGS, ...raw };
	settings.updateIntervalMilliseconds = normalizeUpdateInterval(
		settings.updateIntervalMilliseconds,
	);
	settings.clockTimezone = normalizeTimeZoneSetting(settings.clockTimezone);
	settings.frontmatterTimezone = normalizeTimeZoneSetting(settings.frontmatterTimezone);

	if (raw === null) {
		return { settings, didMigrate: false };
	}

	let didMigrate = false;
	if (raw.timezoneSettingsMigrated !== true) {
		settings.clockUseUtc = raw.isUTC === true;
		settings.timezoneSettingsMigrated = true;
		didMigrate = true;
	}

	if (raw.frontmatterFormatMigrated !== true) {
		settings.frontmatterUseIso =
			typeof raw.frontmatterUseIso === "boolean"
				? raw.frontmatterUseIso
				: raw.modifiedKeyFormat === undefined ||
					raw.modifiedKeyFormat === DEFAULT_MODIFIED_KEY_FORMAT;
		settings.frontmatterFormatMigrated = true;
		didMigrate = true;
	}

	return { settings, didMigrate };
}

function normalizeTimeZoneSetting(value: unknown): string {
	return typeof value === "string" ? value : "";
}
