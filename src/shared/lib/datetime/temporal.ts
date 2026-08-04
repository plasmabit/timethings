import { Temporal as TemporalPolyfill } from "temporal-polyfill";

type TemporalApi = typeof TemporalPolyfill;

export const Temporal: TemporalApi =
	typeof window === "undefined"
		? TemporalPolyfill
		: ((window as Window & { Temporal?: TemporalApi }).Temporal ?? TemporalPolyfill);

export type ZonedDateTime = TemporalPolyfill.ZonedDateTime;
