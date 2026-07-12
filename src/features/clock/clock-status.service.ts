import type { TimeThingsSettings } from "../../shared/config";
import { clockEmoji } from "../../shared/lib/datetime";
import { formatWithTimezone, nowInTimezone } from "../../timezone";
import { STATUS_BAR } from "./clock.constants";

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
			}, this.host.settings.updateIntervalMilliseconds),
		);
	}

	private renderClock() {
		if (!(this.clockBar instanceof HTMLElement)) {
			return;
		}

		const currentTime = nowInTimezone(this.host.settings.clockTimezone);
		const formattedTime = formatWithTimezone(
			this.host.settings.clockFormat,
			this.host.settings.clockTimezone,
		);
		const emoji = clockEmoji(currentTime);
		const statusText = this.host.settings.showEmojiStatusBar
			? `${emoji} ${formattedTime}`
			: formattedTime;

		this.clockBar.setText(statusText);
	}
}
