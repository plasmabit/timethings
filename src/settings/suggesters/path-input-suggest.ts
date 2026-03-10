import { AbstractInputSuggest, App } from "obsidian";

export abstract class PathInputSuggest<T> extends AbstractInputSuggest<T> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	renderSuggestion(value: T, el: HTMLElement): void {
		el.setText(this.getItemText(value));
	}

	selectSuggestion(value: T): void {
		this.setValue(this.getItemText(value));
		this.close();
	}

	protected abstract getItemText(value: T): string;
}
