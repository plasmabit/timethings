import { globalIgnores, defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig(
	globalIgnores([
		".ignore",
		"node_modules",
		"dist",
		"tests",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"versions.json",
		"package.json",
		"pnpm-lock.yaml",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mjs", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			"obsidianmd/ui/sentence-case": [
				"warn",
				{
					brands: ["Time Things"],
					acronyms: ["API", "IANA", "ISO", "UTC", "YAML"],
					enforceCamelCaseLower: true,
				},
			],
		},
	},
);
