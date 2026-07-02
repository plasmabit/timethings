import { Temporal, type ZonedDateTime } from "./temporal";

const TOKENS = [
	"YYYY",
	"SSS",
	"MM",
	"DD",
	"HH",
	"hh",
	"mm",
	"ss",
	"H",
	"h",
	"A",
	"a",
	"Z",
] as const;
type Token = (typeof TOKENS)[number];
type Part = { token: Token } | { literal: string };

export function normalizeClockFormat(format: string): string {
	return format.replace(/(^|[^A-Za-z])((?:H{1,2}|h{1,2}):)MM(?=$|[^A-Za-z])/g, "$1$2mm");
}

function tokenize(format: string): Part[] {
	const parts: Part[] = [];
	for (let index = 0; index < format.length; ) {
		if (format[index] === "[") {
			const end = format.indexOf("]", index + 1);
			if (end !== -1) {
				parts.push({ literal: format.slice(index + 1, end) });
				index = end + 1;
				continue;
			}
		}
		const token = TOKENS.find((candidate) => format.startsWith(candidate, index));
		if (token) {
			parts.push({ token });
			index += token.length;
		} else {
			parts.push({ literal: format[index] });
			index += 1;
		}
	}
	return parts;
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

export function formatDateTime(zdt: ZonedDateTime, format: string): string {
	return tokenize(format)
		.map((part) => {
			if ("literal" in part) return part.literal;
			const hour12 = zdt.hour % 12 || 12;
			switch (part.token) {
				case "YYYY":
					return pad(zdt.year, 4);
				case "MM":
					return pad(zdt.month);
				case "DD":
					return pad(zdt.day);
				case "HH":
					return pad(zdt.hour);
				case "H":
					return String(zdt.hour);
				case "hh":
					return pad(hour12);
				case "h":
					return String(hour12);
				case "mm":
					return pad(zdt.minute);
				case "ss":
					return pad(zdt.second);
				case "SSS":
					return pad(zdt.millisecond, 3);
				case "A":
					return zdt.hour < 12 ? "AM" : "PM";
				case "a":
					return zdt.hour < 12 ? "am" : "pm";
				case "Z":
					return zdt.offset === "+00:00" ? "+00:00" : zdt.offset;
			}
		})
		.join("");
}

const PATTERNS: Record<Token, string> = {
	YYYY: "\\d{4}",
	MM: "\\d{2}",
	DD: "\\d{2}",
	HH: "\\d{2}",
	H: "\\d{1,2}",
	hh: "\\d{2}",
	h: "\\d{1,2}",
	mm: "\\d{2}",
	ss: "\\d{2}",
	SSS: "\\d{3}",
	A: "AM|PM",
	a: "am|pm",
	Z: "[+-]\\d{2}:\\d{2}|Z",
};
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseDateTimeStrict(text: string, format: string): ZonedDateTime | undefined {
	const parts = tokenize(format);
	const tokens: Token[] = [];
	const regex = new RegExp(
		`^${parts
			.map((part) => {
				if ("literal" in part) return escapeRegex(part.literal);
				tokens.push(part.token);
				return `(${PATTERNS[part.token]})`;
			})
			.join("")}$`,
	);
	const match = regex.exec(text);
	if (!match) return undefined;
	const values = new Map<Token, string>();
	tokens.forEach((token, index) => values.set(token, match[index + 1]));
	try {
		const offset = values.get("Z");
		const zone = offset === "Z" ? "UTC" : (offset ?? Temporal.Now.timeZoneId());
		const today = Temporal.Now.zonedDateTimeISO(zone);
		const year = Number(values.get("YYYY") ?? today.year);
		const month = Number(values.get("MM") ?? today.month);
		const day = Number(values.get("DD") ?? today.day);
		let hour = Number(
			values.get("HH") ?? values.get("H") ?? values.get("hh") ?? values.get("h") ?? 0,
		);
		const meridiem = values.get("A") ?? values.get("a");
		if (values.has("hh") || values.has("h")) {
			if (hour < 1 || hour > 12 || !meridiem) return undefined;
			hour = (hour % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
		}
		const fields = {
			year,
			month,
			day,
			hour,
			minute: Number(values.get("mm") ?? 0),
			second: Number(values.get("ss") ?? 0),
			millisecond: Number(values.get("SSS") ?? 0),
			timeZone: zone,
		};
		const result = Temporal.ZonedDateTime.from(fields, {
			overflow: "reject",
			disambiguation: "reject",
		});
		if ((values.has("HH") || values.has("H")) && (hour < 0 || hour > 23)) return undefined;
		return result;
	} catch {
		return undefined;
	}
}
