import { Transaction } from "@codemirror/state";
import { Editor } from "obsidian";

interface SetFrontmatterFieldValueOptions {
	addToHistory?: boolean;
	createIfMissing?: boolean;
}

interface EditorViewLike {
	dispatch: (transaction: unknown) => void;
}

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

export function findFrontmatterFieldLine(editor: Editor, fieldPath: string): number | undefined {
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
	options: SetFrontmatterFieldValueOptions = {},
) {
	const fieldLine = findFrontmatterFieldLine(editor, fieldPath);

	if (fieldLine === undefined) {
		if (options.createIfMissing === true) {
			insertFrontmatterFieldValue(editor, fieldPath, fieldValue, options);
		}
		return;
	}

	const currentLine = editor.getLine(fieldLine);
	const fieldName = currentLine.split(":", 1)[0];
	const nextLine = `${fieldName}: ${fieldValue}`;

	if (
		options.addToHistory === false &&
		replaceEditorLineWithoutHistory(editor, fieldLine, currentLine, nextLine)
	) {
		return;
	}

	editor.setLine(fieldLine, nextLine);
}

function insertFrontmatterFieldValue(
	editor: Editor,
	fieldPath: string,
	fieldValue: string,
	options: SetFrontmatterFieldValueOptions,
) {
	const keys = fieldPath.split(".").filter((key) => key.length > 0);
	if (keys.length === 0) {
		return;
	}

	const endLine = findFrontmatterEndLine(editor);
	if (endLine === undefined) {
		if (editor.getLine(0) === "---") {
			return;
		}

		const fieldLines = buildNestedFieldLines(keys, fieldValue, "");
		insertEditorText(editor, 0, `---\n${fieldLines.join("\n")}\n---\n`, options);
		return;
	}

	for (let depth = keys.length - 1; depth > 0; depth -= 1) {
		const parentPath = keys.slice(0, depth).join(".");
		const parentLine = findFrontmatterFieldLine(editor, parentPath);
		if (parentLine === undefined) {
			continue;
		}

		if (readFrontmatterFieldValueAtLine(editor, parentLine) !== "") {
			return;
		}

		const parentIndent = leadingWhitespace(editor.getLine(parentLine));
		const childIndent = findChildIndent(editor, parentLine, endLine, parentIndent);
		const insertionLine = findNestedBlockEnd(editor, parentLine, endLine, parentIndent);
		const fieldLines = buildNestedFieldLines(
			keys.slice(depth),
			fieldValue,
			parentIndent + childIndent,
		);
		insertEditorText(editor, insertionLine, `${fieldLines.join("\n")}\n`, options);
		return;
	}

	const fieldLines = buildNestedFieldLines(keys, fieldValue, "");
	insertEditorText(editor, endLine, `${fieldLines.join("\n")}\n`, options);
}

function buildNestedFieldLines(keys: string[], value: string, initialIndent: string) {
	return keys.map((key, index) => {
		const indent = initialIndent + "  ".repeat(index);
		return index === keys.length - 1 ? `${indent}${key}: ${value}` : `${indent}${key}:`;
	});
}

function findChildIndent(
	editor: Editor,
	parentLine: number,
	endLine: number,
	parentIndent: string,
) {
	for (let lineNumber = parentLine + 1; lineNumber < endLine; lineNumber += 1) {
		const line = editor.getLine(lineNumber);
		if (line.trim().length === 0) {
			continue;
		}

		const indent = leadingWhitespace(line);
		if (indent.length <= parentIndent.length) {
			break;
		}

		return indent.slice(parentIndent.length);
	}

	return "  ";
}

function findNestedBlockEnd(
	editor: Editor,
	parentLine: number,
	endLine: number,
	parentIndent: string,
) {
	for (let lineNumber = parentLine + 1; lineNumber < endLine; lineNumber += 1) {
		const line = editor.getLine(lineNumber);
		if (line.trim().length > 0 && leadingWhitespace(line).length <= parentIndent.length) {
			return lineNumber;
		}
	}

	return endLine;
}

function leadingWhitespace(line: string) {
	return /^\s*/.exec(line)?.[0] ?? "";
}

function insertEditorText(
	editor: Editor,
	lineNumber: number,
	text: string,
	options: SetFrontmatterFieldValueOptions,
) {
	if (options.addToHistory === false) {
		const editorView = getEditorView(editor);
		if (editorView !== undefined) {
			editorView.dispatch({
				changes: {
					from: editor.posToOffset({ line: lineNumber, ch: 0 }),
					insert: text,
				},
				annotations: [Transaction.addToHistory.of(false)],
			});
			return;
		}
	}

	editor.replaceRange(text, { line: lineNumber, ch: 0 });
}

function isLineIndented(line: string): boolean {
	return /^[\s\t]/.test(line);
}

function replaceEditorLineWithoutHistory(
	editor: Editor,
	lineNumber: number,
	currentLine: string,
	nextLine: string,
): boolean {
	const editorView = getEditorView(editor);

	if (editorView === undefined) {
		return false;
	}

	const from = editor.posToOffset({ line: lineNumber, ch: 0 });
	const to = editor.posToOffset({
		line: lineNumber,
		ch: currentLine.length,
	});

	editorView.dispatch({
		changes: {
			from,
			to,
			insert: nextLine,
		},
		annotations: [Transaction.addToHistory.of(false)],
	});

	return true;
}

function getEditorView(editor: Editor): EditorViewLike | undefined {
	const editorWithView = editor as Editor & {
		cm?: EditorViewLike;
	};

	if (editorWithView.cm === undefined) {
		return undefined;
	}

	return typeof editorWithView.cm.dispatch === "function" ? editorWithView.cm : undefined;
}
