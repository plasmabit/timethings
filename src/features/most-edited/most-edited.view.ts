import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import {
	MOST_EDITED_VIEW,
	MOST_EDITED_VIEW_CLASSES,
	VIEW_TYPES,
	WORKSPACE_EVENTS,
	WORKSPACE_LEAF_TYPES,
} from "../../constants/plugin.constants";
import { formatSeconds } from "../../utils/time-format";
import { MostEditedEntry, MostEditedService } from "./most-edited.service";

export class MostEditedView extends ItemView {
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
		const entries = service.getMostEditedEntries();
		const totalEditedSeconds = service.getTotalEditedSeconds(entries);

		this.contentEl.empty();
		this.renderHeader(totalEditedSeconds);
		this.renderEntries(entries);
	}

	private renderHeader(totalEditedSeconds: number) {
		const header = this.contentEl.createEl("div");

		header.appendChild(
			this.contentEl.createEl("h2", { text: MOST_EDITED_VIEW.title }),
		);
		header.appendChild(
			this.contentEl.createEl("p", {
				text:
					MOST_EDITED_VIEW.totalTimePrefix +
					formatSeconds(totalEditedSeconds, MOST_EDITED_VIEW.durationFormat),
			}),
		);
	}

	private renderEntries(entries: readonly MostEditedEntry[]) {
		const wrapper = this.contentEl.createEl("div", {
			cls: MOST_EDITED_VIEW_CLASSES.wrapper,
		});

		for (const entry of entries) {
			this.renderEntryRow(wrapper, entry);
		}
	}

	private renderEntryRow(wrapper: HTMLElement, entry: MostEditedEntry) {
		const row = wrapper.createEl("div", {
			cls: MOST_EDITED_VIEW_CLASSES.row,
		});

		row.appendChild(
			createEl("div", {
				text: entry.file.basename,
				cls: MOST_EDITED_VIEW_CLASSES.title,
			}),
		);
		row.appendChild(
			createEl("div", {
				text: formatSeconds(
					entry.editedSeconds,
					MOST_EDITED_VIEW.durationFormat,
				),
				cls: MOST_EDITED_VIEW_CLASSES.value,
			}),
		);

		row.addEventListener("mouseover", (event: MouseEvent) => {
			this.app.workspace.trigger(WORKSPACE_EVENTS.hoverLink, {
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
		const markdownLeaf =
			this.app.workspace.getLeavesOfType(WORKSPACE_LEAF_TYPES.markdown)[0];

		if (markdownLeaf instanceof WorkspaceLeaf) {
			await markdownLeaf.openFile(file);
		}
	}
}
