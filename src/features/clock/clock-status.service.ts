import { moment } from "obsidian";
import { STATUS_BAR } from "../../constants/plugin.constants";
import { TimeThingsSettings } from "../../settings/settings.types";
import { formatMomentAsClockEmoji } from "../../utils/time-format";

interface ClockStatusHost {
	settings: TimeThingsSettings;
	addStatusBarItem(): HTMLElement;
	registerInterval(id: number): number;
}

export class ClockStatusService {
	private clockBar?: HTMLElement;

	constructor(private readonly host: ClockStatusHost) {}

	initialize() {
		if (!this.host.settings.enableClock) {
			return;
		}

		this.clockBar = this.host.addStatusBarItem();
		this.clockBar.setText(STATUS_BAR.placeholder);
		this.renderClock();
		this.host.registerInterval(
			window.setInterval(() => {
				this.renderClock();
			}, Number(this.host.settings.updateIntervalMilliseconds)),
		);
	}

	private renderClock() {
		if (!(this.clockBar instanceof HTMLElement)) {
			return;
		}

		const currentTime = this.host.settings.isUTC ? moment.utc() : moment();
		const formattedTime = currentTime.format(this.host.settings.clockFormat);
		const clockEmoji = formatMomentAsClockEmoji(currentTime);
		const statusText = this.host.settings.showEmojiStatusBar
			? `${clockEmoji} ${formattedTime}`
			: formattedTime;

		this.clockBar.setText(statusText);
	}
}
