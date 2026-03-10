import { App, TFile } from "obsidian";
import {
	FRONTMATTER_FIELDS,
	MOST_EDITED_VIEW,
} from "../../constants/plugin.constants";
import { getNestedFrontmatterValue } from "../../utils/frontmatter-path";

export interface MostEditedEntry {
	file: TFile;
	editedSeconds: number;
}

export class MostEditedService {
	constructor(private readonly app: App) {}

	getMostEditedEntries(
		fieldName: string = FRONTMATTER_FIELDS.editedSeconds,
	): MostEditedEntry[] {
		const entries: MostEditedEntry[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			const editedSeconds = this.getEditedSeconds(file, fieldName);

			if (
				editedSeconds === undefined ||
				editedSeconds < MOST_EDITED_VIEW.minimumVisibleSeconds
			) {
				continue;
			}

			entries.push({ file, editedSeconds });
		}

		return entries.sort(
			(left, right) => right.editedSeconds - left.editedSeconds,
		);
	}

	getTotalEditedSeconds(entries: readonly MostEditedEntry[]): number {
		return entries.reduce((total, entry) => total + entry.editedSeconds, 0);
	}

	private getEditedSeconds(file: TFile, fieldName: string): number | undefined {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

		if (frontmatter === undefined) {
			return undefined;
		}

		const value = getNestedFrontmatterValue(frontmatter, fieldName);

		if (typeof value === "number") {
			return value;
		}

		if (typeof value === "string") {
			const numericValue = Number(value);
			return Number.isNaN(numericValue) ? undefined : numericValue;
		}

		return undefined;
	}
}
