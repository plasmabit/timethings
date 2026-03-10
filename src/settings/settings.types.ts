export interface TimeThingsSettings {
	useCustomFrontmatterHandlingSolution: boolean;
	showEmojiStatusBar: boolean;
	clockFormat: string;
	updateIntervalMilliseconds: string;
	enableClock: boolean;
	isUTC: boolean;
	modifiedKeyName: string;
	modifiedKeyFormat: string;
	enableModifiedKeyUpdate: boolean;
	updateIntervalFrontmatterMinutes: number;
	editDurationPath: string;
	enableEditDurationKey: boolean;
	nonTypingEditingTimePercentage: number;
	ignoredFolders: string[];
	ignoredFiles: string[];
	enableSwitch: boolean;
	switchKey: string;
	switchKeyValue: string;
}

export interface TimeThingsSettingsManager {
	settings: TimeThingsSettings;
	saveSettings(): Promise<void>;
	resetSettings(): Promise<void>;
}
