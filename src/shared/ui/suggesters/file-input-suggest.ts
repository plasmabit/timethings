import { App, TFile } from "obsidian";
import { PathInputSuggest } from "./path-input-suggest";

export class FileInputSuggest extends PathInputSuggest<TFile> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFile[] {
		const normalizedQuery = query.toLowerCase();

		return this.app.vault.getMarkdownFiles().filter((file) => {
			return file.path.toLowerCase().includes(normalizedQuery);
		});
	}

	protected getItemText(value: TFile): string {
		return value.path;
	}
}
