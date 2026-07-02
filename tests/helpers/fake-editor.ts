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
