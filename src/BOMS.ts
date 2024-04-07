export function getValue(frontmatter: any, fieldPath: string) {
    // Prepare everything
	const keys = fieldPath.split(".");
	let value = frontmatter;

	for (const key of keys) {
		value = value[key];
		if (value === undefined) {
			return undefined;
		}
	}

	return value;
}

export function setValue(frontmatter: any, fieldPath: string, value: any) {
	const keys = fieldPath.split(".");
	let currentLevel = frontmatter;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (!currentLevel[key]) {
			currentLevel[key] = {};
		}
		currentLevel = currentLevel[key];
	}

	currentLevel[keys[keys.length - 1]] = value;
}
