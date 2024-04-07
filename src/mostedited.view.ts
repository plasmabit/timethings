import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import * as filesUtils from "./files.utils";
import * as timeTools from "./time.utils";

export const VIEW_TYPE_MOST_EDITED = "example-view";

export interface FileEditedSecondsMap {
	file: TFile;
	value: number;
}

export class MostEditedView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_MOST_EDITED;
	}

	getDisplayText() { // view title
		return "Most edited files";
	}

	async onOpen() {
        const formatString = "h[h] m[m]";
		const container = this.containerEl.children[1];
		container.empty();

		// Get cache
		const cache = this.app.metadataCache;
		// Get all files with the field
		const superFiles = filesUtils.getFilesWithField("edited_seconds");
		// Initialize a new hashmap for tidy sort
		const fileEditedSecondsMap: FileEditedSecondsMap[] = [];
		// A variable for total
		let totalSeconds = 0;
		// Populate the hashmap
		for (const file of superFiles) {
			const fileCache = cache.getFileCache(file);
			if (!fileCache || !fileCache.frontmatter) {
				continue;
			}
			const editedSeconds = fileCache.frontmatter["edited_seconds"];
			if (editedSeconds !== undefined && editedSeconds > 59) {
				fileEditedSecondsMap.push({
					file,
					value: editedSeconds as number,
				});
				totalSeconds += editedSeconds as number;
			}
		}
		// Sort the hashmap
		fileEditedSecondsMap.sort((a, b) => b.value - a.value);
		//
		const ttTop = container.createEl("div", {});
		ttTop.appendChild(
			container.createEl("h2", { text: "Most edited notes" }),
		);
		ttTop.appendChild(
			container.createEl("p", {
				text:
					"Total time spent editing: " +
					timeTools.formatSeconds(totalSeconds, formatString),
			}),
		);
		// Display the items
		const wrapper = container.createEl("div", { cls: "tt-wrapper" });
		for (const entry of fileEditedSecondsMap) {
			// Set up
			const file = entry.file;
			const editedSeconds = entry.value;
			const oneFileTitle = wrapper.appendChild(
				container.createEl("div", {
					cls: "tree-item-self is-clickable nav-file-title tt-title",
				}),
			);
			oneFileTitle.appendChild(
				createEl("div", {
					text: file.basename,
					cls: "tree-item-inner nav-file-title-content tt-title-content",
				}),
			);
			oneFileTitle.appendChild(
				createEl("div", {
					text: timeTools.formatSeconds(editedSeconds, formatString),
					cls: "flexblock",
				}),
			);
			oneFileTitle.addEventListener("mouseover", (event: MouseEvent) => {
				this.app.workspace.trigger("hover-link", {
					event,
					source: VIEW_TYPE_MOST_EDITED,
					hoverParent: oneFileTitle,
					targetEl: oneFileTitle,
					linktext: file.path,
				});
			});
			oneFileTitle.addEventListener("click", (event: MouseEvent) => {
				this.app.workspace
					.getLeavesOfType("markdown")[0]
					.openFile(file);
			});
		}
	}

	async onClose() {
		// Nothing to clean up.
	}
}
