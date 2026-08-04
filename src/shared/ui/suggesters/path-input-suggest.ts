import { AbstractInputSuggest } from "obsidian";

export abstract class PathInputSuggest<T> extends AbstractInputSuggest<T> {
	renderSuggestion(value: T, el: HTMLElement): void {
		el.setText(this.getItemText(value));
	}

	selectSuggestion(value: T): void {
		this.setValue(this.getItemText(value));
		this.close();
	}

	protected abstract getItemText(value: T): string;
}
