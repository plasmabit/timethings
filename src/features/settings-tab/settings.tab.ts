import {
	App,
	Plugin,
	PluginSettingTab,
	SearchComponent,
	Setting,
	type SettingDefinitionItem,
} from "obsidian";
import {
	normalizeUpdateInterval,
	type TimeThingsSettings,
	type TimeThingsSettingsManager,
} from "../../shared/config";
import { normalizeIgnorePath } from "../../shared/lib/ignore";
import {
	FileInputSuggest,
	FolderInputSuggest,
	TimezoneInputSuggest,
} from "../../shared/ui/suggesters";
import { listTimeZones } from "../../timezone";
import { SETTINGS_LINKS } from "./settings-tab.constants";

type SettingsTabPlugin = Plugin & TimeThingsSettingsManager;

export class TimeThingsSettingsTab extends PluginSettingTab {
	plugin: SettingsTabPlugin;

	constructor(app: App, plugin: SettingsTabPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Handling mode",
				aliases: ["Use custom frontmatter handling solution"],
				render: (setting) => {
					this.renderDefinition(setting, (containerEl) => {
						this.renderHandlingModeSection(containerEl);
					});
				},
			},
			{
				name: "Status bar",
				aliases: [
					"Show emoji",
					"Enable clock",
					"Clock format",
					"Clock update interval",
					"Clock timezone",
					"Use UTC",
				],
				render: (setting) => {
					this.renderDefinition(setting, (containerEl) => {
						this.renderStatusBarSection(containerEl);
					});
				},
			},
			{
				name: "Frontmatter",
				aliases: [
					"Create missing properties",
					"Enable modified key update",
					"Modified key name",
					"Modified key format",
					"Use ISO 8601",
					"Frontmatter timezone",
					"Use UTC",
					"Interval between updates",
					"Enable edit duration key",
					"Edit duration key name",
					"Non-typing editing time percentage",
					"Ignored folders",
					"Ignored files",
				],
				render: (setting) => {
					this.renderDefinition(setting, (containerEl) => {
						this.renderFrontmatterSection(containerEl);
					});
				},
			},
			{
				name: "Danger zone",
				aliases: ["Reset settings"],
				render: (setting) => {
					this.renderDefinition(setting, (containerEl) => {
						this.renderDangerZoneSection(containerEl);
					});
				},
			},
		];
	}

	private renderDefinition(setting: Setting, render: (containerEl: HTMLElement) => void) {
		setting.settingEl.empty();
		setting.settingEl.addClass("tt-settings-section");
		render(setting.settingEl);
	}

	private renderHandlingModeSection(containerEl: HTMLElement) {
		this.addToggleSetting(
			containerEl,
			"Use custom frontmatter handling solution",
			"Smoother experience. Prone to bugs if you use a nested value.",
			this.plugin.settings.useCustomFrontmatterHandlingSolution,
			async (value) => {
				await this.updateSetting("useCustomFrontmatterHandlingSolution", value, true);
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
				this.createFormatTokenLink(),
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
				String(this.plugin.settings.updateIntervalMilliseconds),
				async (value) => {
					await this.updateSetting(
						"updateIntervalMilliseconds",
						normalizeUpdateInterval(value),
					);
				},
			);

			this.addTimezoneSetting(
				containerEl,
				"Clock timezone",
				"Search by region or city. Empty = system timezone.",
				this.plugin.settings.clockTimezone,
				this.plugin.settings.clockUseUtc,
				async (value) => {
					await this.updateSetting("clockTimezone", value);
				},
				async (value) => {
					await this.updateSetting("clockUseUtc", value);
				},
			);
		}
	}

	private renderFrontmatterSection(containerEl: HTMLElement) {
		this.createSection(containerEl, "Frontmatter", "Handles timestamp keys in frontmatter.");
		this.addToggleSetting(
			containerEl,
			"Create missing properties",
			"Create enabled modified timestamp and edit duration properties when they are absent from existing frontmatter.",
			this.plugin.settings.createMissingFrontmatterProperties,
			async (value) => {
				await this.updateSetting("createMissingFrontmatterProperties", value);
			},
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

		this.addFrontmatterFormatSetting(
			containerEl,
			this.plugin.settings.modifiedKeyFormat,
			this.plugin.settings.frontmatterUseIso,
			async (value) => {
				await this.updateSetting("modifiedKeyFormat", value);
			},
			async (value) => {
				await this.updateSetting("frontmatterUseIso", value);
			},
		);

		this.addTimezoneSetting(
			containerEl,
			"Frontmatter timezone",
			"Search by region or city. Empty = system timezone.",
			this.plugin.settings.frontmatterTimezone,
			this.plugin.settings.frontmatterUseUtc,
			async (value) => {
				await this.updateSetting("frontmatterTimezone", value);
			},
			async (value) => {
				await this.updateSetting("frontmatterUseUtc", value);
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
					await this.updateSetting("updateIntervalFrontmatterMinutes", value);
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
						this.update();
					}),
			);
	}

	private renderIgnoreSection(containerEl: HTMLElement) {
		this.createSubsectionTitle(containerEl, "Ignored paths");
		containerEl.createEl("p", {
			text: "Files and folders listed here will be ignored by metadata updates and the most edited view.",
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

	private createSection(containerEl: HTMLElement, title: string, description: string) {
		const titleElement = containerEl.createEl("p");

		titleElement.createEl("strong", { text: title });
		containerEl.createEl("p", { text: description });
	}

	private createSubsectionTitle(containerEl: HTMLElement, title: string) {
		const titleElement = containerEl.createEl("p");

		titleElement.createEl("strong", { text: title });
	}

	private createFormatTokenLink() {
		const fragment = createFragment();

		fragment.createEl("a", {
			text: "Supported date format tokens",
			href: SETTINGS_LINKS.formatTokenDocs,
		});

		return fragment;
	}

	private createNonTypingDescription() {
		const fragment = createFragment();

		fragment.appendText(
			"The portion of time you are not typing when editing a note. Works best with custom frontmatter handling solution. ",
		);
		fragment.createEl("a", {
			text: "How to calculate yours?",
			href: SETTINGS_LINKS.nonTypingEditingDocs,
		});

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

	private addTimezoneSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: string,
		useUtc: boolean,
		onTimezoneChange: (value: string) => Promise<void>,
		onUtcChange: (value: boolean) => Promise<void>,
	) {
		const group = containerEl.createDiv({ cls: "setting-item tt-setting-group" });
		let searchComponent: SearchComponent;

		const timezoneSetting = new Setting(group)
			.setName(name)
			.setDesc(description)
			.addSearch((search) => {
				searchComponent = search;
				search
					.setPlaceholder("System default")
					.setValue(value)
					.setDisabled(useUtc)
					.onChange(async (newValue) => {
						if (newValue.length === 0) {
							await onTimezoneChange("");
						}
					});

				return new TimezoneInputSuggest(
					this.app,
					search.inputEl,
					listTimeZones(),
					(selectedTimezone) => {
						void onTimezoneChange(selectedTimezone);
					},
				);
			});
		const applyUtcState = (enabled: boolean) => {
			searchComponent.setDisabled(enabled);
			timezoneSetting.settingEl.classList.toggle("tt-setting-overridden", enabled);
		};

		applyUtcState(useUtc);

		group.createEl("hr", { cls: "tt-setting-separator" });

		new Setting(group)
			.setName("Use UTC")
			.setDesc("Overrides the selected timezone.")
			.addToggle((toggle) => {
				toggle.setValue(useUtc).onChange(async (newValue) => {
					await onUtcChange(newValue);
					applyUtcState(newValue);
				});
			});
	}

	private addFrontmatterFormatSetting(
		containerEl: HTMLElement,
		value: string,
		useIso: boolean,
		onFormatChange: (value: string) => Promise<void>,
		onIsoChange: (value: boolean) => Promise<void>,
	) {
		const group = containerEl.createDiv({ cls: "setting-item tt-setting-group" });
		let setFormatDisabled: (disabled: boolean) => void;

		const formatSetting = new Setting(group)
			.setName("Modified key format")
			.setDesc(this.createFormatTokenLink())
			.addText((text) => {
				setFormatDisabled = (disabled) => {
					text.setDisabled(disabled);
				};
				text.setPlaceholder("YYYY-MM-DD[T]HH:mm:ss.SSSZ")
					.setValue(value)
					.setDisabled(useIso)
					.onChange(async (newValue) => {
						await onFormatChange(newValue);
					});
			});
		const applyIsoState = (enabled: boolean) => {
			setFormatDisabled(enabled);
			formatSetting.settingEl.classList.toggle("tt-setting-overridden", enabled);
		};

		applyIsoState(useIso);

		group.createEl("hr", { cls: "tt-setting-separator" });

		new Setting(group)
			.setName("Use ISO 8601")
			.setDesc("Overrides the custom modified timestamp format.")
			.addToggle((toggle) =>
				toggle.setValue(useIso).onChange(async (newValue) => {
					await onIsoChange(newValue);
					applyIsoState(newValue);
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
				button
					.setIcon("plus")
					.setTooltip("Add")
					.onClick(async () => {
						const rawValue = searchComponent?.getValue().trim();

						if (!rawValue) {
							return;
						}

						const normalizedValue = normalizeIgnorePath(rawValue);
						const nextValues = Array.from(new Set([...currentValues, normalizedValue]));

						await onChange(nextValues);
						searchComponent?.setValue("");
						this.update();
					}),
			);

		for (const currentValue of currentValues) {
			new Setting(containerEl).setName(currentValue).addButton((button) =>
				button.setButtonText("Remove").onClick(async () => {
					await onChange(currentValues.filter((value) => value !== currentValue));
					this.update();
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
					}),
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
			this.update();
		}
	}
}
