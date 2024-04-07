import { Editor } from "obsidian";

export function isLineIndented(line: string): boolean {
	return /^[\s\t]/.test(line);
}

export function getLine(editor: Editor, fieldPath: string): number | undefined {
    const frontmatterLine = frontmatterEndLine(editor);
    const keys = fieldPath.split(".");

    if (frontmatterLine === undefined) {
        return undefined;
    }

    let targetDepth = 1;
    let startLine = 1;
    let emergingPath = [];

    for (const key of keys) {
        for (let i = startLine; i <= frontmatterLine; i++) {
            const currentLine = editor.getLine(i);
            const currentField = currentLine.split(":");
            const currentFieldName = currentField[0].trim();

            if (currentFieldName === key) {
                emergingPath.push(currentFieldName);
                const targetPath = fieldPath.split(".");
                const targetPathShrink = targetPath.slice(
                    0,
                    emergingPath.length,
                );
                if (
                    (targetPathShrink.join(".") === emergingPath.join(".")) ===
                    false
                ) {
                    emergingPath.pop();
                    startLine = i + 1;
                    continue;
                } else {
                    if (emergingPath.join(".") === fieldPath) {
                        if (targetDepth > 1) {
                            if (this.isLineIndented(currentLine) === false) {
                                // met first level variable, obviously return
                                return undefined;
                            }
                        } else {
                            if (isLineIndented(currentLine)) {
                                startLine = i + 1;
                                emergingPath = [];
                                continue;
                            }
                        }
                        return i;
                    }
                    startLine = i + 1;
                    targetDepth += 1;
                    continue;
                }
            }
        }
    }

    return undefined;
}

export function isFrontmatterPresent(editor: Editor): boolean {
	if (editor.getLine(0) !== "---") {
		return false;
	}
	for (let i = 1; i <= editor.lastLine(); i++) {
		if (editor.getLine(i) === "---") {
			return true;
		}
	}
	return false;
}

export function frontmatterEndLine(editor: Editor): number | undefined {
	if (isFrontmatterPresent(editor)) {
		for (let i = 1; i <= editor.lastLine(); i++) {
			if (editor.getLine(i) === "---") {
				return i;
			}
		}
	}
	return undefined; // # End line not found
}


export function setValue(editor: Editor, fieldPath: string, fieldValue: string,) {
	// The thing with this function is that it uses the format from settings to check against. I can make it as an argument that can be passed, or better yet, eradicate the check from the function to make it more atomic and place it somewhere else in the main code.
	const fieldLine = getLine(editor, fieldPath);
	if (fieldLine === undefined) {
		return;
	}
	const initialLine = editor.getLine(fieldLine).split(":", 1);
	const newLine = initialLine[0] + ": " + fieldValue;
	editor.setLine(fieldLine, newLine);
}
