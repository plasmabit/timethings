export interface TimeThingsSettings {
	useCustomFrontmatterHandlingSolution: boolean;
	showEmojiStatusBar: boolean;
	clockFormat: string;
	updateIntervalMilliseconds: number;
	enableClock: boolean;
	/** @deprecated Use clockTimezone instead. Kept for migration only. */
	isUTC: boolean;
	clockTimezone: string;
	frontmatterTimezone: string;
	modifiedKeyName: string;
	modifiedKeyFormat: string;
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
