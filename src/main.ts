import { Editor, MarkdownView, WorkspaceLeaf, Plugin, TAbstractFile, TFile, } from "obsidian";
import { moment } from "obsidian";
import { ExampleView, VIEW_TYPE_EXAMPLE } from "./lastedited.view";

import * as BOMS from "./BOMS";
import * as CAMS from "./CAMS";
import * as filesUtils from "./files.utils";
import {
	DEFAULT_SETTINGS,
	TimeThingsSettings,
	TimeThingsSettingsTab,
} from "./settings";
import * as timeUtils from "./time.utils";

export default class TimeThings extends Plugin {
	settings: TimeThingsSettings;
	isDebugBuild: boolean;
	clockBar: HTMLElement; // # Required
	debugBar: HTMLElement;
	editDurationBar: HTMLElement;
	allowEditDurationUpdate: boolean;
	isProccessing = false;

	async onload() {
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		);
		this.addRibbonIcon("dice", "Activate view", () => {
			this.activateView();
		});
		this.addRibbonIcon("dice", "Run the new command", () => {
			filesUtils.getFilesWithField("updated_at");
		});

		await this.loadSettings();

		// Variables initialization
		this.isDebugBuild = false; // for debugging purposes
		this.allowEditDurationUpdate = true;

		this.setUpStatusBarItems();

		// Events initialization
		this.registerFileModificationEvent();
		this.registerKeyDownDOMEvent();
		this.registerLeafChangeEvent();
		this.registerMouseDownDOMEvent();

		this.addSettingTab(new TimeThingsSettingsTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
	
		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}
	
		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	updateOnUserActivity(useCustomSolution: true, environment: Editor, options?: {updateMetadata: boolean}): void;
	updateOnUserActivity(useCustomSolution: false, environment: TAbstractFile, options?: {updateMetadata: boolean}): void;
	updateOnUserActivity(useCustomSolution: boolean, environment: Editor | TAbstractFile, options: {updateMetadata: boolean} = {updateMetadata: true}) {
		const { updateMetadata } = options;

		// Check if the file is in the blacklisted folder
		// Check if the file has a property that puts it into a blacklist
		// Check if the file itself is in the blacklist

		// Update status bar
		if (true)
		{
			if (useCustomSolution && environment instanceof Editor) {
				this.updateStatusBar(true, environment);
			}
			else if (!useCustomSolution && environment instanceof TAbstractFile) {
				this.updateStatusBar(false, environment);
			}
		}
		// Update metadata using either BOMS or cams
		if (updateMetadata)
		{
			if (useCustomSolution && this.settings.useCustomFrontmatterHandlingSolution && environment instanceof Editor) {
				// CAMS
				this.updateUpdatedAt(environment);
				if (this.settings.enableEditDurationKey)
				{
					this.updateEditDuration(environment);
				}
			}
			else if (!useCustomSolution && !this.settings.useCustomFrontmatterHandlingSolution && environment instanceof TAbstractFile) {
				// BOMS
				this.standardUpdateModifiedKey(environment);
				if (this.settings.enableEditDurationKey)
				{
					this.standardUpdateEditDuration(environment);
				}
			}
		}
	}


	updateStatusBar(useCustomSolution: true, environment: Editor): void;
	updateStatusBar(useCustomSolution: false, environment: TAbstractFile): void;
	updateStatusBar(useCustomSolution: boolean, environment: Editor | TAbstractFile) {
		// Update edit duration
		if (useCustomSolution && environment instanceof Editor) {
			this.setEditDurationBar(true, environment);
		}
		else if (!useCustomSolution && environment instanceof TAbstractFile)
		{
			this.setEditDurationBar(false, environment);
		}
		// Update clock (maybe not)
	}

	registerMouseDownDOMEvent() {
		this.registerDomEvent(document, "mousedown", (evt: MouseEvent) => {
			// Prepare everything

			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor: Editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}

			this.updateOnUserActivity(true, editor, {updateMetadata: false});
		});
	}

	registerLeafChangeEvent() {
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				// Prepare everything

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
				const editor = activeView.editor;
				if (editor.hasFocus() === false) {
					return;
				}

				// Change the duration icon in status bar

				this.updateOnUserActivity(true, editor, {updateMetadata: false});
			}),
		);
	}

	registerKeyDownDOMEvent() {
		this.registerDomEvent(document, "keyup", (evt: KeyboardEvent) => {
			// If CAMS enabled
			const ignoreKeys = [
				"ArrowDown",
				"ArrowUp",
				"ArrowLeft",
				"ArrowRight",
				"Tab",
				"CapsLock",
				"Alt",
				"PageUp",
				"PageDown",
				"Home",
				"End",
				"Meta",
				"Escape",
			];

			if (evt.ctrlKey || ignoreKeys.includes(evt.key)) {
				return;
			}

			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				// Make sure the document is ready for edit

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					if (this.isDebugBuild) {
						console.log("No active view");
					}
					return;
				}
				const editor: Editor = activeView.editor;
				if (editor.hasFocus() === false) {
					if (this.isDebugBuild) {
						console.log("No focus");
					}
					return;
				}

				// Update everything

				this.updateOnUserActivity(true, editor);
			}
		});
	}

	updateUpdatedAt(editor: Editor) {
		const dateNow = moment();
		const userDateFormat = this.settings.modifiedKeyFormat;
		const dateFormatted = dateNow.format(userDateFormat);

		const userModifiedKeyName = this.settings.modifiedKeyName;
		const valueLineNumber = CAMS.getLine(editor,userModifiedKeyName,);

		if (typeof valueLineNumber !== "number") {
			if (this.isDebugBuild) {
				console.log("Not a number");
			}
			return;
		}
		const value = editor
			.getLine(valueLineNumber)
			.split(/:(.*)/s)[1]
			.trim();
		if (moment(value, userDateFormat, true).isValid() === false) {
			// Little safecheck in place to reduce chance of bugs
			if (this.isDebugBuild) {
				console.log("Wrong format");
			}
			return;
		}
		CAMS.setValue(editor, userModifiedKeyName, dateFormatted);
	}

	registerFileModificationEvent() {
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				// Make everything ready for edit

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}

				// Main
				if (this.settings.useCustomFrontmatterHandlingSolution === false)
				{
					this.updateOnUserActivity(false, file);
				}
			}),
		);
	}

	setUpStatusBarItems() {
		if (this.settings.enableClock) {
			// Add clock icon
			// Adds a status bar
			this.clockBar = this.addStatusBarItem();
			this.clockBar.setText(":)");

			// Change status bar text every second
			this.updateClockBar();
			this.registerInterval(
				window.setInterval(
					this.updateClockBar.bind(this),
					+this.settings.updateIntervalMilliseconds,
				),
			);
		}

		if (this.isDebugBuild) {
			// Add DEBUG icon
			this.debugBar = this.addStatusBarItem();
			this.settings.showEmojiStatusBar
				? this.debugBar.setText("☢️ DEBUG BUILD ☢️")
				: this.debugBar.setText("/ DEBUG BUILD /");
		}

		if (this.settings.enableEditDurationKey) {
			// Ad duration icon
			this.editDurationBar = this.addStatusBarItem();
			this.settings.showEmojiStatusBar
				? this.editDurationBar.setText("⌛")
				: this.editDurationBar.setText("/");
		}
	}

	setEditDurationBar(useCustomSolution: false, solution: TAbstractFile): void;
	setEditDurationBar(useCustomSolution: true, solution: Editor): void;
	async setEditDurationBar(useCustomSolution: boolean, solution: Editor | TAbstractFile,) {
		// what the hell is this monstrosity
		let value = 0;
		if (solution instanceof Editor) {
			const editor = solution;
			const fieldLine = CAMS.getLine(
				editor,
				this.settings.editDurationPath,
			);
			if (fieldLine === undefined) {
				this.editDurationBar.setText("⌛ --");
				return;
			}
			value = +editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		}
		if (solution instanceof TAbstractFile) {
			const file = solution;
			await this.app.fileManager.processFrontMatter(
				file as TFile,
				(frontmatter) => {
					value = BOMS.getValue(
						frontmatter,
						this.settings.editDurationPath,
					);
					if (value === undefined) {
						value = 0;
					}
				},
			);
		}
		let text = "";
		if (+value < 60) {
			text = this.settings.showEmojiStatusBar ? `⌛ <1 m` : `<1 m`;
		} else if (+value < 60 * 60) {
			const minutes = Math.floor(+value / 60);
			text = this.settings.showEmojiStatusBar
				? `⌛ ${minutes} m`
				: `${minutes} m`;
		} else if (+value < 60 * 60 * 24) {
			const hours = Math.floor(+value / (60 * 60));
			const minutes = Math.floor((+value - hours * 60 * 60) / 60);
			text = this.settings.showEmojiStatusBar
				? `⌛ ${hours} h ${minutes} m`
				: `${hours} h ${minutes} m`;
		} else {
			const days = Math.floor(+value / (24 * 60 * 60));
			const hours = Math.floor(
				(+value - days * 24 * 60 * 60) / (60 * 60),
			);
			text = this.settings.showEmojiStatusBar
				? `⌛ ${days} d ${hours} h`
				: `${days} d ${hours} h`;
		}
		this.editDurationBar.setText(text);
	}

	async updateEditDuration(editor: Editor) {
		// Prepare everything
		if (this.allowEditDurationUpdate === false) {
			return;
		}
		this.allowEditDurationUpdate = false;
		const fieldLine = CAMS.getLine(editor, this.settings.editDurationPath);
		if (fieldLine === undefined) {
			this.allowEditDurationUpdate = true;
			return;
		}

		// Increment

		const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		const newValue = +value + 1;
		CAMS.setValue(
			editor,
			this.settings.editDurationPath,
			newValue.toString(),
		);

		// Cool down

		await sleep(1000 - this.settings.nonTypingEditingTimePercentage * 10);
		this.allowEditDurationUpdate = true;
	}

	async standardUpdateEditDuration(file: TAbstractFile) {
		// Prepare everything
		if (this.allowEditDurationUpdate === false)
		{
			return;
		}
		this.allowEditDurationUpdate = false;
		await this.app.fileManager.processFrontMatter(
			file as TFile,
			(frontmatter) => {
				let value = BOMS.getValue(
					frontmatter,
					this.settings.editDurationPath,
				);
				if (value === undefined) {
					value = "0";
				}

				// Increment

				const newValue = +value + 10;
				BOMS.setValue(
					frontmatter,
					this.settings.editDurationPath,
					newValue,
				);
			},
		);

		// Cool down

		await sleep(10000 - this.settings.nonTypingEditingTimePercentage * 100);
		this.allowEditDurationUpdate = true;
	}

	updateClockBar() {
		const dateNow = moment();
		const dateUTC = moment.utc(); // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = timeUtils.momentToClockEmoji(dateChosen);

		this.settings.showEmojiStatusBar
			? this.clockBar.setText(emoji + " " + dateFormatted)
			: this.clockBar.setText(dateFormatted);
	}

	async standardUpdateModifiedKey(file: TAbstractFile) {
		await this.app.fileManager.processFrontMatter(
			file as TFile,
			(frontmatter) => {
				const dateNow = moment();
				const dateFormatted = dateNow.format(
					this.settings.modifiedKeyFormat,
				);

				const updateKeyValue = moment(
					BOMS.getValue(frontmatter, this.settings.modifiedKeyName),
					this.settings.modifiedKeyFormat,
				);

				if (
					updateKeyValue.add(
						this.settings.updateIntervalFrontmatterMinutes,
						"minutes",
					) > dateNow
				) {
					return;
				}

				BOMS.setValue(
					frontmatter,
					this.settings.modifiedKeyName,
					dateFormatted,
				);
			},
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
