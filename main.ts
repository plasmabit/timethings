import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';
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
	updateIntervalFrontmatterMinutes: 1
}

export default class TimeThings extends Plugin {
	settings: TimeThingsSettings;
	isDB: boolean;
	statusBar: HTMLElement;    // # Required
	debugBar: HTMLElement;
	isProccessing = false;

	async onload() {
		await this.loadSettings();

		this.isDB = false;    // for debugging purposes

		if (this.settings.enableClock)
		{
			// # Adds a status bar
			this.statusBar = this.addStatusBarItem();
			this.statusBar.setText(":)")

			// # Change status bar text every second
			this.updateStatusBar();
			this.registerInterval(
				window.setInterval(this.updateStatusBar.bind(this), +this.settings.updateIntervalMilliseconds)
			);
		}

		if (this.isDB) {
			this.debugBar = this.addStatusBarItem();
			this.debugBar.setText("Time Things Debug Build")
		}

		// # On file modification
		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				return;
			}
			if (this.settings.enableModifiedKeyUpdate)
			{
				this.objectUpdateModifiedKey(file);

			}
		}))

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (this.settings.useCustomFrontmatterHandlingSolution === false) {
				return;
			}
			const dateNow = moment();
			const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor: Editor = activeView.editor;

			this.editorUpdateKey(editor, this.settings.modifiedKeyName, dateFormatted);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TimeThingsSettingsTab(this.app, this));
	}
	
	updateStatusBar() {
		const dateNow = moment();
		const dateUTC = moment.utc();    // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = this.getClockEmojiForHour(dateChosen);

		this.statusBar.setText(emoji + " " + dateFormatted);
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
		const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		if (moment(value, this.settings.modifiedKeyFormat, true).isValid() === false) {    // Little safecheck in place to reduce chance of bugs
			this.isDB && console.log("not valid date");
			this.isDB && console.log(fieldLine);
			return;
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
					this.isDB && console.log(emergingPath);
					let targetPath = fieldPath.split('.');
					let targetPathShrink = targetPath.slice(0, emergingPath.length);
					if (targetPathShrink.join('.') === emergingPath.join('.') === false) {
						this.isDB && console.log("Path wrong: " + emergingPath + " | " + targetPathShrink);
						emergingPath.pop();
						startLine = i + 1;
						continue;
					}
					else {
						if (emergingPath.join('.') === fieldPath) {
							if (targetDepth > 1) {
								if (this.isLineIndented(currentLine) === false) {    // met first level variable, obviously return
									this.isDB && console.log("Not indented: " + i + " | " + currentLine + " | " + startLine)
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

	async objectUpdateModifiedKey(file: TAbstractFile) {

		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			const dateNow = moment();
			const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);

			const updateKeyValue = moment(this.objectGetValue(frontmatter, this.settings.modifiedKeyName), this.settings.modifiedKeyFormat);
			
			if (updateKeyValue.add(1, 'minutes') > dateNow)
			{
				return;
			}
			
			this.objectSetValue(frontmatter, this.settings.modifiedKeyName, dateFormatted);
		})
	}

	objectGetValue(obj: any, fieldPath: string) {
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

	objectSetValue(obj: any, path: string, value: string) {
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
				}),);

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
					}),);

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