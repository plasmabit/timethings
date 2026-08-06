export function normalizePath(path: string): string {
	let result = path.trim().replace(/\\/g, "/").replace(/\/+/g, "/");
	result = result.replace(/^\/+/, "").replace(/\/+$/, "");
	return result === "" ? "/" : result;
}

export class TAbstractFile {
	path = "";
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "md";
}

export class TFolder extends TAbstractFile {}

export class App {
	fileManager!: {
		processFrontMatter: (
			file: TFile,
			callback: (frontmatter: Record<string, unknown>) => void,
		) => Promise<void>;
	};
}

export class MarkdownView {
	file: TFile | null = null;
	editor!: Editor;
}

export class AbstractInputSuggest {
	limit = 100;

	constructor(
		protected readonly app: App,
		private readonly inputEl: HTMLInputElement,
	) {}

	setValue(value: string): void {
		this.inputEl.value = value;
	}

	getValue(): string {
		return this.inputEl.value;
	}

	close(): void {}
}

export class Editor {
	getLine(_line: number): string {
		return "";
	}
	lastLine(): number {
		return 0;
	}
	setLine(_line: number, _text: string): void {}
	posToOffset(_position: { line: number; ch: number }): number {
		return 0;
	}
}
