export class FakeEditor {
	constructor(private lines: string[]) {}

	getLine(n: number): string {
		return this.lines[n] ?? "";
	}

	lastLine(): number {
		return this.lines.length - 1;
	}

	setLine(n: number, text: string): void {
		this.lines[n] = text;
	}

	replaceRange(text: string, from: { line: number; ch: number }): void {
		const currentLine = this.lines[from.line] ?? "";
		const replacement = `${currentLine.slice(0, from.ch)}${text}${currentLine.slice(from.ch)}`;
		this.lines.splice(from.line, 1, ...replacement.split("\n"));
	}

	getValue(): string {
		return this.lines.join("\n");
	}

	posToOffset(pos: { line: number; ch: number }): number {
		let offset = 0;
		for (let i = 0; i < pos.line; i++) offset += this.lines[i].length + 1;
		return offset + pos.ch;
	}

	hasFocus(): boolean {
		return true;
	}
}
