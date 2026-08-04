export interface TimeThingsSettings {
	useCustomFrontmatterHandlingSolution: boolean;
	showEmojiStatusBar: boolean;
	clockFormat: string;
	updateIntervalMilliseconds: number;
	enableClock: boolean;
	/** @deprecated Use clockTimezone instead. Kept for migration only. */
	isUTC: boolean;
	timezoneSettingsMigrated: boolean;
	clockUseUtc: boolean;
	clockTimezone: string;
	frontmatterUseUtc: boolean;
	frontmatterTimezone: string;
	modifiedKeyName: string;
	modifiedKeyFormat: string;
	frontmatterFormatMigrated: boolean;
	frontmatterUseIso: boolean;
	createMissingFrontmatterProperties: boolean;
	enableModifiedKeyUpdate: boolean;
	updateIntervalFrontmatterMinutes: number;
	editDurationPath: string;
	enableEditDurationKey: boolean;
	nonTypingEditingTimePercentage: number;
	ignoredFolders: string[];
	ignoredFiles: string[];
}

export interface TimeThingsSettingsManager {
	settings: TimeThingsSettings;
	saveSettings(): Promise<void>;
	resetSettings(): Promise<void>;
}
