import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import { moment } from "obsidian";

// Remember to rename these classes and interfaces!

interface TimeThingsSettings {
	clockFormat: string;
	isUTC: boolean;
	updateIntervalMilliseconds: string;
	modifiedKeyName: string;
	modifiedKeyFormat: string;
	enableClock: boolean;
	enableModifiedKeyUpdate: boolean;
	useCustomFrontmatterHandlingSolution: boolean;
	updateIntervalFrontmatterMinutes: number;
	editDurationPath: string,
	enableEditDurationKey: boolean,
	nonTypingEditingTimePercentage: number,
}

const DEFAULT_SETTINGS: TimeThingsSettings = {
	clockFormat: 'HH:mm:ss',
	updateIntervalMilliseconds: '1000',
	isUTC: false,
	modifiedKeyName: 'updated_at',
	modifiedKeyFormat: 'YYYY-MM-DD[T]HH:mm:ss.SSSZ',
	enableClock: true,
	enableModifiedKeyUpdate: true,
	useCustomFrontmatterHandlingSolution: false,
	updateIntervalFrontmatterMinutes: 1,
	editDurationPath: "edited_seconds",
	enableEditDurationKey: true,
	nonTypingEditingTimePercentage: 22,
}

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
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
			const editor: Editor = activeView.editor;
			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				if (this.settings.enableEditDurationKey) {
					this.setEditDurationBar(true, editor);
				}
			}
		});
	}

	registerLeafChangeEvent() {
		this.registerEvent(this.app.workspace.on("active-leaf-change", (file) => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor = activeView.editor;
			this.settings.enableEditDurationKey && this.settings.useCustomFrontmatterHandlingSolution && this.setEditDurationBar(true, editor);
		}));
	}

	registerKeyDownDOMEvent() {
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				const dateNow = moment();
				const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
				const editor: Editor = activeView.editor;
	
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
			const fieldLine = this.getFieldLine(editor, this.settings.editDurationPath);
			if (fieldLine === undefined) {
				this.editDurationBar.setText("⌛ --");
				return;
			}
			value = +editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		}
		if (solution instanceof TAbstractFile) {
			let file = solution;
			await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
				value = this.standardGetValue(frontmatter, this.settings.editDurationPath);
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
		const fieldLine = this.getFieldLine(editor, this.settings.editDurationPath);
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
			let value = this.standardGetValue(frontmatter, this.settings.editDurationPath);
			if (value === undefined) {
				value = "0";
			}
			const newValue = +value + 10;

			this.standardSetValue(frontmatter, this.settings.editDurationPath, newValue);
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
		const fieldLine = this.getFieldLine(editor, fieldPath);
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

	getFieldLine(editor: Editor, fieldPath: string): number | undefined {
		const frontmatterEndLine = this.frontmatterEndLine(editor);
		const keys = fieldPath.split('.');
		const depth = keys.length;

		if (frontmatterEndLine === undefined) {
			return undefined;
		}

		let targetDepth = 1;
		let currentDepth = 1;
		let startLine = 1;
		let emergingPath = [];

		for (const key of keys) {
			for (let i = startLine; i <= frontmatterEndLine; i++) {

				const currentLine = editor.getLine(i);
				const currentField = currentLine.split(':');
				const currentFieldName = currentField[0].trim();

				if (currentFieldName === key) {
					emergingPath.push(currentFieldName);
					this.isDebugBuild && console.log(emergingPath);
					let targetPath = fieldPath.split('.');
					let targetPathShrink = targetPath.slice(0, emergingPath.length);
					if (targetPathShrink.join('.') === emergingPath.join('.') === false) {
						this.isDebugBuild && console.log("Path wrong: " + emergingPath + " | " + targetPathShrink);
						emergingPath.pop();
						startLine = i + 1;
						continue;
					}
					else {
						if (emergingPath.join('.') === fieldPath) {
							if (targetDepth > 1) {
								if (this.isLineIndented(currentLine) === false) {    // met first level variable, obviously return
									this.isDebugBuild && console.log("Not indented: " + i + " | " + currentLine + " | " + startLine)
									return undefined;
								}
							}
							else {
								if (this.isLineIndented(currentLine)) {
									startLine = i + 1;
									emergingPath = [];
									continue;
								}
							}
							return i;
						}
						startLine = i + 1;
						targetDepth += 1;
						continue;
					}
				}
			}
		}

		return undefined;
	}

	isLineIndented(line: string): boolean {
		return /^[\s\t]/.test(line);
	}

	async standardUpdateModifiedKey(file: TAbstractFile) {

		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			const dateNow = moment();
			const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);

			const updateKeyValue = moment(this.standardGetValue(frontmatter, this.settings.modifiedKeyName), this.settings.modifiedKeyFormat);
			
			if (updateKeyValue.add(this.settings.updateIntervalFrontmatterMinutes, 'minutes') > dateNow)
			{
				return;
			}
			
			this.standardSetValue(frontmatter, this.settings.modifiedKeyName, dateFormatted);
		})
	}

	standardGetValue(obj: any, fieldPath: string) {
		const keys = fieldPath.split('.');
		let value = obj;
	  
		for (const key of keys) {
		  value = value[key];
		  if (value === undefined) {
			return undefined;
		  }
		}
	
		return value;
	}

	standardSetValue(obj: any, path: string, value: any) {
		const keys = path.split('.');
		let currentLevel = obj;
	  
		for (let i = 0; i < keys.length - 1; i++) {
		  const key = keys[i];
		  if (!currentLevel[key]) {
			currentLevel[key] = {};
		  }
		  currentLevel = currentLevel[key];
		}
	
		currentLevel[keys[keys.length - 1]] = value;
	}

	getClockEmojiForHour(time: moment.Moment): string {
		const hour = time.hour();
		const hour12 = (hour % 12) || 12;

		const clockEmojiMapping = {
			1: '🕐', 2: '🕑', 3: '🕒', 4: '🕓', 5: '🕔', 6: '🕕',
			7: '🕖', 8: '🕗', 9: '🕘', 10: '🕙', 11: '🕚', 12: '🕛'
		};

		return clockEmojiMapping[hour12] || '⏰'; // Default emoji for unknown hours
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

class TimeThingsSettingsTab extends PluginSettingTab {
	plugin: TimeThings
;

	constructor(app: App, plugin: TimeThings
	) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const createLink = () => {
			const linkEl = document.createDocumentFragment();

			linkEl.append(
				linkEl.createEl('a', {
					href: 'https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/',
					text: 'Moment.js date format documentation'
				})
			)
			return linkEl;
		}

		new Setting(containerEl)
			.setName('Use custom frontmatter handling solution')
			.setDesc('Smoother experiene. Prone to bugs if you use a nested value.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useCustomFrontmatterHandlingSolution)
					.onChange(async (newValue) => {
						this.plugin.settings.useCustomFrontmatterHandlingSolution = newValue;
						await this.plugin.saveSettings();
						await this.display();
				}),);

		containerEl.createEl('h1', { text: 'Status bar' });
		containerEl.createEl('p', { text: 'Displays clock in the status bar.' });

		new Setting(containerEl)
			.setName('Enable status bar clock')
			.setDesc('Show clock on the status bar? This setting requires restart of the plugin.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableClock)
					.onChange(async (newValue) => {
						this.plugin.settings.enableClock = newValue;
						await this.plugin.saveSettings();
						await this.display();
				}),);

		if (this.plugin.settings.enableClock === true) {
			
			new Setting(containerEl)
				.setName('Date format')
				.setDesc(createLink())
				.addText(text => text
					.setPlaceholder('hh:mm A')
					.setValue(this.plugin.settings.clockFormat)
					.onChange(async (value) => {
						this.plugin.settings.clockFormat = value;
						await this.plugin.saveSettings();
					}));
			
			new Setting(containerEl)
				.setName('Update interval')
				.setDesc('In milliseconds. Restart plugin for this setting to take effect.')
				.addText(text => text
					.setPlaceholder('1000')
					.setValue(this.plugin.settings.updateIntervalMilliseconds)
					.onChange(async (value) => {
						this.plugin.settings.updateIntervalMilliseconds = value;
						await this.plugin.saveSettings();
					}));
	
			new Setting(containerEl)
				.setName('UTC timezone')
				.setDesc('Use UTC instead of local time?')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.isUTC)
						.onChange(async (newValue) => {
							this.plugin.settings.isUTC = newValue;
							await this.plugin.saveSettings();
				}),);

		}


		containerEl.createEl('h1', { text: 'Frontmatter' });
		containerEl.createEl('p', { text: 'Handles timestamp keys in frontmatter.' });
		containerEl.createEl('h2', { text: 'Modified key' });

		new Setting(containerEl)
			.setName('Enable update of the modified key')
			.setDesc('')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableModifiedKeyUpdate)
					.onChange(async (newValue) => {
						this.plugin.settings.enableModifiedKeyUpdate = newValue;
						await this.plugin.saveSettings();
						await this.display();
			}),);

		if (this.plugin.settings.enableModifiedKeyUpdate === true) {

			new Setting(containerEl)
			.setName('Modified key name')
			.setDesc('Supports nested keys. For example `timethings.updated_at`')
			.addText(text => text
				.setPlaceholder('updated_at')
				.setValue(this.plugin.settings.modifiedKeyName)
				.onChange(async (value) => {
					this.plugin.settings.modifiedKeyName = value;
					await this.plugin.saveSettings();
			}));
	
			new Setting(containerEl)
			.setName('Modified key format')
			.setDesc(createLink())
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD[T]HH:mm:ss.SSSZ')
				.setValue(this.plugin.settings.modifiedKeyFormat)
				.onChange(async (value) => {
					this.plugin.settings.modifiedKeyFormat = value;
					await this.plugin.saveSettings();
			}));

			if (this.plugin.settings.useCustomFrontmatterHandlingSolution === false) {

				new Setting(containerEl)
				.setName('Interval between updates')
				.setDesc('Only for Obsidian frontmatter API.')
				.addSlider((slider) =>
					slider
						.setLimits(1, 15, 1)
						.setValue(this.plugin.settings.updateIntervalFrontmatterMinutes)
						.onChange(async (value) => {
							this.plugin.settings.updateIntervalFrontmatterMinutes = value;
							await this.plugin.saveSettings();
				  })
				.setDynamicTooltip(),
				);
			}
		}


		containerEl.createEl('h2', { text: 'Edit duration key' });
		containerEl.createEl('p', { text: 'Track for how long you have been editing a note.' });

		new Setting(containerEl)
			.setName('Enable edit duration key')
			.setDesc('')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableEditDurationKey)
					.onChange(async (newValue) => {
						this.plugin.settings.enableEditDurationKey = newValue;
						await this.plugin.saveSettings();
						await this.display();
						// await this.plugin.editDurationBar.toggle(this.plugin.settings.enableEditDurationKey);
		}),);

		if (this.plugin.settings.enableEditDurationKey === true) {

			new Setting(containerEl)
			.setName('Edit duration key name')
			.setDesc('Supports nested keys. For example `timethings.edited_seconds`')
			.addText(text => text
				.setPlaceholder('edited_seconds')
				.setValue(this.plugin.settings.editDurationPath)
				.onChange(async (value) => {
					this.plugin.settings.editDurationPath = value;
					await this.plugin.saveSettings();
			}));

			const descA = document.createDocumentFragment();
			descA.append(
				'The portion of time you are not typing when editing a note. Works best with custom frontmatter handling solution. ',
				createEl("a", {
					href: "https://github.com/DynamicPlayerSector/timethings/wiki/Calculating-your-non%E2%80%90typing-editing-percentage",
					text: "How to calculate yours?",
				}),
			)

			new Setting(containerEl)
			.setName('Non-typing editing time percentage')
			.setDesc(descA)
			.addSlider((slider) =>
				slider
					.setLimits(0, 40, 2)
					.setValue(this.plugin.settings.nonTypingEditingTimePercentage)
					.onChange(async (value) => {
						this.plugin.settings.nonTypingEditingTimePercentage = value;
						await this.plugin.saveSettings();
					})
			.setDynamicTooltip(),
			);

		}
		
	}
	
}