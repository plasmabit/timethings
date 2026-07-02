import type { App, Editor } from "obsidian";
import { TFile, moment } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataUpdateService } from "../src/features/activity/metadata-update.service";
import { DEFAULT_SETTINGS, type TimeThingsSettings } from "../src/shared/config";
import { FakeEditor } from "./helpers/fake-editor";

function file(path = "Notes/test.md"): TFile {
	const result = new TFile();
	result.path = path;
	return result;
}

function setup(initial: Record<string, unknown> = {}, overrides: Partial<TimeThingsSettings> = {}) {
	const frontmatter = { ...initial };
	const settings: TimeThingsSettings = { ...DEFAULT_SETTINGS, ...overrides };
	const app = {
		fileManager: {
			processFrontMatter: async (
				_file: unknown,
				callback: (value: Record<string, unknown>) => void,
			) => callback(frontmatter),
		},
	} as unknown as App;

	return {
		frontmatter,
		settings,
		service: new MetadataUpdateService(app, () => settings),
	};
}

async function finishCooldown(promise: Promise<void>, milliseconds = 10_000): Promise<void> {
	await vi.advanceTimersByTimeAsync(milliseconds);
	await promise;
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("window", { setTimeout: globalThis.setTimeout });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("updateFileMetadata", () => {
	it("does not touch ignored files", async () => {
		const { frontmatter, service } = setup(
			{ edited_seconds: 50 },
			{ ignoredFolders: ["Notes"] },
		);
		await service.updateFileMetadata(file());
		expect(frontmatter).toEqual({ edited_seconds: 50 });
	});

	it("updates an old modified timestamp", async () => {
		const old = moment().subtract(2, "minutes").format(DEFAULT_SETTINGS.modifiedKeyFormat);
		const { frontmatter, service } = setup(
			{ updated_at: old },
			{ enableEditDurationKey: false },
		);
		await service.updateFileMetadata(file());
		expect(frontmatter.updated_at).not.toBe(old);
		expect(
			moment(
				frontmatter.updated_at as string,
				DEFAULT_SETTINGS.modifiedKeyFormat,
				true,
			).isValid(),
		).toBe(true);
	});

	it("keeps a fresh modified timestamp", async () => {
		const fresh = moment().format(DEFAULT_SETTINGS.modifiedKeyFormat);
		const { frontmatter, service } = setup(
			{ updated_at: fresh },
			{ enableEditDurationKey: false },
		);
		await service.updateFileMetadata(file());
		expect(frontmatter.updated_at).toBe(fresh);
	});

	it.each([undefined, "not-a-date"])(
		"writes an absent or invalid timestamp: %s",
		async (value) => {
			const initial = value === undefined ? {} : { updated_at: value };
			const { frontmatter, service } = setup(initial, { enableEditDurationKey: false });
			await service.updateFileMetadata(file());
			expect(
				moment(
					frontmatter.updated_at as string,
					DEFAULT_SETTINGS.modifiedKeyFormat,
					true,
				).isValid(),
			).toBe(true);
		},
	);

	it.each([
		[50, 60],
		["50", 60],
		["garbage", 10],
		[undefined, 10],
	])("coerces edit duration %s to %s", async (current, expected) => {
		const initial = current === undefined ? {} : { edited_seconds: current };
		const { frontmatter, service } = setup(initial, { enableModifiedKeyUpdate: false });
		const update = service.updateFileMetadata(file());
		await finishCooldown(update);
		expect(frontmatter.edited_seconds).toBe(expected);
	});

	it("blocks a second increment until its cooldown ends", async () => {
		const { frontmatter, service } = setup(
			{ edited_seconds: 0 },
			{ enableModifiedKeyUpdate: false, nonTypingEditingTimePercentage: 0 },
		);
		const first = service.updateFileMetadata(file());
		await Promise.resolve();
		await service.updateFileMetadata(file());
		expect(frontmatter.edited_seconds).toBe(10);
		await finishCooldown(first);

		const third = service.updateFileMetadata(file());
		await finishCooldown(third);
		expect(frontmatter.edited_seconds).toBe(20);
	});
});

describe("updateEditorMetadata", () => {
	it("increments editor duration by one", async () => {
		const { service } = setup({}, { enableModifiedKeyUpdate: false });
		const fake = new FakeEditor(["---", "edited_seconds: 5", "---"]);
		const update = service.updateEditorMetadata(file(), fake as unknown as Editor);
		await finishCooldown(update, 1000);
		expect(fake.getValue()).toContain("edited_seconds: 6");
	});

	it("updates a strictly valid modified timestamp", async () => {
		const old = moment().subtract(1, "minute").format(DEFAULT_SETTINGS.modifiedKeyFormat);
		const { service } = setup({}, { enableEditDurationKey: false });
		const fake = new FakeEditor(["---", `updated_at: ${old}`, "---"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		const updated = fake.getLine(1).slice("updated_at: ".length);
		expect(updated).not.toBe(old);
		expect(moment(updated, DEFAULT_SETTINGS.modifiedKeyFormat, true).isValid()).toBe(true);
	});

	it("leaves an invalid editor timestamp unchanged", async () => {
		const { service } = setup({}, { enableEditDurationKey: false });
		const fake = new FakeEditor(["---", "updated_at: garbage", "---"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		expect(fake.getLine(1)).toBe("updated_at: garbage");
	});
});
