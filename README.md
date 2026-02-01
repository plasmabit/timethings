# Time Things (Fork)

> Fork of [Time Things](https://github.com/DynamicPlayerSector/timethings) by Nick Winters with enhanced editing time tracking.

Track total editing time and modification timestamps in frontmatter. Show clock and typing indicator in the status bar.

This plugin uses moment.js, a time manipulation library already included in Obsidian.

![Obsidian_vH8xXX5e7Z](https://github.com/DynamicPlayerSector/timethings/assets/65742767/67edb231-1149-4896-a0f1-6cfa2aec3d93)

## Fork Changes

### Typing Indicator
- Visual indicator in the status bar showing whether you're actively editing
- Customizable active/inactive icons (default: ✏🔵 / ✋🔴)

### Configurable Editing Timeout
- Slider + textbox combination for precise control over editing timeout
- Defines how long after you stop typing before the plugin stops tracking
- Works with both CAMS (custom) and BOMS (Obsidian API) modes

### Date Refresh Threshold
- Set a minimum active typing duration before the modification timestamp updates
- Prevents minor edits from updating the "last modified" date

### Real-time Format Validation
- Date format fields now validate in real-time as you type
- Invalid formats are highlighted immediately

### Customizable Edit Duration Format
- Format how the editing duration is displayed in the status bar

---

## Clock

![image](https://github.com/DynamicPlayerSector/timethings/assets/65742767/c2b4c4e0-002b-43ea-8b94-6860d6f7c703)

- Option to change the date format. Recommended: `HH:MM:ss` and `hh:mm A`.
- Option to use UTC timezone.

## Modified frontmatter key

- Have a key that records the time when you last modified a file.
- Supports nesting.
- Option to change the date format. Recommended: `YYYY-MM-DD[T]HH:mm:ss.SSSZ`.

## Edit duration frontmatter key

- Track time spent editing a note
- Display editing duration of current note in the status bar

## About custom frontmatter handling solution

Custom frontmatter handling solution (CAMS) is disabled by default since Obsidian's frontmatter API (BOMS) is more stable. However, advanced users may enable CAMS for a smoother experience. Don't forget to regularly back up your vault.

### Reasons to enable CAMS

- Updates values instantly
- Only touches one line, which means it never makes your cursor jump or shows "A file has been modified" popup
- Doesn't reformat your frontmatter to fit any standard
- Allows for shorter editing timeout (as low as 1 second)

### Reasons to use BOMS (default)

- More stable with nested keys
- Works better without templates (can create keys if they don't exist)
- Less prone to edge cases

## Credits

Original plugin by [Nick Winters](https://github.com/DynamicPlayerSector)
