# Changelog

## 2026-07-11

- **Frontmatter → Modified timestamp → Frontmatter timezone** — IANA timezone written into `updated_at`. Leave blank for system time.

- Search for a timezone by region or city for the status-bar clock
- Pick a separate timezone for frontmatter timestamps
- Override either timezone with UTC
- Toggle between a preserved custom frontmatter format and ISO 8601
- Both default to the system timezone when left blank

## What was changed

| File                                               | Change                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/timezone.ts`                                  | Adds cached timezone validation, ISO formatting, and timezone-aware instants          |
| `src/shared/config/settings.*`                     | Adds separate timezone and UTC settings plus one-time migration state                 |
| `src/app/plugin.ts`                                | Migrates legacy `isUTC` into the new clock UTC override once                          |
| `src/features/clock/clock-status.service.ts`       | Formats the clock and emoji from one timezone-aware instant                           |
| `src/features/activity/metadata-update.service.ts` | Writes custom or ISO 8601 timestamps in the selected timezone                         |
| `src/features/settings-tab/settings.tab.ts`        | Adds searchable timezone controls plus UTC and ISO overrides                          |
| `tests/*.test.ts`                                  | Covers migration, search, UTC precedence, and both metadata update paths              |


### Migration

Legacy `isUTC` is retained and migrated once. Existing UTC users start with the clock UTC override enabled; other users start on the system timezone.

```json
"clockTimezone": "",
"clockUseUtc": false,
"frontmatterTimezone": "",
"frontmatterUseUtc": false,
"frontmatterUseIso": true,
"frontmatterFormatMigrated": true,
"timezoneSettingsMigrated": true
```
