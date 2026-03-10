import { App, Editor, TFile, moment } from "obsidian";
import { COOLDOWN_DURATIONS } from "../../constants/plugin.constants";
import { TimeThingsSettings } from "../../settings/settings.types";
import {
	findFrontmatterFieldLine,
	readFrontmatterFieldValueAtLine,
	setFrontmatterFieldValue,
} from "../../utils/editor-frontmatter";
import {
	getNestedFrontmatterValue,
	setNestedFrontmatterValue,
} from "../../utils/frontmatter-path";
import { isFileIgnored } from "../../utils/ignore-rules";

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

		this.updateModifiedTimestampInEditor(editor);

		if (this.getSettings().enableEditDurationKey) {
			await this.updateEditDurationInEditor(editor);
		}
	}

	async updateFileMetadata(file: TFile) {
		if (isFileIgnored(file, this.getSettings())) {
			return;
		}

		await this.updateModifiedTimestampInFrontmatter(file);

		if (this.getSettings().enableEditDurationKey) {
			await this.updateEditDurationInFrontmatter(file);
		}
	}

	private updateModifiedTimestampInEditor(editor: Editor) {
		const settings = this.getSettings();
		const lineNumber = findFrontmatterFieldLine(
			editor,
			settings.modifiedKeyName,
		);

		if (lineNumber === undefined) {
			return;
		}

		const currentValue = readFrontmatterFieldValueAtLine(editor, lineNumber);
		if (
			typeof currentValue !== "string" ||
			!moment(currentValue, settings.modifiedKeyFormat, true).isValid()
		) {
			return;
		}

		setFrontmatterFieldValue(
			editor,
			settings.modifiedKeyName,
			moment().format(settings.modifiedKeyFormat),
			{ addToHistory: false },
		);
	}

	private async updateModifiedTimestampInFrontmatter(file: TFile) {
		const settings = this.getSettings();

		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			const currentValue = getNestedFrontmatterValue(
				frontmatter,
				settings.modifiedKeyName,
			);
			const now = moment();
			const nextAllowedUpdate = moment(
				typeof currentValue === "string" ? currentValue : undefined,
				settings.modifiedKeyFormat,
			);

			if (
				nextAllowedUpdate.isValid() &&
				nextAllowedUpdate
					.clone()
					.add(settings.updateIntervalFrontmatterMinutes, "minutes")
					.isAfter(now)
			) {
				return;
			}

			setNestedFrontmatterValue(
				frontmatter,
				settings.modifiedKeyName,
				now.format(settings.modifiedKeyFormat),
			);
		});
	}

	private async updateEditDurationInFrontmatter(file: TFile) {
		if (!this.allowEditDurationUpdate) {
			return;
		}

		this.allowEditDurationUpdate = false;

		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				const currentValue = getNestedFrontmatterValue(
					frontmatter,
					this.getSettings().editDurationPath,
				);
				const nextValue =
					toNumber(currentValue) +
					COOLDOWN_DURATIONS.frontmatterIncrementSeconds;

				setNestedFrontmatterValue(
					frontmatter,
					this.getSettings().editDurationPath,
					nextValue,
				);
			});

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
			const lineNumber = findFrontmatterFieldLine(
				editor,
				settings.editDurationPath,
			);

			if (lineNumber === undefined) {
				return;
			}

			const currentValue = readFrontmatterFieldValueAtLine(editor, lineNumber);
			const nextValue =
				toNumber(currentValue) + COOLDOWN_DURATIONS.editorIncrementSeconds;

			setFrontmatterFieldValue(
				editor,
				settings.editDurationPath,
				nextValue.toString(),
				{ addToHistory: false },
			);

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
