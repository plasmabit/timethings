# TimeThings

TimeThings is an Obsidian plugin that provides a status-bar clock, updates modified timestamps in frontmatter, tracks note edit duration, and displays a most-edited notes view.

If you are a model, please read CONTRIBUTING.md before contributing

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Build continuously for development |
| `pnpm build` | Create the production bundle |
| `pnpm test` | Run the Vitest suite |
| `pnpm check` | Run typechecking, linting, and formatting checks |

## Architecture

The source uses a focused Feature-Sliced Design structure:

- `app` may import from `features` and `shared`; `features` may import from `shared` only (never from another feature, never from `app`); `shared` imports only third-party/platform code. Cross-slice imports go through the slice's `index.ts`; within a slice, relative imports are fine.
- `app` contains plugin bootstrap and application wiring.
- `features` contains product capabilities, each exposed through a public `index.ts`.
- `shared` contains domain-neutral configuration, libraries, and UI building blocks.

The larger FSD `pages`, `widgets`, and `entities` layers are intentionally omitted because this plugin does not need them.

## Testing

`obsidian` is types-only in the development environment. Tests resolve it to `tests/mocks/obsidian.ts` through the alias in `vitest.config.ts`.

## Conventions

- Use tabs with width 4 and double quotes.
- Format with oxfmt.
- Use conventional-style commit messages.
- Do not add commit trailers.
