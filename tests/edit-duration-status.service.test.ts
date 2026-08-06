import type { App, Editor, EventRef, WorkspaceLeaf } from "obsidian";
import { MarkdownView, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { EditDurationStatusService } from "../src/features/edit-duration-status";
import { DEFAULT_SETTINGS } from "../src/shared/config";
import { FakeEditor } from "./helpers/fake-editor";

function setup() {
	const file = new TFile();
	file.path = "Notes/test.md";
	const view = new MarkdownView({} as WorkspaceLeaf);
	view.file = file;
	view.editor = new FakeEditor([
		"---",
		"edited_seconds: 125",
		"---",
	]) as unknown as Editor;
	const eventRef = {} as EventRef;
	const app = {
		workspace: {
			getActiveViewOfType: vi.fn(() => view),
			on: vi.fn(() => eventRef),
		},
		vault: {
			on: vi.fn(() => eventRef),
		},
	} as unknown as App;
	const statusBar = {
		remove: vi.fn(),
		setText: vi.fn(),
	} as unknown as HTMLElement;
	const settings = { ...DEFAULT_SETTINGS };
	const host = {
		app,
		settings,
		addStatusBarItem: vi.fn(() => statusBar),
		registerEvent: vi.fn(),
	};

	return {
		file,
		host,
		settings,
		statusBar,
		service: new EditDurationStatusService(host),
	};
}

describe("EditDurationStatusService", () => {
	it("shows the active note's tracked minutes", () => {
		const { service, statusBar } = setup();

		service.initialize();

		expect(statusBar.setText).toHaveBeenLastCalledWith("⌛ 2 m");
	});

	it("renders duration updates immediately", () => {
		const { file, service, statusBar } = setup();
		service.initialize();

		service.renderFileDuration(file, 3_661);

		expect(statusBar.setText).toHaveBeenLastCalledWith("⌛ 61 m");
	});

	it("removes the item when disabled", () => {
		const { service, settings, statusBar } = setup();
		service.initialize();
		settings.showEditDurationStatusBar = false;

		service.refresh();

		expect(statusBar.remove).toHaveBeenCalledOnce();
	});
});
