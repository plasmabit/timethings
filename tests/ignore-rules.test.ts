import { TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import {
	formatIgnoreList,
	isFileIgnored,
	normalizeIgnorePath,
	parseIgnoreList,
} from "../src/shared/lib/ignore";

function file(path: string): TFile {
	const result = new TFile();
	result.path = path;
	return result;
}

describe("normalizeIgnorePath", () => {
	it("trims whitespace", () => expect(normalizeIgnorePath(" Templates ")).toBe("Templates"));
	it("strips trailing slashes", () =>
		expect(normalizeIgnorePath("Templates/")).toBe("Templates"));
	it("normalizes backslashes", () =>
		expect(normalizeIgnorePath("Folder\\Nested\\")).toBe("Folder/Nested"));
});

describe("parseIgnoreList", () => {
	it("splits LF and CRLF lines", () => {
		expect(parseIgnoreList("One\nTwo\r\nThree")).toEqual(["One", "Two", "Three"]);
	});

	it("drops empty lines, trims, and deduplicates entries", () => {
		expect(parseIgnoreList(" One \n\nOne\n Two/ ")).toEqual(["One", "Two"]);
	});
});

describe("formatIgnoreList", () => {
	it("joins paths with newlines", () => {
		expect(formatIgnoreList(["One", "Two"])).toBe("One\nTwo");
	});
});

describe("isFileIgnored", () => {
	it("matches an exact ignored file", () => {
		expect(
			isFileIgnored(file("Notes/a.md"), { ignoredFiles: ["Notes/a.md"], ignoredFolders: [] }),
		).toBe(true);
	});

	it.each(["Temp/a.md", "Temp/Nested/a.md", "Temp"])(
		"matches a folder or its descendants: %s",
		(path) => {
			expect(isFileIgnored(file(path), { ignoredFiles: [], ignoredFolders: ["Temp"] })).toBe(
				true,
			);
		},
	);

	it("does not match a folder-name prefix", () => {
		expect(
			isFileIgnored(file("Templates/a.md"), { ignoredFiles: [], ignoredFolders: ["Temp"] }),
		).toBe(false);
	});

	it("returns false for empty ignore lists", () => {
		expect(isFileIgnored(file("a.md"), { ignoredFiles: [], ignoredFolders: [] })).toBe(false);
	});

	it("normalizes whitespace and trailing slashes in entries", () => {
		expect(
			isFileIgnored(file("Temp/a.md"), { ignoredFiles: [], ignoredFolders: [" Temp/ "] }),
		).toBe(true);
	});
});
