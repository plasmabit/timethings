# Structure Guide

This file explains the current project structure in practical terms:

- what each area is for
- where code should live
- why the code is organized this way
- how data and control move through the plugin

It is meant to be the "where does this go?" document for future changes.

## What This Project Is

This repository is an Obsidian plugin.

Main responsibilities:

- show a clock in the status bar
- update frontmatter metadata while editing
- show a "Most edited notes" view
- expose plugin settings through an Obsidian settings tab

The source of truth is the TypeScript code in `src/`.

## Top-Level Layout

```text
.
|-- src/                 Source code
|-- dist/                Build output from esbuild
|-- .github/             GitHub workflow/config files
|-- manifest.json        Obsidian plugin manifest
|-- styles.css           Plugin styles
|-- esbuild.config.mjs   Build pipeline
|-- tsconfig.json        TypeScript config
|-- package.json         Scripts and dependencies
|-- README.md            User-facing project readme
|-- main.js              Checked-in compiled artifact
```

## Source Layout

```text
src/
|-- main.ts
|-- constants/
|   `-- plugin.constants.ts
|-- settings/
|   |-- settings.defaults.ts
|   |-- settings.tab.ts
|   `-- settings.types.ts
|-- features/
|   |-- activity/
|   |   |-- activity.service.ts
|   |   `-- metadata-update.service.ts
|   |-- clock/
|   |   `-- clock-status.service.ts
|   `-- most-edited/
|       |-- most-edited.service.ts
|       `-- most-edited.view.ts
`-- utils/
    |-- editor-frontmatter.ts
    |-- frontmatter-path.ts
    `-- time-format.ts
```

## Where Things Go

### `src/main.ts`

What:

- plugin entrypoint
- plugin lifecycle
- top-level wiring only

Why:

- `main.ts` should stay small and readable
- it should explain plugin composition, not contain feature internals

How:

- loads settings
- constructs services
- registers views, commands, ribbon icons, and event handlers
- exposes plugin-level persistence methods such as `loadSettings()` and `saveSettings()`

Rule:

- if code is real business logic, it probably does not belong here

### `src/constants/`

What:

- repeated literals
- plugin-wide IDs
- event names
- shared configuration values

Why:

- removes magic strings and duplicated hardcoded values
- makes renaming safer
- reduces drift between features

How:

- use this folder for values reused in more than one place or values that define plugin identity
- avoid moving one-off strings here just for the sake of it

Current examples:

- command IDs and labels
- view type IDs
- DOM and workspace event names
- cooldown base values
- repeated view labels and CSS class strings

### `src/settings/`

What:

- settings shape
- default settings
- settings UI

Why:

- settings are a self-contained subsystem
- keeping types/defaults/UI together makes it easier to change or add options safely

How:

- `settings.types.ts` defines the settings contract
- `settings.defaults.ts` defines persisted defaults
- `settings.tab.ts` renders the Obsidian settings UI and updates persisted values

Rule:

- any new user-facing setting should normally require changes in all three places:
  `settings.types.ts`, `settings.defaults.ts`, and `settings.tab.ts`

### `src/features/`

What:

- behavior-heavy modules grouped by feature

Why:

- feature folders scale better than a flat list of unrelated files
- related code stays near itself
- changes are easier to reason about because the behavior is localized

How:

- each feature owns its own logic and should depend on `constants/`, `settings/`, and `utils/` as needed
- features should not become dumping grounds; keep them focused

#### `src/features/activity/`

What:

- edit activity handling
- metadata updates triggered by typing or file modification

Files:

- `activity.service.ts`: listens for Obsidian/editor activity and decides when updates should run
- `metadata-update.service.ts`: performs the actual frontmatter and editor metadata writes

Why:

- separates event detection from metadata mutation
- makes editor-path updates and file-path updates easier to follow

#### `src/features/clock/`

What:

- status bar clock behavior

Files:

- `clock-status.service.ts`: owns the status bar item and periodic rendering

Why:

- clock logic is independent from metadata and settings rendering

#### `src/features/most-edited/`

What:

- "Most edited notes" view
- data gathering for that view

Files:

- `most-edited.service.ts`: collects and sorts note edit-duration data
- `most-edited.view.ts`: renders the view and handles note interaction

Why:

- data collection and UI rendering are different concerns
- this separation makes bugs like field-path lookup issues easier to isolate

### `src/utils/`

What:

- low-level reusable helpers

Why:

- some logic is not a feature by itself but is shared or generic enough to reuse

How:

- keep this folder small
- only place code here if it is genuinely low-level and broadly useful

Current utilities:

- `editor-frontmatter.ts`: line-based editor/frontmatter helpers
- `frontmatter-path.ts`: nested frontmatter object-path read/write helpers
- `time-format.ts`: time formatting helpers for durations and clock emoji

Rule:

- if a function knows too much about a specific product feature, it likely belongs in `features/`, not `utils/`

## Why This Structure

This codebase uses a hybrid structure:

- feature folders for behavior
- a settings folder for settings
- a constants folder for shared literals
- a utils folder for small generic helpers

This is intentional.

Reasons:

- a pure `utils/` or `helpers/` architecture becomes a junk drawer
- a pure file-type structure does not scale well once features grow
- a pure "everything in main" structure makes debugging and refactoring harder

The current structure keeps the two most important goals in balance:

- `main.ts` stays minimal
- feature logic still has clear homes

## How The Plugin Works

### Startup flow

1. Obsidian loads the plugin entrypoint in `src/main.ts`.
2. Settings are loaded and merged with defaults.
3. Feature services are created.
4. Views, commands, ribbon icons, status bar behavior, and activity listeners are registered.
5. The settings tab is attached.

### Editing flow

1. `activity.service.ts` listens for key or file-modify events.
2. Based on settings, it decides whether to use the editor path or the frontmatter API path.
3. `metadata-update.service.ts` updates modified timestamps and edit-duration values.
4. Low-level nested field lookup or line edits are delegated to the `utils/` layer.

### Most-edited view flow

1. The command or ribbon action opens the custom view.
2. `most-edited.view.ts` asks `most-edited.service.ts` for data.
3. `most-edited.service.ts` reads frontmatter values from the metadata cache.
4. The view renders the sorted list and lets the user open a note from it.

### Clock flow

1. `main.ts` initializes the clock service.
2. `clock-status.service.ts` creates the status bar element.
3. It renders on an interval using the current settings.

## How To Add New Code

### Add a new feature

Put it under `src/features/<feature-name>/`.

Use:

- a `*.service.ts` file for behavior/data logic
- a `*.view.ts` file only if the feature renders a custom view

Keep feature-specific details inside the feature folder.

### Add a new setting

Update:

- `src/settings/settings.types.ts`
- `src/settings/settings.defaults.ts`
- `src/settings/settings.tab.ts`

If the setting affects runtime behavior, wire it into the relevant feature service rather than `main.ts`.

### Add a repeated string or ID

If it is reused or defines plugin identity, put it in `src/constants/plugin.constants.ts`.

Examples:

- command IDs
- view IDs
- repeated event names
- repeated field-name defaults

### Add a low-level helper

Put it in `src/utils/` only if:

- it is reusable
- it is not strongly tied to one feature
- it does not need plugin-level orchestration knowledge

Otherwise, keep it near the feature that uses it.

## How To Decide Between `features/` and `utils/`

Put code in `features/` if:

- it knows about plugin behavior
- it depends on settings semantics
- it coordinates user actions or app events
- it would be confusing outside its feature context

Put code in `utils/` if:

- it is a narrow helper
- it transforms or reads data without owning workflow
- it can be reused without understanding the whole plugin

## Boundaries To Keep

- `main.ts` should not grow feature logic
- `settings/` should not own runtime feature behavior
- `utils/` should not become a second `features/`
- `constants/` should not become a dumping ground for every literal
- `features/` should call utilities, not reimplement shared low-level parsing

## Build And Runtime Notes

- TypeScript source lives in `src/`
- `npm run build` runs TypeScript type-checking and bundles with esbuild
- `esbuild.config.mjs` currently outputs to `dist/`
- `manifest.json` is the Obsidian plugin manifest
- `styles.css` is intentionally separate from the TypeScript structure

## Practical Maintenance Rules

- keep file names descriptive
- prefer small service methods over large multi-purpose functions
- centralize repeated strings only when they are genuinely repeated or identity-defining
- preserve user-facing IDs and persisted settings keys unless a migration is planned
- when a file starts mixing orchestration, rendering, parsing, and persistence, split it

## Short Version

If you are not sure where something goes:

- plugin wiring: `src/main.ts`
- shared IDs and repeated literals: `src/constants/`
- settings: `src/settings/`
- feature behavior: `src/features/<feature>/`
- generic helpers: `src/utils/`

If a change makes `main.ts` bigger instead of clearer, it is probably going in the wrong place.
