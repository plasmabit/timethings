export type FrontmatterObject = Record<string, unknown>;

export function getNestedFrontmatterValue(
	frontmatter: FrontmatterObject,
	fieldPath: string,
): unknown {
	const keys = fieldPath.split(".");
	let currentValue: unknown = frontmatter;

	for (const key of keys) {
		if (!isFrontmatterObject(currentValue)) {
			return undefined;
		}

		currentValue = currentValue[key];

		if (currentValue === undefined) {
			return undefined;
		}
	}

	return currentValue;
}

export function setNestedFrontmatterValue(
	frontmatter: FrontmatterObject,
	fieldPath: string,
	value: unknown,
) {
	const keys = fieldPath.split(".");
	let currentLevel: FrontmatterObject = frontmatter;

	for (let index = 0; index < keys.length - 1; index += 1) {
		const key = keys[index];
		const nextLevel = currentLevel[key];

		if (!isFrontmatterObject(nextLevel)) {
			currentLevel[key] = {};
		}

		currentLevel = currentLevel[key] as FrontmatterObject;
	}

	currentLevel[keys[keys.length - 1]] = value;
}

function isFrontmatterObject(value: unknown): value is FrontmatterObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
