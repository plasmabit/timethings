import { App, Plugin, PluginSettingTab, SearchComponent, Setting } from "obsidian";
import { SETTINGS_LINKS } from "../constants/plugin.constants";
import {
	normalizeIgnorePath,
} from "../utils/ignore-rules";
import { FileInputSuggest } from "./suggesters/file-input-suggest";
import { FolderInputSuggest } from "./suggesters/folder-input-suggest";
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
		this.createSubsectionTitle(containerEl, "🕰️ Clock");

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
		this.renderIgnoreSection(containerEl);
	}

	private renderModifiedKeySection(containerEl: HTMLElement) {
		this.createSubsectionTitle(containerEl, "🔑 Modified timestamp");

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
		this.createSubsectionTitle(containerEl, "🔑 Edited duration");
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

	private renderIgnoreSection(containerEl: HTMLElement) {
		this.createSubsectionTitle(containerEl, "Ignored paths");
		containerEl.createEl("p", {
			text: "Files and folders listed here will be ignored by metadata updates and the Most edited view.",
		});

		this.renderPathListSetting(
			containerEl,
			"Ignored folders",
			"Any file in these folders will be ignored.",
			"Example: Templates",
			this.plugin.settings.ignoredFolders,
			(inputEl) => new FolderInputSuggest(this.app, inputEl),
			async (value) => {
				await this.updateSetting("ignoredFolders", value);
			},
		);

		this.renderPathListSetting(
			containerEl,
			"Ignored files",
			"These exact files will be ignored.",
			"Example: Templates/Daily.md",
			this.plugin.settings.ignoredFiles,
			(inputEl) => new FileInputSuggest(this.app, inputEl),
			async (value) => {
				await this.updateSetting("ignoredFiles", value);
			},
		);
	}

	private createSection(
		containerEl: HTMLElement,
		title: string,
		description: string,
	) {
		const titleElement = containerEl.createEl("p");

		titleElement.createEl("strong", { text: title });
		containerEl.createEl("p", { text: description });
	}

	private createSubsectionTitle(containerEl: HTMLElement, title: string) {
		const titleElement = containerEl.createEl("p");

		titleElement.createEl("strong", { text: title });
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

	private renderPathListSetting(
		containerEl: HTMLElement,
		name: string,
		description: string | DocumentFragment,
		placeholder: string,
		currentValues: string[],
		attachSuggest: (inputEl: HTMLInputElement) => void,
		onChange: (value: string[]) => Promise<void>,
	) {
		let searchComponent: SearchComponent | undefined;

		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addSearch((search) => {
				searchComponent = search;
				search.setPlaceholder(placeholder);
				attachSuggest(search.inputEl);
			})
			.addButton((button) =>
				button.setIcon("plus").setTooltip("Add").onClick(async () => {
					const rawValue = searchComponent?.getValue().trim();

					if (!rawValue) {
						return;
					}

					const normalizedValue = normalizeIgnorePath(rawValue);
					const nextValues = Array.from(
						new Set([...currentValues, normalizedValue]),
					);

					await onChange(nextValues);
					searchComponent?.setValue("");
					this.display();
				}),
			);

		for (const currentValue of currentValues) {
			new Setting(containerEl)
				.setName(currentValue)
				.addButton((button) =>
					button.setButtonText("Remove").onClick(async () => {
						await onChange(
							currentValues.filter((value) => value !== currentValue),
						);
						this.display();
					}),
				);
		}
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
