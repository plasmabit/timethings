import { App, EventRef, MarkdownView, TFile } from "obsidian";
import type { TimeThingsSettings } from "../../shared/config";
import { IGNORED_EDITOR_KEYS } from "./activity.constants";
import { MetadataUpdateService } from "./metadata-update.service";

interface ActivityServiceHost {
	app: App;
	settings: TimeThingsSettings;
	registerDomEvent(
		element: Window | Document | HTMLElement,
		type: string,
		callback: (event: Event) => void,
		options?: AddEventListenerOptions | boolean,
	): void;
	registerEvent(eventRef: EventRef): void;
}

export class ActivityService {
	constructor(
		private readonly host: ActivityServiceHost,
		private readonly metadataUpdateService: MetadataUpdateService,
	) {}

	registerHandlers() {
		this.registerEditorActivityHandler();
		this.registerFrontmatterActivityHandler();
	}

	private registerEditorActivityHandler() {
		this.host.registerDomEvent(document, "keyup", (event) => {
			if (!(event instanceof KeyboardEvent)) {
				return;
			}

			if (
				!this.host.settings.useCustomFrontmatterHandlingSolution ||
				this.shouldIgnoreKeyboardEvent(event)
			) {
				return;
			}

			const activeView = this.host.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null || activeView.file === null || !activeView.editor.hasFocus()) {
				return;
			}

			void this.metadataUpdateService.updateEditorMetadata(
				activeView.file,
				activeView.editor,
			);
		});
	}

	private registerFrontmatterActivityHandler() {
		this.host.registerEvent(
			this.host.app.vault.on("modify", (file) => {
				if (this.host.settings.useCustomFrontmatterHandlingSolution) {
					return;
				}

				if (!(file instanceof TFile)) {
					return;
				}

				const activeView = this.host.app.workspace.getActiveViewOfType(MarkdownView);

				if (activeView?.file !== file) {
					return;
				}

				void this.metadataUpdateService.updateFileMetadata(file);
			}),
		);
	}

	private shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
		return event.ctrlKey || IGNORED_EDITOR_KEYS.includes(event.key);
	}
}
