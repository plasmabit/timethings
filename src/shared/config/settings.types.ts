export interface TimeThingsSettings {
	useCustomFrontmatterHandlingSolution: boolean;
	showEmojiStatusBar: boolean;
	clockFormat: string;
	updateIntervalMilliseconds: number;
	enableClock: boolean;
	/** Legacy UTC value retained for one-time migration. */
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
	showEditDurationStatusBar: boolean;
	editDurationStatusBarFormat: string;
	nonTypingEditingTimePercentage: number;
	ignoredFolders: string[];
	ignoredFiles: string[];
}

export interface TimeThingsSettingsManager {
	settings: TimeThingsSettings;
	saveSettings(): Promise<void>;
	resetSettings(): Promise<void>;
	refreshEditDurationStatusBar(): void;
}
