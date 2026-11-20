import js from '@eslint/js';
import pluginRouter from '@tanstack/eslint-plugin-router';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import playwright from 'eslint-plugin-playwright';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Builds a no-restricted-imports rule that forbids importing the given layers. */
const forbidLayers = (layers, message) => [
  'error',
  {
    patterns: layers.map((layer) => ({
      group: [`**/${layer}`, `**/${layer}/**`],
      message,
    })),
  },
];

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'src/routeTree.gen.ts']),

  // All JS/TS
  { files: ['**/*.{js,ts,tsx}'], extends: [js.configs.recommended] },

  // TypeScript, with type-aware rules (catches floating promises, etc.)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // App code (browser)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      pluginRouter.configs['flat/recommended'],
    ],
    languageOptions: { globals: globals.browser },
  },

  // Route files export `Route`, not a component; the router plugin handles HMR.
  { files: ['src/routes/**/*.tsx'], rules: { 'react-refresh/only-export-components': 'off' } },

  // Layer boundaries (docs/ARCHITECTURE.md §1)
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['data', 'state', 'ui', 'routes', 'react', 'dexie'],
        'The domain layer is pure TypeScript and must not depend on other layers, React, or Dexie.',
      ),
    },
  },
  {
    files: ['src/data/**'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['state', 'ui', 'routes', 'react'],
        'The data layer must not depend on the state or UI layers.',
      ),
    },
  },
  {
    files: ['src/state/**'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['ui', 'routes'],
        'The state layer must not depend on the UI layer.',
      ),
    },
  },
  {
    files: ['src/ui/**', 'src/routes/**'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['data', 'dexie'],
        'UI code must go through the state layer (hooks/TodoService), never the data layer.',
      ),
    },
  },

  // Playwright end-to-end tests
  {
    files: ['e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    languageOptions: { globals: globals.node },
  },

  // Tooling config files
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Must be last: turns off rules that conflict with Prettier.
  prettier,
]);
