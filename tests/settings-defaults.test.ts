import { describe, expect, it } from "vitest";
import { migrateSettings, normalizeUpdateInterval } from "../src/shared/config";

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

describe("migrateSettings", () => {
	it("restores the edit duration status bar for existing installations", () => {
		const settings = migrateSettings({}).settings;

		expect(settings.showEditDurationStatusBar).toBe(true);
		expect(settings.editDurationStatusBarFormat).toBe("⌛ {minutes} m");
	});

	it("enables creation of missing frontmatter properties by default", () => {
		expect(migrateSettings({}).settings.createMissingFrontmatterProperties).toBe(true);
	});

	it.each([
		[true, true],
		[false, false],
	])("migrates legacy isUTC=%s once", (isUTC, expectedUseUtc) => {
		const result = migrateSettings({ isUTC });

		expect(result.didMigrate).toBe(true);
		expect(result.settings.isUTC).toBe(isUTC);
		expect(result.settings.clockUseUtc).toBe(expectedUseUtc);
		expect(result.settings.clockTimezone).toBe("");
		expect(result.settings.timezoneSettingsMigrated).toBe(true);
	});

	it("does not reapply legacy UTC after migration", () => {
		const result = migrateSettings({
			isUTC: true,
			timezoneSettingsMigrated: true,
			frontmatterFormatMigrated: true,
			clockUseUtc: false,
			clockTimezone: "",
		});

		expect(result.didMigrate).toBe(false);
		expect(result.settings.clockUseUtc).toBe(false);
		expect(result.settings.clockTimezone).toBe("");
	});

	it("preserves an existing custom frontmatter format", () => {
		const result = migrateSettings({
			timezoneSettingsMigrated: true,
			modifiedKeyFormat: "YYYY/MM/DD HH:mm",
		});

		expect(result.didMigrate).toBe(true);
		expect(result.settings.frontmatterUseIso).toBe(false);
		expect(result.settings.modifiedKeyFormat).toBe("YYYY/MM/DD HH:mm");
		expect(result.settings.frontmatterFormatMigrated).toBe(true);
	});
});
