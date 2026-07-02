export function formatDurationHoursMinutes(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(minutes, totalSeconds > 0 ? 1 : 0)}m`;
}
