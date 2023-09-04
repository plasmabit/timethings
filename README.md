# Time Things

Show clock in status bar. Sync modified file property with frontmatter.

This plugin uses moment.js. It's a time manipulation library that is already included in Obsidian.

![Obsidian_vH8xXX5e7Z](https://github.com/DynamicPlayerSector/timethings/assets/65742767/67edb231-1149-4896-a0f1-6cfa2aec3d93)

## Clock

![image](https://github.com/DynamicPlayerSector/timethings/assets/65742767/c2b4c4e0-002b-43ea-8b94-6860d6f7c703)

- Option to change the date format. Recommended: `HH:MM:ss` and `hh:mm A`.
- Option to change update interval.
- Option to use UTC timezone.

## Modified frontmatter key

- Have a key that records the time when you last modified a file.
- Supports nesting.
- Option to change the date format. Recommended: `YYYY-MM-DD[T]HH:mm:ss.SSSZ`.

## Edit duration frontmatter key

- Track time spent editing a note
- Display editing duration of current note in the status bar

## About custom frontmatter handling solution

Custom frontmatter handling solution is disabled by default since Obsidian's straightforward frontmatter API is much more stable and robust. However, advanced users may enable it if they wish.  Don't forget to regularly back up your vault.

### Reasons to enable custom frontmatter handling solution

- It updates the value instantly
- It only touches one line, which means it never makes your cursor jump, or a message "A file has been modified" popup
- It doesn't reformat your frontmatter to fit any standard

### Reasons to leave custom frontmatter handling solution disabled 

- You are using nested keys in the Time Things settings. Using custom frontmatter handling solution with a nested key may result in the wrong key being updated. This only happens if it comes before the needed key in the frontmatter and has a similar path. For example `x.y.z` will update `x.y.g.z` instead if it meets it first and if it has a value of a format specified in the settings.
- You are not using templates populated with needed variables to create notes. Using custom frontmatter handling solution works best with templates since it doesn't create a key for you if it doesn't already exist. Also it doesn't update null values or the values of the format different from the one specified in the settings.

I may improve it further in the future, but for that I feel like I'd have to write a full-blown YAML parser from scratch. For now it covers my own wishes completely and even has some room for limited flexibility, so I will focus on other aspects of the plugin.

## What's next

- [ ] Ignore files in specified folders
- [ ] Ingore files with specified frontmatter keys (and their values)
- [ ] Pick a timezone for all things globally
- [ ] Pick a timezone for clock and frontmatter seperately
- [x] Track time spent editing a note
