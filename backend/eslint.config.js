import js from '@eslint/js';
import configPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  configPrettier, // Disables ESLint rules that might conflict with Prettier
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // Use "commonjs" if you are using require() instead of import
      globals: {
        ...globals.node,
        ...globals.jest, // Optional: Include if you use Jest for testing
      },
    },
    plugins: {
      prettier: prettier,
    },

    rules: {
      'prettier/prettier': 'error', // Triggers Prettier formatting issues as ESLint errors
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Usually off for Express apps to allow console.log/error
      'prefer-const': 'error',
    },
  },
  {
    ignores: [
      'coverage/',
      'package-lock.json',
      'node_modules/',
      'dist/',
      'build/',
      '.env*',
      'eslint.config.js', // Optional: if you don't want ESLint linting the config itself
    ],
  },
];
