import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import { moment } from 'obsidian';

import * as BOMS from './BOMS';
import * as CAMS from './CAMS';
import {
	DEFAULT_SETTINGS,
	TimeThingsSettings,
	TimeThingsSettingsTab,
} from './settings';
import * as timeUtils from './time.utils';

export default class TimeThings extends Plugin {
	settings: TimeThingsSettings;
	isDebugBuild: boolean;
	clockBar: HTMLElement;    // # Required
	debugBar: HTMLElement;
	editDurationBar: HTMLElement;
	allowEditDurationUpdate: boolean;
	isProccessing = false;

	async onload() {
		await this.loadSettings();

		// Variables initialization
		this.isDebugBuild = false;    // for debugging purposes
		this.allowEditDurationUpdate = true;

		this.setUpStatusBarItems();

		// Events initialization
		this.registerFileModificationEvent();
		this.registerKeyDownDOMEvent();
		this.registerLeafChangeEvent();
		this.registerMouseDownDOMEvent();
		
		this.addSettingTab(new TimeThingsSettingsTab(this.app, this));
	}

	registerMouseDownDOMEvent() {
		this.registerDomEvent(document, 'mousedown', (evt: MouseEvent) => {

			// Prepare everything

			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
			const editor: Editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}

			// Change the duration icon in status bar

			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				if (this.settings.enableEditDurationKey) {
					this.setEditDurationBar(true, editor);
				}
			}
		});
	}

	registerLeafChangeEvent() {
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {

			// Prepare everything

			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}

			// Change the duration icon in status bar

			this.settings.enableEditDurationKey && this.settings.useCustomFrontmatterHandlingSolution && this.setEditDurationBar(true, editor);
		}));
	}

	registerKeyDownDOMEvent() {
		this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent) => {

			// If CAMS enabled

			if (evt.ctrlKey) {
				return;
			}

			if (this.settings.useCustomFrontmatterHandlingSolution === true) {

				// Make sure the document is ready for edit

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
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

				// Update "updated_at"

				const dateNow = moment();
				const userDateFormat = this.settings.modifiedKeyFormat;
				const dateFormatted = dateNow.format(userDateFormat);
				const userModifiedKeyName = this.settings.modifiedKeyName;
				const valueLineNumber = CAMS.getLine(editor, userModifiedKeyName);
				if (typeof valueLineNumber !== 'number') {
					if (this.isDebugBuild) {
						console.log("Not a number");
					}
					return;
				}
				const value = editor.getLine(valueLineNumber).split(/:(.*)/s)[1].trim();
				if (moment(value, userDateFormat, true).isValid() === false) {    // Little safecheck in place to reduce chance of bugs
					if (this.isDebugBuild) {
						console.log("Wrong format");
					}
					return;
				}
				CAMS.setValue(editor, userModifiedKeyName, dateFormatted);

				// Update duration icon in status bar

				if (this.settings.enableEditDurationKey) {
					this.allowEditDurationUpdate && this.updateEditDuration(editor);
					this.setEditDurationBar(true, editor);
				}
			}
		});
	}

	registerFileModificationEvent() {
		this.registerEvent(this.app.vault.on('modify', (file) => {

			// Make everything ready for edit

			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor: Editor = activeView.editor;

			if (this.settings.useCustomFrontmatterHandlingSolution === false) {

				// If CAMS disabled

				if (this.settings.enableEditDurationKey) {

					// Update duration icon in status bar

					this.allowEditDurationUpdate && this.standardUpdateEditDuration(file);
					this.setEditDurationBar(false, file);
				}
				if (this.settings.enableModifiedKeyUpdate)
				{

					// Update "updated_at"

					this.standardUpdateModifiedKey(file);
				}
			}
		}));
	}

	setUpStatusBarItems() {
		if (this.settings.enableClock) { // Add clock icon
			// Adds a status bar
			this.clockBar = this.addStatusBarItem();
			this.clockBar.setText(":)")

			// Change status bar text every second
			this.updateClockBar();
			this.registerInterval(
				window.setInterval(this.updateClockBar.bind(this), +this.settings.updateIntervalMilliseconds)
			);
		}

		if (this.isDebugBuild) { // Add DEBUG icon
			this.debugBar = this.addStatusBarItem();
			this.debugBar.setText("☢️ DEBUG BUILD ☢️")
		}

		if (this.settings.enableEditDurationKey) { // Ad duration icon
			this.editDurationBar = this.addStatusBarItem();
			this.editDurationBar.setText("⌛");
		}
	}

	setEditDurationBar(useCustomSolution: false, solution: TAbstractFile): void;
	setEditDurationBar(useCustomSolution: true, solution: Editor): void;
	async setEditDurationBar(useCustomSolution: boolean, solution: Editor | TAbstractFile) { // what the hell is this monstrosity
		let value = 0;
		if (solution instanceof Editor) {
			let editor = solution;
			const fieldLine = CAMS.getLine(editor, this.settings.editDurationPath);
			if (fieldLine === undefined) {
				this.editDurationBar.setText("⌛ --");
				return;
			}
			value = +editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		}
		if (solution instanceof TAbstractFile) {
			let file = solution;
			await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
				value = BOMS.getValue(frontmatter, this.settings.editDurationPath);
				if (value === undefined) {
					value = 0;
				}
			})
		}
		let text = "";
		if (+value < 60) {
			text = `⌛ <1 m`;
		}
		else if (+value < 60 * 60) {
			const minutes = Math.floor(+value / 60);
			text = `⌛ ${minutes} m`;
		}
		else if (+value < 60 * 60 * 24) {
			const hours = Math.floor(+value / (60 * 60));
			const minutes = Math.floor((+value - (hours * 60 * 60)) / 60);
			text = `⌛ ${hours} h ${minutes} m`;
		}
		else {
			const days = Math.floor(+value / (24 * 60 * 60));
			const hours = Math.floor((+value - (days * 24 * 60 * 60)) / (60 * 60));
			text = `⌛ ${days} d ${hours} h`;
		}
		this.editDurationBar.setText(text);
	}

	async updateEditDuration(editor: Editor) {

		// Prepare everything

		this.allowEditDurationUpdate = false;
		const fieldLine = CAMS.getLine(editor, this.settings.editDurationPath);
		if (fieldLine === undefined) {
			this.allowEditDurationUpdate = true;
			return;
		}

		// Increment

		const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		const newValue = +value + 1;
		CAMS.setValue(editor, this.settings.editDurationPath, newValue.toString());

		// Cool down

		await sleep(1000 - (this.settings.nonTypingEditingTimePercentage * 10));
		this.allowEditDurationUpdate = true;
	}

	async standardUpdateEditDuration(file: TAbstractFile) {

		// Prepare everything

		this.allowEditDurationUpdate = false;
		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			let value = BOMS.getValue(frontmatter, this.settings.editDurationPath);
			if (value === undefined) {
				value = "0";
			}

			// Increment

			const newValue = +value + 10;
			BOMS.setValue(frontmatter, this.settings.editDurationPath, newValue);
		})

		// Cool down

		await sleep(10000 - (this.settings.nonTypingEditingTimePercentage * 100));
		this.allowEditDurationUpdate = true;
	}
	
	updateClockBar() {
		const dateNow = moment();
		const dateUTC = moment.utc();    // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = timeUtils.momentToClockEmoji(dateChosen);

		this.clockBar.setText(emoji + " " + dateFormatted);
	}

	async standardUpdateModifiedKey(file: TAbstractFile) {

		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			const dateNow = moment();
			const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);

			const updateKeyValue = moment(BOMS.getValue(frontmatter, this.settings.modifiedKeyName), this.settings.modifiedKeyFormat);
			
			if (updateKeyValue.add(this.settings.updateIntervalFrontmatterMinutes, 'minutes') > dateNow)
			{
				return;
			}
			
			BOMS.setValue(frontmatter, this.settings.modifiedKeyName, dateFormatted);
		})
	}
	
	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}