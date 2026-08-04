import { App, Editor, TFile } from "obsidian";
import { DEFAULT_MODIFIED_KEY_FORMAT, type TimeThingsSettings } from "../../shared/config";
import {
	findFrontmatterFieldLine,
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

export class MetadataUpdateService {
	private allowEditDurationUpdate = true;

	constructor(
		private readonly app: App,
		private readonly getSettings: SettingsAccessor,
	) {}

	async updateEditorMetadata(file: TFile, editor: Editor) {
		if (isFileIgnored(file, this.getSettings())) {
			return;
		}

		if (this.getSettings().enableModifiedKeyUpdate) {
			this.updateModifiedTimestampInEditor(editor);
		}

		if (this.getSettings().enableEditDurationKey) {
			await this.updateEditDurationInEditor(editor);
		}
	}

	async updateFileMetadata(file: TFile) {
		if (isFileIgnored(file, this.getSettings())) {
			return;
		}

		if (this.getSettings().enableModifiedKeyUpdate) {
			await this.updateModifiedTimestampInFrontmatter(file);
		}

		if (this.getSettings().enableEditDurationKey) {
			await this.updateEditDurationInFrontmatter(file);
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

	private async updateModifiedTimestampInFrontmatter(file: TFile) {
		const settings = this.getSettings();

		await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontmatterObject) => {
			const currentValue = getNestedFrontmatterValue(frontmatter, settings.modifiedKeyName);
			if (currentValue === undefined && !settings.createMissingFrontmatterProperties) {
				return;
			}

			const currentTime = nowInTimezone(
				settings.frontmatterTimezone,
				settings.frontmatterUseUtc,
			);
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
		});
	}

	private async updateEditDurationInFrontmatter(file: TFile) {
		if (!this.allowEditDurationUpdate) {
			return;
		}

		this.allowEditDurationUpdate = false;

		try {
			let didUpdate = false;
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: FrontmatterObject) => {
					const currentValue = getNestedFrontmatterValue(
						frontmatter,
						this.getSettings().editDurationPath,
					);
					if (
						currentValue === undefined &&
						!this.getSettings().createMissingFrontmatterProperties
					) {
						return;
					}

					const nextValue =
						toNumber(currentValue) + COOLDOWN_DURATIONS.frontmatterIncrementSeconds;

					setNestedFrontmatterValue(
						frontmatter,
						this.getSettings().editDurationPath,
						nextValue,
					);
					didUpdate = true;
				},
			);
			if (!didUpdate) {
				return;
			}

			await delay(
				COOLDOWN_DURATIONS.frontmatterBaseMilliseconds -
					this.getSettings().nonTypingEditingTimePercentage * 100,
			);
		} finally {
			this.allowEditDurationUpdate = true;
		}
	}

	private async updateEditDurationInEditor(editor: Editor) {
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
				}
				return;
			}

			const currentValue = readFrontmatterFieldValueAtLine(editor, lineNumber);
			const nextValue = toNumber(currentValue) + COOLDOWN_DURATIONS.editorIncrementSeconds;

			setFrontmatterFieldValue(editor, settings.editDurationPath, nextValue.toString(), {
				addToHistory: false,
			});

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
