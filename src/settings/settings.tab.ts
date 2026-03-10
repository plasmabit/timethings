import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { SETTINGS_LINKS } from "../constants/plugin.constants";
import {
	TimeThingsSettings,
	TimeThingsSettingsManager,
} from "./settings.types";

type SettingsTabPlugin = Plugin & TimeThingsSettingsManager;

export class TimeThingsSettingsTab extends PluginSettingTab {
	plugin: SettingsTabPlugin;

	constructor(app: App, plugin: SettingsTabPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.renderHandlingModeSection(containerEl);
		this.renderStatusBarSection(containerEl);
		this.renderFrontmatterSection(containerEl);
		this.renderDangerZoneSection(containerEl);
	}

	private renderHandlingModeSection(containerEl: HTMLElement) {
		this.addToggleSetting(
			containerEl,
			"Use custom frontmatter handling solution",
			"Smoother experience. Prone to bugs if you use a nested value.",
			this.plugin.settings.useCustomFrontmatterHandlingSolution,
			async (value) => {
				await this.updateSetting(
					"useCustomFrontmatterHandlingSolution",
					value,
					true,
				);
			},
		);
	}

	private renderStatusBarSection(containerEl: HTMLElement) {
		this.createSection(containerEl, "Status bar", "Displays clock in the status bar");
		containerEl.createEl("h2", { text: "🕰️ Clock" });

		this.addToggleSetting(
			containerEl,
			"Enable emojis",
			"Show emojis in the status bar?",
			this.plugin.settings.showEmojiStatusBar,
			async (value) => {
				await this.updateSetting("showEmojiStatusBar", value, true);
			},
		);

		this.addToggleSetting(
			containerEl,
			"Enable status bar clock",
			"Show clock on the status bar? This setting requires restart of the plugin.",
			this.plugin.settings.enableClock,
			async (value) => {
				await this.updateSetting("enableClock", value, true);
			},
		);

		if (this.plugin.settings.enableClock) {
			this.addTextSetting(
				containerEl,
				"Date format",
				this.createMomentFormatLink(),
				"hh:mm A",
				this.plugin.settings.clockFormat,
				async (value) => {
					await this.updateSetting("clockFormat", value);
				},
			);

			this.addTextSetting(
				containerEl,
				"Update interval",
				"In milliseconds. Restart plugin for this setting to take effect.",
				"1000",
				this.plugin.settings.updateIntervalMilliseconds,
				async (value) => {
					await this.updateSetting("updateIntervalMilliseconds", value);
				},
			);

			this.addToggleSetting(
				containerEl,
				"UTC timezone",
				"Use UTC instead of local time?",
				this.plugin.settings.isUTC,
				async (value) => {
					await this.updateSetting("isUTC", value);
				},
			);
		}
	}

	private renderFrontmatterSection(containerEl: HTMLElement) {
		this.createSection(
			containerEl,
			"Frontmatter",
			"Handles timestamp keys in frontmatter.",
		);
		this.renderModifiedKeySection(containerEl);
		this.renderEditDurationSection(containerEl);
	}

	private renderModifiedKeySection(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "🔑 Modified timestamp" });

		this.addToggleSetting(
			containerEl,
			"Enable update of the modified key",
			"",
			this.plugin.settings.enableModifiedKeyUpdate,
			async (value) => {
				await this.updateSetting("enableModifiedKeyUpdate", value, true);
			},
		);

		if (!this.plugin.settings.enableModifiedKeyUpdate) {
			return;
		}

		this.addTextSetting(
			containerEl,
			"Modified key name",
			"Supports nested keys. For example `timethings.updated_at`",
			"updated_at",
			this.plugin.settings.modifiedKeyName,
			async (value) => {
				await this.updateSetting("modifiedKeyName", value);
			},
		);

		this.addTextSetting(
			containerEl,
			"Modified key format",
			this.createMomentFormatLink(),
			"YYYY-MM-DD[T]HH:mm:ss.SSSZ",
			this.plugin.settings.modifiedKeyFormat,
			async (value) => {
				await this.updateSetting("modifiedKeyFormat", value);
			},
		);

		if (!this.plugin.settings.useCustomFrontmatterHandlingSolution) {
			this.addSliderSetting(
				containerEl,
				"Interval between updates",
				"Only for Obsidian frontmatter API.",
				1,
				15,
				1,
				this.plugin.settings.updateIntervalFrontmatterMinutes,
				async (value) => {
					await this.updateSetting(
						"updateIntervalFrontmatterMinutes",
						value,
					);
				},
			);
		}
	}

	private renderEditDurationSection(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "🔑 Edited duration" });
		containerEl.createEl("p", {
			text: "Track for how long you have been editing a note.",
		});

		this.addToggleSetting(
			containerEl,
			"Enable edit duration key",
			"",
			this.plugin.settings.enableEditDurationKey,
			async (value) => {
				await this.updateSetting("enableEditDurationKey", value, true);
			},
		);

		if (!this.plugin.settings.enableEditDurationKey) {
			return;
		}

		this.addTextSetting(
			containerEl,
			"Edit duration key name",
			"Supports nested keys. For example `timethings.edited_seconds`",
			"edited_seconds",
			this.plugin.settings.editDurationPath,
			async (value) => {
				await this.updateSetting("editDurationPath", value);
			},
		);

		this.addSliderSetting(
			containerEl,
			"Non-typing editing time percentage",
			this.createNonTypingDescription(),
			0,
			40,
			2,
			this.plugin.settings.nonTypingEditingTimePercentage,
			async (value) => {
				await this.updateSetting("nonTypingEditingTimePercentage", value);
			},
		);
	}

	private renderDangerZoneSection(containerEl: HTMLElement) {
		this.createSection(containerEl, "Danger zone", "You've been warned!");

		new Setting(containerEl)
			.setName("Reset settings")
			.setDesc("Resets settings to default")
			.addButton((button) =>
				button
					.setIcon("switch")
					.setButtonText("Reset settings")
					.setTooltip("Reset settings")
					.onClick(async () => {
						await this.plugin.resetSettings();
						this.display();
					}),
			);
	}

	private createSection(
		containerEl: HTMLElement,
		title: string,
		description: string,
	) {
		containerEl.createEl("h1", { text: title });
		containerEl.createEl("p", { text: description });
	}

	private createMomentFormatLink() {
		const fragment = document.createDocumentFragment();
		const link = document.createElement("a");

		link.href = SETTINGS_LINKS.momentFormatDocs;
		link.textContent = "Moment.js date format documentation";
		fragment.append(link);

		return fragment;
	}

	private createNonTypingDescription() {
		const fragment = document.createDocumentFragment();
		const link = document.createElement("a");

		link.href = SETTINGS_LINKS.nonTypingEditingDocs;
		link.textContent = "How to calculate yours?";
		fragment.append(
			"The portion of time you are not typing when editing a note. Works best with custom frontmatter handling solution. ",
		);
		fragment.append(link);

		return fragment;
	}

	private addToggleSetting(
		containerEl: HTMLElement,
		name: string,
		description: string | DocumentFragment,
		value: boolean,
		onChange: (value: boolean) => Promise<void>,
	) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addToggle((toggle) =>
				toggle.setValue(value).onChange(async (newValue) => {
					await onChange(newValue);
				}),
			);
	}

	private addTextSetting(
		containerEl: HTMLElement,
		name: string,
		description: string | DocumentFragment,
		placeholder: string,
		value: string,
		onChange: (value: string) => Promise<void>,
	) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText((text) =>
				text
					.setPlaceholder(placeholder)
					.setValue(value)
					.onChange(async (newValue) => {
						await onChange(newValue);
					}),
			);
	}

	private addSliderSetting(
		containerEl: HTMLElement,
		name: string,
		description: string | DocumentFragment,
		min: number,
		max: number,
		step: number,
		value: number,
		onChange: (value: number) => Promise<void>,
	) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addSlider((slider) =>
				slider
					.setLimits(min, max, step)
					.setValue(value)
					.onChange(async (newValue) => {
						await onChange(newValue);
					})
					.setDynamicTooltip(),
			);
	}

	private async updateSetting<K extends keyof TimeThingsSettings>(
		key: K,
		value: TimeThingsSettings[K],
		redisplay = false,
	) {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();

		if (redisplay) {
			this.display();
		}
	}
}
