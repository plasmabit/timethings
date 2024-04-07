import {
	Editor,
	MarkdownView,
	WorkspaceLeaf,
	Plugin,
	TFile,
} from "obsidian";
import { moment } from "obsidian";
import {
	MostEditedView,
	VIEW_TYPE_MOST_EDITED as VIEW_TYPE_MOST_EDITED,
} from "./mostedited.view";

import * as BOMS from "./BOMS";
import * as CAMS from "./CAMS";
import {
	DEFAULT_SETTINGS,
	TimeThingsSettings,
	TimeThingsSettingsTab,
} from "./settings";
import * as timeUtils from "./time.utils";
import * as gates from "./gates.utils";

export default class TimeThings extends Plugin {
	settings: TimeThingsSettings;
	isDebugBuild: boolean;
	clockBar: HTMLElement; // # Required
	debugBar: HTMLElement;
	editDurationBar: HTMLElement;
	allowEditDurationUpdate: boolean;
	isProccessing = false;

	async onload() {

        // Add commands

        this.addCommand(
            {
                id: 'Show most edited notes view',
                name: 'Most edited notes',
                callback: () => {
                    this.activateMostEditedNotesView();
                }
            }
        );

        // Add buttons

        this.addRibbonIcon("history", "Activate view", () => {
            this.activateMostEditedNotesView();
        });

        // Register views

		this.registerView(
			VIEW_TYPE_MOST_EDITED,
			(leaf) => new MostEditedView(leaf),
		);

        // Load settings

		await this.loadSettings();

		// Variables initialization
		this.isDebugBuild = false; // for debugging purposes
		this.allowEditDurationUpdate = true; // for cooldown

        // Set up Status Bar items
		this.setUpStatusBarItems();

		// Events initialization
		this.registerFileModificationEvent();
		this.registerKeyDownDOMEvent();
		this.registerLeafChangeEvent();
		this.registerMouseDownDOMEvent();

        // Add a tab for settings
		this.addSettingTab(new TimeThingsSettingsTab(this.app, this));
	}

    registerMouseDownDOMEvent() {
		this.registerDomEvent(document, "mousedown", (evt: MouseEvent) => {
			// Prepare everything

			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView === null) {
				return;
			}
			const editor: Editor = activeView.editor;
			if (editor.hasFocus() === false) {
				return;
			}

			this.onUserActivity(true, activeView, { updateMetadata: false, updateStatusBar: true });
		});
	}

	registerLeafChangeEvent() {
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				// Prepare everything

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}
				const editor = activeView.editor;
				if (editor.hasFocus() === false) {
					return;
				}

				// Change the duration icon in status bar

				this.onUserActivity(true, activeView, {
					updateMetadata: false,
                    updateStatusBar: true,
				});
			}),
		);
	}

	registerKeyDownDOMEvent() {
		this.registerDomEvent(document, "keyup", (evt: KeyboardEvent) => {
			// If CAMS enabled
			const ignoreKeys = [
				"ArrowDown",
				"ArrowUp",
				"ArrowLeft",
				"ArrowRight",
				"Tab",
				"CapsLock",
				"Alt",
				"PageUp",
				"PageDown",
				"Home",
				"End",
				"Meta",
				"Escape",
			];

			if (evt.ctrlKey || ignoreKeys.includes(evt.key)) {
				return;
			}

			if (this.settings.useCustomFrontmatterHandlingSolution === true) {
				// Make sure the document is ready for edit

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
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

				// Update everything

				this.onUserActivity(true, activeView);
			}
		});
	}

	registerFileModificationEvent() {
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				// Make everything ready for edit

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView === null) {
					return;
				}

				// Main
				if (
					this.settings.useCustomFrontmatterHandlingSolution === false
				) {
					this.onUserActivity(false, activeView);
				}
			}),
		);
	}
    

	async activateMostEditedNotesView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MOST_EDITED);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_MOST_EDITED,
				active: true,
			});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

    // A function for reading and editing metadata realtime
	onUserActivity(
		useCustomSolution: boolean,
		activeView: MarkdownView,
		options: { updateMetadata: boolean, updateStatusBar: boolean, } = { updateMetadata: true, updateStatusBar: true, },
	) {
		const { updateMetadata, updateStatusBar } = options;
		// Gets called when a user changes a leaf, clicks a mouse, types in the editor, or modifies a file
        let environment;
        useCustomSolution ? environment = activeView.editor : environment = activeView.file;
        

		// Check if the file is in the blacklisted folder
		// Check if the file has a property that puts it into a blacklist
		// Check if the file itself is in the blacklist

        //
        if (updateStatusBar) {
            // update status bar
        }
        
		// Update metadata using either BOMS or cams
		if (updateMetadata) {
			if (
				useCustomSolution &&
				environment instanceof Editor
			) {
				// CAMS
				this.updateModifiedPropertyEditor(environment);
				if (this.settings.enableEditDurationKey) {
					this.updateDurationPropertyEditor(environment);
				}
			} else if (
				!useCustomSolution &&
				environment instanceof TFile
			) {
				// BOMS
				this.updateModifiedPropertyFrontmatter(environment);
				if (this.settings.enableEditDurationKey) {
					this.updateDurationPropertyFrontmatter(environment);
				}
			}
		}
	}

    updateModifiedPropertyEditor(editor: Editor) {
		const dateNow = moment();
		const userDateFormat = this.settings.modifiedKeyFormat;
		const dateFormatted = dateNow.format(userDateFormat);

		const userModifiedKeyName = this.settings.modifiedKeyName;
		const valueLineNumber = CAMS.getLine(editor, userModifiedKeyName);

		if (typeof valueLineNumber !== "number") {
			this.isDebugBuild && console.log("Couldn't get the line number of last_modified property");
			return;
		}
		const value = editor.getLine(valueLineNumber).split(/:(.*)/s)[1].trim();
		if (moment(value, userDateFormat, true).isValid() === false) {
            // Little safecheck in place to reduce chance of bugs
            this.isDebugBuild && console.log("Wrong format of last_modified property");
			return;
		}
        // this.setValue(true, editor, userModifiedKeyName, dateFormatted,);
		CAMS.setValue(editor, userModifiedKeyName, dateFormatted);
	}

    async updateModifiedPropertyFrontmatter(file: TFile) {
		await this.app.fileManager.processFrontMatter(
			file as TFile,
			(frontmatter) => {
				const dateNow = moment();
				const dateFormatted = dateNow.format(
					this.settings.modifiedKeyFormat,
				);

				const updateKeyValue = moment(
					BOMS.getValue(frontmatter, this.settings.modifiedKeyName),
					this.settings.modifiedKeyFormat,
				);

				if (
					updateKeyValue.add(
						this.settings.updateIntervalFrontmatterMinutes,
						"minutes",
					) > dateNow
				) {
					return;
				}

				BOMS.setValue(
					frontmatter,
					this.settings.modifiedKeyName,
					dateFormatted,
				);
			},
		);
	}
    
    async updateDurationPropertyFrontmatter(file: TFile) {
        // Prepare everything
        if (this.allowEditDurationUpdate === false) {
            return;
        }
        this.allowEditDurationUpdate = false;
        await this.app.fileManager.processFrontMatter(
            file as TFile,
            (frontmatter) => {
                let value = BOMS.getValue(
                    frontmatter,
                    this.settings.editDurationPath,
                );
                if (value === undefined) {
                    value = "0";
                }

                // Increment

                const newValue = +value + 10;
                BOMS.setValue(
                    frontmatter,
                    this.settings.editDurationPath,
                    newValue,
                );
            },
        );

        // Cool down

        await sleep(10000 - this.settings.nonTypingEditingTimePercentage * 100);
        this.allowEditDurationUpdate = true;
    }

	async updateDurationPropertyEditor(editor: Editor) {
		// Prepare everything
		if (this.allowEditDurationUpdate === false) {
			return;
		}
		this.allowEditDurationUpdate = false;
		const fieldLine = CAMS.getLine(editor, this.settings.editDurationPath);
		if (fieldLine === undefined) {
			this.allowEditDurationUpdate = true;
			return;
		}

		// Increment

		const value = editor.getLine(fieldLine).split(/:(.*)/s)[1].trim();
		const newValue = +value + 1;
		CAMS.setValue(
			editor,
			this.settings.editDurationPath,
			newValue.toString(),
		);

		// Cool down

		await sleep(1000 - this.settings.nonTypingEditingTimePercentage * 10);
		this.allowEditDurationUpdate = true;
	}

    // Don't worry about it
	updateClockBar() {
		const dateNow = moment();
		const dateUTC = moment.utc(); // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = timeUtils.momentToClockEmoji(dateChosen);

		this.settings.showEmojiStatusBar
			? this.clockBar.setText(emoji + " " + dateFormatted)
			: this.clockBar.setText(dateFormatted);
	}

    // Gets called on OnLoad
    setUpStatusBarItems() {
		if (this.settings.enableClock) {
			// Add clock icon
			// Adds a status bar
			this.clockBar = this.addStatusBarItem();
			this.clockBar.setText(":)");

			// Change status bar text every second
			this.updateClockBar();
			this.registerInterval(
				window.setInterval(
					this.updateClockBar.bind(this),
					+this.settings.updateIntervalMilliseconds,
				),
			);
		}

	}

    // Don't worry about it
	onunload() {}

    // Don't worry about it
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

    // Don't worry about it
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
