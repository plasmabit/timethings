# Time Things

Show clock in status bar. Sync modified file property with frontmatter.

## v2.0.0 breaking changes

- The "Most edited notes" view is registered under a new internal ID; if a
  saved workspace layout shows an empty pane where the view was, close it and
  reopen the view from the ribbon or command palette (one-time).
- The command ID changed; re-assign your hotkey for "Most edited notes" if
  you had one.
- Date/time formats are now interpreted by a built-in formatter instead of
  moment.js. All tokens documented in the Format tokens section below —
  including the defaults and previously recommended formats — behave
  identically. Exotic moment tokens outside that table (for example, `Do` and
  `ddd`) are now rendered literally.
- The clock update interval setting is stored as a number; existing values
  migrate automatically (a minimum of 100 ms is now enforced).
- Requires Obsidian 1.13.0 or newer.

![Most edited notes view](docs/images/most-edited-view.gif)

## Clock

![Clock in the status bar](docs/images/clock-status-bar.png)

- Option to change the date format. Recommended: `HH:mm:ss` and `hh:mm A`.
- Option to change update interval.
- Search for an IANA timezone by region or city, or use the system timezone.
- Option to override the selected timezone with UTC.

## Modified frontmatter key

- Option to create enabled properties when they are missing from existing frontmatter. Enabled by default and applies to both frontmatter handling modes.
- Files without frontmatter are left unchanged.
- Have a key that records the time when you last modified a file.
- Supports nesting.
- Option to use a custom timestamp format.
- Option to override the custom format with ISO 8601.
- Writes timestamps with the selected IANA timezone or UTC.

## Edit duration frontmatter key

- Track time spent editing a note
- Display editing duration of current note in the status bar

## Format tokens

Clock and custom modified-timestamp formats support the following tokens. Text inside
square brackets is emitted literally.

| Token | Meaning |
| --- | --- |
| `YYYY` | Four-digit year |
| `MM` | Two-digit month |
| `DD` | Two-digit day |
| `HH` | Two-digit 24-hour hour |
| `H` | One- or two-digit 24-hour hour |
| `hh` | Two-digit 12-hour hour |
| `h` | One- or two-digit 12-hour hour |
| `mm` | Two-digit minute |
| `ss` | Two-digit second |
| `SSS` | Three-digit millisecond |
| `A` | Uppercase AM/PM |
| `a` | Lowercase am/pm |
| `Z` | UTC offset, such as `+05:30` |
| `[literal]` | Literal text |

## About custom frontmatter handling solution

Custom frontmatter handling solution is disabled by default since Obsidian's straightforward frontmatter API is much more stable and robust. However, advanced users may enable it if they wish.  Don't forget to regularly back up your vault.

### Reasons to enable custom frontmatter handling solution

- It updates the value instantly
- It only touches one line, which means it never makes your cursor jump, or a message "A file has been modified" popup
- It doesn't reformat your frontmatter to fit any standard

### Reasons to leave custom frontmatter handling solution disabled 

- You are using nested keys in the Time Things settings. Using custom frontmatter handling solution with a nested key may result in the wrong key being updated. This only happens if it comes before the needed key in the frontmatter and has a similar path. For example `x.y.z` will update `x.y.g.z` instead if it meets it first and if it has a value of a format specified in the settings.
- Existing null values or values in a format different from the configured timestamp format are not updated by the custom solution.

I may improve it further in the future, but for that I feel like I'd have to write a full-blown YAML parser from scratch. For now it covers my own wishes completely and even has some room for limited flexibility, so I will focus on other aspects of the plugin.

## What's next

- [x] Ignore files in specified folders
- [x] Track time spent editing a note
- [ ] Ingore files with specified frontmatter keys (and their values)
- [x] Pick a timezone for all things globally
- [x] Pick a timezone for clock and frontmatter separately
