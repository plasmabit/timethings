export const VIEW_TYPES = {
	mostEdited: "example-view",
} as const;

export const COMMANDS = {
	mostEditedNotes: {
		id: "Show most edited notes view",
		name: "Most edited notes",
	},
} as const;

export const RIBBON_COMMANDS = {
	mostEditedNotes: {
		icon: "history",
		label: "Activate view",
	},
} as const;

export const DOM_EVENTS = {
	keyUp: "keyup",
} as const;

export const VAULT_EVENTS = {
	modify: "modify",
} as const;

export const WORKSPACE_EVENTS = {
	hoverLink: "hover-link",
} as const;

export const WORKSPACE_LEAF_TYPES = {
	markdown: "markdown",
} as const;

export const FRONTMATTER_FIELDS = {
	editedSeconds: "edited_seconds",
} as const;

export const COOLDOWN_DURATIONS = {
	editorIncrementSeconds: 1,
	editorBaseMilliseconds: 1000,
	frontmatterIncrementSeconds: 10,
	frontmatterBaseMilliseconds: 10000,
} as const;

export const MOST_EDITED_VIEW = {
	title: "Most edited notes",
	displayText: "Most edited files",
	durationFormat: "h[h] m[m]",
	totalTimePrefix: "Total time spent editing: ",
	minimumVisibleSeconds: 60,
} as const;

export const MOST_EDITED_VIEW_CLASSES = {
	wrapper: "tt-wrapper",
	row: "tree-item-self is-clickable nav-file-title tt-title",
	title: "tree-item-inner nav-file-title-content tt-title-content",
	value: "flexblock",
} as const;

export const STATUS_BAR = {
	placeholder: ":)",
} as const;

export const SETTINGS_LINKS = {
	momentFormatDocs:
		"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/",
	nonTypingEditingDocs:
		"https://github.com/DynamicPlayerSector/timethings/wiki/Calculating-your-non%E2%80%90typing-editing-percentage",
} as const;

export const IGNORED_EDITOR_KEYS: readonly string[] = [
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
] as const;
