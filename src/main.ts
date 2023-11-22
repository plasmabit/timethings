import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import { moment } from 'obsidian';

import * as BOMS from './BOMS';
import * as CAMS from './CAMS';
import {
	DEFAULT_SETTINGS,
	TimeThingsSettings,
	TimeThingsSettingsTab,
} from './settings';

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
		this.isDebugBuild = true;    // for debugging purposes
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
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
			const editor: Editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}
			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				if (this.settings.enableEditDurationKey) {
					this.setEditDurationBar(true, editor);
				}
			}
		});
	}

	registerLeafChangeEvent() {
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}
			this.settings.enableEditDurationKey && this.settings.useCustomFrontmatterHandlingSolution && this.setEditDurationBar(true, editor);
		}));
	}

	registerKeyDownDOMEvent() {
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}

				const editor: Editor = activeView.editor;
				if (editor.hasFocus() === false) {
					return;
				}
				const dateNow = moment();
				const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);

				this.editorUpdateKey(editor, this.settings.modifiedKeyName, dateFormatted);
				if (this.settings.enableEditDurationKey) {
					this.allowEditDurationUpdate && this.updateEditDuration(editor);
					this.setEditDurationBar(true, editor);
				}
			}
		});
	}

	registerFileModificationEvent() {
		this.registerEvent(this.app.vault.on('modify', (file) => {
			console.log(file.path);
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor: Editor = activeView.editor;
			if (this.settings.useCustomFrontmatterHandlingSolution === false) {
				if (this.settings.enableEditDurationKey) {
					this.allowEditDurationUpdate && this.standardUpdateEditDuration(file);
					this.setEditDurationBar(false, file);
				}
				if (this.settings.enableModifiedKeyUpdate)
				{
					this.standardUpdateModifiedKey(file);
				}
			}
		}));
	}

	setUpStatusBarItems() {
		if (this.settings.enableClock) {
			// # Adds a status bar
			this.clockBar = this.addStatusBarItem();
			this.clockBar.setText(":)")

			// # Change status bar text every second
			this.updateClockBar();
			this.registerInterval(
				window.setInterval(this.updateClockBar.bind(this), +this.settings.updateIntervalMilliseconds)
			);
		}

		if (this.isDebugBuild) {
			this.debugBar = this.addStatusBarItem();
			this.debugBar.setText("☢️ DEBUG BUILD ☢️")
		}

		if (this.settings.enableEditDurationKey) {
			this.editDurationBar = this.addStatusBarItem();
			this.editDurationBar.setText("⌛");
		}
	}

	setEditDurationBar(useCustomSolution: false, solution: TAbstractFile): void;
	setEditDurationBar(useCustomSolution: true, solution: Editor): void;
	async setEditDurationBar(useCustomSolution: boolean, solution: Editor | TAbstractFile) {
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
		this.allowEditDurationUpdate = false;
		const fieldLine = CAMS.getLine(editor, this.settings.editDurationPath);
		if (fieldLine === undefined) {
			this.allowEditDurationUpdate = true;
			return;
		}
		const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		const newValue = +value + 1;
		this.editorUpdateKey(editor, this.settings.editDurationPath, newValue.toString());
		await sleep(1000 - (this.settings.nonTypingEditingTimePercentage * 10));
		this.allowEditDurationUpdate = true;
	}

	async standardUpdateEditDuration(file: TAbstractFile) {
		this.allowEditDurationUpdate = false;
		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			let value = BOMS.getValue(frontmatter, this.settings.editDurationPath);
			if (value === undefined) {
				value = "0";
			}
			const newValue = +value + 10;

			BOMS.setValue(frontmatter, this.settings.editDurationPath, newValue);
		})
		await sleep(10000 - (this.settings.nonTypingEditingTimePercentage * 100));
		this.allowEditDurationUpdate = true;
	}
	
	updateClockBar() {
		const dateNow = moment();
		const dateUTC = moment.utc();    // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = this.getClockEmojiForHour(dateChosen);

		this.clockBar.setText(emoji + " " + dateFormatted);
	}
	
	isFrontmatterPresent(editor: Editor): boolean {
		if (editor.getLine(0) !== "---") {
			return false;
		}
		for (let i = 1; i <= editor.lastLine(); i++) {
			if (editor.getLine(i) === "---") {
				return true;
			}
		}
		return false;
	}

	frontmatterEndLine(editor: Editor): number | undefined {
		if (this.isFrontmatterPresent(editor)) {
			for (let i = 1; i <= editor.lastLine(); i++) {
				if (editor.getLine(i) === "---") {
					return i;
				}
			}
		}
		return undefined; // # End line not found
	}

	editorUpdateKey(editor: Editor, fieldPath: string, fieldValue: string) {
		const fieldLine = CAMS.getLine(editor, fieldPath);
		if (fieldLine === undefined) {
			return;
		}
		if (fieldPath === this.settings.modifiedKeyName) {
			const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
			if (moment(value, this.settings.modifiedKeyFormat, true).isValid() === false) {    // Little safecheck in place to reduce chance of bugs
				this.isDebugBuild && console.log("not valid date");
				this.isDebugBuild && console.log(fieldLine);
				return;
			}
		}
		const initialLine = editor.getLine(fieldLine).split(':', 1);
		const newLine = initialLine[0] + ": " + fieldValue;
		editor.setLine(fieldLine, newLine);
	}

	isLineIndented(line: string): boolean {
		return /^[\s\t]/.test(line);
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

	getClockEmojiForHour(time: moment.Moment): string {
		const hour = time.hour();
		const hour12 = (hour % 12) || 12;

		type NumberDictionary = {
			[key: number]: string;
		};

		const clockEmojiMap: NumberDictionary = {
			1: '🕐', 2: '🕑', 3: '🕒', 4: '🕓', 5: '🕔', 6: '🕕',
			7: '🕖', 8: '🕗', 9: '🕘', 10: '🕙', 11: '🕚', 12: '🕛'
		};

		const result: string = clockEmojiMap[hour12] || '⏰'; // Default emoji for unknown hours
		return result;
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