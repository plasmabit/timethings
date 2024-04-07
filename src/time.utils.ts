import { moment } from "obsidian";
import momentDurationFormatSetup from "moment-duration-format";
momentDurationFormatSetup(moment);

export function momentToClockEmoji(time: moment.Moment): string {
	const hour = time.hour();
	const hour12 = hour % 12 || 12;

	type NumberDictionary = {
		[key: number]: string;
	};

	const clockEmojiMap: NumberDictionary = {
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

	const result: string = clockEmojiMap[hour12] || "⏰"; // Default emoji for unknown hours
	return result;
}

export function formatSeconds(seconds: number, format: string): string {
    const durationSeconds = moment.duration(seconds, 'seconds');
    const formattedTime = durationSeconds.format(format);
    return formattedTime;
}
