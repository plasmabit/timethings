import { TimeThingsSettings } from "./settings.types";

export const DEFAULT_SETTINGS: TimeThingsSettings = {
	useCustomFrontmatterHandlingSolution: false,
	showEmojiStatusBar: true,
	clockFormat: "hh:mm A",
	updateIntervalMilliseconds: "1000",
	enableClock: true,
	isUTC: false,
	modifiedKeyName: "updated_at",
	modifiedKeyFormat: "YYYY-MM-DD[T]HH:mm:ss.SSSZ",
	enableModifiedKeyUpdate: true,
	editDurationPath: "edited_seconds",
	enableEditDurationKey: true,
	updateIntervalFrontmatterMinutes: 1,
	nonTypingEditingTimePercentage: 22,
	ignoredFolders: [],
	ignoredFiles: [],
	enableSwitch: false,
	switchKey: "timethings.switch",
	switchKeyValue: "true",
};
