export const VIEW_TYPES = {
	mostEdited: "timethings-most-edited",
} as const;

export const FRONTMATTER_FIELDS = {
	editedSeconds: "edited_seconds",
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
