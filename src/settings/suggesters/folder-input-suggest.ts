import { App, TAbstractFile, TFolder } from "obsidian";
import { PathInputSuggest } from "./path-input-suggest";

export class FolderInputSuggest extends PathInputSuggest<TFolder> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFolder[] {
		const normalizedQuery = query.toLowerCase();

		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => {
				return (
					file instanceof TFolder &&
					file.path.toLowerCase().includes(normalizedQuery)
				);
			});
	}

	protected getItemText(value: TAbstractFile): string {
		return value.path;
	}
}
