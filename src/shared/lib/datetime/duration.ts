export function formatDurationHoursMinutes(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(minutes, totalSeconds > 0 ? 1 : 0)}m`;
}

const DURATION_TEMPLATE_TOKENS = {
	days: (seconds: number) => String(Math.floor(seconds / 86_400)),
	hours: (seconds: number) => String(Math.floor(seconds / 3_600)),
	minutes: (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		return seconds > 0 && minutes === 0 ? "<1" : String(minutes);
	},
	seconds: (seconds: number) => String(seconds),
	hoursPart: (seconds: number) => String(Math.floor((seconds % 86_400) / 3_600)),
	minutesPart: (seconds: number) => String(Math.floor((seconds % 3_600) / 60)),
	secondsPart: (seconds: number) => String(seconds % 60),
	duration: (seconds: number) => formatDurationHoursMinutes(seconds),
} as const;

export function formatDurationTemplate(totalSeconds: number, template: string): string {
	const normalizedSeconds = Number.isFinite(totalSeconds)
		? Math.max(0, Math.floor(totalSeconds))
		: 0;

	return template.replace(/\{([A-Za-z]+)\}/g, (token, name: string) => {
		const formatter = DURATION_TEMPLATE_TOKENS[name as keyof typeof DURATION_TEMPLATE_TOKENS];
		return formatter === undefined ? token : formatter(normalizedSeconds);
	});
}
