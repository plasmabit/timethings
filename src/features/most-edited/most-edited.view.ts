import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { MOST_EDITED_VIEW, MOST_EDITED_VIEW_CLASSES, VIEW_TYPES } from "./most-edited.constants";
import type { TimeThingsSettings } from "../../shared/config";
import { formatDurationHoursMinutes } from "../../shared/lib/datetime";
import { MostEditedEntry, MostEditedService } from "./most-edited.service";

export class MostEditedView extends ItemView {
	constructor(
		leaf: WorkspaceLeaf,
		private readonly getSettings: () => TimeThingsSettings,
	) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPES.mostEdited;
	}

	getDisplayText() {
		return MOST_EDITED_VIEW.displayText;
	}

	async onOpen() {
		this.renderView();
	}

	async onClose() {}

	private renderView() {
		const service = new MostEditedService(this.app);
		const settings = this.getSettings();
		const entries = service.getMostEditedEntries(
			settings.editDurationPath,
			settings.ignoredFolders,
			settings.ignoredFiles,
		);
		const totalEditedSeconds = service.getTotalEditedSeconds(entries);

		this.contentEl.empty();
		this.renderHeader(totalEditedSeconds);
		this.renderEntries(entries);
	}

	private renderHeader(totalEditedSeconds: number) {
		const header = this.contentEl.createDiv();

		header.createEl("h2", { text: MOST_EDITED_VIEW.title });
		header.createEl("p", {
			text: MOST_EDITED_VIEW.totalTimePrefix + formatDurationHoursMinutes(totalEditedSeconds),
		});
	}

	private renderEntries(entries: readonly MostEditedEntry[]) {
		const wrapper = this.contentEl.createDiv({
			cls: MOST_EDITED_VIEW_CLASSES.wrapper,
		});

		for (const entry of entries) {
			this.renderEntryRow(wrapper, entry);
		}
	}

	private renderEntryRow(wrapper: HTMLElement, entry: MostEditedEntry) {
		const row = wrapper.createDiv({
			cls: MOST_EDITED_VIEW_CLASSES.row,
		});

		row.createDiv({
			text: entry.file.basename,
			cls: MOST_EDITED_VIEW_CLASSES.title,
		});
		row.createDiv({
			text: formatDurationHoursMinutes(entry.editedSeconds),
			cls: MOST_EDITED_VIEW_CLASSES.value,
		});

		row.addEventListener("mouseover", (event: MouseEvent) => {
			this.app.workspace.trigger("hover-link", {
				event,
				source: VIEW_TYPES.mostEdited,
				hoverParent: row,
				targetEl: row,
				linktext: entry.file.path,
			});
		});
		row.addEventListener("click", () => {
			void this.openFile(entry.file);
		});
	}

	private async openFile(file: TFile) {
		const targetLeaf = this.getTargetLeaf();

		await targetLeaf.openFile(file);
		this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
		await this.app.workspace.revealLeaf(targetLeaf);
	}

	private getTargetLeaf(): WorkspaceLeaf {
		const existingMarkdownLeaf = this.app.workspace
			.getLeavesOfType("markdown")
			.find((leaf) => leaf !== this.leaf);

		if (existingMarkdownLeaf instanceof WorkspaceLeaf) {
			return existingMarkdownLeaf;
		}

		return this.app.workspace.getLeaf(false);
	}
}
