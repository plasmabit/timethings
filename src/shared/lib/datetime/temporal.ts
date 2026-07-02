import { Temporal as TemporalPolyfill } from "temporal-polyfill";

type TemporalApi = typeof TemporalPolyfill;

export const Temporal: TemporalApi =
	(globalThis as { Temporal?: TemporalApi }).Temporal ?? TemporalPolyfill;

export type ZonedDateTime = TemporalPolyfill.ZonedDateTime;
