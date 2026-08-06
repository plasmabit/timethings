import type { TimeThingsSettings } from "./settings.types";

export const DEFAULT_MODIFIED_KEY_FORMAT = "YYYY-MM-DD[T]HH:mm:ss.SSSZ";
export const DEFAULT_EDIT_DURATION_STATUS_FORMAT = "⌛ {minutes} m";

export const DEFAULT_SETTINGS: TimeThingsSettings = {
	useCustomFrontmatterHandlingSolution: false,
	showEmojiStatusBar: true,
	clockFormat: "hh:mm A",
	updateIntervalMilliseconds: 1000,
	enableClock: true,
	isUTC: false,
	timezoneSettingsMigrated: true,
	clockUseUtc: false,
	clockTimezone: "",
	frontmatterUseUtc: false,
	frontmatterTimezone: "",
	modifiedKeyName: "updated_at",
	modifiedKeyFormat: DEFAULT_MODIFIED_KEY_FORMAT,
	frontmatterFormatMigrated: true,
	frontmatterUseIso: true,
	createMissingFrontmatterProperties: true,
	enableModifiedKeyUpdate: true,
	editDurationPath: "edited_seconds",
	enableEditDurationKey: true,
	showEditDurationStatusBar: true,
	editDurationStatusBarFormat: DEFAULT_EDIT_DURATION_STATUS_FORMAT,
	updateIntervalFrontmatterMinutes: 1,
	nonTypingEditingTimePercentage: 22,
	ignoredFolders: [],
	ignoredFiles: [],
};

export function normalizeUpdateInterval(value: unknown): number {
	const parsed = typeof value === "string" ? Number(value) : value;

	if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
		return DEFAULT_SETTINGS.updateIntervalMilliseconds;
	}

	return Math.max(100, Math.round(parsed));
}
