import { App, EventRef, MarkdownView, TFile } from "obsidian";
import type { TimeThingsSettings } from "../../shared/config";
import { formatDurationTemplate } from "../../shared/lib/datetime";
import {
	findFrontmatterFieldLine,
	readFrontmatterFieldValueAtLine,
} from "../../shared/lib/frontmatter";

interface EditDurationStatusHost {
	app: App;
	settings: TimeThingsSettings;
	addStatusBarItem(): HTMLElement;
	registerEvent(eventRef: EventRef): void;
}

export class EditDurationStatusService {
	private statusBar?: HTMLElement;

	constructor(private readonly host: EditDurationStatusHost) {}

	initialize() {
		this.host.registerEvent(
			this.host.app.workspace.on("active-leaf-change", () => this.renderActiveNote()),
		);
		this.host.registerEvent(
			this.host.app.vault.on("modify", (file) => {
				const activeView = this.getActiveView();
				if (file instanceof TFile && activeView?.file === file) {
					this.renderActiveNote();
				}
			}),
		);

		this.refresh();
	}

	refresh() {
		if (!this.isEnabled()) {
			this.statusBar?.remove();
			this.statusBar = undefined;
			return;
		}

		this.statusBar ??= this.host.addStatusBarItem();
		this.renderActiveNote();
	}

	renderFileDuration(file: TFile, totalSeconds: number) {
		if (this.getActiveView()?.file !== file) {
			return;
		}

		this.renderSeconds(totalSeconds);
	}

	private renderActiveNote() {
		if (this.statusBar === undefined) {
			return;
		}

		const activeView = this.getActiveView();
		if (activeView === null || activeView.file === null) {
			this.renderUnavailable();
			return;
		}

		const lineNumber = findFrontmatterFieldLine(
			activeView.editor,
			this.host.settings.editDurationPath,
		);
		const rawValue =
			lineNumber === undefined
				? undefined
				: readFrontmatterFieldValueAtLine(activeView.editor, lineNumber);
		const totalSeconds = rawValue === undefined ? Number.NaN : Number(rawValue);

		if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
			this.renderUnavailable();
			return;
		}

		this.renderSeconds(totalSeconds);
	}

	private renderSeconds(totalSeconds: number) {
		if (this.statusBar === undefined) {
			return;
		}

		this.statusBar.setText(
			formatDurationTemplate(totalSeconds, this.host.settings.editDurationStatusBarFormat),
		);
	}

	private renderUnavailable() {
		this.statusBar?.setText("⌛ --");
	}

	private getActiveView() {
		return this.host.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private isEnabled() {
		return (
			this.host.settings.enableEditDurationKey && this.host.settings.showEditDurationStatusBar
		);
	}
}
