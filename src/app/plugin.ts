import { Plugin, WorkspaceLeaf } from "obsidian";
import { ActivityService, MetadataUpdateService } from "../features/activity";
import { ClockStatusService } from "../features/clock";
import { MostEditedView, VIEW_TYPES } from "../features/most-edited";
import { TimeThingsSettingsTab } from "../features/settings-tab";
import {
	DEFAULT_SETTINGS,
	normalizeUpdateInterval,
	type TimeThingsSettings,
} from "../shared/config";

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
		const raw =
			(await this.loadData()) as Partial<TimeThingsSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, raw);
		this.settings.updateIntervalMilliseconds = normalizeUpdateInterval(
			this.settings.updateIntervalMilliseconds,
		);
		// Migrate isUTC: true → clockTimezone: "UTC"
		if (raw?.isUTC && !raw.clockTimezone) {
			this.settings.clockTimezone = "UTC";
		}
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
			id: "open-most-edited-view",
			name: "Most edited notes",
			callback: () => {
				void this.activateMostEditedNotesView();
			},
		});
	}

	private registerRibbonIcons() {
		this.addRibbonIcon("history", "Open most edited notes", () => {
			void this.activateMostEditedNotesView();
		});
	}

	private initializeStatusBar() {
		this.clockStatusService?.initialize();
	}

	private registerActivityHandlers() {
		this.activityService?.registerHandlers();
	}

	private async activateMostEditedNotesView() {
		const { workspace } = this.app;
		const existingLeaf = workspace.getLeavesOfType(
			VIEW_TYPES.mostEdited,
		)[0];
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
