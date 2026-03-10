import { App, EventRef, MarkdownView } from "obsidian";
import {
	DOM_EVENTS,
	IGNORED_EDITOR_KEYS,
	VAULT_EVENTS,
} from "../../constants/plugin.constants";
import { TimeThingsSettings } from "../../settings/settings.types";
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
		this.host.registerDomEvent(document, DOM_EVENTS.keyUp, (event) => {
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
			if (
				activeView === null ||
				activeView.file === null ||
				!activeView.editor.hasFocus()
			) {
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
			this.host.app.vault.on(VAULT_EVENTS.modify, () => {
				if (this.host.settings.useCustomFrontmatterHandlingSolution) {
					return;
				}

				const activeView =
					this.host.app.workspace.getActiveViewOfType(MarkdownView);

				if (activeView?.file === null || activeView?.file === undefined) {
					return;
				}

				void this.metadataUpdateService.updateFileMetadata(activeView.file);
			}),
		);
	}

	private shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
		return event.ctrlKey || IGNORED_EDITOR_KEYS.includes(event.key);
	}
}
