export const COOLDOWN_DURATIONS = {
	editorIncrementSeconds: 1,
	editorBaseMilliseconds: 1000,
	frontmatterIncrementSeconds: 10,
	frontmatterBaseMilliseconds: 10000,
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
