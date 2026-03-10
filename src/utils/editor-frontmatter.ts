import { Editor } from "obsidian";

export function hasFrontmatter(editor: Editor): boolean {
	if (editor.getLine(0) !== "---") {
		return false;
	}

	for (let lineNumber = 1; lineNumber <= editor.lastLine(); lineNumber += 1) {
		if (editor.getLine(lineNumber) === "---") {
			return true;
		}
	}

	return false;
}

export function findFrontmatterEndLine(editor: Editor): number | undefined {
	if (!hasFrontmatter(editor)) {
		return undefined;
	}

	for (let lineNumber = 1; lineNumber <= editor.lastLine(); lineNumber += 1) {
		if (editor.getLine(lineNumber) === "---") {
			return lineNumber;
		}
	}

	return undefined;
}

export function findFrontmatterFieldLine(
	editor: Editor,
	fieldPath: string,
): number | undefined {
	const endLine = findFrontmatterEndLine(editor);
	const keys = fieldPath.split(".");

	if (endLine === undefined) {
		return undefined;
	}

	let targetDepth = 1;
	let startLine = 1;
	let emergingPath: string[] = [];

	for (const key of keys) {
		for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
			const currentLine = editor.getLine(lineNumber);
			const currentFieldName = currentLine.split(":")[0].trim();

			if (currentFieldName !== key) {
				continue;
			}

			emergingPath.push(currentFieldName);

			const targetPath = keys.slice(0, emergingPath.length);
			if (targetPath.join(".") !== emergingPath.join(".")) {
				emergingPath.pop();
				startLine = lineNumber + 1;
				continue;
			}

			if (emergingPath.join(".") === fieldPath) {
				if (targetDepth > 1) {
					if (!isLineIndented(currentLine)) {
						return undefined;
					}
				} else if (isLineIndented(currentLine)) {
					startLine = lineNumber + 1;
					emergingPath = [];
					continue;
				}

				return lineNumber;
			}

			startLine = lineNumber + 1;
			targetDepth += 1;
		}
	}

	return undefined;
}

export function readFrontmatterFieldValueAtLine(
	editor: Editor,
	lineNumber: number,
): string | undefined {
	const lineParts = editor.getLine(lineNumber).split(/:(.*)/s);

	if (lineParts.length < 2) {
		return undefined;
	}

	return lineParts[1].trim();
}

export function setFrontmatterFieldValue(
	editor: Editor,
	fieldPath: string,
	fieldValue: string,
) {
	const fieldLine = findFrontmatterFieldLine(editor, fieldPath);

	if (fieldLine === undefined) {
		return;
	}

	const fieldName = editor.getLine(fieldLine).split(":", 1)[0];
	editor.setLine(fieldLine, `${fieldName}: ${fieldValue}`);
}

function isLineIndented(line: string): boolean {
	return /^[\s\t]/.test(line);
}
