# Time Things

Show clock in status bar. Sync modified file property with frontmatter.

This plugin uses moment.js. It's a time manipulation library that is already included in Obsidian.

## Clock

![image](https://github.com/DynamicPlayerSector/timethings/assets/65742767/c2b4c4e0-002b-43ea-8b94-6860d6f7c703)

- Option to change the date format. Recommended: `HH:MM:ss` and `hh:mm A`.
- Option to change update interval.
- Option to use UTC timezone.

## Frontmatter

<img src="https://github.com/DynamicPlayerSector/timethings/assets/65742767/661884e4-666b-4793-9a46-de12edb831ed"  height="800">

- Have a key that records the time when you last modified a file.
- Supports nesting.
- Option to change the date format. Recommended: `YYYY-MM-DD[T]HH:mm:ss.SSSZ`.

### About custom frontmatter handling solution

Custom frontmatter handling solution is desabled by default since Obsidian's straightforward frontmatter API is much more stable and robust. However, advanced users may enable it if they wish. Don't forget to regularly back up your vault.

- Using custom frontmatter handling solution with a nested key may result in the wrong key being updated. This only happens if it comes before the needed key in the frontmatter and has a similar path. For example `x.y.z` will update `x.y.g.z` instead if it meets it first and it has a value of a format specified in the settings.
- Using custom frontmatter handling solution works best with templates since it doesn't create a key for you if it doesn't already exists. Also it doesn't update null values or the values of the format different from the one specified in the settings.
