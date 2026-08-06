import { TFile, type App, type EventRef } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityService } from "../src/features/activity/activity.service";
import { MetadataUpdateService } from "../src/features/activity/metadata-update.service";
import { DEFAULT_SETTINGS } from "../src/shared/config";

type DomRegistration = {
	element: Window | Document | HTMLElement;
	type: string;
	callback: (event: Event) => void;
};

type WindowOpenCallback = (workspaceWindow: { doc: Document }) => void;
type VaultModifyCallback = (file: TFile) => void;
type EditorChangeCallback = (editor: unknown, info: { file: TFile | null }) => void;

function setup() {
	const mainDocument = {} as Document;
	const popoutDocument = {} as Document;
	const eventRef = {} as EventRef;
	const domRegistrations: DomRegistration[] = [];
	let windowOpenCallback: WindowOpenCallback | undefined;
	let vaultModifyCallback: VaultModifyCallback | undefined;
	let editorChangeCallback: EditorChangeCallback | undefined;

	const app = {
		workspace: {
			getActiveViewOfType: vi.fn(),
			on: vi.fn((name: string, callback: WindowOpenCallback | EditorChangeCallback) => {
				if (name === "window-open") {
					windowOpenCallback = callback as WindowOpenCallback;
				}

				if (name === "editor-change") {
					editorChangeCallback = callback as EditorChangeCallback;
				}

				return eventRef;
			}),
		},
		vault: {
			on: vi.fn((name: string, callback: VaultModifyCallback) => {
				if (name === "modify") {
					vaultModifyCallback = callback;
				}

				return eventRef;
			}),
		},
	} as unknown as App;
	const host = {
		app,
		settings: {
			...DEFAULT_SETTINGS,
			useCustomFrontmatterHandlingSolution: true,
		},
		registerDomEvent: vi.fn(
			(
				element: Window | Document | HTMLElement,
				type: string,
				callback: (event: Event) => void,
			) => {
				domRegistrations.push({ element, type, callback });
			},
		),
		registerEvent: vi.fn(),
	};
	const metadataUpdateService = {
		updateEditorMetadata: vi.fn(),
		updateFileMetadata: vi.fn(),
	} as unknown as MetadataUpdateService;

	vi.stubGlobal("document", mainDocument);

	return {
		domRegistrations,
		host,
		mainDocument,
		metadataUpdateService,
		popoutDocument,
		service: new ActivityService(host, metadataUpdateService),
		triggerEditorChange: (file: TFile) => {
			if (editorChangeCallback === undefined) {
				throw new Error("editor change handler was not registered");
			}

			editorChangeCallback({}, { file });
		},
		triggerVaultModify: (file: TFile) => {
			if (vaultModifyCallback === undefined) {
				throw new Error("vault modify handler was not registered");
			}

			vaultModifyCallback(file);
		},
		triggerWindowOpen: () => {
			if (windowOpenCallback === undefined) {
				throw new Error("window-open handler was not registered");
			}

			windowOpenCallback({ doc: popoutDocument });
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("window", {
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("ActivityService", () => {
	it("waits for file activity to settle before using the frontmatter API", async () => {
		const { host, metadataUpdateService, service, triggerVaultModify } = setup();
		host.settings.useCustomFrontmatterHandlingSolution = false;
		const activeFile = new TFile();
		activeFile.path = "Notes/active.md";
		vi.mocked(host.app.workspace.getActiveViewOfType).mockReturnValue({
			file: activeFile,
		} as never);
		service.registerHandlers();

		triggerVaultModify(activeFile);
		await vi.advanceTimersByTimeAsync(2999);
		expect(metadataUpdateService.updateFileMetadata).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(metadataUpdateService.updateFileMetadata).toHaveBeenCalledOnce();
		expect(metadataUpdateService.updateFileMetadata).toHaveBeenCalledWith(activeFile);
	});

	it("resets the frontmatter delay when editing resumes", async () => {
		const { host, metadataUpdateService, service, triggerEditorChange, triggerVaultModify } =
			setup();
		host.settings.useCustomFrontmatterHandlingSolution = false;
		const activeFile = new TFile();
		activeFile.path = "Notes/active.md";
		vi.mocked(host.app.workspace.getActiveViewOfType).mockReturnValue({
			file: activeFile,
		} as never);
		service.registerHandlers();

		triggerVaultModify(activeFile);
		await vi.advanceTimersByTimeAsync(2500);
		triggerEditorChange(activeFile);
		await vi.advanceTimersByTimeAsync(2999);
		expect(metadataUpdateService.updateFileMetadata).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(metadataUpdateService.updateFileMetadata).toHaveBeenCalledOnce();
	});

	it("ignores modify events emitted by its own frontmatter write", async () => {
		const { host, metadataUpdateService, service, triggerVaultModify } = setup();
		host.settings.useCustomFrontmatterHandlingSolution = false;
		const activeFile = new TFile();
		activeFile.path = "Notes/active.md";
		vi.mocked(host.app.workspace.getActiveViewOfType).mockReturnValue({
			file: activeFile,
		} as never);
		let finishUpdate: (() => void) | undefined;
		vi.mocked(metadataUpdateService.updateFileMetadata).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishUpdate = resolve;
				}),
		);
		service.registerHandlers();

		triggerVaultModify(activeFile);
		await vi.advanceTimersByTimeAsync(3000);
		expect(metadataUpdateService.updateFileMetadata).toHaveBeenCalledOnce();

		triggerVaultModify(activeFile);
		await vi.advanceTimersByTimeAsync(3000);
		expect(metadataUpdateService.updateFileMetadata).toHaveBeenCalledOnce();

		finishUpdate?.();
		await vi.advanceTimersByTimeAsync(0);
	});

	it("registers a keyup listener on the main document", () => {
		const { domRegistrations, mainDocument, service } = setup();

		service.registerHandlers();

		expect(domRegistrations).toContainEqual({
			element: mainDocument,
			type: "keyup",
			callback: expect.any(Function),
		});
	});

	it("registers a keyup listener when a window opens", () => {
		const { domRegistrations, popoutDocument, service, triggerWindowOpen } = setup();

		service.registerHandlers();
		triggerWindowOpen();

		expect(domRegistrations).toContainEqual({
			element: popoutDocument,
			type: "keyup",
			callback: expect.any(Function),
		});
	});

	it("registers only one keyup listener for the same opened window", () => {
		const { domRegistrations, popoutDocument, service, triggerWindowOpen } = setup();

		service.registerHandlers();
		triggerWindowOpen();
		triggerWindowOpen();

		const popoutRegistrations = domRegistrations.filter(
			(registration) =>
				registration.element === popoutDocument && registration.type === "keyup",
		);
		expect(popoutRegistrations).toHaveLength(1);
	});
});
