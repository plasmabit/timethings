import type { TimeThingsSettings } from "./settings.types";

export const DEFAULT_SETTINGS: TimeThingsSettings = {
	useCustomFrontmatterHandlingSolution: false,
	showEmojiStatusBar: true,
	clockFormat: "hh:mm A",
	updateIntervalMilliseconds: 1000,
	enableClock: true,
	isUTC: false,
	clockTimezone: "",
	frontmatterTimezone: "",
	modifiedKeyName: "updated_at",
	modifiedKeyFormat: "YYYY-MM-DD[T]HH:mm:ss.SSSZ",
	enableModifiedKeyUpdate: true,
	editDurationPath: "edited_seconds",
	enableEditDurationKey: true,
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
