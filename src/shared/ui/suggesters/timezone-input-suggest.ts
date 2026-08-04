import { AbstractInputSuggest, App } from "obsidian";

const SYSTEM_DEFAULT = "";

export class TimezoneInputSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private readonly timeZones: readonly string[],
		private readonly onChoose: (value: string) => void,
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): string[] {
		const zones = filterTimeZones(this.timeZones, query);
		return matchesSystemDefault(query) ? [SYSTEM_DEFAULT, ...zones] : zones;
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value || "System default");
	}

	selectSuggestion(value: string): void {
		this.setValue(value);
		this.onChoose(value);
		this.close();
	}
}

export function filterTimeZones(timeZones: readonly string[], query: string): string[] {
	const terms = normalizeSearchText(query).split(" ").filter(Boolean);
	if (terms.length === 0) {
		return [...timeZones];
	}

	return timeZones.filter((timeZone) => {
		const searchable = normalizeSearchText(timeZone);
		return terms.every((term) => searchable.includes(term));
	});
}

function matchesSystemDefault(query: string): boolean {
	const normalized = normalizeSearchText(query);
	return normalized.length === 0 || "system default".includes(normalized);
}

function normalizeSearchText(value: string): string {
	return value
		.toLowerCase()
		.replaceAll("_", " ")
		.replace(/[\s/]+/g, " ")
		.trim();
}
