import type { App, Editor } from "obsidian";
import { TFile } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataUpdateService } from "../src/features/activity/metadata-update.service";
import { DEFAULT_SETTINGS, type TimeThingsSettings } from "../src/shared/config";
import { formatTimestamp, now, parseTimestampStrict } from "../src/shared/lib/datetime";
import { FakeEditor } from "./helpers/fake-editor";

function file(path = "Notes/test.md"): TFile {
	const result = new TFile();
	result.path = path;
	return result;
}

interface SetupOptions {
	fileContent?: string;
}

function setup(
	initial: Record<string, unknown> = {},
	overrides: Partial<TimeThingsSettings> = {},
	options: SetupOptions = {},
) {
	const frontmatter = { ...initial };
	const settings: TimeThingsSettings = { ...DEFAULT_SETTINGS, ...overrides };
	const processFrontMatter = vi.fn(
		async (_file: unknown, callback: (value: Record<string, unknown>) => void) =>
			callback(frontmatter),
	);
	const app = {
		fileManager: {
			processFrontMatter,
		},
		vault: {
			cachedRead: vi.fn(async () => options.fileContent ?? "---\n---\nBody"),
		},
	} as unknown as App;
	const onEditDurationChange = vi.fn();

	return {
		frontmatter,
		onEditDurationChange,
		processFrontMatter,
		settings,
		service: new MetadataUpdateService(app, () => settings, onEditDurationChange),
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

	it("does not create a frontmatter block", async () => {
		const { frontmatter, processFrontMatter, service } = setup({}, {}, { fileContent: "Body" });

		await service.updateFileMetadata(file());

		expect(frontmatter).toEqual({});
		expect(processFrontMatter).not.toHaveBeenCalled();
	});

	it("updates the timestamp and edit duration in one frontmatter write", async () => {
		const old = formatTimestamp(
			now(false).subtract({ minutes: 2 }),
			DEFAULT_SETTINGS.modifiedKeyFormat,
		);
		const { frontmatter, processFrontMatter, service } = setup({
			updated_at: old,
			edited_seconds: 20,
		});

		const update = service.updateFileMetadata(file());
		await vi.advanceTimersByTimeAsync(0);

		expect(processFrontMatter).toHaveBeenCalledOnce();
		expect(frontmatter.updated_at).not.toBe(old);
		expect(frontmatter.edited_seconds).toBe(30);
		await finishCooldown(update);
	});

	it("updates an old modified timestamp", async () => {
		const old = formatTimestamp(
			now(false).subtract({ minutes: 2 }),
			DEFAULT_SETTINGS.modifiedKeyFormat,
		);
		const { frontmatter, service } = setup(
			{ updated_at: old },
			{ enableEditDurationKey: false },
		);
		await service.updateFileMetadata(file());
		expect(frontmatter.updated_at).not.toBe(old);
		expect(
			parseTimestampStrict(
				frontmatter.updated_at as string,
				DEFAULT_SETTINGS.modifiedKeyFormat,
			),
		).toBeDefined();
	});

	it("writes the selected IANA offset as ISO 8601", async () => {
		vi.setSystemTime(new Date("2024-01-02T08:30:45.678Z"));
		const { frontmatter, service } = setup(
			{ updated_at: "2000-01-01T00:00:00.000+00:00" },
			{
				enableEditDurationKey: false,
				frontmatterTimezone: "Asia/Kolkata",
				modifiedKeyFormat: "YYYY",
			},
		);

		await service.updateFileMetadata(file());

		expect(frontmatter.updated_at).toBe("2024-01-02T14:00:45.678+05:30");
	});

	it("writes a custom format when ISO is disabled", async () => {
		vi.setSystemTime(new Date("2024-01-02T08:30:45.678Z"));
		const { frontmatter, service } = setup(
			{ updated_at: "2000/01/01 00:00" },
			{
				enableEditDurationKey: false,
				frontmatterTimezone: "UTC",
				modifiedKeyFormat: "YYYY/MM/DD HH:mm",
				frontmatterUseIso: false,
			},
		);

		await service.updateFileMetadata(file());

		expect(frontmatter.updated_at).toBe("2024/01/02 08:30");
	});

	it("keeps a fresh modified timestamp", async () => {
		const fresh = formatTimestamp(now(false), DEFAULT_SETTINGS.modifiedKeyFormat);
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
				parseTimestampStrict(
					frontmatter.updated_at as string,
					DEFAULT_SETTINGS.modifiedKeyFormat,
				),
			).toBeDefined();
		},
	);

	it("does not create a missing modified timestamp when creation is disabled", async () => {
		const { frontmatter, service } = setup(
			{},
			{
				createMissingFrontmatterProperties: false,
				enableEditDurationKey: false,
			},
		);
		await service.updateFileMetadata(file());
		expect(frontmatter).toEqual({});
	});

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

	it("does not create a missing edit duration when creation is disabled", async () => {
		const { frontmatter, service } = setup(
			{},
			{
				createMissingFrontmatterProperties: false,
				enableModifiedKeyUpdate: false,
			},
		);
		await service.updateFileMetadata(file());
		expect(frontmatter).toEqual({});
	});
});

describe("updateEditorMetadata", () => {
	it("does not create frontmatter", async () => {
		const { service } = setup();
		const fake = new FakeEditor(["Body"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		expect(fake.getValue()).toBe("Body");
	});

	it("adds missing properties only to an existing frontmatter block", async () => {
		const { service } = setup();
		const fake = new FakeEditor(["---", "title: Note", "---", "Body", "### Project - Ticket"]);

		await service.updateEditorMetadata(file(), fake as unknown as Editor);

		expect(fake.getValue().match(/^---$/gm)).toHaveLength(2);
		expect(fake.getValue()).toContain("updated_at:");
		expect(fake.getValue()).toContain("edited_seconds: 1");
	});

	it("applies manual ignored folders in custom editor mode", async () => {
		const { service } = setup({}, { ignoredFolders: ["Notes"] });
		const source = "---\nedited_seconds: 5\n---\nBody";
		const fake = new FakeEditor(source.split("\n"));

		await service.updateEditorMetadata(file(), fake as unknown as Editor);

		expect(fake.getValue()).toBe(source);
	});

	it("does not create missing editor properties when creation is disabled", async () => {
		const { service } = setup({}, { createMissingFrontmatterProperties: false });
		const fake = new FakeEditor(["---", "title: Note", "---", "Body"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		expect(fake.getValue()).toBe("---\ntitle: Note\n---\nBody");
	});

	it("increments editor duration by one", async () => {
		const { onEditDurationChange, service } = setup({}, { enableModifiedKeyUpdate: false });
		const activeFile = file();
		const fake = new FakeEditor(["---", "edited_seconds: 5", "---"]);
		const update = service.updateEditorMetadata(activeFile, fake as unknown as Editor);
		await finishCooldown(update, 1000);
		expect(fake.getValue()).toContain("edited_seconds: 6");
		expect(onEditDurationChange).toHaveBeenCalledWith(activeFile, 6);
	});

	it("updates a strictly valid modified timestamp", async () => {
		const old = formatTimestamp(
			now(false).subtract({ minutes: 1 }),
			DEFAULT_SETTINGS.modifiedKeyFormat,
		);
		const { service } = setup({}, { enableEditDurationKey: false });
		const fake = new FakeEditor(["---", `updated_at: ${old}`, "---"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		const updated = fake.getLine(1).slice("updated_at: ".length);
		expect(updated).not.toBe(old);
		expect(parseTimestampStrict(updated, DEFAULT_SETTINGS.modifiedKeyFormat)).toBeDefined();
	});

	it("uses UTC override in the custom editor path", async () => {
		vi.setSystemTime(new Date("2024-01-02T08:30:45.678Z"));
		const { service } = setup(
			{},
			{
				enableEditDurationKey: false,
				frontmatterTimezone: "Asia/Kolkata",
				frontmatterUseUtc: true,
			},
		);
		const fake = new FakeEditor(["---", "updated_at: 2000-01-01T00:00:00.000+00:00", "---"]);

		await service.updateEditorMetadata(file(), fake as unknown as Editor);

		expect(fake.getLine(1)).toBe("updated_at: 2024-01-02T08:30:45.678+00:00");
	});

	it("converts a legacy custom timestamp format to ISO 8601", async () => {
		vi.setSystemTime(new Date("2024-01-02T08:30:45.678Z"));
		const { service } = setup(
			{},
			{
				enableEditDurationKey: false,
				modifiedKeyFormat: "YYYY/MM/DD HH:mm",
				frontmatterTimezone: "UTC",
			},
		);
		const fake = new FakeEditor(["---", "updated_at: 2000/01/01 00:00", "---"]);

		await service.updateEditorMetadata(file(), fake as unknown as Editor);

		expect(fake.getLine(1)).toBe("updated_at: 2024-01-02T08:30:45.678+00:00");
	});

	it("leaves an invalid editor timestamp unchanged", async () => {
		const { service } = setup({}, { enableEditDurationKey: false });
		const fake = new FakeEditor(["---", "updated_at: garbage", "---"]);
		await service.updateEditorMetadata(file(), fake as unknown as Editor);
		expect(fake.getLine(1)).toBe("updated_at: garbage");
	});
});
