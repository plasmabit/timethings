import { App, Editor, TFile } from "obsidian";
import { DEFAULT_MODIFIED_KEY_FORMAT, type TimeThingsSettings } from "../../shared/config";
import {
	findFrontmatterFieldLine,
	hasFrontmatter,
	type FrontmatterObject,
	readFrontmatterFieldValueAtLine,
	setFrontmatterFieldValue,
	getNestedFrontmatterValue,
	setNestedFrontmatterValue,
} from "../../shared/lib/frontmatter";
import { isFileIgnored } from "../../shared/lib/ignore";
import { isWithinMinutes, parseTimestampStrict } from "../../shared/lib/datetime";
import { formatFrontmatterTimestamp, nowInTimezone } from "../../timezone";
import { COOLDOWN_DURATIONS } from "./activity.constants";

type SettingsAccessor = () => TimeThingsSettings;
type EditDurationListener = (file: TFile, totalSeconds: number) => void;

export class MetadataUpdateService {
	private allowEditDurationUpdate = true;

	constructor(
		private readonly app: App,
		private readonly getSettings: SettingsAccessor,
		private readonly onEditDurationChange?: EditDurationListener,
	) {}

	async updateEditorMetadata(file: TFile, editor: Editor) {
		const settings = this.getSettings();
		if (isFileIgnored(file, settings)) {
			return;
		}

		if (!hasFrontmatter(editor)) {
			return;
		}

		if (settings.enableModifiedKeyUpdate) {
			this.updateModifiedTimestampInEditor(editor);
		}

		if (settings.enableEditDurationKey) {
			await this.updateEditDurationInEditor(file, editor);
		}
	}

	async updateFileMetadata(file: TFile) {
		const settings = this.getSettings();
		if (isFileIgnored(file, settings)) {
			return;
		}

		if (!(await this.fileHasFrontmatter(file))) {
			return;
		}

		const shouldUpdateDuration = settings.enableEditDurationKey && this.allowEditDurationUpdate;
		if (!settings.enableModifiedKeyUpdate && !shouldUpdateDuration) {
			return;
		}

		if (shouldUpdateDuration) {
			this.allowEditDurationUpdate = false;
		}

		let didUpdateDuration = false;
		try {
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: FrontmatterObject) => {
					if (settings.enableModifiedKeyUpdate) {
						this.updateModifiedTimestampInFrontmatter(frontmatter, settings);
					}

					if (shouldUpdateDuration) {
						didUpdateDuration = this.updateEditDurationInFrontmatter(
							file,
							frontmatter,
							settings,
						);
					}
				},
			);
		} catch (error) {
			if (shouldUpdateDuration) {
				this.allowEditDurationUpdate = true;
			}
			throw error;
		}

		if (!shouldUpdateDuration) {
			return;
		}

		if (!didUpdateDuration) {
			this.allowEditDurationUpdate = true;
			return;
		}

		void delay(
			COOLDOWN_DURATIONS.frontmatterBaseMilliseconds -
				settings.nonTypingEditingTimePercentage * 100,
		).then(() => {
			this.allowEditDurationUpdate = true;
		});
	}

	private async fileHasFrontmatter(file: TFile): Promise<boolean> {
		try {
			const lines = (await this.app.vault.cachedRead(file))
				.replace(/^\uFEFF/, "")
				.split(/\r?\n/);
			return lines[0] === "---" && lines.slice(1).includes("---");
		} catch {
			return false;
		}
	}

	private updateModifiedTimestampInEditor(editor: Editor) {
		const settings = this.getSettings();
		const lineNumber = findFrontmatterFieldLine(editor, settings.modifiedKeyName);

		if (lineNumber === undefined) {
			if (settings.createMissingFrontmatterProperties) {
				setFrontmatterFieldValue(
					editor,
					settings.modifiedKeyName,
					formatFrontmatterTimestamp(
						nowInTimezone(settings.frontmatterTimezone, settings.frontmatterUseUtc),
						settings.modifiedKeyFormat,
						settings.frontmatterUseIso,
					),
					{ addToHistory: false, createIfMissing: true },
				);
			}
			return;
		}

		const currentValue = readFrontmatterFieldValueAtLine(editor, lineNumber);
		if (
			typeof currentValue !== "string" ||
			!this.isRecognizedTimestamp(currentValue, settings)
		) {
			return;
		}

		setFrontmatterFieldValue(
			editor,
			settings.modifiedKeyName,
			formatFrontmatterTimestamp(
				nowInTimezone(settings.frontmatterTimezone, settings.frontmatterUseUtc),
				settings.modifiedKeyFormat,
				settings.frontmatterUseIso,
			),
			{ addToHistory: false },
		);
	}

	private isRecognizedTimestamp(value: string, settings: TimeThingsSettings): boolean {
		const activeFormat = settings.frontmatterUseIso
			? DEFAULT_MODIFIED_KEY_FORMAT
			: settings.modifiedKeyFormat;

		return (
			parseTimestampStrict(value, activeFormat) !== undefined ||
			(settings.frontmatterUseIso &&
				parseTimestampStrict(value, settings.modifiedKeyFormat) !== undefined)
		);
	}

	private updateModifiedTimestampInFrontmatter(
		frontmatter: FrontmatterObject,
		settings: TimeThingsSettings,
	) {
		const currentValue = getNestedFrontmatterValue(frontmatter, settings.modifiedKeyName);
		if (currentValue === undefined && !settings.createMissingFrontmatterProperties) {
			return;
		}

		const currentTime = nowInTimezone(settings.frontmatterTimezone, settings.frontmatterUseUtc);
		const previous =
			typeof currentValue === "string"
				? parseTimestampStrict(
						currentValue,
						settings.frontmatterUseIso
							? DEFAULT_MODIFIED_KEY_FORMAT
							: settings.modifiedKeyFormat,
					)
				: undefined;

		if (
			previous &&
			isWithinMinutes(previous, currentTime, settings.updateIntervalFrontmatterMinutes)
		) {
			return;
		}

		setNestedFrontmatterValue(
			frontmatter,
			settings.modifiedKeyName,
			formatFrontmatterTimestamp(
				currentTime,
				settings.modifiedKeyFormat,
				settings.frontmatterUseIso,
			),
		);
	}

	private updateEditDurationInFrontmatter(
		file: TFile,
		frontmatter: FrontmatterObject,
		settings: TimeThingsSettings,
	): boolean {
		const currentValue = getNestedFrontmatterValue(frontmatter, settings.editDurationPath);
		if (currentValue === undefined && !settings.createMissingFrontmatterProperties) {
			return false;
		}

		const nextValue = toNumber(currentValue) + COOLDOWN_DURATIONS.frontmatterIncrementSeconds;

		setNestedFrontmatterValue(frontmatter, settings.editDurationPath, nextValue);
		this.onEditDurationChange?.(file, nextValue);
		return true;
	}

	private async updateEditDurationInEditor(file: TFile, editor: Editor) {
		if (!this.allowEditDurationUpdate) {
			return;
		}

		this.allowEditDurationUpdate = false;

		try {
			const settings = this.getSettings();
			const lineNumber = findFrontmatterFieldLine(editor, settings.editDurationPath);

			if (lineNumber === undefined) {
				if (settings.createMissingFrontmatterProperties) {
					setFrontmatterFieldValue(editor, settings.editDurationPath, "1", {
						addToHistory: false,
						createIfMissing: true,
					});
					this.onEditDurationChange?.(file, 1);
				}
				return;
			}

			const currentValue = readFrontmatterFieldValueAtLine(editor, lineNumber);
			const nextValue = toNumber(currentValue) + COOLDOWN_DURATIONS.editorIncrementSeconds;

			setFrontmatterFieldValue(editor, settings.editDurationPath, nextValue.toString(), {
				addToHistory: false,
			});
			this.onEditDurationChange?.(file, nextValue);

			await delay(
				COOLDOWN_DURATIONS.editorBaseMilliseconds -
					settings.nonTypingEditingTimePercentage * 10,
			);
		} finally {
			this.allowEditDurationUpdate = true;
		}
	}
}

function toNumber(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	return 0;
}

function delay(milliseconds: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, milliseconds);
	});
}
