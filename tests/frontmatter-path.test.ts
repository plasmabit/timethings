import { describe, expect, it } from "vitest";
import {
	getNestedFrontmatterValue,
	setNestedFrontmatterValue,
} from "../src/utils/frontmatter-path";

describe("getNestedFrontmatterValue", () => {
	it("gets a top-level value", () => {
		expect(getNestedFrontmatterValue({ title: "Note" }, "title")).toBe("Note");
	});

	it("gets a nested value", () => {
		expect(getNestedFrontmatterValue({ a: { b: { c: 3 } } }, "a.b.c")).toBe(3);
	});

	it("returns undefined for a missing key", () => {
		expect(getNestedFrontmatterValue({ a: {} }, "a.b")).toBeUndefined();
	});

	it.each([{ a: "text" }, { a: 3 }, { a: ["value"] }])(
		"returns undefined for a non-object intermediate",
		(frontmatter) => {
			expect(getNestedFrontmatterValue(frontmatter, "a.b")).toBeUndefined();
		},
	);

	it("returns an explicit null leaf", () => {
		expect(getNestedFrontmatterValue({ a: null }, "a")).toBeNull();
	});
});

describe("setNestedFrontmatterValue", () => {
	it("sets a top-level value", () => {
		const frontmatter = {};
		setNestedFrontmatterValue(frontmatter, "title", "Note");
		expect(frontmatter).toEqual({ title: "Note" });
	});

	it("creates missing intermediate objects", () => {
		const frontmatter = {};
		setNestedFrontmatterValue(frontmatter, "a.b.c", 3);
		expect(frontmatter).toEqual({ a: { b: { c: 3 } } });
	});

	it("overwrites a non-object intermediate", () => {
		const frontmatter = { a: 5 };
		setNestedFrontmatterValue(frontmatter, "a.b", 2);
		expect(frontmatter).toEqual({ a: { b: 2 } });
	});

	it("overwrites an existing leaf", () => {
		const frontmatter = { a: { b: 1 } };
		setNestedFrontmatterValue(frontmatter, "a.b", 2);
		expect(frontmatter).toEqual({ a: { b: 2 } });
	});
});
