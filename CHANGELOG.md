# Changelog

## 2026-07-11

- **Frontmatter → Modified timestamp → Frontmatter timezone** — IANA timezone written into `updated_at`. Leave blank for system time.

- Pick a timezone for the status-bar clock
- Pick a separate timezone for frontmatter timestamps
- Both default to the system timezone when left blank

## What was changed

| File                                               | Change                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/timezone.ts`                                  | New module: `formatWithTimezone`, `nowInTimezone`, `listTimeZones`, `isValidTimeZone` |
| `src/shared/config/settings.types.ts`              | Added `clockTimezone` and `frontmatterTimezone` fields                                |
| `src/shared/config/settings.defaults.ts`           | Defaults both fields to `""` (system timezone)                                        |
| `src/app/plugin.ts`                                | Migrates legacy `isUTC: true` → `clockTimezone: "UTC"` on load                        |
| `src/features/clock/clock-status.service.ts`       | Uses `nowInTimezone` + `formatWithTimezone` instead of `now(isUTC)` + `formatClock`   |
| `src/features/activity/metadata-update.service.ts` | Uses `formatWithTimezone` + `nowInTimezone` for modified timestamps                   |
| `src/features/settings-tab/settings.tab.ts`        | Replaces UTC toggle with two timezone dropdowns                                       |
| `tests/timezone.test.ts`                           | Full test suite for `timezone.ts`                                                     |


### Mention:
You need change the isUTC: true → clockTimezone in data.json: "UTC" migration also happens in memory on load, and persists to data.json on the first save.

```json
"clockTimezone": "",
"frontmatterTimezone": ""
```