// ESLint 9+ Flat Config migration from .eslintrc.cjs
const vue = require('eslint-plugin-vue');
const prettier = require('eslint-plugin-prettier');
const vueParser = require('vue-eslint-parser');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['**/*.js', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
        module: 'writable',
      },
      parser: vueParser,
    },
    plugins: {
      vue,
      prettier,
    },
    rules: {
      ...(vue.configs['vue3-recommended']?.rules || {}),
      ...(prettier.configs?.recommended?.rules || {}),
      'vue/multi-word-component-names': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
];
