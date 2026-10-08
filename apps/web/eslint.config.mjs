import { FlatCompat } from '@eslint/eslintrc';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { config as defineConfig, configs as tsConfigs } from 'typescript-eslint';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * Rules from rules.md §3.
 * `next/core-web-vitals` already registers the jsx-a11y, import and react-hooks plugins,
 * so we only add their rule sets here rather than re-registering the plugins.
 */
export default defineConfig(
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts', 'public/**'],
  },
  ...compat.extends('next/core-web-vitals'),
  ...tsConfigs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.recommended.rules,
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/jsx-no-target-blank': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: 'react', group: 'builtin', position: 'before' },
            { pattern: 'next/**', group: 'builtin', position: 'before' },
            { pattern: '@/lib/**', group: 'internal', position: 'before' },
            { pattern: '@/stores/**', group: 'internal' },
            { pattern: '@/hooks/**', group: 'internal' },
            { pattern: '@/components/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': 'off',
      'import/named': 'off',
      // security.md: no raw wallet access, no localStorage for app state.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the IndexedDB helper or in-memory Zustand state (rules.md §3).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'ethereum', message: 'All wallet UX goes through the Tempo Accounts SDK.' },
        { object: 'window', property: 'localStorage', message: 'Use the IndexedDB helper or Zustand (rules.md §3).' },
      ],
    },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
  },
  {
    // No automatic top-ups, ever (PDF). Timers may not call session code.
    files: ['lib/tempo/session/**/*.ts', 'hooks/useTopUp.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='setInterval']",
          message: 'No timers in session code: top-ups are user-initiated only (PDF).',
        },
        {
          selector: "CallExpression[callee.name='setTimeout']",
          message: 'No timers in session code: top-ups are user-initiated only (PDF).',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['*.config.ts', '*.config.js', '*.config.mjs', 'scripts/**/*.mjs'],
    ...tsConfigs.disableTypeChecked,
  },
);
