import { describe, expect, it } from "vitest";
import { normalizeUpdateInterval } from "../src/shared/config";

describe("normalizeUpdateInterval", () => {
	it.each([
		["1000", 1000],
		["abc", 1000],
		[50, 100],
		[2500.7, 2501],
		[Number.NaN, 1000],
		[undefined, 1000],
	])("normalizes %j to %d", (value, expected) => {
		expect(normalizeUpdateInterval(value)).toBe(expected);
	});
});
