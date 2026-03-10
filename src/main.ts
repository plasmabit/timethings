import { Plugin, WorkspaceLeaf } from "obsidian";
import {
	COMMANDS,
	RIBBON_COMMANDS,
	VIEW_TYPES,
} from "./constants/plugin.constants";
import { ActivityService } from "./features/activity/activity.service";
import { MetadataUpdateService } from "./features/activity/metadata-update.service";
import { ClockStatusService } from "./features/clock/clock-status.service";
import { MostEditedView } from "./features/most-edited/most-edited.view";
import { DEFAULT_SETTINGS } from "./settings/settings.defaults";
import { TimeThingsSettings } from "./settings/settings.types";
import { TimeThingsSettingsTab } from "./settings/settings.tab";

export default class TimeThings extends Plugin {
	settings: TimeThingsSettings = DEFAULT_SETTINGS;
	private activityService?: ActivityService;
	private clockStatusService?: ClockStatusService;

	async onload() {
		await this.loadSettings();
		this.initializeServices();
		this.registerViews();
		this.registerCommands();
		this.registerRibbonIcons();
		this.initializeStatusBar();
		this.registerActivityHandlers();
		this.addSettingTab(new TimeThingsSettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async resetSettings() {
		this.settings = { ...DEFAULT_SETTINGS };
		await this.saveSettings();
	}

	private initializeServices() {
		const metadataUpdateService = new MetadataUpdateService(
			this.app,
			() => this.settings,
		);

		this.activityService = new ActivityService(this, metadataUpdateService);
		this.clockStatusService = new ClockStatusService(this);
	}

	private registerViews() {
		this.registerView(
			VIEW_TYPES.mostEdited,
			(leaf) => new MostEditedView(leaf, () => this.settings),
		);
	}

	private registerCommands() {
		this.addCommand({
			id: COMMANDS.mostEditedNotes.id,
			name: COMMANDS.mostEditedNotes.name,
			callback: () => {
				void this.activateMostEditedNotesView();
			},
		});
	}

	private registerRibbonIcons() {
		this.addRibbonIcon(
			RIBBON_COMMANDS.mostEditedNotes.icon,
			RIBBON_COMMANDS.mostEditedNotes.label,
			() => {
				void this.activateMostEditedNotesView();
			},
		);
	}

	private initializeStatusBar() {
		this.clockStatusService?.initialize();
	}

	private registerActivityHandlers() {
		this.activityService?.registerHandlers();
	}

	private async activateMostEditedNotesView() {
		const { workspace } = this.app;
		const existingLeaf = workspace.getLeavesOfType(VIEW_TYPES.mostEdited)[0];
		const leaf = existingLeaf ?? workspace.getRightLeaf(false);

		if (!(leaf instanceof WorkspaceLeaf)) {
			return;
		}

		if (leaf !== existingLeaf) {
			await leaf.setViewState({
				type: VIEW_TYPES.mostEdited,
				active: true,
			});
		}

		workspace.revealLeaf(leaf);
	}
}
