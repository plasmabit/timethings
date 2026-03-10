import { moment } from "obsidian";
import momentDurationFormatSetup from "moment-duration-format";

momentDurationFormatSetup(moment);

const CLOCK_EMOJI_BY_HOUR: Record<number, string> = {
	1: "🕐",
	2: "🕑",
	3: "🕒",
	4: "🕓",
	5: "🕔",
	6: "🕕",
	7: "🕖",
	8: "🕗",
	9: "🕘",
	10: "🕙",
	11: "🕚",
	12: "🕛",
};

export function formatMomentAsClockEmoji(time: moment.Moment): string {
	const hour12 = time.hour() % 12 || 12;

	return CLOCK_EMOJI_BY_HOUR[hour12] || "⏰";
}

export function formatSeconds(seconds: number, format: string): string {
	return moment.duration(seconds, "seconds").format(format);
}
