import type { App, EventRef } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityService } from "../src/features/activity/activity.service";
import { MetadataUpdateService } from "../src/features/activity/metadata-update.service";
import { DEFAULT_SETTINGS } from "../src/shared/config";

type DomRegistration = {
	element: Window | Document | HTMLElement;
	type: string;
	callback: (event: Event) => void;
};

type WindowOpenCallback = (workspaceWindow: { doc: Document }) => void;

function setup() {
	const mainDocument = {} as Document;
	const popoutDocument = {} as Document;
	const eventRef = {} as EventRef;
	const domRegistrations: DomRegistration[] = [];
	let windowOpenCallback: WindowOpenCallback | undefined;

	const app = {
		workspace: {
			getActiveViewOfType: vi.fn(),
			on: vi.fn((name: string, callback: WindowOpenCallback) => {
				if (name === "window-open") {
					windowOpenCallback = callback;
				}

				return eventRef;
			}),
		},
		vault: {
			on: vi.fn(() => eventRef),
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
		popoutDocument,
		service: new ActivityService(host, metadataUpdateService),
		triggerWindowOpen: () => {
			if (windowOpenCallback === undefined) {
				throw new Error("window-open handler was not registered");
			}

			windowOpenCallback({ doc: popoutDocument });
		},
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ActivityService", () => {
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
