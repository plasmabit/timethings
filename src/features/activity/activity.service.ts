import { App, EventRef, MarkdownView, TFile } from "obsidian";
import type { TimeThingsSettings } from "../../shared/config";
import { COOLDOWN_DURATIONS, IGNORED_EDITOR_KEYS } from "./activity.constants";
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
	private readonly handledDocuments = new WeakSet<Document>();
	private readonly frontmatterUpdateTimers = new Map<string, number>();
	private readonly frontmatterUpdatesInProgress = new Set<string>();

	constructor(
		private readonly host: ActivityServiceHost,
		private readonly metadataUpdateService: MetadataUpdateService,
	) {}

	registerHandlers() {
		this.registerEditorActivityHandler();
		this.registerFrontmatterActivityHandler();
	}

	unload() {
		for (const timer of this.frontmatterUpdateTimers.values()) {
			window.clearTimeout(timer);
		}
		this.frontmatterUpdateTimers.clear();
	}

	private registerEditorActivityHandler() {
		this.registerKeyupHandler(document);

		this.host.registerEvent(
			this.host.app.workspace.on("window-open", (workspaceWindow) => {
				this.registerKeyupHandler(workspaceWindow.doc);
			}),
		);
	}

	private registerKeyupHandler(doc: Document) {
		if (this.handledDocuments.has(doc)) {
			return;
		}
		this.handledDocuments.add(doc);

		this.host.registerDomEvent(doc, "keyup", (event) => {
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
			this.host.app.workspace.on("editor-change", (_editor, info) => {
				if (
					this.host.settings.useCustomFrontmatterHandlingSolution ||
					!(info.file instanceof TFile)
				) {
					return;
				}

				this.scheduleFrontmatterUpdate(info.file);
			}),
		);

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

				this.scheduleFrontmatterUpdate(file);
			}),
		);
	}

	private scheduleFrontmatterUpdate(file: TFile) {
		if (this.frontmatterUpdatesInProgress.has(file.path)) {
			return;
		}

		const currentTimer = this.frontmatterUpdateTimers.get(file.path);
		if (currentTimer !== undefined) {
			window.clearTimeout(currentTimer);
		}

		const timer = window.setTimeout(() => {
			this.frontmatterUpdateTimers.delete(file.path);
			void this.runFrontmatterUpdate(file);
		}, COOLDOWN_DURATIONS.frontmatterWriteDelayMilliseconds);
		this.frontmatterUpdateTimers.set(file.path, timer);
	}

	private async runFrontmatterUpdate(file: TFile) {
		if (
			this.host.settings.useCustomFrontmatterHandlingSolution ||
			this.frontmatterUpdatesInProgress.has(file.path)
		) {
			return;
		}

		this.frontmatterUpdatesInProgress.add(file.path);
		try {
			await this.metadataUpdateService.updateFileMetadata(file);
		} finally {
			this.frontmatterUpdatesInProgress.delete(file.path);
		}
	}

	private shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
		return event.ctrlKey || IGNORED_EDITOR_KEYS.includes(event.key);
	}
}
