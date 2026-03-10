import { TFile, normalizePath } from "obsidian";

interface IgnoreSettings {
	ignoredFolders: string[];
	ignoredFiles: string[];
}

export function normalizeIgnorePath(path: string): string {
	return normalizePath(path.trim().replace(/\/+$/, ""));
}

export function parseIgnoreList(value: string): string[] {
	return normalizeIgnoreList(value.split(/\r?\n/));
}

export function formatIgnoreList(paths: readonly string[]): string {
	return paths.join("\n");
}

export function isFileIgnored(
	file: TFile,
	{ ignoredFolders, ignoredFiles }: IgnoreSettings,
): boolean {
	const normalizedFilePath = normalizePath(file.path);
	const normalizedIgnoredFiles = normalizeIgnoreList(ignoredFiles);
	const normalizedIgnoredFolders = normalizeIgnoreList(ignoredFolders);

	if (normalizedIgnoredFiles.includes(normalizedFilePath)) {
		return true;
	}

	return normalizedIgnoredFolders.some((folderPath) => {
		return (
			normalizedFilePath === folderPath ||
			normalizedFilePath.startsWith(`${folderPath}/`)
		);
	});
}

function normalizeIgnoreList(paths: readonly string[]): string[] {
	return Array.from(
		new Set(
			paths
				.map((path) => path.trim())
				.filter((path) => path.length > 0)
				.map((path) => normalizeIgnorePath(path)),
		),
	);
}
