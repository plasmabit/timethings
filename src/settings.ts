import { App, PluginSettingTab, Setting } from "obsidian";
import TimeThings from "./main";

export interface TimeThingsSettings {
    //CAMS
	useCustomFrontmatterHandlingSolution: boolean;

    //EMOJIS
	showEmojiStatusBar: boolean;

    //CLOCK
	clockFormat: string;
	updateIntervalMilliseconds: string;
	enableClock: boolean;
	isUTC: boolean;

    //MODIFIED KEY
	modifiedKeyName: string;
	modifiedKeyFormat: string;
	enableModifiedKeyUpdate: boolean;
    //BOMS
	updateIntervalFrontmatterMinutes: number;

    //DURATION KEY
	editDurationPath: string;
	enableEditDurationKey: boolean;
	nonTypingEditingTimePercentage: number;

	enableSwitch: boolean;
	switchKey: string;
	switchKeyValue: string;


    
}

export const DEFAULT_SETTINGS: TimeThingsSettings = {
	useCustomFrontmatterHandlingSolution: false,

	showEmojiStatusBar: true,

	clockFormat: "hh:mm A",
	updateIntervalMilliseconds: "1000",
	enableClock: true,
	isUTC: false,

	modifiedKeyName: "updated_at",
	modifiedKeyFormat: "YYYY-MM-DD[T]HH:mm:ss.SSSZ",
	enableModifiedKeyUpdate: true,

	editDurationPath: "edited_seconds",
	enableEditDurationKey: true,

	updateIntervalFrontmatterMinutes: 1,

	nonTypingEditingTimePercentage: 22,

	enableSwitch: false,
	switchKey: "timethings.switch",
	switchKeyValue: "true",


};

export class TimeThingsSettingsTab extends PluginSettingTab {
	plugin: TimeThings;

	constructor(app: App, plugin: TimeThings) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// #region prerequisites

		const createLink = () => {
			const linkEl = document.createDocumentFragment();

			linkEl.append(
				linkEl.createEl("a", {
					href: "https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/",
					text: "Moment.js date format documentation",
				}),
			);
			return linkEl;
		};

		// #endregion

		// #region custom frontmatter solution

		new Setting(containerEl)
			.setName("Use custom frontmatter handling solution")
			.setDesc(
				"Smoother experience. Prone to bugs if you use a nested value.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings
							.useCustomFrontmatterHandlingSolution,
					)
					.onChange(async (newValue) => {
						this.plugin.settings.useCustomFrontmatterHandlingSolution =
							newValue;
						await this.plugin.saveSettings();
						await this.display();
					}),
			);

		// #endregion

		// #region status bar

		containerEl.createEl("h1", { text: "Status bar" });
		containerEl.createEl("p", {
			text: "Displays clock in the status bar",
		});
        containerEl.createEl("h2", { text: "🕰️ Clock" });
		new Setting(containerEl)
			.setName("Enable emojis")
			.setDesc("Show emojis in the status bar?")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showEmojiStatusBar)
					.onChange(async (newValue) => {
						this.plugin.settings.showEmojiStatusBar = newValue;
						await this.plugin.saveSettings();
						await this.display();
					}),
			);

		new Setting(containerEl)
			.setName("Enable status bar clock")
			.setDesc(
				"Show clock on the status bar? This setting requires restart of the plugin.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableClock)
					.onChange(async (newValue) => {
						this.plugin.settings.enableClock = newValue;
						await this.plugin.saveSettings();
						await this.display();
					}),
			);

		if (this.plugin.settings.enableClock === true) {
			new Setting(containerEl)
				.setName("Date format")
				.setDesc(createLink())
				.addText((text) =>
					text
						.setPlaceholder("hh:mm A")
						.setValue(this.plugin.settings.clockFormat)
						.onChange(async (value) => {
							this.plugin.settings.clockFormat = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Update interval")
				.setDesc(
					"In milliseconds. Restart plugin for this setting to take effect.",
				)
				.addText((text) =>
					text
						.setPlaceholder("1000")
						.setValue(
							this.plugin.settings.updateIntervalMilliseconds,
						)
						.onChange(async (value) => {
							this.plugin.settings.updateIntervalMilliseconds =
								value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("UTC timezone")
				.setDesc("Use UTC instead of local time?")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.isUTC)
						.onChange(async (newValue) => {
							this.plugin.settings.isUTC = newValue;
							await this.plugin.saveSettings();
						}),
				);
		}

		// #endregion

		// #region keys

		containerEl.createEl("h1", { text: "Frontmatter" });
		containerEl.createEl("p", {
			text: "Handles timestamp keys in frontmatter.",
		});

		// #region updated_at key

		containerEl.createEl("h2", { text: "🔑 Modified timestamp" });

		new Setting(containerEl)
			.setName("Enable update of the modified key")
			.setDesc("")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableModifiedKeyUpdate)
					.onChange(async (newValue) => {
						this.plugin.settings.enableModifiedKeyUpdate = newValue;
						await this.plugin.saveSettings();
						await this.display();
					}),
			);

		if (this.plugin.settings.enableModifiedKeyUpdate === true) {
			new Setting(containerEl)
				.setName("Modified key name")
				.setDesc(
					"Supports nested keys. For example `timethings.updated_at`",
				)
				.addText((text) =>
					text
						.setPlaceholder("updated_at")
						.setValue(this.plugin.settings.modifiedKeyName)
						.onChange(async (value) => {
							this.plugin.settings.modifiedKeyName = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Modified key format")
				.setDesc(createLink())
				.addText((text) =>
					text
						.setPlaceholder("YYYY-MM-DD[T]HH:mm:ss.SSSZ")
						.setValue(this.plugin.settings.modifiedKeyFormat)
						.onChange(async (value) => {
							this.plugin.settings.modifiedKeyFormat = value;
							await this.plugin.saveSettings();
						}),
				);

			if (
				this.plugin.settings.useCustomFrontmatterHandlingSolution ===
				false
			) {
				new Setting(containerEl)
					.setName("Interval between updates")
					.setDesc("Only for Obsidian frontmatter API.")
					.addSlider((slider) =>
						slider
							.setLimits(1, 15, 1)
							.setValue(
								this.plugin.settings
									.updateIntervalFrontmatterMinutes,
							)
							.onChange(async (value) => {
								this.plugin.settings.updateIntervalFrontmatterMinutes =
									value;
								await this.plugin.saveSettings();
							})
							.setDynamicTooltip(),
					);
			}
		}

		// #endregion

		// #region edited_duration key

		containerEl.createEl("h2", { text: "🔑 Edited duration" });
		containerEl.createEl("p", {
			text: "Track for how long you have been editing a note.",
		});

		new Setting(containerEl)
			.setName("Enable edit duration key")
			.setDesc("")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableEditDurationKey)
					.onChange(async (newValue) => {
						this.plugin.settings.enableEditDurationKey = newValue;
						await this.plugin.saveSettings();
						await this.display();
						// await this.plugin.editDurationBar.toggle(this.plugin.settings.enableEditDurationKey);
					}),
			);

		if (this.plugin.settings.enableEditDurationKey === true) {
			new Setting(containerEl)
				.setName("Edit duration key name")
				.setDesc(
					"Supports nested keys. For example `timethings.edited_seconds`",
				)
				.addText((text) =>
					text
						.setPlaceholder("edited_seconds")
						.setValue(this.plugin.settings.editDurationPath)
						.onChange(async (value) => {
							this.plugin.settings.editDurationPath = value;
							await this.plugin.saveSettings();
						}),
				);

			const descA = document.createDocumentFragment();
			descA.append(
				"The portion of time you are not typing when editing a note. Works best with custom frontmatter handling solution. ",
				createEl("a", {
					href: "https://github.com/DynamicPlayerSector/timethings/wiki/Calculating-your-non%E2%80%90typing-editing-percentage",
					text: "How to calculate yours?",
				}),
			);

			new Setting(containerEl)
				.setName("Non-typing editing time percentage")
				.setDesc(descA)
				.addSlider((slider) =>
					slider
						.setLimits(0, 40, 2)
						.setValue(
							this.plugin.settings.nonTypingEditingTimePercentage,
						)
						.onChange(async (value) => {
							this.plugin.settings.nonTypingEditingTimePercentage =
								value;
							await this.plugin.saveSettings();
						})
						.setDynamicTooltip(),
				);
		}

		// #endregion

		// #endregion

		// #region danger zone

		containerEl.createEl("h1", { text: "Danger zone" });
		containerEl.createEl("p", { text: "You've been warned!" });

		new Setting(containerEl)
			.setName("Reset settings")
			.setDesc("Resets settings to default")
			.addButton((btn) =>
				btn
					.setIcon("switch")
					.setButtonText("Reset settings")
					.setTooltip("Reset settings")
					.onClick(() => {
						this.plugin.settings = Object.assign(
							{},
							DEFAULT_SETTINGS,
							this.plugin.loadData(),
						);
						this.display();
					}),
			);
		// #endregion
	}
}
