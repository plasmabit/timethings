import type { Editor } from "obsidian";
import { describe, expect, it } from "vitest";
import {
	findFrontmatterEndLine,
	findFrontmatterFieldLine,
	hasFrontmatter,
	readFrontmatterFieldValueAtLine,
	setFrontmatterFieldValue,
} from "../src/utils/editor-frontmatter";
import { FakeEditor } from "./helpers/fake-editor";

function editor(value: string): Editor {
	return new FakeEditor(value.split("\n")) as unknown as Editor;
}

describe("frontmatter boundaries", () => {
	it("recognizes closed frontmatter", () =>
		expect(hasFrontmatter(editor("---\na: 1\n---"))).toBe(true));
	it("rejects a document without an opening delimiter", () =>
		expect(hasFrontmatter(editor("a: 1\n---"))).toBe(false));
	it("rejects unclosed frontmatter", () =>
		expect(hasFrontmatter(editor("---\na: 1"))).toBe(false));
	it("rejects an empty document", () => expect(hasFrontmatter(editor(""))).toBe(false));
	it("finds the closing delimiter", () =>
		expect(findFrontmatterEndLine(editor("---\na: 1\n---\nbody"))).toBe(2));
	it("returns undefined without frontmatter", () =>
		expect(findFrontmatterEndLine(editor("body"))).toBeUndefined());
});

describe("findFrontmatterFieldLine", () => {
	it("finds a top-level key", () =>
		expect(findFrontmatterFieldLine(editor("---\nupdated_at: now\n---"), "updated_at")).toBe(
			1,
		));
	it("ignores keys in the body", () =>
		expect(
			findFrontmatterFieldLine(editor("---\na: 1\n---\nupdated_at: now"), "updated_at"),
		).toBeUndefined());
	it("finds an indented nested key", () =>
		expect(
			findFrontmatterFieldLine(
				editor("---\ntimethings:\n  updated_at: now\n---"),
				"timethings.updated_at",
			),
		).toBe(2));
	it("skips an indented key for a top-level path", () =>
		expect(
			findFrontmatterFieldLine(editor("---\nparent:\n  updated_at: now\n---"), "updated_at"),
		).toBeUndefined());
	it("pins the documented nested-path limitation", () => {
		// characterizes current behavior; see README custom-frontmatter limitation
		expect(
			findFrontmatterFieldLine(editor("---\nx:\n  y:\n    g:\n      z: 1\n---"), "x.y.z"),
		).toBe(4);
	});
	it("returns undefined for a missing key", () =>
		expect(findFrontmatterFieldLine(editor("---\na: 1\n---"), "missing")).toBeUndefined());
});

describe("readFrontmatterFieldValueAtLine", () => {
	it("reads a value", () =>
		expect(readFrontmatterFieldValueAtLine(editor("---\nkey: value\n---"), 1)).toBe("value"));
	it("keeps colons in the value", () =>
		expect(readFrontmatterFieldValueAtLine(editor("---\nkey: 12:30:00\n---"), 1)).toBe(
			"12:30:00",
		));
	it("returns undefined without a colon", () =>
		expect(readFrontmatterFieldValueAtLine(editor("---\nkey\n---"), 1)).toBeUndefined());
});

describe("setFrontmatterFieldValue", () => {
	it("replaces the value and preserves indentation", () => {
		const fake = new FakeEditor(["---", "parent:", "  key: old", "---"]);
		setFrontmatterFieldValue(fake as unknown as Editor, "parent.key", "new");
		expect(fake.getValue()).toBe("---\nparent:\n  key: new\n---");
	});
	it("does nothing for a missing key", () => {
		const fake = new FakeEditor(["---", "key: old", "---"]);
		setFrontmatterFieldValue(fake as unknown as Editor, "missing", "new");
		expect(fake.getValue()).toBe("---\nkey: old\n---");
	});
});
