import { Editor} from 'obsidian';
import { moment } from 'obsidian';
import TimeThings from './main'
import {
	DEFAULT_SETTINGS,
	TimeThingsSettings,
	TimeThingsSettingsTab,
} from './settings';

export function setValue(editor: Editor, fieldPath: string, fieldValue: string) {
  const fieldLine = this.getLine(editor, fieldPath);
  if (fieldLine === undefined) {
    return;
  }
  if (fieldPath === "updated_at") { // settings prevent from export working
    const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
    if (moment(value, "YYYY-MM-DD[T]HH:mm:ss.SSSZ", true).isValid() === false) {    // Little safecheck in place to reduce chance of bugs
      return;
    }
  }
  const initialLine = editor.getLine(fieldLine).split(':', 1);
  const newLine = initialLine[0] + ": " + fieldValue;
  editor.setLine(fieldLine, newLine);
}


export function isLineIndented(line: string): boolean {
  return /^[\s\t]/.test(line);
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

export function getLine(editor: Editor, fieldPath: string): number | undefined {
  const frontmatterLine = frontmatterEndLine(editor);
  const keys = fieldPath.split('.');
  const depth = keys.length;

  if (frontmatterLine === undefined) {
    return undefined;
  }

  let targetDepth = 1;
  let currentDepth = 1;
  let startLine = 1;
  let emergingPath = [];

  for (const key of keys) {
    for (let i = startLine; i <= frontmatterLine; i++) {

      const currentLine = editor.getLine(i);
      const currentField = currentLine.split(':');
      const currentFieldName = currentField[0].trim();

      if (currentFieldName === key) {
        emergingPath.push(currentFieldName);
        let targetPath = fieldPath.split('.');
        let targetPathShrink = targetPath.slice(0, emergingPath.length);
        if (targetPathShrink.join('.') === emergingPath.join('.') === false) {
          emergingPath.pop();
          startLine = i + 1;
          continue;
        }
        else {
          if (emergingPath.join('.') === fieldPath) {
            if (targetDepth > 1) {
              if (this.isLineIndented(currentLine) === false) {    // met first level variable, obviously return
                return undefined;
              }
            }
            else {
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