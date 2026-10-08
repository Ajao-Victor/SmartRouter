import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** Rules from rules.md §3. */
export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  jsxA11y.flatConfigs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
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
    ...tseslint.configs.disableTypeChecked,
  },
);
